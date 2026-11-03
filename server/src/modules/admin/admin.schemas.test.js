const test = require('node:test');
const assert = require('node:assert/strict');

const { parseReviewProduct, parseReviewVendor } = require('./admin.schemas');

test('review schemas accept activation without a rejection reason', () => {
  assert.deepEqual(parseReviewVendor({ status: 'active' }), { status: 'active' });
  assert.deepEqual(parseReviewProduct({ status: 'active' }), { status: 'active' });
});

test('review schemas require a meaningful rejection reason', () => {
  assert.throws(() => parseReviewVendor({ status: 'rejected', reason: 'no' }), {
    code: 'VALIDATION_ERROR',
    status: 400,
  });
  assert.throws(() => parseReviewProduct({ status: 'rejected' }), {
    code: 'VALIDATION_ERROR',
    status: 400,
  });
});
