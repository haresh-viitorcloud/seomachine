const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '../../data/app.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS blog_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      domain TEXT NOT NULL,
      wp_url TEXT NOT NULL,
      wp_login_url TEXT,
      wp_username TEXT NOT NULL,
      wp_password TEXT NOT NULL,
      wp_method TEXT DEFAULT 'api',
      wp_app_password TEXT,
      wp_category TEXT DEFAULT '1',
      wp_author_id INTEGER DEFAULT 1,
      context_path TEXT,
      rules_path TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS uploads (
      id TEXT PRIMARY KEY,
      blog_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      row_count INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (blog_id) REFERENCES blog_configs(id)
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      upload_id TEXT NOT NULL,
      blog_id INTEGER NOT NULL,
      row_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      primary_keyword TEXT,
      scheduled_at DATETIME NOT NULL,
      status TEXT DEFAULT 'pending',
      raw_data TEXT,
      generated_title TEXT,
      generated_content TEXT,
      generated_meta TEXT,
      generated_image_prompt TEXT,
      generated_tags TEXT,
      wp_post_id INTEGER,
      wp_post_url TEXT,
      error_message TEXT,
      retry_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (upload_id) REFERENCES uploads(id),
      FOREIGN KEY (blog_id) REFERENCES blog_configs(id)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id TEXT,
      level TEXT NOT NULL DEFAULT 'info',
      message TEXT NOT NULL,
      metadata TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS generation_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      blog_id INTEGER NOT NULL,
      job_id TEXT,
      rating TEXT,
      feedback TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS queue_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      is_paused INTEGER DEFAULT 0,
      test_mode INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO queue_state (id, is_paused) VALUES (1, 0);
  `);

  // Migrations — add columns that may be missing on existing databases
  const migrations = [
    "ALTER TABLE queue_state ADD COLUMN test_mode INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE blog_configs ADD COLUMN wp_login_url TEXT",
    "ALTER TABLE queue_state ADD COLUMN claude_model TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE queue_state ADD COLUMN claude_effort TEXT NOT NULL DEFAULT 'high'",
    "ALTER TABLE queue_state ADD COLUMN generation_engine TEXT NOT NULL DEFAULT 'native'",
    "ALTER TABLE jobs ADD COLUMN cost_usd REAL DEFAULT 0",
    "ALTER TABLE uploads ADD COLUMN additional_instructions TEXT DEFAULT ''",
    "ALTER TABLE jobs ADD COLUMN additional_instructions TEXT DEFAULT ''",
    "ALTER TABLE jobs ADD COLUMN tokens_in INTEGER DEFAULT 0",
    "ALTER TABLE jobs ADD COLUMN tokens_out INTEGER DEFAULT 0",
    "ALTER TABLE jobs ADD COLUMN generated_at DATETIME",
    "ALTER TABLE jobs ADD COLUMN generated_faq TEXT",
    "ALTER TABLE jobs ADD COLUMN generated_seo_title TEXT",
    "ALTER TABLE jobs ADD COLUMN generated_slug TEXT",
    "ALTER TABLE jobs ADD COLUMN generated_image_alt TEXT",
    "ALTER TABLE jobs ADD COLUMN generated_ctas TEXT",
    "ALTER TABLE jobs ADD COLUMN image_source TEXT DEFAULT ''",
    "ALTER TABLE jobs ADD COLUMN seomachine_score REAL",
    "ALTER TABLE jobs ADD COLUMN generated_category TEXT",
    "ALTER TABLE blog_configs ADD COLUMN publishing_platform TEXT NOT NULL DEFAULT 'wordpress'",
    "ALTER TABLE blog_configs ADD COLUMN statamic_url TEXT DEFAULT ''",
    "ALTER TABLE blog_configs ADD COLUMN statamic_api_token TEXT DEFAULT ''",
    "ALTER TABLE blog_configs ADD COLUMN statamic_collection TEXT DEFAULT ''",
    "ALTER TABLE blog_configs ADD COLUMN statamic_cp_username TEXT DEFAULT ''",
    "ALTER TABLE blog_configs ADD COLUMN statamic_blueprint TEXT DEFAULT 'article'",
    "ALTER TABLE blog_configs ADD COLUMN statamic_site TEXT DEFAULT 'default'",
    "ALTER TABLE blog_configs ADD COLUMN statamic_category TEXT DEFAULT ''",
    "ALTER TABLE blog_configs ADD COLUMN astro_repo_url TEXT DEFAULT ''",
    "ALTER TABLE blog_configs ADD COLUMN astro_repo_path TEXT DEFAULT ''",
    "ALTER TABLE blog_configs ADD COLUMN astro_branch TEXT DEFAULT 'feature/blog-automation'",
    "ALTER TABLE blog_configs ADD COLUMN astro_sync_branch TEXT DEFAULT 'main'",
    "ALTER TABLE blog_configs ADD COLUMN astro_content_dir TEXT DEFAULT 'src/content/blog'",
    "ALTER TABLE blog_configs ADD COLUMN astro_covers_dir TEXT DEFAULT 'src/assets/blog-covers'",
    "ALTER TABLE blog_configs ADD COLUMN astro_git_token TEXT DEFAULT ''",
    "ALTER TABLE blog_configs ADD COLUMN astro_git_author_name TEXT DEFAULT ''",
    "ALTER TABLE blog_configs ADD COLUMN astro_git_author_email TEXT DEFAULT ''",
    // Astro/git review-gate: admin-editable frontmatter fields not covered by the
    // existing generated_title/generated_category/generated_meta columns.
    "ALTER TABLE jobs ADD COLUMN review_featured INTEGER DEFAULT 0",
    "ALTER TABLE jobs ADD COLUMN review_author TEXT DEFAULT ''",
    "ALTER TABLE jobs ADD COLUMN review_noindex INTEGER DEFAULT 0",
  ];
  for (const sql of migrations) {
    // Only swallow the expected "duplicate column" case; surface any other failure
    try { db.exec(sql); }
    catch (e) {
      if (!/duplicate column name/i.test(e.message)) {
        console.error(`[database] migration failed: ${sql}\n  ${e.message}`);
        throw e;
      }
    }
  }

  // Indexes on hot query columns — created after migrations so all columns exist.
  // (generated_at is added by a migration above.)
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_jobs_status_sched ON jobs(status, scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_jobs_upload ON jobs(upload_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_blog ON jobs(blog_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_generated_at ON jobs(generated_at);
    CREATE INDEX IF NOT EXISTS idx_logs_job ON activity_logs(job_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_blog_active ON generation_feedback(blog_id, active);
  `);
}

module.exports = { db, initializeDatabase };
