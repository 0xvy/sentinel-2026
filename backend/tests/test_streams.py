import os
import pytest
import numpy as np
import aiosqlite
from app.config import settings
from app.routers.streams import (
    _enhance_plate_crop,
    _vote_plate,
    _ocr_vote_buffers,
    _create_connecting_frame,
    MAX_VOTE_KEYS,
)


def test_enhance_plate_crop():
    """Verify plate crop enhancement upscales small crops and normalizes contrast."""
    # Test small crop (30x80)
    small_crop = np.zeros((30, 80, 3), dtype=np.uint8)
    small_crop[10:20, 20:60] = 200  # simulate plate characters
    
    enhanced = _enhance_plate_crop(small_crop)
    assert enhanced is not None
    # Verify 4x Lanczos upscale when h < 60 or w < 120
    assert enhanced.shape[0] == 120
    assert enhanced.shape[1] == 320
    assert enhanced.shape[2] == 3

    # Test already large crop (100x250) - no resize, but filtering applied
    large_crop = np.ones((100, 250, 3), dtype=np.uint8) * 128
    enhanced_large = _enhance_plate_crop(large_crop)
    assert enhanced_large.shape == (100, 250, 3)

    # Test empty crop handling
    empty_crop = np.zeros((0, 0, 3), dtype=np.uint8)
    assert _enhance_plate_crop(empty_crop).size == 0


def test_multi_frame_plate_voting():
    """Verify multi-frame OCR voting suppresses noise and requires consensus."""
    cam_id = "cam_test_voting"
    bbox = [102, 198, 210, 240]  # quantized to 200_200
    
    # Clear test buffer
    _ocr_vote_buffers.pop(cam_id, None)

    # Frame 1: First reading -> buffer len 1, count 1 -> empty string (no consensus)
    v1 = _vote_plate(cam_id, bbox, "GJ01ER8842")
    assert v1 == ""

    # Frame 2: Second matching reading -> buffer len 2, count 2 -> consensus reached!
    v2 = _vote_plate(cam_id, bbox, "GJ01ER8842")
    assert v2 == "GJ01ER8842"

    # Frame 3: Garbled reading arrives (e.g. noise from overhead glare)
    v3 = _vote_plate(cam_id, bbox, "GJ01EB8842")
    # Buffer now has 3 items: ["GJ01ER8842", "GJ01ER8842", "GJ01EB8842"] -> top count is 2 (out of 3, <3 agree)
    assert v3 == ""

    # Frame 4: Correct reading arrives again
    v4 = _vote_plate(cam_id, bbox, "GJ01ER8842")
    # Buffer has 4 items: top count is 3 -> majority consensus!
    assert v4 == "GJ01ER8842"

    # Clean up
    _ocr_vote_buffers.pop(cam_id, None)


def test_voting_across_moving_car():
    """
    Verify vehicle moving across the 1080p frame (100-300+ px displacement between frames)
    accumulates consensus across frames via the camera-level rolling window.
    """
    cam_id = "cam_moving_car"
    _ocr_vote_buffers.pop(cam_id, None)

    # Frame 1: Car at x=100, y=200
    bbox1 = [100, 200, 200, 250]
    r1 = _vote_plate(cam_id, bbox1, "GJ01ER8842")
    assert r1 == ""  # Frame 1: no consensus yet

    # Frame 2: Car has shifted 250px downstream to x=350, y=450
    bbox2 = [350, 450, 450, 500]
    r2 = _vote_plate(cam_id, bbox2, "GJ01ER8842")
    assert r2 == "GJ01ER8842"  # Consensus reached despite 250px displacement!

    # Frame 3: Car shifted another 250px to x=600, y=700
    bbox3 = [600, 700, 700, 750]
    r3 = _vote_plate(cam_id, bbox3, "GJ01ER8842")
    assert r3 == "GJ01ER8842"

    _ocr_vote_buffers.pop(cam_id, None)


def test_vote_buffer_memory_cap():
    """Verify dictionary keys are capped to MAX_VOTE_KEYS (50) to prevent memory leaks."""
    cam_id = "cam_mem_test"
    _ocr_vote_buffers.pop(cam_id, None)

    # Simulate 60 cars at distinct spatial positions passing the camera
    for i in range(60):
        bbox = [i * 200, i * 200, i * 200 + 100, i * 200 + 50]
        _vote_plate(cam_id, bbox, f"GJ01AA{i:04d}")

    # Verify total keys in camera dictionary does not exceed MAX_VOTE_KEYS
    assert len(_ocr_vote_buffers[cam_id]) <= MAX_VOTE_KEYS

    _ocr_vote_buffers.pop(cam_id, None)


def test_prewarm_env_guard():
    """Verify SENTINEL_PREWARM env variable disables worker spawning during tests."""
    assert os.environ.get("SENTINEL_PREWARM") == "0"


@pytest.mark.asyncio
async def test_sqlite_wal_mode(db_conn):
    """Verify SQLite database connection has WAL journal mode active."""
    async with db_conn.execute("PRAGMA journal_mode") as cur:
        row = await cur.fetchone()
        assert row[0].lower() == "wal"


def test_create_connecting_frame():
    """Verify tactical connecting HUD frame produces valid JPEG bytes."""
    frame_bytes = _create_connecting_frame("cam01", "TEST CONNECTING")
    assert frame_bytes is not None
    assert len(frame_bytes) > 1000
    # Check JPEG magic bytes: 0xFF 0xD8
    assert frame_bytes[:2] == b"\xff\xd8"
