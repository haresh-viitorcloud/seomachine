/**
 * Featured image service.
 * Priority: Unsplash CDN photo (free, no API key) → SVG gradient fallback.
 * Output: 1200×630 WebP under 100KB.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');

/**
 * Download an image from any URL and return as Buffer.
 * Follows one redirect. Returns null on failure.
 */
function downloadImage(url, timeoutMs = 10000) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : require('http');
    const req = mod.get(url, { timeout: timeoutMs }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return resolve(downloadImage(res.headers.location, timeoutMs));
      }
      if (res.statusCode !== 200) return resolve(null);
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', () => resolve(null));
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

/**
 * Fetch a relevant photo using the Pexels API (free, 200 req/hour).
 * Requires PEXELS_API_KEY in .env — get one free at https://www.pexels.com/api/
 * Returns a Buffer or null.
 */
async function fetchPexelsPhoto(keyword) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  const query = encodeURIComponent((keyword || 'technology').substring(0, 60));
  const apiUrl = `https://api.pexels.com/v1/search?query=${query}&per_page=3&orientation=landscape`;

  const data = await new Promise((resolve) => {
    const req = https.get(apiUrl, {
      headers: { Authorization: apiKey },
      timeout: 8000,
    }, (res) => {
      if (res.statusCode !== 200) return resolve(null);
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); } catch { resolve(null); }
      });
      res.on('error', () => resolve(null));
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });

  const photos = data?.photos;
  if (!photos?.length) return null;

  // Pick the first photo — use landscape size (1280px wide)
  const photoUrl = photos[0].src.landscape || photos[0].src.large;
  if (!photoUrl) return null;
  return downloadImage(photoUrl);
}

/**
 * Fetch a relevant photo using the Unsplash API (free, 50 req/hour).
 * Requires UNSPLASH_ACCESS_KEY in .env — get one free at https://unsplash.com/developers
 * Returns a Buffer or null.
 */
async function fetchUnsplashPhoto(keyword) {
  const apiKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!apiKey) return null;

  const query = encodeURIComponent((keyword || 'technology').substring(0, 60));
  const apiUrl = `https://api.unsplash.com/photos/random?query=${query}&orientation=landscape&client_id=${apiKey}`;

  const data = await new Promise((resolve) => {
    const req = https.get(apiUrl, { timeout: 8000 }, (res) => {
      if (res.statusCode !== 200) return resolve(null);
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => { try { resolve(JSON.parse(raw)); } catch { resolve(null); } });
      res.on('error', () => resolve(null));
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });

  const photoUrl = data?.urls?.regular;
  if (!photoUrl) return null;
  return downloadImage(photoUrl);
}

function escXml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Wrap text into lines of max `maxChars` characters
function wrapText(text, maxChars) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxChars) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + ' ' + word).trim();
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

/**
 * Generates a featured image as a WebP buffer under 100KB.
 * @param {string} title - Post title
 * @param {string} keyword - Primary keyword
 * @param {string} theme - Theme/category for color selection
 * @returns {Promise<Buffer>} WebP image buffer
 */
async function generateFeaturedImage(title, keyword, theme, brandName = '', brandDomain = '') {
  const sharp = require('sharp');

  // Pick gradient colors based on theme
  const gradients = {
    ai:         ['#0f172a', '#1e3a5f', '#3b82f6'],
    ml:         ['#0f172a', '#1e3a5f', '#6366f1'],
    cloud:      ['#0f172a', '#164e63', '#0ea5e9'],
    software:   ['#0f172a', '#1e293b', '#8b5cf6'],
    enterprise: ['#0f172a', '#1c1917', '#f59e0b'],
    default:    ['#0f172a', '#1e293b', '#6366f1'],
  };

  const themeKey = (theme || 'default').toLowerCase();
  const colorKey = Object.keys(gradients).find(k => themeKey.includes(k)) || 'default';
  const [bg1, bg2, accent] = gradients[colorKey];

  // Wrap title to max 2 lines of ~38 chars each
  const titleLines = wrapText(title.replace(/[—–]/g, '-'), 38).slice(0, 2);
  const titleY = titleLines.length === 2 ? 240 : 270;
  const titleSvgLines = titleLines.map((line, i) =>
    `<text x="80" y="${titleY + i * 68}" font-family="'Segoe UI',Arial,sans-serif" font-weight="700" font-size="54" fill="#ffffff" opacity="0.95">${escXml(line)}</text>`
  ).join('');

  // Keyword chip
  const kwText = (keyword || '').substring(0, 50);

  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="60%" stop-color="${bg2}"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.4"/>
    </linearGradient>
    <linearGradient id="accent-line" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Decorative circles -->
  <circle cx="1100" cy="100" r="220" fill="${accent}" opacity="0.07"/>
  <circle cx="1050" cy="550" r="150" fill="${accent}" opacity="0.05"/>

  <!-- Accent bar -->
  <rect x="80" y="${titleY - 56}" width="60" height="6" rx="3" fill="${accent}" filter="url(#glow)"/>

  <!-- Title lines -->
  ${titleSvgLines}

  <!-- Keyword pill -->
  <rect x="78" y="${titleY + (titleLines.length * 68) + 18}" width="${Math.min(kwText.length * 13 + 32, 500)}" height="38" rx="19" fill="${accent}" opacity="0.18"/>
  <text x="98" y="${titleY + (titleLines.length * 68) + 43}" font-family="'Segoe UI',Arial,sans-serif" font-size="20" fill="${accent}" font-weight="500">${escXml(kwText)}</text>

  <!-- Brand -->
  ${brandName ? `<text x="80" y="595" font-family="'Segoe UI',Arial,sans-serif" font-size="20" fill="rgba(255,255,255,0.4)" font-weight="500" letter-spacing="2">${escXml(brandName.toUpperCase())}</text>` : ''}
  ${brandDomain ? `<text x="1120" y="595" font-family="'Segoe UI',Arial,sans-serif" font-size="18" fill="rgba(255,255,255,0.25)" text-anchor="end">${escXml(brandDomain)}</text>` : ''}
</svg>`;

  // Render at 1200×630, convert to WebP, target under 100KB
  const buffer = await sharp(Buffer.from(svg))
    .resize(1200, 630)
    .webp({ quality: 75, effort: 4 })
    .toBuffer();

  // If over 100KB, reduce quality further
  if (buffer.length > 100 * 1024) {
    return sharp(buffer).webp({ quality: 55, effort: 4 }).toBuffer();
  }

  return buffer;
}

/**
 * Saves the generated image to a temp file and returns the path.
 */
async function saveTempImage(title, keyword, theme, imagePrompt, blog = {}) {
  const sharp = require('sharp');
  let buffer = null;
  let source = 'gradient';

  // Build search query from image_prompt, keyword, or theme
  const searchQuery = imagePrompt
    ? imagePrompt.replace(/[^a-zA-Z0-9 ,]/g, '').split(',')[0].trim()
    : (keyword || theme || 'technology');

  // Try photo APIs in order: Pexels → Unsplash → SVG gradient fallback
  for (const [fetchFn, label] of [[fetchPexelsPhoto, 'pexels'], [fetchUnsplashPhoto, 'unsplash']]) {
    try {
      const rawPhoto = await fetchFn(searchQuery);
      if (rawPhoto && rawPhoto.length > 10000) {
        buffer = await sharp(rawPhoto)
          .resize(1200, 630, { fit: 'cover', position: 'centre' })
          .webp({ quality: 75 })
          .toBuffer();
        if (buffer.length > 100 * 1024) {
          buffer = await sharp(buffer).webp({ quality: 55 }).toBuffer();
        }
        source = label;
        break;
      }
    } catch { /* try next */ }
  }

  // Fallback: SVG gradient — use blog name/domain so branding is correct per blog
  if (!buffer) {
    const brandName = blog.name ? blog.name.replace(/\s+blog$/i, '').trim() : '';
    const brandDomain = blog.domain || '';
    buffer = await generateFeaturedImage(title, keyword, theme, brandName, brandDomain);
    source = 'gradient';
  }

  const tmpPath = path.join(os.tmpdir(), `ct-image-${Date.now()}.webp`);
  fs.writeFileSync(tmpPath, buffer);
  return { path: tmpPath, buffer, size: buffer.length, source };
}

module.exports = { generateFeaturedImage, saveTempImage };
