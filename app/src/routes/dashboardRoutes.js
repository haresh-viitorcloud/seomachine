const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const queueService = require('../services/queueService');
const schedulerService = require('../services/schedulerService');
const seoScoreService = require('../services/seoScoreService');
const claudeService = require('../services/claudeService');

const router = express.Router();

// Dashboard stats + queue overview (optional ?blog= scopes stats to one blog)
router.get('/api/dashboard', requireAuth, (req, res) => {
  const blogId = parseInt(req.query.blog) || null;
  const stats = queueService.getJobStats(blogId);
  const recentLogs = queueService.getRecentLogs(50);
  const queuePaused = queueService.isQueuePaused();
  const isProcessing = schedulerService.isProcessing();

  res.json({ stats, recentLogs, queuePaused, isProcessing });
});

// Analytics — generation counts, token usage & cost (daily/weekly/monthly), optional ?blog=
router.get('/api/analytics', requireAuth, (req, res) => {
  const period = ['daily', 'weekly', 'monthly'].includes(req.query.period) ? req.query.period : 'daily';
  const blogId = parseInt(req.query.blog) || null;
  res.json(queueService.getAnalytics(period, blogId));
});

// All jobs with pagination, optional day-range filter and optional ?blog= scope
router.get('/api/jobs', requireAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const offset = parseInt(req.query.offset) || 0;
  const days  = parseInt(req.query.days) || 0; // 0 = all time
  const blogId = parseInt(req.query.blog) || null;
  const jobs  = queueService.getAllJobs(limit, offset, days, blogId);
  res.json({ jobs, stats: queueService.getJobStats(blogId) });
});

// Single job details
router.get('/api/jobs/:id', requireAuth, (req, res) => {
  const job = queueService.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const logs = queueService.getJobLogs(req.params.id);
  res.json({ job, logs });
});

// Job preview (generated content)
router.get('/api/jobs/:id/preview', requireAuth, (req, res) => {
  const job = queueService.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const tags = job.generated_tags ? JSON.parse(job.generated_tags) : [];
  const title = job.generated_title || job.title;

  // Predicted Rank Math-style SEO score (only when content exists)
  let seo = null;
  if (job.generated_content) {
    const { db } = require('../config/database');
    const blog = db.prepare('SELECT wp_url, domain FROM blog_configs WHERE id = ?').get(job.blog_id);
    let secondary = [];
    try { secondary = JSON.parse(job.raw_data || '{}').secondary_keywords || []; } catch { /* ignore */ }
    seo = seoScoreService.scoreContent({
      title,
      // Use the stored SEO title, or the same normalized title that posting will produce
      seoTitle: job.generated_seo_title || claudeService.normalizeSeoTitle(title, job.primary_keyword),
      content: job.generated_content,
      meta: job.generated_meta,
      primaryKeyword: job.primary_keyword,
      secondaryKeywords: secondary,
      siteUrl: blog?.wp_url || (blog?.domain ? `https://${blog.domain}` : ''),
    });
  }

  res.json({
    title,
    meta_description: job.generated_meta,
    content: job.generated_content,
    image_prompt: job.generated_image_prompt,
    tags,
    wp_post_id: job.wp_post_id,
    wp_post_url: job.wp_post_url,
    image_source: job.image_source || '',
    seo,
  });
});

// Queue control
router.post('/api/queue/pause', requireAuth, (req, res) => {
  queueService.setQueuePaused(true);
  queueService.addLog(null, 'warning', 'Queue paused by user');
  res.json({ ok: true, paused: true });
});

router.post('/api/queue/resume', requireAuth, (req, res) => {
  queueService.setQueuePaused(false);
  queueService.addLog(null, 'info', 'Queue resumed by user');
  res.json({ ok: true, paused: false });
});

// Bulk job actions: pause_pending, resume_paused
router.post('/api/queue/bulk', requireAuth, (req, res) => {
  const { action } = req.body;

  if (action === 'pause_pending') {
    const pending = queueService.getJobsByStatus('pending');
    let count = 0;
    for (const job of pending) {
      try { queueService.pauseJob(job.id); count++; } catch { /* skip */ }
    }
    queueService.addLog(null, 'warning', `Bulk pause: ${count} pending jobs paused`);
    return res.json({ ok: true, count });
  }

  if (action === 'resume_paused' || action === 'resume') {
    const paused = queueService.getJobsByStatus('paused');
    let count = 0;
    for (const job of paused) {
      try { queueService.resumeJob(job.id); count++; } catch { /* skip */ }
    }
    queueService.addLog(null, 'info', `Bulk resume: ${count} paused jobs resumed`);
    return res.json({ ok: true, count });
  }

  res.status(400).json({ error: `Unknown bulk action: ${action}` });
});

router.post('/api/queue/test-mode', requireAuth, (req, res) => {
  const { enabled } = req.body;
  queueService.setTestMode(!!enabled);
  queueService.addLog(null, 'warning', `Test mode ${enabled ? 'ENABLED' : 'disabled'} — generation will ${enabled ? 'use mock content' : 'call Claude API'}`);
  res.json({ ok: true, testMode: !!enabled });
});

router.post('/api/queue/process-next', requireAuth, async (req, res) => {
  try {
    const job = await schedulerService.processNext();
    res.json({ ok: true, job_id: job.id, message: `Processing: ${job.title}` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Job actions
router.post('/api/jobs/:id/retry', requireAuth, async (req, res) => {
  try {
    queueService.retryJob(req.params.id);
    // Trigger worker
    schedulerService.processNext().catch(() => {});
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/api/jobs/:id/skip', requireAuth, (req, res) => {
  try {
    queueService.skipJob(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/api/jobs/:id/pause', requireAuth, (req, res) => {
  try {
    queueService.pauseJob(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Submit feedback on a generated/drafted job — applied to future generations
router.post('/api/jobs/:id/feedback', requireAuth, (req, res) => {
  try {
    const { rating, feedback } = req.body;
    const entry = queueService.addFeedback(req.params.id, { rating, feedback });
    res.json({ ok: true, entry });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List feedback left on a specific job
router.get('/api/jobs/:id/feedback', requireAuth, (req, res) => {
  try {
    res.json({ ok: true, feedback: queueService.getFeedbackForJob(req.params.id) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Remove a feedback note (stops applying it to future generations)
router.delete('/api/feedback/:id', requireAuth, (req, res) => {
  try {
    queueService.deleteFeedback(parseInt(req.params.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/api/jobs/:id/resume', requireAuth, (req, res) => {
  try {
    queueService.resumeJob(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/api/jobs/:id/process-now', requireAuth, async (req, res) => {
  try {
    // Validate job exists and is in a runnable state before responding
    const job = queueService.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (['generating', 'posting'].includes(job.status)) {
      return res.status(400).json({ error: 'Job is already running.' });
    }
    if (schedulerService.isProcessing()) {
      return res.status(400).json({ error: 'Another job is already running. Wait for it to finish.' });
    }

    // Respond immediately — don't await the full job
    res.json({ ok: true, message: `Processing started: ${job.title}` });

    // Run in background — socket events will update the UI in real-time
    schedulerService.processJobById(req.params.id).catch((err) => {
      console.error('[process-now] Job failed:', err.message);
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update job metadata (title, keyword, secondary keywords, per-job instructions)
router.put('/api/jobs/:id', requireAuth, (req, res) => {
  const { title, primary_keyword, secondary_keywords, additional_instructions } = req.body;
  const job = queueService.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (['generating','posting'].includes(job.status)) {
    return res.status(400).json({ error: 'Cannot edit a running job' });
  }
  const { db } = require('../config/database');
  // Update raw_data with new values
  const raw = JSON.parse(job.raw_data || '{}');
  if (title)              raw.title = title;
  if (primary_keyword)    raw.primary_keyword = primary_keyword;
  if (secondary_keywords !== undefined) raw.secondary_keywords = Array.isArray(secondary_keywords) ? secondary_keywords : secondary_keywords.split(',').map(s => s.trim()).filter(Boolean);

  const jobInstructions = additional_instructions !== undefined ? additional_instructions.trim().substring(0, 2000) : job.additional_instructions || '';
  db.prepare(`UPDATE jobs SET title=?, primary_keyword=?, raw_data=?, additional_instructions=?, updated_at=datetime('now') WHERE id=?`)
    .run(title || job.title, primary_keyword || job.primary_keyword, JSON.stringify(raw), jobInstructions, req.params.id);
  const updated = queueService.getJob(req.params.id);
  queueService.emitEvent('job:updated', updated);
  res.json({ ok: true, job: updated });
});

// Retry post only — keeps generated content, resets WP data
router.post('/api/jobs/:id/retry-post', requireAuth, (req, res) => {
  try {
    const job = queueService.retryPostJob(req.params.id);
    queueService.addLog(req.params.id, 'info', 'Retry post — reusing existing content, re-attempting WordPress posting');
    schedulerService.processJobById(req.params.id).catch(() => {});
    res.json({ ok: true, job });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Regenerate content only — keeps WP post ID, clears content
router.post('/api/jobs/:id/regenerate', requireAuth, (req, res) => {
  try {
    const job = queueService.regenerateContentJob(req.params.id);
    queueService.addLog(req.params.id, 'info', 'Regenerate content — clearing generated content, WP post will be updated on next run');
    res.json({ ok: true, job });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Restart: clear all generated content + logs, reset to pending from scratch
router.post('/api/jobs/:id/restart', requireAuth, (req, res) => {
  try {
    const job = queueService.restartJob(req.params.id);
    queueService.addLog(req.params.id, 'warning', 'Job restarted — all previous content and logs cleared');
    res.json({ ok: true, job });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete: remove job and logs entirely
router.delete('/api/jobs/:id', requireAuth, (req, res) => {
  try {
    queueService.deleteJob(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Bulk retry-post selected jobs (keeps content, retries WP posting)
router.post('/api/jobs/bulk-retry-post', requireAuth, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids required' });
  const results = { retried: 0, skipped: 0 };
  for (const id of ids) {
    try {
      queueService.retryPostJob(id);
      results.retried++;
    } catch { results.skipped++; }
  }
  if (results.retried > 0) schedulerService.processNext().catch(() => {});
  res.json({ ok: true, ...results });
});

// Bulk restart selected jobs (clears everything)
router.post('/api/jobs/bulk-restart', requireAuth, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids required' });
  const results = { restarted: 0, skipped: 0 };
  for (const id of ids) {
    try {
      queueService.restartJob(id);
      results.restarted++;
    } catch { results.skipped++; }
  }
  res.json({ ok: true, ...results });
});

// Bulk delete selected jobs by ID array
router.post('/api/jobs/bulk-delete', requireAuth, (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'ids must be a non-empty array' });
  }
  const results = { deleted: 0, skipped: 0, errors: [] };
  for (const id of ids) {
    try {
      queueService.deleteJob(id);
      results.deleted++;
    } catch (err) {
      results.skipped++;
      results.errors.push({ id, reason: err.message });
    }
  }
  res.json({ ok: true, ...results });
});

// Uploads with their jobs — used by /jobs table view
router.get('/api/uploads/with-jobs', requireAuth, (req, res) => {
  const { db } = require('../config/database');
  const uploads = db.prepare('SELECT * FROM uploads ORDER BY uploaded_at DESC').all();
  const result = uploads.map(u => {
    const blog = db.prepare('SELECT name, wp_url, domain FROM blog_configs WHERE id = ?').get(u.blog_id);
    const siteUrl = blog?.wp_url || (blog?.domain ? `https://${blog.domain}` : '');
    const rows = db.prepare(`
      SELECT id, row_number, title, primary_keyword, scheduled_at, status,
             wp_post_id, wp_post_url, error_message, retry_count, updated_at,
             generated_title, generated_seo_title, generated_content, generated_meta, cost_usd, additional_instructions
      FROM jobs WHERE upload_id = ? ORDER BY row_number ASC
    `).all(u.id);
    const stats = {};
    let totalCost = 0;
    const jobs = rows.map(j => {
      stats[j.status] = (stats[j.status] || 0) + 1;
      totalCost += j.cost_usd || 0;
      const hasContent = !!(j.generated_content && j.generated_content.trim());
      let seo = null;
      if (hasContent) {
        const s = seoScoreService.scoreContent({
          title: j.generated_title || j.title,
          seoTitle: j.generated_seo_title || claudeService.normalizeSeoTitle(j.generated_title || j.title, j.primary_keyword),
          content: j.generated_content,
          meta: j.generated_meta,
          primaryKeyword: j.primary_keyword,
          siteUrl,
        });
        seo = { score: s.score, grade: s.grade, color: s.color };
      }
      // Strip heavy content fields from the list payload — keep only the score
      const { generated_content, generated_meta, ...rest } = j;
      return { ...rest, has_content: hasContent ? 1 : 0, seo };
    });
    return { ...u, blog_name: blog?.name || 'Unknown', jobs, stats, total_cost: totalCost };
  });
  res.json({ uploads: result });
});

// Activity logs
router.get('/api/logs', requireAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 100, 500);
  const logs = queueService.getRecentLogs(limit);
  res.json({ logs });
});

module.exports = router;
