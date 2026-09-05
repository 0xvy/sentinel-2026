import os
# MANDATORY: MUST be set before cv2 import to enforce TCP transport (Commandment 1)
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

import asyncio
import hashlib
import logging
import time
from typing import Any, Dict, List, Optional
import cv2
import numpy as np

from vision.alert_emitter import AlertEmitter
from vision.config import VisionConfig
from vision.detector.dual_mode import DualModePipeline
from vision.ingestion_scheduler import IngestionScheduler
from vision.stream_manager import StreamManager
from vision.tracker.tracker import PTSKalmanTracker

logger = logging.getLogger(__name__)


class DetectionPipeline:
    """
    Main ANPR Detection, Ingestion, and Alert Pipeline for Sentinel 2026.
    
    Coordinates:
      1. Dynamic RTSP stream discovery from backend /api/ingest
      2. Round-robin batch scheduling (5 concurrent streams, 1-2 FPS sub-sampling)
      3. Robust TCP RTSP capture with exponential backoff (2s -> 30s)
      4. 12-hour loop discontinuity cut detection (PTS delta > 5000ms) with tracker resets
      5. Dual-mode license plate detection (YOLOv8 + EasyOCR or Deterministic)
      6. Forensic SHA-256 snapshot hashing for NFSU Chain of Custody
      7. Real-time alert and sighting emission to backend /api/alerts
    """

    def __init__(self, config: Optional[VisionConfig] = None):
        self.config = config or VisionConfig()
        self.stream_manager = StreamManager(self.config)
        self.scheduler = IngestionScheduler(config=self.config)
        self.detector = DualModePipeline(
            mode=self.config.DETECTION_MODE,
            yolo_model=self.config.YOLO_MODEL,
            confidence_threshold=self.config.CONFIDENCE_THRESHOLD,
        )
        self.emitter = AlertEmitter(
            backend_url=self.config.BACKEND_URL,
            snapshot_dir=self.config.SNAPSHOT_DIR,
        )
        # Dedicated PTS Kalman tracker instance per camera
        self.trackers: Dict[str, PTSKalmanTracker] = {}
        self.last_camera_pts: Dict[str, float] = {}
        self.is_running: bool = False

    def compute_snapshot_hash(self, image_bytes: bytes) -> str:
        """
        Compute SHA-256 cryptographic hash of image bytes for NFSU chain of custody
        under Section 65B of the Indian Evidence Act.
        """
        if not image_bytes:
            return hashlib.sha256(b"").hexdigest()
        return hashlib.sha256(image_bytes).hexdigest()

    def get_tracker_for_camera(self, camera_id: str) -> PTSKalmanTracker:
        """Retrieve or instantiate a PTS Kalman tracker for the given camera."""
        if camera_id not in self.trackers:
            self.trackers[camera_id] = PTSKalmanTracker()
        return self.trackers[camera_id]

    async def process_single_frame(
        self, frame: np.ndarray, pts_ms: float, camera: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Synchronously process one frame from a camera:
          - Checks 12-hour loop cut discontinuity (PTS delta > 5000ms)
          - Detects and normalizes Gujarat license plates
          - Updates PTS tracker
          - Emits contract-compliant alerts to backend /api/alerts
        """
        camera_id = camera.get("camera_id", "CAM-UNKNOWN-01")
        last_pts = self.last_camera_pts.get(camera_id, -1.0)

        # 1. 12-Hour Loop Discontinuity Detection (Commandment 6)
        if self.stream_manager.check_discontinuity(pts_ms, last_pts):
            tracker = self.get_tracker_for_camera(camera_id)
            tracker.reset(f"Loop cut / PTS discontinuity on {camera_id}: last={last_pts}ms, curr={pts_ms}ms")

        self.last_camera_pts[camera_id] = pts_ms

        # 2. ANPR Detection & Gujarat Plate Normalization
        detections = self.detector.process_frame(frame, pts_ms, camera)
        if not detections:
            return []

        # 3. PTS-Driven Kinematic Tracker Update
        tracker = self.get_tracker_for_camera(camera_id)
        active_tracks = tracker.update(detections, pts_ms)

        # Map inferred heading from kinematic tracker to detection payloads
        track_map = {
            t["license_plate"]: t.get("direction_of_travel", "Unknown")
            for t in active_tracks
            if t.get("license_plate")
        }

        # 4. Emit Every Detection as Alert/Sighting (Commandment 7 & 10)
        emitted_alerts = []
        for det in detections:
            plate = det.get("detected_plate") or det.get("license_plate")
            if plate and plate in track_map:
                det["direction_of_travel"] = track_map[plate]
            elif "direction_of_travel" not in det:
                det["direction_of_travel"] = "Unknown"

            alert = await self.emitter.emit_alert(det, camera)
            emitted_alerts.append(alert)

        self.scheduler.report_frame_processed(camera_id, pts_ms)
        return emitted_alerts

    async def process_camera(
        self, camera: Dict[str, Any], max_frames: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Process an individual RTSP camera stream:
          - Connects via TCP with exponential backoff (2s -> 30s)
          - Reads frames with non-fatal decode warning suppression
          - Sub-samples frames at configured INFERENCE_FPS
          - Emits alerts for all detected plates
        """
        camera_id = camera.get("camera_id", "CAM-UNKNOWN-01")
        stream_url = camera.get("stream_url")
        processed_alerts: List[Dict[str, Any]] = []

        if not stream_url:
            logger.warning(f"Camera {camera_id} has no stream_url configured.")
            # If in deterministic mode and no stream URL, produce sample detection
            if self.config.DETECTION_MODE == "deterministic":
                synthetic_frame = np.zeros((720, 1280, 3), dtype=np.uint8)
                alerts = await self.process_single_frame(synthetic_frame, 1000.0, camera)
                processed_alerts.extend(alerts)
            return processed_alerts

        logger.info(f"Connecting to camera stream: {camera_id} ({stream_url})")

        cap = None
        try:
            # Connect in worker thread to prevent blocking event loop during backoff
            cap = await asyncio.to_thread(self.stream_manager.connect, stream_url, 3)
        except Exception as exc:
            logger.error(f"Failed to connect to camera {camera_id} ({stream_url}): {exc}")
            return processed_alerts

        frame_count = 0
        consecutive_failures = 0
        max_consecutive_failures = 30

        try:
            while self.is_running:
                if max_frames is not None and frame_count >= max_frames:
                    break

                # Non-blocking read in worker thread
                ret, frame, pts_ms = await asyncio.to_thread(self.stream_manager.read_frame, cap)

                if not ret or frame is None:
                    consecutive_failures += 1
                    if consecutive_failures > max_consecutive_failures:
                        logger.warning(
                            f"Camera {camera_id} exceeded {max_consecutive_failures} read failures. "
                            "Breaking read loop."
                        )
                        break
                    await asyncio.sleep(0.01)
                    continue

                consecutive_failures = 0

                # Check PTS-based sub-sampling (1-2 FPS)
                if not self.scheduler.should_process_frame(camera_id, pts_ms):
                    await asyncio.sleep(0.01)
                    continue

                alerts = await self.process_single_frame(frame, pts_ms, camera)
                processed_alerts.extend(alerts)
                frame_count += 1

                # Yield control briefly to event loop
                await asyncio.sleep(0.001)

        except asyncio.CancelledError:
            logger.info(f"Camera processing cancelled for {camera_id}")
        except Exception as exc:
            logger.error(f"Error processing camera {camera_id}: {exc}")
        finally:
            if cap is not None:
                await asyncio.to_thread(self.stream_manager.safe_release, cap)

        return processed_alerts

    async def run(
        self,
        duration_seconds: Optional[float] = None,
        max_rotations: Optional[int] = None,
    ) -> None:
        """
        Main execution loop:
          1. Discovers streams dynamically from backend /api/ingest
          2. Auto-scales batch size according to VRAM
          3. Schedules round-robin batches across active cameras
          4. Manages concurrent streaming workers
        """
        self.is_running = True
        start_time = time.monotonic()
        rotations = 0

        logger.info("Starting Sentinel 2026 Detection Pipeline...")

        # 1. Dynamic stream discovery (Commandment 3)
        cameras = await self.stream_manager.discover_streams()
        if not cameras:
            logger.warning("No camera streams discovered from backend. Checking registry fallback...")
            # Fallback default camera configuration for test environment
            cameras = [
                {
                    "camera_id": "CAM-AMC-AHM-01",
                    "camera_name": "Kalupur Railway Station Cross Rd",
                    "department": "Police",
                    "lat": 23.0270,
                    "lng": 72.5998,
                    "stream_url": None,
                    "status": "Online",
                }
            ]

        self.scheduler.update_cameras(cameras)
        # 2. VRAM Auto-scaling
        self.scheduler.auto_scale_batch_size()

        logger.info(
            f"Initialized scheduler with {len(cameras)} cameras. "
            f"Batch size: {self.scheduler.effective_batch_size}, "
            f"Rotation interval: {self.config.BATCH_ROTATION_INTERVAL}s"
        )

        try:
            while self.is_running:
                # Check runtime limits
                if duration_seconds and (time.monotonic() - start_time) >= duration_seconds:
                    logger.info(f"Pipeline reached duration limit of {duration_seconds}s. Stopping.")
                    break
                if max_rotations and rotations >= max_rotations:
                    logger.info(f"Pipeline reached max rotations limit ({max_rotations}). Stopping.")
                    break

                active_batch = self.scheduler.get_current_batch()
                logger.info(
                    f"Executing batch {self.scheduler.current_batch_index + 1}/{len(self.scheduler.batches)} "
                    f"({len(active_batch)} cameras)"
                )

                # Run batch cameras concurrently
                batch_tasks = [
                    asyncio.create_task(self.process_camera(cam, max_frames=5))
                    for cam in active_batch
                ]

                # Wait for batch rotation interval or task completion
                rotation_timeout = max(1.0, float(self.config.BATCH_ROTATION_INTERVAL))
                done, pending = await asyncio.wait(batch_tasks, timeout=rotation_timeout)

                for task in pending:
                    task.cancel()

                # Rotate round-robin batch
                self.scheduler.rotate_batch()
                rotations += 1

                # Auto-scale batch size based on VRAM periodically
                self.scheduler.auto_scale_batch_size()

        except asyncio.CancelledError:
            logger.info("Pipeline run cancelled.")
        finally:
            self.is_running = False
            logger.info("Sentinel 2026 Detection Pipeline stopped.")

    def stop(self) -> None:
        """Signal pipeline to gracefully shut down."""
        self.is_running = False
