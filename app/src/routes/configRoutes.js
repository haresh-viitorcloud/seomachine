const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const wordpressService = require('../services/wordpressService');
const statamicService  = require('../services/statamicService');
const astroGitService  = require('../services/astroGitService');
const { db } = require('../config/database');

const router = express.Router();

// Get all blog configurations
router.get('/api/configs', requireAuth, (req, res) => {
  const configs = db.prepare(`
    SELECT id, slug, name, domain, wp_url, wp_username, wp_method, wp_category, wp_author_id,
           context_path, rules_path, is_active, created_at,
           publishing_platform, statamic_url, statamic_collection, statamic_cp_username,
           statamic_blueprint, statamic_site, statamic_category,
           astro_repo_url, astro_repo_path, astro_branch, astro_content_dir, astro_covers_dir,
           astro_git_author_name, astro_git_author_email
    FROM blog_configs ORDER BY id ASC
  `).all();
  res.json({ configs });
});

// Get single config (no passwords/tokens)
router.get('/api/configs/:id', requireAuth, (req, res) => {
  const config = db.prepare(`
    SELECT id, slug, name, domain, wp_url, wp_username, wp_method, wp_category, wp_author_id,
           context_path, rules_path, is_active,
           publishing_platform, statamic_url, statamic_collection, statamic_cp_username,
           statamic_blueprint, statamic_site, statamic_category,
           astro_repo_url, astro_repo_path, astro_branch, astro_content_dir, astro_covers_dir,
           astro_git_author_name, astro_git_author_email
    FROM blog_configs WHERE id = ?
  `).get(req.params.id);
  if (!config) return res.status(404).json({ error: 'Config not found' });
  res.json({ config });
});

// Create new blog config
router.post('/api/configs', requireAuth, (req, res) => {
  const {
    slug, name, domain, wp_url, wp_login_url, wp_username, wp_password,
    wp_method, wp_app_password, wp_category, wp_author_id, context_path, rules_path,
    publishing_platform, statamic_url, statamic_api_token, statamic_collection, statamic_cp_username,
    statamic_blueprint, statamic_site, statamic_category,
    astro_repo_url, astro_repo_path, astro_branch, astro_content_dir, astro_covers_dir,
    astro_git_token, astro_git_author_name, astro_git_author_email,
  } = req.body;

  const platform = publishing_platform || 'wordpress';

  if (!slug || !name || !domain) {
    return res.status(400).json({ error: 'Required fields: slug, name, domain' });
  }
  if (platform === 'wordpress' && (!wp_url || !wp_username || !wp_password)) {
    return res.status(400).json({ error: 'WordPress platform requires: wp_url, wp_username, wp_password' });
  }

  if (!/^[a-z0-9_]+$/.test(slug)) {
    return res.status(400).json({ error: 'Slug must be lowercase letters, numbers, and underscores only.' });
  }

  const existing = db.prepare('SELECT id FROM blog_configs WHERE slug = ?').get(slug);
  if (existing) {
    return res.status(409).json({ error: `A blog config with slug "${slug}" already exists.` });
  }

  const result = db.prepare(`
    INSERT INTO blog_configs (
      slug, name, domain, wp_url, wp_login_url, wp_username, wp_password,
      wp_method, wp_app_password, wp_category, wp_author_id, context_path, rules_path,
      publishing_platform, statamic_url, statamic_api_token, statamic_collection, statamic_cp_username,
      statamic_blueprint, statamic_site, statamic_category,
      astro_repo_url, astro_repo_path, astro_branch, astro_content_dir, astro_covers_dir,
      astro_git_token, astro_git_author_name, astro_git_author_email
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    slug, name, domain,
    wp_url || '', wp_login_url || '', wp_username || '', wp_password || '',
    wp_method || 'api', wp_app_password || '',
    wp_category || '1', wp_author_id || 1,
    context_path || '', rules_path || '',
    platform,
    statamic_url || '', statamic_api_token || '', statamic_collection || '', statamic_cp_username || '',
    statamic_blueprint || 'article', statamic_site || 'default', statamic_category || '',
    astro_repo_url || '', astro_repo_path || '', astro_branch || 'feature/blog-automation',
    astro_content_dir || 'src/content/blog', astro_covers_dir || 'src/assets/blog-covers',
    astro_git_token || '', astro_git_author_name || '', astro_git_author_email || ''
  );

  const config = db.prepare(`
    SELECT id, slug, name, domain, wp_url, wp_username, wp_method, wp_category, context_path,
           publishing_platform, statamic_url, statamic_collection, statamic_cp_username,
           statamic_blueprint, statamic_site, statamic_category,
           astro_repo_url, astro_repo_path, astro_branch, astro_content_dir, astro_covers_dir,
           astro_git_author_name, astro_git_author_email
    FROM blog_configs WHERE id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json({ ok: true, config });
});

// Update blog config
router.put('/api/configs/:id', requireAuth, (req, res) => {
  const {
    name, domain, wp_url, wp_login_url, wp_username, wp_method, wp_app_password,
    wp_category, wp_author_id, context_path, rules_path, is_active,
    publishing_platform, statamic_url, statamic_api_token, statamic_collection, statamic_cp_username,
    statamic_blueprint, statamic_site, statamic_category,
    astro_repo_url, astro_repo_path, astro_branch, astro_content_dir, astro_covers_dir,
    astro_git_token, astro_git_author_name, astro_git_author_email,
  } = req.body;
  const { wp_password } = req.body;

  const existing = db.prepare('SELECT * FROM blog_configs WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Config not found' });

  db.prepare(`
    UPDATE blog_configs SET
      name = ?, domain = ?, wp_url = ?, wp_login_url = ?, wp_username = ?,
      wp_password = ?, wp_method = ?, wp_app_password = ?,
      wp_category = ?, wp_author_id = ?, context_path = ?,
      rules_path = ?, is_active = ?,
      publishing_platform = ?, statamic_url = ?, statamic_api_token = ?,
      statamic_collection = ?, statamic_cp_username = ?,
      statamic_blueprint = ?, statamic_site = ?, statamic_category = ?,
      astro_repo_url = ?, astro_repo_path = ?, astro_branch = ?,
      astro_content_dir = ?, astro_covers_dir = ?, astro_git_token = ?,
      astro_git_author_name = ?, astro_git_author_email = ?,
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    name || existing.name,
    domain || existing.domain,
    wp_url !== undefined ? wp_url : existing.wp_url,
    wp_login_url !== undefined ? wp_login_url : existing.wp_login_url,
    wp_username !== undefined ? wp_username : existing.wp_username,
    wp_password || existing.wp_password,
    wp_method || existing.wp_method,
    wp_app_password !== undefined ? wp_app_password : existing.wp_app_password,
    wp_category || existing.wp_category,
    wp_author_id || existing.wp_author_id,
    context_path !== undefined ? context_path : existing.context_path,
    rules_path !== undefined ? rules_path : existing.rules_path,
    is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
    publishing_platform || existing.publishing_platform || 'wordpress',
    statamic_url !== undefined ? statamic_url : (existing.statamic_url || ''),
    statamic_api_token !== undefined ? statamic_api_token : (existing.statamic_api_token || ''),
    statamic_collection !== undefined ? statamic_collection : (existing.statamic_collection || ''),
    statamic_cp_username !== undefined ? statamic_cp_username : (existing.statamic_cp_username || ''),
    statamic_blueprint !== undefined ? statamic_blueprint : (existing.statamic_blueprint || 'article'),
    statamic_site !== undefined ? statamic_site : (existing.statamic_site || 'default'),
    statamic_category !== undefined ? statamic_category : (existing.statamic_category || ''),
    astro_repo_url !== undefined ? astro_repo_url : (existing.astro_repo_url || ''),
    astro_repo_path !== undefined ? astro_repo_path : (existing.astro_repo_path || ''),
    astro_branch !== undefined ? astro_branch : (existing.astro_branch || 'feature/blog-automation'),
    astro_content_dir !== undefined ? astro_content_dir : (existing.astro_content_dir || 'src/content/blog'),
    astro_covers_dir !== undefined ? astro_covers_dir : (existing.astro_covers_dir || 'src/assets/blog-covers'),
    astro_git_token || existing.astro_git_token || '',
    astro_git_author_name !== undefined ? astro_git_author_name : (existing.astro_git_author_name || ''),
    astro_git_author_email !== undefined ? astro_git_author_email : (existing.astro_git_author_email || ''),
    req.params.id
  );

  res.json({ ok: true });
});

// Test WordPress connection
router.post('/api/configs/:id/test', requireAuth, async (req, res) => {
  const config = db.prepare('SELECT * FROM blog_configs WHERE id = ?').get(req.params.id);
  if (!config) return res.status(404).json({ error: 'Config not found' });

  const result = await wordpressService.testConnection(config);
  res.json(result);
});

// Test Statamic connection
router.post('/api/configs/:id/test-statamic', requireAuth, async (req, res) => {
  const config = db.prepare('SELECT * FROM blog_configs WHERE id = ?').get(req.params.id);
  if (!config) return res.status(404).json({ error: 'Config not found' });

  console.log(`[Statamic Test] blog=${config.slug} url=${config.statamic_url} user=${config.statamic_cp_username || '(empty)'} pass=${config.statamic_api_token ? '(set)' : '(empty)'}`);
  const result = await statamicService.testConnection(config);
  if (!result.ok) {
    console.error(`[Statamic Test] FAILED: ${result.error}`);
  } else {
    console.log(`[Statamic Test] OK — site: ${result.name}`);
  }
  res.json(result);
});

// Test Astro/git repo connection (lightweight ls-remote, no clone)
router.post('/api/configs/:id/test-astro-git', requireAuth, async (req, res) => {
  const config = db.prepare('SELECT * FROM blog_configs WHERE id = ?').get(req.params.id);
  if (!config) return res.status(404).json({ error: 'Config not found' });

  console.log(`[Astro/Git Test] blog=${config.slug} repo=${config.astro_repo_url} branch=${config.astro_branch || 'feature/blog-automation'} token=${config.astro_git_token ? '(set)' : '(empty)'}`);
  const result = await astroGitService.testConnection(config);
  if (!result.ok) {
    console.error(`[Astro/Git Test] FAILED: ${result.error}`);
  } else {
    console.log(`[Astro/Git Test] OK — branch: ${result.branch} exists: ${result.branchExists}`);
  }
  res.json(result);
});

// Delete config (only if no jobs or uploads reference it)
router.delete('/api/configs/:id', requireAuth, (req, res) => {
  const jobs = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE blog_id = ?').get(req.params.id);
  if (jobs.count > 0) {
    return res.status(409).json({ error: `Cannot delete: ${jobs.count} jobs reference this configuration.` });
  }
  // Uploads also FK to blog_configs and can exist with zero jobs (e.g. all skipped/deleted).
  // Without this check the DELETE below throws a raw FK-constraint 500.
  const uploads = db.prepare('SELECT COUNT(*) as count FROM uploads WHERE blog_id = ?').get(req.params.id);
  if (uploads.count > 0) {
    return res.status(409).json({ error: `Cannot delete: ${uploads.count} upload(s) reference this configuration.` });
  }
  try {
    db.prepare('DELETE FROM generation_feedback WHERE blog_id = ?').run(req.params.id);
    db.prepare('DELETE FROM blog_configs WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(409).json({ error: `Cannot delete configuration: ${err.message}` });
  }
});

module.exports = router;
