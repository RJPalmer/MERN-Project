const test = require('node:test');
const assert = require('node:assert/strict');

require('../../test-helpers/env-setup');
const { createCheckoutRouter } = require('./checkout.routes');
const { authenticatedAs, createRouteClient } = require('../../test-helpers/route-harness');

const addressId = '507f1f77bcf86cd799439011';
const quote = {
  type: 'merchandise_preview',
  blockers: [{ code: 'TAX_NOT_CONFIGURED' }, { code: 'PAYMENTS_NOT_CONFIGURED' }],
};

function setup() {
  const calls = [];
  const service = {
    createCheckoutQuote: async (...args) => (calls.push(args), quote),
  };
  return {
    calls,
    router: createCheckoutRouter({ service, requireAuthMiddleware: authenticatedAs() }),
  };
}

test('checkout quote validates address ID and returns preview blockers', async (t) => {
  const { calls, router } = setup();
  const api = await createRouteClient(router);
  t.after(() => api.close());

  const invalid = await api.request('/quote', { method: 'POST', body: { addressId: 'bad' } });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);

  const valid = await api.request('/quote', { method: 'POST', body: { addressId } });
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), quote);
  assert.deepEqual(calls, [['customer-1', addressId]]);
});

test('checkout quote permits the service to use the customer default address', async (t) => {
  const { calls, router } = setup();
  const api = await createRouteClient(router);
  t.after(() => api.close());

  const response = await api.request('/quote', { method: 'POST', body: {} });
  assert.equal(response.status, 200);
  assert.deepEqual(calls, [['customer-1', undefined]]);
});
