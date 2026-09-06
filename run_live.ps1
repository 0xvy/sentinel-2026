# SENTINEL 2026 - 1-Click Live Runner (PowerShell)
#
# Usage:  .\run_live.ps1
#
# Starts:
#   1. FastAPI backend on http://127.0.0.1:8000
#   2. Vite frontend on  http://127.0.0.1:5173
#   3. Actively polls both endpoints until ready before opening browser
#
# Press Ctrl+C to stop both servers.

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  SENTINEL 2026 - Gujarat Police Intelligence Platform" -ForegroundColor Cyan
Write-Host "  1-Click Live Runner" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Helper to kill any stale process holding a given port
function Stop-PortProcess([int]$port) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conns) {
            $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($p in $pids) {
                if ($p -gt 0) {
                    Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                }
            }
        }
    } catch {}
}

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

# --- Step 2: Ensure dependencies & clean ports ---
Write-Host "  [2/4] Verifying dependencies and cleaning ports..." -ForegroundColor Yellow
Push-Location "$ROOT\backend"
& pip install -q --disable-pip-version-check --no-warn-script-location fastapi uvicorn aiosqlite python-multipart websockets pydantic pydantic-settings 2>&1 | Out-Null
Pop-Location

Stop-PortProcess 8000
Stop-PortProcess 5173
Start-Sleep -Milliseconds 600
Write-Host "         Ports 8000 and 5173 clear" -ForegroundColor DarkGray

# --- Step 3: Start backend server ---
Write-Host "  [3/4] Starting FastAPI backend on http://127.0.0.1:8000..." -ForegroundColor Yellow

$backendProc = Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--log-level", "info" -WorkingDirectory "$ROOT\backend" -PassThru -WindowStyle Hidden

Write-Host "         Backend PID: $($backendProc.Id)" -ForegroundColor DarkGray

# Wait for backend health check
$maxWait = 25
$waited = 0
$backendReady = $false
while ($waited -lt $maxWait) {
    Start-Sleep -Seconds 1
    $waited++
    try {
        $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($resp.status -eq "healthy") {
            Write-Host "         Backend healthy! (${waited}s)" -ForegroundColor Green
            $backendReady = $true
            break
        }
    } catch {}
}
if (-not $backendReady) {
    Write-Host "  WARNING: Backend did not report healthy in ${maxWait}s." -ForegroundColor Red
}

# --- Step 4: Start frontend server ---
Write-Host "  [4/4] Starting Vite frontend on http://127.0.0.1:5173..." -ForegroundColor Yellow

if (-not (Test-Path "$ROOT\frontend\node_modules")) {
    Write-Host "         Installing frontend npm modules..." -ForegroundColor Yellow
    Push-Location "$ROOT\frontend"
    & npm install --no-audit --no-fund 2>&1 | Out-Null
    Pop-Location
}

$frontendProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "npm run dev" -WorkingDirectory "$ROOT\frontend" -PassThru -WindowStyle Hidden

Write-Host "         Frontend PID: $($frontendProc.Id)" -ForegroundColor DarkGray

# Active polling for Frontend
$maxWaitF = 25
$waitedF = 0
$frontendReady = $false
while ($waitedF -lt $maxWaitF) {
    Start-Sleep -Seconds 1
    $waitedF++
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:5173" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($resp.StatusCode -eq 200) {
            Write-Host "         Frontend ready! (${waitedF}s)" -ForegroundColor Green
            $frontendReady = $true
            break
        }
    } catch {}
}
if (-not $frontendReady) {
    Write-Host "  WARNING: Frontend did not respond in ${maxWaitF}s." -ForegroundColor Red
}

# --- Open browser only after both are verified ---
Write-Host ""
Write-Host "  Opening browser to http://127.0.0.1:5173..." -ForegroundColor Yellow
Start-Process "http://127.0.0.1:5173"

# --- Ready banner ---
Write-Host ""
Write-Host "================================================================" -ForegroundColor Green
Write-Host "  SENTINEL 2026 IS LIVE AND OPERATIONAL!" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:  http://127.0.0.1:5173" -ForegroundColor White
Write-Host "  Backend:   http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  API Docs:  http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "  To simulate live CCTV events (in a separate terminal):" -ForegroundColor Cyan
Write-Host "    python scripts\simulate_cctv_stream.py" -ForegroundColor White
Write-Host ""
Write-Host "  Press Ctrl+C to shut down all servers." -ForegroundColor Yellow
Write-Host ""

# --- Keep alive and monitor ---
try {
    while ($true) {
        if ($backendProc.HasExited) {
            Write-Host "  Backend process exited unexpectedly (code: $($backendProc.ExitCode))" -ForegroundColor Red
            break
        }
        if ($frontendProc.HasExited) {
            Write-Host "  Frontend process exited unexpectedly (code: $($frontendProc.ExitCode))" -ForegroundColor Red
            break
        }
        Start-Sleep -Seconds 2
    }
} finally {
    Write-Host ""
    Write-Host "  Shutting down Sentinel services..." -ForegroundColor Yellow

    if ($backendProc -and -not $backendProc.HasExited) {
        Stop-Process -Id $backendProc.Id -Force -ErrorAction SilentlyContinue
    }
    if ($frontendProc -and -not $frontendProc.HasExited) {
        Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue
    }

    Stop-PortProcess 8000
    Stop-PortProcess 5173

    Write-Host "  All services stopped cleanly. Goodbye!" -ForegroundColor Green
    Write-Host ""
}
