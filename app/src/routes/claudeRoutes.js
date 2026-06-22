const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const claudeService = require('../services/claudeService');
const queueService = require('../services/queueService');

const router = express.Router();

// Full Claude status — CLI auth + API key + active mode
router.get('/api/claude/status', requireAuth, async (req, res) => {
  const cliStatus = await claudeService.checkCliStatus();
  const apiKeySet = !!process.env.ANTHROPIC_API_KEY;

  let activeMode = 'none';
  if (cliStatus.installed && cliStatus.authenticated) activeMode = 'cli';
  else if (apiKeySet) activeMode = 'sdk';

  res.json({
    active_mode: activeMode,
    model: queueService.getClaudeModel(),
    env_model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    cli: cliStatus,
    api_key_set: apiKeySet,
    api_key_preview: apiKeySet ? `${process.env.ANTHROPIC_API_KEY.substring(0, 8)}...` : null,
  });
});

// Live Claude usage limits (subscription session + weekly) via CLI OAuth token
router.get('/api/claude/usage', requireAuth, async (req, res) => {
  try {
    const usage = await claudeService.getClaudeUsage();
    res.json(usage);
  } catch (err) {
    res.status(500).json({ available: false, reason: err.message });
  }
});

// Test active connection
router.post('/api/claude/test', requireAuth, async (req, res) => {
  try {
    const result = await claudeService.testConnection();
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Terminal: run a live claude prompt and stream output via Socket.io
// The client listens on socket event 'terminal:line' and 'terminal:done'
router.post('/api/claude/terminal/run', requireAuth, (req, res) => {
  const io = req.app.get('io');
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.length > 500) {
    return res.status(400).json({ error: 'Invalid prompt (max 500 chars).' });
  }

  // Acknowledge the request immediately; output streams via Socket.io
  res.json({ ok: true, message: 'Running...' });

  claudeService.streamCliOutput(
    prompt,
    (line) => io.emit('terminal:line', line),
    (code) => {
      claudeService.invalidateCliCache(); // re-check auth after terminal run
      io.emit('terminal:done', { code, ok: code === 0 });
    }
  );
});

// Get context files for a blog config
router.get('/api/claude/context/:configId', requireAuth, (req, res) => {
  const { db } = require('../config/database');
  const fs = require('fs');
  const path = require('path');

  const config = db.prepare('SELECT * FROM blog_configs WHERE id = ?').get(req.params.configId);
  if (!config) return res.status(404).json({ error: 'Config not found' });
  if (!config.context_path) return res.json({ files: [], path: null });

  const absPath = path.resolve(process.cwd(), config.context_path);
  if (!fs.existsSync(absPath)) {
    return res.json({ files: [], warning: `Context path not found: ${config.context_path}` });
  }

  const files = fs.readdirSync(absPath)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const stat = fs.statSync(path.join(absPath, f));
      return { name: f, size: stat.size, modified: stat.mtime };
    });

  res.json({ files, path: config.context_path });
});

// Get / set active Claude model
router.get('/api/claude/model', requireAuth, (req, res) => {
  res.json({
    active: queueService.getClaudeModel(),
    env_default: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
  });
});

router.post('/api/claude/model', requireAuth, (req, res) => {
  const { model } = req.body;
  if (!model || typeof model !== 'string' || !model.trim()) {
    return res.status(400).json({ error: 'model is required' });
  }
  queueService.setClaudeModel(model.trim());
  queueService.addLog(null, 'info', `Claude model changed to: ${model.trim()}`);
  res.json({ ok: true, model: model.trim() });
});

// Get / set effort level
router.get('/api/claude/effort', requireAuth, (req, res) => {
  res.json({ active: queueService.getClaudeEffort() });
});

router.post('/api/claude/effort', requireAuth, (req, res) => {
  try {
    const { effort } = req.body;
    queueService.setClaudeEffort(effort);
    queueService.addLog(null, 'info', `Claude effort level changed to: ${effort}`);
    res.json({ ok: true, effort });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get / set the generation engine: 'native' (built-in 2-call pipeline) or
// 'seomachine' (seomachine methodology + Python quality gate). Global, applies to all blogs.
router.get('/api/claude/engine', requireAuth, (req, res) => {
  res.json({
    active: queueService.getGenerationEngine(),
    options: ['native', 'seomachine'],
    env_default: (process.env.GENERATION_ENGINE || 'native').toLowerCase(),
  });
});

router.post('/api/claude/engine', requireAuth, (req, res) => {
  try {
    const { engine } = req.body;
    queueService.setGenerationEngine(engine);
    queueService.addLog(null, 'info', `Generation engine changed to: ${String(engine).trim().toLowerCase()}`);
    res.json({ ok: true, engine: String(engine).trim().toLowerCase() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List available models — fetches from Anthropic API if key is set,
// otherwise returns the maintained built-in list.
// New models from Anthropic automatically appear when API key is configured.
const KNOWN_MODELS = [
  { id: 'claude-opus-4-8',             name: 'Opus 4.8',    desc: 'Most capable · 1M context · Complex work' },
  { id: 'claude-opus-4-7',             name: 'Opus 4.7',    desc: 'High capability · Complex work' },
  { id: 'claude-sonnet-4-6',           name: 'Sonnet 4.6',  desc: 'Best for everyday tasks · Recommended' },
  { id: 'claude-haiku-4-5-20251001',   name: 'Haiku 4.5',   desc: 'Fastest · Lowest cost · Quick tasks' },
];

// Models hidden from the picker regardless of what the live API returns
const BLOCKED_MODELS = ['claude-fable-5'];

// Maps a raw model id to a friendly name/description for the picker.
function describeModel(m) {
  const known = KNOWN_MODELS.find(k => k.id === m.id);
  let desc = known?.desc;
  if (!desc) {
    desc = 'Available';
    try {
      const ts = m.created_at;
      const d = typeof ts === 'number' && isFinite(ts) ? new Date(ts * 1000)
        : (typeof ts === 'string' && ts) ? new Date(ts) : null;
      if (d && !isNaN(d.getTime())) desc = `Released ${d.toISOString().split('T')[0]}`;
    } catch { /* keep 'Available' */ }
  }
  return { id: m.id, name: m.display_name || known?.name || m.id, desc };
}

router.get('/api/claude/models', requireAuth, async (req, res) => {
  const axios = require('axios');

  // 1) API key mode — fetch the live list from Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await axios.get('https://api.anthropic.com/v1/models?limit=50', {
        headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        timeout: 8000,
      });
      const apiModels = (response.data?.data || []).map(describeModel).filter(m => !BLOCKED_MODELS.includes(m.id));
      if (apiModels.length) return res.json({ models: apiModels, source: 'api' });
    } catch { /* fall through */ }
  }

  // 2) CLI (subscription) mode — fetch the live list using the local OAuth token, so newly
  //    launched models appear automatically without an API key.
  try {
    const oauth = claudeService.readOAuthCredentials && claudeService.readOAuthCredentials();
    if (oauth && oauth.accessToken && (!oauth.expiresAt || Date.now() < oauth.expiresAt)) {
      const base = (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, '');
      const response = await axios.get(`${base}/v1/models?limit=50`, {
        headers: {
          Authorization: `Bearer ${oauth.accessToken}`,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'oauth-2025-04-20',
        },
        timeout: 8000,
      });
      const apiModels = (response.data?.data || []).map(describeModel).filter(m => !BLOCKED_MODELS.includes(m.id));
      if (apiModels.length) return res.json({ models: apiModels, source: 'cli' });
    }
  } catch { /* fall through to built-in list */ }

  res.json({ models: KNOWN_MODELS, source: 'builtin' });
});

// Image service connectivity check — tests Pollinations.ai + checks API keys
router.get('/api/image/status', requireAuth, async (req, res) => {
  const https = require('https');

  // Quick HEAD check against Pollinations.ai (no image generated, just connectivity)
  const pollinationsStatus = await new Promise((resolve) => {
    const start = Date.now();
    const req2 = https.request(
      { hostname: 'image.pollinations.ai', path: '/', method: 'HEAD', timeout: 8000 },
      (r) => resolve({ connected: r.statusCode < 500, latency_ms: Date.now() - start })
    );
    req2.on('timeout', () => { req2.destroy(); resolve({ connected: false, reason: 'timeout' }); });
    req2.on('error',   () => resolve({ connected: false, reason: 'unreachable' }));
    req2.end();
  });

  const pexelsKey    = process.env.PEXELS_API_KEY    || '';
  const unsplashKey  = process.env.UNSPLASH_ACCESS_KEY || '';

  // Active source = first in priority chain that is available
  let activeSource = 'gradient';
  if (pollinationsStatus.connected)   activeSource = 'pollinations';
  else if (pexelsKey.length > 0)      activeSource = 'pexels';
  else if (unsplashKey.length > 0)    activeSource = 'unsplash';

  res.json({
    pollinations: pollinationsStatus,
    pexels:   { connected: pexelsKey.length > 0,   reason: pexelsKey   ? null : 'no API key' },
    unsplash: { connected: unsplashKey.length > 0, reason: unsplashKey ? null : 'no API key' },
    active_source: activeSource,
  });
});

module.exports = router;
