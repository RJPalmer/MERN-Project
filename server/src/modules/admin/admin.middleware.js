function requireAdmin(req, res, next) {
  if (req.authUser?.platformRole !== 'admin') {
    return res
      .status(403)
      .json({ error: { code: 'FORBIDDEN', message: 'Administrator access is required' } });
  }
  return next();
}

module.exports = { requireAdmin };
