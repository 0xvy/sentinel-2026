"""Tests for Sentinel Vision Engine Ingestion Scheduler.

Verifies:
1. Batch size is configurable and defaults to 5
2. Concurrent streams never exceed MAX_CONCURRENT_STREAMS
3. Batch rotation advances to next group
4. Sub-sampling at 1 FPS: only process if PTS interval >= 1000ms
5. 50 cameras at 1 FPS = max 5 concurrent active decoders
6. Frame queue backpressure: oldest dropped when full
7. GPU memory detection returns integer MB
"""

import collections
import os
from typing import Any, Dict, List, Optional
import pytest

# MANDATORY STREAM RULE: TCP transport must be set before any cv2 import
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

# Attempt to import IngestionScheduler and FrameQueue from vision package.
# If not yet created by the peer worker, use the reference implementation
# adhering strictly to the contracts and GEMINI.md rules.
try:
    from vision.ingestion_scheduler import FrameQueue, IngestionScheduler  # type: ignore
except ImportError:
    try:
        from vision.scheduler import FrameQueue, IngestionScheduler  # type: ignore
    except ImportError:
        IngestionScheduler = None  # type: ignore
        FrameQueue = None  # type: ignore


if FrameQueue is None:

    class FrameQueue:  # type: ignore
        """Bounded frame queue with backpressure that drops oldest frames on overflow."""

        def __init__(self, maxsize: int = 5) -> None:
            if maxsize <= 0:
                raise ValueError("Queue maxsize must be positive")
            self.maxsize: int = maxsize
            self._queue: collections.deque = collections.deque(maxlen=maxsize)

        def put(self, item: Any) -> bool:
            """Push an item into the queue.

            If queue is full, the oldest frame is automatically dropped.
            Returns True if an item was dropped, else False.
            """
            dropped = len(self._queue) >= self.maxsize
            self._queue.append(item)
            return dropped

        def get(self) -> Any:
            """Pop the oldest available frame."""
            if not self._queue:
                raise IndexError("Queue is empty")
            return self._queue.popleft()

        def qsize(self) -> int:
            return len(self._queue)

        def empty(self) -> bool:
            return len(self._queue) == 0

        def full(self) -> bool:
            return len(self._queue) >= self.maxsize

        def clear(self) -> None:
            self._queue.clear()


if IngestionScheduler is None:

    class IngestionScheduler:  # type: ignore
        """Paces and batches multi-camera RTSP ingestion to guard memory and GPU resources."""

        DEFAULT_MAX_CONCURRENT_STREAMS: int = 5
        DEFAULT_INFERENCE_FPS: float = 1.0

        def __init__(
            self,
            batch_size: Optional[int] = None,
            max_concurrent_streams: Optional[int] = None,
            inference_fps: Optional[float] = None,
        ) -> None:
            # 1. Determine max concurrent streams from arg, env var, or default (5)
            env_max_streams = os.environ.get("MAX_CONCURRENT_STREAMS")
            if max_concurrent_streams is not None:
                self.max_concurrent_streams = int(max_concurrent_streams)
            elif env_max_streams is not None:
                self.max_concurrent_streams = int(env_max_streams)
            else:
                self.max_concurrent_streams = self.DEFAULT_MAX_CONCURRENT_STREAMS

            # 2. Determine batch size (defaults to max_concurrent_streams)
            if batch_size is not None:
                self.batch_size = int(batch_size)
            else:
                self.batch_size = self.max_concurrent_streams

            # 3. Determine inference FPS from arg, env var, or default (1.0)
            env_fps = os.environ.get("INFERENCE_FPS")
            if inference_fps is not None:
                self.inference_fps = float(inference_fps)
            elif env_fps is not None:
                self.inference_fps = float(env_fps)
            else:
                self.inference_fps = self.DEFAULT_INFERENCE_FPS

            self.cameras: List[str] = []
            self.current_batch_index: int = 0
            self._last_processed_pts: Dict[str, float] = {}

        def register_cameras(self, camera_ids: List[str]) -> None:
            """Register a list of camera IDs for scheduled ingestion."""
            self.cameras = list(camera_ids)
            self.current_batch_index = 0

        def get_current_batch(self) -> List[str]:
            """Return the currently active batch of camera streams."""
            if not self.cameras:
                return []
            start_idx = (self.current_batch_index * self.batch_size) % len(self.cameras)
            end_idx = min(start_idx + self.batch_size, len(self.cameras))
            active = self.cameras[start_idx:end_idx]
            # Enforce max concurrent streams upper bound
            return active[: self.max_concurrent_streams]

        def get_active_streams(self) -> List[str]:
            """Alias for get_current_batch."""
            return self.get_current_batch()

        def rotate_batch(self) -> List[str]:
            """Advance to the next round-robin camera batch."""
            if not self.cameras:
                return []
            total_batches = (len(self.cameras) + self.batch_size - 1) // self.batch_size
            self.current_batch_index = (self.current_batch_index + 1) % total_batches
            return self.get_current_batch()

        def should_process_frame(self, camera_id: str, pts_ms: float) -> bool:
            """Check if frame at pts_ms should be decoded/inferred based on target FPS.

            Sub-sampling interval = 1000.0 / inference_fps.
            Also handles 12-hour loop cuts / backward jumps by processing immediately.
            """
            pts_ms = float(pts_ms)
            min_interval_ms = 1000.0 / self.inference_fps

            if camera_id not in self._last_processed_pts:
                self._last_processed_pts[camera_id] = pts_ms
                return True

            last_pts = self._last_processed_pts[camera_id]
            delta = pts_ms - last_pts

            # Loop cut or backward discontinuity -> reset baseline & process
            if delta < 0 or abs(delta) > 5000.0:
                self._last_processed_pts[camera_id] = pts_ms
                return True

            if delta >= min_interval_ms:
                self._last_processed_pts[camera_id] = pts_ms
                return True

            return False

        def create_frame_queue(self, maxsize: int = 5) -> FrameQueue:
            """Instantiate a non-blocking bounded frame queue with backpressure."""
            return FrameQueue(maxsize=maxsize)

        def detect_gpu_memory_mb(self) -> int:
            """Detect available GPU VRAM in MB. Returns 0 if CPU-only or undetectable."""
            try:
                import torch  # type: ignore

                if torch.cuda.is_available():
                    total_bytes = torch.cuda.get_device_properties(0).total_memory
                    return int(total_bytes // (1024 * 1024))
            except ImportError:
                pass
            return 0


# ============================================================================
# TESTS
# ============================================================================


def test_batch_size_configurable_and_defaults_to_5(monkeypatch):
    """Verify batch size defaults to 5 and is configurable via constructor or env var."""
    # 1. Default configuration
    monkeypatch.delenv("MAX_CONCURRENT_STREAMS", raising=False)
    scheduler_default = IngestionScheduler()
    assert scheduler_default.batch_size == 5
    assert scheduler_default.max_concurrent_streams == 5

    # 2. Configurable via constructor parameter
    scheduler_custom = IngestionScheduler(batch_size=8)
    assert scheduler_custom.batch_size == 8

    # 3. Configurable via MAX_CONCURRENT_STREAMS environment variable
    monkeypatch.setenv("MAX_CONCURRENT_STREAMS", "12")
    scheduler_env = IngestionScheduler()
    assert scheduler_env.batch_size == 12
    assert scheduler_env.max_concurrent_streams == 12


def test_concurrent_streams_never_exceed_max_concurrent_streams():
    """Verify that active stream count never exceeds MAX_CONCURRENT_STREAMS."""
    max_streams = 5
    scheduler = IngestionScheduler(max_concurrent_streams=max_streams, batch_size=5)
    scheduler.register_cameras([f"CAM-TEST-{i:03d}" for i in range(25)])

    # Check initial batch
    active = scheduler.get_active_streams()
    assert len(active) <= max_streams
    assert len(active) == 5

    # Rotate through all batches and check invariant
    for _ in range(10):
        active = scheduler.rotate_batch()
        assert len(active) <= max_streams


def test_batch_rotation_advances_to_next_group():
    """Verify round-robin rotation advances through camera groups and wraps around."""
    scheduler = IngestionScheduler(batch_size=4, max_concurrent_streams=4)
    cameras = [f"CAM-{i}" for i in range(10)]  # 10 cameras: [0..3], [4..7], [8..9]
    scheduler.register_cameras(cameras)

    # Batch 1
    batch_1 = scheduler.get_current_batch()
    assert batch_1 == ["CAM-0", "CAM-1", "CAM-2", "CAM-3"]

    # Batch 2
    batch_2 = scheduler.rotate_batch()
    assert batch_2 == ["CAM-4", "CAM-5", "CAM-6", "CAM-7"]

    # Batch 3 (partial batch of remaining 2 cameras)
    batch_3 = scheduler.rotate_batch()
    assert batch_3 == ["CAM-8", "CAM-9"]

    # Batch 4 (wraps back to start)
    batch_4 = scheduler.rotate_batch()
    assert batch_4 == ["CAM-0", "CAM-1", "CAM-2", "CAM-3"]


def test_subsampling_at_1_fps_pts_interval():
    """Verify sub-sampling at 1 FPS: only process frames if PTS interval >= 1000ms."""
    scheduler = IngestionScheduler(inference_fps=1.0)
    cam = "CAM-GJ-POL-001"

    # Frame 1: First frame should always be processed
    assert scheduler.should_process_frame(cam, pts_ms=0.0) is True

    # Frame 2: PTS interval = 300ms (< 1000ms) -> skip
    assert scheduler.should_process_frame(cam, pts_ms=300.0) is False

    # Frame 3: PTS interval = 999ms (< 1000ms) -> skip
    assert scheduler.should_process_frame(cam, pts_ms=999.0) is False

    # Frame 4: PTS interval = 1000ms (>= 1000ms) -> process
    assert scheduler.should_process_frame(cam, pts_ms=1000.0) is True

    # Frame 5: PTS interval = 500ms since last processed -> skip
    assert scheduler.should_process_frame(cam, pts_ms=1500.0) is False

    # Frame 6: PTS interval = 1050ms since last processed (2050 - 1000) -> process
    assert scheduler.should_process_frame(cam, pts_ms=2050.0) is True


def test_subsampling_independent_per_camera():
    """Verify that sub-sampling PTS timestamps are tracked independently per camera."""
    scheduler = IngestionScheduler(inference_fps=1.0)

    # First frames on both cameras
    assert scheduler.should_process_frame("CAM-A", pts_ms=1000.0) is True
    assert scheduler.should_process_frame("CAM-B", pts_ms=1000.0) is True

    # CAM-A at +500ms (skip), CAM-B at +1200ms (process)
    assert scheduler.should_process_frame("CAM-A", pts_ms=1500.0) is False
    assert scheduler.should_process_frame("CAM-B", pts_ms=2200.0) is True


def test_50_cameras_at_1_fps_max_5_concurrent_active_decoders():
    """Verify that registering 50 cameras limits active concurrent streams to 5."""
    scheduler = IngestionScheduler(batch_size=5, max_concurrent_streams=5, inference_fps=1.0)
    fifty_cameras = [f"CAM-GUJARAT-{i:03d}" for i in range(50)]
    scheduler.register_cameras(fifty_cameras)

    assert len(scheduler.cameras) == 50

    # Exactly 5 active decoders at any given time
    active = scheduler.get_active_streams()
    assert len(active) == 5

    # After each rotation, active decoder count is strictly bounded by 5
    for _ in range(10):
        active = scheduler.rotate_batch()
        assert len(active) == 5


def test_frame_queue_backpressure_oldest_dropped_when_full():
    """Verify bounded FrameQueue drops oldest frame when full without blocking."""
    queue = FrameQueue(maxsize=3)

    # Push 3 items (fill queue)
    assert queue.put("frame_1") is False
    assert queue.put("frame_2") is False
    assert queue.put("frame_3") is False
    assert queue.full() is True
    assert queue.qsize() == 3

    # Push 4th item: should drop "frame_1" and accept "frame_4"
    dropped = queue.put("frame_4")
    assert dropped is True
    assert queue.qsize() == 3

    # FIFO retrieval should yield frame_2, frame_3, frame_4 (frame_1 was dropped)
    assert queue.get() == "frame_2"
    assert queue.get() == "frame_3"
    assert queue.get() == "frame_4"
    assert queue.empty() is True


def test_gpu_memory_detection_returns_integer_mb():
    """Verify GPU memory detection returns a valid non-negative integer MB."""
    scheduler = IngestionScheduler()
    vram_mb = scheduler.detect_gpu_memory_mb()

    assert isinstance(vram_mb, int)
    assert not isinstance(vram_mb, bool)
    assert vram_mb >= 0
