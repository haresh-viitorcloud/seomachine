/**
 * Scheduler service — picks up due jobs and processes them one at a time.
 * Runs a check every 60 seconds via node-cron.
 * Processing pipeline: pending → generating → posting → drafted | error
 */

const cron = require('node-cron');
const dayjs = require('dayjs');
const queueService = require('./queueService');
const claudeService = require('./claudeService');
const wordpressService = require('./wordpressService');
const { db } = require('../config/database');

let _processing = false;
let _cronTask = null;
let _drainMode = false; // true when explicitly triggered (auto-start / process-next / process-now)

function getBlogConfig(blogId) {
  return db.prepare('SELECT * FROM blog_configs WHERE id = ?').get(blogId);
}

/**
 * Processes a single job: generates content then posts to WordPress.
 */
async function processJob(job) {
  const blogConfig = getBlogConfig(job.blog_id);
  if (!blogConfig) {
    queueService.updateJobStatus(job.id, 'error', { error_message: 'Blog config not found' });
    queueService.addLog(job.id, 'error', `Blog config ID ${job.blog_id} not found`);
    return;
  }

  // ── Step 1: Generate content with Claude (skip if already generated) ──
  let generatedContent;

  if (job.generated_content) {
    // Content was already generated (e.g. previous posting failure — reuse it)
    generatedContent = {
      title: job.generated_title || job.title,
      content: job.generated_content,
      meta_description: job.generated_meta || '',
      image_prompt: job.generated_image_prompt || '',
      tags: (() => { try { return JSON.parse(job.generated_tags || '[]'); } catch { return []; } })(),
      faq: (() => { try { return JSON.parse(job.generated_faq || '[]'); } catch { return []; } })(),
      seo_title: job.generated_seo_title || job.generated_title || job.title,
      slug: job.generated_slug || '',
      image_alt: job.generated_image_alt || '',
      ...(() => {
        try { const c = JSON.parse(job.generated_ctas || '{}'); return { cta_category: c.category || 'default', ctas: c.items || [] }; }
        catch { return { cta_category: 'default', ctas: [] }; }
      })(),
    };
    queueService.addLog(job.id, 'info', `Using cached content for: ${job.title} (${generatedContent.content.length} chars)`);
  } else {
    const testMode = queueService.isTestMode();
    queueService.updateJobStatus(job.id, 'generating');
    queueService.addLog(job.id, 'info', `Starting content generation for: ${job.title}${testMode ? ' [TEST MODE]' : ''}`);

    try {
      const rawData = JSON.parse(job.raw_data || '{}');
      const feedbackList = queueService.getActiveFeedback ? queueService.getActiveFeedback(job.blog_id) : [];

      // Merge instructions: per-job takes priority, falls back to upload-level batch instructions
      const upload = job.upload_id ? queueService.getUpload(job.upload_id) : null;
      const batchInstructions = upload?.additional_instructions?.trim() || '';
      const jobInstructions   = job.additional_instructions?.trim() || '';
      // Combine both: job-specific first (higher priority), then batch-level
      const parts = [jobInstructions, batchInstructions].filter(Boolean);
      const additionalInstructions = parts.join('\n\n').trim();
      if (additionalInstructions) {
        const preview = additionalInstructions.substring(0, 80);
        queueService.addLog(job.id, 'info', `Additional instructions active: "${preview}${additionalInstructions.length > 80 ? '…' : ''}"`);
      }

      generatedContent = await claudeService.generateBlogContent(
        rawData,
        blogConfig.context_path,
        blogConfig.rules_path,
        (msg) => { queueService.addLog(job.id, 'info', msg); },
        testMode,
        feedbackList,
        additionalInstructions,
        blogConfig
      );

      const costUsd = generatedContent._costUsd || 0;
      const tokensIn = generatedContent._tokensIn || 0;
      const tokensOut = generatedContent._tokensOut || 0;
      queueService.updateJobStatus(job.id, 'generating', {
        generated_title: generatedContent.title,
        generated_content: generatedContent.content,
        generated_meta: generatedContent.meta_description,
        generated_image_prompt: generatedContent.image_prompt,
        generated_tags: generatedContent.tags,
        generated_faq: generatedContent.faq || [],
        generated_seo_title: generatedContent.seo_title || '',
        generated_slug: generatedContent.slug || '',
        generated_image_alt: generatedContent.image_alt || '',
        generated_ctas: { category: generatedContent.cta_category || 'default', items: generatedContent.ctas || [] },
        cost_usd: costUsd,
        tokens_in: tokensIn,
        tokens_out: tokensOut,
        // seomachine engine attaches a content-quality score (0-100); native engine leaves it undefined
        ...(typeof generatedContent._seoMachineScore === 'number' ? { seomachine_score: generatedContent._seoMachineScore } : {}),
        generated_at: true,
      });

      const costNote = costUsd > 0 ? ` · cost: $${costUsd.toFixed(4)}` : '';
      const tokNote = (tokensIn + tokensOut) > 0 ? ` · tokens: ${(tokensIn + tokensOut).toLocaleString()}` : '';
      queueService.addLog(job.id, 'success', `Content generated: "${generatedContent.title}" (${generatedContent.content?.length || 0} chars${costNote}${tokNote})`);
    } catch (err) {
      // ── Claude usage/limit hit: pause and auto-resume when it renews ──
      // A limit is not a job failure — don't burn a retry. Reschedule the job to the
      // reset time as 'pending'; the cron worker picks it up automatically once due.
      const limit = await claudeService.detectUsageLimit(err);
      if (limit.limited) {
        const fallbackMin = parseInt(process.env.LIMIT_RESUME_FALLBACK_MIN) || 30;
        const resumeMs = limit.resetAt || (Date.now() + fallbackMin * 60000);
        const whenSql = dayjs(resumeMs).format('YYYY-MM-DD HH:mm:ss');
        queueService.updateJobStatus(job.id, 'pending', {
          scheduled_at: whenSql,
          error_message: `Claude usage limit reached — auto-resuming at ${whenSql}`,
        });
        queueService.addLog(job.id, 'warning',
          `Claude usage limit reached. Job paused; it will auto-resume at ${whenSql} when the limit renews.`);
        return;
      }

      const retryMax = parseInt(process.env.QUEUE_RETRY_ATTEMPTS) || 3;
      const retryCount = (job.retry_count || 0) + 1;

      if (retryCount <= retryMax) {
        queueService.updateJobStatus(job.id, 'pending', {
          error_message: `Generation failed (attempt ${retryCount}): ${err.message}`,
          retry_count: retryCount,
        });
        queueService.addLog(job.id, 'warning', `Content generation failed (attempt ${retryCount}/${retryMax}): ${err.message}`);
      } else {
        queueService.updateJobStatus(job.id, 'error', {
          error_message: `Generation failed after ${retryMax} attempts: ${err.message}`,
        });
        queueService.addLog(job.id, 'error', `Content generation permanently failed: ${err.message}`);
      }
      return;
    }
  }

  // ── Step 2: Post to WordPress ──
  queueService.updateJobStatus(job.id, 'posting');
  queueService.addLog(job.id, 'info', `Posting draft to WordPress: ${blogConfig.name}`);

  try {
    const rawData = JSON.parse(job.raw_data || '{}');

    // Normalize SEO fields right before posting so even cached/older content gets a
    // keyword-rich rank_math_title (<=60 chars) and a <=160-char meta — idempotent for
    // freshly generated content (already normalized).
    const focusKw = rawData.primary_keyword || job.primary_keyword || '';
    generatedContent.seo_title = claudeService.normalizeSeoTitle(generatedContent.seo_title || generatedContent.title, focusKw);
    generatedContent.meta_description = claudeService.normalizeMeta(generatedContent.meta_description);

    const result = await wordpressService.postDraft(
      blogConfig,
      generatedContent,
      rawData,
      (msg) => queueService.addLog(job.id, 'info', msg)
    );

    queueService.updateJobStatus(job.id, 'drafted', {
      wp_post_id: result.post_id,
      wp_post_url: result.edit_url || result.post_url,
      image_source: result.image_source || '',
    });

    queueService.addLog(job.id, 'success', `Draft saved successfully! Post ID: ${result.post_id}`);
  } catch (err) {
    queueService.updateJobStatus(job.id, 'error', {
      error_message: `WordPress posting failed: ${err.message}`,
    });
    queueService.addLog(job.id, 'error', `WordPress posting failed: ${err.message}`);
  }

  // Check if the entire upload batch is now complete (no pending/generating/posting left)
  if (job.upload_id) {
    const { db } = require('../config/database');
    const remaining = db.prepare(`
      SELECT COUNT(*) as n FROM jobs
      WHERE upload_id = ? AND status IN ('pending','generating','posting')
    `).get(job.upload_id);

    if (remaining.n === 0) {
      const batchStats = db.prepare(`
        SELECT status, COUNT(*) as n FROM jobs WHERE upload_id = ? GROUP BY status
      `).all(job.upload_id);
      const upload = db.prepare('SELECT original_name FROM uploads WHERE id = ?').get(job.upload_id);
      const drafted = batchStats.find(r => r.status === 'drafted')?.n || 0;
      const errors  = batchStats.find(r => r.status === 'error')?.n || 0;
      const batch = {
        upload_id: job.upload_id,
        upload_name: upload?.original_name || 'Batch',
        drafted,
        errors,
        total: batchStats.reduce((s, r) => s + r.n, 0),
      };
      queueService.emitEvent('batch:complete', batch);
      notifyBatchWebhook(batch);
    }
  }
}

// Optional outbound notification when a batch finishes — works even when no browser
// tab is open. Set BATCH_WEBHOOK_URL in .env (Slack/Discord/Teams incoming webhook or
// any endpoint). Slack/Discord-compatible: sends { text, content, ...batch }.
function notifyBatchWebhook(batch) {
  const url = (process.env.BATCH_WEBHOOK_URL || '').trim();
  if (!url) return;
  const text = `✅ Batch complete: "${batch.upload_name}" — ${batch.drafted}/${batch.total} drafted` +
    (batch.errors ? `, ${batch.errors} error${batch.errors !== 1 ? 's' : ''}` : '');
  const axios = require('axios');
  axios.post(url, { text, content: text, ...batch }, { timeout: 10000 })
    .then(() => console.log('[Webhook] Batch notification sent'))
    .catch(err => console.error('[Webhook] Batch notification failed:', err.message));
}

/**
 * Main worker loop — checks for due jobs and processes one at a time.
 */
async function runWorker() {
  if (_processing) return;
  if (queueService.isQueuePaused()) return;

  // Cron-triggered runs only pick up jobs whose scheduled_at has passed.
  // This respects Manual mode — pending jobs with future dates sit in queue
  // until the user explicitly clicks Start or uses Auto-start on upload.
  const dueJobs = queueService.getDueJobs();
  const job = dueJobs[0];
  if (!job) return;

  _processing = true;

  try {
    await processJob(job);
  } catch (err) {
    console.error('[Scheduler] Unhandled error processing job', job.id, err);
    queueService.updateJobStatus(job.id, 'error', { error_message: err.message });
    queueService.addLog(job.id, 'error', `Unexpected error: ${err.message}`);
  } finally {
    _processing = false;
    // Only drain the next job if this run was explicitly triggered (auto-start /
    // process-next / process-now). Cron-triggered runs stop after each job so that
    // Manual-mode jobs are never auto-started by the scheduler.
    if (_drainMode) {
      const next = queueService.getNextPendingJob();
      if (next) setImmediate(runWorker);
      else _drainMode = false; // queue drained — reset flag
    }
  }
}

/**
 * Starts the scheduler cron job (runs every minute).
 */
function start() {
  if (_cronTask) return;
  _cronTask = cron.schedule('* * * * *', () => {
    runWorker().catch(err => console.error('[Scheduler] Cron error:', err));
  });
  console.log('[Scheduler] Started — checking for due jobs every minute');
}

function stop() {
  if (_cronTask) {
    _cronTask.stop();
    _cronTask = null;
  }
}

/**
 * Manually trigger processing of the next pending job (regardless of schedule).
 * Used by the "Process Now" button in the dashboard.
 */
async function processNext() {
  if (_processing) {
    throw new Error('A job is already being processed. Please wait.');
  }
  const job = queueService.getNextPendingJob();
  if (!job) {
    throw new Error('No pending jobs in queue.');
  }
  // Explicit trigger — enable drain mode so jobs chain automatically
  _drainMode = true;
  setImmediate(() => runWorker());
  return job;
}

/**
 * Manually process a specific job by ID.
 */
async function processJobById(jobId) {
  if (_processing) throw new Error('A job is already being processed.');
  const job = queueService.getJob(jobId);
  if (!job) throw new Error('Job not found');
  if (!['pending', 'error', 'paused', 'skipped'].includes(job.status)) {
    throw new Error(`Job is already ${job.status}. Use Restart to run it again from scratch, or Regen to regenerate the content.`);
  }
  queueService.updateJobStatus(jobId, 'pending', { error_message: null });
  // Explicit trigger — enable drain mode so subsequent pending jobs chain
  _drainMode = true;
  _processing = true;
  setImmediate(() => {
    processJob(job)
      .catch(err => {
        console.error('[processJobById] Error:', err.message);
        queueService.updateJobStatus(jobId, 'error', { error_message: err.message });
      })
      .finally(() => {
        _processing = false;
        // Continue draining even if this job errored — same logic as runWorker's finally
        if (_drainMode) {
          const next = queueService.getNextPendingJob();
          if (next) setImmediate(runWorker);
          else _drainMode = false;
        }
      });
  });
  return job;
}

module.exports = { start, stop, processNext, processJobById, isProcessing: () => _processing };
