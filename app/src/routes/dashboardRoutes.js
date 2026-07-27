const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const queueService = require('../services/queueService');
const schedulerService = require('../services/schedulerService');
const seoScoreService = require('../services/seoScoreService');
const claudeService = require('../services/claudeService');
const astroGitService = require('../services/astroGitService');
const repurposeService = require('../services/repurposeService');
const { marked } = require('marked');

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

  const { db } = require('../config/database');
  const blog = db.prepare('SELECT * FROM blog_configs WHERE id = ?').get(job.blog_id);

  // Predicted Rank Math-style SEO score (only when content exists)
  let seo = null;
  if (job.generated_content) {
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

  // Astro/git review gate: if this job has a staged (not-yet-committed) post, surface
  // its cover image + a flag telling the UI to render the Commit/edit controls.
  const staging = astroGitService.getStagingInfo(req.params.id);
  // Existing categories for the dropdown — cheap (reads the already-cloned local
  // working copy, no git network call), so safe to compute whenever it might be shown.
  let categoryOptions = [];
  if (blog?.publishing_platform === 'astro-git') {
    try { categoryOptions = astroGitService.listCategories(blog); } catch { /* clone may not exist yet */ }
  }

  res.json({
    title,
    meta_description: job.generated_meta,
    // While staged for review, show the exact Markdown that will actually be committed
    // (not the raw HTML in generated_content) — that's what the edit form displays/saves.
    content: staging.exists && staging.body !== null ? staging.body : job.generated_content,
    image_prompt: job.generated_image_prompt,
    tags,
    wp_post_id: job.wp_post_id,
    wp_post_url: job.wp_post_url,
    image_source: job.image_source || '',
    seo,
    platform: blog?.publishing_platform || 'wordpress',
    // Astro/git-only frontmatter fields, editable while a post is staged for review.
    category: job.generated_category || '',
    category_options: categoryOptions,
    featured: !!job.review_featured,
    author: job.review_author || 'Devlyn',
    noindex: !!job.review_noindex,
    // Staged frontmatter date (YYYY-MM-DD) — live from meta.json, not mirrored to a DB
    // column, since it's only ever relevant while the post is staged for review.
    date: staging.date || '',
    cover_image_url: staging.coverPath ? `/api/jobs/${req.params.id}/preview-image` : null,
    review_ready: staging.exists,
  });
});

// Staged cover image for a review-gate job (astro-git) — authenticated, not served from
// public/, since it's an unpublished draft image that shouldn't be reachable anonymously.
router.get('/api/jobs/:id/preview-image', requireAuth, (req, res) => {
  const staging = astroGitService.getStagingInfo(req.params.id);
  if (!staging.coverPath) return res.status(404).json({ error: 'No staged cover image for this job' });
  res.setHeader('Content-Type', 'image/png');
  res.sendFile(staging.coverPath);
});

// Commit a staged review-gate post (astro-git) — the human-in-the-loop publish step.
router.post('/api/jobs/:id/commit-astro', requireAuth, (req, res) => {
  try {
    const job = schedulerService.commitReviewJob(req.params.id);
    res.json({ ok: true, job });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Edit a staged review-gate post (astro-git) — saves to the DB and re-stages post.md
// with the edits, without pushing anything. Accepts any subset of
// { title, content, cat, excerpt, author, featured, noindex }. `content`, when present,
// is Markdown (what the edit form shows/collects for a staged post — see the /preview
// endpoint above) — it's staged as-is, and separately converted to HTML for
// generated_content so the DB column stays HTML-consistent for every other consumer
// (SEO scorer, the read-only view once committed, WordPress/Statamic jobs, etc).
router.put('/api/jobs/:id/review-content', requireAuth, async (req, res) => {
  try {
    const fields = { ...(req.body || {}) };
    const staging = astroGitService.getStagingInfo(req.params.id);
    if (staging.exists) {
      await astroGitService.updateStagedPost(req.params.id, fields);
      if (fields.content !== undefined) fields.content = marked(fields.content);
    }
    const job = queueService.updateReviewContent(req.params.id, fields);
    const editedFields = Object.keys(req.body || {}).join(', ') || 'none';
    queueService.addLog(req.params.id, 'info', `Reviewed draft edited by admin — fields changed: ${editedFields}.`);
    res.json({ ok: true, job });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
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

// Repurpose targets available for the "site" dropdown — fetched live from the sites
// API (see REPURPOSE_SITES_API_URL), cached briefly by repurposeService. Optional
// ?category=slug narrows each site's accountCount to just that brand's accounts.
router.get('/api/repurpose/platforms', requireAuth, async (req, res) => {
  try {
    const category = String(req.query.category || '').trim() || undefined;
    res.json({ platforms: await repurposeService.listPlatforms(undefined, category) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Brand categories for the Repurpose Category filter (see REPURPOSE_CATEGORIES_API_URL).
router.get('/api/repurpose/categories', requireAuth, async (req, res) => {
  try {
    res.json({ categories: await repurposeService.listCategories() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Batches currently running, keyed by job id — lets a freshly loaded page (Jobs or
// Dashboard, after navigating away and back — a full reload with no socket history)
// reconstruct "is this job mid-repurpose?" instead of only knowing about it if it
// happened to be open receiving 'repurpose:progress' events the whole time.
router.get('/api/repurpose/active', requireAuth, (req, res) => {
  try {
    res.json({ active: repurposeService.getActiveBatches() });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Past repurposed variations for a job — read live from each platform's manifest file
// (no DB — same file-based approach the rest of this feature already uses).
router.get('/api/jobs/:id/repurpose-history', requireAuth, async (req, res) => {
  try {
    res.json({ history: await repurposeService.getHistoryForJob(req.params.id) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Raw content of one previously-generated repurpose file, for the History preview.
// platform/file are validated against this job's own manifest entries inside
// readHistoryFileContent — not treated as trusted filesystem input.
router.get('/api/jobs/:id/repurpose-history/file', requireAuth, async (req, res) => {
  try {
    const { platform, file } = req.query;
    if (!platform || !file) return res.status(400).json({ error: 'platform and file are required' });
    const content = await repurposeService.readHistoryFileContent(req.params.id, String(platform), String(file));
    res.json({ content });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Bulk multi-platform repurposing — spins the job's generated content into N unique
// variations per selected platform, writes them to repurposed/{platform}/, and returns
// immediately (generation is slow — the UI gets progress via 'repurpose:progress' /
// 'repurpose:done' socket events and the inline activity log, same as process-now).
router.post('/api/jobs/:id/repurpose', requireAuth, async (req, res) => {
  try {
    const job = queueService.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    if (job.status !== 'drafted') {
      return res.status(400).json({ error: 'Only fully drafted (published) jobs can be repurposed.' });
    }

    const { platforms, mode, datetime, category } = req.body || {};
    if (!Array.isArray(platforms) || !platforms.length) {
      return res.status(400).json({ error: 'At least one platform + count is required.' });
    }
    if (mode === 'scheduled' && !datetime) {
      return res.status(400).json({ error: 'A scheduled date & time is required when Scheduled is selected.' });
    }

    // Respond immediately — generation for N variations x M platforms is slow.
    res.json({ ok: true, message: 'Repurposing started — watch the activity log for progress.' });

    repurposeService
      .runRepurposeBatch(req.params.id, platforms, { mode, datetime }, category || null)
      .catch((err) => {
        queueService.addLog(req.params.id, 'error', `Repurpose batch failed: ${err.message}`);
        queueService.emitEvent('repurpose:done', { jobId: req.params.id, summary: [], error: err.message });
      });
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
