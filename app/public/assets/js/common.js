// Shared utilities for all pages

// ── Theme (dark / light) ──
// Apply saved theme immediately — before DOM paint to avoid flash
(function () {
  const saved = localStorage.getItem('ct-theme');
  if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
})();

function toggleTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  if (isLight) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('ct-theme', 'dark');
  } else {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('ct-theme', 'light');
  }
  _updateThemeBtn();
}

function _updateThemeBtn() {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  btn.innerHTML = isLight
    ? '<span style="font-size:15px">🌙</span> Dark Mode'
    : '<span style="font-size:15px">☀️</span> Light Mode';
  btn.title = isLight ? 'Switch to dark mode' : 'Switch to light mode';
}

window.API = {
  async get(path) {
    const res = await fetch(path);
    if (res.status === 401) { location.href = '/'; return null; }
    return res.json();
  },
  async post(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 401) { location.href = '/'; return null; }
    return res.json();
  },
  async put(path, body) {
    const res = await fetch(path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  async delete(path) {
    const res = await fetch(path, { method: 'DELETE' });
    return res.json();
  },
};

function showAlert(container, message, type = 'error') {
  const div = document.createElement('div');
  div.className = `alert alert-${type}`;
  div.textContent = message;
  container.innerHTML = '';
  container.appendChild(div);
  if (type === 'success') {
    setTimeout(() => div.remove(), 4000);
  }
}

// Parse a DB timestamp string as UTC (SQLite datetime('now') stores UTC without 'Z')
function _parseUTC(ts) {
  if (!ts) return null;
  // If it already has timezone info (Z, +, T...Z) parse as-is
  if (/Z$|[+-]\d{2}:\d{2}$/.test(ts)) return new Date(ts);
  // Otherwise treat as UTC (SQLite stores UTC without suffix)
  return new Date(ts.replace(' ', 'T') + 'Z');
}

function formatDate(dateStr) {
  const d = _parseUTC(dateStr);
  if (!d) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

function formatDateShort(dateStr) {
  const d = _parseUTC(dateStr);
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

function statusBadge(status) {
  const labels = {
    pending: 'Pending',
    generating: 'Generating',
    posting: 'Posting',
    drafted: 'Drafted',
    error: 'Error',
    skipped: 'Skipped',
  };
  return `<span class="badge badge-${status}">${labels[status] || status}</span>`;
}

function logLevelIcon(level) {
  return { info: 'ℹ', success: '✓', warning: '⚠', error: '✗' }[level] || '·';
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Returns the URL escaped for an href attribute only if it is a safe http(s) URL.
// Blocks javascript:/data: and attribute-breakout. Returns '' for anything else.
function safeUrl(url) {
  if (!/^https?:\/\//i.test(String(url || ''))) return '';
  return escHtml(url);
}

function fmtTime(ts) {
  const d = _parseUTC(ts);
  if (!d) return '—';
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

function showToast(msg, type = 'info') {
  const d = document.createElement('div');
  d.className = `alert alert-${type}`;
  d.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;min-width:240px;padding:12px 16px;max-width:380px';
  d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 3500);
}

async function logout() {
  await API.post('/api/auth/logout');
  location.href = '/';
}

// ── Sidebar collapse / expand ──
function toggleSidebar() {
  const collapsed = document.body.classList.toggle('sidebar-collapsed');
  localStorage.setItem('ct-sidebar', collapsed ? 'collapsed' : 'open');
}

// Apply saved sidebar state early (default: collapsed on small screens)
(function () {
  const saved = localStorage.getItem('ct-sidebar');
  const collapse = saved === 'collapsed' || (saved === null && window.innerWidth <= 768);
  if (collapse && document.body) document.body.classList.add('sidebar-collapsed');
  else if (collapse) {
    document.addEventListener('DOMContentLoaded', () => document.body.classList.add('sidebar-collapsed'));
  }
})();

// Set active nav item + inject theme toggle + sidebar controls
document.addEventListener('DOMContentLoaded', () => {
  const path = location.pathname;
  document.querySelectorAll('.nav-item[data-path]').forEach(el => {
    if (el.dataset.path === path) el.classList.add('active');
  });

  // Inject theme toggle into every sidebar footer automatically
  const footer = document.querySelector('.sidebar-footer');
  if (footer && !document.getElementById('themeToggleBtn')) {
    const btn = document.createElement('button');
    btn.id = 'themeToggleBtn';
    btn.type = 'button';
    btn.onclick = toggleTheme;
    footer.insertBefore(btn, footer.firstChild);
    _updateThemeBtn();
  }
  // Give the logout button a tooltip (it becomes an icon-only button)
  if (footer) {
    const logoutBtn = footer.querySelector('button[onclick*="logout"]');
    if (logoutBtn && !logoutBtn.title) logoutBtn.title = 'Logout';
  }

  // Inject collapse button into the sidebar header
  const brand = document.querySelector('.sidebar-brand');
  if (brand && !document.getElementById('sidebarCollapseBtn')) {
    const c = document.createElement('button');
    c.id = 'sidebarCollapseBtn';
    c.type = 'button';
    c.title = 'Collapse sidebar';
    c.setAttribute('aria-label', 'Collapse sidebar');
    c.onclick = toggleSidebar;
    c.innerHTML = '&laquo;';
    brand.appendChild(c);
  }

  // Inject floating open button (visible only when collapsed)
  if (!document.getElementById('sidebarOpenBtn')) {
    const o = document.createElement('button');
    o.id = 'sidebarOpenBtn';
    o.type = 'button';
    o.title = 'Open sidebar';
    o.setAttribute('aria-label', 'Open sidebar');
    o.onclick = toggleSidebar;
    o.innerHTML = '&#9776;';
    document.body.appendChild(o);
  }

  // Inject mobile overlay (tap to close)
  if (!document.getElementById('sidebarOverlay')) {
    const ov = document.createElement('div');
    ov.id = 'sidebarOverlay';
    ov.onclick = toggleSidebar;
    document.body.appendChild(ov);
  }
});
