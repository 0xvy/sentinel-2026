import os
# MANDATORY: MUST be set before cv2 import to enforce TCP transport (Commandment 1)
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

import hashlib
import logging
from typing import Any, Dict, List, Optional
import cv2
import numpy as np

from vision.detector.ocr_engine import OCREngine
from vision.detector.plate_detector import PlateDetector

logger = logging.getLogger(__name__)

# Deterministic test plates pool covering various Gujarat RTOs
DETERMINISTIC_TEST_PLATES = [
    "GJ01AB1234",  # Ahmedabad City
    "GJ05CX9988",  # Surat City
    "GJ03D0007",   # Rajkot (single letter series)
    "GJ27BB4567",  # Ahmedabad East
    "GJ06AQ3456",  # Vadodara City
    "GJ18MK8899",  # Gandhinagar
    "GJ01AB5566",  # Ahmedabad City (stolen watchlist vehicle)
    "GJ05XY1122",  # Surat (eGujCop wanted vehicle)
]


class DualModePipeline:
    """
    Dual-mode ANPR detection and recognition pipeline controller.
    
    Modes:
      1. 'dl': Full Deep Learning Mode
         - YOLOv8 Indian HSRP Plate Detector
         - EasyOCR + Bilateral Filter Character Recognition
         - Gujarat Plate Positional Grammar Normalization
      2. 'deterministic': High-speed deterministic test mode
         - Simulates realistic Gujarat plate detections and coordinates
         - Extracts metadata/test tags for end-to-end integration tests
         - Runs without requiring a GPU or large model downloads
    """

    def __init__(
        self,
        mode: str = "deterministic",
        yolo_model: str = "yolov8n",
        confidence_threshold: float = 0.5,
    ):
        self.mode = mode.lower()
        self.detector: Optional[PlateDetector] = None
        self.ocr: Optional[OCREngine] = None
        self._test_counter: int = 0

        if self.mode == "dl":
            logger.info("Initializing DualModePipeline in Deep Learning ('dl') mode")
            self.detector = PlateDetector(
                model_name=yolo_model, confidence_threshold=confidence_threshold
            )
            self.ocr = OCREngine()
        else:
            logger.info("Initializing DualModePipeline in Deterministic ('deterministic') mode")

    def compute_snapshot_hash(self, image: np.ndarray) -> tuple[bytes, str]:
        """
        Encode plate crop to JPEG and calculate SHA-256 digest for NFSU Chain of Custody.
        Returns: (jpeg_bytes, sha256_hex_digest)
        """
        if image is None or image.size == 0:
            # Fallback for empty frame: 1x1 black image
            image = np.zeros((16, 64, 3), dtype=np.uint8)

        success, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 95])
        if not success:
            raw_bytes = image.tobytes()
            return raw_bytes, hashlib.sha256(raw_bytes).hexdigest()

        jpeg_bytes = buffer.tobytes()
        sha256_hash = hashlib.sha256(jpeg_bytes).hexdigest()
        return jpeg_bytes, sha256_hash

    def process_frame(
        self, frame: np.ndarray, pts_ms: float, camera_info: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Process a single video frame at the given presentation timestamp (pts_ms).
        Returns list of detection dictionaries ready for alert generation:
          {
            "detected_plate": str,
            "confidence": float,
            "bbox": [x1, y1, x2, y2],
            "pts_timestamp_ms": int,
            "camera_id": str,
            "camera_name": str,
            "camera_dept": str,
            "camera_lat": float,
            "camera_lng": float,
            "snapshot_bytes": bytes,
            "snapshot_hash_sha256": str,
            "crop_image": np.ndarray
          }
        """
        camera_id = camera_info.get("camera_id", "CAM-UNKNOWN-01")
        camera_name = camera_info.get("camera_name", f"Camera {camera_id}")
        department = camera_info.get("department", "Police")
        lat = camera_info.get("lat", 23.0225)
        lng = camera_info.get("lng", 72.5714)

        results: List[Dict[str, Any]] = []

        if self.mode == "dl" and self.detector is not None and self.ocr is not None:
            # --- FULL DEEP LEARNING INFERENCE ---
            plate_boxes = self.detector.detect(frame)

            for item in plate_boxes:
                bbox = item["bbox"]
                conf = item["confidence"]
                plate_crop = self.detector.crop_plate(frame, bbox)

                if plate_crop.size == 0:
                    continue

                raw_text = self.ocr.extract_text(plate_crop)
                normalized_plate = self.ocr.normalize_plate(raw_text)

                # Skip detections that do not conform to Gujarat RTO format
                if not normalized_plate:
                    continue

                jpeg_bytes, snap_hash = self.compute_snapshot_hash(plate_crop)

                detection_event = {
                    "detected_plate": normalized_plate,
                    "confidence": round(conf, 4),
                    "bbox": bbox,
                    "pts_timestamp_ms": int(pts_ms),
                    "camera_id": camera_id,
                    "camera_name": camera_name,
                    "camera_dept": department,
                    "camera_lat": lat,
                    "camera_lng": lng,
                    "snapshot_bytes": jpeg_bytes,
                    "snapshot_hash_sha256": snap_hash,
                    "crop_image": plate_crop,
                }
                results.append(detection_event)

            return results

        # --- DETERMINISTIC TEST MODE ---
        # Deterministic simulation using frame tags, camera hints, or rotating realistic plates
        candidate_plate = (
            camera_info.get("test_plate")
            or camera_info.get("license_plate")
        )

        if not candidate_plate:
            # Deterministically cycle through test plates based on camera_id or counter
            plate_idx = (self._test_counter + abs(hash(camera_id))) % len(DETERMINISTIC_TEST_PLATES)
            candidate_plate = DETERMINISTIC_TEST_PLATES[plate_idx]
            self._test_counter += 1

        # Generate realistic bounding box within frame dimensions
        if frame is not None and frame.size > 0:
            h, w = frame.shape[:2]
            box_w = max(40, int(w * 0.25))
            box_h = max(16, int(h * 0.10))
            x1 = max(0, int((w - box_w) / 2))
            y1 = max(0, int(h * 0.65))
            x2 = min(w, x1 + box_w)
            y2 = min(h, y1 + box_h)
            bbox = [x1, y1, x2, y2]
            crop = frame[y1:y2, x1:x2]
        else:
            bbox = [100, 200, 250, 250]
            crop = np.zeros((50, 150, 3), dtype=np.uint8)

        jpeg_bytes, snap_hash = self.compute_snapshot_hash(crop)

        detection_event = {
            "detected_plate": candidate_plate,
            "confidence": 0.95,
            "bbox": bbox,
            "pts_timestamp_ms": int(pts_ms),
            "camera_id": camera_id,
            "camera_name": camera_name,
            "camera_dept": department,
            "camera_lat": lat,
            "camera_lng": lng,
            "snapshot_bytes": jpeg_bytes,
            "snapshot_hash_sha256": snap_hash,
            "crop_image": crop,
        }
        results.append(detection_event)
        return results
