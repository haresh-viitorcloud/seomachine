#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# CT Automation — One-command start
# Usage:  bash start.sh
#         bash start.sh --dev      (auto-reload on file changes)
#         bash start.sh --bg       (run in background with PM2)
# ─────────────────────────────────────────────────────────────

set -e
cd "$(dirname "${BASH_SOURCE[0]}")"

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; BOLD='\033[1m'; NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC}  $1"; }
info() { echo -e "${CYAN}→${NC}  $1"; }
warn() { echo -e "${YELLOW}⚠${NC}  $1"; }

echo ""
echo -e "${BOLD}${CYAN}  ⚡ CT Automation${NC}"
echo ""

# ── 1. .env ──
if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))" 2>/dev/null || echo "ct-secret-$(date +%s)")
    sed -i "s|ct-automation-secret-key-change-in-production-64chars|$SECRET|g" .env
    ok ".env created from .env.example"
  else
    warn ".env not found — create it before starting (see README)"
    exit 1
  fi
else
  ok ".env found"
fi

# ── 2. Dependencies ──
if [ ! -d "node_modules" ]; then
  info "Installing npm dependencies..."
  npm install --silent
  ok "Dependencies installed"
else
  ok "Dependencies ready"
fi

# ── 3. Playwright Chromium ──
CHROMIUM_OK=$(node -e "
try {
  const {chromium}=require('playwright');
  chromium.executablePath();
  console.log('ok');
} catch { console.log('missing'); }
" 2>/dev/null)

if [ "$CHROMIUM_OK" != "ok" ]; then
  info "Installing Playwright Chromium (needed for WordPress browser automation)..."
  npx playwright install chromium --quiet 2>/dev/null || npx playwright install chromium
  ok "Chromium installed"
else
  ok "Playwright Chromium ready"
fi

# ── 4. Port check ──
APP_PORT=$(grep "^APP_PORT=" .env 2>/dev/null | cut -d= -f2)
APP_PORT=${APP_PORT:-4000}

if lsof -ti:"$APP_PORT" &>/dev/null; then
  warn "Port $APP_PORT is in use. Stop the existing process or change APP_PORT in .env"
  exit 1
fi

# ── 5. Start ──
echo ""
echo -e "${BOLD}  Starting server on port ${APP_PORT}...${NC}"
echo ""

if [ "$1" = "--bg" ]; then
  if command -v pm2 &>/dev/null; then
    pm2 start src/server.js --name ct-automation --update-env
    pm2 save
    ok "Running in background via PM2"
    echo -e "  Stop:   ${CYAN}pm2 stop ct-automation${NC}"
    echo -e "  Logs:   ${CYAN}pm2 logs ct-automation${NC}"
  else
    warn "PM2 not installed. Install with: npm install -g pm2"
    exit 1
  fi
elif [ "$1" = "--dev" ]; then
  exec node --watch src/server.js
else
  exec node src/server.js
fi
