const express = require('express');
const crypto = require('crypto');
const { requireAuth, requireGuest } = require('../middleware/authMiddleware');

const router = express.Router();

// Constant-time string comparison (hash first so unequal lengths don't throw / leak length).
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

router.post('/api/auth/login', requireGuest, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  // Authenticate strictly against the LIVE .env credentials — the single source of truth.
  // No DB lookup, so editing ADMIN_USERNAME/ADMIN_PASSWORD in .env takes effect immediately
  // (after the process reloads .env) and ONLY these credentials can ever log in.
  const envUser = (process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const envPass = process.env.ADMIN_PASSWORD || 'changeme123';

  const userOk = safeEqual(username.trim().toLowerCase(), envUser);
  const passOk = safeEqual(password, envPass);
  if (!userOk || !passOk) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  req.session.userId = envUser;
  req.session.username = envUser;
  res.json({ ok: true, username: envUser });
});

router.post('/api/auth/logout', requireAuth, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/api/auth/me', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({ loggedIn: true, username: req.session.username });
  }
  res.json({ loggedIn: false });
});


module.exports = router;
