'use strict';

const express = require('express');
const { validate } = require('..');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const users = [];

app.post(
  '/users',
  validate({
    body: {
      name: {
        type: 'string',
        required: true,
        trim: true,
        minLength: 2,
        maxLength: 50
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
        min: 18,
        max: 120
      }
    }
  }),
  (req, res) => {
    const user = {
      id: users.length + 1,
      ...req.validated.body
    };
    users.push(user);
    res.status(201).json({ success: true, data: user });
  }
);

app.get(
  '/users/:id',
  validate({
    params: {
      id: { type: 'integer', required: true, coerce: true, min: 1 }
    }
  }),
  (req, res) => {
    const user = users.find((item) => item.id === req.validated.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, data: user });
  }
);

app.listen(PORT, () => {
  console.log(`Express Input Guard example running at http://localhost:${PORT}`);
  console.log('Try POST /users with JSON: {"name":"Ada","email":"ada@example.com","age":"24"}');
});
