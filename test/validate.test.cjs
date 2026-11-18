'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validate, InputGuardError } = require('../src/index.cjs');

function runMiddleware(middleware, request = {}) {
  return new Promise((resolve, reject) => {
    const response = {
      statusCode: null,
      body: null,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; resolve({ request, response: this, nextCalled: false }); }
    };
    middleware(request, response, (error) => {
      if (error) reject(error);
      else resolve({ request, response, nextCalled: true });
    });
  });
}

test('validate exports a middleware function', () => {
  assert.equal(typeof validate, 'function');
  assert.equal(typeof validate({ body: { name: { type: 'string' } } }), 'function');
});

test('rejects an empty schema', () => {
  assert.throws(() => validate({}), /non-empty schema/);
});

test('rejects unsupported request locations', () => {
  assert.throws(() => validate({ cookies: {} }), /Unsupported request location/);
});

test('accepts valid body fields and puts sanitized data in req.validated', async () => {
  const middleware = validate({ body: {
    name: { type: 'string', required: true, trim: true, minLength: 2 },
    email: { type: 'string', required: true, format: 'email', lowercase: true },
    age: { type: 'integer', coerce: true, min: 18 }
  } });
  const result = await runMiddleware(middleware, {
    body: { name: '  Ada  ', email: 'ADA@EXAMPLE.COM', age: '24', extra: 'removed' }
  });
  assert.equal(result.nextCalled, true);
  assert.deepEqual(result.request.validated.body, {
    name: 'Ada', email: 'ada@example.com', age: 24
  });
});

test('returns multiple required and type errors by default', async () => {
  const middleware = validate({ body: {
    name: { type: 'string', required: true },
    age: { type: 'number', required: true }
  } });
  const result = await runMiddleware(middleware, { body: {} });
  assert.equal(result.response.statusCode, 422);
  assert.equal(result.response.body.success, false);
  assert.equal(result.response.body.errors.length, 2);
});

test('supports abortEarly', async () => {
  const middleware = validate({ body: {
    first: { type: 'string', required: true },
    second: { type: 'string', required: true }
  } }, { abortEarly: true });
  const result = await runMiddleware(middleware, { body: {} });
  assert.equal(result.response.body.errors.length, 1);
});

test('supports custom error status and message', async () => {
  const middleware = validate({ body: { email: { type: 'string', format: 'email' } } }, {
    statusCode: 400,
    message: 'Please check your input'
  });
  const result = await runMiddleware(middleware, { body: { email: 'bad' } });
  assert.equal(result.response.statusCode, 400);
  assert.equal(result.response.body.message, 'Please check your input');
});

test('supports custom error response callback', async () => {
  let called = false;
  const middleware = validate({ body: { name: { type: 'string', required: true } } }, {
    onError({ res, errors }) {
      called = true;
      res.status(400).json({ problemCount: errors.length });
    }
  });
  const result = await runMiddleware(middleware, { body: {} });
  assert.equal(called, true);
  assert.deepEqual(result.response.body, { problemCount: 1 });
});

test('supports unknownKeys strip mode by default', async () => {
  const middleware = validate({ body: { title: { type: 'string' } } });
  const result = await runMiddleware(middleware, { body: { title: 'Hello', admin: true } });
  assert.deepEqual(result.request.validated.body, { title: 'Hello' });
});

test('supports unknownKeys allow mode', async () => {
  const middleware = validate({ body: { title: { type: 'string' } } }, { unknownKeys: 'allow' });
  const result = await runMiddleware(middleware, { body: { title: 'Hello', tag: 'news' } });
  assert.deepEqual(result.request.validated.body, { title: 'Hello', tag: 'news' });
});

test('supports unknownKeys reject mode', async () => {
  const middleware = validate({ body: { title: { type: 'string' } } }, { unknownKeys: 'reject' });
  const result = await runMiddleware(middleware, { body: { title: 'Hello', admin: true } });
  assert.equal(result.response.body.errors[0].code, 'UNKNOWN_FIELD');
});

test('validates URL parameters and query parameters', async () => {
  const middleware = validate({
    params: { id: { type: 'integer', coerce: true, min: 1 } },
    query: { page: { type: 'integer', coerce: true, default: 1, min: 1 } }
  });
  const result = await runMiddleware(middleware, { params: { id: '8' }, query: {} });
  assert.deepEqual(result.request.validated.params, { id: 8 });
  assert.deepEqual(result.request.validated.query, { page: 1 });
});

test('validates request headers', async () => {
  const middleware = validate({ headers: { 'x-client-id': { type: 'string', required: true } } });
  const result = await runMiddleware(middleware, { headers: { 'x-client-id': 'web' } });
  assert.deepEqual(result.request.validated.headers, { 'x-client-id': 'web' });
});

test('validates nested object properties', async () => {
  const middleware = validate({ body: {
    profile: { type: 'object', properties: {
      city: { type: 'string', required: true },
      pin: { type: 'string', pattern: '^\\d{6}$' }
    } }
  } });
  const result = await runMiddleware(middleware, { body: { profile: { city: 'Bengaluru', pin: '560001' } } });
  assert.deepEqual(result.request.validated.body.profile, { city: 'Bengaluru', pin: '560001' });
});

test('reports nested validation paths', async () => {
  const middleware = validate({ body: {
    profile: { type: 'object', properties: { city: { type: 'string', required: true } } }
  } });
  const result = await runMiddleware(middleware, { body: { profile: {} } });
  assert.equal(result.response.body.errors[0].path, 'profile.city');
});

test('validates array items and array length', async () => {
  const middleware = validate({ body: {
    tags: { type: 'array', minItems: 1, items: { type: 'string', minLength: 2 } }
  } });
  const result = await runMiddleware(middleware, { body: { tags: ['ok', 'x'] } });
  assert.equal(result.response.body.errors[0].path, 'tags[1]');
});

test('supports allowed values', async () => {
  const middleware = validate({ body: { role: { type: 'string', enum: ['user', 'admin'] } } });
  const result = await runMiddleware(middleware, { body: { role: 'root' } });
  assert.equal(result.response.body.errors[0].code, 'NOT_IN_ALLOWED_VALUES');
});

test('supports asynchronous custom validators', async () => {
  const middleware = validate({ body: {
    username: { type: 'string', custom: async (value) => value !== 'taken' || 'Username is already taken.' }
  } });
  const result = await runMiddleware(middleware, { body: { username: 'taken' } });
  assert.equal(result.response.body.errors[0].message, 'Username is already taken.');
});

test('passes thrown custom-validator errors to next', async () => {
  const middleware = validate({ body: {
    username: { type: 'string', custom: async () => { throw new Error('Validator service unavailable'); } }
  } });
  await assert.rejects(runMiddleware(middleware, { body: { username: 'ada' } }), /Validator service unavailable/);
});

test('does not mutate the original request body', async () => {
  const input = { name: '  Ada  ' };
  const middleware = validate({ body: { name: { type: 'string', trim: true } } });
  const result = await runMiddleware(middleware, { body: input });
  assert.equal(result.request.body.name, '  Ada  ');
  assert.equal(result.request.validated.body.name, 'Ada');
});

test('does not expose rejected input values in error details', async () => {
  const middleware = validate({ body: { password: { type: 'string', minLength: 12 } } });
  const result = await runMiddleware(middleware, { body: { password: 'short-secret' } });
  assert.equal(JSON.stringify(result.response.body).includes('short-secret'), false);
});

test('merges validated segments from multiple middleware calls', async () => {
  const first = validate({ params: { id: { type: 'integer', coerce: true } } });
  const second = validate({ body: { name: { type: 'string' } } });
  const request = { params: { id: '5' }, body: { name: 'Ada' } };
  await runMiddleware(first, request);
  await runMiddleware(second, request);
  assert.deepEqual(request.validated, { params: { id: 5 }, body: { name: 'Ada' } });
});

test('supports nullable fields', async () => {
  const middleware = validate({ body: { nickname: { type: 'string', nullable: true } } });
  const result = await runMiddleware(middleware, { body: { nickname: null } });
  assert.deepEqual(result.request.validated.body, { nickname: null });
});

test('rejects invalid options', () => {
  assert.throws(() => validate({ body: {} }, { unknownKeys: 'keep' }), /unknownKeys/);
  assert.throws(() => validate({ body: {} }, { statusCode: 200 }), /HTTP error status/);
  assert.throws(() => validate({ body: {} }, { onError: true }), /onError/);
});

test('InputGuardError stores structured validation details', () => {
  const issue = { location: 'body', path: 'email', code: 'INVALID_FORMAT', message: 'Must be an email.' };
  const error = new InputGuardError('Invalid input', [issue]);
  assert.equal(error.name, 'InputGuardError');
  assert.equal(error.statusCode, 422);
  assert.equal(error.errors[0].path, 'email');
});


test('supports the ESM entry point', async () => {
  const imported = await import('../src/index.mjs');
  assert.equal(typeof imported.validate, 'function');
  assert.equal(typeof imported.InputGuardError, 'function');
});

test('treats an absent request body as an empty object for required checks', async () => {
  const middleware = validate({ body: { title: { type: 'string', required: true } } });
  const result = await runMiddleware(middleware, {});
  assert.equal(result.response.statusCode, 422);
  assert.equal(result.response.body.errors[0].path, 'title');
});


test('validates schema configuration before handling a request', () => {
  assert.throws(() => validate({ body: { age: { type: 'unknown' } } }), /Unsupported validation type/);
  assert.throws(() => validate({ body: { email: { format: 'mail' } } }), /Unsupported format/);
  assert.throws(() => validate({ body: { code: { type: 'string', pattern: '[' } } }), /Invalid regular expression/);
  assert.throws(() => validate({ body: { tags: { minItems: -1 } } }), /non-negative integer/);
});

test('rejects a non-boolean abortEarly option', () => {
  assert.throws(() => validate({ body: {} }, { abortEarly: 'yes' }), /abortEarly must be a boolean/);
});


test('rejects whitespace-only required strings after trimming', async () => {
  const middleware = validate({
    body: { name: { type: 'string', required: true, trim: true, minLength: 2 } }
  });
  const result = await runMiddleware(middleware, { body: { name: '   ' } });
  assert.equal(result.response.statusCode, 422);
  assert.equal(result.response.body.errors[0].code, 'REQUIRED');
});

test('validates boolean rule settings and incompatible rule combinations', () => {
  assert.throws(
    () => validate({ body: { name: { type: 'string', required: 'yes' } } }),
    /required.*boolean/
  );
  assert.throws(
    () => validate({ body: { email: { type: 'number', format: 'email' } } }),
    /requires type "string"/
  );
  assert.throws(
    () => validate({ body: { name: { type: 'string', minLength: 10, maxLength: 2 } } }),
    /minLength.*cannot exceed.*maxLength/
  );
  assert.throws(
    () => validate({ body: { title: { type: 'string', lowercase: true, uppercase: true } } }),
    /cannot both be enabled/
  );
});
