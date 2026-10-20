const { authenticateAccessToken } = require('./auth.service');

async function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res
      .status(401)
      .json({ error: { code: 'UNAUTHENTICATED', message: 'Bearer access token is required' } });
  }

  try {
    req.authUser = await authenticateAccessToken(match[1]);
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireAuth };
