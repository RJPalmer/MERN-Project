const test = require('node:test');
const assert = require('node:assert/strict');

const { parseAddress } = require('./address.schemas');

const validAddress = {
  recipientName: 'Pat Customer',
  addressLine1: '12 Main Street',
  city: 'Boston',
  region: 'MA',
  postalCode: '02110',
  countryCode: 'us',
};

test('address parsing normalizes country and applies optional-field defaults', () => {
  const address = parseAddress(validAddress);

  assert.equal(address.countryCode, 'US');
  assert.equal(address.label, 'Home');
  assert.equal(address.phone, '');
  assert.equal(address.isDefaultShipping, false);
});

test('address parsing rejects a country code that is not two letters', () => {
  assert.throws(
    () => parseAddress({ ...validAddress, countryCode: 'USA' }),
    (error) => error.status === 400 && error.code === 'VALIDATION_ERROR',
  );
});
