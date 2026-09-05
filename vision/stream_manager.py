import os
# MANDATORY: MUST be set before cv2 import to enforce TCP transport (Commandment 1)
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

import logging
import time
from typing import Generator, List, Optional, Tuple
import cv2
import httpx
import numpy as np
import requests

from vision.config import VisionConfig

logger = logging.getLogger(__name__)


class StreamManager:
    """
    RTSP Stream Connection Manager.
    Enforces TCP transport, exponential backoff reconnection, PTS timing,
    decode warning suppression, and dynamic stream discovery from the Sentinel API.
    """

    def __init__(self, config: Optional[VisionConfig] = None):
        self.config = config or VisionConfig()

    async def discover_streams(self) -> List[dict]:
        """
        Dynamically fetch active camera streams from the backend API.
        Never hardcode RTSP URLs (Commandment 3).
        Queries GET /api/ingest.
        """
        url = f"{self.config.BACKEND_URL}/api/ingest"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                cameras = resp.json()
                logger.info(f"Discovered {len(cameras)} streams from {url}")
                return cameras
        except Exception as exc:
            logger.warning(f"Failed to discover streams asynchronously from {url}: {exc}")
            return self.get_stream_urls()

    def get_stream_urls(self) -> List[dict]:
        """Synchronous fallback to fetch live camera URLs and metadata from ingest API."""
        url = f"{self.config.BACKEND_URL}/api/ingest"
        try:
            resp = requests.get(url, timeout=10.0)
            resp.raise_for_status()
            cameras = resp.json()
            logger.info(f"Discovered {len(cameras)} streams via sync fallback from {url}")
            return cameras
        except Exception as exc:
            logger.error(f"Failed to discover streams synchronously from {url}: {exc}")
            return []

    def connect(self, url: str, max_retries: int = 5) -> cv2.VideoCapture:
        """
        Connect to RTSP stream with exponential backoff.
        Backoff: 2s initial, doubles each retry, capped at 30s (Commandment 5).
        max_retries: -1 for infinite retries, or positive integer.
        """
        delay = self.config.RECONNECT_INITIAL_DELAY
        max_delay = self.config.RECONNECT_MAX_DELAY
        multiplier = self.config.RECONNECT_BACKOFF_MULTIPLIER
        attempt = 0

        logger.info(f"Initiating TCP RTSP connection to: {url}")

        while max_retries == -1 or attempt < max_retries:
            cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
            if cap.isOpened():
                logger.info(f"Successfully connected to stream: {url} (attempt {attempt + 1})")
                return cap

            cap.release()
            attempt += 1
            logger.warning(
                f"Connection failed for {url} (attempt {attempt}/{max_retries if max_retries > 0 else 'inf'}). "
                f"Retrying in {delay:.1f}s..."
            )
            time.sleep(delay)
            delay = min(delay * multiplier, max_delay)

        raise ConnectionError(f"Failed to connect to RTSP stream {url} after {attempt} attempts")

    def read_frame(self, cap: cv2.VideoCapture) -> Tuple[bool, Optional[np.ndarray], float]:
        """
        Read single frame, extracting PTS timestamp in milliseconds.
        Uses cap.get(cv2.CAP_PROP_POS_MSEC) strictly (Commandment 2).
        Returns: (success, frame_ndarray, pts_ms)
        """
        if cap is None or not cap.isOpened():
            return False, None, 0.0

        ret, frame = cap.read()
        if not ret or frame is None:
            return False, None, 0.0

        pts_ms = float(cap.get(cv2.CAP_PROP_POS_MSEC))
        return True, frame, pts_ms

    def read_frames(
        self, cap: cv2.VideoCapture, max_consecutive_failures: int = 30
    ) -> Generator[Tuple[np.ndarray, float], None, None]:
        """
        Generator yielding (frame, pts_ms) while suppressing non-fatal
        H.264/H.265 RPS and POC decode join warnings (Commandment 4).
        Non-fatal errors clear upon receiving the first IDR keyframe.
        """
        consecutive_failures = 0

        while cap.isOpened():
            ret, frame = cap.read()
            if not ret or frame is None:
                consecutive_failures += 1
                if consecutive_failures > max_consecutive_failures:
                    logger.error(
                        f"Stream exceeded {max_consecutive_failures} consecutive read failures. Aborting read loop."
                    )
                    break
                # Non-fatal H.264/H.265 join decode warnings clear on next IDR frame
                continue

            consecutive_failures = 0
            pts_ms = float(cap.get(cv2.CAP_PROP_POS_MSEC))
            yield frame, pts_ms

    def check_discontinuity(self, current_pts_ms: float, last_pts_ms: float) -> bool:
        """
        Detect 12-hour synthetic loop cuts or timestamps resets (Commandment 6).
        Discontinuity is triggered if PTS delta > 5000ms or if PTS goes backwards.
        """
        if last_pts_ms is None or last_pts_ms < 0:
            return False

        delta = current_pts_ms - last_pts_ms
        if delta < 0.0 or abs(delta) > 5000.0:
            logger.warning(
                f"12-hour loop cut / PTS discontinuity detected: last={last_pts_ms:.1f}ms, "
                f"current={current_pts_ms:.1f}ms, delta={delta:.1f}ms"
            )
            return True
        return False

    def subsample(self, pts_ms: float, last_processed_pts: float, target_fps: float) -> bool:
        """
        Determine whether current frame should be processed based on target inference FPS.
        Sub-sampling uses strictly PTS intervals: interval = 1000.0 / target_fps (Commandment 8).
        """
        if last_processed_pts is None or last_processed_pts < 0:
            return True

        min_interval_ms = 1000.0 / max(0.1, target_fps)
        delta = pts_ms - last_processed_pts

        # Reset or forward progression
        if delta < 0 or delta >= min_interval_ms:
            return True

        return False

    def safe_release(self, cap: Optional[cv2.VideoCapture]) -> None:
        """Safely release video capture resource without hanging."""
        if cap is not None and cap.isOpened():
            try:
                cap.release()
                logger.debug("VideoCapture released successfully.")
            except Exception as exc:
                logger.warning(f"Error while releasing VideoCapture: {exc}")
