function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  // API routes return JSON; page routes redirect
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.redirect('/');
}

function requireGuest(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
}

module.exports = { requireAuth, requireGuest };
