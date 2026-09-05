import logging
from typing import Any, Dict, List, Optional
import numpy as np

logger = logging.getLogger(__name__)


def compute_iou(box_a: List[float], box_b: List[float]) -> float:
    """Compute Intersection over Union between two boxes [x1, y1, x2, y2]."""
    x_a = max(box_a[0], box_b[0])
    y_a = max(box_a[1], box_b[1])
    x_b = min(box_a[2], box_b[2])
    y_b = min(box_a[3], box_b[3])

    inter_area = max(0.0, x_b - x_a) * max(0.0, y_b - y_a)
    if inter_area == 0.0:
        return 0.0

    box_a_area = max(1.0, (box_a[2] - box_a[0]) * (box_a[3] - box_a[1]))
    box_b_area = max(1.0, (box_b[2] - box_b[0]) * (box_b[3] - box_b[1]))
    return inter_area / float(box_a_area + box_b_area - inter_area)


class SingleTrack:
    """Individual vehicle or plate track governed strictly by PTS Kalman filtering."""

    def __init__(self, track_id: int, bbox: List[float], pts_ms: float):
        self.track_id = track_id
        self.last_pts_ms = pts_ms
        self.hits = 1
        self.age = 1
        self.time_since_update = 0
        self.plates: List[str] = []

        # State vector: [x, y, w, h, vx, vy]^T
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

        # Process noise acceleration variance (pixels / s^2)
        self.sigma_a = 50.0

    def predict(self, current_pts_ms: float) -> List[float]:
        """Predict forward to current_pts_ms using exact physical dt."""
        dt = (current_pts_ms - self.last_pts_ms) / 1000.0
        if dt < 0.0:
            dt = 0.033

        F = np.eye(6, dtype=np.float64)
        F[0, 4] = dt
        F[1, 5] = dt

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

    def get_direction_of_travel(self) -> str:
        """Infer cardinal/intercardinal direction from velocity vector [vx, vy]."""
        import math

        vx = float(self.x[4])
        vy = float(self.x[5])

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


class PTSKalmanTracker:
    """
    Multi-object tracker synchronized strictly to stream PTS timestamps (Commandment 2).
    Guards against 12-hour feed discontinuities (delta > 5000ms or negative delta)
    by resetting state cleanly without propagating stale velocities.
    """

    def __init__(self, iou_threshold: float = 0.3, max_age: int = 5):
        self.iou_threshold = iou_threshold
        self.max_age = max_age
        self.tracks: List[SingleTrack] = []
        self.next_track_id: int = 1
        self.last_pts_ms: Optional[float] = None
        self.reset_count: int = 0

    def reset(self, reason: str = "Discontinuity") -> None:
        """Cleanly clear active tracks to prevent velocity explosion."""
        logger.warning(f"Resetting PTS Kalman Tracker state: {reason}")
        self.tracks.clear()
        self.last_pts_ms = None
        self.reset_count += 1

    def update(
        self, detections: List[Dict[str, Any]], current_pts_ms: float
    ) -> List[Dict[str, Any]]:
        """
        Update tracker with frame detections at current PTS timestamp.
        Handles 12-hour loop discontinuity: resets all track state if delta > 5000ms or < 0.
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
        det_plates = [d.get("detected_plate") or d.get("license_plate", "") for d in detections]

        matched_tracks = set()
        matched_dets = set()

        if len(self.tracks) > 0 and len(det_boxes) > 0:
            iou_matrix = np.zeros((len(self.tracks), len(det_boxes)), dtype=np.float32)
            for t_idx, trk in enumerate(self.tracks):
                trk_box = trk.get_bbox()
                for d_idx, det_box in enumerate(det_boxes):
                    iou_matrix[t_idx, d_idx] = compute_iou(trk_box, det_box)

            # Greedy bipartite matching
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
                plate_str = det.get("detected_plate") or det.get("license_plate")
                if plate_str:
                    new_track.plates.append(plate_str)
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
                    "direction_of_travel": t.get_direction_of_travel(),
                    "pts_timestamp_ms": int(current_pts_ms),
                })

        return active_outputs

    def get_direction_of_travel(self, track: Any) -> str:
        """Infer cardinal/intercardinal direction from a track or track dictionary."""
        if hasattr(track, "get_direction_of_travel"):
            return track.get_direction_of_travel()
        elif isinstance(track, dict) and "direction_of_travel" in track:
            return track["direction_of_travel"]
        elif hasattr(track, "velocity"):
            import math

            vx = float(track.velocity[0])
            vy = float(track.velocity[1])
            speed = math.hypot(vx, vy)
            if speed < 1.0:
                return "Unknown"
            dx = vx
            dy = -vy
            angle_deg = math.degrees(math.atan2(dx, dy)) % 360.0
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
        return "Unknown"
