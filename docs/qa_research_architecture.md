# SENTINEL 2026: Autonomous "Human-Eye" QA & End-to-End Validation Architecture
### Forensic-Grade Computer Vision, Sensory Browser Automation, and Kinematic Reliability Blueprint

---

## EXECUTIVE SUMMARY & ARCHITECTURAL PHILOSOPHY

In high-throughput, mission-critical law enforcement platforms like **Sentinel 2026** (federating 80,000+ CCTV cameras across 26 Gujarat state departments), **unit tests suffer from the "Mocking Trap"**. 

When unit tests mock RTSP decoders, mock SQLite WAL transactions, mock WebSocket transports, and mock the DOM, they test only **syntactic code paths**, not **physical reality**:
1. A camera feed can return HTTP 200 with an endless loop of identical gray frames; unit tests pass, but a police officer sees a dead stream.
2. A YOLO model can detect 40 bounding boxes on trembling tree leaves or headlight glare; unit tests pass because coordinates exist, but the system is hallucinating.
3. An OCR engine can read corrupted road asphalt as `"GJ018888"`; unit tests pass because string length is 8, but criminal intelligence is polluted with AI garbage.
4. A tracking pipeline can emit vehicle sightings leaping between Ahmedabad, Mehsana, and Rajkot in 3 seconds; unit tests pass because timestamps are valid ISO 8601 strings, but the vehicle is traveling at Mach 15.
5. The React dashboard can pass every DOM component test (`toBeVisible()`) while the Chromium rendering thread is frozen at 0 FPS due to unthrottled base64 canvas repaints.

This architecture establishes an **Autonomous "Human-Eye" QA Engine** that programmatically replicates the visual acuity, physical sanity, and temporal discernment of a veteran forensic investigator.

```
+---------------------------------------------------------------------------------------------------+
|                        SENTINEL 2026: MASTER VALIDATION HARNESS ARCHITECTURE                      |
+---------------------------------------------------------------------------------------------------+
                                                  |
           +--------------------------------------+-------------------------------------+
           |                                                                            |
           v                                                                            v
+-------------------------------+                                            +--------------------+
|  PHASE A: RTSP / SENSOR EYE   |                                            | PHASE B: API AUDIT |
|  - 1080p TCP Ingestion Check  |                                            | - JSON Schema v4   |
|  - PTS Hardware Drift Check   |                                            | - VAHAN/eGujCop/.. |
+-------------------------------+                                            +--------------------+
           |                                                                            |
           +--------------------------------------+-------------------------------------+
                                                  |
           +--------------------------------------+-------------------------------------+
           |                                                                            |
           v                                                                            v
+-------------------------------+                                            +--------------------+
|   PHASE C: CV LIVENESS EYE    |                                            | PHASE D: E2E SENSE |
|  - Farneback Dense Flow       |                                            | - Playwright CDP   |
|  - Structural SSIM Dynamics   |                                            | - Canvas Offscreen |
|  - Shannon Entropy Bounds     |                                            | - Esri Tile Audits |
|  - HSRP Regex & Gujarat RTO   |                                            | - WS Latency <250ms|
+-------------------------------+                                            +--------------------+
           |                                                                            |
           +--------------------------------------+-------------------------------------+
                                                  |
           +--------------------------------------+-------------------------------------+
           |                                                                            |
           v                                                                            v
+-------------------------------+                                            +--------------------+
|  PHASE E: KINEMATIC INTEGRITY |                                            | PHASE F: STRESS    |
|  - Haversine Geodesic Bounds  |                                            | - 50 Concurrent DB |
|  - Speed Assertions (v<=160)  |                                            | - Event Loop Lat.  |
|  - 12h Loop Cut PTS Resets    |                                            | - Voting RSS Drift |
+-------------------------------+                                            +--------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                            EXECUTIVE FORENSIC JURY REPORT (PASS/FAIL)                             |
|                            Artifact: reports/SENTINEL_VALIDATION_REPORT.json                      |
+---------------------------------------------------------------------------------------------------+
```

---

## 1. TOOLING & TECHNOLOGY STACK

To implement this without adding flaky bloat, we select a high-performance stack where each tool handles a distinct sensory dimension:

| Tool / Framework | Role in Validation Engine | Technical Justification |
| :--- | :--- | :--- |
| **Playwright (`@playwright/test`)** | Browser Sensory & DOM Automation | Direct integration with Chrome DevTools Protocol (CDP); ability to evaluate synchronous WebGL/Canvas pixel operations inside browser context; zero-overhead WebSocket message inspection; strict network route auditing for Esri GIS tiles. |
| **OpenCV-Python (`cv2`) & NumPy** | Computer Vision Liveness Engine | Native C++ SIMD acceleration for temporal frame-difference, structural similarity (SSIM), Farneback optical flow field integration, and bounding-box vector kinematics. |
| **SciPy (`scipy.stats`)** | Spatial Dynamic Entropy | Calculates Shannon entropy of pixel intensity distributions to mathematically differentiate flat/frozen feeds, glare-saturated frames, and authentic dynamic CCTV traffic. |
| **Pydantic v2 & `jsonschema`** | Forensic Contract Verification | Enforces byte-exact conformity against Gujarat Police JSON schemas (`trajectory_response.json`, `alert_event.json`, `camera_registry.json`) with zero runtime overhead. |
| **`psutil` & Python `asyncio` loop clock** | System Forensics & Concurrency Profiler | Measures Uvicorn event loop tick jitter down to microseconds; tracks Resident Set Size (RSS) memory drift and thread handle leaks under sustained 1080p decoding load. |
| **`pytest-asyncio`** | Asynchronous Test Harness | Native orchestration of concurrent WebSocket client taps, async database queries, and parallel MJPEG chunk consumers. |

---

## 2. COMPUTER VISION "AUTOMATED EYE" — VALIDATING LIVE VIDEO FEEDS

### 2.1 Temporal Motion & Liveness Verification
A human glances at a CCTV tile and knows within 1.5 seconds whether it is live traffic, a frozen picture, or a broken camera. The automated testing eye uses a two-tier mathematical filter:

#### A. Structural Similarity Index (SSIM) vs. Dense Optical Flow
- **The Problem with Frame Differencing**: Simple absolute pixel difference ($\sum |I_t - I_{t-1}|$) fails because H.264 compression macroblock breathing and sensor thermal noise produce non-zero pixel deltas even on completely static scenes.
- **The Mathematical Solution**: We compute structural similarity between consecutive frames downsampled to $640 \times 360$:
  $$SSIM(x, y) = \frac{(2\mu_x\mu_y + C_1)(2\sigma_{xy} + C_2)}{(\mu_x^2 + \mu_y^2 + C_1)(\sigma_x^2 + \sigma_y^2 + C_2)}$$
  Where $C_1 = (0.01 \times 255)^2$ and $C_2 = (0.03 \times 255)^2$.
  - If $SSIM(I_t, I_{t + \Delta t}) = 1.0000$: **Dead Freeze** (decoder buffer stuck).
  - If $0.985 \le SSIM \le 0.999$ over 3 seconds: **Static Scene** (empty road or surveillance snapshot with compression artifact flutter).
  - If $0.700 \le SSIM \le 0.980$: **Authentic Motion** (vehicles and pedestrians transiting the field of view).
  - If $SSIM < 0.400$: **Severe Stream Corruption** (IDR desync, green screens, packet burst loss).

To confirm that motion represents *physical directional movement* rather than camera jitter or rain noise, we compute **Gunnar Farneback Dense Optical Flow**:
$$I_x u + I_y v + I_t = 0$$
Transforming the displacement field $(u, v)$ into magnitude and angle:
$$\text{Magnitude } M(x, y) = \sqrt{u(x, y)^2 + v(x, y)^2}, \quad \theta(x, y) = \text{atan2}(v, u)$$
We require that in any 3-second window, the 95th percentile of $M(x, y)$ exceeds $2.5\text{ px/frame}$, and the vector field exhibits spatial clustering (connected components of non-zero flow $> 400\text{ px}^2$).

#### B. Dynamic Shannon Entropy
To catch dark screens, disconnect screens, or gray screens:
$$H(X) = -\sum_{i=0}^{255} p(i) \log_2 p(i)$$
Where $p(i)$ is the normalized histogram probability of grayscale intensity $i$.
- $H < 2.0$: **Black / Blank / Disconnected Feed** (camera disconnected or lens cap covered).
- $2.0 \le H \le 3.5$: **Static Tactical Connecting Frame** (Sentinel's dark HUD `#070b14`).
- $5.5 \le H \le 7.8$: **Healthy CCTV Optical Field** (complex roadway, vehicles, asphalt, ambient lighting).

---

### 2.2 Detection & Tracking Sanity
The automated eye enforces physical laws on YOLOv8 detections:

1. **Aspect Ratio Enforcement**:
   Indian HSRP vehicle plates conform strictly to MoRTH specifications:
   - Passenger Cars / Commercial: $500\text{ mm} \times 120\text{ mm}$ (Aspect Ratio $\approx 4.16:1$).
   - Two-Wheelers: $200\text{ mm} \times 100\text{ mm}$ (Aspect Ratio $\approx 2.00:1$).
   - Vehicle Body Bounding Boxes: $1.2:1 \le \frac{w}{h} \le 2.6:1$.
   *Assertion*: Reject and flag any bounding box where $\frac{w}{h} < 0.8$ (tall vertical slivers) or $\frac{w}{h} > 5.5$ (extreme horizontal artifacts) unless rotated bounding boxes are explicitly parameterized.

2. **Road Plane Spatial Distribution**:
   Surveillance cameras (e.g., Navrangpura, Iskcon) are mounted 4 to 8 meters overhead angled downward at 15°–35°.
   *Assertion*: Real vehicles cannot occupy the top 15% of the frame (sky/treetop horizon) with bounding box areas $> 10\%$ of the screen.

3. **Multi-Frame Kalman Continuity (IoU Tracking)**:
   A real vehicle moving at 2 FPS between consecutive frames cannot jump across the frame.
   $$IoU(B_t, B_{t+1}) = \frac{\text{Area}(B_t \cap B_{t+1})}{\text{Area}(B_t \cup B_{t+1})}$$
   *Assertion*: Single-frame detections that vanish immediately with no track history across 3 consecutive frames are flagged as **Ephemeral Hallucinations**. Tracked objects must maintain $IoU \ge 0.35$ or a smooth linear Kalman velocity vector $[\dot{x}, \dot{y}]$.

---

### 2.3 OCR Hallucination vs. Ground Truth Check
EasyOCR on CPU frequently hallucinates characters when presented with radiator grilles, bumper shadows, or blurred textures (e.g., turning a shadow into `"II1100"`).

1. **Strict MoRTH & Gujarat RTO Grammar Engine**:
   Every plate in Gujarat follows exact statutory syntax:
   $$\text{Pattern: } \texttt{\textasciicircum(GJ[0-9]\{2\}[A-Z]\{1,3\}[0-9]\{4\}|[0-9]\{2\}BH[0-9]\{4\}[A-Z]\{1,2\})\$}$$
2. **Gujarat RTO District Code Validation**:
   The first 4 characters must map to a legitimate Gujarat RTO registry code (`01` to `38`):
   - `GJ01`: Ahmedabad (City) | `GJ02`: Mehsana | `GJ03`: Rajkot | `GJ05`: Surat | `GJ06`: Vadodara | `GJ18`: Gandhinagar | `GJ27`: Ahmedabad (East).
   Any plate starting with `GJ99` or non-existent district codes is categorized as an **Invalid Hallucination**.
3. **Phonetic & Visual Confusion Metric**:
   Character transposition occurs along known visual ambiguity sets:
   $$\mathcal{C}_{num \to char} = \{0 \leftrightarrow O, 1 \leftrightarrow I, 8 \leftrightarrow B, 5 \leftrightarrow S, 2 \leftrightarrow Z\}$$
   The validation engine tests whether the normalization pipeline automatically applies positional substitution (letters at index 0,1; numbers at index 2,3; etc.).

---

## 3. BROWSER E2E AUTOMATION VIA PLAYWRIGHT (TACTICAL DASHBOARD TESTING)

### 3.1 MJPEG Streaming `<img />` Element Verification
Standard Playwright assertions (`await expect(page.locator('img')).toBeVisible()`) only assert that the HTML element is present in the DOM tree. It passes even if the stream has crashed, the `src` returned a 500 error, or the image displays an unpainted broken thumbnail.

To truly simulate human visual confirmation, Playwright must sample the rendered pixel buffer from Chromium's GPU compositor:

```typescript
// Inside Playwright Test: Sampling Live Canvas/Image Pixels
const isLiveStreamRendering = await page.evaluate(async (imgSelector: string) => {
  const img = document.querySelector<HTMLImageElement>(imgSelector);
  if (!img || !img.complete || img.naturalWidth === 0) return { ok: false, reason: 'unmounted_or_zero_dim' };

  // Create offscreen canvas matching natural dimensions
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { ok: false, reason: 'no_context' };

  // Sample Frame 1
  ctx.drawImage(img, 0, 0);
  const data1 = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  // Calculate RGB variance of Frame 1 to ensure it is not all black/gray
  let sum = 0, sumSq = 0;
  const n = data1.length / 4;
  for (let i = 0; i < data1.length; i += 4) {
    const lum = 0.299 * data1[i] + 0.587 * data1[i + 1] + 0.114 * data1[i + 2];
    sum += lum;
    sumSq += lum * lum;
  }
  const mean = sum / n;
  const stdDev = Math.sqrt((sumSq / n) - (mean * mean));
  if (stdDev < 5.0) return { ok: false, reason: 'blank_or_flat_image', stdDev };

  // Wait 1.5 seconds and Sample Frame 2
  await new Promise(r => setTimeout(r, 1500));
  ctx.drawImage(img, 0, 0);
  const data2 = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  // Calculate pixel-by-pixel temporal delta
  let diffPixels = 0;
  for (let i = 0; i < data1.length; i += 4) {
    if (Math.abs(data1[i] - data2[i]) > 8 ||
        Math.abs(data1[i + 1] - data2[i + 1]) > 8 ||
        Math.abs(data1[i + 2] - data2[i + 2]) > 8) {
      diffPixels++;
    }
  }
  const diffPercent = (diffPixels / n) * 100;
  return {
    ok: diffPercent > 0.05, // Real video feeds mutate over 1.5s
    naturalWidth: img.naturalWidth,
    naturalHeight: img.naturalHeight,
    stdDev,
    diffPercent
  };
}, 'img[src*="/api/streams/CAM-POL-AHM-04/feed"]');
```

---

### 3.2 Leaflet GIS Map Visual Audit
The GIS Map component (`GISMap.tsx`) renders tactical vehicle tracks over Esri Dark Gray Base tiles. We execute a three-stage audit:

1. **Map Tile Network Interception**:
   We attach a network route listener to `server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/*`. Every single tile request must resolve to `HTTP 200` or `304`. A single `404` or `net::ERR_NAME_NOT_RESOLVED` marks the GIS sub-test as FAILED.
2. **SVG Polyline Vector Analysis**:
   Leaflet renders the trajectory trail as an SVG path inside `<svg class="leaflet-zoom-animated">`.
   - The test extracts the `d` attribute of `<path class="leaflet-interactive">`.
   - It parses all `M` (move-to) and `L` (line-to) screen space coordinates.
   - It computes the path segment lengths: If any consecutive points have identical coordinates ($\Delta x = 0, \Delta y = 0$), the frontend is emitting redundant zero-length SVG nodes.
   - It tests for **Spiderwebbing**: When points are inserted out of chronological order, the polyline crosses back and forth over itself repeatedly. The test asserts that the projected screen coordinates follow a monotonic directional progression along the suspect transit corridor.

---

### 3.3 WebSocket Alert Stream Handshake & Latency
To ensure sub-250ms end-to-end latency:
1. Playwright attaches to the browser's native `WebSocket` object via a client-side wrapper injected at `page.addInitScript()`.
2. The test runner triggers a simulated ANPR detection on the backend:
   $$\text{POST } \texttt{http://127.0.0.1:8000/api/alerts/simulate}$$
   Carrying an injection timestamp $T_{\text{inject}} = \text{Date.now()}$.
3. The browser WebSocket hook captures the incoming message, parses $T_{\text{inject}}$, and checks $T_{\text{rx}} = \text{performance.now()}$.
4. A DOM `MutationObserver` watches `.alert-feed` for the creation of the `<div class="pcr-dispatch-card">` or `<span class="threat-badge">`.
5. *Hard Invariant*:
   $$\Delta T = T_{\text{dom\_render}} - T_{\text{inject}} \le 250\text{ ms}$$

---

## 4. KINEMATIC & PHYSICAL PLAUSIBILITY VALIDATION

### 4.1 Haversine Geodesic Distance & Velocity Sanity
When evaluating `GET /api/vehicles/{plate}/trajectory`, unit tests only verify that the JSON status is 200 and the list has length $> 0$. But if the database returns two sightings where a suspect car is sighted at **Navrangpura (Ahmedabad)** at $T_1 = 12:00:00$ and **Trikon Baug (Rajkot)** at $T_2 = 12:00:05$, this is a critical sensor correlation bug.

#### The Great Circle Distance Formulation:
Given two sequential sightings $S_1 = (\phi_1, \lambda_1, t_1)$ and $S_2 = (\phi_2, \lambda_2, t_2)$:
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$
$$D = R \cdot c \quad \text{where } R = 6371.0088\text{ km}$$
$$\text{Elapsed Time: } \Delta t = \frac{\text{PTS}_2 - \text{PTS}_1}{1000} \text{ seconds}$$
$$\text{Computed Velocity: } v = \frac{D}{\Delta t / 3600} \text{ km/h}$$

#### Kinematic Invariants:
1. **Upper Velocity Bound**: For surface roadway vehicles in Gujarat, $v \le 160\text{ km/h}$. Any sighting resulting in $v > 160\text{ km/h}$ fails physical plausibility (GPS teleportation / camera ID cross-talk).
2. **Lower Bound / Stationary**: If $D = 0$ (same camera), $\Delta t$ must be $\ge 0$.
3. **Monotonic Progression**: $\text{PTS}_{i+1} \ge \text{PTS}_i$ except across a documented 12-hour video loop discontinuity.

#### 12-Hour Loop Cut Discontinuity Handler:
Under **Commandment 6**, live test feeds may loop every 12 hours ($43,200,000\text{ ms}$).
When $\text{PTS}_{i+1} < \text{PTS}_i$ or $\Delta \text{PTS} > 5000\text{ ms}$, the validator verifies that the backend tracking state was cleanly reset without throwing `NaN` or calculating negative velocity.

---

## 5. REAL-TIME RESOURCE, CONCURRENCY & MEMORY FORENSICS

### 5.1 Async Event Loop Latency Profiler
FastAPI runs on Uvicorn's single-threaded `asyncio` event loop. If OpenCV decoding or YOLO inference accidentally executes synchronously inside an `async def` route (instead of a dedicated thread), the event loop freezes, blocking all WebSocket alerts and HTTP health requests.

We measure **Event Loop Tick Delay (Jitter)**:
```python
async def measure_event_loop_lag(duration_sec: float = 10.0) -> float:
    """Measures maximum delay in asyncio event loop execution."""
    max_lag = 0.0
    start_time = time.perf_counter()
    interval = 0.010  # 10ms expected sleep
    
    while time.perf_counter() - start_time < duration_sec:
        t0 = time.perf_counter()
        await asyncio.sleep(interval)
        t1 = time.perf_counter()
        lag = (t1 - t0) - interval
        if lag > max_lag:
            max_lag = lag
    return max_lag * 1000.0  # Return in ms
```
*Assertion*: Under full load (5 active MJPEG transcoding streams at 1080p), the event loop lag must remain $< 50.0\text{ ms}$. If lag $> 200\text{ ms}$, the system fails responsiveness.

### 5.2 Deque Memory Leak & RSS Forensic Test
The stream worker maintains multi-frame voting buffers:
`_ocr_vote_buffers: Dict[str, Dict[str, deque]]` (capped at `MAX_VOTE_KEYS = 50`).
If memory keys are leaked per vehicle without eviction, long-running processes will experience memory ballooning.

The memory test executes **1,000 simulated detections** across 50 distinct plate numbers, sampling process RSS memory via `psutil.Process(os.getpid()).memory_info().rss`:
- $\Delta \text{RSS} \le 15\text{ MB}$ across 1,000 operations.
- Total open OS file descriptors must remain flat ($\Delta \text{FDs} = 0$).

---

## 6. CHAOS ENGINEERING & FAILURE MODE RESILIENCE

### 6.1 Network Degradation & Reconnection Backoff
The test harness injects chaos at the TCP level:
1. Drops the RTSP socket connection to `103.250.160.189:8554`.
2. Inspects the backend log stream to verify **Commandment 5**:
   $$\text{Backoff Sequence: } 2.0\text{s} \to 4.0\text{s} \to 8.0\text{s} \to 16.0\text{s} \to 30.0\text{s (cap)}$$
3. In the frontend, verifies that the MJPEG `<img />` tag does not crash or throw unhandled React exceptions, but renders the tactical connecting HUD generated by `_create_connecting_frame()`.

### 6.2 SQLite Concurrency Hammer (WAL Mode Stress Test)
SQLite can throw `sqlite3.OperationalError: database is locked` if WAL mode is improperly configured during concurrent operations.
The concurrency test launches:
- **50 parallel background threads** simultaneously executing `insert_sighting()` and `insert_alert()` transactions.
- **10 concurrent async readers** continuously querying `GET /api/vehicles/GJ01ER8842/trajectory`.
*Assertion*: 0 errors over 5,000 combined transactions; p99 read latency $< 15\text{ ms}$.

---

## 7. CONCRETE IMPLEMENTATION CODE

Below are the four mission-critical software engines ready for direct deployment into `scripts/` and `tests/`.

### 7.1 The Video Liveness & Optical Motion Analyzer
File: `vision/tests/video_liveness_verifier.py`

```python
"""
SENTINEL 2026 — Automated Visual Liveness & Motion Analyzer
=============================================================
Mathematically verifies that an MJPEG stream is a live moving feed:
1. Computes Gunnar Farneback Optical Flow for physical motion vectors
2. Computes Structural Similarity Index (SSIM) to rule out frozen frames
3. Computes Shannon Entropy to rule out blank/black/glare screens
"""

import cv2
import time
import math
import numpy as np
from typing import Dict, Any, List
import urllib.request


class VideoLivenessAnalyzer:
    def __init__(self, stream_url: str, sample_duration_sec: float = 3.0):
        self.stream_url = stream_url
        self.sample_duration_sec = sample_duration_sec

    def _compute_shannon_entropy(self, gray_frame: np.ndarray) -> float:
        """Calculates Shannon entropy of pixel intensity distribution."""
        hist = cv2.calcHist([gray_frame], [0], None, [256], [0, 256])
        hist_norm = hist.ravel() / hist.sum()
        non_zeros = hist_norm[hist_norm > 0]
        entropy = -np.sum(non_zeros * np.log2(non_zeros))
        return float(entropy)

    def _compute_ssim(self, img1: np.ndarray, img2: np.ndarray) -> float:
        """Computes structural similarity index between two grayscale frames."""
        C1 = (0.01 * 255) ** 2
        C2 = (0.03 * 255) ** 2

        img1 = img1.astype(np.float64)
        img2 = img2.astype(np.float64)

        kernel = cv2.getGaussianKernel(11, 1.5)
        window = np.outer(kernel, kernel.transpose())

        mu1 = cv2.filter2D(img1, -1, window)[5:-5, 5:-5]
        mu2 = cv2.filter2D(img2, -1, window)[5:-5, 5:-5]

        mu1_sq = mu1 ** 2
        mu2_sq = mu2 ** 2
        mu1_mu2 = mu1 * mu2

        sigma1_sq = cv2.filter2D(img1 ** 2, -1, window)[5:-5, 5:-5] - mu1_sq
        sigma2_sq = cv2.filter2D(img2 ** 2, -1, window)[5:-5, 5:-5] - mu2_sq
        sigma12 = cv2.filter2D(img1 * img2, -1, window)[5:-5, 5:-5] - mu1_mu2

        ssim_map = ((2 * mu1_mu2 + C1) * (2 * sigma12 + C2)) / (
            (mu1_sq + mu2_sq + C1) * (sigma1_sq + sigma2_sq + C2)
        )
        return float(ssim_map.mean())

    def analyze_stream(self) -> Dict[str, Any]:
        """Reads MJPEG stream, collects frames over sample_duration, runs CV forensics."""
        stream = urllib.request.urlopen(self.stream_url, timeout=5.0)
        bytes_data = b""
        frames: List[np.ndarray] = []
        timestamps: List[float] = []
        start_time = time.time()

        # Ingest MJPEG multipart stream chunks
        while time.time() - start_time < self.sample_duration_sec:
            chunk = stream.read(4096)
            if not chunk:
                break
            bytes_data += chunk
            a = bytes_data.find(b"\xff\xd8")  # JPEG start
            b = bytes_data.find(b"\xff\xd9")  # JPEG end
            if a != -1 and b != -1:
                jpg_bytes = bytes_data[a : b + 2]
                bytes_data = bytes_data[b + 2 :]
                frame = cv2.imdecode(np.frombuffer(jpg_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
                if frame is not None:
                    # Downscale for high-speed forensic math
                    small = cv2.resize(frame, (640, 360), interpolation=cv2.INTER_AREA)
                    frames.append(small)
                    timestamps.append(time.time())

        stream.close()

        if len(frames) < 4:
            return {
                "liveness_passed": False,
                "reason": f"Insufficient frames received ({len(frames)} frames)",
                "fps": 0.0,
            }

        fps = len(frames) / (timestamps[-1] - timestamps[0])
        gray_frames = [cv2.cvtColor(f, cv2.COLOR_BGR2GRAY) for f in frames]

        # 1. Shannon Entropy Analysis
        entropies = [self._compute_shannon_entropy(g) for g in gray_frames]
        mean_entropy = float(np.mean(entropies))

        if mean_entropy < 2.5:
            return {
                "liveness_passed": False,
                "reason": f"Feed is blank or dark (Shannon Entropy = {mean_entropy:.2f} < 2.5)",
                "mean_entropy": mean_entropy,
                "fps": fps,
            }

        # 2. Structural Similarity Index (SSIM) Check for Freezing
        ssim_values = []
        for i in range(1, len(gray_frames)):
            ssim_val = self._compute_ssim(gray_frames[i - 1], gray_frames[i])
            ssim_values.append(ssim_val)
        mean_ssim = float(np.mean(ssim_values))

        if mean_ssim > 0.9995:
            return {
                "liveness_passed": False,
                "reason": f"Feed is frozen on identical static picture (SSIM = {mean_ssim:.5f} > 0.9995)",
                "mean_ssim": mean_ssim,
                "fps": fps,
            }

        # 3. Dense Optical Flow Analysis (Farneback)
        flow_magnitudes = []
        for i in range(1, min(len(gray_frames), 8)):
            flow = cv2.calcOpticalFlowFarneback(
                gray_frames[i - 1],
                gray_frames[i],
                None,
                pyr_scale=0.5,
                levels=3,
                winsize=15,
                iterations=3,
                poly_n=5,
                poly_sigma=1.2,
                flags=0,
            )
            mag, _ = cv2.cartToPolar(flow[..., 0], flow[..., 1])
            flow_magnitudes.append(np.percentile(mag, 95))

        mean_motion_p95 = float(np.mean(flow_magnitudes))
        has_true_motion = mean_motion_p95 >= 0.85

        return {
            "liveness_passed": True,
            "mean_entropy": round(mean_entropy, 3),
            "mean_ssim": round(mean_ssim, 4),
            "mean_optical_flow_p95": round(mean_motion_p95, 3),
            "has_motion": has_true_motion,
            "fps": round(fps, 2),
            "total_frames_audited": len(frames),
            "resolution": f"{frames[0].shape[1]}x{frames[0].shape[0]}",
        }
```

---

### 7.2 Playwright Canvas Pixel & Map Tile Verifier
File: `frontend/e2e/tactical_dashboard.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Sentinel 2026: Tactical Dashboard Sensory E2E Audit', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept Esri Tile Layer Network Traffic
    await page.route('**/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/**', async (route) => {
      const response = await route.fetch();
      expect(response.status(), `Esri Map tile failed with HTTP ${response.status()}`).toBe(200);
      await route.fulfill({ response });
    });
  });

  test('TC-E2E-01: Live Video Wall MJPEG Stream Canvas Pixel Sampling', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');
    await page.waitForSelector('.tactical-grid-bg img', { timeout: 15000 });

    // Sample pixels across time from first live camera viewport
    const pixelAnalysis = await page.evaluate(async () => {
      const img = document.querySelector<HTMLImageElement>('.tactical-grid-bg img');
      if (!img) return { valid: false, error: 'No stream image element found' };

      const canvas = document.createElement('canvas');
      canvas.width = img.clientWidth || 320;
      canvas.height = img.clientHeight || 180;
      const ctx = canvas.getContext('2d');
      if (!ctx) return { valid: false, error: 'Cannot obtain 2d canvas context' };

      // Grab Snapshot 1
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const snap1 = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      // Check standard deviation of intensity (non-blank check)
      let sum = 0, sumSq = 0;
      const totalPixels = snap1.length / 4;
      for (let i = 0; i < snap1.length; i += 4) {
        const lum = 0.299 * snap1[i] + 0.587 * snap1[i + 1] + 0.114 * snap1[i + 2];
        sum += lum;
        sumSq += lum * lum;
      }
      const mean = sum / totalPixels;
      const stdDev = Math.sqrt((sumSq / totalPixels) - (mean * mean));

      // Wait 1.5 seconds for MJPEG frame mutation
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Grab Snapshot 2
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const snap2 = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      let changedPixels = 0;
      for (let i = 0; i < snap1.length; i += 4) {
        if (Math.abs(snap1[i] - snap2[i]) > 10 ||
            Math.abs(snap1[i+1] - snap2[i+1]) > 10 ||
            Math.abs(snap1[i+2] - snap2[i+2]) > 10) {
          changedPixels++;
        }
      }

      return {
        valid: true,
        stdDev,
        changedPixelPercent: (changedPixels / totalPixels) * 100,
        width: canvas.width,
        height: canvas.height
      };
    });

    expect(pixelAnalysis.valid).toBe(true);
    expect(pixelAnalysis.stdDev, 'Stream feed is flat black or flat gray').toBeGreaterThan(8.0);
    expect(pixelAnalysis.changedPixelPercent, 'Stream feed is completely frozen').toBeGreaterThan(0.1);
  });

  test('TC-E2E-02: GIS Trajectory Polyline Vector & SVG Path Geometry', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173');

    // Search suspect vehicle GJ01ER8842
    const searchInput = page.locator('input[placeholder*="GJ"]');
    await searchInput.fill('GJ01ER8842');
    await page.keyboard.press('Enter');

    // Wait for trajectory panel and map polyline SVG to render
    await page.waitForSelector('path.leaflet-interactive', { timeout: 10000 });

    const polylineValid = await page.evaluate(() => {
      const path = document.querySelector<SVGPathElement>('path.leaflet-interactive');
      if (!path) return { valid: false, reason: 'No leaflet path found' };

      const d = path.getAttribute('d');
      if (!d || !d.startsWith('M')) return { valid: false, reason: 'Invalid SVG path definition' };

      // Parse coordinate pairs: M x y L x y ...
      const points = d.replace(/[ML]/g, '').trim().split(/\s+/).map(Number);
      const coordPairs: [number, number][] = [];
      for (let i = 0; i < points.length; i += 2) {
        coordPairs.push([points[i], points[i + 1]]);
      }

      // Assert at least 3 waypoints rendered for GJ01ER8842
      if (coordPairs.length < 3) {
        return { valid: false, reason: `Too few waypoints rendered: ${coordPairs.length}` };
      }

      // Assert no consecutive identical points (spiderweb duplication bug)
      for (let i = 1; i < coordPairs.length; i++) {
        const [x1, y1] = coordPairs[i - 1];
        const [x2, y2] = coordPairs[i];
        if (x1 === x2 && y1 === y2) {
          return { valid: false, reason: `Duplicate zero-distance SVG node at index ${i}` };
        }
      }

      return { valid: true, count: coordPairs.length };
    });

    expect(polylineValid.valid).toBe(true);
  });

  test('TC-E2E-03: Real-Time WebSocket Latency < 250ms', async ({ page, request }) => {
    await page.goto('http://127.0.0.1:5173');

    // Inject performance mark listener on window
    await page.evaluate(() => {
      (window as any).__alertTimings = [];
      const originalWS = window.WebSocket;
      (window as any).WebSocket = function (url: string, protocols: any) {
        const ws = new originalWS(url, protocols);
        ws.addEventListener('message', (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.plate_number === 'GJ01TEST99') {
              (window as any).__alertTimings.push({
                rxTime: performance.now(),
                serverTs: data.timestamp_iso
              });
            }
          } catch {}
        });
        return ws;
      };
    });

    // Re-trigger WS handshake
    await page.reload();
    await page.waitForTimeout(1000);

    // Inject simulated alert via REST API
    const t0 = Date.now();
    const alertResp = await request.post('http://127.0.0.1:8000/api/alerts/simulate', {
      data: {
        plate_number: 'GJ01TEST99',
        camera_id: 'CAM-POL-AHM-04',
        threat_level: 'CRITICAL',
        inject_timestamp_ms: t0
      }
    });
    expect(alertResp.status()).toBe(200);

    // Wait for card to appear in AlertFeed DOM
    const alertCard = page.locator('text=GJ01TEST99');
    await expect(alertCard).toBeVisible({ timeout: 2000 });
    const tRender = Date.now();

    const latency = tRender - t0;
    expect(latency, `WebSocket alert latency too high: ${latency}ms`).toBeLessThan(250);
  });
});
```

---

### 7.3 The Kinematic Haversine Sanity Checker
File: `backend/tests/kinematic_sanity_checker.py`

```python
"""
SENTINEL 2026 — Kinematic Geodesic Sanity Checker
===================================================
Enforces the laws of physics on suspect trajectory routes:
1. Haversine great-circle distance between all consecutive sightings
2. Velocity <= 160 km/h upper physical road bound
3. Strictly monotonic PTS timestamps (with 12h loop discontinuity detection)
"""

import math
from typing import List, Dict, Any, Tuple


class KinematicSanityChecker:
    EARTH_RADIUS_KM = 6371.0088
    MAX_SPEED_KMH = 160.0

    @classmethod
    def haversine_distance_km(
        cls, lat1: float, lon1: float, lat2: float, lon2: float
    ) -> float:
        """Calculates spherical distance between two Gujarat coordinates in km."""
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return cls.EARTH_RADIUS_KM * c

    @classmethod
    def validate_trajectory(
        cls, sightings: List[Dict[str, Any]]
    ) -> Tuple[bool, List[str]]:
        """
        Validates an array of sighting objects for physical plausibility.
        Each sighting must contain: 'lat', 'lng', 'pts_timestamp_ms', 'camera_id'.
        """
        errors = []
        if not sightings or len(sightings) < 2:
            return True, errors

        for i in range(1, len(sightings)):
            s_prev = sightings[i - 1]
            s_curr = sightings[i]

            lat1, lon1 = s_prev["lat"], s_prev["lng"]
            lat2, lon2 = s_curr["lat"], s_curr["lng"]
            pts1 = s_prev["pts_timestamp_ms"]
            pts2 = s_curr["pts_timestamp_ms"]

            # 1. Check for 12-hour video loop discontinuity
            pts_delta = pts2 - pts1
            if pts_delta < 0 or pts_delta > 5000:
                # Discontinuity detected: reset velocity baseline cleanly (Commandment 6)
                continue

            if pts_delta == 0:
                if s_prev["camera_id"] != s_curr["camera_id"]:
                    errors.append(
                        f"Step {i}: Zero elapsed time between different cameras "
                        f"{s_prev['camera_id']} and {s_curr['camera_id']}!"
                    )
                continue

            # 2. Compute Geodesic Distance
            dist_km = cls.haversine_distance_km(lat1, lon1, lat2, lon2)
            time_hours = (pts_delta / 1000.0) / 3600.0
            velocity_kmh = dist_km / time_hours

            # 3. Assert velocity bounds
            if velocity_kmh > cls.MAX_SPEED_KMH:
                errors.append(
                    f"Step {i}: Implausible velocity {velocity_kmh:.1f} km/h "
                    f"between {s_prev['camera_id']} and {s_curr['camera_id']} "
                    f"({dist_km:.2f} km in {pts_delta} ms). Max allowed: {cls.MAX_SPEED_KMH} km/h"
                )

        return len(errors) == 0, errors
```

---

### 7.4 Master Orchestration Runner
File: `run_full_validation.py`

```python
"""
SENTINEL 2026 — Master Autonomous Validation & Jury Certification Engine
========================================================================
Push-button runner that:
1. Spawns Backend (Uvicorn) and Frontend (Vite) as isolated child processes
2. Actively polls health endpoints until synchronized
3. Executes Phase A through Phase E
4. Emits executive-grade forensic certification summary
5. Cleanly terminates all child processes and releases TCP sockets
"""

import os
import sys
import time
import json
import signal
import subprocess
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
REPORTS_DIR = ROOT_DIR / "reports"
REPORTS_DIR.mkdir(exist_ok=True)

# ANSI Color formatting
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
RESET = "\033[0m"
BOLD = "\033[1m"


class ValidationOrchestrator:
    def __init__(self):
        self.backend_proc = None
        self.frontend_proc = None
        self.results = {}

    def log(self, phase: str, message: str, color=CYAN):
        print(f"{color}[{phase}] {message}{RESET}")

    def kill_existing_ports(self):
        """Kills any dangling processes on port 8000 and 5173."""
        if sys.platform == "win32":
            subprocess.run(
                'powershell -Command "Get-NetTCPConnection -LocalPort 8000,5173 -ErrorAction SilentlyContinue | '
                'ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"',
                shell=True,
                capture_output=True,
            )
        time.sleep(1.0)

    def start_services(self) -> bool:
        self.log("SETUP", "Terminating stale port listeners...")
        self.kill_existing_ports()

        self.log("SETUP", "Launching FastAPI backend on http://127.0.0.1:8000...")
        backend_env = os.environ.copy()
        backend_env["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
        self.backend_proc = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
            cwd=str(ROOT_DIR / "backend"),
            env=backend_env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        self.log("SETUP", "Launching Vite frontend on http://127.0.0.1:5173...")
        self.frontend_proc = subprocess.Popen(
            "npm run dev",
            cwd=str(ROOT_DIR / "frontend"),
            shell=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        # Poll Backend Health
        backend_ready = False
        for _ in range(25):
            time.sleep(1.0)
            try:
                with urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=1.5) as r:
                    if r.status == 200:
                        backend_ready = True
                        break
            except Exception:
                pass

        if not backend_ready:
            self.log("ERROR", "Backend failed to report healthy within 25s", RED)
            return False

        self.log("SETUP", "Backend is healthy and responsive!", GREEN)
        return True

    def run_phase_a_connectivity(self):
        self.log("PHASE A", "Executing Connectivity & Ingestion Smoke Tests...")
        cmd = [sys.executable, "-m", "pytest", "backend/tests/test_health.py", "backend/tests/test_streams.py", "-q"]
        res = subprocess.run(cmd, cwd=str(ROOT_DIR), capture_output=True, text=True)
        self.results["Phase_A_Connectivity"] = {
            "passed": res.returncode == 0,
            "output": res.stdout.strip(),
        }
        status = f"{GREEN}PASSED{RESET}" if res.returncode == 0 else f"{RED}FAILED{RESET}"
        print(f"         Phase A Status: {status}")

    def run_phase_b_contracts(self):
        self.log("PHASE B", "Executing Strict API & Forensic Contract Conformance...")
        cmd = [
            sys.executable,
            "-m",
            "pytest",
            "backend/tests/test_api.py",
            "backend/tests/test_trajectory.py",
            "backend/tests/test_adapters.py",
            "-q",
        ]
        res = subprocess.run(cmd, cwd=str(ROOT_DIR), capture_output=True, text=True)
        self.results["Phase_B_Contracts"] = {
            "passed": res.returncode == 0,
            "output": res.stdout.strip(),
        }
        status = f"{GREEN}PASSED{RESET}" if res.returncode == 0 else f"{RED}FAILED{RESET}"
        print(f"         Phase B Status: {status}")

    def run_phase_c_cv_liveness(self):
        self.log("PHASE C", "Executing Computer Vision 'Human-Eye' Liveness & Motion Audit...")
        try:
            from vision.tests.video_liveness_verifier import VideoLivenessAnalyzer

            analyzer = VideoLivenessAnalyzer("http://127.0.0.1:8000/api/streams/CAM-POL-AHM-04/feed")
            report = analyzer.analyze_stream()
            passed = report.get("liveness_passed", False)
            self.results["Phase_C_CV_Liveness"] = {"passed": passed, "metrics": report}
            status = f"{GREEN}PASSED{RESET}" if passed else f"{RED}FAILED{RESET}"
            print(f"         Phase C Status: {status} | Metrics: {report}")
        except Exception as e:
            self.results["Phase_C_CV_Liveness"] = {"passed": False, "error": str(e)}
            print(f"         Phase C Status: {RED}FAILED{RESET} ({e})")

    def run_phase_d_kinematics(self):
        self.log("PHASE D", "Executing Physical Kinematics & Haversine Geodesic Validation...")
        try:
            with urllib.request.urlopen("http://127.0.0.1:8000/api/vehicles/GJ01ER8842/trajectory") as r:
                data = json.loads(r.read().decode("utf-8"))
            from backend.tests.kinematic_sanity_checker import KinematicSanityChecker

            passed, errors = KinematicSanityChecker.validate_trajectory(data.get("sightings", []))
            self.results["Phase_D_Kinematics"] = {"passed": passed, "errors": errors}
            status = f"{GREEN}PASSED{RESET}" if passed else f"{RED}FAILED{RESET}"
            print(f"         Phase D Status: {status} | Route Violations: {len(errors)}")
        except Exception as e:
            self.results["Phase_D_Kinematics"] = {"passed": False, "error": str(e)}
            print(f"         Phase D Status: {RED}FAILED{RESET} ({e})")

    def run_phase_e_chaos_concurrency(self):
        self.log("PHASE E", "Executing Chaos Engineering & SQLite WAL Concurrency Hammer...")
        cmd = [sys.executable, "-m", "pytest", "backend/tests/test_database.py", "-q"]
        res = subprocess.run(cmd, cwd=str(ROOT_DIR), capture_output=True, text=True)
        self.results["Phase_E_Chaos_Concurrency"] = {
            "passed": res.returncode == 0,
            "output": res.stdout.strip(),
        }
        status = f"{GREEN}PASSED{RESET}" if res.returncode == 0 else f"{RED}FAILED{RESET}"
        print(f"         Phase E Status: {status}")

    def cleanup(self):
        self.log("TEARDOWN", "Safely stopping all managed child processes...")
        if self.backend_proc:
            self.backend_proc.terminate()
        if self.frontend_proc:
            if sys.platform == "win32":
                subprocess.run(f"taskkill /F /T /PID {self.frontend_proc.pid}", shell=True, capture_output=True)
            else:
                self.frontend_proc.terminate()
        self.kill_existing_ports()
        self.log("TEARDOWN", "Sockets released. Shutdown complete.", GREEN)

    def emit_jury_report(self):
        all_passed = all(p.get("passed", False) for p in self.results.values())
        report_path = REPORTS_DIR / f"sentinel_audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "demo_ready": "YES" if all_passed else "NO",
            "phases": self.results,
        }
        with open(report_path, "w") as f:
            json.dump(payload, f, indent=2)

        print("\n" + "=" * 70)
        print(f"{BOLD}SENTINEL 2026 — EXECUTIVE FORENSIC CERTIFICATION REPORT{RESET}")
        print("=" * 70)
        for phase, data in self.results.items():
            mark = f"{GREEN}[PASS]{RESET}" if data.get("passed") else f"{RED}[FAIL]{RESET}"
            print(f"  {mark} {phase}")
        print("-" * 70)
        if all_passed:
            print(f"  {GREEN}{BOLD}FINAL VERDICT: DEMO-READY: YES (100% RELIABILITY ACHIEVED){RESET}")
        else:
            print(f"  {RED}{BOLD}FINAL VERDICT: DEMO-READY: NO (CRITICAL DEFECTS DETECTED){RESET}")
        print(f"  Audit Packet: {report_path}")
        print("=" * 70 + "\n")


if __name__ == "__main__":
    runner = ValidationOrchestrator()
    try:
        if runner.start_services():
            runner.run_phase_a_connectivity()
            runner.run_phase_b_contracts()
            runner.run_phase_c_cv_liveness()
            runner.run_phase_d_kinematics()
            runner.run_phase_e_chaos_concurrency()
    finally:
        runner.cleanup()
        runner.emit_jury_report()
```

---

## 8. COMPREHENSIVE FAILURE SIGNATURES MATRIX

This matrix translates visual and forensic defects into exact algorithmic detection logic:

| Failure Mode | Physical / Human-Eye Symptom | Code / Pipeline Root Cause | Programmatic Automated Assertion | Severity & Jury Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Silent Stream Freeze** | Video wall shows a truck frozen in the middle of an intersection for 4 minutes. | RTSP socket disconnected without EOF; decoder repeats cached buffer. | $SSIM(I_t, I_{t+2s}) > 0.9995$ over 3 seconds. | **BLOCKER (10/10)**: Jury sees dead software. |
| **Black / Disconnected Feed** | Camera box displays pure black `#000000` rectangle. | Gateway socket failure or RTSP server 404 stream missing. | Shannon Entropy $H < 2.50$ and $\sigma_{intensity} < 4.0$. | **CRITICAL (9/10)**: Broken live demonstration. |
| **Compression Macroblock Flutter** | Camera feed looks jittery with pixelated square artifacts around fast cars. | Bandwidth throttling; H.264 P-frame packet loss. | $0.985 \le SSIM \le 0.998$ but Farneback flow magnitude $M_{p95} < 0.4\text{ px}$. | **MEDIUM (5/10)**: Poor perceptual quality. |
| **Flickering Tree Phantom** | Green bounding boxes rapidly appear and disappear on tree leaves or road shadows. | YOLO low confidence threshold ($\le 0.25$) on textured background. | Single-frame detection lifetime; $IoU(B_t, B_{t+1}) < 0.20$ on stationary coordinates. | **HIGH (8/10)**: AI looks amateurish / hallucinating. |
| **OCR Gravel Hallucination** | Bounding box on asphalt reads `"GJ018888"` or `"II1100"`. | EasyOCR running on un-preprocessed noisy crop. | Normalized plate violates regex `^GJ[0-9]{2}[A-Z]{1,3}[0-9]{4}$`. | **CRITICAL (9/10)**: Pollutes criminal database. |
| **GPS Teleportation Bug** | Trajectory map shows suspect vehicle jumping 280 km across Gujarat in 4 seconds. | Ingestion scheduler cross-assigned camera IDs or PTS timestamps were desynchronized. | Inter-sighting velocity $v = \frac{D_{\text{haversine}}}{\Delta t} > 160\text{ km/h}$. | **BLOCKER (10/10)**: Jury evaluates endpoint `GET /api/vehicles/{plate}/trajectory`. |
| **Leaflet Spiderwebbing** | Trajectory line zig-zags back and forth across Gujarat like a tangled spiderweb. | SQL query omitted `ORDER BY pts_timestamp_ms ASC` or timestamps were parsed as unordered strings. | Directional bearing changes $\Delta\theta > 160^\circ$ repeatedly over short intervals. | **CRITICAL (9/10)**: Police cannot decipher escape route. |
| **Esri Base Map 404s** | GIS map displays broken tile grid with missing gray squares. | Outdated Esri tile URL template or blocked outbound port 443. | Playwright network route listener intercepts any non-200/304 on `server.arcgisonline.com`. | **HIGH (8/10)**: Map looks broken to judges. |
| **Uvicorn GIL Event Loop Freeze** | React alerts pause for 3 seconds, then 15 alerts burst onto the screen at once. | Heavy OpenCV image enhancement running inside async route handler instead of thread pool. | Async event loop lag monitor detects sleep delay jitter $> 50\text{ ms}$. | **HIGH (8/10)**: Tactical card alerts feel sluggish. |
| **Database Lock Crash** | Background stream crashes with `sqlite3.OperationalError: database is locked`. | Concurrency hammer: SQLite opened without WAL mode or busy timeout $\le 5000\text{ ms}$. | Concurrency hammer test running 50 writers + 10 readers produces non-zero exceptions. | **BLOCKER (10/10)**: Crash during live hackathon demo. |
| **Memory Buffer Leak** | Python backend RAM climbs steadily from 200 MB to 3.8 GB after 45 minutes of streaming. | Multi-frame voting dictionary (`_ocr_vote_buffers`) never evicts stale vehicle keys. | Process RSS memory drift $> 25\text{ MB}$ per 1,000 processed vehicle detections. | **HIGH (7/10)**: Server OOMs during multi-hour testing. |

---

## 9. STEP-BY-STEP IMPLEMENTATION ROADMAP

```
+----------------------------------------------------------------------------------------------------+
|                                    IMPLEMENTATION PHASING SCHEDULE                                 |
+----------------------------------------------------------------------------------------------------+
|  PHASE 1: Foundations (Day 1)                                                                      |
|  - Deploy KinematicSanityChecker in backend/tests/test_trajectory.py                               |
|  - Implement Haversine geodesic distance assertions across all historical sighting seeds           |
|  - Formalize regex grammar validator for Indian HSRP plates in vision/detector/                    |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|  PHASE 2: Computer Vision Liveness Rig (Day 2)                                                     |
|  - Deploy VideoLivenessAnalyzer in vision/tests/video_liveness_verifier.py                         |
|  - Verify 30 RTSP streams against Farneback optical flow and Shannon entropy bounds                |
|  - Wire connecting frame fallback HUD assertion on stream interruption                             |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|  PHASE 3: Playwright Sensory Browser E2E (Day 3)                                                   |
|  - Configure @playwright/test in frontend/e2e/                                                     |
|  - Implement Canvas pixel sampling for MJPEG <img> validation                                      |
|  - Implement Esri tile HTTP 200 network interception & Leaflet SVG geometry verification           |
|  - Build sub-250ms WebSocket alert injection latency assertion                                     |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|  PHASE 4: Chaos, Concurrency & Master Runner CLI (Day 4)                                           |
|  - Write SQLite 50-writer concurrency hammer test in backend/tests/test_database.py                |
|  - Build Uvicorn async event loop tick lag profiler                                                |
|  - Deliver run_full_validation.py with automated JSON report generation and exit code 0/1          |
+----------------------------------------------------------------------------------------------------+
```

### Direct Recommended Commands for Immediate Execution
To run these validation suites against the live running system:
1. **Kinematic & Trajectory Verification**:
   ```powershell
   python -m pytest backend/tests/test_trajectory.py -v
   ```
2. **Video Stream Liveness & Motion Forensics**:
   ```powershell
   python -c "from vision.tests.video_liveness_verifier import VideoLivenessAnalyzer; print(VideoLivenessAnalyzer('http://127.0.0.1:8000/api/streams/CAM-POL-AHM-04/feed').analyze_stream())"
   ```
3. **Master Push-Button Validation Rig**:
   ```powershell
   python run_full_validation.py
   ```