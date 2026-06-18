const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/authMiddleware');
const { parseSpreadsheet, generateSampleTemplate } = require('../services/spreadsheetService');
const queueService = require('../services/queueService');
const { db } = require('../config/database');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Please upload: ${allowed.join(', ')}`));
    }
  },
});

// Download sample template
router.get('/api/upload/template', requireAuth, (req, res) => {
  const buffer = generateSampleTemplate();
  res.setHeader('Content-Disposition', 'attachment; filename="blog-calendar-template.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

// Upload and parse spreadsheet (preview only — does not queue yet)
router.post('/api/upload/parse', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const blogId = parseInt(req.body.blog_id);
  if (!blogId) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Blog configuration must be selected.' });
  }

  const blogConfig = db.prepare('SELECT * FROM blog_configs WHERE id = ?').get(blogId);
  if (!blogConfig) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Invalid blog configuration.' });
  }

  // Warn if context/rules paths are missing — jobs will fail at generation time if not fixed
  const configWarnings = [];
  if (blogConfig.context_path) {
    const absContext = path.resolve(process.cwd(), blogConfig.context_path);
    if (!fs.existsSync(absContext)) {
      configWarnings.push(`Context folder not found: ${blogConfig.context_path} — generation will fail without it.`);
    }
  } else {
    configWarnings.push('No context_path set for this blog — generation will run without brand context.');
  }
  if (blogConfig.rules_path) {
    const absRules = path.resolve(process.cwd(), blogConfig.rules_path);
    if (!fs.existsSync(absRules)) {
      configWarnings.push(`Rules file not found: ${blogConfig.rules_path} — generation will use default rules.`);
    }
  }

  try {
    const { headers, rows, errors, mappings } = parseSpreadsheet(req.file.path);

    if (errors.length && rows.length === 0) {
      fs.unlink(req.file.path, () => {});
      return res.status(422).json({ error: 'Spreadsheet parsing failed.', details: errors, mappings });
    }

    // Store temp file path in session for confirmation step
    req.session.pendingUpload = {
      filePath: req.file.path,
      filename: req.file.filename,
      originalName: req.file.originalname,
      blogId,
      rowCount: rows.length,
    };

    res.json({
      ok: true,
      warnings: [...configWarnings, ...errors],
      mappings: mappings || [],
      blog: { id: blogConfig.id, name: blogConfig.name },
      rowCount: rows.length,
      preview: rows.map(row => ({
        row_number: row.row_number,
        date: row.date,
        scheduled_at: row.scheduled_at,
        title: row.title,
        primary_keyword: row.primary_keyword,
        blog_type: row.blog_type,
        funnel_stage: row.funnel_stage,
        theme: row.theme,
      })),
    });
  } catch (err) {
    fs.unlink(req.file.path, () => {});
    res.status(422).json({ error: `Parsing error: ${err.message}` });
  }
});

// Check for duplicate posts before confirming upload
// Body: { rows: [{row_number, title, primary_keyword}] }
// Returns: { duplicates: [{row_number, title, existing_job: {id, status, wp_post_id, ...}}] }
router.post('/api/upload/check-duplicates', requireAuth, (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || !rows.length) return res.json({ duplicates: [] });

  const { db } = require('../config/database');
  const duplicates = [];

  for (const row of rows) {
    if (!row.title) continue;
    const titleLower = row.title.trim().toLowerCase();

    // Match by title (case-insensitive) — check across all existing jobs
    const existing = db.prepare(`
      SELECT j.id, j.title, j.status, j.wp_post_id, j.wp_post_url,
             j.generated_title, j.error_message, j.updated_at, j.row_number as job_row,
             u.original_name as upload_name
      FROM jobs j
      LEFT JOIN uploads u ON j.upload_id = u.id
      WHERE LOWER(TRIM(j.title)) = ?
         OR LOWER(TRIM(j.generated_title)) = ?
      ORDER BY j.updated_at DESC
      LIMIT 1
    `).get(titleLower, titleLower);

    if (existing) {
      duplicates.push({
        row_number: row.row_number,
        title: row.title,
        existing_job: existing,
      });
    }
  }

  res.json({ duplicates });
});

// Confirm upload — create jobs in the queue
// Body: { selectedRows?: number[], duplicateActions?: {[row_number]: 'replace'|'skip'|'keep'} }
router.post('/api/upload/confirm', requireAuth, (req, res) => {
  const pending = req.session.pendingUpload;
  if (!pending) {
    return res.status(400).json({ error: 'No pending upload found. Please upload a file first.' });
  }

  try {
    const { rows } = parseSpreadsheet(pending.filePath);
    if (!rows.length) {
      return res.status(422).json({ error: 'No valid rows found in spreadsheet.' });
    }

    // Filter to selected rows if provided
    const selectedRows = req.body.selectedRows;
    const rowsToQueue = (Array.isArray(selectedRows) && selectedRows.length > 0)
      ? rows.filter(r => selectedRows.includes(r.row_number))
      : rows;

    if (!rowsToQueue.length) {
      return res.status(400).json({ error: 'No rows selected. Please select at least one row.' });
    }

    // Manual mode: create jobs as 'paused' so the scheduler never auto-starts them.
    // Auto mode: create as 'pending' so the queue (cron / process-next) picks them up.
    const autoStart = req.body.autoStart !== false && req.body.startMode !== 'manual';
    const initialStatus = autoStart ? 'pending' : 'paused';

    const rawInstructions = (req.body.additionalInstructions || '').trim();
    const additionalInstructions = rawInstructions.substring(0, 2000);
    if (rawInstructions.length > 2000) {
      return res.status(400).json({ error: `Additional instructions too long (${rawInstructions.length} chars). Maximum is 2000 characters.` });
    }

    const upload = queueService.createUpload(
      pending.blogId,
      pending.filename,
      pending.originalName,
      rowsToQueue.length,
      additionalInstructions
    );

    // duplicateActions: { [row_number]: 'replace' | 'skip' | 'keep' }
    // replace → delete old job then create new
    // skip    → do not create a job for this row
    // keep    → create new job alongside the old one (default)
    const duplicateActions = req.body.duplicateActions || {};
    const { db } = require('../config/database');

    const jobs = [];
    let skipped = 0;
    for (const row of rowsToQueue) {
      const action = duplicateActions[String(row.row_number)] || 'keep';

      if (action === 'skip') {
        skipped++;
        continue;
      }

      if (action === 'replace') {
        // Find and delete any existing job with the same title
        const existing = db.prepare(`
          SELECT id FROM jobs
          WHERE LOWER(TRIM(title)) = ? OR LOWER(TRIM(generated_title)) = ?
          ORDER BY updated_at DESC LIMIT 1
        `).get(row.title.trim().toLowerCase(), row.title.trim().toLowerCase());
        if (existing) {
          try { queueService.deleteJob(existing.id); } catch { /* skip if can't delete */ }
        }
      }

      const job = queueService.createJob(upload.id, pending.blogId, row, initialStatus);
      jobs.push(job);
    }

    queueService.addLog(null, 'info', `Spreadsheet uploaded: ${pending.originalName} — ${jobs.length} jobs queued${skipped ? `, ${skipped} duplicates skipped` : ''}`);

    delete req.session.pendingUpload;

    res.json({
      ok: true,
      upload_id: upload.id,
      jobs_created: jobs.length,
      queued: jobs.length,
      skipped,
      auto_start: autoStart,
      message: `${jobs.length} blog post${jobs.length !== 1 ? 's' : ''} ${autoStart ? 'queued' : 'saved (paused)'}${skipped ? ` · ${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped` : ''}.`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel pending upload
router.post('/api/upload/cancel', requireAuth, (req, res) => {
  const pending = req.session.pendingUpload;
  if (pending && pending.filePath) {
    fs.unlink(pending.filePath, () => {});
  }
  delete req.session.pendingUpload;
  res.json({ ok: true });
});

module.exports = router;
