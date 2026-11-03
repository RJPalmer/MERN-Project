const express = require('express');
const { loginSchema, registerSchema } = require('./auth.schemas');
const { requireAuth } = require('./auth.middleware');
const authService = require('./auth.service');

function createAuthRouter({ service = authService, requireAuthMiddleware = requireAuth } = {}) {
  const router = express.Router();

  function validate(schema, body) {
    const result = schema.safeParse(body);
    if (!result.success) {
      const error = new Error('Request validation failed');
      error.status = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = result.error.issues.map(({ path, message }) => ({
        path: path.join('.'),
        message,
      }));
      throw error;
    }
    return result.data;
  }

  function sendSession(res, session, status = 200) {
    res.cookie(service.REFRESH_COOKIE_NAME, session.refreshToken, service.cookieOptions());
    return res.status(status).json({ user: session.user, accessToken: session.accessToken });
  }

  router.post('/register', async (req, res) => {
    const input = validate(registerSchema, req.body);
    const session = await service.register(input);
    return sendSession(res, session, 201);
  });

  router.post('/login', async (req, res) => {
    const input = validate(loginSchema, req.body);
    const session = await service.login(input);
    return sendSession(res, session);
  });

  router.post('/refresh', async (req, res) => {
    const session = await service.refreshSession(req.cookies[service.REFRESH_COOKIE_NAME]);
    return sendSession(res, session);
  });

  router.post('/logout', async (req, res) => {
    await service.logout(req.cookies[service.REFRESH_COOKIE_NAME]);
    res.clearCookie(service.REFRESH_COOKIE_NAME, service.cookieOptions());
    return res.status(204).end();
  });

  router.get('/me', requireAuthMiddleware, (req, res) => res.json({ user: req.authUser }));

  return router;
}

module.exports = createAuthRouter();
module.exports.createAuthRouter = createAuthRouter;
