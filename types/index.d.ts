import type { Request, Response, RequestHandler } from 'express';

export type RequestLocation = 'body' | 'params' | 'query' | 'headers';
export type UnknownKeyMode = 'strip' | 'allow' | 'reject';
export type ValidationType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object';
export type ValidationFormat = 'email' | 'url' | 'uuid';

export interface ValidationContext {
  req: Request;
  location: RequestLocation;
  path: string;
}

export interface FieldMessages {
  required?: string;
  nullable?: string;
  type?: string;
  minLength?: string;
  maxLength?: string;
  min?: string;
  max?: string;
  format?: string;
  pattern?: string;
  minItems?: string;
  maxItems?: string;
  enum?: string;
  custom?: string;
}

export interface FieldRule {
  required?: boolean;
  nullable?: boolean;
  type?: ValidationType;
  coerce?: boolean;
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  default?: unknown | ((context: Omit<ValidationContext, 'path'> & { path: string }) => unknown | Promise<unknown>);
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  format?: ValidationFormat;
  pattern?: RegExp | string;
  patternFlags?: string;
  minItems?: number;
  maxItems?: number;
  items?: FieldRule;
  properties?: Record<string, FieldRule>;
  unknownKeys?: UnknownKeyMode;
  enum?: unknown[];
  custom?: (value: unknown, context: ValidationContext) => boolean | string | void | Promise<boolean | string | void>;
  validate?: FieldRule['custom'];
  messages?: FieldMessages;
}

export type LocationSchema = Record<string, FieldRule>;
export type RequestSchema = Partial<Record<RequestLocation, LocationSchema>>;

export interface ValidationIssue {
  location: RequestLocation;
  path: string;
  code: string;
  message: string;
}

export interface ValidateOptions {
  abortEarly?: boolean;
  statusCode?: number;
  message?: string;
  unknownKeys?: UnknownKeyMode;
  onError?: (context: {
    req: Request;
    res: Response;
    errors: ValidationIssue[];
    statusCode: number;
    message: string;
  }) => void | Promise<void>;
}

export declare class InputGuardError extends Error {
  statusCode: number;
  code: string;
  errors: ValidationIssue[];
  constructor(message: string, errors: ValidationIssue[], statusCode?: number);
}

export declare function validate(schema: RequestSchema, options?: ValidateOptions): RequestHandler;


export interface ValidatedRequestData {
  body?: Record<string, unknown>;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
  headers?: Record<string, unknown>;
}

declare global {
  namespace Express {
    interface Request {
      validated?: ValidatedRequestData;
    }
  }
}
