#!/usr/bin/env python3
"""
seomachine quality gate — runs the upstream content_scrubber + content_scorer
on a generated article and emits JSON stats.

Invoked by app/src/services/pythonGate.js:
    python3 seomachine_quality_gate.py <in_file> <out_file> <seomachine_root>

- <in_file>          : article body to scrub/score (read)
- <out_file>         : where the scrubbed content is written
- <seomachine_root>  : repo root containing data_sources/modules

Design notes:
- Best-effort: if the scorer's deps (textstat) are missing, scrubbing still runs
  and the score is reported as null. The Node caller never fails generation on this.
- Carries a 3-line shim for an UPSTREAM bug: ContentScrubber.scrub() resets
  self.stats without the 'ai_phrases_replaced' key, which would KeyError on any
  article containing an AI-telltale phrase. The shim lives here (our code), so the
  upstream root file stays untouched and `git pull upstream` remains conflict-free.
"""
import sys
import os
import json


def main():
    if len(sys.argv) < 4:
        print(json.dumps({"ok": False, "error": "usage: gate <in> <out> <root>"}))
        return 0

    in_file, out_file, root = sys.argv[1], sys.argv[2], sys.argv[3]

    try:
        with open(in_file, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": f"read input: {e}"}))
        return 0

    sys.path.insert(0, os.path.join(root, "data_sources"))

    result = {"ok": True, "scrubber_ok": False, "scrubber_changed": False,
              "composite_score": None, "dimensions": None, "priority_fixes": [],
              "scorer_ok": False, "error": None}

    cleaned = content

    # ---- Scrubber (with pull-safe shim for the upstream stats-reset bug) ----
    try:
        from modules import content_scrubber
        _orig = content_scrubber.ContentScrubber._replace_ai_phrases

        def _safe_replace_ai_phrases(self, c):
            # Ensure the key the reset drops is present before it is incremented.
            self.stats.setdefault("ai_phrases_replaced", 0)
            return _orig(self, c)

        content_scrubber.ContentScrubber._replace_ai_phrases = _safe_replace_ai_phrases

        from modules.content_scrubber import scrub_content
        cleaned = scrub_content(content, verbose=False)
        result["scrubber_ok"] = True
        result["scrubber_changed"] = cleaned != content
    except Exception as e:  # noqa: BLE001
        result["error"] = f"scrubber: {type(e).__name__}: {e}"
        cleaned = content  # fall back to original on any scrubber failure

    # Always write the (possibly unchanged) content so the caller has a file to read.
    try:
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(cleaned)
    except Exception as e:  # noqa: BLE001
        result["ok"] = False
        result["error"] = f"write output: {e}"
        print(json.dumps(result))
        return 0

    # ---- Scorer (best-effort; requires textstat) ----
    try:
        from modules.content_scorer import ContentScorer
        res = ContentScorer().score(cleaned)
        dims = res.get("dimensions", {}) or {}
        result["scorer_ok"] = True
        result["composite_score"] = res.get("composite_score")
        result["dimensions"] = {
            k: (v.get("score") if isinstance(v, dict) else v) for k, v in dims.items()
        }
        result["priority_fixes"] = [
            f.get("issue") for f in (res.get("priority_fixes") or [])
        ][:5]
    except Exception as e:  # noqa: BLE001
        # Missing textstat etc. — non-fatal; score stays null.
        prev = result["error"]
        msg = f"scorer: {type(e).__name__}: {e}"
        result["error"] = f"{prev}; {msg}" if prev else msg

    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
