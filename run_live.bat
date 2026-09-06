@echo off
REM ═══════════════════════════════════════════════════════════════════
REM  SENTINEL 2026 — 1-Click Live Runner (Windows CMD)
REM ═══════════════════════════════════════════════════════════════════
REM
REM  Usage:  run_live.bat
REM
REM  Starts:
REM    Window 1: FastAPI backend on http://127.0.0.1:8000
REM    Window 2: Vite frontend on  http://localhost:5173
REM    Opens browser automatically
REM ═══════════════════════════════════════════════════════════════════

title SENTINEL 2026 — Launcher

echo.
echo ================================================================
echo   SENTINEL 2026 — Gujarat Police Intelligence Platform
echo   1-Click Live Runner
echo ================================================================
echo.

set ROOT=%~dp0

REM ─── Step 1: Install backend deps ─────────────────────────────────
echo   [1/4] Installing backend dependencies...
cd /d "%ROOT%backend"
pip install -q fastapi uvicorn aiosqlite python-multipart websockets pydantic pydantic-settings >nul 2>&1
echo          Done.

REM ─── Step 2: Start backend in new window ──────────────────────────
echo   [2/4] Starting FastAPI backend on http://127.0.0.1:8000...
start "SENTINEL Backend" cmd /k "cd /d %ROOT%backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level info"

REM Wait for backend
echo          Waiting for backend to start...
timeout /t 5 /nobreak >nul

REM ─── Step 3: Start frontend in new window ─────────────────────────
echo   [3/4] Starting Vite frontend on http://localhost:5173...
cd /d "%ROOT%frontend"
if not exist "node_modules" (
    echo          Installing npm packages...
    call npm install >nul 2>&1
)
start "SENTINEL Frontend" cmd /k "cd /d %ROOT%frontend && npm run dev"

REM Wait for frontend
timeout /t 4 /nobreak >nul

REM ─── Step 4: Open browser ─────────────────────────────────────────
echo   [4/4] Opening browser...
start http://localhost:5173

echo.
echo ================================================================
echo   SENTINEL 2026 IS LIVE!
echo ================================================================
echo.
echo   Frontend:  http://localhost:5173
echo   Backend:   http://127.0.0.1:8000
echo   API Docs:  http://127.0.0.1:8000/docs
echo.
echo   To simulate live CCTV events, open a new terminal and run:
echo     cd %ROOT%
echo     python scripts\simulate_cctv_stream.py
echo.
echo   Close the Backend and Frontend windows to stop the servers.
echo.
pause
