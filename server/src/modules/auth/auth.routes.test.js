const test = require('node:test');
const assert = require('node:assert/strict');

require('../../test-helpers/env-setup');
const { createRequireAuth } = require('./auth.middleware');
const { createAuthRouter } = require('./auth.routes');
const { createRouteClient } = require('../../test-helpers/route-harness');

const session = {
  user: { id: 'customer-1', email: 'customer@example.com' },
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
};

function setup() {
  const calls = [];
  const service = {
    REFRESH_COOKIE_NAME: 'refreshToken',
    cookieOptions: () => ({ httpOnly: true, sameSite: 'lax' }),
    register: async (input) => (calls.push(['register', input]), session),
    login: async (input) => (calls.push(['login', input]), session),
    refreshSession: async (token) => (calls.push(['refreshSession', token]), session),
    logout: async (token) => calls.push(['logout', token]),
    authenticateAccessToken: async (token) => {
      if (token !== 'access-token')
        throw Object.assign(new Error('Invalid access token'), {
          status: 401,
          code: 'UNAUTHENTICATED',
        });
      return session.user;
    },
  };
  const router = createAuthRouter({
    service,
    requireAuthMiddleware: createRequireAuth(service),
  });
  return { calls, router };
}

test('registration normalizes input and returns a session with a refresh cookie', async (t) => {
  const { calls, router } = setup();
  const api = await createRouteClient(router);
  t.after(() => api.close());

  const response = await api.request('/register', {
    method: 'POST',
    body: {
      email: ' CUSTOMER@EXAMPLE.COM ',
      password: 'long-password-here',
      displayName: ' Customer ',
    },
  });

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { user: session.user, accessToken: 'access-token' });
  assert.match(response.headers.get('set-cookie'), /refreshToken=refresh-token/);
  assert.deepEqual(calls[0], [
    'register',
    { email: 'customer@example.com', password: 'long-password-here', displayName: 'Customer' },
  ]);
});

test('login rejects invalid credentials input before calling the service', async (t) => {
  const { calls, router } = setup();
  const api = await createRouteClient(router);
  t.after(() => api.close());

  const response = await api.request('/login', {
    method: 'POST',
    body: { email: 'not-an-email', password: 'short' },
  });

  assert.equal(response.status, 400);
  assert.equal((await response.json()).error.code, 'VALIDATION_ERROR');
  assert.equal(calls.length, 0);
});

test('the current-user route requires and verifies a bearer token', async (t) => {
  const { router } = setup();
  const api = await createRouteClient(router);
  t.after(() => api.close());

  const unauthenticated = await api.request('/me');
  assert.equal(unauthenticated.status, 401);
  assert.equal((await unauthenticated.json()).error.code, 'UNAUTHENTICATED');

  const authenticated = await api.request('/me', {
    headers: { authorization: 'Bearer access-token' },
  });
  assert.equal(authenticated.status, 200);
  assert.deepEqual(await authenticated.json(), { user: session.user });
});
