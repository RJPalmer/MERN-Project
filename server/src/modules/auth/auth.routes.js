const express = require('express');
const { loginSchema, registerSchema } = require('./auth.schemas');
const { requireAuth } = require('./auth.middleware');
const authService = require('./auth.service');

const router = express.Router();

function validate(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const error = new Error('Request validation failed');
    error.status = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = result.error.issues.map(({ path, message }) => ({ path: path.join('.'), message }));
    throw error;
  }
  return result.data;
}

function sendSession(res, session, status = 200) {
  res.cookie(authService.REFRESH_COOKIE_NAME, session.refreshToken, authService.cookieOptions());
  return res.status(status).json({ user: session.user, accessToken: session.accessToken });
}

router.post('/register', async (req, res) => {
  const input = validate(registerSchema, req.body);
  const session = await authService.register(input);
  return sendSession(res, session, 201);
});

router.post('/login', async (req, res) => {
  const input = validate(loginSchema, req.body);
  const session = await authService.login(input);
  return sendSession(res, session);
});

router.post('/refresh', async (req, res) => {
  const session = await authService.refreshSession(req.cookies[authService.REFRESH_COOKIE_NAME]);
  return sendSession(res, session);
});

router.post('/logout', async (req, res) => {
  await authService.logout(req.cookies[authService.REFRESH_COOKIE_NAME]);
  res.clearCookie(authService.REFRESH_COOKIE_NAME, authService.cookieOptions());
  return res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.authUser }));

module.exports = router;
