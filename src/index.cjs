'use strict';

const VALID_LOCATIONS = new Set(['body', 'params', 'query', 'headers']);
const VALID_UNKNOWN_KEY_MODES = new Set(['strip', 'allow', 'reject']);
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const isPlainObject = (value) => {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

class InputGuardError extends Error {
  constructor(message, errors, statusCode = 422) {
    super(message);
    this.name = 'InputGuardError';
    this.statusCode = statusCode;
    this.code = 'INPUT_VALIDATION_FAILED';
    this.errors = errors;
    Error.captureStackTrace?.(this, InputGuardError);
  }
}


function assertValidRule(rule, path) {
  if (!isPlainObject(rule)) throw new TypeError(`The validation rule for "${path}" must be an object.`);

  const allowedTypes = new Set(['string', 'number', 'integer', 'boolean', 'array', 'object']);
  if (rule.type !== undefined && !allowedTypes.has(rule.type)) {
    throw new TypeError(`Unsupported validation type "${rule.type}" at ${path}.`);
  }

  for (const key of ['required', 'nullable', 'coerce', 'trim', 'lowercase', 'uppercase']) {
    if (rule[key] !== undefined && typeof rule[key] !== 'boolean') {
      throw new TypeError(`The "${key}" rule at ${path} must be a boolean.`);
    }
  }
  if (rule.lowercase === true && rule.uppercase === true) {
    throw new TypeError(`The "lowercase" and "uppercase" rules cannot both be enabled at ${path}.`);
  }

  const allowedFormats = new Set(['email', 'url', 'uuid']);
  if (rule.format !== undefined && !allowedFormats.has(rule.format)) {
    throw new TypeError(`Unsupported format "${rule.format}" at ${path}.`);
  }
  if (rule.format !== undefined && rule.type !== 'string') {
    throw new TypeError(`The "format" rule at ${path} requires type "string".`);
  }
  if (rule.pattern !== undefined && rule.type !== 'string') {
    throw new TypeError(`The "pattern" rule at ${path} requires type "string".`);
  }
  if (rule.items !== undefined && rule.type !== 'array') {
    throw new TypeError(`The "items" rule at ${path} requires type "array".`);
  }
  if (rule.properties !== undefined && rule.type !== 'object') {
    throw new TypeError(`The "properties" rule at ${path} requires type "object".`);
  }
  if (rule.patternFlags !== undefined && typeof rule.patternFlags !== 'string') {
    throw new TypeError(`The "patternFlags" rule at ${path} must be a string.`);
  }

  for (const key of ['minLength', 'maxLength', 'minItems', 'maxItems']) {
    if (rule[key] !== undefined && (!Number.isInteger(rule[key]) || rule[key] < 0)) {
      throw new TypeError(`The "${key}" rule at ${path} must be a non-negative integer.`);
    }
  }
  for (const key of ['min', 'max']) {
    if (rule[key] !== undefined && (typeof rule[key] !== 'number' || !Number.isFinite(rule[key]))) {
      throw new TypeError(`The "${key}" rule at ${path} must be a finite number.`);
    }
  }
  if (rule.minLength !== undefined && rule.maxLength !== undefined && rule.minLength > rule.maxLength) {
    throw new TypeError(`The "minLength" rule cannot exceed "maxLength" at ${path}.`);
  }
  if (rule.minItems !== undefined && rule.maxItems !== undefined && rule.minItems > rule.maxItems) {
    throw new TypeError(`The "minItems" rule cannot exceed "maxItems" at ${path}.`);
  }
  if (rule.min !== undefined && rule.max !== undefined && rule.min > rule.max) {
    throw new TypeError(`The "min" rule cannot exceed "max" at ${path}.`);
  }

  if (rule.pattern !== undefined) safePattern(rule.pattern, rule.patternFlags);
  if (rule.enum !== undefined && !Array.isArray(rule.enum)) {
    throw new TypeError(`The "enum" rule at ${path} must be an array.`);
  }
  if (rule.custom !== undefined && typeof rule.custom !== 'function') {
    throw new TypeError(`The "custom" rule at ${path} must be a function.`);
  }
  if (rule.validate !== undefined && typeof rule.validate !== 'function') {
    throw new TypeError(`The "validate" rule at ${path} must be a function.`);
  }
  if (rule.items !== undefined) assertValidRule(rule.items, `${path}[]`);
  if (rule.properties !== undefined) {
    if (!isPlainObject(rule.properties)) throw new TypeError(`The "properties" rule at ${path} must be an object.`);
    for (const [key, nestedRule] of Object.entries(rule.properties)) {
      assertValidRule(nestedRule, `${path}.${key}`);
    }
  }
  if (rule.unknownKeys !== undefined && !VALID_UNKNOWN_KEY_MODES.has(rule.unknownKeys)) {
    throw new TypeError(`The "unknownKeys" rule at ${path} must be "strip", "allow", or "reject".`);
  }
  if (rule.messages !== undefined) {
    if (!isPlainObject(rule.messages) || Object.values(rule.messages).some((message) => typeof message !== 'string')) {
      throw new TypeError(`The "messages" rule at ${path} must be an object containing string values.`);
    }
  }
}

function addError(errors, location, path, code, message) {
  if (errors.abortEarly && errors.length > 0) return;
  errors.push({ location, path, code, message });
}

function setOwn(target, key, value) {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true
  });
}

function normalizeNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return null;
}

function coerceValue(value, type) {
  if (type === 'number' || type === 'integer') return normalizeNumber(value);
  if (type === 'boolean') return normalizeBoolean(value);
  return value;
}

function matchesFormat(value, format) {
  if (typeof value !== 'string') return false;

  switch (format) {
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    case 'url': {
      try {
        const parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    }
    case 'uuid':
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    default:
      return null;
  }
}

function validateType(value, expected) {
  switch (expected) {
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number' && Number.isFinite(value);
    case 'integer': return Number.isInteger(value);
    case 'boolean': return typeof value === 'boolean';
    case 'array': return Array.isArray(value);
    case 'object': return isPlainObject(value);
    default: return null;
  }
}

function describeType(expected) {
  return expected === 'integer' ? 'an integer' : `a ${expected}`;
}

function safePattern(pattern, flags) {
  if (pattern instanceof RegExp) return new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
  if (typeof pattern === 'string') return new RegExp(pattern, String(flags || '').replace(/[gy]/g, ''));
  throw new TypeError('The "pattern" rule must be a RegExp or a string.');
}

async function validateField(value, rule, context, errors) {
  const { location, path, req } = context;
  const initialErrorCount = errors.length;
  let current = value;
  const missing = current === undefined;

  if (missing && hasOwn(rule, 'default')) {
    current = typeof rule.default === 'function' ? await rule.default({ req, location, path }) : rule.default;
  }

  if (current === undefined) {
    if (rule.required) {
      addError(errors, location, path, 'REQUIRED', rule.messages?.required || 'This field is required.');
    }
    return { value: current, present: false };
  }

  if (current === null) {
    if (rule.nullable) return { value: null, present: true };
    addError(errors, location, path, 'NULL_NOT_ALLOWED', rule.messages?.nullable || 'This field cannot be null.');
    return { value: current, present: true };
  }

  if (typeof current === 'string') {
    if (rule.trim) current = current.trim();
    if (rule.lowercase) current = current.toLowerCase();
    if (rule.uppercase) current = current.toUpperCase();
    if (rule.required && current.length === 0) {
      addError(errors, location, path, 'REQUIRED', rule.messages?.required || 'This field is required.');
      return { value: current, present: true };
    }
  }

  if (rule.coerce && rule.type) {
    const coerced = coerceValue(current, rule.type);
    if (coerced !== null) current = coerced;
  }

  if (rule.type) {
    const typeMatches = validateType(current, rule.type);
    if (typeMatches === null) throw new TypeError(`Unsupported validation type "${rule.type}" at ${path}.`);
    if (!typeMatches) {
      addError(errors, location, path, 'INVALID_TYPE', rule.messages?.type || `Expected ${describeType(rule.type)}.`);
      return { value: current, present: true };
    }
  }

  if (typeof current === 'string') {
    if (Number.isInteger(rule.minLength) && current.length < rule.minLength) {
      addError(errors, location, path, 'MIN_LENGTH', rule.messages?.minLength || `Must contain at least ${rule.minLength} characters.`);
    }
    if (Number.isInteger(rule.maxLength) && current.length > rule.maxLength) {
      addError(errors, location, path, 'MAX_LENGTH', rule.messages?.maxLength || `Must contain no more than ${rule.maxLength} characters.`);
    }
    if (rule.format) {
      const formatMatches = matchesFormat(current, rule.format);
      if (formatMatches === null) throw new TypeError(`Unsupported format "${rule.format}" at ${path}.`);
      if (!formatMatches) addError(errors, location, path, 'INVALID_FORMAT', rule.messages?.format || `Must be a valid ${rule.format}.`);
    }
    if (rule.pattern !== undefined) {
      const pattern = safePattern(rule.pattern, rule.patternFlags);
      if (!pattern.test(current)) addError(errors, location, path, 'PATTERN_MISMATCH', rule.messages?.pattern || 'Value has an invalid format.');
    }
  }

  if (typeof current === 'number') {
    if (typeof rule.min === 'number' && current < rule.min) {
      addError(errors, location, path, 'MIN_VALUE', rule.messages?.min || `Must be at least ${rule.min}.`);
    }
    if (typeof rule.max === 'number' && current > rule.max) {
      addError(errors, location, path, 'MAX_VALUE', rule.messages?.max || `Must be no more than ${rule.max}.`);
    }
  }

  if (Array.isArray(current)) {
    if (Number.isInteger(rule.minItems) && current.length < rule.minItems) {
      addError(errors, location, path, 'MIN_ITEMS', rule.messages?.minItems || `Must contain at least ${rule.minItems} items.`);
    }
    if (Number.isInteger(rule.maxItems) && current.length > rule.maxItems) {
      addError(errors, location, path, 'MAX_ITEMS', rule.messages?.maxItems || `Must contain no more than ${rule.maxItems} items.`);
    }
    if (rule.items) {
      const output = [];
      for (let index = 0; index < current.length; index += 1) {
        const itemResult = await validateField(current[index], rule.items, {
          ...context,
          path: `${path}[${index}]`
        }, errors);
        output.push(itemResult.value);
      }
      current = output;
    }
  }

  if (isPlainObject(current) && rule.properties) {
    current = await validateObject(current, rule.properties, {
      ...context,
      path
    }, errors, rule.unknownKeys || 'strip');
  }

  if (Array.isArray(rule.enum) && !rule.enum.some((allowed) => Object.is(allowed, current))) {
    addError(errors, location, path, 'NOT_IN_ALLOWED_VALUES', rule.messages?.enum || 'Value is not one of the allowed options.');
  }

  const customValidator = rule.custom || rule.validate;
  if (typeof customValidator === 'function') {
    const customResult = await customValidator(current, { req, location, path });
    if (customResult === false) {
      addError(errors, location, path, 'CUSTOM_VALIDATION_FAILED', rule.messages?.custom || 'Custom validation failed.');
    } else if (typeof customResult === 'string' && customResult.length > 0) {
      addError(errors, location, path, 'CUSTOM_VALIDATION_FAILED', customResult);
    }
  }

  return { value: current, present: true, addedErrors: errors.length - initialErrorCount };
}

async function validateObject(input, schema, context, errors, unknownKeys) {
  if (!isPlainObject(schema)) throw new TypeError(`The schema for ${context.path || context.location} must be an object.`);
  if (!isPlainObject(input)) {
    addError(errors, context.location, context.path || context.location, 'INVALID_OBJECT', 'Expected an object.');
    return {};
  }

  const output = {};
  const schemaKeys = new Set(Object.keys(schema));

  for (const key of Object.keys(input)) {
    if (schemaKeys.has(key)) continue;
    if (unknownKeys === 'allow') setOwn(output, key, input[key]);
    if (unknownKeys === 'reject') {
      addError(errors, context.location, `${context.path ? `${context.path}.` : ''}${key}`, 'UNKNOWN_FIELD', 'This field is not allowed.');
    }
    if (errors.abortEarly && errors.length > 0) break;
  }

  for (const [key, rule] of Object.entries(schema)) {
    if (errors.abortEarly && errors.length > 0) break;
    if (!isPlainObject(rule)) throw new TypeError(`The validation rule for "${key}" must be an object.`);
    const fieldPath = context.path ? `${context.path}.${key}` : key;
    const fieldResult = await validateField(input[key], rule, {
      ...context,
      path: fieldPath
    }, errors);
    if (fieldResult.present) setOwn(output, key, fieldResult.value);
  }

  return output;
}

function validate(schema, options = {}) {
  if (!isPlainObject(schema) || Object.keys(schema).length === 0) {
    throw new TypeError('validate() expects a non-empty schema object.');
  }
  for (const location of Object.keys(schema)) {
    if (!VALID_LOCATIONS.has(location)) {
      throw new TypeError(`Unsupported request location "${location}". Use body, params, query, or headers.`);
    }
    if (!isPlainObject(schema[location])) {
      throw new TypeError(`The schema for "${location}" must be an object.`);
    }
    for (const [key, rule] of Object.entries(schema[location])) assertValidRule(rule, `${location}.${key}`);
  }

  const unknownKeys = options.unknownKeys || 'strip';
  if (!VALID_UNKNOWN_KEY_MODES.has(unknownKeys)) {
    throw new TypeError('options.unknownKeys must be "strip", "allow", or "reject".');
  }
  const statusCode = options.statusCode === undefined ? 422 : options.statusCode;
  if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
    throw new TypeError('options.statusCode must be an HTTP error status between 400 and 599.');
  }
  const message = options.message || 'Request validation failed.';
  if (typeof message !== 'string') throw new TypeError('options.message must be a string.');
  if (options.onError !== undefined && typeof options.onError !== 'function') {
    throw new TypeError('options.onError must be a function.');
  }
  if (options.abortEarly !== undefined && typeof options.abortEarly !== 'boolean') {
    throw new TypeError('options.abortEarly must be a boolean.');
  }
  const abortEarly = options.abortEarly === true;

  return function inputGuardMiddleware(req, res, next) {
    (async () => {
      const validated = {};
      const errors = [];
      errors.abortEarly = abortEarly;

      for (const location of ['headers', 'params', 'query', 'body']) {
        if (!hasOwn(schema, location)) continue;
        const source = req[location] === undefined && location === 'body' ? {} : req[location];
        const sanitized = await validateObject(source, schema[location], {
          req,
          location,
          path: ''
        }, errors, unknownKeys);
        validated[location] = sanitized;
        if (abortEarly && errors.length > 0) break;
      }

      if (errors.length > 0) {
        if (typeof options.onError === 'function') {
          await options.onError({ req, res, errors, statusCode, message });
          return;
        }
        res.status(statusCode).json({
          success: false,
          message,
          errors
        });
        return;
      }

      const existingValidated = isPlainObject(req.validated) ? req.validated : {};
      req.validated = { ...existingValidated, ...validated };
      next();
    })().catch(next);
  };
}

module.exports = {
  validate,
  InputGuardError
};
