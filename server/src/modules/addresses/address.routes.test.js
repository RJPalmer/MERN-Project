const test = require('node:test');
const assert = require('node:assert/strict');

require('../../test-helpers/env-setup');
const { createAddressRouter } = require('./address.routes');
const { authenticatedAs, createRouteClient } = require('../../test-helpers/route-harness');

const addressId = '507f1f77bcf86cd799439011';
const input = {
  recipientName: 'Pat Customer',
  addressLine1: '12 Main Street',
  city: 'Boston',
  region: 'MA',
  postalCode: '02110',
  countryCode: 'us',
};

function setup() {
  const calls = [];
  const address = { id: addressId, countryCode: 'US' };
  const service = {
    listAddresses: async (customerId) => (calls.push(['listAddresses', customerId]), [address]),
    createAddress: async (...args) => (calls.push(['createAddress', ...args]), address),
    updateAddress: async (...args) => (calls.push(['updateAddress', ...args]), address),
    deleteAddress: async (...args) => (calls.push(['deleteAddress', ...args]), { deleted: true }),
  };
  return {
    address,
    calls,
    router: createAddressRouter({ service, requireAuthMiddleware: authenticatedAs() }),
  };
}

test('address creation normalizes the body and returns 201', async (t) => {
  const { address, calls, router } = setup();
  const api = await createRouteClient(router);
  t.after(() => api.close());

  const response = await api.request('/', { method: 'POST', body: input });
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { address });
  assert.equal(calls[0][0], 'createAddress');
  assert.equal(calls[0][1], 'customer-1');
  assert.equal(calls[0][2].countryCode, 'US');
  assert.equal(calls[0][2].label, 'Home');
});

test('address update rejects malformed IDs without calling the service', async (t) => {
  const { calls, router } = setup();
  const api = await createRouteClient(router);
  t.after(() => api.close());

  const response = await api.request('/not-an-id', { method: 'PUT', body: input });
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error.code, 'ADDRESS_NOT_FOUND');
  assert.equal(calls.length, 0);
});
