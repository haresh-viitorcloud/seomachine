@echo off
REM ============================================================
REM  CT Automation - SEO Machine  |  Windows quick-start
REM  Double-click (or use the desktop shortcut) to launch.
REM ============================================================
title CT Automation - SEO Machine
cd /d "%~dp0"

REM --- read APP_PORT from .env (default 4000) ---
set "APP_PORT=4000"
if exist ".env" (
  for /f "usebackq tokens=2 delims==" %%A in (`findstr /b /c:"APP_PORT=" ".env"`) do set "APP_PORT=%%A"
)

REM --- first-run: install deps if missing ---
if not exist "node_modules" (
  echo Installing dependencies ^(first run^)...
  call npm install
)

echo.
echo   CT Automation is starting on http://localhost:%APP_PORT%
echo   This window must stay open while the app is running.
echo   Close it (or press Ctrl+C) to stop the app.
echo.

REM --- open the browser a few seconds after the server starts ---
start "" /b cmd /c "timeout /t 4 /nobreak >nul & start "" http://localhost:%APP_PORT%"

REM --- run the server (foreground; keeps this window alive) ---
node src/server.js

echo.
echo   Server stopped.
pause
