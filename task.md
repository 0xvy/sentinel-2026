# SENTINEL 2026 — SPRINT TASK TRACKER

> **Deadline**: 07 September 2026 (Midnight)
> **Current Date**: 04 September 2026
> **Days Remaining**: ~3 days

---

## Sprint 0: Engine Bootstrap ✅ COMPLETE
- [x] Create project directory `sentinel_2026/` with full structure
- [x] Write root `GEMINI.md` (8 Sandbox Commandments)
- [x] Write `backend/GEMINI.md` (directory boundary + DB rules)
- [x] Write `vision/GEMINI.md` (PTS-only + Kalman reset rules)
- [x] Write `frontend/GEMINI.md` (3-pass UI policy + boundary)
- [x] Write `docs/GEMINI.md` (quantitative-only, no handwaving)
- [x] Create `.agents/plugins/sentinel-engine/plugin.json`
- [x] Create `.agents/plugins/sentinel-engine/hooks.json` (3 hooks)
- [x] Create `.agents/plugins/sentinel-engine/rules/AGENTS.md`
- [x] Write `.engine/invariants.py` (AST scanner)
- [x] Write `.engine/pre_invoke_reminder.py`
- [x] Write `.engine/stop_guard.py`
- [x] Write `.engine/state.json` (initial sprint state)
- [x] Write all 5 skill SKILL.md files
- [x] Write all contract schemas in `contracts/`
- [x] Define 4 subagent types via `define_subagent`

---

## Sprint 1: Backend Core (`sentinel_backend_engineer`) ✅ COMPLETE
- [x] FastAPI scaffold with `/health`, `/api/cameras`, `/api/alerts` endpoints
- [x] SQLite database initialization script with all 6 tables:
  - [x] `vahan` — 27 mock records (3 stolen, 3 blacklisted, 2 RTO seizure, clean vehicles)
  - [x] `sarthi` — 15 mock records (active, suspended, disqualified licenses)
  - [x] `egujcop` — 20 mock records (wanted criminals, FIRs, missing persons, unidentified bodies)
  - [x] `afis` — 10 mock records (state biometric suspect records)
  - [x] `nafis` — 5 mock records (interstate fugitive cross-links)
  - [x] `sightings` — 20 pre-seeded sightings (7 for GJ01ER8842 Ahmedabad→Mehsana→Rajkot route)
- [x] Camera registry API (`GET /api/cameras`) returning Model 1 GIS data (50 cameras across 6 depts)
- [x] **⚠️ CRITICAL: Vehicle Trajectory Search API (THE CORE TEST CASE)**
  - [x] `GET /api/vehicles/{plate_number}/trajectory` — Chronological sightings with GPS + watchlist correlation
  - [x] `GET /api/search?plate=...` — Fuzzy/partial plate search with case-insensitivity
  - [x] Every alert POST persists to `sightings` table for trajectory reconstruction
- [x] **⚠️ CRITICAL: Sandbox Authentication & Token Handler**
  - [x] Environment variable `SENTINEL_SANDBOX_TOKEN` for bearer auth
  - [x] Dynamic sandbox ingest adapter (`GET /api/ingest` with stream URLs)
- [x] Watchlist correlation engine: 5-database lookup (VAHAN + eGujCop + SARTHI + AFIS + NAFIS)
- [x] WebSocket alert broadcast channel (`/ws/alerts`)
- [x] **⚠️ CRITICAL: VMS Federation Adapter — NOT an empty stub**
  - [x] `backend/adapters/base.py` — Abstract `VMSAdapter` interface + normalization utilities
  - [x] `backend/adapters/milestone.py` — Milestone XProtect XML → alert_event.json normalizer
  - [x] `backend/adapters/genetec.py` — Genetec Omnicast JSON → alert_event.json normalizer (confidence 0-100→0-1)
  - [x] `backend/adapters/onvif_nvr.py` — Generic ONVIF/NVR adapter
  - [x] `backend/adapters/mock_payloads/` — 5 realistic vendor event payloads (all using GJ01ER8842)
  - [x] 19 unit tests proving adapters correctly normalize vendor events
- [x] Append-only tamper-evident audit log (NFSU forensic requirement)
- [x] SHA-256 hash generation for alert snapshots
- [x] `backend/tests/` — 67 tests: health, cameras, trajectory, search, alerts, adapters, correlation, export, database
- [x] ✅ ALL 67 TESTS PASS | 0 invariant violations | 32 Python files + 16 JSON schemas scanned

---

## Sprint 2: Vision Engine (`sentinel_vision_engineer`) ✅ COMPLETE
- [x] RTSP stream reader with TCP-only enforcement (`OPENCV_FFMPEG_CAPTURE_OPTIONS = "rtsp_transport;tcp"`)
- [x] Exponential backoff reconnection handler (2s → 30s)
- [x] Non-fatal H.264/H.265 join decode warning handler (RPS/POC suppression)
- [x] **⚠️ CRITICAL: Intelligent Ingestion Scheduler (Prevents Laptop Freeze on 50 Streams)**
  - [x] Frame sub-sampling: Decode at 1–2 FPS per camera
  - [x] Round-robin batch inference: Group cameras into batches of 5 active streams
  - [x] Configurable `MAX_CONCURRENT_STREAMS` (default: 5) and `INFERENCE_FPS` (default: 1.0) env vars
  - [x] Frame queue with backpressure: drop oldest frames if inference falls behind
  - [x] GPU memory guard: detect available VRAM and auto-scale batch size
- [x] YOLOv8 nano/small license plate detector (Indian HSRP focus) with graceful fallback
- [x] OCR engine (EasyOCR) with GJ plate regex normalizer + character disambiguation (O↔0, I↔1, Z↔2, S↔5, B↔8)
- [x] Dual-mode pipeline:
  - [x] Full Deep Learning mode (PlateDetector + OCREngine)
  - [x] Deterministic test mode (regex extraction for E2E testing without GPU)
- [x] PTS-only Kalman tracker (6D state [x,y,w,h,vx,vy], variable dt from PTS)
- [x] 12-hour feed loop discontinuity handler (PTS delta > 5000ms → full state reset)
- [x] SHA-256 snapshot hashing at detection time (NFSU chain-of-custody)
- [x] Alert event emission matching `contracts/alert_event.json` schema
- [x] POST alert to backend `/api/alerts` endpoint (persists to sightings table)
- [x] Evaluation CSV exporter matching jury format (exact 8-column schema)
- [x] `vision/tests/test_tracker.py` — 13 tests (PTS timing, discontinuity, IoU, direction)
- [x] `vision/tests/test_csv_format.py` — 9 tests (headers, ISO 8601, booleans, schema)
- [x] `vision/tests/test_ingestion_scheduler.py` — 8 tests (batching, sub-sampling, backpressure)
- [x] `vision/tests/test_vision_pipeline.py` — 14 tests (config, stream, detector, OCR, emitter)
- [x] ✅ ALL 44 VISION TESTS PASS | 0 invariant violations

---

## Sprint 3: Frontend Command Center (`sentinel_frontend_engineer`) ✅ PASS 1 COMPLETE

### Pass 1: Creative Direction & Architecture ✅
- [x] Vite + React 19 + TypeScript + Tailwind CSS v4 scaffold
- [x] Dark-mode police tactical command center layout (deep slate `#0a0f1d`, amber/cyan indicators)
- [x] Leaflet GIS map centered on Gujarat with 50 camera markers (CartoDB Dark Matter tiles)
- [x] Departmental filter layers (Police, Health, GSRTC, Panchayat, Municipal Corp, RTO)
- [x] Camera health status indicators (🟢 Online, 🔴 Offline, 🟡 Degraded)
- [x] Live alert feed sidebar (scrolling real-time alert cards with threat-level color borders)
- [x] Threat-level color coding: 🔴 Red (CRITICAL), 🟠 Amber (HIGH), 🟢 Green (NORMAL)
- [x] Vehicle breadcrumb route reconstruction on map (animated polyline with waypoint badges)
  - [x] **⚠️ CRITICAL**: Calls `GET /api/vehicles/{plate}/trajectory` for HISTORICAL route
  - [x] Plate search bar with debounced autocomplete and monospace plate typography
  - [x] Chronological waypoint list panel with timestamps, direction, confidence, SHA-256 hashes
- [x] 1-Click PCR Van Dispatch coordination card (urgent red styling, owner details, FIR link)
- [x] Video wall grid (2×2 / 3×3 / 4×4 tactical matrix switcher)
- [x] WebSocket connection to backend `/ws/alerts` (auto-reconnect, dedup, heartbeat)
- [x] "Export Official Evaluation Report (CSV)" button with download trigger
- [x] TypeScript types matching all contracts + 3 custom hooks (useAlertWebSocket, useCameras, useTrajectory)
- [x] StatusBar with live clock, camera counts, CRITICAL badge, WS status
- [x] ThreatBadge + PlateNumber reusable components
- [x] `npm run build` — ✅ 0 errors, dist output (437KB JS + 77KB CSS)

### Pass 2: Impeccable Audit & Polish
- [ ] Contrast verification (WCAG AA minimum)
- [ ] Spacing rhythm audit (4px/8px scale)
- [ ] Typography: high-legibility monospace for plate numbers, proportional for labels
- [ ] Active/focus states on all interactive elements
- [ ] Responsive viewport testing (1920×1080 primary, 1366×768 fallback)

### Pass 3: Motion & Micro-Interactions
- [ ] Alert card slide-in animation (spring physics)
- [ ] Pulsing radar marker for active target cameras
- [ ] Animated polyline drawing for vehicle breadcrumb trail
- [ ] `:active` press-down scale on buttons
- [ ] Smooth map fly-to on alert click

---

## Sprint 4: Documentation & Deliverables (`sentinel_systems_architect`)

### High-Level Design (HLD) Document
- [ ] Executive summary: 26-department problem, hybrid architecture solution
- [ ] Complete statewide topology diagram (edge vs central)
- [ ] Ingestion strategy for 26 departments (analog encoders, IP, ONVIF, vendor SDK adapters)
- [ ] Bandwidth engineering: 80,000 cams @ 1080p 15fps H.265 = ~160 Gbps → edge analytics mitigates to <5 Gbps metadata backhaul
- [ ] Storage architecture: NVMe Hot (7-day edge ring buffer), Ceph/MinIO Warm (15–30 day S3), Cold Tape archive
- [ ] Compute sizing: NVIDIA Jetson Orin edge nodes at district HQs, Tesla T4/A10G central GPU cluster
- [ ] High Availability: N+1 redundancy, multi-AZ, failover
- [ ] Security: TLS 1.3, RBAC, CJIS compliance, BSA/Indian Evidence Act audit trails
- [ ] VMS federation adapter architecture (Milestone, Genetec, NVR connector interfaces)
- [ ] NFSU forensic compliance section (SHA-256 hashing, tamper-evident logs, PTS watermarks)
- [ ] DA-IICT AI benchmarks section (mAP@50, inference latency, robustness matrix)

### Solution Presentation (15-Slide Pitch Deck)
- [ ] Slide 1: Title & Team
- [ ] Slide 2: The 26-Department Crisis (operational problem)
- [ ] Slide 3: The Enterprise Hybrid Architecture (Model 1 + Model 3 + Model 2/4)
- [ ] Slide 4: Model 1 GIS Registry (map screenshot, departmental filters)
- [ ] Slide 5: VMS Federation Layer (adapter diagram, backward compatibility)
- [ ] Slide 6: AI Vision Pipeline (YOLO + OCR + PTS Kalman tracker)
- [ ] Slide 7: 5-Database Correlation Engine (VAHAN/SARTHI/eGujCop/AFIS/NAFIS)
- [ ] Slide 8: Real-Time Alert System (screenshot of alert card + GIS route)
- [ ] Slide 9: Forensic Chain of Custody (NFSU compliance — SHA-256, audit log)
- [ ] Slide 10: Live Demo Screenshots (own feed + sandbox feed)
- [ ] Slide 11: Evaluation Report Sample (CSV screenshot)
- [ ] Slide 12: 80,000-Camera Scalability Blueprint (bandwidth + edge + storage)
- [ ] Slide 13: Security & Compliance (TLS, RBAC, BSA/Evidence Act)
- [ ] Slide 14: Policing Impact & ROI (time saved, cross-department coordination)
- [ ] Slide 15: Team & Vision

### Demo Videos & Submission Package
- [ ] Record Demo Video 1 (2–3 min, own feed): onboarding → ANPR → VAHAN match → red alert → GIS route
- [ ] Record Demo Video 2 (sandbox RTSP): multi-stream ingestion → live analytics → evaluation vehicle detection
- [ ] Upload Demo 1 to YouTube (Unlisted)
- [ ] Upload Demo 2 to YouTube (Unlisted)
- [ ] Create Google Drive folder (Anyone with link — Viewer) with: HLD PDF, Pitch Deck, Evaluation CSV
- [ ] Push clean code to GitHub repository
- [ ] **⚠️ CRITICAL: Deployment Tunnel (Prevents Mixed-Content Chrome Block)**
  - [ ] Install Cloudflare Tunnel (`cloudflared`) or `ngrok` to expose local FastAPI backend to public HTTPS
  - [ ] Generate secure public URL (e.g., `https://sentinel-api.yourdomain.com` → `localhost:8000`)
  - [ ] Update frontend `.env` with public backend URL (NOT `http://localhost:8000`)
  - [ ] Verify: public frontend (Vercel/Netlify HTTPS) successfully fetches from tunneled backend (HTTPS) — NO mixed content errors
- [ ] Deploy live demo URL with jury credentials
- [ ] Submit all links on `sentinel.gujarat.gov.in` portal

---

## Integration & Final Verification
- [ ] Run `.engine/invariants.py` — ALL PASS
- [ ] Run `backend/tests/` — ALL PASS
- [ ] Run `vision/tests/` — ALL PASS
- [ ] Run `frontend npm run build` — SUCCESS
- [ ] Run `.engine/test_integration.py` — END-TO-END PASS
- [ ] Full manual walkthrough: camera map → target plate → route trace → alert → CSV export
