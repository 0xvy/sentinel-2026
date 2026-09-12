# The Problem With What We Have Now

Our current 118 unit tests verify logic in isolation — they mock databases, mock RTSP streams, mock OCR. They tell us the code is correct, but they don't tell us the system actually works when you plug everything together.

What we need is: one command, runs everything, tells you "your system is demo-ready" or "these 3 things are broken."

---

## The Architecture: 3-Layer Test Pyramid

### Layer 1: Smoke Tests (30 seconds)
*"Can the system even start?"*
- Backend server starts without crash
- Frontend serves HTML
- SQLite database seeds 80 cameras
- RTSP connectivity: TCP handshake to 103.250.160.189:8554 succeeds
- All 4 pre-warmed streams connect within 20 seconds

### Layer 2: API Contract Tests (60 seconds)
*"Do all endpoints return correct data?"*
- `GET /api/cameras` → returns exactly 80 cameras, all matching schema
- `GET /api/ingest` → returns online streams with valid URLs
- `GET /api/suspect/GJ01ER8842` → returns trajectory with sightings
- `GET /api/export/csv?plate=GJ01ER8842` → CSV matches 8-column contract schema
- `GET /api/streams/cam04/feed` → returns MJPEG content-type, first frame arrives within 20s
- WebSocket `/ws/alerts` → connects, stays alive for 5 seconds
- Every response validated against `contracts/*.json` schemas

### Layer 3: Browser E2E Tests (2-3 minutes)
*"Does it look right to a human?"*

This is where Playwright comes in — it opens a real Chromium browser, clicks through the app, and takes screenshots:
- **Video Wall Test**: Open Video Wall → verify at least 1 `<img>` tag has loaded pixels (not error opacity 0.6) → screenshot
- **GIS Map Test**: Open map → verify Esri tiles loaded (check network requests, no CartoDB watermark) → verify Gujarat is centered → screenshot
- **Vehicle Search Test**: Type `GJ01ER8842` → verify trajectory polyline appears on map → verify sighting cards render → screenshot
- **Alert Panel Test**: Verify WebSocket connection indicator is green → screenshot
- **Navigation Test**: Click through Dashboard → Video Wall → GIS Map → all routes load without white screen

Every test saves a timestamped screenshot as evidence. At the end you get a folder of screenshots proving every screen works.

---

## The Execution Plan

```
sentinel_2026/
├── tests/
│   ├── smoke/           ← Layer 1: connectivity & startup
│   │   ├── test_server_startup.py
│   │   ├── test_rtsp_connectivity.py
│   │   └── test_database_seed.py
│   ├── integration/     ← Layer 2: API contracts
│   │   ├── test_cameras_api.py
│   │   ├── test_streams_api.py
│   │   ├── test_suspect_api.py
│   │   ├── test_export_api.py
│   │   └── test_websocket.py
│   ├── e2e/             ← Layer 3: browser visual tests
│   │   ├── test_video_wall.py
│   │   ├── test_gis_map.py
│   │   ├── test_vehicle_search.py
│   │   └── conftest.py  (Playwright fixtures)
│   └── screenshots/     ← auto-generated evidence
└── run_full_validation.py  ← ONE COMMAND TO RULE THEM ALL
```

The master script `run_full_validation.py`:
```bash
$ python run_full_validation.py

🔧 Layer 1: Smoke Tests
  ✅ Backend starts on :8000 .............. 2.1s
  ✅ Frontend serves on :5173 ............. 1.3s  
  ✅ Database seeded 80 cameras ........... 0.4s
  ✅ RTSP TCP handshake to cam04 .......... 8.2s

📋 Layer 2: API Contract Tests  
  ✅ GET /api/cameras (80, schema valid) .. 0.3s
  ✅ GET /api/ingest (78 online) .......... 0.2s
  ✅ GET /api/suspect/GJ01ER8842 .......... 0.4s
  ✅ GET /api/export/csv (8 columns) ...... 0.3s
  ✅ GET /api/streams/cam04/feed (MJPEG) .. 14.6s
  ✅ WebSocket /ws/alerts (connected) ..... 5.1s

🖥️ Layer 3: Browser E2E Tests
  ✅ Video Wall: live feed rendering ...... 18.3s  📸 saved
  ✅ GIS Map: Esri tiles, no watermark .... 4.2s   📸 saved
  ✅ Vehicle Search: trajectory drawn ..... 3.1s   📸 saved
  ✅ Navigation: all routes load .......... 6.4s   📸 saved

═══════════════════════════════════════════
  RESULT: 14/14 PASSED  ✅ DEMO READY
  Screenshots: tests/screenshots/
  Total time: 64.9s
═══════════════════════════════════════════
```

---

## How We Build This

- **Step 1:** You share what the research chat found — their findings on testing scenarios feed directly into the test cases.
- **Step 2:** I write the surgical builder prompt with exact file paths, test implementations, and Playwright setup.
- **Step 3:** Builder implements it.
- **Step 4:** We audit (same cycle as before).
