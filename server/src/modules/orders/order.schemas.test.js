const test = require('node:test');
const assert = require('node:assert/strict');

const { parseShipment } = require('./order.schemas');

test('shipment parsing trims fields and defaults tracking URL', () => {
  assert.deepEqual(parseShipment({ carrier: ' UPS ', number: ' 1Z123 ' }), {
    carrier: 'UPS',
    number: '1Z123',
    url: '',
  });
});

test('shipment parsing rejects a malformed tracking URL', () => {
  assert.throws(
    () => parseShipment({ carrier: 'UPS', number: '1Z123', url: 'not a url' }),
    (error) => error.status === 400 && error.code === 'VALIDATION_ERROR',
  );
});
