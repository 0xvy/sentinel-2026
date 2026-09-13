import os
from typing import Optional


class VisionConfig:
    """
    Configuration class for the Sentinel 2026 AI Vision Engine.
    Reads runtime parameters from environment variables with production defaults
    strictly adhering to Sentinel Sandbox Ingestion Commandments.
    """

    # Backend API configuration
    BACKEND_URL: str = os.getenv("SENTINEL_BACKEND_URL", "http://localhost:8000")

    # Ingestion scheduler configuration (Commandments 1, 5, 8)
    MAX_CONCURRENT_STREAMS: int = int(os.getenv("MAX_CONCURRENT_STREAMS", "5"))
    INFERENCE_FPS: float = float(os.getenv("INFERENCE_FPS", "1.0"))
    BATCH_SIZE: int = int(os.getenv("BATCH_SIZE", "5"))
    BATCH_ROTATION_INTERVAL: int = int(os.getenv("BATCH_ROTATION_INTERVAL", "60"))
    FRAME_QUEUE_MAX_SIZE: int = int(os.getenv("FRAME_QUEUE_MAX_SIZE", "100"))
    BACKPRESSURE_STRATEGY: str = os.getenv("BACKPRESSURE_STRATEGY", "drop_oldest")

    # Exponential backoff reconnection parameters (Commandment 5)
    RECONNECT_INITIAL_DELAY: float = float(os.getenv("RECONNECT_INITIAL_DELAY_MS", "2000")) / 1000.0
    RECONNECT_MAX_DELAY: float = float(os.getenv("RECONNECT_MAX_DELAY_MS", "30000")) / 1000.0
    RECONNECT_BACKOFF_MULTIPLIER: float = float(os.getenv("RECONNECT_BACKOFF_MULTIPLIER", "2.0"))

    # Detection & OCR pipeline configuration
    DETECTION_MODE: str = os.getenv("DETECTION_MODE", "deterministic")  # 'dl' or 'deterministic'
    YOLO_MODEL: str = os.getenv("YOLO_MODEL", "morsetechlab/yolov11-license-plate-detection")
    CONFIDENCE_THRESHOLD: float = float(os.getenv("CONFIDENCE_THRESHOLD", "0.25"))

    # Forensic snapshot parameters (NFSU Chain of Custody)
    SNAPSHOT_DIR: str = os.getenv("SNAPSHOT_DIR", "snapshots")

    # Hardware & VRAM throttle thresholds (MB)
    GPU_MEMORY_THRESHOLD_MB: int = int(os.getenv("GPU_MEMORY_THRESHOLD_MB", "2048"))

    def __init__(
        self,
        backend_url: Optional[str] = None,
        max_concurrent_streams: Optional[int] = None,
        inference_fps: Optional[float] = None,
        batch_size: Optional[int] = None,
        batch_rotation_interval: Optional[int] = None,
        frame_queue_max_size: Optional[int] = None,
        backpressure_strategy: Optional[str] = None,
        reconnect_initial_delay: Optional[float] = None,
        reconnect_max_delay: Optional[float] = None,
        reconnect_backoff_multiplier: Optional[float] = None,
        detection_mode: Optional[str] = None,
        yolo_model: Optional[str] = None,
        confidence_threshold: Optional[float] = None,
        snapshot_dir: Optional[str] = None,
        gpu_memory_threshold_mb: Optional[int] = None,
    ):
        self.BACKEND_URL = backend_url or os.getenv("SENTINEL_BACKEND_URL", self.BACKEND_URL)
        self.MAX_CONCURRENT_STREAMS = (
            max_concurrent_streams
            if max_concurrent_streams is not None
            else int(os.getenv("MAX_CONCURRENT_STREAMS", str(self.MAX_CONCURRENT_STREAMS)))
        )
        self.INFERENCE_FPS = (
            inference_fps
            if inference_fps is not None
            else float(os.getenv("INFERENCE_FPS", str(self.INFERENCE_FPS)))
        )
        self.BATCH_SIZE = (
            batch_size
            if batch_size is not None
            else int(os.getenv("BATCH_SIZE", str(self.BATCH_SIZE)))
        )
        self.BATCH_ROTATION_INTERVAL = (
            batch_rotation_interval
            if batch_rotation_interval is not None
            else int(os.getenv("BATCH_ROTATION_INTERVAL", str(self.BATCH_ROTATION_INTERVAL)))
        )
        self.FRAME_QUEUE_MAX_SIZE = (
            frame_queue_max_size
            if frame_queue_max_size is not None
            else int(os.getenv("FRAME_QUEUE_MAX_SIZE", str(self.FRAME_QUEUE_MAX_SIZE)))
        )
        self.BACKPRESSURE_STRATEGY = (
            backpressure_strategy
            or os.getenv("BACKPRESSURE_STRATEGY", self.BACKPRESSURE_STRATEGY)
        )

        initial_ms = os.getenv("RECONNECT_INITIAL_DELAY_MS")
        if reconnect_initial_delay is not None:
            self.RECONNECT_INITIAL_DELAY = reconnect_initial_delay
        elif initial_ms is not None:
            self.RECONNECT_INITIAL_DELAY = float(initial_ms) / 1000.0
        else:
            self.RECONNECT_INITIAL_DELAY = self.RECONNECT_INITIAL_DELAY

        max_ms = os.getenv("RECONNECT_MAX_DELAY_MS")
        if reconnect_max_delay is not None:
            self.RECONNECT_MAX_DELAY = reconnect_max_delay
        elif max_ms is not None:
            self.RECONNECT_MAX_DELAY = float(max_ms) / 1000.0
        else:
            self.RECONNECT_MAX_DELAY = self.RECONNECT_MAX_DELAY

        self.RECONNECT_BACKOFF_MULTIPLIER = (
            reconnect_backoff_multiplier
            if reconnect_backoff_multiplier is not None
            else float(os.getenv("RECONNECT_BACKOFF_MULTIPLIER", str(self.RECONNECT_BACKOFF_MULTIPLIER)))
        )

        self.DETECTION_MODE = (
            detection_mode or os.getenv("DETECTION_MODE", self.DETECTION_MODE)
        )
        self.YOLO_MODEL = yolo_model or os.getenv("YOLO_MODEL", self.YOLO_MODEL)
        self.CONFIDENCE_THRESHOLD = (
            confidence_threshold
            if confidence_threshold is not None
            else float(os.getenv("CONFIDENCE_THRESHOLD", str(self.CONFIDENCE_THRESHOLD)))
        )
        self.SNAPSHOT_DIR = (
            snapshot_dir or os.getenv("SNAPSHOT_DIR", self.SNAPSHOT_DIR)
        )
        self.GPU_MEMORY_THRESHOLD_MB = (
            gpu_memory_threshold_mb
            if gpu_memory_threshold_mb is not None
            else int(os.getenv("GPU_MEMORY_THRESHOLD_MB", str(self.GPU_MEMORY_THRESHOLD_MB)))
        )

    def to_dict(self) -> dict:
        """Return configuration as a dictionary matching contracts/ingestion_config.json."""
        return {
            "max_concurrent_streams": self.MAX_CONCURRENT_STREAMS,
            "inference_fps": self.INFERENCE_FPS,
            "batch_size": self.BATCH_SIZE,
            "batch_rotation_interval_seconds": self.BATCH_ROTATION_INTERVAL,
            "frame_queue_max_size": self.FRAME_QUEUE_MAX_SIZE,
            "backpressure_strategy": self.BACKPRESSURE_STRATEGY,
            "gpu_memory_threshold_mb": self.GPU_MEMORY_THRESHOLD_MB,
            "reconnect_initial_delay_ms": int(self.RECONNECT_INITIAL_DELAY * 1000),
            "reconnect_max_delay_ms": int(self.RECONNECT_MAX_DELAY * 1000),
            "reconnect_backoff_multiplier": self.RECONNECT_BACKOFF_MULTIPLIER,
            "detection_mode": self.DETECTION_MODE,
            "yolo_model": self.YOLO_MODEL,
            "confidence_threshold": self.CONFIDENCE_THRESHOLD,
            "snapshot_dir": self.SNAPSHOT_DIR,
            "backend_url": self.BACKEND_URL,
        }
