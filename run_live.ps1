# SENTINEL 2026 - 1-Click Live Runner (PowerShell)
#
# Usage:  .\run_live.ps1
#
# Starts:
#   1. FastAPI backend on http://127.0.0.1:8000
#   2. Vite frontend on  http://localhost:5173
#   3. Opens browser automatically
#
# Press Ctrl+C to stop both servers.

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  SENTINEL 2026 - Gujarat Police Intelligence Platform" -ForegroundColor Cyan
Write-Host "  1-Click Live Runner" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# --- Step 1: Check prerequisites ---
Write-Host "  [1/4] Checking prerequisites..." -ForegroundColor Yellow

$pyVer = & python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Python not found. Install Python 3.10+ first." -ForegroundColor Red
    exit 1
}
Write-Host "         Python: $pyVer" -ForegroundColor DarkGray

$nodeVer = & node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ERROR: Node.js not found. Install Node 18+ first." -ForegroundColor Red
    exit 1
}
Write-Host "         Node:   $nodeVer" -ForegroundColor DarkGray

# --- Step 2: Install backend dependencies ---
Write-Host "  [2/4] Installing backend dependencies..." -ForegroundColor Yellow
Push-Location "$ROOT\backend"
& pip install -q fastapi uvicorn aiosqlite python-multipart websockets pydantic pydantic-settings 2>&1 | Out-Null
Pop-Location
Write-Host "         Done" -ForegroundColor DarkGray

# --- Step 3: Start backend server ---
Write-Host "  [3/4] Starting FastAPI backend on http://127.0.0.1:8000..." -ForegroundColor Yellow

$backendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    & python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --log-level info 2>&1
} -ArgumentList "$ROOT\backend"

Write-Host "         Backend Job ID: $($backendJob.Id)" -ForegroundColor DarkGray

# Wait for backend to be ready
$maxWait = 15
$waited = 0
$backendReady = $false
while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 1
    $waited++
    try {
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($resp.status -eq "healthy") {
            Write-Host "         Backend healthy!" -ForegroundColor Green
            $backendReady = $true
            break
        }
    } catch {
        # Still starting...
    }
}
if (-not $backendReady) {
    Write-Host "  WARNING: Backend may not have started in time. Continuing anyway..." -ForegroundColor Red
    Write-Host "  Check backend logs with: Receive-Job -Id $($backendJob.Id)" -ForegroundColor DarkGray
}

# --- Step 4: Start frontend dev server ---
Write-Host "  [4/4] Starting Vite frontend on http://localhost:5173..." -ForegroundColor Yellow

$frontendJob = Start-Job -ScriptBlock {
    param($dir)
    Set-Location $dir
    if (-not (Test-Path "node_modules")) {
        & npm install 2>&1
    }
    & npm run dev 2>&1
} -ArgumentList "$ROOT\frontend"

Write-Host "         Frontend Job ID: $($frontendJob.Id)" -ForegroundColor DarkGray

# Wait for frontend to be ready
Start-Sleep -Seconds 4

# --- Open browser ---
Write-Host ""
Write-Host "  Opening browser..." -ForegroundColor Yellow
Start-Process "http://localhost:5173"

# --- Ready! ---
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  SENTINEL 2026 IS LIVE!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:   http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  API Docs:  http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "  To simulate live CCTV events (in a new terminal):" -ForegroundColor Cyan
Write-Host "    python scripts\simulate_cctv_stream.py" -ForegroundColor White
Write-Host ""
Write-Host "  Press Ctrl+C to shut down both servers." -ForegroundColor Yellow
Write-Host ""

# --- Keep alive and handle Ctrl+C ---
try {
    while ($true) {
        $bState = (Get-Job -Id $backendJob.Id -ErrorAction SilentlyContinue).State
        $fState = (Get-Job -Id $frontendJob.Id -ErrorAction SilentlyContinue).State

        if ($bState -eq "Failed") {
            Write-Host "  Backend crashed! Logs:" -ForegroundColor Red
            Receive-Job -Id $backendJob.Id -ErrorAction SilentlyContinue
        }
        if ($fState -eq "Failed") {
            Write-Host "  Frontend crashed! Logs:" -ForegroundColor Red
            Receive-Job -Id $frontendJob.Id -ErrorAction SilentlyContinue
        }

        Start-Sleep -Seconds 2
    }
} finally {
    Write-Host ""
    Write-Host "  Shutting down..." -ForegroundColor Yellow

    Stop-Job -Id $backendJob.Id -ErrorAction SilentlyContinue
    Stop-Job -Id $frontendJob.Id -ErrorAction SilentlyContinue
    Remove-Job -Id $backendJob.Id -Force -ErrorAction SilentlyContinue
    Remove-Job -Id $frontendJob.Id -Force -ErrorAction SilentlyContinue

    Write-Host "  Both servers stopped. Goodbye!" -ForegroundColor Green
    Write-Host ""
}
