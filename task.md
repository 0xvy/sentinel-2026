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

### Pass 2: Impeccable Audit & Polish ✅
- [x] Contrast verification — deep slate (#070b14), crisp borders, WCAG-compliant text
- [x] Spacing rhythm audit — strict 4px/8px scale across all components
- [x] Typography — monospace plate numbers, micro-copy with `font-mono text-xs tracking-wider`
- [x] Active/focus states — `focus:ring-2 ring-cyan-500/50`, `:active scale-[0.97]` on buttons
- [x] HSRP PlateNumber — blue IND stripe, hologram shimmer, laser-etched segmentation
- [x] AlertFeed — sticky header, smooth scroll, 3px threat borders, selection highlight
- [x] GISMap — department SVG icons, status pulse dots, CRITICAL glow halos, animated polyline
- [x] TrajectoryPanel — numbered milestones, compass arrows, department pills, confidence bars, SHA-256 display
- [x] PCRDispatchCard — critical glow animation, nearest PS, intercept ETA, vehicle dossier
- [x] VideoWall — 16:9 aspect, LIVE badge, tactical crosshairs, camera overlay
- [x] CameraFilter — colored department dots, count badges, Select All/Clear All
- [x] `npm run build` — ✅ 0 errors (455KB JS + 85KB CSS)

### Pass 3: Motion & Micro-Interactions (Partial — from Pass 2)
- [x] Pulsing radar marker for active cameras (green pulse dot)
- [x] Animated polyline drawing for vehicle breadcrumb trail (`polyline-dash` keyframes)
- [x] `:active` press-down scale on buttons (`active:scale-[0.97]`)
- [x] Critical alert glow animation (`animate-critical-glow`)
- [ ] Spring physics slide-in animation for alert cards

---

## Sprint 4: Documentation & Deliverables (`sentinel_systems_architect`) ✅ DOCS COMPLETE

### High-Level Design (HLD) Document ✅
- [x] Executive summary: 80,000 cameras, 26 departments, 7 VMS vendors, hybrid architecture
- [x] 4-layer system architecture (Edge → District → State → Command Center) with Mermaid diagrams
- [x] 80,000-camera bandwidth proof: 320 Gbps raw → <1.1 Gbps metadata (99.66% reduction)
- [x] Storage architecture: Hot (NVMe 1.6TB), Warm (Ceph ~700TB), Cold (tape 21TB/yr)
- [x] Compute sizing matrix: Jetson Orin (<35ms), L4 (<20ms), T4 (<15ms), EPYC (<50ms)
- [x] 5-database correlation engine (<50ms across VAHAN+SARTHI+eGujCop+AFIS+NAFIS)
- [x] VMS federation adapter architecture (Milestone XML, Genetec JSON, ONVIF)
- [x] PTS-only Kalman tracking (6D state, variable dt, 12h loop cut)
- [x] NFSU forensic compliance (SHA-256, PTS timestamps, BSA 2023 Section 63)
- [x] Security (TLS 1.3, RBAC, AST secret scanning) + HA/DR (RTO <5min, RPO <30s)
- [x] Deployment architecture (Docker, K8s, Nginx)
- [x] File: `docs/hld/SENTINEL_2026_HLD.md` (43.6KB, 14 sections)

### Solution Presentation (15-Slide Pitch Deck) ✅
- [x] ACT I (Slides 1-3): Gujarat problem, 80K cameras, cost of inaction
- [x] ACT II (Slides 4-6): Architecture, 5-DB correlation, VMS federation
- [x] ACT III (Slides 7-9): Live demo scenario (GJ01ER8842 trajectory, PCR dispatch)
- [x] ACT IV (Slides 10-12): Bandwidth economics, DA-IICT technical depth, NFSU forensics
- [x] ACT V (Slides 13-15): Deployment roadmap, Gujarat impact (288× speedup), closing
- [x] File: `docs/presentation/PITCH_DECK_OUTLINE.md` (20.2KB, 15 slides)

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
