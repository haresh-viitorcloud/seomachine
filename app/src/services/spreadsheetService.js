const XLSX = require('xlsx');
const dayjs = require('dayjs');
const path = require('path');

// Column mapping from Excel headers to internal field names
const COLUMN_MAP = {
  '#': 'row_number',
  'Date': 'date',
  'Day': 'day',
  'Theme / Pillar': 'theme',
  'Blog Topic (CTR-Optimised)': 'title',
  'Primary Keyword': 'primary_keyword',
  'Secondary Keywords': 'secondary_keywords',
  'Pain Points Addressed': 'pain_points',
  'ICP Seeking Solutions For': 'icp_solutions',
  'Ideal Customer Profile (ICP)': 'icp',
  'Blog Type': 'blog_type',
  'Target Industry': 'target_industry',
  'Funnel Stage': 'funnel_stage',
  'Outcome': 'outcome',
  'Intent': 'intent',
  'CTR Hook & Title Strategy': 'ctr_strategy',
  'AEO Rank Strategy': 'aeo_strategy',
  'GEO Rank Strategy': 'geo_strategy',
  'SEO Rank Strategy': 'seo_strategy',
  'Target location': 'target_location',
  'AEO+GEO Strategy': 'aeo_geo_strategy',
};

// Client sheets arrive with slightly different header names ("Blog Topic" vs
// "Blog Topic (CTR-Optimised)", "Primary Keywords" plural, "Target GEO"…).
// Normalized alias → canonical COLUMN_MAP header. Matching is case-insensitive
// with whitespace collapsed, so "  Blog  Topic " still resolves.
const HEADER_ALIASES = {
  'blog topic': 'Blog Topic (CTR-Optimised)',
  'blog topic (ctr-optimized)': 'Blog Topic (CTR-Optimised)',
  'blog topic (ctr optimised)': 'Blog Topic (CTR-Optimised)',
  'blog title': 'Blog Topic (CTR-Optimised)',
  'article title': 'Blog Topic (CTR-Optimised)',
  'topic': 'Blog Topic (CTR-Optimised)',
  'title': 'Blog Topic (CTR-Optimised)',
  'primary keywords': 'Primary Keyword',
  'main keyword': 'Primary Keyword',
  'focus keyword': 'Primary Keyword',
  'secondary keyword': 'Secondary Keywords',
  'supporting keywords': 'Secondary Keywords',
  'ideal customer profile': 'Ideal Customer Profile (ICP)',
  'icp': 'Ideal Customer Profile (ICP)',
  'pain points': 'Pain Points Addressed',
  'target geo': 'Target location',
  'target country': 'Target location',
  'target locations': 'Target location',
  'rank focus': 'SEO Rank Strategy',
  'theme': 'Theme / Pillar',
  'pillar': 'Theme / Pillar',
  'content type': 'Blog Type',
  'funnel': 'Funnel Stage',
  'aeo geo strategy': 'AEO+GEO Strategy',
  'publish date': 'Date',
  'publication date': 'Date',
  'post date': 'Date',
};

const _norm = (h) => String(h).trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Resolves raw spreadsheet headers to canonical COLUMN_MAP headers.
 * Special case: "Day" normally means day-of-week, but some client sheets use it
 * as their only date column — when no Date column exists, Day becomes Date.
 * @returns {{ headers: string[], mappings: string[] }} canonical headers + human-readable notes
 */
function resolveHeaders(rawHeaders) {
  const canonicalByNorm = {};
  for (const k of Object.keys(COLUMN_MAP)) canonicalByNorm[_norm(k)] = k;
  const mappings = [];

  let headers = rawHeaders.map((h) => {
    const n = _norm(h);
    if (canonicalByNorm[n]) return canonicalByNorm[n]; // exact match (casing/spacing fix only)
    if (HEADER_ALIASES[n]) {
      mappings.push(`Auto-mapped column "${h}" → "${HEADER_ALIASES[n]}"`);
      return HEADER_ALIASES[n];
    }
    return String(h).trim(); // unknown column — passes through as-is
  });

  // "Day" as the date column when there is no "Date"
  if (!headers.includes('Date')) {
    const dayIdx = headers.indexOf('Day');
    if (dayIdx !== -1) {
      headers = headers.slice();
      headers[dayIdx] = 'Date';
      mappings.push(`No "Date" column found — using "${rawHeaders[dayIdx]}" as the date column`);
    }
  }

  return { headers, mappings };
}

/**
 * Converts an Excel serial date to a JavaScript Date.
 * Excel serial dates count days from Dec 30, 1899.
 */
function excelDateToDate(serial) {
  if (!serial) return null;
  if (serial instanceof Date) return serial;
  if (typeof serial === 'string') {
    const parsed = dayjs(serial);
    return parsed.isValid() ? parsed.toDate() : null;
  }
  const epoch = new Date(Date.UTC(1899, 11, 30));
  return new Date(epoch.getTime() + serial * 86400000);
}

/**
 * Parses an uploaded Excel or CSV file and returns normalized row objects.
 * @param {string} filePath - absolute path to uploaded file
 * @returns {{ headers: string[], rows: object[], errors: string[] }}
 */
function parseSpreadsheet(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const wb = XLSX.readFile(filePath, { cellDates: false });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  if (raw.length < 2) {
    throw new Error('Spreadsheet must have at least a header row and one data row.');
  }

  const rawHeaders = raw[0].map(h => String(h).trim());
  // Resolve client header variants to canonical names ("Blog Topic" → "Blog Topic (CTR-Optimised)")
  const { headers: canonHeaders, mappings } = resolveHeaders(rawHeaders);
  const errors = [];
  const rows = [];

  const requiredColumns = ['Blog Topic (CTR-Optimised)', 'Date', 'Primary Keyword'];
  for (const col of requiredColumns) {
    if (!canonHeaders.includes(col)) {
      errors.push(`Missing required column: "${col}"`);
    }
  }
  if (errors.length) return { headers: rawHeaders, rows: [], errors, mappings };

  let rowNum = 0;
  for (let i = 1; i < raw.length; i++) {
    const rawRow = raw[i];
    // Skip empty rows
    if (!rawRow || rawRow.every(cell => cell === '' || cell === null || cell === undefined)) continue;
    rowNum++;

    const row = { _original_row: i + 1 };
    canonHeaders.forEach((header, idx) => {
      const field = COLUMN_MAP[header] || header.toLowerCase().replace(/\s+/g, '_');
      row[field] = rawRow[idx] !== undefined ? rawRow[idx] : '';
    });

    // Normalize date
    const dateVal = row['date'];
    const parsedDate = excelDateToDate(dateVal);
    if (!parsedDate) {
      errors.push(`Row ${i + 1}: Invalid date value "${dateVal}"`);
      continue;
    }
    row['date'] = parsedDate;
    row['scheduled_at'] = dayjs(parsedDate).format('YYYY-MM-DD 09:00:00');

    // Normalize row number
    if (!row['row_number']) row['row_number'] = rowNum;

    // Normalize secondary keywords to array
    if (row['secondary_keywords'] && typeof row['secondary_keywords'] === 'string') {
      row['secondary_keywords'] = row['secondary_keywords'].split(',').map(k => k.trim()).filter(Boolean);
    } else {
      row['secondary_keywords'] = [];
    }

    if (!row['title']) {
      errors.push(`Row ${i + 1}: Missing blog title`);
      continue;
    }

    rows.push(row);
  }

  return { headers: rawHeaders, rows, errors, mappings };
}

/**
 * Generates a downloadable sample template buffer.
 * @returns {Buffer} Excel file buffer
 */
function generateSampleTemplate() {
  const headers = Object.keys(COLUMN_MAP);
  const sampleRow = [
    1,
    '2026-06-01',
    'Monday',
    'AI',
    'How Enterprise AI Development Companies Are Changing Business in 2026',
    'ai development company',
    'custom ai solutions, ai integration services, enterprise ai',
    'No clear ROI on AI investments, difficult to find reliable AI partners',
    'Proven AI development partner with enterprise case studies',
    'CTO/IT Director at mid-to-large enterprise (200+ employees)',
    'Comparison Listicle',
    'Cross-Industry Enterprise',
    'BOFU',
    'Direct consultation requests',
    'Transactional',
    'Numbered list + comparison format for high CTR',
    'FAQ schema targeting AI vendor selection queries',
    'US primary, EU secondary, APAC tertiary',
    'Cornerstone page with cluster linking',
    'USA, Europe, APAC',
    'Add FAQs (4 FAQs with 15-20 words of answer each)',
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  ws['!cols'] = headers.map(() => ({ wch: 30 }));
  XLSX.utils.book_append_sheet(wb, ws, 'Blog Calendar');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { parseSpreadsheet, generateSampleTemplate, COLUMN_MAP };
