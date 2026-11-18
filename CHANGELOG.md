# Changelog

## 0.1.0 - Initial development release

- Add Express middleware for validating body, params, query, and headers.
- Add field rules for types, formats, ranges, patterns, arrays, nested objects, and custom validators.
- Add optional sanitization and primitive coercion.
- Add configurable unknown-field behavior and validation error responses.
- Add TypeScript declarations and CommonJS/ESM entry points.
- Add Express integration tests for valid requests, invalid requests, and params/query/header validation.
- Reject whitespace-only required strings when trimming is enabled and validate schema rule configuration earlier.
- Add Node.js compatibility metadata, GitHub Actions checks, and release documentation.
