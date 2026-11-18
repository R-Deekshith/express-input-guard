# express-input-guard

Lightweight, schema-based request validation and sanitization middleware for Express.js.

`express-input-guard` validates request bodies, URL parameters, query parameters, and headers before a route handler runs. It can also normalize values (for example, trim strings or convert a numeric query string into a number) and makes the validated result available as `req.validated`.

> **Project status:** Early development (`0.1.0`). This is an initial release candidate for testing and feedback, not a claim of production maturity. Review the limitations and run the test suite before using it in a critical application.

## Why this package?

- **Express-native:** validation is regular Express middleware.
- **Small API:** define rules next to the route that needs them.
- **Safe output:** validated data is placed in `req.validated`; the original request object is not rewritten.
- **Useful defaults:** unknown fields are stripped, all validation errors are collected, and error details do not echo submitted values.
- **No runtime dependencies:** the validation engine uses Node.js built-ins.
- **TypeScript declarations:** included for editor support.

## Requirements

- Node.js 22 or newer
- Express 4.18 or newer, including Express 5 (installed by your application)
- TypeScript users should also install compatible Express type definitions (commonly `@types/express`) in their application.

## Installation

```bash
npm install express-input-guard
```

Express is a peer dependency of this package. Your application must install Express as well:

```bash
npm install express
```

For repository development and integration tests, install Express in the checkout with `npm install --no-save express`.

## Quick start

```javascript
const express = require('express');
const { validate } = require('express-input-guard');

const app = express();
app.use(express.json());

app.post(
  '/users',
  validate({
    body: {
      name: {
        type: 'string',
        required: true,
        trim: true,
        minLength: 2
      },
      email: {
        type: 'string',
        required: true,
        format: 'email',
        trim: true,
        lowercase: true
      },
      age: {
        type: 'integer',
        coerce: true,
        min: 18
      }
    }
  }),
  (req, res) => {
    // Use only the validated and normalized data in your handler.
    res.status(201).json({
      success: true,
      data: req.validated.body
    });
  }
);

app.listen(3000);
```

For the request body:

```json
{
  "name": "  Ada Lovelace  ",
  "email": "ADA@EXAMPLE.COM",
  "age": "24",
  "unexpected": "This field is removed by the default policy"
}
```

`req.validated.body` becomes:

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "age": 24
}
```

The original `req.body` is not mutated. When `required: true` and `trim: true` are both set, a whitespace-only string is treated as missing.

### ES modules

The package also supports ES module imports:

```javascript
import express from 'express';
import { validate } from 'express-input-guard';

const app = express();
app.use(express.json());
```

## Request locations

Pass one or more of these keys to `validate()`:

| Key | Express property | Common use |
| --- | --- | --- |
| `body` | `req.body` | JSON or form payload |
| `params` | `req.params` | URL path parameters |
| `query` | `req.query` | Query-string values |
| `headers` | `req.headers` | Request headers (use lowercase names) |

Example:

```javascript
app.get(
  '/products/:id',
  validate({
    params: {
      id: { type: 'integer', required: true, coerce: true, min: 1 }
    },
    query: {
      page: { type: 'integer', coerce: true, default: 1, min: 1 },
      limit: { type: 'integer', coerce: true, default: 20, min: 1, max: 100 }
    },
    headers: {
      'x-client-id': { type: 'string', required: true, minLength: 3 }
    }
  }),
  (req, res) => {
    res.json({
      id: req.validated.params.id,
      page: req.validated.query.page,
      limit: req.validated.query.limit,
      clientId: req.validated.headers['x-client-id']
    });
  }
);
```

## Field rules

| Rule | Type | Description |
| --- | --- | --- |
| `required` | boolean | Require the field to be present |
| `nullable` | boolean | Permit `null` |
| `type` | string | `string`, `number`, `integer`, `boolean`, `array`, or `object` |
| `coerce` | boolean | Convert numeric/integer/boolean strings to the requested type |
| `trim` | boolean | Trim leading and trailing whitespace from strings |
| `lowercase` | boolean | Convert strings to lowercase |
| `uppercase` | boolean | Convert strings to uppercase |
| `default` | any | Value used when the field is missing; may be an async function |
| `minLength` / `maxLength` | number | String length boundaries |
| `min` / `max` | number | Numeric boundaries |
| `format` | string | `email`, `url`, or `uuid` |
| `pattern` | RegExp or string | Regular expression constraint for strings |
| `enum` | array | Allowed values |
| `minItems` / `maxItems` | number | Array length boundaries |
| `items` | object | Rule applied to each array item |
| `properties` | object | Rules for nested object properties |
| `unknownKeys` | string | Nested object policy: `strip`, `allow`, or `reject` |
| `custom` | function | Synchronous or asynchronous custom validation |
| `messages` | object | Override messages for individual rule failures |

### Custom validation

A custom validator receives the value and a context containing `req`, `location`, and `path`.

Return:
- `true` or `undefined` to accept the value;
- `false` to use the configured custom message;
- a string to return that string as the validation message.

```javascript
username: {
  type: 'string',
  required: true,
  custom: async (value) => {
    const alreadyUsed = await userExists(value);
    return alreadyUsed ? 'That username is already taken.' : true;
  }
}
```

If a custom validator throws, the middleware forwards the error to Express with `next(error)`.

### Nested objects and arrays

```javascript
validate({
  body: {
    profile: {
      type: 'object',
      properties: {
        city: { type: 'string', required: true },
        postalCode: { type: 'string', pattern: '^\\d{6}$' }
      }
    },
    tags: {
      type: 'array',
      minItems: 1,
      items: { type: 'string', trim: true, minLength: 2 }
    }
  }
});
```

## Middleware options

```javascript
validate(schema, options)
```

| Option | Default | Description |
| --- | --- | --- |
| `abortEarly` | `false` | Stop after the first validation error |
| `statusCode` | `422` | HTTP error status for validation failures (400–599) |
| `message` | `Request validation failed.` | Top-level error message |
| `unknownKeys` | `strip` | What to do with undeclared fields: `strip`, `allow`, or `reject` |
| `onError` | built-in response | Custom function receiving `{ req, res, errors, statusCode, message }` |

### Unknown fields

- `strip` (default): removes undeclared keys from `req.validated`.
- `allow`: copies undeclared keys into `req.validated` without validating them.
- `reject`: returns an `UNKNOWN_FIELD` issue for undeclared keys.

For security-sensitive endpoints, consider `unknownKeys: 'reject'` so unexpected input is visible rather than silently ignored.

### Exported error helper

`InputGuardError` is also exported for applications that want a structured validation-related error object in their own middleware or custom validation flow:

```javascript
const { InputGuardError } = require('express-input-guard');

const error = new InputGuardError(
  'The request could not be accepted.',
  [{ location: 'body', path: 'email', code: 'INVALID_FORMAT', message: 'Enter a valid email.' }],
  422
);
```

The normal `validate()` middleware sends its own HTTP response when a schema check fails; it does not throw `InputGuardError` for ordinary validation failures.

## Validation error response

By default, invalid input returns HTTP `422`:

```json
{
  "success": false,
  "message": "Request validation failed.",
  "errors": [
    {
      "location": "body",
      "path": "email",
      "code": "INVALID_FORMAT",
      "message": "Must be a valid email."
    }
  ]
}
```

Submitted values are intentionally excluded from error details to avoid accidentally exposing passwords, tokens, or other sensitive input.

## Testing

Clone the repository, install Express for the integration tests, and run:

```bash
npm install --no-save express
npm run check
npm test
```

The suite uses Node.js's built-in test runner. Unit tests exercise the validation engine; integration tests start a real Express server and send HTTP requests. The integration tests are skipped with an explanatory message if Express has not been installed.

The GitHub Actions workflow checks Node.js 22, 24, and 26 against Express 4.22 and Express 5.3.

## Example application

Install Express in the cloned project and start the example. The example imports the package from the repository root:

```bash
npm install express
node examples/basic-express-app.js
```

The example exposes `POST /users` and `GET /users/:id`. It uses an in-memory array only to demonstrate validation; it is not a database-backed application.

## Important limitations

- This package validates request shape and values; it does not replace authentication, authorization, rate limiting, database constraints, or business-rule checks.
- `required: true` rejects a missing value. For strings, combine it with `trim: true` to reject a whitespace-only value as well.
- Email validation uses a practical format check, not mailbox verification.
- URL validation accepts HTTP and HTTPS URLs only.
- Coercion is opt-in. Avoid coercing fields where strict input types are required.
- Custom validators are application code. They should be safe, fast, and should not leak sensitive data in thrown error messages.
- The package is in early development. Review behavior and add project-specific tests before production use.

## Contributing

Bug reports, feature requests, tests, documentation improvements, and pull requests are welcome. Please include a minimal reproducible example and tests for behavior changes.

## Attribution and development assistance

- **Runtime:** Node.js built-in APIs are used by the validation engine; there are no runtime dependencies.
- **Framework:** Express.js is a peer dependency and is used by the demonstration app and integration tests. See the [Express documentation](https://expressjs.com/).
- **AI-assisted development disclosure:** OpenAI ChatGPT was used to assist with code scaffolding, debugging, test planning, and documentation. The project maintainer is responsible for reviewing, testing, and maintaining the released code.
- **Reference documentation:** [Node.js documentation](https://nodejs.org/docs/latest/api/) and [npm documentation](https://docs.npmjs.com/) were used for platform and package-management guidance.
- No third-party validation library is bundled or copied into this package.

## License

MIT
