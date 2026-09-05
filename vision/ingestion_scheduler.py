import collections
import logging
from typing import Any, Dict, List, Optional
import psutil

from vision.config import VisionConfig

logger = logging.getLogger(__name__)


class FrameQueue:
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


class IngestionScheduler:
    """
    Round-robin batch scheduler and resource throttle for multi-camera RTSP ingestion.
    Enforces:
      - Max concurrent streams limit (Commandment 8: default 5 concurrent, 1 FPS)
      - Round-robin batch rotation
      - Bounded frame queue with configurable backpressure (drop_oldest)
      - GPU VRAM auto-detection and dynamic batch size scaling
    """

    def __init__(
        self,
        cameras: Optional[List[Any]] = None,
        config: Optional[VisionConfig] = None,
        batch_size: Optional[int] = None,
        max_concurrent_streams: Optional[int] = None,
        inference_fps: Optional[float] = None,
    ):
        import os

        self.config = config or VisionConfig()
        if batch_size is not None:
            self.config.BATCH_SIZE = int(batch_size)
        elif os.environ.get("MAX_CONCURRENT_STREAMS") and max_concurrent_streams is None:
            self.config.BATCH_SIZE = int(os.environ["MAX_CONCURRENT_STREAMS"])

        if max_concurrent_streams is not None:
            self.config.MAX_CONCURRENT_STREAMS = int(max_concurrent_streams)
        elif os.environ.get("MAX_CONCURRENT_STREAMS"):
            self.config.MAX_CONCURRENT_STREAMS = int(os.environ["MAX_CONCURRENT_STREAMS"])

        if inference_fps is not None:
            self.config.INFERENCE_FPS = float(inference_fps)
        elif os.environ.get("INFERENCE_FPS"):
            self.config.INFERENCE_FPS = float(os.environ["INFERENCE_FPS"])

        self.batch_size: int = self.config.BATCH_SIZE
        self.max_concurrent_streams: int = self.config.MAX_CONCURRENT_STREAMS
        self.inference_fps: float = self.config.INFERENCE_FPS

        self.cameras: List[Any] = list(cameras) if cameras else []
        self.effective_batch_size: int = min(self.batch_size, self.max_concurrent_streams)
        self.current_batch_index: int = 0
        self.batches: List[List[Any]] = []

        # Tracking PTS per camera to enforce 1-2 FPS sub-sampling
        self.last_processed_pts: Dict[str, float] = {}
        self.processed_frame_counts: Dict[str, int] = {}

        # Bounded frame queue with backpressure policy
        self.frame_queue: collections.deque = collections.deque()
        self.dropped_frames_count: int = 0

        self._rebuild_batches()

    def _rebuild_batches(self) -> None:
        """Partition cameras into batches of size effective_batch_size."""
        if not self.cameras:
            self.batches = [[]]
            self.current_batch_index = 0
            return

        batch_size = max(1, self.effective_batch_size)
        self.batches = [
            self.cameras[i : i + batch_size] for i in range(0, len(self.cameras), batch_size)
        ]
        if self.current_batch_index >= len(self.batches):
            self.current_batch_index = 0

    def register_cameras(self, camera_ids: List[Any]) -> None:
        """Register a list of camera IDs or camera objects for scheduled ingestion."""
        self.cameras = list(camera_ids)
        self.current_batch_index = 0
        self._rebuild_batches()

    def update_cameras(self, cameras: List[Dict[str, Any]]) -> None:
        """Update active camera registry and re-calculate batches."""
        self.cameras = list(cameras)
        self._rebuild_batches()
        logger.info(
            f"Scheduler updated: {len(self.cameras)} cameras partitioned into {len(self.batches)} "
            f"batches of size {self.effective_batch_size}"
        )

    def get_current_batch(self) -> List[Any]:
        """Return list of camera specifications or IDs in the current active round-robin batch."""
        if not self.batches or not self.cameras:
            return []
        return self.batches[self.current_batch_index]

    def get_active_streams(self) -> List[Any]:
        """Return active streams for current batch (alias for get_current_batch)."""
        return self.get_current_batch()

    def rotate_batch(self) -> List[Dict[str, Any]]:
        """
        Advance round-robin rotation to the next batch of cameras.
        Returns the new active camera batch.
        """
        if not self.batches or len(self.batches) <= 1:
            return self.get_current_batch()

        self.current_batch_index = (self.current_batch_index + 1) % len(self.batches)
        new_batch = self.batches[self.current_batch_index]
        logger.info(
            f"Rotated to batch index {self.current_batch_index + 1}/{len(self.batches)} "
            f"({len(new_batch)} cameras)"
        )
        return new_batch

    def should_process_frame(self, camera_id: str, pts_ms: float) -> bool:
        """
        Check if incoming frame satisfies the target INFERENCE_FPS sub-sampling rate
        using presentation timestamps (cap.get(cv2.CAP_PROP_POS_MSEC)).
        Sub-sampling interval = 1000.0 / inference_fps.
        Also handles 12-hour loop cuts / backward jumps by processing immediately.
        """
        pts_ms = float(pts_ms)
        min_interval_ms = 1000.0 / max(0.1, self.inference_fps)

        if camera_id not in self.last_processed_pts:
            self.last_processed_pts[camera_id] = pts_ms
            return True

        last_pts = self.last_processed_pts[camera_id]
        delta = pts_ms - last_pts

        # If timestamp reset / loop cut or delta elapsed is sufficient
        if delta < 0.0 or abs(delta) > 5000.0:
            self.last_processed_pts[camera_id] = pts_ms
            return True

        if delta >= min_interval_ms:
            self.last_processed_pts[camera_id] = pts_ms
            return True

        return False

    def report_frame_processed(self, camera_id: str, pts_ms: float = 0.0) -> None:
        """Record that a frame was processed for camera_id at pts_ms."""
        self.last_processed_pts[camera_id] = pts_ms
        self.processed_frame_counts[camera_id] = (
            self.processed_frame_counts.get(camera_id, 0) + 1
        )

    def record_frame_processed(self, camera_id: str, pts_ms: float = 0.0) -> None:
        """Alias for report_frame_processed."""
        self.report_frame_processed(camera_id, pts_ms)

    def create_frame_queue(self, maxsize: int = 5) -> FrameQueue:
        """Instantiate a non-blocking bounded frame queue with backpressure."""
        return FrameQueue(maxsize=maxsize)

    def get_gpu_memory_available_mb(self) -> int:
        """
        Detect available VRAM in megabytes using PyTorch CUDA if present,
        or available system memory as safe host fallback.
        """
        try:
            import torch

            if torch.cuda.is_available():
                device_idx = 0
                total_mem = torch.cuda.get_device_properties(device_idx).total_memory
                allocated_mem = torch.cuda.memory_allocated(device_idx)
                free_mb = int((total_mem - allocated_mem) / (1024 * 1024))
                logger.debug(f"Detected GPU CUDA VRAM available: {free_mb} MB")
                return free_mb
        except Exception as exc:
            logger.debug(f"Torch CUDA check failed: {exc}")

        # Fallback to system RAM
        try:
            ram_avail_mb = int(psutil.virtual_memory().available / (1024 * 1024))
            logger.debug(f"Using host RAM available: {ram_avail_mb} MB")
            return ram_avail_mb
        except Exception:
            return 4096

    def detect_gpu_memory_mb(self) -> int:
        """Detect available GPU VRAM in MB. Returns 0 if CPU-only or undetectable."""
        try:
            import torch

            if torch.cuda.is_available():
                total_bytes = torch.cuda.get_device_properties(0).total_memory
                return int(total_bytes // (1024 * 1024))
        except Exception:
            pass
        return 0

        # Fallback to system RAM
        try:
            ram_avail_mb = int(psutil.virtual_memory().available / (1024 * 1024))
            logger.debug(f"Using host RAM available: {ram_avail_mb} MB")
            return ram_avail_mb
        except Exception:
            return 4096

    def auto_scale_batch_size(self) -> int:
        """
        Dynamically scale active batch size based on available GPU VRAM.
        If VRAM is below threshold, throttle down concurrent streams to prevent OOM.
        """
        vram_avail = self.get_gpu_memory_available_mb()
        threshold = self.config.GPU_MEMORY_THRESHOLD_MB

        if vram_avail < threshold:
            # Memory constrained: scale down batch size
            scale_factor = max(0.2, vram_avail / float(threshold))
            scaled = max(1, int(self.config.BATCH_SIZE * scale_factor))
            logger.warning(
                f"VRAM below threshold ({vram_avail}MB < {threshold}MB). "
                f"Scaling batch size from {self.effective_batch_size} to {scaled}"
            )
            self.effective_batch_size = scaled
        else:
            self.effective_batch_size = min(
                self.config.BATCH_SIZE, self.config.MAX_CONCURRENT_STREAMS
            )

        self._rebuild_batches()
        return self.effective_batch_size

    def push_frame(self, frame_item: Dict[str, Any]) -> bool:
        """
        Push decoded frame to queue respecting backpressure policy.
        Policies: 'drop_oldest', 'drop_newest', 'block'.
        """
        max_size = self.config.FRAME_QUEUE_MAX_SIZE

        if len(self.frame_queue) >= max_size:
            if self.config.BACKPRESSURE_STRATEGY == "drop_oldest":
                self.frame_queue.popleft()
                self.dropped_frames_count += 1
                self.frame_queue.append(frame_item)
                return True
            elif self.config.BACKPRESSURE_STRATEGY == "drop_newest":
                self.dropped_frames_count += 1
                return False
            elif self.config.BACKPRESSURE_STRATEGY == "block":
                return False

        self.frame_queue.append(frame_item)
        return True

    def pop_frame(self) -> Optional[Dict[str, Any]]:
        """Pop next frame item from bounded queue."""
        if self.frame_queue:
            return self.frame_queue.popleft()
        return None

    def get_queue_size(self) -> int:
        """Get current queue depth."""
        return len(self.frame_queue)
