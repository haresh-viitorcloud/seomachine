/**
 * pythonGate — Node wrapper around seomachine's Python quality gate
 * (content_scrubber + content_scorer).
 *
 * This is BEST-EFFORT by design: if Python or its deps (e.g. textstat) are
 * missing, or the gate errors, it resolves with `{ ok:false, cleaned:<original> }`
 * so content generation NEVER fails because of the quality gate.
 *
 * The actual scrub/score logic lives in app/scripts/seomachine_quality_gate.py,
 * which imports the LIVE upstream modules from <seomachineRoot>/data_sources so
 * upstream improvements flow in automatically.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crossSpawn = require('cross-spawn');

const GATE_SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'seomachine_quality_gate.py');

// Monotonic counter for unique temp-file names within a process.
let _gateSeq = 0;

/**
 * Scrub + score article content using seomachine's Python modules.
 * @param {string} content - article body (HTML or markdown)
 * @param {object} opts
 * @param {string} opts.root - seomachine repo root (contains data_sources/)
 * @param {string} [opts.pythonBin] - python executable (default: env SEOMACHINE_PYTHON or 'python3')
 * @param {number} [opts.timeoutMs] - hard timeout (default 60s)
 * @returns {Promise<{ok:boolean, cleaned:string, composite_score:?number, dimensions:?object, priority_fixes:string[], scrubber_changed:boolean, error:?string}>}
 */
function scrubAndScore(content, opts = {}) {
  const { root, pythonBin = process.env.SEOMACHINE_PYTHON || 'python3', timeoutMs = 60000 } = opts;
  const stamp = `${process.pid}-${Date.now()}-${++_gateSeq}`;
  const inFile = path.join(os.tmpdir(), `seomachine-gate-in-${stamp}.md`);
  const outFile = path.join(os.tmpdir(), `seomachine-gate-out-${stamp}.md`);

  const fail = (error) => ({
    ok: false, cleaned: content, composite_score: null,
    dimensions: null, priority_fixes: [], scrubber_changed: false, error,
  });

  return new Promise((resolve) => {
    try {
      fs.writeFileSync(inFile, content ?? '', 'utf8');
    } catch (e) {
      return resolve(fail(`write temp: ${e.message}`));
    }

    if (!fs.existsSync(GATE_SCRIPT)) {
      cleanup();
      return resolve(fail(`gate script not found: ${GATE_SCRIPT}`));
    }

    let stdout = '', stderr = '', done = false;
    const finish = (res) => { if (done) return; done = true; cleanup(); resolve(res); };

    const proc = crossSpawn(pythonBin, [GATE_SCRIPT, inFile, outFile, root], {
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch { /* ignore */ }
      finish(fail(`gate timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout.on('data', (c) => { stdout += c.toString(); });
    proc.stderr.on('data', (c) => { stderr += c.toString(); });

    proc.on('error', (err) => {
      clearTimeout(timer);
      finish(fail(err.code === 'ENOENT' ? `python not found (${pythonBin})` : err.message));
    });

    proc.on('close', (code) => {
      clearTimeout(timer);
      let stats = null;
      try {
        const line = stdout.trim().split('\n').filter(l => l.trim().startsWith('{')).pop();
        if (line) stats = JSON.parse(line);
      } catch { /* fall through */ }

      if (!stats) {
        return finish(fail(`no JSON from gate (code ${code})${stderr ? ': ' + stderr.slice(0, 300) : ''}`));
      }

      let cleaned = content;
      try { if (fs.existsSync(outFile)) cleaned = fs.readFileSync(outFile, 'utf8'); } catch { /* keep original */ }

      finish({
        ok: stats.ok !== false,
        cleaned,
        composite_score: typeof stats.composite_score === 'number' ? stats.composite_score : null,
        dimensions: stats.dimensions || null,
        priority_fixes: Array.isArray(stats.priority_fixes) ? stats.priority_fixes : [],
        scrubber_changed: !!stats.scrubber_changed,
        error: stats.error || null,
      });
    });

    function cleanup() {
      fs.unlink(inFile, () => {});
      fs.unlink(outFile, () => {});
    }
  });
}

module.exports = { scrubAndScore, GATE_SCRIPT };
