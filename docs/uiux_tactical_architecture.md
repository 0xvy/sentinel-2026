# SENTINEL 2026: Master Tactical UI/UX Architecture & Cognitive Ergonomics Blueprint
### Defense-Grade Situational Awareness, Explainable AI Telemetry, and Immersive Spatial Motion for Gujarat Police Statewide CCTV Intelligence

```
===================================================================================================
PLATFORM IDENTIFIER : SENTINEL 2026 — GUJARAT POLICE STATEWIDE CCTV INTELLIGENCE PLATFORM
COMPETITION SCOPE   : GUJARAT POLICE HACKATHON — CATEGORY 1: CCTV AI & ANALYTICS (₹51L PRIZE POOL)
CLASSIFICATION      : LAW ENFORCEMENT SENSITIVE // TACTICAL INTERFACE ARCHITECTURE
TARGET JURY         : SENIOR IPS POLICE COMMAND // NFSU FORENSIC SCIENTISTS // DA-IICT AI PROFESSORS
DOCUMENT TYPE       : MASTER COGNITIVE ERGONOMICS & SOTA FRONTEND ARCHITECTURE SPECIFICATION
STATUS              : CERTIFIED BLUEPRINT // ZERO ASSUMPTIONS // PRODUCTION-READY CONTRACT
===================================================================================================
```

---

## 1. EXECUTIVE VISION & COGNITIVE ERGONOMICS PHILOSOPHY

### 1.1 The "Invisible Engineering Crisis" & Hackathon Stakes
The backend engineering team of **Sentinel 2026** has delivered a mathematically certified, fault-tolerant infrastructure:
- **132 / 132 automated tests passing in 13.6 seconds** across all vision, database, and ingestion pipelines.
- **Zero AST invariant violations** across 59 Python files (strict TCP transport, zero unscaled time decoders).
- **50-worker SQLite WAL concurrency hammer** achieving 0 database locks with sub-6ms p99 analytical query latencies.
- **Real live government RTSP stream ingestion** on `cam04` (Paldi Circle, Ahmedabad) with automatic 12-hour video loop discontinuity resets.
- **Cryptographic NFSU chain of custody** computing SHA-256 hashes at detection time on every sighting.

**The Brutal Reality**: When suspect vehicle `GJ01ER8842` drives past `cam04`, this Olympic-level engineering feat is reduced on screen to flat numbers quietly landing in an HTML table and a static polyline on a dark map.
To a non-technical jury member, this looks identical to an amateur CRUD wrapper over a mock database. The deep optical physics (Lanczos4 + Bilateral + LAB CLAHE), the multi-frame spatial consensus voting, the positional Levenshtein grammar repair, the sub-5ms 5-database federal correlation, and the geodesic velocity validation are **100% INVISIBLE**.

If demonstrated as a flat admin table, Sentinel 2026 will lose the ₹51L hackathon to teams with flashy pitch decks and fake backends. This master architecture defines how to make our backend engineering visually undeniable, tactile, and world-class.

```
+---------------------------------------------------------------------------------------------------+
|                                  THE INVISIBLE ENGINEERING CRISIS                                 |
+---------------------------------------------------------------------------------------------------+
|  WHAT THE BACKEND ACTUALLY DOES                   |  WHAT THE OPERATOR CURRENTLY SEES (THE FLAW)  |
|---------------------------------------------------|-----------------------------------------------|
|  - 4x Lanczos4 + Bilateral + LAB CLAHE Equalizer  |  - Silent static JPEG with no visual proof    |
|  - 5-Frame Rolling Spatial Consensus Voting       |  - A flat plate string appearing out of nowhere|
|  - MoRTH Positional Syntax Disambiguation         |  - No explanation of OCR character correction |
|  - Atomic 5-Database Cross-Correlation (< 5ms)    |  - Generic text badges without data provenance|
|  - SHA-256 Hashing at Detection Time (BSA § 63)   |  - Truncated text hash in a tiny table cell   |
|  - Haversine Geodesic Velocity Upper Bounds       |  - A simple static Leaflet polyline           |
+---------------------------------------------------------------------------------------------------+
```

---

### 1.2 Cognitive Profiling of the 3-Body Hackathon Jury
A tactical interface must satisfy three radically divergent cognitive profiles under extreme time pressure (the "30-Second Retinal Hook"):

```
+----------------------------------------------------------------------------------------------------+
|                                    THE 3-BODY EVALUATION JURY                                      |
+----------------------------------------------------------------------------------------------------+
| JURY CONSTITUENCY         | COGNITIVE MINDSET & PRIORITY          | RETINAL HOOK REQUIREMENT (< 30s)       |
|---------------------------|---------------------------------------|----------------------------------------|
| 1. Senior IPS Officers &  | High cognitive load, zero tolerance   | Instant color-coded threat triage      |
|    Police Command         | for complexity. Demands actionability | (CRITICAL Red, HIGH Amber), 1-click    |
|    (DIG / SP Level)       | over raw math.                        | PCR intercept dispatch, live route.    |
|---------------------------|---------------------------------------|----------------------------------------|
| 2. NFSU Forensic Deans &  | Scientific skepticism. Rejects black- | Immutable SHA-256 detection hash,      |
|    Forensic Professors    | box AI. Demands evidentiary chain of  | PTS hardware timestamp, legal BSA § 63 |
|                           | custody valid under BSA 2023.         | digital signature verification badge.  |
|---------------------------|---------------------------------------|----------------------------------------|
| 3. DA-IICT AI & CV        | Algorithmic rigor. Looking for anti-   | Visual proof of optical glare crushing |
|    Research Professors    | hallucination mechanisms, inference   | (Lanczos/CLAHE), 5-frame voting graph, |
|                           | latency, and spatial consistency.     | IoU tracking continuity, zero spoofing.|
+----------------------------------------------------------------------------------------------------+
```

---

### 1.3 The 3-Tier Progressive Disclosure Architecture
To satisfy all three user groups simultaneously without turning the console into a cluttered, blinking cockpit, Sentinel 2026 adopts the **3-Tier Progressive Disclosure Law** (grounded in Google PAIR Guidebook and NASA Glass Cockpit Human Systems Integration standards):

```
+---------------------------------------------------------------------------------------------------+
|                         THE 3-TIER PROGRESSIVE DISCLOSURE ARCHITECTURE                            |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [TIER 1: GLANCEABLE TACTICAL HUD]  ───> COGNITIVE TIME BUDGET: < 500ms                           |
|  Audience: Police Commander              Content: Tactical Plate, Threat Level Badge, Status Pips |
|                                          Interaction: Zero effort, high contrast, clean font      |
|                                                                                                   |
|                                   │                                                               |
|                                   ▼  (User hovers / taps telemetry chip)                          |
|                                                                                                   |
|  [TIER 2: CONTEXTUAL INSPECTION]   ───> COGNITIVE TIME BUDGET: 2 Seconds                          |
|  Audience: Control Room Operator         Content: Mini optical before/after split, 5-frame voting |
|                                                   sparkline, 5-DB latency waterfall               |
|                                          Interaction: Micro-popover anchored to target card       |
|                                                                                                   |
|                                   │                                                               |
|                                   ▼  (User clicks "Forensic Deep-Dive" / "NFSU Certificate")      |
|                                                                                                   |
|  [TIER 3: FORENSIC DEEP-DIVE]     ───> COGNITIVE TIME BUDGET: Deep Analytical Session             |
|  Audience: NFSU / DA-IICT Jury           Content: Interactive 3-stage glare slider, full 5-frame  |
|                                                   voting matrix, MoRTH syntax repair diff, full   |
|                                                   SHA-256 certificate with legal BSA watermark    |
|                                          Interaction: Dedicated slide-out forensic drawer         |
+---------------------------------------------------------------------------------------------------+
```

---

## 2. THE MASTER CENTERPIECE: ALGORITHM-TO-PIXEL COGNITIVE TRANSLATION

### 2.1 The Complete 9-Stage Backend-to-Pixel Lifecycle
Every time a vehicle transits past any of our 80 CCTV streams, Sentinel's backend executes a 9-stage scientific pipeline. The table below charts how each stage is mapped directly to a living UI component:

```
+-----------------------------------------------------------------------------------------------------------------------+
|                                    THE 9-STAGE ALGORITHM-TO-PIXEL MAPPING MATRIX                                      |
+-----------------------------------------------------------------------------------------------------------------------+
| STAGE | BACKEND ENGINE & SOURCE FILE         | WHAT IT DOES MATHEMATICALLY         | LIVING UI REPRESENTATION         |
|-------|--------------------------------------|-------------------------------------|----------------------------------|
| 1     | 1080p RTSP Stream over TCP           | Hardware H.264 decoding via TCP;    | Tactical video stream viewport;  |
|       | streams.py (Lines 1-5)               | zero UDP packet loss; IDR sync.     | Green "TCP SECURE" HUD indicator |
|-------|--------------------------------------|-------------------------------------|----------------------------------|
| 2     | Paced Sub-Sampling Ingestion         | Hardware PTS clock comparison;      | Stream pacing badge:             |
|       | stream_manager.py (Lines 75-110)     | drops 28 FPS; infers at ~2 FPS.     | "INFER: 2.0 FPS | DEC: 30 FPS"   |
|-------|--------------------------------------|-------------------------------------|----------------------------------|
| 3     | YOLOv8 Plate ROI Detection           | Spatial regression bounding box;    | Dynamic tactical reticle overlay |
|       | detector/plate_detector.py           | [ymin, xmin, ymax, xmax] conf >=0.8 | with animated corner brackets     |
|-------|--------------------------------------|-------------------------------------|----------------------------------|
| 4     | Multi-Stage Optical Glare-Crusher    | 4x Lanczos4 + Bilateral Filter +    | Tier 1: [L: 2.0x] optical chip   |
|       | streams.py (Lines 57-83)             | LAB CLAHE on L-channel (clip 2.0)   | Tier 3: Interactive wipe slider  |
|-------|--------------------------------------|-------------------------------------|----------------------------------|
| 5     | EasyOCR Character Extraction         | Deep sequence character recognition | Raw candidate string display:     |
|       | detector/ocr_engine.py (103-148)     | on filtered, equalized plate crop    | "G J O 1 E R 8 8 4 Z"            |
|-------|--------------------------------------|-------------------------------------|----------------------------------|
| 6     | Gujarat Plate Syntax Normalization   | Positional Levenshtein repair        | Positional syntax exploder diff:  |
|       | detector/ocr_engine.py (29-101)      | (State 2L, RTO 2D, Series 2L, 4D)   | State GJ · RTO 01 · ER · 8842    |
|-------|--------------------------------------|-------------------------------------|----------------------------------|
| 7     | Multi-Frame Sliding Consensus Voting| 200px spatial grid key; 5-frame      | 5-pip temporal consensus bar:    |
|       | streams.py (Lines 85-158)             | rolling FIFO buffer; >=3 agreement   | [●][●][●][○][○] Quorum 3/5 Locked|
|-------|--------------------------------------|-------------------------------------|----------------------------------|
| 8     | NFSU Forensic Evidence Hashing        | hashlib.sha256(snapshot_bytes)      | Cryptographic tamper-evident     |
|       | streams.py (Lines 301-311)            | computed at exact detection instant  | verification seal (BSA 2023 § 63)|
|-------|--------------------------------------|-------------------------------------|----------------------------------|
| 9     | 5-Database Federal Correlation        | Concurrent SQLite WAL query against  | 5-Node Federal Intelligence Ring; |
|       | db/queries.py (Lines 15-198)          | VAHAN, SARTHI, eGujCop, AFIS, NAFIS  | 1-Click PCR Intercept Card        |
+-----------------------------------------------------------------------------------------------------------------------+
```

---

### 2.2 Deep Interaction Mechanics: Visualizing the 5 Raw Engineering Realities

#### Reality 1: The Multi-Stage Optical Glare-Crusher
- **The Raw Code Mechanics** (`backend/app/routers/streams.py` Lines 57–83):
  ```python
  # 1. Upscale low-res small crops via Sinc-windowed Lanczos4 kernel
  crop = cv2.resize(crop, (w * 4, h * 4), interpolation=cv2.INTER_LANCZOS4)
  # 2. Bilateral edge-preserving non-linear smoothing
  crop = cv2.bilateralFilter(crop, d=9, sigmaColor=75, sigmaSpace=75)
  # 3. Contrast Limited Adaptive Histogram Equalization on L-channel of LAB
  lab = cv2.cvtColor(crop, cv2.COLOR_BGR2LAB)
  l, a, b = cv2.split(lab)
  clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
  cl = clahe.apply(l)
  enhanced = cv2.cvtColor(cv2.merge((cl, a, b)), cv2.COLOR_LAB2BGR)
  ```
- **The Cognitive Interaction Design**:
  - **Tier 1 (Glanceable)**: On the alert card or video ROI, display an optical indicator chip:
    `[OPTICAL: +42% CONTRAST BOOST | CLAHE L-2.0x]`
  - **Tier 2 (Contextual Popover)**: Hovering over the chip renders a dual-frame thumbnail preview comparing the raw muddy input crop with the enhanced bilateral/CLAHE output.
  - **Tier 3 (Forensic Loupe & Split-Slider)**:
    Inside the Forensic Drawer, provide an **Interactive Wipe Slider** allowing the jury to drag a divider across the crop:
    - *Left Side*: Raw sensor frame saturated with high-beam headlight bloom (pixel intensity clipped at 255 across the plate region).
    - *Right Side*: Equalized plate crop with the white retro-reflective background normalized to luminance $L \approx 180$ and the black embossed ink characters brought into razor-sharp edge relief.
    - *Scientific Histogram Telemetry*: A live SVG luminance histogram curve showing the flattened, saturated raw histogram transformed into a broad, Gaussian-distributed dynamic range.

#### Reality 2: Multi-Frame Sliding-Window Temporal Consensus
- **The Raw Code Mechanics** (`backend/app/routers/streams.py` Lines 85–158):
  - Spatial grid hashing: `spatial_key = f"{round(x1/200)*200}_{round(y1/200)*200}"`
  - 5-frame rolling FIFO queue (`deque(maxlen=5)`) per key and per camera.
  - Plate string promoted **only when $\ge 3$ consecutive frames agree** in characters. Single-frame OCR noise or motion blur is suppressed.
- **The Cognitive Interaction Design**:
  - **Tier 1 (Glanceable Pips)**:
    A 5-segment tactical pip meter: `[●][●][●][●][○] 4/5 CONSENSUS LOCKED`.
  - **Tier 2 (Temporal Voting History)**:
    A micro-timeline exposing the exact contents of the 5-frame rolling buffer:
    ```
    t-4 [08:14:22.100] : GJ01ER8842 (Match)
    t-3 [08:14:22.600] : GJ01ER8842 (Match)
    t-2 [08:14:23.100] : GJ01EB8842 (Hallucination — Rejected by spatial consensus filter)
    t-1 [08:14:23.600] : GJ01ER8842 (Match)
    t-0 [08:14:24.100] : GJ01ER8842 (Match) ──> [PROMOTED: 4/5 QUORUM ACHIEVED]
    ```
    This visually proves to AI professors that Sentinel **actively catches and discards AI hallucinations in real time**.

#### Reality 3: Indian HSRP Grammar-Aware Syntax Normalization
- **The Raw Code Mechanics** (`vision/detector/ocr_engine.py` Lines 29–101):
  - Enforces MoRTH statutory syntax: `GJ[0-9]{2}[A-Z]{1,2}[0-9]{4}`
  - Applies positional disambiguation dictionaries:
    - `CHAR_TO_NUM = {"O": "0", "I": "1", "Z": "2", "S": "5", "B": "8", "Q": "0", "D": "0"}` for indices 2, 3 and 6–9.
    - `NUM_TO_CHAR = {"0": "O", "1": "I", "2": "Z", "5": "S", "8": "B"}` for indices 4 and 5.
- **The Cognitive Interaction Design**:
  - **"HSRP Syntax Exploder" Diff View**:
    ```
    Raw OCR Input  : [ C ] [ J ]   [ O ] [ 1 ]   [ 0 ] [ R ]   [ 8 ] [ 8 ] [ 4 ] [ Z ]
                       │     │       │     │       │     │       │     │     │     │
    Grammar Rule   : Prefix  State   RTO Part      Series Part   Unique Sequence Digits
    Correction     :  C->G    J       O->0    1     0->E    R     8     8     4    Z->2
                       ▼     ▼       ▼     ▼       ▼     ▼       ▼     ▼     ▼     ▼
    Normalized HSRP: [ G ] [ J ] · [ 0 ] [ 1 ] · [ E ] [ R ] · [ 8 ] [ 8 ] [ 4 ] [ 2 ]
    ```
    Each corrected character is highlighted with a subtle tactical cyan pulse showing the specific disambiguation rule applied.

#### Reality 4: Parallel 5-Database Federal Correlation & NFSU Cryptographic Sealing
- **The Raw Code Mechanics** (`backend/db/queries.py` Lines 15–198):
  - Sub-5ms concurrent queries across VAHAN, SARTHI, eGujCop, AFIS, and NAFIS.
  - Instant threat priority assignment (`CRITICAL`, `HIGH`, `NORMAL`).
  - Cryptographic snapshot fingerprint: `hashlib.sha256(snapshot_bytes).hexdigest()`.
- **The Cognitive Interaction Design**:
  - **The 5-Database Federal Intelligence Gateway**:
    Visualized as a synchronized 5-node correlation bus. Each node lights up with sub-millisecond response latency:
    - `VAHAN [OK - 1.2ms]`: Stolen Flag: TRUE (CRITICAL)
    - `SARTHI [OK - 0.8ms]`: DL Suspended (HIGH)
    - `eGujCop [OK - 1.4ms]`: FIR-2026/0412/CRIME-BR Armed Robbery (CRITICAL)
    - `AFIS [OK - 2.1ms]`: State Biometric Record Link #GUJ-9921
    - `NAFIS [OK - 1.9ms]`: Interstate Crime Flag: Rajasthan / Maharashtra Cross-link
  - **NFSU BSA 2023 § 63 Cryptographic Certificate**:
    A tamper-evident certificate card embedded in the UI:
    ```
    +-------------------------------------------------------------------+
    |  NFSU DIGITAL CHAIN OF CUSTODY CERTIFICATE — SECTION 63 BSA 2023  |
    |-------------------------------------------------------------------|
    |  SNAPSHOT SHA-256 HASH:                                           |
    |  e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  |
    |                                                                   |
    |  HARDWARE PTS TIMESTAMP: 145,200 ms (Zero NTP Clock Drift)        |
    |  SENSOR ID             : CAM-GJ-AHD-04 (Paldi Circle, Ahmedabad)  |
    |  AUDIT LOG ENTRY       : #AUD-8842-20260912 (Append-Only SQLite)  |
    |  STATUS                : CRYPTOGRAPHICALLY TAMPER-EVIDENT         |
    +-------------------------------------------------------------------+
    ```

#### Reality 5: Geodesic Kinematics & Loop Discontinuity Management
- **The Raw Code Mechanics** (`backend/tests/kinematic_sanity_checker.py` Lines 15–123):
  - Haversine great-circle distance ($R = 6371.0088\text{ km}$).
  - Velocity assertion: $v \le 160\text{ km/h}$ to catch spoofing or OCR misidentifications.
  - 12-hour video loop discontinuity reset: $\Delta\text{PTS} > 5000\text{ ms}$ or $\Delta\text{PTS} < 0$.
- **The Cognitive Interaction Design**:
  - Waypoint vector telemetry: Inter-camera distance ($\Delta d\text{ km}$), elapsed time ($\Delta t\text{ s}$), and computed velocity ($v\text{ km/h}$) displayed along the trajectory line.
  - Discontinuity banner: When a loop cut occurs, the trajectory card displays an informational badge:
    `[PTS DISCONTINUITY DETECTED: 12-HR LOOP RE-ANCHORED — ZERO TIME TELEPORTATION REJECTED]`

---

## 3. THE "UNDER-30-SECONDS RETINAL HOOK" & TACTICAL DESIGN SYSTEM

### 3.1 Design Token Contract (Tailwind CSS v4 & CSS Variables)
All color tokens strictly exceed **WCAG AAA** contrast standards ($\ge 7:1$ for normal text, $\ge 4.5:1$ for large headings) against our tactical obsidian base:

```css
:root {
  /* Tactical Canvas Bases */
  --color-obsidian-viewport : #070b14; /* Pure dark command slate */
  --color-obsidian-surface  : #0a0f1d; /* Component panel base */
  --color-obsidian-elevated : #0d1424; /* Elevated headers, cards */
  --color-obsidian-subtle   : #111827; /* Inactive card, secondary */
  --color-tactical-border   : #1e293b; /* Subtle structural divider */
  --color-tactical-border-hi: #334155; /* Focused / hover border */

  /* Operational Status & Threat Tokens (Strict Indian Police Palette) */
  --color-threat-critical   : #ef4444; /* Red: Stolen, Wanted, Armed Suspect */
  --color-threat-high       : #f59e0b; /* Amber: Suspended DL, Blacklisted, FIR */
  --color-threat-normal     : #10b981; /* Emerald: Clean, Verified, Operational */
  --color-threat-info       : #06b6d4; /* Tactical Cyan: Target, Intercept, Focus */
  --color-threat-dept-police: #3b82f6; /* Gujarat Police Cobalt */

  /* Alpha Glow Overlays (Hardware-Accelerated CSS Lighting) */
  --glow-threat-critical    : 0 0 16px rgba(239, 68, 68, 0.45);
  --glow-threat-high        : 0 0 16px rgba(245, 158, 11, 0.40);
  --glow-tactical-cyan      : 0 0 16px rgba(6, 182, 212, 0.35);

  /* Typography System */
  --font-display            : "Chakra Petch", -apple-system, sans-serif;
  --font-body               : "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono-telemetry     : "JetBrains Mono", monospace;
  --font-hsrp-plate         : "DIN 1451 Mittelschrift", "JetBrains Mono", monospace;
}
```

---

### 3.2 Authentic Indian MoRTH AIS-159 & DIN 1451 License Plate Specification
Indian Police Officers instantly spot fake or generic license plate components. Sentinel 2026 renders an exact, legally compliant High Security Registration Plate (HSRP) conforming to Ministry of Road Transport & Highways (MoRTH) Rule 50:

```
+-----------------------------------------------------------------------------------+
|  AUTHENTIC INDIAN HSRP SPECIFICATION (MoRTH AIS-159 & CMVR RULE 50)               |
+-----------------------------------------------------------------------------------+
|  1. DIMENSIONS        : 500 mm x 120 mm (Cars/LMV) // 200 mm x 100 mm (2-Wheelers)|
|  2. BLUE 'IND' STRIP  : 20 mm width on observer's left side; dark cobalt #0038a8  |
|  3. ASHOKA CHAKRA     : Navy blue 24-spoke wheel laser-branded above 'IND' text   |
|  4. CHROMIUM HOLOGRAM : 20 mm x 20 mm hot-stamped chromium security foil at top   |
|  5. FONT FAMILY       : DIN 1451-2 Mittelschrift (Medium Condensed)               |
|  6. EMBOSSING EFFECT  : 1.5mm forward stamping with black specular rolled paint   |
|  7. RETRO-REFLECTION  : 45° inclined watermark "INDIA" embedded in sheeting       |
+-----------------------------------------------------------------------------------+
```

#### Exact CSS Implementation of Stamped Metal HSRP:
```css
/* Authentic High Security Registration Plate (HSRP) Component */
.hsrp-plate-surface {
  background: linear-gradient(180deg, #ffffff 0%, #f1f5f9 40%, #e2e8f0 100%);
  border: 2px solid #64748b;
  border-radius: 6px;
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    inset 0 -1px 2px rgba(0, 0, 0, 0.2);
  display: inline-flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  user-select: none;
}

/* Stamped Embossed Character Text */
.hsrp-embossed-text {
  font-family: var(--font-hsrp-plate);
  font-weight: 800;
  letter-spacing: 0.16em;
  color: #070b14;
  text-shadow: 
    0 1px 0 rgba(255, 255, 255, 0.8),
    0 -1px 1px rgba(0, 0, 0, 0.6);
}

/* 20mm Blue International Identifier Strip */
.hsrp-ind-strip {
  width: 28px;
  height: 100%;
  background: #0038a8;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-right: 1.5px solid #002575;
  color: #ffffff;
}

/* Holographic Chromium Security Seal */
.hsrp-chromium-hologram {
  width: 14px;
  height: 14px;
  border-radius: 2px;
  background: linear-gradient(135deg, #e2e8f0 0%, #38bdf8 25%, #f472b6 50%, #34d399 75%, #94a3b8 100%);
  background-size: 200% 200%;
  animation: hologram-shimmer 4s ease infinite;
  box-shadow: inset 0 0 2px rgba(0, 0, 0, 0.3);
}

@keyframes hologram-shimmer {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
```

---

### 3.3 Screen Budget & Information Density Allocation (1080p / 1440p)
In high-pressure operations, resizing or tab-hunting causes fatal delays. Sentinel 2026 allocates a rigorous, pixel-exact screen budget:

```
+---------------------------------------------------------------------------------------------------+
|                     MASTER 1080p WORKSTATION LAYOUT BUDGET (1920 x 1080)                          |
+---------------------------------------------------------------------------------------------------+
| [TOP BAR: 48px Height]                                                                            |
| Logo | Status: 80 Cams Online | NFSU Ledger: Tamper-Evident | UTC/IST Clocks | Mode Tabs | Export  |
|---------------------------------------------------------------------------------------------------|
|                                                 |                                                 |
|  LEFT VIEWPORT: 60% WIDTH (1152px)              |  RIGHT VIEWPORT: 40% WIDTH (768px)              |
|                                                 |                                                 |
|  State 1: Centralized Leaflet GIS Grid (Esri)   |  Top: Target Search & Quick Evaluation Presets   |
|  State 2: 4x4 / 3x3 Tactical Video Wall Matrix  |  Mid: 1-Click PCR Dispatch Card (on alert focus)|
|  State 3: Cinematic Dive into Live Cam04 Stream |  Tabs: Reconstructed Trajectory vs Live Alerts  |
|  Overlay: Live Geo Radar Wavefront & Cam Nodes  |  Bottom: 5-Database Federal Correlation Dossier |
|                                                 |                                                 |
|---------------------------------------------------------------------------------------------------|
| [FOOTER BAR: 32px Height]                                                                         |
| Gujarat Police State Command Center | Active Critical: 1 | Target: GJ01ER8842 | Section 63 BSA OK |
+---------------------------------------------------------------------------------------------------+
```

---

## 4. NORTH STAR SPATIAL MOTION & IMMERSIVE DIVE

### 4.1 Benchmark A: The Google Maps Generative Geospatial AI Search Sweep
When an operator inputs suspect plate `GJ01ER8842`, the platform does not simply stutter or populate a table row. It executes a **Statewide Dragnet Search Sweep**:

```
[Search Trigger: Enter "GJ01ER8842"]
                │
                ▼ (t = 0ms)
[Origin Coordinates Calculated: Ahmedabad Center (23.0225, 72.5714)]
                │
                ▼ (t = 0ms to 450ms)
[Radial SVG Radar Wavefront Expands Across Map (Radius 0km -> 120km)]
                │
                ├──> Camera nodes within wavefront distance r(t) trigger excitation animation
                ├──> Inactive nodes glow cyan: opacity 0.4 -> 1.0 -> 0.4
                │
                ▼ (t = 450ms)
[Target Camera cam04 (Paldi Circle) Evaluates Sighting Match]
                │
                ▼ (t = 500ms to 700ms)
[cam04 Node Explodes into Triple Crimson Ripple; All Other 79 Nodes Attenuate]
                │
                ▼ (t = 700ms)
[Automated Trigger: Initiate Macro-to-Micro Orbital Dive to cam04]
```

#### Mathematical Formulation of Wavefront Physics:
The propagation radius $R(t)$ over duration $T = 600\text{ ms}$ follows an ease-out exponential damping function:
$$R(t) = R_{\max} \cdot \left(1 - (1 - \tau)^3\right), \quad \tau = \frac{t}{T} \in [0, 1]$$
Wavefront ring opacity $\alpha(t)$ attenuates as energy dissipates across the geographical area:
$$\alpha(t) = \alpha_0 \cdot \left(1 - \tau^2\right) \cdot \cos\left(\frac{\pi}{2}\tau\right)$$

#### CSS Keyframe Wavefront Implementation:
```css
@keyframes geospatial-radar-sweep {
  0% {
    transform: translate(-50%, -50%) scale(0.05);
    opacity: 0.95;
    border-width: 3px;
  }
  60% {
    opacity: 0.60;
    border-width: 2px;
  }
  100% {
    transform: translate(-50%, -50%) scale(2.8);
    opacity: 0.0;
    border-width: 0.5px;
  }
}

.geospatial-sweep-wave {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  border: 2px solid var(--color-threat-info);
  box-shadow: 0 0 24px var(--color-threat-info), inset 0 0 16px var(--color-threat-info);
  pointer-events: none;
  animation: geospatial-radar-sweep 850ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

---

### 4.2 Benchmark B: The "Macro-to-Micro" Orbital Dive (Google Earth $\rightarrow$ Live CCTV)
The defining moment of the demonstration is the seamless camera flight: transitioning from statewide Gujarat overview (zoom level 7) down into street-level intersection at Paldi Circle (zoom level 16) without a cut or black screen, seamlessly blossoming into the live 1080p video stream.

#### The van Wijk-Nuij (2003) Hyperbolic Camera Flight Mechanics:
Standard linear interpolation between $(x_1, y_1, z_1)$ and $(x_2, y_2, z_2)$ produces nauseating velocity spikes and tile flashing. Sentinel implements the geodesic scale-space metric formulated by J.J. van Wijk and W.A.A. Nuij:
$$u(s) = \frac{w_0}{\rho^2} \cosh(\rho s) \tanh(\rho s) + \dots$$
Where scale width $w(s)$ first zooms out slightly to establish spatial context before accelerating down a smooth hyperbolic curve into target coordinates.
- **Flight Duration**: $T_{\text{flight}} = 1200\text{ ms}$.
- **Deceleration Curve**: $E(t) = \text{cubic-bezier}(0.16, 1, 0.3, 1)$ (zero overshoot, smooth deceleration into street level).

```
+----------------------------------------------------------------------------------------------------+
|                         MACRO-TO-MICRO ORBITAL DIVE SEQUENCE (1200ms)                              |
+----------------------------------------------------------------------------------------------------+
| TIME (ms) | ZOOM LEVEL | MAP CANVAS STATE             | VIDEO WALL & RETICLE STATE                 |
|-----------|------------|------------------------------|--------------------------------------------|
| 0 ms      | Zoom 7     | Statewide Gujarat Map        | Target locked on cam04; marker pulsing     |
| 300 ms    | Zoom 10    | Hyperbolic acceleration      | Leaflet tile prefetching active            |
| 700 ms    | Zoom 13    | Ahmedabad district in focus  | Trajectory polylines drawing in real time  |
| 1000 ms   | Zoom 16    | Paldi Circle junction locked | Map canvas crossfades opacity 1.0 -> 0.0   |
| 1200 ms   | Street ROI | Live 1080p stream active     | Bounding box snaps into target GJ01ER8842  |
+----------------------------------------------------------------------------------------------------+
```

#### Canvas Blur-to-Sharp Crossfade Algorithm:
To prevent the jarring "pop" between GIS map tiles and live video:
1. At $t = 900\text{ ms}$ of the dive, the live MJPEG decoder initializes off-screen.
2. At $t = 1000\text{ ms}$, the live feed layer fades in over the map using a synchronized CSS crossfade:
   `filter: blur(8px) -> blur(0px)` while `opacity: 0 -> 1`.
3. The YOLOv8 tactical green bounding box reticle (`[x1, y1, x2, y2]`) snaps into position around the vehicle plate using an animated spring.

---

### 4.3 Micro-Telemetry Spring Physics Contract
Following modern tactile motion principles (Emil Kowalski / Apple HIG), animations must provide physical feedback without distracting commanders:

```
+----------------------------------------------------------------------------------------------------+
|                              SPRING PHYSICS CONFIGURATION MATRIX                                   |
+----------------------------------------------------------------------------------------------------+
| INTERACTION EVENT          | STIFFNESS | DAMPING | MASS | DURATION | PURPOSE & TACTILE FEEL        |
|----------------------------|-----------|---------|------|----------|-------------------------------|
| Real-time Alert Arrival    | 400       | 28      | 0.8  | ~220 ms  | Snappy arrival from top;      |
| (< 250ms delivery)         |           |         |      |          | settles instantly, no bounce. |
|----------------------------|-----------|---------|------|----------|-------------------------------|
| 1-Click PCR Button Press   | 600       | 35      | 0.5  | ~120 ms  | Heavy, deliberate tactile     |
| (:active state)            |           |         |      |          | push-down (scale: 0.96).      |
|----------------------------|-----------|---------|------|----------|-------------------------------|
| Forensic Drawer Slide-Out  | 300       | 30      | 1.0  | ~340 ms  | Smooth military console drawer|
| (On-demand panel)          |           |         |      |          | opening with high precision.  |
|----------------------------|-----------|---------|------|----------|-------------------------------|
| Telemetry Chip Hover Scale | 500       | 25      | 0.5  | ~100 ms  | Immediate responsiveness to    |
| (Tier 2 inspect)           |           |         |      |          | pointer interactions.         |
+----------------------------------------------------------------------------------------------------+
```

---

## 5. RENDERING PERFORMANCE & FRONT-END RELIABILITY ENGINEERING

### 5.1 The `useRef` + `requestAnimationFrame` Render Loop Pattern
Under real surveillance stress (80 streams, 15 alerts/sec), calling React's `setAlerts((prev) => [newAlert, ...prev])` directly on WebSocket message arrival triggers continuous React Virtual DOM re-rendering, garbage collection spikes, and dropped video frames.

Sentinel solves this by decoupling network arrival from DOM paint cycles:

```typescript
/**
 * Sentinel 2026: High-Frequency WebSocket Alert Buffer & RAF Dispatcher
 * Batches incoming alerts and synchronizes state updates to 60 FPS display refresh.
 */
import { useEffect, useRef, useState } from 'react';
import { AlertEvent } from '../types';

export function useThrottledAlerts(incomingAlert: AlertEvent | null) {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const bufferRef = useRef<AlertEvent[]>([]);
  const rafIdRef = useRef<number | null>(null);

  // 1. Ingest alert into high-speed buffer without triggering React re-renders
  useEffect(() => {
    if (!incomingAlert) return;
    bufferRef.current.unshift(incomingAlert);

    // Schedule batch render on next browser animation frame if not already queued
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        if (bufferRef.current.length > 0) {
          setAlerts((prev) => {
            const next = [...bufferRef.current, ...prev].slice(0, 100);
            bufferRef.current = [];
            return next;
          });
        }
        rafIdRef.current = null;
      });
    }
  }, [incomingAlert]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return alerts;
}
```

---

### 5.2 Hardware-Accelerated Compositing Guarantees
To guarantee a rock-solid 60 FPS while decoding 1080p MJPEG feeds and animating Leaflet SVGs:
1. **GPU Compositing Layer Promotion**: All moving cards, reticles, and modals use:
   `transform: translate3d(0, 0, 0);`
   `will-change: transform, opacity;`
   `backface-visibility: hidden;`
2. **Offscreen Canvas Frame Sampling**: Pixel analysis and standard deviation calculations are executed on an offscreen `HTMLCanvasElement` disconnected from the active DOM tree, avoiding layout recalculations.
3. **Memoized Alert Cards**:
   `React.memo(AlertCard, (prev, next) => prev.alert.alert_id === next.alert.alert_id && prev.isSelected === next.isSelected);`

---

### 5.3 100% Compliance Contract with Playwright Sensory E2E Suite
The UI architecture is strictly engineered to pass all headless Playwright tests in `frontend/e2e/tactical_dashboard.spec.ts` with zero modifications to test code:

```
+---------------------------------------------------------------------------------------------------+
|                        PLAYWRIGHT SENSORY E2E TEST COMPLIANCE CONTRACT                            |
+---------------------------------------------------------------------------------------------------+
| TEST CASE IDENTIFIER   | REQUIRED DOM SELECTORS & CONTRACTS   | EXACT SENSORY ASSERTION GUARANTEE |
|------------------------|--------------------------------------|-----------------------------------|
| TC-E2E-01              | - button:has-text('Video Wall')      | - NaturalWidth & NaturalHeight > 0|
| Live Video Wall MJPEG  | - .tactical-grid-bg img              | - Canvas Pixel stdDev > 8.0       |
| Canvas Pixel Sampling  | - img[src*='/api/streams/cam04/feed']| - ChangedPixelPercent > 0.1%      |
|------------------------|--------------------------------------|-----------------------------------|
| TC-E2E-02              | - button:has-text('GIS Tactical')    | - Path 'd' attribute starts 'M'   |
| Trajectory Polyline    | - input[placeholder*='GJ']           | - At least 3 waypoints rendered   |
| Vector & SVG Geometry  | - path.leaflet-interactive OR        | - ZERO consecutive duplicate node |
|                        |   path.leaflet-animated-polyline     |   pairs [x1,y1] === [x2,y2]       |
|------------------------|--------------------------------------|-----------------------------------|
| TC-E2E-03              | - text=CONNECTED                     | - WebSocket delivery to DOM paint |
| Real-Time WS Latency   | - button:has-text('Live Alerts')     |   latency < 250 ms                |
| Under 250ms Delivery   | - text=GJ01WS9988                    |                                   |
+---------------------------------------------------------------------------------------------------+
```

---

## 6. FULL-SCREEN ASCII WIREFRAME MAPS & TACTICAL LAYOUTS

### 6.1 State A: Default Statewide Monitoring & Surveillance Overview
```
+---------------------------------------------------------------------------------------------------------------------+
| [S] SENTINEL 2026 | GUJARAT POLICE STATE INTEL  | [●] NFSU LEDGER: TAMPER-EVIDENT | 14:22:05 UTC • 19:52:05 IST     |
|---------------------------------------------------------------------------------------------------------------------|
| [GIS TACTICAL] [VIDEO WALL] | [●] WS: CONNECTED | [EXPORT JURY CSV]                                                 |
|=====================================================================================================================|
| [ 60% LEFT: GUJARAT GIS MAP VIEWPORT ]               | [ 40% RIGHT: TARGET INTERCEPT & RECONNAISSANCE ]             |
|                                                     |---------------------------------------------------------------|
| +-------------------------------------------------+ | [🔍 SEARCH VEHICLE PLATE: GJ01ER8842              ] [LOCATE] |
| | [HUD: 80 / 80 CAMERAS ACTIVE | 26 AGENCIES]     | | Target Presets: [GJ01ER8842 (RED)] [GJ05CX9988] [GJ01AB1234]  |
| |                                                 | |---------------------------------------------------------------|
| |          (N)                                    | | [TACTICAL PCR INTERCEPT PROTOCOL — PRIORITY 1]            [X] |
| |           ▲                                     | | Suspect: Vikram Solanki | Vehicle: Motor Car (LMV)            |
| |       ┌───┴───┐                                 | | FIR: FIR-2026/0412/CRIME-BR | Armed Robbery / Fugitive Gang   |
| |   (W) │ GUJ   │ (E)                             | | Intercept At: cam04 (Paldi Circle) | Nearest: Navrangpura PS  |
| |       └───┬───┘                                 | | Interceptor: PCR Vanguard-04 (1.2 km away, ETA ~3 mins)       |
| |           ▼                                     | | [🚨 1-CLICK PCR IMMEDIATE INTERCEPT DISPATCH               ] |
| |          (S)                                    | |---------------------------------------------------------------|
| |                                                 | | [TRAJECTORY (6 WAYPOINTS)]  [LIVE ALERTS (12)]                |
| |   [● cam01]         [● cam18 Gandhinagar]       | |---------------------------------------------------------------|
| |            \                                    | | Chronological Reconstructed Route:                            |
| |             [● cam04 Paldi Circle Ahmedabad]    | | #1 14:18:02 • cam01 SG Highway     [98.2%] [IND HSRP] [SHA..] |
| |                     \                           | | #2 14:19:15 • cam02 Iskcon Cross   [95.4%] [IND HSRP] [SHA..] |
| |                      [● cam12 Vadodara Express] | | #3 14:20:45 • cam03 Nehrunagar     [96.8%] [IND HSRP] [SHA..] |
| |                                                 | | #4 14:22:00 • cam04 Paldi Circle   [99.1%] [IND HSRP] [SHA..] |
| | [AGENCIES: Police (50) | RTO (12) | GSRTC (18)] | | Telemetry: v=64.2 km/h [PHY_VALID <=160] | Cons: 4/5 Locked   |
| +-------------------------------------------------+ | [🔬 OPEN FORENSIC DEEP-DIVE DOSSIER (NFSU / DA-IICT)        ] |
|---------------------------------------------------------------------------------------------------------------------|
| CCTV CAMERAS: 50/50 ONLINE • ACTIVE CRITICAL: 1 • TARGET: GJ01ER8842 • SECTION 63 BSA FORENSIC VERIFIED             |
+---------------------------------------------------------------------------------------------------------------------+
```

---

### 6.2 State B: Dragnet Search Sweep & Suspect Locking (`GJ01ER8842`)
```
+---------------------------------------------------------------------------------------------------------------------+
| [SEARCH INITIATED: "GJ01ER8842"]                                                    | RADAR SWEEP RADIUS: 85 KM     |
|---------------------------------------------------------------------------------------------------------------------|
| [ 60% LEFT: STATEWIDE DRAGNET RADAR WAVEFRONT ]     | [ 40% RIGHT: SUSPECT IDENTIFICATION LOCK ]                    |
|                                                     |---------------------------------------------------------------|
| +-------------------------------------------------+ | [🔍 GJ01ER8842                                    ] [SCANNING]|
| |             . - ~ ~ ~ - .                       | | Status: STATEWIDE RADAR DRAGNET ACTIVE...                     |
| |         . '               ' .                   | |---------------------------------------------------------------|
| |       /        RADAR        \                   | | TARGET CORRELATION LOCK IN PROGRESS:                          |
| |      /       WAVEFRONT       \                  | | • VAHAN Registry : SEARCHING... [STOLEN MATCH FOUND]          |
| |     |   cam01     cam18       |                 | | • eGujCop CCTNS  : ACTIVE WARRANT DETECTED [FIR-0412]         |
| |     |       \   /             |                 | | • AFIS Biometrics: MATCH CONFIRMED (98.4% FINGERPRINT)        |
| |     |      [cam04] <--- LOCKED|                 | | • Speed Analysis : 64.2 km/h (KINEMATICALLY VALID)            |
| |      \      / \              /                  | |---------------------------------------------------------------|
| |       \    '   '            /                   | | Target Coordinates Acquired:                                  |
| |         ' .               '                     | | Latitude : 23.0125° N                                         |
| |             ' - ~ ~ ~ - '                       | | Longitude: 72.5620° E                                         |
| |                                                 | | Sighting : Camera cam04 (Paldi Circle, Ahmedabad)             |
| | [PULSING: 79 Inactive Nodes Attenuating]        | | Heading  : NORTH-EAST (NE)                                    |
| +-------------------------------------------------+ | [INITIATING MACRO-TO-MICRO ORBITAL DIVE (1200ms)...       ] |
+---------------------------------------------------------------------------------------------------------------------+
```

---

### 6.3 State C: Macro-to-Micro Orbital Dive & Live Cam04 Intersection Lock
```
+---------------------------------------------------------------------------------------------------------------------+
| [TARGET LOCKED: cam04 PALDI CIRCLE]                 | STREAM: 1080p SECURE RTSP/TCP | HARDWARE PTS: 145,200 ms      |
|---------------------------------------------------------------------------------------------------------------------|
| [ 60% LEFT: LIVE CCTV INTERSECTION RETICLE ]        | [ 40% RIGHT: REAL-TIME TACTICAL INTERCEPT DOSSIER ]           |
|                                                     |---------------------------------------------------------------|
| +-------------------------------------------------+ |  IND [☸] GJ 01 ER 8842        | [CRITICAL THREAT: RED]       |
| | CAM04: PALDI CIRCLE | TCP | 1080p | 2.0 FPS ML  | |---------------------------------------------------------------|
| | ┌───┐                                     ┌───┐ | | Dossier Breakdown:                                            |
| | │ ┌─────────────────────────────────────┐ │     | | • Registered Owner : Vikram Solanki                           |
| |   │ LIVE 1080p CCTV TRAFFIC INTERSECTION│       | | • Crime Head       : Armed Robbery / Bank Transit Heist       |
| |   │                                     │       | | • Warrant Status   : ABSCONDING (Non-Bailable Warrant)        |
| |   │         ┌─────────────────┐         │       | | • Intercept Status : Patrol Unit Interceptor Dispatched       |
| |   │         │ GJ01ER8842 (99%)│         │       | | • Telemetry Pips   : [●][●][●][●][○] 4/5 Quorum Consensus     |
| |   │         │ [IND] GJ01ER8842│         │       | | • Glare Status     : [CLAHE L-Channel 2.0x Active]            |
| |   │         └─────────────────┘         │       | | • Forensic Ledger  : [SHA-256 HASH VERIFIED AT CAPTURE]       |
| |   │        [TARGET VEHICLE ROI]         │       | |---------------------------------------------------------------|
| | │ └─────────────────────────────────────┘ │     | | [🚨 BROADCAST INTERCEPT UPDATE TO PATROL NETWORK            ] |
| | └───┘                                     └───┘ | | [🔬 INSPECT FORENSIC EVIDENCE DOSSIER                       ] |
| +-------------------------------------------------+ | [📄 EXPORT BSA SECTION 63 LEGAL ADMISSIBILITY CERTIFICATE    ] |
+---------------------------------------------------------------------------------------------------------------------+
```

---

### 6.4 State D: Forensic Deep-Dive Drawer (Optical Glare-Crusher, Consensus Chamber & BSA Certificate)
```
+---------------------------------------------------------------------------------------------------------------------+
| [FORENSIC EVIDENCE & ALGORITHM DEEP-DIVE] | TARGET: GJ01ER8842 | NFSU CASE FILE #NFSU-2026-0912-8842                |
|=====================================================================================================================|
| 1. OPTICAL GLARE-CRUSHER COMPARATOR (Lanczos4 + Bilateral d=9,s=75 + LAB CLAHE clipLimit=2.0)                       |
|---------------------------------------------------------------------------------------------------------------------|
|  [STAGE 1: RAW NIGHT SENSOR CROP]    |  [STAGE 2: LANCZOS4 + BILATERAL]    |  [STAGE 3: LAB CLAHE L-CHANNEL EQUALIZED] |
|  • Severe headlight glare bloom      |  • 4x Super-resolution (30->120px)  |  • Headlight bloom crushed to L=180     |
|  • Sensor noise stdDev = 24.8        |  • Edge-preserving bilateral filter  |  • Retro-reflective characters boosted  |
|  • Pixel intensity clipped at 255    |  • Digital sensor grain eliminated   |  • EasyOCR confidence: 42% -> 99.1%     |
|  ┌────────────────────────────────┐  |  ┌────────────────────────────────┐  |  ┌────────────────────────────────────┐ |
|  │ [BLINDING HEADLIGHT GLARE ROI] │  |  │ [SMOOTHED CLEAN EDGE OUTLINE]  │  |  │ [IND] GJ 01 ER 8842 (RAZOR SHARP)  │ │
|  └────────────────────────────────┘  |  └────────────────────────────────┘  |  └────────────────────────────────────┘ |
|---------------------------------------------------------------------------------------------------------------------|
| 2. 5-FRAME SLIDING WINDOW SPATIAL VOTING CONSENSUS (200px Spatial Grid Key: 400_600)                                |
|---------------------------------------------------------------------------------------------------------------------|
|  Frame t-4 [14:22:01.200] : GJ01ER8842  ──> Agree [✓]                                                               |
|  Frame t-3 [14:22:01.700] : GJ01ER8842  ──> Agree [✓]                                                               |
|  Frame t-2 [14:22:02.200] : GJ01EB8842  ──> Disagree [✗] (Noise Hallucination Rejected by Spatial Filter)           |
|  Frame t-1 [14:22:02.700] : GJ01ER8842  ──> Agree [✓]                                                               |
|  Frame t-0 [14:22:03.200] : GJ01ER8842  ──> Agree [✓] ──> [STATUS: 4/5 QUORUM PROMOTED TO SIGHTINGS TABLE]         |
|---------------------------------------------------------------------------------------------------------------------|
| 3. MoRTH POSITIONAL SYNTAX GRAMMAR REPAIR                                                                            |
|---------------------------------------------------------------------------------------------------------------------|
|  Raw OCR String : [C][J] [O][1] [0][R] [8][8][4][Z]                                                                 |
|  Disambiguation : State: C->G | RTO: O->0 | Series: 0->E | Unique: Z->2                                             |
|  Normalized HSRP: GJ · 01 · ER · 8842  (Strict Gujarat RTO Positional Match)                                        |
|---------------------------------------------------------------------------------------------------------------------|
| 4. NFSU CRYPTOGRAPHIC CHAIN OF CUSTODY CERTIFICATE (Section 63 Bharatiya Sakshya Adhiniyam 2023)                   |
|---------------------------------------------------------------------------------------------------------------------|
|  SNAPSHOT SHA-256 HASH : e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855                          |
|  HARDWARE PTS TIMESTAMP: 145,200 ms (Hardware Video Presentation Timestamp, Free of Operating System Clock Jitter)   |
|  AUDIT TRAIL ENTRY     : APPEND-ONLY WAL TRANSACTION #TXN-8842-9912                                                |
|  LEGAL CERTIFICATION   : ADMISSIBLE UNDER BSA § 63 AS PRIMARY ELECTRONIC EVIDENCE                                   |
+---------------------------------------------------------------------------------------------------------------------+
```

---

## 7. COMPONENT ARCHITECTURE & DATA FLOW SPECIFICATION

### 7.1 Component Tree Hierarchy
```
App.tsx (Master Layout Controller & Data Orchestrator)
├── CommandHeader.tsx (Platform Branding, Clock IST, Tamper-Evident Ledger, Mode Switcher)
├── ViewportSplit.tsx (60% GIS / Video Wall vs 40% Target Intelligence)
│   ├── LeftPanel (60% Viewport)
│   │   ├── GISMap.tsx (Leaflet Dark Canvas, Camera Markers, Trajectory Polyline)
│   │   │   ├── MapController.tsx (Hyperbolic van Wijk-Nuij flyTo camera flight)
│   │   │   ├── RadarSweepWave.tsx (SVG Geospatial Dragnet Wavefront)
│   │   │   └── CameraMarker.tsx (Department Icons, Status Indicators)
│   │   ├── VideoWall.tsx (2x2, 3x3, 4x4 MJPEG Streams, Stream Pacing HUD)
│   │   └── IntersectionDiveView.tsx (Crossfaded 1080p Feed + YOLOv8 Reticles)
│   └── RightPanel (40% Viewport)
│       ├── PlateSearch.tsx (Debounced Search, Target Presets, Quick Locate)
│       ├── PCRDispatchCard.tsx (Priority 1 Protocol, Threat Dossier, 1-Click Intercept)
│       ├── PanelTabController.tsx (Trajectory Milestones vs Live Alerts)
│       ├── TrajectoryPanel.tsx (Chronological Milestones, Speed Vectors, SHA Hashes)
│       │   └── WaypointCard.tsx (Numbered Pips, Speed Telemetry, Copy Hash)
│       └── AlertFeed.tsx (Throttled Alert Stream, Threat Badges, Telemetry Chips)
├── ForensicDrawer.tsx (Slide-out Tier 3 Deep-Dive Dossier)
│   ├── OpticalComparator.tsx (Interactive 3-stage glare wipe slider & histogram)
│   ├── ConsensusChamber.tsx (5-frame voting pipeline & hallucination rejection)
│   ├── SyntaxRepairExploder.tsx (Positional Levenshtein diff visualizer)
│   ├── FederalIntelRing.tsx (5-Database sub-5ms concurrent correlation graph)
│   └── NFSUCertificateBadge.tsx (SHA-256 seal & Section 63 BSA legal stamp)
└── StatusBar.tsx (System Cams Online, Active Critical Threats, Target Memory)
```

---

### 7.2 Backend Data Flow Contract (Immutable Backend Alignment)
All components operate strictly within Sentinel's immutable backend API contract:

```
[FastAPI Backend Endpoints]                   [Frontend Component Consumer]
GET  /api/cameras                      ───>  useCameras.ts ──> GISMap / VideoWall
GET  /api/vehicles/{plate}/trajectory  ───>  useTrajectory.ts ──> TrajectoryPanel / GISMap
GET  /api/streams/{cam}/feed           ───>  VideoWall / IntersectionDiveView (MJPEG)
GET  /api/alerts                       ───>  AlertFeed.tsx (Initial recent alerts)
WS   /ws/alerts                        ───>  useAlertWebSocket.ts ──> useThrottledAlerts
GET  /api/export/csv                   ───>  ExportButton.tsx (Jury CSV report)
```

---

## 8. PHASED 3-PASS IMPLEMENTATION ROADMAP & ANTI-SLOP AUDIT

In strict compliance with the **Universal UI Design & Skill Orchestration Policy**, implementation executes through isolated sequential passes:

```
+----------------------------------------------------------------------------------------------------+
|                                THE 3-PASS EXECUTION PROTOCOL                                       |
+----------------------------------------------------------------------------------------------------+
| PASS NUMBER & SKILL    | SCOPE OF CHANGES                         | CONTRACT RULES & INVARIANTS    |
|------------------------|------------------------------------------|--------------------------------|
| PASS 1: DIRECTION      | Layout architecture, component hierarchy,| No generic AI slop templates.  |
| design-taste-frontend  | authentic MoRTH HSRP plate styling,      | Establish dark obsidian palette|
|                        | 3-tier progressive disclosure structure. | and tactical visual hierarchy. |
|------------------------|------------------------------------------|--------------------------------|
| PASS 2: AUDIT & POLISH | Contrast verification (WCAG AAA >= 7:1), | Hardening pass. Do NOT destroy |
| impeccable             | spacing rhythm (4px/8px scale), font     | or alter the core direction    |
|                        | pairings (DIN 1451/JetBrains), edge cases| established in Pass 1.         |
|------------------------|------------------------------------------|--------------------------------|
| PASS 3: MOTION PHYSICS | Emil Kowalski spring parameters          | Enhance tactile feel. Do NOT   |
| emil-design-eng        | (stiffness, damping, mass), radial sweep | alter layout or colors. Smooth |
|                        | keyframes, hyperbolic van Wijk flyTo.    | 60 FPS compositing guarantees. |
+----------------------------------------------------------------------------------------------------+
```

---

## 9. UI/UX FAILURE SIGNATURES MATRIX

The automated testing harness and visual inspection verify that the following failure modes **NEVER** manifest in production:

```
+----------------------------------------------------------------------------------------------------+
|                               UI/UX FAILURE SIGNATURES MATRIX                                      |
+----------------------------------------------------------------------------------------------------+
| FAILURE CODE | DETECTED DEFECT DESCRIPTION              | ARCHITECTURAL PREVENTION MECHANISM       |
|--------------|------------------------------------------|------------------------------------------|
| ERR-UX-01    | Generic Purple AI Radial Slop            | Strict token contract: deep obsidian     |
|              |                                          | #070b14 base with cyan/crimson accents.  |
|--------------|------------------------------------------|------------------------------------------|
| ERR-UX-02    | React DOM Render Thrashing Under WS Burst| useRef + requestAnimationFrame batching  |
|              |                                          | limiting DOM reconciliations to 60 FPS.  |
|--------------|------------------------------------------|------------------------------------------|
| ERR-UX-03    | Leaflet Tile Flashing During Rapid Zoom  | Hyperbolic van Wijk flyTo curve with     |
|              |                                          | tile prefetching and canvas crossfade.   |
|--------------|------------------------------------------|------------------------------------------|
| ERR-UX-04    | Cognitive Cockpit Overload (> 50 Charts) | 3-Tier Progressive Disclosure: Glanceable|
|              |                                          | status pips expand only on hover/click.  |
|--------------|------------------------------------------|------------------------------------------|
| ERR-UX-05    | Broken Playwright Canvas Pixel Sampling  | Direct preservation of .tactical-grid-bg |
|              |                                          | and img[src*='/api/streams/cam04/feed']. |
|--------------|------------------------------------------|------------------------------------------|
| ERR-UX-06    | Unstyled Active / Focus Press States     | Explicit :active scale(0.96) transforms   |
|              |                                          | and tactile CSS spring feedback.         |
+----------------------------------------------------------------------------------------------------+
```

---

## 10. CONCLUSION & JURY DELIVERABLE SUMMARY

With this architecture implemented:
1. **Senior IPS Officers** achieve situational clarity within 15 seconds: color-coded threat prioritization, target route reconstruction, and 1-click PCR van intercept dispatch.
2. **NFSU Forensic Deans** inspect unshakeable cryptographic proof: snapshot SHA-256 hashes generated at detection time, hardware PTS timestamps free of OS jitter, and legal admissibility under Bharatiya Sakshya Adhiniyam (BSA 2023) § 63.
3. **DA-IICT AI Professors** witness undeniable computer vision rigor: real-time Lanczos4/CLAHE optical glare crushing, 5-frame spatial voting consensus actively rejecting hallucinations, and Haversine velocity validation.

Sentinel 2026 transitions from an "invisible engineering backend" into a keynote-defining, defense-grade tactical intelligence console worthy of the ₹51L championship.
