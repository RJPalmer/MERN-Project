const test = require('node:test');
const assert = require('node:assert/strict');

const { loginSchema, registerSchema } = require('./auth.schemas');

test('registration normalizes email and display name', () => {
  const result = registerSchema.safeParse({
    email: '  CUSTOMER@EXAMPLE.COM ',
    password: 'long-enough-password',
    displayName: '  Customer  ',
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.data, {
    email: 'customer@example.com',
    password: 'long-enough-password',
    displayName: 'Customer',
  });
});

test('login rejects passwords below the minimum length', () => {
  assert.equal(loginSchema.safeParse({ email: 'a@example.com', password: 'short' }).success, false);
});
