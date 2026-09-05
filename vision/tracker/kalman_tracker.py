"""Sentinel Vision Engine - PTS Kalman Tracker.

Kinematic multi-object tracking strictly synchronized to stream Presentation
Timestamps (PTS). Operates with variable dt, protects against 12-hour feed loop
discontinuities, and infers directional heading from velocity vectors.
"""

import math
import os
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple

# MANDATORY STREAM RULE: TCP transport must be set before any cv2 import
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

import numpy as np


@dataclass
class Track:
    """Individual vehicle/license plate track governed by PTS Kalman filtering."""

    track_id: str
    state: np.ndarray  # [x, y, w, h, vx, vy] (center x,y, dimensions w,h, velocities vx,vy)
    covariance: np.ndarray  # 6x6 state error covariance matrix
    last_pts_ms: float  # Presentation timestamp in milliseconds
    age: int = 0  # Total lifespan in frames/updates
    hits: int = 0  # Total matched detections
    misses: int = 0  # Consecutive missed frames
    plate_text: str = ""  # Recognized license plate registration

    @property
    def bbox(self) -> List[float]:
        """Return bounding box [center_x, center_y, width, height]."""
        return [
            float(self.state[0]),
            float(self.state[1]),
            float(self.state[2]),
            float(self.state[3]),
        ]

    @property
    def velocity(self) -> List[float]:
        """Return velocity vector [vx, vy] in pixels per second."""
        return [float(self.state[4]), float(self.state[5])]


class KalmanTracker:
    """PTS-only Kalman tracker for license plate tracking.

    Uses Presentation Timestamps exclusively for dt calculation.
    Handles 12-hour feed loop discontinuities by resetting state.
    """

    DISCONTINUITY_THRESHOLD_MS: float = 5000.0  # PTS jump > 5s = loop cut
    MAX_MISSES: int = 5  # Remove track after 5 consecutive misses
    IOU_THRESHOLD: float = 0.3  # Minimum IoU for association

    def __init__(self) -> None:
        self.tracks: Dict[str, Track] = {}
        self.last_pts_ms: Optional[float] = None
        self._next_id: int = 1

        # Process noise diagonal: [x, y, w, h, vx, vy]
        self.process_noise: np.ndarray = np.diag([10.0, 10.0, 5.0, 5.0, 100.0, 100.0]).astype(float)

        # Measurement noise diagonal: [x, y, w, h]
        self.measurement_noise: np.ndarray = np.diag([5.0, 5.0, 5.0, 5.0]).astype(float)

        # Measurement matrix H mapping 6D state to 4D measurement [x, y, w, h]
        self.measurement_matrix: np.ndarray = np.zeros((4, 6), dtype=float)
        self.measurement_matrix[0, 0] = 1.0
        self.measurement_matrix[1, 1] = 1.0
        self.measurement_matrix[2, 2] = 1.0
        self.measurement_matrix[3, 3] = 1.0

    def _parse_bbox(self, det_or_bbox: Any) -> List[float]:
        """Extract [x, y, w, h] from detection dictionary or raw list."""
        if isinstance(det_or_bbox, dict):
            if "bbox" in det_or_bbox:
                raw = det_or_bbox["bbox"]
            elif all(k in det_or_bbox for k in ("x", "y", "w", "h")):
                return [
                    float(det_or_bbox["x"]),
                    float(det_or_bbox["y"]),
                    float(det_or_bbox["w"]),
                    float(det_or_bbox["h"]),
                ]
            else:
                raise ValueError(f"Cannot extract bounding box from detection: {det_or_bbox}")
        else:
            raw = det_or_bbox

        if len(raw) != 4:
            raise ValueError(f"Expected 4 bounding box elements [x, y, w, h], got {len(raw)}: {raw}")

        return [float(raw[0]), float(raw[1]), float(raw[2]), float(raw[3])]

    def _check_discontinuity(self, pts_ms: float) -> bool:
        """Detect 12-hour loop cut. If detected, RESET all tracks.

        Triggers when PTS jumps backward or forward by more than DISCONTINUITY_THRESHOLD_MS (5000ms).
        """
        if self.last_pts_ms is not None:
            delta = pts_ms - self.last_pts_ms
            if abs(delta) > self.DISCONTINUITY_THRESHOLD_MS or delta < 0:
                self.reset()
                return True
        return False

    def reset(self) -> None:
        """Full state reset on discontinuity."""
        self.tracks.clear()
        self.last_pts_ms = None

    def _predict(self, track: Track, dt: float) -> Track:
        """Predict track state forward by dt seconds using constant velocity model."""
        if dt <= 0.0:
            return track

        # State transition matrix F with variable dt
        F = np.eye(6, dtype=float)
        F[0, 4] = dt
        F[1, 5] = dt

        # Process noise covariance Q scaled by dt
        Q = self.process_noise * dt

        track.state = F @ track.state
        track.covariance = F @ track.covariance @ F.T + Q
        return track

    def _update_track(self, track: Track, detection: dict, pts_ms: float) -> Track:
        """Kalman measurement update."""
        bbox = self._parse_bbox(detection)
        z = np.array(bbox, dtype=float)

        H = self.measurement_matrix
        # Innovation y
        y = z - (H @ track.state)
        # Innovation covariance S
        S = H @ track.covariance @ H.T + self.measurement_noise
        # Kalman gain K
        K = track.covariance @ H.T @ np.linalg.inv(S)

        # Updated state
        track.state = track.state + (K @ y)
        # Updated covariance
        I = np.eye(6, dtype=float)
        track.covariance = (I - K @ H) @ track.covariance

        track.last_pts_ms = pts_ms
        track.hits += 1
        track.misses = 0
        track.age += 1

        # Associate plate text if provided in detection
        plate = detection.get("plate_text") or detection.get("license_plate") or detection.get("plate")
        if plate:
            track.plate_text = str(plate)

        return track

    def _compute_iou(self, bbox1: Any, bbox2: Any) -> float:
        """Compute IoU between two bounding boxes [x, y, w, h].

        Bounding boxes represent center (x, y) and dimensions (w, h).
        """
        b1 = self._parse_bbox(bbox1)
        b2 = self._parse_bbox(bbox2)

        x1, y1, w1, h1 = b1[0], b1[1], b1[2], b1[3]
        x2, y2, w2, h2 = b2[0], b2[1], b2[2], b2[3]

        if w1 <= 0.0 or h1 <= 0.0 or w2 <= 0.0 or h2 <= 0.0:
            return 0.0

        # Convert center coordinates to corner boundaries
        b1_x1 = x1 - w1 / 2.0
        b1_y1 = y1 - h1 / 2.0
        b1_x2 = x1 + w1 / 2.0
        b1_y2 = y1 + h1 / 2.0

        b2_x1 = x2 - w2 / 2.0
        b2_y1 = y2 - h2 / 2.0
        b2_x2 = x2 + w2 / 2.0
        b2_y2 = y2 + h2 / 2.0

        # Compute intersection rectangle
        inter_x1 = max(b1_x1, b2_x1)
        inter_y1 = max(b1_y1, b2_y1)
        inter_x2 = min(b1_x2, b2_x2)
        inter_y2 = min(b1_y2, b2_y2)

        inter_w = max(0.0, inter_x2 - inter_x1)
        inter_h = max(0.0, inter_y2 - inter_y1)
        inter_area = inter_w * inter_h

        # Compute union area
        union_area = (w1 * h1) + (w2 * h2) - inter_area
        if union_area <= 0.0:
            return 0.0

        return float(inter_area / union_area)

    def _associate(self, detections: List[dict]) -> Tuple[List[Tuple[str, int]], List[str], List[int]]:
        """Hungarian/greedy association between predictions and detections.

        Returns:
            (matches, unmatched_tracks, unmatched_detections)
            where:
                matches: list of (track_id, detection_index)
                unmatched_tracks: list of track_id strings
                unmatched_detections: list of detection indices
        """
        track_ids = list(self.tracks.keys())

        if len(track_ids) == 0:
            return [], [], list(range(len(detections)))
        if len(detections) == 0:
            return [], track_ids, []

        iou_matrix = np.zeros((len(track_ids), len(detections)), dtype=float)
        for t_idx, tid in enumerate(track_ids):
            trk_bbox = self.tracks[tid].bbox
            for d_idx, det in enumerate(detections):
                det_bbox = self._parse_bbox(det)
                iou_matrix[t_idx, d_idx] = self._compute_iou(trk_bbox, det_bbox)

        matches: List[Tuple[str, int]] = []
        matched_track_indices = set()
        matched_det_indices = set()

        # Greedy matching by maximum IoU
        while True:
            if iou_matrix.size == 0:
                break
            max_iou = float(np.max(iou_matrix))
            if max_iou < self.IOU_THRESHOLD:
                break

            t_idx, d_idx = np.unravel_index(np.argmax(iou_matrix), iou_matrix.shape)
            tid = track_ids[int(t_idx)]
            matches.append((tid, int(d_idx)))
            matched_track_indices.add(int(t_idx))
            matched_det_indices.add(int(d_idx))

            iou_matrix[t_idx, :] = -1.0
            iou_matrix[:, d_idx] = -1.0

        unmatched_tracks = [
            track_ids[t_idx]
            for t_idx in range(len(track_ids))
            if t_idx not in matched_track_indices
        ]
        unmatched_detections = [
            d_idx
            for d_idx in range(len(detections))
            if d_idx not in matched_det_indices
        ]

        return matches, unmatched_tracks, unmatched_detections

    def update(self, detections: List[dict], pts_ms: float) -> List[Track]:
        """Update tracks with new detections at given PTS timestamp."""
        pts_ms = float(pts_ms)

        # 1. Check for discontinuity (12-hour loop cut or backward jump)
        is_discontinuous = self._check_discontinuity(pts_ms)

        # 2. Predict all tracks forward using dt from PTS
        if is_discontinuous or self.last_pts_ms is None:
            dt = 0.0
        else:
            dt = (pts_ms - self.last_pts_ms) / 1000.0

        self.last_pts_ms = pts_ms

        if dt > 0.0:
            for track in self.tracks.values():
                self._predict(track, dt)

        # 3. Associate detections to tracks via IoU
        matches, unmatched_tracks, unmatched_dets = self._associate(detections)

        # 4. Update matched tracks
        for tid, det_idx in matches:
            self._update_track(self.tracks[tid], detections[det_idx], pts_ms)

        # 5. Handle unmatched tracks (increment misses and age)
        for tid in unmatched_tracks:
            self.tracks[tid].misses += 1
            self.tracks[tid].age += 1

        # 6. Create new tracks for unmatched detections
        for det_idx in unmatched_dets:
            det = detections[det_idx]
            bbox = self._parse_bbox(det)
            track_id = f"TRK-{self._next_id:04d}"
            self._next_id += 1

            state = np.array([bbox[0], bbox[1], bbox[2], bbox[3], 0.0, 0.0], dtype=float)
            cov = np.diag([10.0, 10.0, 10.0, 10.0, 100.0, 100.0]).astype(float)
            plate = det.get("plate_text") or det.get("license_plate") or det.get("plate") or ""

            new_track = Track(
                track_id=track_id,
                state=state,
                covariance=cov,
                last_pts_ms=pts_ms,
                age=1,
                hits=1,
                misses=0,
                plate_text=str(plate),
            )
            self.tracks[track_id] = new_track

        # 7. Age and remove stale tracks
        stale_ids = [tid for tid, trk in self.tracks.items() if trk.misses >= self.MAX_MISSES]
        for tid in stale_ids:
            del self.tracks[tid]

        return list(self.tracks.values())

    def get_direction_of_travel(self, track: Track) -> str:
        """Infer direction from velocity vector.

        Returns one of: N, NE, E, SE, S, SW, W, NW, Unknown
        """
        vx = float(track.state[4])
        vy = float(track.state[5])

        speed = math.hypot(vx, vy)
        if speed < 1.0:
            return "Unknown"

        # In CCTV image coordinates:
        # +x is East (right), -x is West (left)
        # +y is South (down), -y is North (up)
        dx = vx
        dy = -vy  # Invert so that positive dy points North

        # Angle in degrees clockwise from North (0 to 360)
        angle_deg = math.degrees(math.atan2(dx, dy)) % 360.0

        # 45-degree sector intervals centered on cardinal/intercardinal points
        if angle_deg >= 337.5 or angle_deg < 22.5:
            return "N"
        elif 22.5 <= angle_deg < 67.5:
            return "NE"
        elif 67.5 <= angle_deg < 112.5:
            return "E"
        elif 112.5 <= angle_deg < 157.5:
            return "SE"
        elif 157.5 <= angle_deg < 202.5:
            return "S"
        elif 202.5 <= angle_deg < 247.5:
            return "SW"
        elif 247.5 <= angle_deg < 292.5:
            return "W"
        else:
            return "NW"
