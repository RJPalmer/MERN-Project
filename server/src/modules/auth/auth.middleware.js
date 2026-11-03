const authService = require('./auth.service');

function createRequireAuth({ authenticateAccessToken } = authService) {
  return async function requireAuth(req, res, next) {
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
  };
}

const requireAuth = createRequireAuth();

module.exports = { createRequireAuth, requireAuth };
