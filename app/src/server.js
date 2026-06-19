require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const helmet = require('helmet');
const cors = require('cors');
const { Server } = require('socket.io');

const { db, initializeDatabase } = require('./config/database');
const { requireAuth, requireGuest } = require('./middleware/authMiddleware');
const queueService = require('./services/queueService');
const schedulerService = require('./services/schedulerService');

const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const configRoutes = require('./routes/configRoutes');
const claudeRoutes = require('./routes/claudeRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// ── Initialize DB ──
initializeDatabase();
seedAdminUser();
seedBlogConfigsFromEnv();
queueService.init(io);
queueService.resetStaleJobs(); // reset generating/posting jobs left orphaned by a previous server kill

// ── Trust reverse proxy (Nginx) so secure session cookies work over HTTPS ──
app.set('trust proxy', 1);

// ── Middleware ──
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com'],
      fontSrc: ["'self'", 'fonts.gstatic.com', 'cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', '*'],
      connectSrc: ["'self'", 'ws:', 'wss:'],
      scriptSrcAttr: ["'unsafe-inline'"],
    }
  }
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: path.join(__dirname, '../data') }),
  secret: process.env.APP_SECRET || 'ct-automation-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    // Secure cookies require HTTPS. Behind an HTTPS reverse proxy keep this true;
    // for a local HTTP run (e.g. http://localhost) set COOKIE_SECURE=false in .env,
    // otherwise the browser drops the session cookie and login loops back to the page.
    secure: process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === 'true'
      : process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24h
  },
}));

// ── Static files ──
app.use('/assets', express.static(path.join(__dirname, '../public/assets')));
app.get('/flow-3d', (req, res) => res.sendFile(path.join(__dirname, '../public/flow-3d.html')));

// Expose io to routes (used by claude terminal streaming)
app.set('io', io);

// ── Auth routes (no auth required) ──
app.use(authRoutes);

// ── Protected API routes ──
app.use(uploadRoutes);
app.use(dashboardRoutes);
app.use(configRoutes);
app.use(claudeRoutes);

// ── Page routes ──
app.get('/', requireGuest, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const protectedPages = ['/dashboard', '/upload', '/settings', '/claude-setup', '/jobs', '/pitch-demo'];
for (const page of protectedPages) {
  app.get(page, requireAuth, (req, res) => {
    const file = page === '/dashboard' ? 'dashboard.html'
      : page === '/upload' ? 'upload.html'
      : page === '/settings' ? 'settings.html'
      : page === '/jobs' ? 'jobs.html'
      : page === '/pitch-demo' ? 'pitch-demo.html'
      : 'claude-setup.html';
    res.sendFile(path.join(__dirname, '../public', file));
  });
}

// ── Socket.io ──
io.on('connection', (socket) => {
  // Send current state on connect
  socket.emit('queue:state', { paused: queueService.isQueuePaused(), testMode: queueService.isTestMode() });
  socket.emit('stats:update', queueService.getJobStats());
});

// Broadcast stats every 10 seconds
setInterval(() => {
  io.emit('stats:update', queueService.getJobStats());
}, 10000);

// ── Start scheduler ──
schedulerService.start();

// ── Start server ──
const PORT = parseInt(process.env.APP_PORT) || 3000;
server.listen(PORT, () => {
  console.log(`\n✅ CT Automation running at http://localhost:${PORT}`);
  console.log(`   Admin: ${process.env.ADMIN_USERNAME || 'admin'}`);
  console.log(`   Queue: ${queueService.isQueuePaused() ? 'PAUSED' : 'RUNNING'}\n`);
});

// ── Seed functions ──

async function seedAdminUser() {
  const username = (process.env.ADMIN_USERNAME || 'admin').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'changeme123';
  const hash = await bcrypt.hash(password, 12);

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (!existing) {
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);
    console.log(`[Setup] Admin user created: ${username}`);
  } else {
    // Always sync password from .env so changing it there takes effect on restart
    db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, username);
    console.log(`[Setup] Admin credentials synced from .env: ${username}`);
  }
}

function seedBlogConfigsFromEnv() {
  // Find all BLOG_*_NAME variables to detect configured blogs
  const slugs = new Set();
  for (const key of Object.keys(process.env)) {
    const match = key.match(/^BLOG_([A-Z0-9_]+)_NAME$/);
    if (match) slugs.add(match[1]);
  }

  for (const SLUG of slugs) {
    const slug = SLUG.toLowerCase();
    const existing = db.prepare('SELECT id, wp_category, wp_author_id FROM blog_configs WHERE slug = ?').get(slug);
    // Category/author are editable in the Settings UI. Env only overrides them when
    // explicitly set — an empty/missing env var keeps the UI-edited DB value instead
    // of resetting to '1' on every restart.
    const envCategory = (process.env[`BLOG_${SLUG}_WP_CATEGORY`] || '').trim();
    const envAuthor = parseInt(process.env[`BLOG_${SLUG}_WP_AUTHOR_ID`]);
    const vals = [
      process.env[`BLOG_${SLUG}_NAME`] || slug,
      process.env[`BLOG_${SLUG}_DOMAIN`] || '',
      process.env[`BLOG_${SLUG}_WP_URL`] || '',
      process.env[`BLOG_${SLUG}_WP_LOGIN_URL`] || '',
      process.env[`BLOG_${SLUG}_WP_USERNAME`] || '',
      process.env[`BLOG_${SLUG}_WP_PASSWORD`] || '',
      process.env[`BLOG_${SLUG}_WP_METHOD`] || 'browser',
      process.env[`BLOG_${SLUG}_WP_APP_PASSWORD`] || '',
      envCategory || existing?.wp_category || '1',
      envAuthor || existing?.wp_author_id || 1,
      process.env[`BLOG_${SLUG}_CONTEXT_PATH`] || '',
      process.env[`BLOG_${SLUG}_RULES_PATH`] || `../rules/${slug}_blog_generation.md`,
    ];
    if (!existing) {
      db.prepare(`
        INSERT INTO blog_configs (slug, name, domain, wp_url, wp_login_url, wp_username, wp_password, wp_method, wp_app_password, wp_category, wp_author_id, context_path, rules_path)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(slug, ...vals);
      console.log(`[Setup] Blog config created from .env: ${slug}`);
    } else {
      // Sync credentials from .env on every restart so .env is the source of truth
      db.prepare(`
        UPDATE blog_configs SET name=?, domain=?, wp_url=?, wp_login_url=?, wp_username=?,
          wp_password=?, wp_method=?, wp_app_password=?, wp_category=?,
          wp_author_id=?, context_path=?, rules_path=?, updated_at=datetime('now')
        WHERE slug=?
      `).run(...vals, slug);
      console.log(`[Setup] Blog config synced from .env: ${slug}`);
    }
  }
}
