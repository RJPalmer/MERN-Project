const test = require('node:test');
const assert = require('node:assert/strict');

const { parseStockAdjustment } = require('./inventory.schemas');

test('stock adjustment accepts a positive receipt', () => {
  assert.deepEqual(parseStockAdjustment({ type: 'receipt', quantityDelta: 5, note: 'Restock' }), {
    type: 'receipt',
    quantityDelta: 5,
    note: 'Restock',
  });
});

test('stock adjustment rejects a receipt that removes stock', () => {
  assert.throws(
    () => parseStockAdjustment({ type: 'receipt', quantityDelta: -1, note: 'Correction' }),
    (error) =>
      error.status === 400 &&
      error.code === 'VALIDATION_ERROR' &&
      error.details.some((detail) => detail.path === 'quantityDelta'),
  );
});
