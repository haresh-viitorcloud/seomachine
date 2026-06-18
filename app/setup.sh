#!/usr/bin/env bash
# ============================================================
# CT Automation — Project Setup Script
# Run once on any new system to get the app ready.
# Usage:  bash setup.sh
# ============================================================

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
header()  { echo -e "\n${BOLD}${CYAN}── $1 ──${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║   CT Automation — Setup                  ║${NC}"
echo -e "${BOLD}${CYAN}║   Content Auto-Draft Tool                 ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# ─────────────────────────────────────────────────────────────
# 1. Check Node.js
# ─────────────────────────────────────────────────────────────
header "Checking Node.js"

if command -v node &>/dev/null; then
  NODE_VERSION=$(node --version | sed 's/v//')
  MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
  if [ "$MAJOR" -ge 18 ]; then
    success "Node.js $NODE_VERSION found"
  else
    warn "Node.js $NODE_VERSION is too old (need v18+). Installing via nvm..."
    install_node
  fi
else
  warn "Node.js not found. Installing via nvm..."
  install_node
fi

install_node() {
  if ! command -v nvm &>/dev/null; then
    info "Installing nvm..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    # shellcheck disable=SC1090
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  fi
  nvm install 20
  nvm use 20
  success "Node.js $(node --version) installed via nvm"
}

# ─────────────────────────────────────────────────────────────
# 2. Create .env from template
# ─────────────────────────────────────────────────────────────
header "Environment Configuration"

if [ ! -f ".env" ]; then
  if [ -f ".env.example" ]; then
    cp .env.example .env
    info "Created .env from .env.example"
  else
    error ".env.example not found. Cannot create .env"
  fi
else
  success ".env already exists — skipping copy"
fi

# Generate a random APP_SECRET if it's still the default
if grep -q "ct-automation-secret-key-change-in-production" .env; then
  SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|ct-automation-secret-key-change-in-production-64chars|$SECRET|" .env
  else
    sed -i "s|ct-automation-secret-key-change-in-production-64chars|$SECRET|" .env
  fi
  success "Generated random APP_SECRET"
fi

# ─────────────────────────────────────────────────────────────
# 3. Configure admin credentials from .env
# ─────────────────────────────────────────────────────────────
header "Admin Credentials"

# Read current values from .env
CURRENT_USER=$(grep "^ADMIN_USERNAME=" .env | cut -d= -f2)
CURRENT_PASS=$(grep "^ADMIN_PASSWORD=" .env | cut -d= -f2)

echo -e "  Current username: ${BOLD}${CURRENT_USER:-admin}${NC}"
echo -e "  Current password: ${BOLD}${CURRENT_PASS:-changeme123}${NC}"
echo ""
echo "  Edit .env to change credentials (ADMIN_USERNAME / ADMIN_PASSWORD)."
echo "  The server always syncs from .env on startup — just restart after changes."

if [ "${CURRENT_PASS}" = "changeme123" ] || [ "${CURRENT_PASS}" = "admin123" ]; then
  warn "Default password detected! Change ADMIN_PASSWORD in .env before exposing to network."
fi

# ─────────────────────────────────────────────────────────────
# 4. Install npm dependencies
# ─────────────────────────────────────────────────────────────
header "Installing Dependencies"

if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ] && [ ! -f "node_modules/.modules.yaml" ]; then
  info "Running npm install..."
  npm install
  success "Dependencies installed"
else
  info "node_modules exists. Running npm install to ensure up-to-date..."
  npm install
  success "Dependencies up to date"
fi

# ─────────────────────────────────────────────────────────────
# 5. Install Playwright Chromium (for WordPress browser automation)
# ─────────────────────────────────────────────────────────────
header "Installing Playwright Chromium"

if npx playwright --version &>/dev/null 2>&1; then
  info "Installing/updating Chromium browser..."
  npx playwright install chromium
  success "Playwright Chromium ready"
else
  warn "Playwright install skipped — will retry on first use"
fi

# ─────────────────────────────────────────────────────────────
# 6. Check Claude CLI
# ─────────────────────────────────────────────────────────────
header "Claude CLI"

if command -v claude &>/dev/null; then
  CLI_VER=$(claude --version 2>/dev/null | head -1)
  success "Claude CLI found: $CLI_VER"
  echo ""
  echo -e "  ${BOLD}Checking authentication...${NC}"
  # Quick check — run minimal prompt
  if claude -p "Hi" --output-format json --no-session-persistence &>/dev/null 2>&1; then
    success "Claude CLI is authenticated — your account will be used for content generation"
  else
    warn "Claude CLI not authenticated yet."
    echo ""
    echo -e "  ${YELLOW}Run this to log in:${NC}  ${BOLD}claude${NC}"
    echo "  It will open a browser for OAuth login with your Claude account."
    echo "  After login, come back and run this setup again (or just start the server)."
  fi
else
  warn "Claude CLI not found."
  echo ""
  echo "  Option 1 (recommended): Install Claude CLI for zero-config AI:"
  echo "    npm install -g @anthropic-ai/claude-code"
  echo "    claude   ← runs OAuth login in browser"
  echo ""
  echo "  Option 2: Set ANTHROPIC_API_KEY in .env for API key mode."
fi

# ─────────────────────────────────────────────────────────────
# 7. Check port
# ─────────────────────────────────────────────────────────────
header "Port Check"

APP_PORT=$(grep "^APP_PORT=" .env | cut -d= -f2)
APP_PORT=${APP_PORT:-4000}

if lsof -ti:"$APP_PORT" &>/dev/null; then
  warn "Port $APP_PORT is already in use."
  echo "  Either stop the existing process or change APP_PORT in .env"
else
  success "Port $APP_PORT is available"
fi

# ─────────────────────────────────────────────────────────────
# 8. Optional: PM2 for persistent background process
# ─────────────────────────────────────────────────────────────
header "Process Manager (PM2)"

if command -v pm2 &>/dev/null; then
  success "PM2 is installed"
  echo "  Run:  pm2 start src/server.js --name ct-automation"
  echo "        pm2 save && pm2 startup"
else
  info "PM2 not installed (optional, for running in background)"
  echo "  Install: npm install -g pm2"
fi

# ─────────────────────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║   Setup Complete!                        ║${NC}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Start the server:${NC}"
echo -e "    ${CYAN}npm start${NC}                    # foreground"
echo -e "    ${CYAN}node --watch src/server.js${NC}   # dev mode (auto-reload)"
echo -e "    ${CYAN}pm2 start src/server.js --name ct-automation${NC}  # background (PM2)"
echo ""
echo -e "  ${BOLD}Open in browser:${NC}  http://localhost:${APP_PORT}"
echo ""
echo -e "  ${BOLD}Login credentials${NC} (from .env):"
echo -e "    Username: ${CYAN}${CURRENT_USER:-admin}${NC}"
echo -e "    Password: ${CYAN}${CURRENT_PASS:-changeme123}${NC}"
echo ""
echo -e "  ${BOLD}To change credentials:${NC} edit ADMIN_USERNAME / ADMIN_PASSWORD in .env, restart."
echo ""
