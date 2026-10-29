const test = require('node:test');
const assert = require('node:assert/strict');

const { parseSetCartItem } = require('./cart.schemas');

test('parseSetCartItem accepts a supported quantity', () => {
  assert.deepEqual(parseSetCartItem({ quantity: 3 }), { quantity: 3 });
});

test('parseSetCartItem rejects a quantity below the minimum', () => {
  assert.throws(
    () => parseSetCartItem({ quantity: 0 }),
    (error) => {
      assert.equal(error.status, 400);
      assert.equal(error.code, 'VALIDATION_ERROR');
      assert.deepEqual(error.details, [
        { path: 'quantity', message: 'Too small: expected number to be >=1' },
      ]);
      return true;
    },
  );
});
