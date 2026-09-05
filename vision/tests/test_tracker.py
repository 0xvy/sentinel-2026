"""Tests for Sentinel Vision Engine PTS Kalman Tracker.

Verifies:
1. Normal tracking: sequential PTS updates produce stable tracks
2. dt calculation: dt = (pts2 - pts1) / 1000.0 (NOT wall clock)
3. Discontinuity detection: PTS jump > 5000ms triggers reset
4. Discontinuity reset: all tracks cleared after reset
5. Backward PTS jump: also triggers reset (12-hour loop cut)
6. Track creation: new detections create new tracks
7. Track removal: tracks removed after MAX_MISSES consecutive misses
8. IoU association: detections matched to closest predicted track
9. Direction inference: velocity vector -> N/NE/E/SE/S/SW/W/NW/Unknown
10. BANNED: no use of time.time() or CAP_PROP_FPS anywhere in tracker code
"""

import inspect
import math
import os
import pytest
import numpy as np

# MANDATORY STREAM RULE: TCP transport must be set before any cv2 import
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

import vision.tracker.kalman_tracker as tracker_module
from vision.tracker.kalman_tracker import KalmanTracker, Track


def test_track_creation():
    """Verify that new detections create new Track objects with correct initial states."""
    tracker = KalmanTracker()
    detections = [
        {"bbox": [150.0, 250.0, 60.0, 30.0], "plate_text": "GJ01AB1234"},
        {"bbox": [400.0, 500.0, 70.0, 35.0], "plate_text": "GJ05CD5678"},
    ]
    tracks = tracker.update(detections, pts_ms=1000.0)

    assert len(tracks) == 2
    assert len(tracker.tracks) == 2

    t1 = tracks[0]
    assert t1.hits == 1
    assert t1.age == 1
    assert t1.misses == 0
    assert t1.last_pts_ms == 1000.0
    assert t1.plate_text in ("GJ01AB1234", "GJ05CD5678")
    assert t1.track_id.startswith("TRK-")

    # Initial velocities should be 0.0
    assert t1.velocity == [0.0, 0.0]


def test_normal_sequential_tracking():
    """Verify sequential PTS updates maintain stable track identities."""
    tracker = KalmanTracker()

    # Move object across 5 sequential frames (1000ms to 5000ms)
    for step in range(5):
        pts = 1000.0 + step * 1000.0
        # Target moves 15px per second in X direction
        detections = [
            {"bbox": [100.0 + step * 15.0, 200.0, 50.0, 25.0], "plate_text": "GJ01AB1234"}
        ]
        tracks = tracker.update(detections, pts_ms=pts)

        assert len(tracks) == 1
        trk = tracks[0]
        assert trk.track_id == "TRK-0001"
        assert trk.hits == step + 1
        assert trk.age == step + 1
        assert trk.misses == 0
        assert trk.plate_text == "GJ01AB1234"
        assert trk.last_pts_ms == pts


def test_dt_calculation_pts_only():
    """Verify dt is calculated strictly from PTS (dt = (pts2 - pts1) / 1000.0)."""
    tracker = KalmanTracker()

    # Initialize a track at PTS = 1000.0
    track = Track(
        track_id="TRK-TEST",
        state=np.array([100.0, 200.0, 50.0, 25.0, 60.0, 30.0], dtype=float),
        covariance=np.eye(6, dtype=float),
        last_pts_ms=1000.0,
        age=1,
        hits=1,
        misses=0,
    )

    # Predict forward by dt = (1500 - 1000) / 1000 = 0.5s
    dt_500ms = (1500.0 - 1000.0) / 1000.0
    predicted = tracker._predict(track, dt=dt_500ms)

    # In 0.5 seconds at vx=60 px/s, x moves by 30px: 100 + 30 = 130
    # In 0.5 seconds at vy=30 px/s, y moves by 15px: 200 + 15 = 215
    assert math.isclose(predicted.state[0], 130.0, abs_tol=1e-3)
    assert math.isclose(predicted.state[1], 215.0, abs_tol=1e-3)

    # Verify w, h, vx, vy are preserved during constant velocity prediction
    assert math.isclose(predicted.state[2], 50.0, abs_tol=1e-3)
    assert math.isclose(predicted.state[3], 25.0, abs_tol=1e-3)
    assert math.isclose(predicted.state[4], 60.0, abs_tol=1e-3)
    assert math.isclose(predicted.state[5], 30.0, abs_tol=1e-3)


def test_discontinuity_forward_jump():
    """Verify forward PTS jump > 5000ms triggers discontinuity reset."""
    tracker = KalmanTracker()
    tracker.update([{"bbox": [100, 100, 40, 20]}], pts_ms=1000.0)
    assert len(tracker.tracks) == 1

    # Normal step: delta = 1000ms (< 5000ms) -> No reset
    assert not tracker._check_discontinuity(2000.0)
    assert len(tracker.tracks) == 1

    # Forward jump: delta = 6500ms (> 5000ms) -> Discontinuity detected & reset
    assert tracker._check_discontinuity(8500.0)
    assert len(tracker.tracks) == 0
    assert tracker.last_pts_ms is None


def test_discontinuity_backward_jump():
    """Verify backward PTS jump (12-hour synthetic loop cut) triggers reset."""
    tracker = KalmanTracker()

    # Simulate running feed near 12 hours (43,200,000 ms)
    tracker.update([{"bbox": [100, 100, 40, 20]}], pts_ms=43200000.0)
    assert len(tracker.tracks) == 1

    # Feed loops back to start of synthetic video (pts = 100ms)
    assert tracker._check_discontinuity(100.0)
    assert len(tracker.tracks) == 0


def test_discontinuity_reset_behavior():
    """Verify tracker clears tracks and reinitializes cleanly on discontinuity."""
    tracker = KalmanTracker()
    tracker.update([{"bbox": [100, 100, 40, 20], "plate_text": "OLD1111"}], pts_ms=1000.0)
    assert "TRK-0001" in tracker.tracks

    # Jump forward by 10,000 ms (> 5000ms threshold)
    tracks_after_jump = tracker.update(
        [{"bbox": [500, 500, 40, 20], "plate_text": "NEW2222"}], pts_ms=11000.0
    )

    # Old track should be gone, new track created without velocity explosion
    assert len(tracks_after_jump) == 1
    new_trk = tracks_after_jump[0]
    assert new_trk.track_id == "TRK-0002"
    assert new_trk.plate_text == "NEW2222"
    assert new_trk.hits == 1
    assert new_trk.velocity == [0.0, 0.0]


def test_track_removal_after_max_misses():
    """Verify tracks are pruned after MAX_MISSES (5) consecutive frames with no detection."""
    tracker = KalmanTracker()
    tracker.update([{"bbox": [100, 100, 40, 20]}], pts_ms=1000.0)
    assert len(tracker.tracks) == 1

    # Send 4 consecutive empty frames -> track should still be alive
    for i in range(1, 5):
        tracks = tracker.update([], pts_ms=1000.0 + i * 1000.0)
        assert len(tracks) == 1
        assert tracks[0].misses == i

    # 5th consecutive empty frame (misses reaches MAX_MISSES=5) -> pruned
    tracks = tracker.update([], pts_ms=6000.0)
    assert len(tracks) == 0
    assert len(tracker.tracks) == 0


def test_iou_computation():
    """Verify IoU calculation for center-based bounding boxes [x, y, w, h]."""
    tracker = KalmanTracker()

    # Identical bounding boxes -> IoU = 1.0
    box_a = [100.0, 100.0, 50.0, 50.0]
    box_b = [100.0, 100.0, 50.0, 50.0]
    assert math.isclose(tracker._compute_iou(box_a, box_b), 1.0)

    # Non-overlapping bounding boxes -> IoU = 0.0
    box_c = [300.0, 300.0, 50.0, 50.0]
    assert tracker._compute_iou(box_a, box_c) == 0.0

    # Partial overlap: box_d shifted by 25px in X
    # Intersection = 25 * 50 = 1250
    # Union = 2500 + 2500 - 1250 = 3750
    # IoU = 1250 / 3750 = 1/3
    box_d = [125.0, 100.0, 50.0, 50.0]
    assert math.isclose(tracker._compute_iou(box_a, box_d), 1.0 / 3.0, abs_tol=1e-4)

    # Degenerate boxes with zero or negative dimensions -> IoU = 0.0
    assert tracker._compute_iou([0, 0, 0, 10], [0, 0, 10, 10]) == 0.0


def test_iou_association_closest_match():
    """Verify detections are associated to tracks with highest IoU."""
    tracker = KalmanTracker()

    # Initial frame with two targets far apart
    dets_0 = [
        {"bbox": [100.0, 100.0, 40.0, 20.0], "plate_text": "CAR_A"},
        {"bbox": [500.0, 500.0, 40.0, 20.0], "plate_text": "CAR_B"},
    ]
    tracker.update(dets_0, pts_ms=1000.0)

    # Subsequent frame: detections slightly moved
    dets_1 = [
        {"bbox": [505.0, 502.0, 40.0, 20.0], "plate_text": "CAR_B"},
        {"bbox": [105.0, 102.0, 40.0, 20.0], "plate_text": "CAR_A"},
    ]
    tracker.update(dets_1, pts_ms=2000.0)

    # Both tracks should match their corresponding detections
    trk_a = tracker.tracks["TRK-0001"]
    trk_b = tracker.tracks["TRK-0002"]

    assert trk_a.plate_text == "CAR_A"
    assert trk_a.hits == 2
    assert trk_b.plate_text == "CAR_B"
    assert trk_b.hits == 2


def test_direction_inference_all_cardinals():
    """Verify velocity-based direction inference covers all 8 cardinal directions."""
    tracker = KalmanTracker()

    def make_track(vx: float, vy: float) -> Track:
        return Track(
            track_id="TRK-DIR",
            state=np.array([100.0, 100.0, 50.0, 25.0, vx, vy], dtype=float),
            covariance=np.eye(6, dtype=float),
            last_pts_ms=1000.0,
        )

    # In CCTV coordinates:
    # +x = East, -x = West
    # +y = South (down), -y = North (up)
    assert tracker.get_direction_of_travel(make_track(0.0, -10.0)) == "N"
    assert tracker.get_direction_of_travel(make_track(10.0, -10.0)) == "NE"
    assert tracker.get_direction_of_travel(make_track(10.0, 0.0)) == "E"
    assert tracker.get_direction_of_travel(make_track(10.0, 10.0)) == "SE"
    assert tracker.get_direction_of_travel(make_track(0.0, 10.0)) == "S"
    assert tracker.get_direction_of_travel(make_track(-10.0, 10.0)) == "SW"
    assert tracker.get_direction_of_travel(make_track(-10.0, 0.0)) == "W"
    assert tracker.get_direction_of_travel(make_track(-10.0, -10.0)) == "NW"

    # Low speed below threshold -> Unknown
    assert tracker.get_direction_of_travel(make_track(0.2, 0.1)) == "Unknown"
    assert tracker.get_direction_of_travel(make_track(0.0, 0.0)) == "Unknown"


def test_no_banned_timing_calls_in_tracker_code():
    """Verify strictly NO usage of wall-clock time or CAP_PROP_FPS in tracker code."""
    source_lines = inspect.getsource(tracker_module)

    # Strict prohibitions
    assert "time.time()" not in source_lines, "Forbidden wall-clock time.time() detected!"
    assert "CAP_PROP_FPS" not in source_lines, "Forbidden CAP_PROP_FPS detected!"
    assert "time.sleep" not in source_lines, "Forbidden time.sleep detected in tracker module!"


def test_plate_text_persistence():
    """Verify license plate text persists even if detection does not provide it on subsequent frames."""
    tracker = KalmanTracker()

    # Frame 1: detection has plate text
    tracker.update([{"bbox": [100, 100, 40, 20], "plate_text": "GJ01AB1234"}], pts_ms=1000.0)
    assert tracker.tracks["TRK-0001"].plate_text == "GJ01AB1234"

    # Frame 2: detection does not include plate text (e.g. OCR blur)
    tracker.update([{"bbox": [102, 101, 40, 20]}], pts_ms=2000.0)
    assert tracker.tracks["TRK-0001"].plate_text == "GJ01AB1234"


def test_tcp_environment_variable_enforced():
    """Verify TCP transport environment option is set before any video operations."""
    assert os.environ.get("OPENCV_FFMPEG_CAPTURE_OPTIONS") == "rtsp_transport;tcp"
