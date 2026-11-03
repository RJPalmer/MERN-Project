const test = require('node:test');
const assert = require('node:assert/strict');

require('../../test-helpers/env-setup');
const { createCartRouter } = require('./cart.routes');
const { authenticatedAs, createRouteClient } = require('../../test-helpers/route-harness');

const cart = { id: 'cart-1', items: [], subtotal: { amount: 0, currency: 'USD' } };
const variantId = '507f1f77bcf86cd799439011';

function setup() {
  const calls = [];
  const service = {
    getCart: async (customerId) => (calls.push(['getCart', customerId]), cart),
    setItemQuantity: async (...args) => (calls.push(['setItemQuantity', ...args]), cart),
    removeItem: async (...args) => (calls.push(['removeItem', ...args]), cart),
    clearCart: async (customerId) => (calls.push(['clearCart', customerId]), cart),
  };
  return { calls, router: createCartRouter({ service, requireAuthMiddleware: authenticatedAs() }) };
}

test('cart read returns the authenticated customer cart', async (t) => {
  const { calls, router } = setup();
  const api = await createRouteClient(router);
  t.after(() => api.close());

  const response = await api.request('/');
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { cart });
  assert.deepEqual(calls, [['getCart', 'customer-1']]);
});

test('cart item update validates the variant ID and quantity before calling the service', async (t) => {
  const { calls, router } = setup();
  const api = await createRouteClient(router);
  t.after(() => api.close());

  const invalidId = await api.request('/items/not-an-id', { method: 'PUT', body: { quantity: 2 } });
  assert.equal(invalidId.status, 404);
  assert.equal((await invalidId.json()).error.code, 'VARIANT_NOT_FOUND');

  const invalidQuantity = await api.request(`/items/${variantId}`, {
    method: 'PUT',
    body: { quantity: 0 },
  });
  assert.equal(invalidQuantity.status, 400);
  assert.equal((await invalidQuantity.json()).error.code, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);

  const valid = await api.request(`/items/${variantId}`, { method: 'PUT', body: { quantity: 2 } });
  assert.equal(valid.status, 200);
  assert.deepEqual(calls, [['setItemQuantity', 'customer-1', variantId, 2]]);
});
