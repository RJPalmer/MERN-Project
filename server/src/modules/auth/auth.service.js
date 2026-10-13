const argon2 = require('argon2');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const User = require('../../models/User');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '30d';
const REFRESH_COOKIE_NAME = 'marketplace_refresh';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

class AuthError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function hashTokenId(tokenId) {
  return crypto.createHash('sha256').update(tokenId).digest('hex');
}

function issueAccessToken(user) {
  return jwt.sign({ type: 'access' }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    issuer: 'mern-marketplace',
    expiresIn: ACCESS_TOKEN_TTL,
  });
}

function issueRefreshToken(user) {
  const tokenId = crypto.randomUUID();
  return {
    token: jwt.sign({ type: 'refresh', jti: tokenId }, env.JWT_REFRESH_SECRET, {
      subject: user.id,
      issuer: 'mern-marketplace',
      expiresIn: REFRESH_TOKEN_TTL,
    }),
    tokenHash: hashTokenId(tokenId),
  };
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
    platformRole: user.platformRole,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}

async function createSession(user) {
  const refresh = issueRefreshToken(user);
  user.auth.refreshTokenHash = refresh.tokenHash;
  await user.save();
  return { accessToken: issueAccessToken(user), refreshToken: refresh.token };
}

async function register({ email, password, displayName }) {
  const existing = await User.exists({ email });
  if (existing) throw new AuthError(409, 'EMAIL_IN_USE', 'An account with this email already exists');

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  let user;
  try {
    user = await User.create({ email, passwordHash, displayName });
  } catch (error) {
    if (error.code === 11000) throw new AuthError(409, 'EMAIL_IN_USE', 'An account with this email already exists');
    throw error;
  }

  const session = await createSession(user);
  return { user: publicUser(user), ...session };
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash +auth.refreshTokenHash');
  const passwordMatches = user && await argon2.verify(user.passwordHash, password).catch(() => false);
  if (!passwordMatches || user.status !== 'active') {
    throw new AuthError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
  }

  user.lastLoginAt = new Date();
  const session = await createSession(user);
  return { user: publicUser(user), ...session };
}

async function refreshSession(token) {
  if (!token) throw new AuthError(401, 'UNAUTHENTICATED', 'Refresh token is required');

  let claims;
  try {
    claims = jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: 'mern-marketplace' });
  } catch {
    throw new AuthError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
  }

  if (claims.type !== 'refresh' || typeof claims.jti !== 'string') {
    throw new AuthError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
  }

  const user = await User.findById(claims.sub).select('+auth.refreshTokenHash');
  const presentedHash = hashTokenId(claims.jti);
  if (!user || user.status !== 'active' || !user.auth?.refreshTokenHash
    || !crypto.timingSafeEqual(Buffer.from(presentedHash), Buffer.from(user.auth.refreshTokenHash))) {
    throw new AuthError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired');
  }

  const next = issueRefreshToken(user);
  const updated = await User.findOneAndUpdate(
    { _id: user.id, 'auth.refreshTokenHash': presentedHash, status: 'active' },
    { $set: { 'auth.refreshTokenHash': next.tokenHash } },
    { new: true },
  );
  if (!updated) throw new AuthError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token has already been used');

  return { user: publicUser(updated), accessToken: issueAccessToken(updated), refreshToken: next.token };
}

async function logout(token) {
  if (!token) return;
  try {
    const claims = jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: 'mern-marketplace' });
    if (claims.type === 'refresh' && typeof claims.jti === 'string') {
      await User.updateOne(
        { _id: claims.sub, 'auth.refreshTokenHash': hashTokenId(claims.jti) },
        { $set: { 'auth.refreshTokenHash': null } },
      );
    }
  } catch {
    // Clearing the cookie is sufficient when its token is invalid or expired.
  }
}

async function authenticateAccessToken(token) {
  let claims;
  try {
    claims = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'mern-marketplace' });
  } catch {
    throw new AuthError(401, 'UNAUTHENTICATED', 'Access token is invalid or expired');
  }
  if (claims.type !== 'access') throw new AuthError(401, 'UNAUTHENTICATED', 'Access token is invalid or expired');

  const user = await User.findById(claims.sub);
  if (!user || user.status !== 'active') throw new AuthError(401, 'UNAUTHENTICATED', 'Account is unavailable');
  return publicUser(user);
}

module.exports = {
  AuthError,
  REFRESH_COOKIE_NAME,
  cookieOptions,
  authenticateAccessToken,
  login,
  logout,
  refreshSession,
  register,
};
