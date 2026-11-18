'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

let express;
try {
  express = require('express');
} catch {
  express = null;
}

const { validate } = require('../src/index.cjs');
const expressSkip = express ? false : 'Install the Express peer dependency to run integration tests.';

async function withServer(app, run) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('Express integration: validates and sanitizes a real POST request', { skip: expressSkip }, async () => {
  const app = express();
  app.use(express.json());

  app.post('/users', validate({
    body: {
      name: { type: 'string', required: true, trim: true, minLength: 2 },
      email: { type: 'string', required: true, format: 'email', trim: true, lowercase: true },
      age: { type: 'integer', coerce: true, min: 18, max: 120 }
    }
  }), (req, res) => {
    res.status(201).json({ data: req.validated.body });
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: '  Ada Lovelace  ',
        email: 'ADA@EXAMPLE.COM',
        age: '24'
      })
    });

    assert.equal(response.status, 201);
    assert.deepEqual(await response.json(), {
      data: { name: 'Ada Lovelace', email: 'ada@example.com', age: 24 }
    });
  });
});

test('Express integration: rejects invalid input and does not run the route', { skip: expressSkip }, async () => {
  const app = express();
  app.use(express.json());
  let routeWasCalled = false;

  app.post('/users', validate({
    body: {
      name: { type: 'string', required: true, trim: true, minLength: 2 },
      email: { type: 'string', required: true, format: 'email' },
      age: { type: 'integer', coerce: true, min: 18 }
    }
  }), (req, res) => {
    routeWasCalled = true;
    res.status(201).json({ data: req.validated.body });
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/users`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'A', email: 'not-an-email', age: '16' })
    });

    const payload = await response.json();
    assert.equal(response.status, 422);
    assert.equal(payload.success, false);
    assert.deepEqual(payload.errors.map((issue) => issue.path), ['name', 'email', 'age']);
    assert.equal(routeWasCalled, false);
  });
});

test('Express integration: validates URL params, query values, and headers', { skip: expressSkip }, async () => {
  const app = express();

  app.get('/records/:id', validate({
    params: { id: { type: 'integer', required: true, coerce: true, min: 1 } },
    query: { page: { type: 'integer', coerce: true, default: 1, min: 1 } },
    headers: { 'x-client-id': { type: 'string', required: true, minLength: 3 } }
  }), (req, res) => {
    res.json({
      id: req.validated.params.id,
      page: req.validated.query.page,
      clientId: req.validated.headers['x-client-id']
    });
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/records/7?page=3`, {
      headers: { 'x-client-id': 'web-client' }
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      id: 7,
      page: 3,
      clientId: 'web-client'
    });
  });
});
