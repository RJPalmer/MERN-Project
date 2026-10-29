const test = require('node:test');
const assert = require('node:assert/strict');

const { parseShippingSettings } = require('./vendor.schemas');

test('shipping settings normalize currency and deduplicate countries', () => {
  assert.deepEqual(
    parseShippingSettings({
      flatRate: { amount: 799, currency: ' usd ' },
      eligibleCountryCodes: ['us', 'CA', 'US'],
    }),
    { flatRate: { amount: 799, currency: 'USD' }, eligibleCountryCodes: ['US', 'CA'] },
  );
});

test('shipping settings reject an empty eligible-country list', () => {
  assert.throws(
    () =>
      parseShippingSettings({
        flatRate: { amount: 799, currency: 'USD' },
        eligibleCountryCodes: [],
      }),
    (error) => error.status === 400 && error.code === 'VALIDATION_ERROR',
  );
});
