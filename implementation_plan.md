# SENTINEL 2026 — UNIFIED MISSION & ENGINE PLAN
## AI Engineering Harness × Full Domain Intelligence × Submission Strategy

> [!IMPORTANT]
> This is the **single authoritative document** for the entire Sentinel 2026 effort. It contains TWO fused layers:
> 1. **The Engine** — How Antigravity 2.0's native harness governs the build process (rules, hooks, skills, plugins, subagents, planning mode).
> 2. **The Mission** — The complete Gujarat Police domain context, database schemas, jury criteria, submission deliverables, and competitive strategy.

---

# PART A: THE MISSION INTELLIGENCE

## A1. The 26-Department Operational Reality

Gujarat has **80,000+ CCTV cameras** across **34 districts spanning 1,000+ km**, operated as isolated silos across **26 Government Departments**:

| # | Department | Camera Locations | Current VMS / Infrastructure |
| :--- | :--- | :--- | :--- |
| 1 | **Home Department / Police** | Highway corridors, city junctions, border checkpoints | Mix of Milestone, Genetec, proprietary NVR |
| 2 | **Transport (RTO)** | RTO offices, automated test tracks, interstate checkposts, weighbridges | Vendor-locked DVR systems |
| 3 | **GSRTC** | 125+ central bus stations, highway depots, transit bays | Standalone NVR islands |
| 4 | **Food & Civil Supplies** | PDS fair-price shops, grain godowns, buffer warehouses | Minimal, analog-heavy |
| 5 | **Health & Family Welfare** | Civil hospitals, govt. medical colleges, rural health centers | IP cameras, fragmented storage |
| 6 | **Urban Development / Municipal Corps** | AMC, SMC, VMC, RMC smart city command centers | Modern IP infrastructure |
| 7 | **Panchayat & Rural Housing** | Village junctions, rural connectivity corridors | Mostly analog, legacy DVR |
| 8 | **Private Surveillance (Permitted)** | Residential societies, malls, commercial complexes, GIDCs | Heterogeneous vendor mix |

### The Tactical Crisis We Solve
If a suspect vehicle flees from Ahmedabad → RTO toll road → GSRTC bus corridor → Surat, police **lose track at every departmental boundary**. Constables physically visit external offices with pen drives, wait 24–48 hours for manual footage exports. The trail goes cold.

**Our platform eliminates this by federating all 26 department feeds into a single correlated intelligence stream WITHOUT requiring departments to abandon existing hardware or VMS contracts.**

---

## A2. The 4 Reference Models & Our Hybrid Architecture

### Model 1: Centralized CCTV Registry & GIS Foundation — COMPULSORY
- **Scope**: Asset metadata, geolocation, health monitoring. NO live video ingestion.
- **Required**: Bulk CSV import, REST API onboarding, interactive Leaflet/PostGIS map with departmental filters, live camera health (Online/Offline/Degraded), statewide infrastructure gap analysis, RBAC audit trails.
- **Status**: COMPULSORY for all teams.

### Model 2: Unified Viewing & Selective Metadata Analytics
- **Scope**: Direct RTSP/ONVIF/vendor SDK connections into a unified stream gateway.
- **Function**: Centralized viewing grid with selective ANPR/event tagging without centralized storage of all 80,000 raw feeds.

### Model 3: VMS Federation & Middleware Integration Layer
- **Scope**: Multi-vendor interoperability respecting existing departmental infrastructure.
- **Mechanism**: Extensible adapter/connector architecture over existing VMS platforms (Milestone, Genetec, proprietary NVRs). Kafka/RabbitMQ event bus for cross-platform event correlation.
- **Key**: Departments retain local operational control. State command center receives normalized event streams.

### Model 4: Central Statewide VMS & Heavy AI Platform
- **Scope**: Fully consolidated statewide platform for future rollout.
- **Mechanism**: Centralized ingestion gateway, tiered distributed storage (hot/warm/cold), GPU inference clusters for statewide route reconstruction and face recognition.

### 🏆 Our Winning Approach: Enterprise Hybrid Architecture

$$\text{Hybrid} = \text{Model 1 (GIS Registry)} + \text{Model 3 (VMS Federation Adapters)} + \text{Model 2/4 (Edge/Central AI Engine)}$$

**Justification**:
- **Day-one backward compatibility** for legacy departments via Model 3 adapters (no rip-and-replace).
- **Statewide visibility** via Model 1 GIS (mandatory foundation).
- **Real-time edge AI analytics** via Model 2/4 hybrid gateway without breaking the state budget.
- Federation adapters ensure AMC's existing Genetec, RTO's vendor-locked DVR, and GSRTC's standalone NVR all feed normalized metadata into the central intelligence engine.

---

## A3. Complete Database Correlation Engine — All 5 Databases

```
                    AI ANPR / RE-ID DETECTION EVENT
                                    │
                                    ▼
               ┌─────────────────────────────────────────┐
               │      INTELLIGENCE CORRELATION ENGINE     │
               └──────────────────┬──────────────────────┘
                                  │
     ┌──────────┬─────────────────┼─────────────────┬──────────┐
     ▼          ▼                 ▼                 ▼          ▼
 [ VAHAN ]  [ SARTHI ]      [ eGujCop ]       [ AFIS ]   [ NAFIS ]
 Stolen     Driver           Active CCTNS      State      National
 Vehicles   Licences         FIRs/Warrants     Biometric  10-digit
 Blacklist  Linked           Missing Persons   Suspects   Inter-state
 Owner DB   Suspects         Unidentified      Latent     Federal
                             Bodies            Matches    Linking
```

### Schema Definitions (Mock Database — `backend/db/`)

#### 1. VAHAN (National Vehicle Registry)
| Column | Type | Example |
| :--- | :--- | :--- |
| `plate_number` (PK) | `TEXT` | `GJ01AB1234` |
| `vehicle_class` | `TEXT` | `Private SUV`, `Commercial Truck`, `2-Wheeler` |
| `owner_name` | `TEXT` | `Rajesh Mehta` |
| `chassis_number` | `TEXT` | `MA1BA2CD3EF456789` |
| `engine_number` | `TEXT` | `K10BN1234567` |
| `registration_date` | `DATE` | `2022-03-15` |
| `blacklist_status` | `TEXT` | `Clean`, `Blacklisted`, `RTO Seizure Notice` |
| `stolen_flag` | `BOOLEAN` | `true` |
| `linked_fir` | `TEXT` | `FIR-402/2026/CRIME-BR` |

#### 2. SARTHI (Driver Licensing Database)
| Column | Type | Example |
| :--- | :--- | :--- |
| `dl_number` (PK) | `TEXT` | `GJ-0120200012345` |
| `driver_name` | `TEXT` | `Amit Patel` |
| `linked_aadhaar_hash` | `TEXT` | `sha256(...)` |
| `license_status` | `TEXT` | `Active`, `Suspended`, `Disqualified` |
| `linked_plate` | `TEXT` | `GJ05CX9988` |
| `suspect_link_id` | `TEXT` | `SUS-2026-0041` |

#### 3. eGujCop (Gujarat Police CCTNS Platform)
| Column | Type | Example |
| :--- | :--- | :--- |
| `fir_number` (PK) | `TEXT` | `FIR-892/2026/CRIME-BR` |
| `police_station` | `TEXT` | `Navrangpura PS` |
| `district` | `TEXT` | `Ahmedabad` |
| `crime_head` | `TEXT` | `Sec 302 IPC / 103 BNS (Homicide)` |
| `accused_name` | `TEXT` | `Vikram Solanki` |
| `alias` | `TEXT` | `Vicky Bhai` |
| `wanted_status` | `TEXT` | `Absconding`, `Active Warrant` |
| `linked_plate` | `TEXT` | `GJ01ER8842` |
| `missing_person_flag` | `BOOLEAN` | `false` |
| `unidentified_body_flag` | `BOOLEAN` | `false` |
| `threat_priority` | `TEXT` | `CRITICAL`, `HIGH`, `MEDIUM` |

#### 4. AFIS (State Automated Fingerprint Identification)
| Column | Type | Example |
| :--- | :--- | :--- |
| `state_afis_id` (PK) | `TEXT` | `AFIS-GJ-2026-00412` |
| `linked_fir` | `TEXT` | `FIR-892/2026/CRIME-BR` |
| `biometric_match_confidence` | `FLOAT` | `0.97` |
| `suspect_name` | `TEXT` | `Vikram Solanki` |
| `arrest_record` | `TEXT` | `Prior armed robbery conviction 2019` |

#### 5. NAFIS (National 10-Digit Fingerprint System)
| Column | Type | Example |
| :--- | :--- | :--- |
| `national_fingerprint_number` (PK) | `TEXT` | `NAFIS-IN-2026-10045612` |
| `state_afis_id` (FK) | `TEXT` | `AFIS-GJ-2026-00412` |
| `interstate_crime_record` | `TEXT` | `Rajasthan armed robbery 2021, MP vehicle theft 2023` |
| `cross_jurisdiction_flag` | `BOOLEAN` | `true` |
| `federal_linking_status` | `TEXT` | `Confirmed inter-state fugitive` |

### Real-Time Alert Event Contract (Single Source of Truth)

```json
{
  "alert_id": "ALT-2026-0904-0012",
  "timestamp_pts_ms": 1045230,
  "camera_id": "CAM-RTO-VALSAD-04",
  "camera_dept": "Transport Department (RTO)",
  "camera_lat": 20.6128,
  "camera_lng": 72.9314,
  "detected_plate": "GJ01ER8842",
  "confidence": 0.94,
  "threat_level": "CRITICAL",
  "source_databases": ["eGujCop_CCTNS", "VAHAN"],
  "vahan_match": {
    "stolen_flag": true,
    "blacklist_status": "Blacklisted",
    "owner_name": "Vikram Solanki",
    "vehicle_class": "Private SUV"
  },
  "egujcop_match": {
    "fir_number": "FIR-892/2026/CRIME-BR",
    "crime_head": "Armed Robbery - Sec 392 IPC",
    "wanted_status": "Absconding",
    "police_station": "Navrangpura PS",
    "threat_priority": "CRITICAL"
  },
  "sarthi_match": {
    "dl_number": "GJ-0120200012345",
    "license_status": "Suspended",
    "driver_name": "Vikram Solanki"
  },
  "recommended_action": "ALERT VALSAD HIGHWAY PATROL - PCR UNIT 08",
  "snapshot_url": "/snapshots/ALT-2026-0904-0012.jpg"
}
```

---

## A4. Defense-Grade Jury Alignment

The evaluation jury has **3 distinct scrutiny bodies**. Each subagent and every deliverable must address their specific criteria:

### A. NFSU (National Forensic Sciences University) — Digital Forensics
- **Chain of Custody**: SHA-256 hash for every alert video clip and bounding-box snapshot at detection time.
- **Tamper-Evident Audit Log**: Append-only log of all queries, user logins, feed accesses — legally admissible under the Bharatiya Sakshya Adhiniyam (BSA) / Indian Evidence Act.
- **Anti-Tampering**: Exported clips carry verified PTS timestamps and cryptographic digital watermarks.

### B. DA-IICT — AI & Computer Vision Research
- **Model Benchmarks**: mAP@50 > 92% on Indian HSRP plates.
- **Inference Budget**: Sub-35ms per frame on edge (Jetson Orin), sub-15ms on central GPU (Tesla T4/A10G).
- **Robustness**: Must handle low-light night glare, heavy monsoon rain, motion blur, acute 45° overhead angles.
- **Stream Timing**: Full PTS-only Kalman tracking compliance per `/resource` guide.

### C. Senior IPS & Police Command
- **Actionable Intelligence**: Color-coded threat priorities (🔴 Red = Stolen/Wanted, 🟠 Amber = Suspended/Unverified, 🟢 Green = Normal).
- **1-Click PCR Van Dispatch**: Coordination cards with nearest patrol unit.
- **Complete Route Reconstruction**: Chronological GIS trail showing exact time, location, and direction of travel.

---

## A5. Complete Submission Deliverables (Sept 7 Cutoff)

| # | Deliverable | Format | Key Contents |
| :--- | :--- | :--- | :--- |
| 1 | **Solution Presentation** | PPT/PDF (15 slides) | Executive summary, Hybrid Architecture justification, AI pipeline, 5-DB correlation engine, scalability & security, policing impact |
| 2 | **Technical Proposal (HLD)** | PDF Document | Statewide topology (edge vs central), ingestion for 26 depts (analog+IP+ONVIF), bandwidth math (80k cams = ~160 Gbps mitigated to <5 Gbps via edge analytics), storage tiers (NVMe/Ceph/Tape), HA/N+1, TLS 1.3, RBAC, CJIS compliance |
| 3 | **Demo Video 1** | MP4 / Unlisted YouTube (2–3 min) | Real software on OWN video feeds: live onboarding, ANPR detection, VAHAN/eGujCop matching, red alert, GIS route plot. NO mockups. |
| 4 | **Demo Video 2** | MP4 / Unlisted YouTube | Platform connected to official Sandbox RTSP streams. Multi-stream ingestion + analytics running live. Detection of evaluation vehicles. |
| 5 | **Evaluation Report** | CSV/PDF | `camera_id, camera_name, department, license_plate, pts_timestamp_ms, human_time, watchlist_match_flag, associated_fir` |
| 6 | **Submission Links** | Web URLs | Unlisted YouTube links, Google Drive (Anyone-Viewer), live hosted demo URL with jury credentials, GitHub/GitLab repo |

---

## A6. Category 1 Strategy & Prize Mechanics (₹51 Lakhs)

- **Our Category**: Category 1 — Students, Academic Research Teams, DPIIT-Recognized Startups.
- **Stage 1 (Sandbox Round) Prizes**: 1st: ₹4,00,000 | 2nd: ₹2,00,000 | 3rd: ₹1,00,000 | 4 Consolation: ₹25,000 each.
- **Development Grant Rule**: Stage 1 prize money is disbursed as a development grant for Stage 2 hardware, compute, and logistics.
- **Stage 2 (Grand Finale, i-Hub Gujarat, Sept 10–11)**: Top 3 Cat 1 + Top 3 Cat 2 = Top 6 advance. Grand Winner: ₹16,00,000 | 1st Runner: ₹8,00,000 | 2nd Runner: ₹7,00,000 | 3 Finalist Consolation: ₹50,000 each | Special Jury: ₹50,000.
- **Timeline**: Sept 7 cutoff → Sept 7 evening shortlist → Sept 10–11 36-hour live hackathon.

---

# PART B: THE AI ENGINEERING ENGINE (ANTIGRAVITY HARNESS)

> [!NOTE]
> The complete 10-layer engine architecture is preserved from the previous version. Here is the summary with references to each layer. The engine operates UNDERNEATH the mission — it governs HOW code is written, not WHAT is built.

## Engine Layer Summary

| # | Layer | Antigravity Primitive | Failure Mode Killed |
| :--- | :--- | :--- | :--- |
| 1 | **Workspace Rules** | `GEMINI.md` per directory | Context rot, constraint amnesia |
| 2 | **Lifecycle Hooks** | `hooks.json` (PostToolUse, PreInvocation, Stop) | Silent regressions, premature completion |
| 3 | **Custom Skills** | `skills/<name>/SKILL.md` | Hallucinated implementations |
| 4 | **Plugin Bundle** | `.agents/plugins/sentinel-engine/` | Setup amnesia across context flushes |
| 5 | **Subagents** | `define_subagent` / `invoke_subagent` | Context pollution, file collisions |
| 6 | **Planning Mode** | `task.md` / `walkthrough.md` | Lost progress tracking |
| 7 | **@ Mentions + New Conversation** | Context flush protocol | Token rot / degrading intelligence |
| 8 | **Background Tasks + Reactive Wakeup** | `run_command` daemon + message bus | Idle polling, lost test results |
| 9 | **Python SDK** | `google-antigravity` pip package | Human bottleneck (optional autonomous mode) |
| 10 | **`/teamwork-preview`** | Slash command | Full autonomous multi-agent orchestration |

### Engine File Structure (To Be Created in `sentinel_2026/`)

```
sentinel_2026/
├── GEMINI.md                                    ← Root invariant rules (8 sandbox commandments)
├── .agents/
│   └── plugins/
│       └── sentinel-engine/
│           ├── plugin.json                      ← {"name": "sentinel-engine"}
│           ├── hooks.json                       ← PostToolUse invariant gate + PreInvocation reminder + Stop guard
│           ├── rules/
│           │   └── AGENTS.md                    ← Domain context rules (jury alignment, DB correlation requirements)
│           └── skills/
│               ├── sentinel-rtsp-ingestion/SKILL.md
│               ├── sentinel-anpr-pipeline/SKILL.md
│               ├── sentinel-pts-tracker/SKILL.md
│               ├── sentinel-gis-registry/SKILL.md
│               └── sentinel-evaluation-csv/SKILL.md
├── .engine/
│   ├── invariants.py                            ← AST scanner for rule violations
│   ├── pre_invoke_reminder.py                   ← Ephemeral sprint state injector
│   ├── stop_guard.py                            ← Blocks premature completion
│   └── state.json                               ← Sprint state machine
├── contracts/
│   ├── camera_registry.json                     ← Model 1 GIS schema
│   ├── alert_event.json                         ← Real-time alert payload contract
│   ├── trajectory_response.json                 ← GET /api/vehicles/{plate}/trajectory response schema
│   ├── sightings_schema.json                    ← Historical plate detection log schema (camera_id, plate, pts_ms, lat, lng, hash)
│   ├── ingestion_config.json                    ← Stream scheduler config (MAX_CONCURRENT_STREAMS, INFERENCE_FPS, batch size)
│   ├── vahan_schema.json
│   ├── sarthi_schema.json
│   ├── egujcop_schema.json
│   ├── afis_schema.json
│   ├── nafis_schema.json
│   └── evaluation_csv.json                      ← Jury CSV output format
├── backend/
│   ├── GEMINI.md                                ← Backend-specific rules + directory boundary
│   ├── app/
│   ├── db/
│   ├── adapters/                                ← VMS Federation Layer (NOT empty stubs)
│   │   ├── base.py                              ← Abstract VMSAdapter interface
│   │   ├── milestone.py                         ← Milestone XProtect XML → alert_event.json normalizer
│   │   ├── genetec.py                           ← Genetec Omnicast JSON → alert_event.json normalizer
│   │   ├── onvif_nvr.py                         ← Generic ONVIF/NVR adapter
│   │   └── mock_payloads/                       ← Real sample vendor XML/JSON event payloads
│   └── tests/
├── vision/
│   ├── GEMINI.md                                ← Vision-specific rules (PTS-only, Kalman reset)
│   ├── detector/
│   ├── tracker/
│   └── tests/
├── frontend/
│   ├── GEMINI.md                                ← Frontend-specific rules (3-pass UI policy)
│   ├── src/
│   └── public/
└── docs/
    ├── GEMINI.md                                ← Docs-specific rules (no handwaving, quantitative only)
    ├── hld/
    ├── presentation/
    └── submission/
```

---

## Subagent Definitions

| Subagent Type | Directory Boundary | Responsibilities |
| :--- | :--- | :--- |
| `sentinel_backend_engineer` | `backend/` only | FastAPI, 6-table SQLite mock (VAHAN/SARTHI/eGujCop/AFIS/NAFIS + **sightings history**), **`GET /api/vehicles/{plate}/trajectory` trajectory search API (THE CORE TEST CASE)**, `GET /api/search?plate=...` fuzzy plate search, **sandbox authentication token handler (SENTINEL_SANDBOX_TOKEN + session login + 401 auto-refresh)**, RTSP stream proxy with TCP + backoff, WebSocket alert broadcast, **real VMS federation adapters with Milestone XML→JSON and Genetec JSON→contract normalizers (NOT empty stubs)**, append-only forensic audit log |
| `sentinel_vision_engineer` | `vision/` only | **Intelligent Ingestion Scheduler (1-2 FPS sub-sampling, round-robin batches of 5 streams, MAX_CONCURRENT_STREAMS config, frame queue with backpressure, GPU memory auto-scaling)**, YOLOv8 HSRP plate detector, EasyOCR/PaddleOCR with GJ plate regex normalizer, PTS-only Kalman tracker with 12-hour loop discontinuity handler, SHA-256 snapshot hashing (NFSU chain-of-custody), **POST detections to backend sightings table for trajectory persistence**, evaluation CSV exporter |
| `sentinel_frontend_engineer` | `frontend/` only | React/Vite dark-mode police cockpit, Leaflet GIS Model 1 registry (departmental filters, health status), **plate search bar calling `GET /api/vehicles/{plate}/trajectory` for HISTORICAL route reconstruction (not just live WebSocket)**, chronological waypoint list panel, live alert drawer with threat-level color coding (Red/Amber/Green), PCR dispatch card, video wall grid (WHEP/HLS) |
| `sentinel_systems_architect` | `docs/` only | 80,000-camera HLD (bandwidth math, edge vs central, storage tiers, HA/RBAC/TLS), 15-slide pitch deck (addressing NFSU forensics + DA-IICT benchmarks + IPS actionability), **deployment tunnel setup (cloudflared/ngrok for HTTPS exposure of local backend)**, submission package assembly |

---

## Verification Plan

### Automated Tests
```bash
# 1. Invariant compliance (AST scan for rule violations)
python .engine/invariants.py

# 2. Backend: API + DB + trajectory + adapter tests
cd backend && pytest tests/ -v
# Key test: GET /api/vehicles/GJ01ER8842/trajectory returns chronological sightings
# Key test: Milestone XML → alert_event.json normalization
# Key test: Genetec JSON → alert_event.json normalization
# Key test: Sandbox auth token refresh on 401

# 3. Vision: Tracker + CSV + ingestion scheduler tests
cd vision && python tests/test_tracker.py && python tests/test_csv_format.py && python tests/test_ingestion_scheduler.py
# Key test: 50 cameras at 1 FPS = max 5 concurrent streams active

# 4. Frontend: Build verification
cd frontend && npm run build

# 5. End-to-end integration
python .engine/test_integration.py
```

### Manual Verification
- Launch backend + frontend, open `http://localhost:5173`
- Verify 50 camera pins on Gujarat GIS map with departmental filters
- **CRITICAL TEST**: Type `GJ01ER8842` in plate search bar → verify historical breadcrumb route with 3+ chronological waypoints from `sightings` table
- Trigger live vehicle detection → confirm real-time alert card + WebSocket push
- Click "Export Official Evaluation Report" → verify CSV schema matches jury format
- **DEPLOYMENT TEST**: Start cloudflared/ngrok tunnel → verify public HTTPS frontend successfully fetches from tunneled backend → no mixed content errors in Chrome DevTools
- Record Demo 1 (own feed) and Demo 2 (sandbox RTSP)
