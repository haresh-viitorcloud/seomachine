/**
 * Job queue service — manages in-progress content generation and WP posting.
 * Backed by SQLite for persistence across restarts.
 * Emits Socket.io events for real-time dashboard updates.
 */

const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

let _io = null; // Socket.io instance, set via init()

function init(io) {
  _io = io;
}

function emit(event, data) {
  if (_io) _io.emit(event, data);
}

// ─────────────────────────────────────────────────────────────
// Job CRUD
// ─────────────────────────────────────────────────────────────

function createJob(uploadId, blogId, row, status = 'pending') {
  const id = uuidv4();
  const safeStatus = ['pending', 'paused'].includes(status) ? status : 'pending';
  const stmt = db.prepare(`
    INSERT INTO jobs (id, upload_id, blog_id, row_number, title, primary_keyword,
      scheduled_at, status, raw_data, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `);
  stmt.run(
    id, uploadId, blogId,
    row.row_number || row._original_row || 0,
    row.title, row.primary_keyword || '',
    row.scheduled_at || dayjs().format('YYYY-MM-DD HH:mm:ss'),
    safeStatus,
    JSON.stringify(row)
  );
  const job = getJob(id);
  emit('job:created', job);
  return job;
}

function getJob(id) {
  return db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
}

function updateJobStatus(id, status, extra = {}) {
  const fields = ['status = ?', "updated_at = datetime('now')"];
  const values = [status];

  if (extra.generated_title !== undefined) { fields.push('generated_title = ?'); values.push(extra.generated_title); }
  if (extra.generated_content !== undefined) { fields.push('generated_content = ?'); values.push(extra.generated_content); }
  if (extra.generated_meta !== undefined) { fields.push('generated_meta = ?'); values.push(extra.generated_meta); }
  if (extra.generated_image_prompt !== undefined) { fields.push('generated_image_prompt = ?'); values.push(extra.generated_image_prompt); }
  if (extra.generated_tags !== undefined) { fields.push('generated_tags = ?'); values.push(JSON.stringify(extra.generated_tags)); }
  if (extra.generated_faq !== undefined) { fields.push('generated_faq = ?'); values.push(JSON.stringify(extra.generated_faq)); }
  if (extra.generated_seo_title !== undefined) { fields.push('generated_seo_title = ?'); values.push(extra.generated_seo_title); }
  if (extra.generated_slug !== undefined) { fields.push('generated_slug = ?'); values.push(extra.generated_slug); }
  if (extra.generated_image_alt !== undefined) { fields.push('generated_image_alt = ?'); values.push(extra.generated_image_alt); }
  if (extra.generated_category !== undefined) { fields.push('generated_category = ?'); values.push(extra.generated_category); }
  if (extra.generated_ctas !== undefined) { fields.push('generated_ctas = ?'); values.push(JSON.stringify(extra.generated_ctas)); }
  if (extra.wp_post_id !== undefined) { fields.push('wp_post_id = ?'); values.push(extra.wp_post_id); }
  if (extra.wp_post_url !== undefined) { fields.push('wp_post_url = ?'); values.push(extra.wp_post_url); }
  if (extra.image_source !== undefined) { fields.push('image_source = ?'); values.push(extra.image_source); }
  if (extra.error_message !== undefined) { fields.push('error_message = ?'); values.push(extra.error_message); }
  if (extra.retry_count !== undefined) { fields.push('retry_count = ?'); values.push(extra.retry_count); }
  if (extra.limit_resume_count !== undefined) { fields.push('limit_resume_count = ?'); values.push(extra.limit_resume_count); }
  if (extra.scheduled_at !== undefined) { fields.push('scheduled_at = ?'); values.push(extra.scheduled_at); }
  if (extra.cost_usd !== undefined) { fields.push('cost_usd = ?'); values.push(extra.cost_usd); }
  if (extra.seomachine_score !== undefined) { fields.push('seomachine_score = ?'); values.push(extra.seomachine_score); }
  if (extra.tokens_in !== undefined) { fields.push('tokens_in = ?'); values.push(extra.tokens_in); }
  if (extra.tokens_out !== undefined) { fields.push('tokens_out = ?'); values.push(extra.tokens_out); }
  if (extra.generated_at) { fields.push("generated_at = datetime('now')"); }

  values.push(id);
  db.prepare(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  const job = getJob(id);
  emit('job:updated', job);
  return job;
}

function getJobsByStatus(...statuses) {
  const placeholders = statuses.map(() => '?').join(', ');
  return db.prepare(`SELECT * FROM jobs WHERE status IN (${placeholders}) ORDER BY scheduled_at ASC`)
    .all(...statuses);
}

function getAllJobs(limit = 200, offset = 0, days = 0, blogId = null) {
  const where = [];
  const params = [];
  if (days > 0) { where.push("updated_at >= datetime('now', ?)"); params.push(`-${days} days`); }
  if (blogId) { where.push('blog_id = ?'); params.push(blogId); }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const orderBy = days > 0 ? 'updated_at DESC' : 'scheduled_at ASC';
  // Exclude heavy content fields — use /api/jobs/:id/preview to fetch full content
  return db.prepare(`
    SELECT id, upload_id, blog_id, row_number, title, primary_keyword, status,
           wp_post_id, wp_post_url, error_message, retry_count, scheduled_at,
           generated_title, generated_seo_title, generated_slug,
           generated_image_prompt, generated_tags, generated_faq,
           cost_usd, tokens_in, tokens_out, additional_instructions,
           image_source, seomachine_score, generated_at, updated_at,
           (generated_content IS NOT NULL AND generated_content != '') AS has_content
    FROM jobs ${whereClause} ORDER BY ${orderBy} LIMIT ? OFFSET ?
  `).all(...params, limit, offset);
}

function getJobStats(blogId = null) {
  const rows = blogId
    ? db.prepare('SELECT status, COUNT(*) as count FROM jobs WHERE blog_id = ? GROUP BY status').all(blogId)
    : db.prepare('SELECT status, COUNT(*) as count FROM jobs GROUP BY status').all();
  const stats = { pending: 0, generating: 0, posting: 0, drafted: 0, error: 0, skipped: 0, paused: 0, total: 0 };
  for (const row of rows) {
    stats[row.status] = row.count;
    stats.total += row.count;
  }
  return stats;
}

// ─────────────────────────────────────────────────────────────
// Analytics — generation counts, token usage & cost over time
// ─────────────────────────────────────────────────────────────

// A job counts as "generated" once it has token usage, cost, or stored content.
const GENERATED_COND =
  "(tokens_in > 0 OR tokens_out > 0 OR cost_usd > 0 OR (generated_content IS NOT NULL AND generated_content != ''))";

// IST (UTC+5:30) calendar helpers so buckets align with the user's day
function _istDateKey(offsetDays = 0) {
  const d = new Date(Date.now() + 330 * 60000);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}
function _istMonthKey(offsetMonths = 0) {
  const d = new Date(Date.now() + 330 * 60000);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + offsetMonths);
  return d.toISOString().slice(0, 7); // YYYY-MM
}

function _sumRow(whereClause = '', params = []) {
  const r = db.prepare(`
    SELECT
      SUM(CASE WHEN ${GENERATED_COND} THEN 1 ELSE 0 END) AS generated,
      SUM(CASE WHEN status = 'drafted' THEN 1 ELSE 0 END) AS drafted,
      SUM(CASE WHEN status = 'error'   THEN 1 ELSE 0 END) AS error,
      COALESCE(SUM(tokens_in), 0)  AS tokens_in,
      COALESCE(SUM(tokens_out), 0) AS tokens_out,
      COALESCE(SUM(cost_usd), 0)   AS cost
    FROM jobs ${whereClause}
  `).get(...params);
  r.generated = r.generated || 0;
  r.drafted = r.drafted || 0;
  r.error = r.error || 0;
  r.tokens = (r.tokens_in || 0) + (r.tokens_out || 0);
  return r;
}

function _buildSeries(period, byDay) {
  const out = [];
  if (period === 'monthly') {
    const byMonth = {};
    for (const key in byDay) {
      const m = key.slice(0, 7);
      const b = byMonth[m] || (byMonth[m] = { generated: 0, drafted: 0, error: 0, tokens: 0, cost: 0 });
      const r = byDay[key];
      b.generated += r.generated; b.drafted += r.drafted; b.error += r.error;
      b.tokens += r.tokens; b.cost += r.cost;
    }
    for (let i = 5; i >= 0; i--) {
      const key = _istMonthKey(-i);
      const r = byMonth[key] || { generated: 0, drafted: 0, error: 0, tokens: 0, cost: 0 };
      out.push({ key, label: key, ...r });
    }
  } else if (period === 'weekly') {
    for (let w = 7; w >= 0; w--) {
      const agg = { generated: 0, drafted: 0, error: 0, tokens: 0, cost: 0 };
      let startKey = null;
      for (let d = 0; d < 7; d++) {
        const key = _istDateKey(-(w * 7 + d));
        if (d === 6) startKey = key;
        const r = byDay[key];
        if (r) {
          agg.generated += r.generated; agg.drafted += r.drafted; agg.error += r.error;
          agg.tokens += r.tokens; agg.cost += r.cost;
        }
      }
      out.push({ key: startKey, label: startKey.slice(5), ...agg });
    }
  } else {
    // daily — last 14 days
    for (let i = 13; i >= 0; i--) {
      const key = _istDateKey(-i);
      const r = byDay[key] || { generated: 0, drafted: 0, error: 0, tokens: 0, cost: 0 };
      out.push({ key, label: key.slice(5), generated: r.generated, drafted: r.drafted, error: r.error, tokens: r.tokens, cost: r.cost });
    }
  }
  return out;
}

function getAnalytics(period = 'daily', blogId = null) {
  // Optional per-blog scoping appended to each query's WHERE clause
  const blogAnd = blogId ? ' AND blog_id = ?' : '';
  const blogP = blogId ? [blogId] : [];

  const totals = _sumRow(blogId ? 'WHERE blog_id = ?' : '', blogP);

  const windows = {
    day:   _sumRow(`WHERE COALESCE(generated_at, updated_at) >= datetime('now', ?)${blogAnd}`, ['-1 day',  ...blogP]),
    week:  _sumRow(`WHERE COALESCE(generated_at, updated_at) >= datetime('now', ?)${blogAnd}`, ['-7 days', ...blogP]),
    month: _sumRow(`WHERE COALESCE(generated_at, updated_at) >= datetime('now', ?)${blogAnd}`, ['-30 days', ...blogP]),
  };

  // Per-day breakdown for the last 180 days (IST-aligned), reshaped client-side
  const dailyRows = db.prepare(`
    SELECT date(COALESCE(generated_at, updated_at), '+330 minutes') AS d,
      SUM(CASE WHEN ${GENERATED_COND} THEN 1 ELSE 0 END) AS generated,
      SUM(CASE WHEN status = 'drafted' THEN 1 ELSE 0 END) AS drafted,
      SUM(CASE WHEN status = 'error'   THEN 1 ELSE 0 END) AS error,
      COALESCE(SUM(tokens_in + tokens_out), 0) AS tokens,
      COALESCE(SUM(cost_usd), 0) AS cost
    FROM jobs
    WHERE COALESCE(generated_at, updated_at) >= datetime('now', '-180 days')${blogAnd}
    GROUP BY d
  `).all(...blogP);
  const byDay = {};
  for (const r of dailyRows) byDay[r.d] = r;

  const series = _buildSeries(period, byDay);

  const topPosts = db.prepare(`
    SELECT id,
      COALESCE(generated_title, title) AS title,
      tokens_in, tokens_out, (tokens_in + tokens_out) AS tokens,
      cost_usd AS cost, status,
      COALESCE(generated_at, updated_at) AS when_ts
    FROM jobs
    WHERE ${GENERATED_COND}${blogAnd}
    ORDER BY COALESCE(generated_at, updated_at) DESC
    LIMIT 12
  `).all(...blogP);

  return { totals, windows, series, period, topPosts };
}

// ─────────────────────────────────────────────────────────────
// Activity Logs
// ─────────────────────────────────────────────────────────────

function addLog(jobId, level, message, metadata = null) {
  const stmt = db.prepare(`
    INSERT INTO activity_logs (job_id, level, message, metadata, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `);
  const result = stmt.run(jobId || null, level, message, metadata ? JSON.stringify(metadata) : null);
  const log = db.prepare('SELECT * FROM activity_logs WHERE id = ?').get(result.lastInsertRowid);
  emit('log:new', log);
  return log;
}

function getRecentLogs(limit = 100) {
  return db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT ?').all(limit);
}

function getJobLogs(jobId) {
  return db.prepare('SELECT * FROM activity_logs WHERE job_id = ? ORDER BY created_at ASC').all(jobId);
}

// ─────────────────────────────────────────────────────────────
// Queue control
// ─────────────────────────────────────────────────────────────

function isQueuePaused() {
  const row = db.prepare('SELECT is_paused FROM queue_state WHERE id = 1').get();
  return row ? row.is_paused === 1 : false;
}

function setQueuePaused(paused) {
  db.prepare("UPDATE queue_state SET is_paused = ?, updated_at = datetime('now') WHERE id = 1").run(paused ? 1 : 0);
  emit('queue:state', { paused, testMode: isTestMode() });
}

function isTestMode() {
  const row = db.prepare('SELECT test_mode FROM queue_state WHERE id = 1').get();
  return row ? row.test_mode === 1 : false;
}

function setTestMode(enabled) {
  db.prepare("UPDATE queue_state SET test_mode = ?, updated_at = datetime('now') WHERE id = 1").run(enabled ? 1 : 0);
  emit('queue:state', { paused: isQueuePaused(), testMode: enabled });
}

// Returns the active Claude model: DB override → .env → hardcoded default
function getClaudeModel() {
  const row = db.prepare('SELECT claude_model FROM queue_state WHERE id = 1').get();
  const dbModel = row?.claude_model?.trim();
  return dbModel || process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';
}

function setClaudeModel(model) {
  db.prepare("UPDATE queue_state SET claude_model = ?, updated_at = datetime('now') WHERE id = 1").run(model || '');
  emit('queue:state', { paused: isQueuePaused(), testMode: isTestMode(), claudeModel: getClaudeModel() });
}

// Returns the active effort level: DB → hardcoded default 'high'
function getClaudeEffort() {
  const row = db.prepare('SELECT claude_effort FROM queue_state WHERE id = 1').get();
  return row?.claude_effort?.trim() || 'high';
}

function emitEvent(event, data) {
  emit(event, data);
}

function setClaudeEffort(effort) {
  const valid = ['low', 'medium', 'high', 'xhigh', 'max'];
  if (!valid.includes(effort)) throw new Error(`Invalid effort: ${effort}. Must be one of: ${valid.join(', ')}`);
  db.prepare("UPDATE queue_state SET claude_effort = ?, updated_at = datetime('now') WHERE id = 1").run(effort);
  emit('queue:state', { paused: isQueuePaused(), testMode: isTestMode(), claudeEffort: effort });
}

// Active generation engine: DB override → .env → 'native'.
// 'native' = built-in 2-call pipeline; 'seomachine' = seomachine methodology + Python quality gate.
const VALID_ENGINES = ['native', 'seomachine'];
function getGenerationEngine() {
  try {
    const row = db.prepare('SELECT generation_engine FROM queue_state WHERE id = 1').get();
    const dbEngine = row?.generation_engine?.trim();
    if (dbEngine) return dbEngine;
  } catch { /* column may not exist on very old DBs — fall through */ }
  return (process.env.GENERATION_ENGINE || 'native').toLowerCase();
}

function setGenerationEngine(engine) {
  const e = String(engine || '').trim().toLowerCase();
  if (!VALID_ENGINES.includes(e)) throw new Error(`Invalid engine: ${engine}. Must be one of: ${VALID_ENGINES.join(', ')}`);
  db.prepare("UPDATE queue_state SET generation_engine = ?, updated_at = datetime('now') WHERE id = 1").run(e);
  emit('queue:state', { paused: isQueuePaused(), testMode: isTestMode(), generationEngine: e });
}

// Reset any jobs stuck mid-run (generating/posting) to error on server startup.
// Marks as error (not pending) so orphaned CLI processes don't get re-spawned automatically —
// the user must explicitly retry via the UI.
function resetStaleJobs() {
  const result = db.prepare(`
    UPDATE jobs SET status = 'error', error_message = 'Interrupted: server restarted while job was active. Click Restart to rerun.', updated_at = datetime('now')
    WHERE status IN ('generating', 'posting')
  `).run();
  if (result.changes > 0) {
    console.log(`[Queue] Marked ${result.changes} interrupted job(s) as error — restart them manually`);
  }
}

function retryJob(id) {
  const job = getJob(id);
  if (!job) throw new Error('Job not found');
  const retryCount = (job.retry_count || 0) + 1;
  return updateJobStatus(id, 'pending', { error_message: null, retry_count: retryCount });
}

function skipJob(id) {
  return updateJobStatus(id, 'skipped');
}

// Retry posting only — keeps generated content, clears WP data + error, resets to pending
// Used when posting failed but content was already generated successfully
function retryPostJob(id) {
  const job = getJob(id);
  if (!job) throw new Error('Job not found');
  if (['generating', 'posting'].includes(job.status)) {
    throw new Error('Cannot retry a job that is currently running.');
  }
  if (!job.generated_content) {
    throw new Error('No generated content found. Use Restart to regenerate from scratch.');
  }
  db.prepare(`
    UPDATE jobs SET
      status = 'pending',
      wp_post_id = NULL,
      wp_post_url = NULL,
      error_message = NULL,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(id);
  const updated = getJob(id);
  emit('job:updated', updated);
  return updated;
}

// Regenerate content only — clears generated content but keeps WP post ID
// On next run will regenerate and update the existing WP draft instead of creating new
function regenerateContentJob(id) {
  const job = getJob(id);
  if (!job) throw new Error('Job not found');
  if (['generating', 'posting'].includes(job.status)) {
    throw new Error('Cannot regenerate a job that is currently running.');
  }
  db.prepare(`
    UPDATE jobs SET
      status = 'pending',
      generated_title = NULL,
      generated_content = NULL,
      generated_meta = NULL,
      generated_image_prompt = NULL,
      generated_tags = NULL,
      generated_faq = NULL,
      generated_seo_title = NULL,
      generated_slug = NULL,
      generated_image_alt = NULL,
      generated_ctas = NULL,
      error_message = NULL,
      retry_count = 0,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(id);
  const updated = getJob(id);
  emit('job:updated', updated);
  return updated;
}

// Restart: wipe all generated content + WP data + logs, reset to pending from scratch
function restartJob(id) {
  const job = getJob(id);
  if (!job) throw new Error('Job not found');
  if (['generating', 'posting'].includes(job.status)) {
    throw new Error('Cannot restart a job that is currently running. Wait for it to finish or restart the server.');
  }
  db.prepare('DELETE FROM activity_logs WHERE job_id = ?').run(id);
  db.prepare(`
    UPDATE jobs SET
      status = 'pending',
      generated_title = NULL,
      generated_content = NULL,
      generated_meta = NULL,
      generated_image_prompt = NULL,
      generated_tags = NULL,
      generated_faq = NULL,
      generated_seo_title = NULL,
      generated_slug = NULL,
      generated_image_alt = NULL,
      generated_ctas = NULL,
      wp_post_id = NULL,
      wp_post_url = NULL,
      error_message = NULL,
      retry_count = 0,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(id);
  const updated = getJob(id);
  emit('job:updated', updated);
  return updated;
}

// Delete: remove job and all its logs from the DB entirely
function deleteJob(id) {
  const job = getJob(id);
  if (!job) throw new Error('Job not found');
  if (['generating', 'posting'].includes(job.status)) {
    throw new Error('Cannot delete a job that is currently running. Wait for it to finish or restart the server.');
  }
  db.prepare('DELETE FROM activity_logs WHERE job_id = ?').run(id);
  // Drop feedback tied to this job so its notes are not injected into future prompts
  db.prepare('DELETE FROM generation_feedback WHERE job_id = ?').run(id);
  db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
  emit('job:deleted', { id });
}

function pauseJob(id) {
  const job = getJob(id);
  if (!job) throw new Error('Job not found');
  if (!['pending', 'error'].includes(job.status)) throw new Error('Only pending or error jobs can be paused');
  return updateJobStatus(id, 'paused');
}

function resumeJob(id) {
  const job = getJob(id);
  if (!job) throw new Error('Job not found');
  if (job.status !== 'paused') throw new Error('Job is not paused');
  return updateJobStatus(id, 'pending');
}

// ─────────────────────────────────────────────────────────────
// Uploads
// ─────────────────────────────────────────────────────────────

function createUpload(blogId, filename, originalName, rowCount, additionalInstructions = '') {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO uploads (id, blog_id, filename, original_name, row_count, status, additional_instructions, uploaded_at)
    VALUES (?, ?, ?, ?, ?, 'pending', ?, datetime('now'))
  `).run(id, blogId, filename, originalName, rowCount, additionalInstructions || '');
  return db.prepare('SELECT * FROM uploads WHERE id = ?').get(id);
}

function getUpload(id) {
  return db.prepare('SELECT * FROM uploads WHERE id = ?').get(id);
}

function getUploads() {
  return db.prepare('SELECT * FROM uploads ORDER BY uploaded_at DESC').all();
}

// ─────────────────────────────────────────────────────────────
// Scheduled jobs query (due for processing)
// ─────────────────────────────────────────────────────────────

function getDueJobs() {
  return db.prepare(`
    SELECT * FROM jobs
    WHERE status = 'pending'
      AND scheduled_at <= datetime('now')
    ORDER BY scheduled_at ASC
    LIMIT 1
  `).all();
}

function getNextPendingJob() {
  return db.prepare(`
    SELECT * FROM jobs
    WHERE status = 'pending'
    ORDER BY scheduled_at ASC
    LIMIT 1
  `).get();
}

// ─────────────────────────────────────────────────────────────
// Generation feedback — editor notes applied to future generations
// ─────────────────────────────────────────────────────────────

function addFeedback(jobId, { rating = null, feedback }) {
  const text = (feedback || '').trim();
  if (!text) throw new Error('Feedback text is required');
  const job = getJob(jobId);
  if (!job) throw new Error('Job not found');
  const safeRating = ['up', 'down'].includes(rating) ? rating : null;

  const info = db.prepare(`
    INSERT INTO generation_feedback (blog_id, job_id, rating, feedback)
    VALUES (?, ?, ?, ?)
  `).run(job.blog_id, jobId, safeRating, text);

  addLog(jobId, 'info', `Feedback saved — will be applied to future generations for this blog${safeRating ? ` (${safeRating})` : ''}`);
  const entry = db.prepare('SELECT * FROM generation_feedback WHERE id = ?').get(info.lastInsertRowid);
  emit('job:updated', getJob(jobId));
  return entry;
}

function getFeedbackForJob(jobId) {
  return db.prepare('SELECT * FROM generation_feedback WHERE job_id = ? ORDER BY created_at DESC').all(jobId);
}

// Recent active feedback notes for a blog — injected into the generation prompt
function getActiveFeedback(blogId, limit = 20) {
  return db.prepare(`
    SELECT id, rating, feedback, created_at
    FROM generation_feedback
    WHERE blog_id = ? AND active = 1
    ORDER BY created_at DESC
    LIMIT ?
  `).all(blogId, limit);
}

function deleteFeedback(id) {
  db.prepare('DELETE FROM generation_feedback WHERE id = ?').run(id);
}

module.exports = {
  init,
  createJob,
  getJob,
  updateJobStatus,
  getJobsByStatus,
  getAllJobs,
  getJobStats,
  getAnalytics,
  addLog,
  getRecentLogs,
  getJobLogs,
  isQueuePaused,
  setQueuePaused,
  isTestMode,
  setTestMode,
  getClaudeModel,
  setClaudeModel,
  emitEvent,
  getClaudeEffort,
  setClaudeEffort,
  getGenerationEngine,
  setGenerationEngine,
  resetStaleJobs,
  retryJob,
  skipJob,
  pauseJob,
  resumeJob,
  retryPostJob,
  regenerateContentJob,
  restartJob,
  deleteJob,
  createUpload,
  getUpload,
  getUploads,
  getDueJobs,
  getNextPendingJob,
  addFeedback,
  getFeedbackForJob,
  getActiveFeedback,
  deleteFeedback,
};
