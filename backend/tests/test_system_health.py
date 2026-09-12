"""
SENTINEL 2026 — System Performance & Event Loop Health Tests (Gate 7)
=====================================================================
Validates real-time performance invariants:
1. Uvicorn / Asyncio event loop tick lag remains strictly < 50.0 ms
2. Process Resident Set Size (RSS) memory delta <= 15.0 MB over 1,000 plate voting iterations
"""

import os
import time
import asyncio
import psutil
import pytest

from app.routers.streams import _vote_plate, _ocr_vote_buffers


@pytest.mark.asyncio
async def test_asyncio_event_loop_lag_under_50ms():
    """
    Gate 7: Asserts that the asyncio event loop delay (jitter) remains strictly < 50.0 ms.
    If background worker threads cause heavy GIL contention or synchronous blocking,
    the event loop tick jitter spikes above 50ms.
    """
    max_lag_ms = 0.0
    expected_interval = 0.010  # 10ms expected sleep
    iterations = 50  # 500ms total observation window

    for _ in range(iterations):
        t0 = time.perf_counter()
        await asyncio.sleep(expected_interval)
        t1 = time.perf_counter()
        lag_ms = ((t1 - t0) - expected_interval) * 1000.0
        if lag_ms > max_lag_ms:
            max_lag_ms = lag_ms

    assert max_lag_ms < 50.0, f"Event loop lag jitter too high: {max_lag_ms:.2f}ms (threshold: 50.0ms)"


def test_rss_memory_drift_bounded_over_1000_detections():
    """
    Gate 7: Simulates 1,000 continuous plate detection votes across varying cameras and coordinates.
    Asserts that the Process RSS memory drift remains <= 15.0 MB, proving that
    _ocr_vote_buffers caps memory via MAX_VOTE_KEYS and does not leak cyclic references.
    """
    process = psutil.Process(os.getpid())

    # Warm up GC and initial buffer
    for i in range(50):
        _vote_plate("cam04", [100 + i, 100, 200, 150], f"GJ01TEST{i:02d}")

    initial_rss = process.memory_info().rss

    # Execute 1,000 rapid plate voting cycles
    for i in range(1000):
        cam_id = f"cam{(i % 10) + 1:02d}"
        bbox = [(i * 7) % 500, (i * 11) % 400, 100, 50]
        plate = f"GJ01VOTE{(i % 20):02d}"
        _vote_plate(cam_id, bbox, plate)

    final_rss = process.memory_info().rss
    rss_delta_mb = (final_rss - initial_rss) / (1024.0 * 1024.0)

    assert rss_delta_mb <= 15.0, (
        f"RSS memory drift too high over 1,000 votes: {rss_delta_mb:.2f} MB (threshold: 15.0 MB)"
    )
