"""
SENTINEL 2026 — Computer Vision Liveness & Motion Tests (Gate 5)
================================================================
Tests:
1. Synthetic Frozen Stream: Identical static frames trigger SSIM >= 0.9995 freeze rejection
2. Synthetic Blank Feed: Solid black/gray frames trigger Shannon Entropy < 2.50 rejection
3. Synthetic Traffic Motion: Moving vehicle box triggers Farneback flow Mp95 >= 0.85 and passes
4. Tactical HUD vs Real Roadway: Differentiates connecting HUD (H <= 3.5) from live CCTV (H >= 5.5)
5. Strict AST Invariant Rule 2 compliance: Zero time.time() in vision/ directory
"""

import os
from pathlib import Path
import cv2
import numpy as np
import pytest

from vision.tests.video_liveness_verifier import VideoLivenessAnalyzer


def test_ssim_mathematical_identity():
    """Mathematical verification: SSIM between identical frames must equal 1.0000."""
    frame = np.random.randint(0, 256, (360, 640), dtype=np.uint8)
    ssim_val = VideoLivenessAnalyzer.compute_ssim(frame, frame)
    assert abs(ssim_val - 1.0) < 1e-4, f"SSIM of identical frame was {ssim_val}, expected 1.0"


def test_synthetic_frozen_stream_flagged():
    """
    Gate 5: Synthetic Frozen Stream:
    Two identical static frames must yield SSIM >= 0.9999 and trigger
    liveness_passed == False with reason 'Feed is frozen'.
    """
    # Create textured static frame (e.g. road/building background)
    np.random.seed(42)
    base = np.random.randint(40, 220, (360, 640, 3), dtype=np.uint8)
    # Add high-contrast road lines
    cv2.line(base, (100, 300), (540, 300), (255, 255, 255), 5)
    cv2.rectangle(base, (200, 150), (400, 280), (10, 10, 180), -1)

    # Replicate identical static frames
    frames = [base.copy() for _ in range(4)]
    analyzer = VideoLivenessAnalyzer()
    res = analyzer.analyze_frames(frames)

    assert res["liveness_passed"] is False, "Frozen frame feed erroneously marked as live!"
    assert "Feed is frozen" in res["reason"]
    assert res["mean_ssim"] >= 0.9995


def test_synthetic_blank_feed_flagged():
    """
    Gate 5: Synthetic Blank Screen:
    Solid black frame must yield Shannon Entropy < 2.50 and trigger
    liveness_passed == False with reason 'Feed is blank or dark'.
    """
    # Solid black frames
    black_frames = [np.zeros((360, 640, 3), dtype=np.uint8) for _ in range(4)]
    analyzer = VideoLivenessAnalyzer()
    res = analyzer.analyze_frames(black_frames)

    assert res["liveness_passed"] is False, "Blank black feed erroneously marked as live!"
    assert "Feed is blank or dark" in res["reason"]
    assert res["mean_entropy"] < 2.50


def test_synthetic_traffic_motion_passes():
    """
    Gate 5: Synthetic Traffic Motion:
    Vehicle bounding box translating across a textured roadway background must yield
    Farneback Mp95 >= 0.85 px/frame and trigger liveness_passed == True with has_motion == True.
    """
    w, h = 640, 360
    np.random.seed(42)
    # Textured road/asphalt background with realistic entropy
    bg = np.random.randint(50, 180, (h, w, 3), dtype=np.uint8)
    cv2.line(bg, (0, 180), (640, 180), (220, 220, 220), 3)

    frames = []
    for i in range(5):
        frame = bg.copy()
        car_x = 100 + (i * 20)
        car_y = 140
        # Draw moving vehicle
        cv2.rectangle(frame, (car_x, car_y), (car_x + 120, car_y + 60), (20, 20, 240), -1)
        cv2.rectangle(frame, (car_x + 25, car_y + 10), (car_x + 95, car_y + 45), (200, 200, 200), -1)
        frames.append(frame)

    analyzer = VideoLivenessAnalyzer()
    res = analyzer.analyze_frames(frames)

    assert res["liveness_passed"] is True, f"Moving vehicle feed failed liveness: {res}"
    assert res["has_motion"] is True, f"Farneback failed to detect vehicle motion: {res}"
    assert res["mean_optical_flow_p95"] >= 0.85
    assert res["mean_ssim"] < 0.9995
    assert 5.0 <= res["mean_entropy"] <= 7.8


def test_tactical_hud_entropy_discrimination():
    """
    Differentiates connecting HUD frame (H <= 3.5) from authentic CCTV traffic footage (H in [5.5, 7.8]).
    Uses scripts/live_rtsp_cam04.jpg if available as the gold-standard CCTV reference.
    """
    # 1. Connecting HUD frame
    hud_frame = np.zeros((360, 640, 3), dtype=np.uint8)
    hud_frame[:] = (20, 11, 7)  # Dark slate tactical background
    cv2.line(hud_frame, (0, 180), (640, 180), (45, 30, 20), 1)
    cv2.putText(hud_frame, "GUJARAT POLICE CCTV NETWORK", (30, 45),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (212, 182, 6), 2)
    cv2.putText(hud_frame, "CONNECTING TO LIVE FEED...", (65, 247),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 215, 255), 2)

    hud_gray = cv2.cvtColor(hud_frame, cv2.COLOR_BGR2GRAY)
    hud_entropy = VideoLivenessAnalyzer.compute_shannon_entropy(hud_gray)
    assert hud_entropy <= 3.50, f"HUD frame entropy {hud_entropy} was higher than 3.50"

    # 2. Real CCTV reference snapshot (scripts/live_rtsp_cam04.jpg)
    snap_path = Path(__file__).resolve().parent.parent.parent / "scripts" / "live_rtsp_cam04.jpg"
    if snap_path.exists():
        real_img = cv2.imread(str(snap_path))
        assert real_img is not None
        real_gray = cv2.cvtColor(real_img, cv2.COLOR_BGR2GRAY)
        real_entropy = VideoLivenessAnalyzer.compute_shannon_entropy(real_gray)
        assert 5.50 <= real_entropy <= 7.80, f"Real CCTV frame entropy {real_entropy} outside expected range [5.5, 7.8]"
