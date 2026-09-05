---
name: sentinel-pts-tracker
description: Step-by-step implementation guide for Presentation Timestamp (PTS) driven Kalman filter tracking, variable dt kinematics, 12-hour loop cut detection, and track management.
---

# Sentinel PTS-Only Kalman Tracker Skill

## Overview
Surveillance video streams delivered across government gateways and sandbox environments experience network packet bursting, variable frame intervals, and looped 12-hour synthetic cuts. Standard computer vision trackers that assume a fixed `1/FPS` time step fail catastrophically because frame arrival time does NOT correspond to real presentation time.

This skill implements a **PTS-Only Kalman Tracker** where the physical time delta $\Delta t$ is computed strictly from the container's Presentation Timestamp (`cv2.CAP_PROP_POS_MSEC`). Furthermore, it guards against 12-hour feed discontinuities (`|PTS_delta| > 5000ms`) by resetting filter states cleanly.

---

## Kinematics & State Vector

The tracker models each detected vehicle or license plate with a 6-dimensional continuous kinematic state vector:
$$\mathbf{x} = [x, y, w, h, v_x, v_y]^T$$

Where:
- $(x, y)$ is the geometric center of the bounding box
- $w, h$ are bounding box width and height
- $v_x, v_y$ are horizontal and vertical velocities in pixels per second

### State Transition Matrix $F(\Delta t)$
Given elapsed presentation time $\Delta t = \frac{PTS_{t} - PTS_{t-1}}{1000.0}$ (in seconds):

$$F(\Delta t) = \begin{bmatrix}
1 & 0 & 0 & 0 & \Delta t & 0 \\
0 & 1 & 0 & 0 & 0 & \Delta t \\
0 & 0 & 1 & 0 & 0 & 0 \\
0 & 0 & 0 & 1 & 0 & 0 \\
0 & 0 & 0 & 0 & 1 & 0 \\
0 & 0 & 0 & 0 & 0 & 1
\end{bmatrix}$$

### Measurement Matrix $H$
The ANPR detector observes the bounding box $[x, y, w, h]$:
$$H = \begin{bmatrix}
1 & 0 & 0 & 0 & 0 & 0 \\
0 & 1 & 0 & 0 & 0 & 0 \\
0 & 0 & 1 & 0 & 0 & 0 \\
0 & 0 & 0 & 1 & 0 & 0
\end{bmatrix}$$

---

## Step 1: Presentation Timestamp Extraction

Always extract the PTS directly from the video capture object:

```python
import cv2

def get_frame_pts(cap: cv2.VideoCapture) -> float:
    """Extract Presentation Timestamp in milliseconds."""
    return float(cap.get(cv2.CAP_PROP_POS_MSEC))
```

---

## Step 2: Kalman Track Implementation

```python
import numpy as np
from typing import List, Tuple, Optional

class SingleTrack:
    """Individual vehicle/plate track governed by PTS Kalman filtering."""
    
    def __init__(self, track_id: int, bbox: List[float], pts_ms: float):
        self.track_id = track_id
        self.last_pts_ms = pts_ms
        self.hits = 1
        self.age = 1
        self.time_since_update = 0
        self.plates: List[str] = []
        
        # State vector: [x, y, w, h, vx, vy]
        x1, y1, x2, y2 = bbox
        w = max(1.0, float(x2 - x1))
        h = max(1.0, float(y2 - y1))
        x = float(x1) + w / 2.0
        y = float(y1) + h / 2.0
        
        self.x = np.array([x, y, w, h, 0.0, 0.0], dtype=np.float64)
        
        # State covariance P
        self.P = np.diag([10.0, 10.0, 10.0, 10.0, 100.0, 100.0])
        
        # Measurement matrix H
        self.H = np.zeros((4, 6), dtype=np.float64)
        self.H[0, 0] = 1.0
        self.H[1, 1] = 1.0
        self.H[2, 2] = 1.0
        self.H[3, 3] = 1.0
        
        # Measurement noise R
        self.R = np.diag([4.0, 4.0, 10.0, 10.0])
        
        # Base process noise acceleration variance
        self.sigma_a = 50.0  # pixels/s^2

    def predict(self, current_pts_ms: float) -> np.ndarray:
        """Predict forward to current_pts_ms using exact dt."""
        dt = (current_pts_ms - self.last_pts_ms) / 1000.0
        if dt < 0.0:
            dt = 0.033  # fallback if jitter occurs
            
        # State transition matrix F
        F = np.eye(6, dtype=np.float64)
        F[0, 4] = dt
        F[1, 5] = dt
        
        # Process noise covariance Q (continuous white noise acceleration)
        dt2 = dt * dt
        dt3 = dt2 * dt / 2.0
        dt4 = dt2 * dt2 / 4.0
        Q = np.zeros((6, 6), dtype=np.float64)
        Q[0, 0] = dt4 * self.sigma_a
        Q[0, 4] = dt3 * self.sigma_a
        Q[4, 0] = dt3 * self.sigma_a
        Q[4, 4] = dt2 * self.sigma_a
        Q[1, 1] = dt4 * self.sigma_a
        Q[1, 5] = dt3 * self.sigma_a
        Q[5, 1] = dt3 * self.sigma_a
        Q[5, 5] = dt2 * self.sigma_a
        Q[2, 2] = 1.0 * dt
        Q[3, 3] = 1.0 * dt

        self.x = F @ self.x
        self.P = F @ self.P @ F.T + Q
        self.last_pts_ms = current_pts_ms
        self.age += 1
        self.time_since_update += 1
        return self.get_bbox()

    def update(self, bbox: List[float], plate: Optional[str] = None):
        """Update filter with new detection measurement."""
        x1, y1, x2, y2 = bbox
        w = max(1.0, float(x2 - x1))
        h = max(1.0, float(y2 - y1))
        x = float(x1) + w / 2.0
        y = float(y1) + h / 2.0
        z = np.array([x, y, w, h], dtype=np.float64)
        
        # Innovation y
        y_innov = z - (self.H @ self.x)
        S = self.H @ self.P @ self.H.T + self.R
        K = self.P @ self.H.T @ np.linalg.inv(S)
        
        self.x = self.x + (K @ y_innov)
        I = np.eye(6, dtype=np.float64)
        self.P = (I - K @ self.H) @ self.P
        
        self.hits += 1
        self.time_since_update = 0
        if plate:
            self.plates.append(plate)

    def get_bbox(self) -> List[float]:
        """Convert state [x, y, w, h] back to [x1, y1, x2, y2]."""
        x, y, w, h = self.x[0], self.x[1], max(1.0, self.x[2]), max(1.0, self.x[3])
        return [x - w / 2.0, y - h / 2.0, x + w / 2.0, y + h / 2.0]

    def get_best_plate(self) -> str:
        """Return highest frequency recognized license plate."""
        if not self.plates:
            return ""
        return max(set(self.plates), key=self.plates.count)
```

---

## Step 3: Multi-Object PTS Tracker with Loop Discontinuity Reset

```python
import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

def compute_iou(boxA: List[float], boxB: List[float]) -> float:
    """Compute Intersection over Union between two boxes [x1, y1, x2, y2]."""
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])
    interArea = max(0.0, xB - xA) * max(0.0, yB - yA)
    if interArea == 0.0:
        return 0.0
    boxAArea = max(1.0, (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]))
    boxBArea = max(1.0, (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]))
    return interArea / float(boxAArea + boxBArea - interArea)

class PTSKalmanTracker:
    """Manages multi-target tracking purely synchronized to stream PTS timestamps."""
    
    def __init__(self, iou_threshold: float = 0.3, max_age: int = 5):
        self.iou_threshold = iou_threshold
        self.max_age = max_age
        self.tracks: List[SingleTrack] = []
        self.next_track_id = 1
        self.last_pts_ms: Optional[float] = None

    def reset(self, reason: str = "Discontinuity"):
        """Cleanly clear active tracks to prevent velocity explosion."""
        logger.warning(f"Resetting PTS Kalman Tracker state: {reason}")
        self.tracks.clear()
        self.last_pts_ms = None

    def update(
        self, 
        detections: List[Dict[str, Any]], 
        current_pts_ms: float
    ) -> List[Dict[str, Any]]:
        """Update tracker with frame detections at current PTS timestamp.
        
        Handles 12-hour loop discontinuity:
        If PTS jumps backward or forward by > 5000ms, reset all track state.
        """
        # 1. 12-Hour loop discontinuity detection (Commandment 6)
        if self.last_pts_ms is not None:
            pts_delta = current_pts_ms - self.last_pts_ms
            if abs(pts_delta) > 5000.0 or pts_delta < 0.0:
                self.reset(f"PTS jump detected (delta={pts_delta:.1f}ms). Resetting state.")

        self.last_pts_ms = current_pts_ms

        # 2. Predict forward all existing tracks to current_pts_ms
        for trk in self.tracks:
            trk.predict(current_pts_ms)

        # 3. Associate detections with existing tracks using IoU
        det_boxes = [d["bbox"] for d in detections]
        det_plates = [d.get("license_plate", "") for d in detections]
        
        matched_tracks = set()
        matched_dets = set()
        
        if len(self.tracks) > 0 and len(det_boxes) > 0:
            iou_matrix = np.zeros((len(self.tracks), len(det_boxes)), dtype=np.float32)
            for t_idx, trk in enumerate(self.tracks):
                trk_box = trk.get_bbox()
                for d_idx, det_box in enumerate(det_boxes):
                    iou_matrix[t_idx, d_idx] = compute_iou(trk_box, det_box)

            # Greedy matching
            while True:
                max_val = np.max(iou_matrix) if iou_matrix.size > 0 else 0.0
                if max_val < self.iou_threshold:
                    break
                t_idx, d_idx = np.unravel_index(np.argmax(iou_matrix), iou_matrix.shape)
                
                self.tracks[t_idx].update(det_boxes[d_idx], det_plates[d_idx])
                matched_tracks.add(t_idx)
                matched_dets.add(d_idx)
                
                iou_matrix[t_idx, :] = -1.0
                iou_matrix[:, d_idx] = -1.0

        # 4. Initialize new tracks for unmatched detections
        for d_idx, det in enumerate(detections):
            if d_idx not in matched_dets:
                new_track = SingleTrack(self.next_track_id, det["bbox"], current_pts_ms)
                if det.get("license_plate"):
                    new_track.plates.append(det["license_plate"])
                self.tracks.append(new_track)
                self.next_track_id += 1

        # 5. Filter dead tracks
        self.tracks = [t for t in self.tracks if t.time_since_update <= self.max_age]

        # 6. Format active confirmed track output
        active_outputs = []
        for t in self.tracks:
            if t.hits >= 1:
                active_outputs.append({
                    "track_id": t.track_id,
                    "bbox": [round(c, 1) for c in t.get_bbox()],
                    "license_plate": t.get_best_plate(),
                    "velocity": [round(t.x[4], 2), round(t.x[5], 2)],
                    "pts_timestamp_ms": int(current_pts_ms)
                })

        return active_outputs
```

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Using Fixed Framerate `1 / CAP_PROP_FPS`
```python
# ❌ NEVER use 1 / fps for dt
fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
dt = 1.0 / fps  # Completely wrong on sub-sampled RTSP or gateway keyframe bursts
```
*Why it fails*: Real surveillance feeds drop frames or arrive in bursts. Using fixed 33ms when actual time elapsed was 1000ms (1 FPS sub-sampling) under-predicts target position by 30x, causing track loss.

### ❌ Anti-Pattern 2: Using Wall-Clock `time.time()`
```python
# ❌ NEVER use wall-clock time
current_time = time.time()
dt = current_time - last_time
```
*Why it fails*: If the RTSP client buffers 5 frames and drains them in 2ms, $dt = 0.0004s$. The Kalman velocity calculation spikes to infinity ($v = \Delta x / \Delta t$).

### ❌ Anti-Pattern 3: Ignoring 12-Hour Loop Discontinuity
```python
# ❌ NEVER let dt go wildly negative or explode past 5 seconds
dt = (current_pts - last_pts) / 1000.0  # If feed loops: 43200000ms -> 0ms, dt = -43200s!
```
*Why it fails*: Covariance matrices invert improperly with negative $dt$, or produce NaN coordinates when $dt$ is massive, crashing the tracking thread.

---

## Validation Test

```bash
python -c "
import numpy as np

# Test 12-hour loop reset behavior
class DummyTracker:
    def __init__(self):
        self.last_pts = None
        self.resets = 0
    def update_pts(self, pts):
        if self.last_pts is not None and (abs(pts - self.last_pts) > 5000 or pts < self.last_pts):
            self.resets += 1
            self.last_pts = None
        self.last_pts = pts

tracker = DummyTracker()
tracker.update_pts(1000)
tracker.update_pts(2000)
tracker.update_pts(3000)
assert tracker.resets == 0, 'Should not reset on normal step'

# Simulate 12-hour loop cut (abrupt drop back to 0)
tracker.update_pts(0)
assert tracker.resets == 1, 'Should reset when loop discontinuity occurs'

# Simulate forward jump > 5000ms
tracker.update_pts(10000)
assert tracker.resets == 2, 'Should reset on forward jump > 5000ms'

print('PASS: PTS loop discontinuity test succeeded.')
"
```
