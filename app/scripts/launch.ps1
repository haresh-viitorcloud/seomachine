# -------------------------------------------------------------
#  CT Automation - desktop launcher
#  Health-checks the environment, starts the server if it isn't
#  already running, waits until it actually responds, then opens
#  the dashboard in the default browser.
#
#  Double-click the desktop shortcut that points here, or run:
#      powershell -ExecutionPolicy Bypass -File scripts\launch.ps1
# -------------------------------------------------------------

$ErrorActionPreference = 'Stop'

# scripts\ lives directly under the project root
$proj = Split-Path -Parent $PSScriptRoot
Set-Location $proj

function Mark($tag, $msg, $color) { Write-Host ("  [{0}] {1}" -f $tag.PadRight(4), $msg) -ForegroundColor $color }

Write-Host ""
Write-Host "  CT Automation" -ForegroundColor Cyan
Write-Host "  -----------------------------------" -ForegroundColor DarkCyan
Write-Host "  Checking everything is ready..." -ForegroundColor Gray
Write-Host ""

$blocking = 0

# 1. Node.js (required)
try { $nodeV = (& node --version).Trim() } catch { $nodeV = $null }
if ($nodeV) { Mark 'OK' "Node.js $nodeV" Green }
else { Mark 'FAIL' "Node.js not found. Install from https://nodejs.org and re-run." Red; $blocking++ }

# 2. .env (required - auto-create from example if missing)
if (Test-Path ".env") {
  Mark 'OK' ".env present" Green
} elseif (Test-Path ".env.example") {
  Copy-Item ".env.example" ".env"
  Mark 'WARN' ".env was missing - created from .env.example. Edit credentials before posting." Yellow
} else {
  Mark 'FAIL' ".env missing and no .env.example to copy from." Red; $blocking++
}

# Resolve the port from .env (default 4000)
$port = 4000
if (Test-Path ".env") {
  $line = Get-Content ".env" | Where-Object { $_ -match '^APP_PORT=' } | Select-Object -First 1
  if ($line) {
    $val = ($line -replace '^APP_PORT=', '').Trim()
    if ($val -match '^\d+$') { $port = [int]$val }
  }
}

# 3. Dependencies (auto-install on first run)
if (Test-Path "node_modules") {
  Mark 'OK' "Dependencies installed" Green
} else {
  Mark 'WARN' "node_modules missing - running 'npm install' (one-time, may take a few minutes)..." Yellow
  & npm install
  if (Test-Path "node_modules") { Mark 'OK' "Dependencies installed" Green }
  else { Mark 'FAIL' "npm install failed - see output above." Red; $blocking++ }
}

# 4. Playwright Chromium (warning only - needed for WordPress 'browser' posting mode)
$chromeOk = & node -e "try{const{chromium}=require('playwright');const fs=require('fs');process.stdout.write(fs.existsSync(chromium.executablePath())?'1':'0')}catch{process.stdout.write('0')}" 2>$null
if ($chromeOk -eq '1') { Mark 'OK' "Playwright Chromium ready" Green }
else { Mark 'WARN' "Chromium not installed (only needed for WP browser posting): npx playwright install chromium" Yellow }

# 5. Claude CLI (warning only - needed for content generation unless ANTHROPIC_API_KEY is set)
$claude = Get-Command claude -ErrorAction SilentlyContinue
if ($claude) { Mark 'OK' "Claude CLI on PATH" Green }
else { Mark 'WARN' "Claude CLI not found (needed for generation unless ANTHROPIC_API_KEY is set in .env)" Yellow }

# Stop here if anything blocking failed
if ($blocking -gt 0) {
  Write-Host ""
  Mark 'STOP' "$blocking blocking problem(s) above. Fix them, then run again." Red
  Write-Host ""
  Read-Host "Press Enter to close"
  exit 1
}

Write-Host ""

# 6. Start the server only if it isn't already listening
$listening = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if ($listening) {
  Mark 'OK' "Server already running on port $port" Green
} else {
  Mark '..' "Starting server on port $port..." Cyan
  # Launch in its own titled window so it keeps running after this launcher exits.
  Start-Process -FilePath "cmd.exe" `
    -ArgumentList '/k', "title CT Automation Server & node src/server.js" `
    -WorkingDirectory $proj | Out-Null

  $ready = $false
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 750
    try {
      $r = Invoke-WebRequest "http://localhost:$port/" -UseBasicParsing -TimeoutSec 2
      if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch { }
  }
  if ($ready) { Mark 'OK' "Server is up" Green }
  else { Mark 'WARN' "Server did not respond in time - opening the browser anyway." Yellow }
}

# 7. Open the dashboard
$url = "http://localhost:$port/dashboard"
Mark '..' "Opening $url" Cyan
Start-Process $url

Start-Sleep -Milliseconds 1500
