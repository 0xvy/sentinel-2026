import os
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

import hashlib
import logging
from typing import Any, Dict, List, Optional
import cv2
import numpy as np

from vision.detector.ocr_engine import OCREngine
from vision.detector.plate_detector import PlateDetector

logger = logging.getLogger(__name__)

DETERMINISTIC_TEST_PLATES = [
    "GJ01AB1234", "GJ05CX9988", "GJ03D0007", "GJ27BB4567",
    "GJ06AQ3456", "GJ18MK8899", "GJ01AB5566", "GJ05XY1122",
]


class DualModePipeline:
    """
    Dual-mode ANPR pipeline orchestrator supporting full Deep Learning ('dl')
    and deterministic test execution ('deterministic').
    """

    def __init__(
        self,
        mode: str = "deterministic",
        yolo_model: str = "morsetechlab/yolov11-license-plate-detection",
        confidence_threshold: float = 0.25,
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
        """Compute SHA-256 digest for NFSU Chain of Custody compliance."""
        if image is None or image.size == 0:
            image = np.zeros((16, 64, 3), dtype=np.uint8)

        success, buffer = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 95])
        if not success:
            raw = image.tobytes()
            return raw, hashlib.sha256(raw).hexdigest()

        jpeg_bytes = buffer.tobytes()
        return jpeg_bytes, hashlib.sha256(jpeg_bytes).hexdigest()

    def process_frame(
        self, frame: np.ndarray, pts_ms: float, camera_info: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        camera_id = camera_info.get("camera_id", "CAM-UNKNOWN-01")
        camera_name = camera_info.get("camera_name", f"Camera {camera_id}")
        department = camera_info.get("department", "Police")
        lat = camera_info.get("lat", 23.0225)
        lng = camera_info.get("lng", 72.5714)

        results: List[Dict[str, Any]] = []

        # --- FULL DEEP LEARNING INFERENCE ---
        if self.mode == "dl" and self.detector is not None and self.ocr is not None:
            plate_boxes = self.detector.detect(frame)

            for item in plate_boxes:
                bbox = item["bbox"]
                conf = item["confidence"]
                plate_crop = self.detector.crop_plate(frame, bbox)

                if plate_crop.size == 0:
                    continue

                raw_text, char_confs = self.ocr.extract_with_confidence(plate_crop)
                normalized_plate = self.ocr.normalize_plate(raw_text)

                if not normalized_plate:
                    continue

                jpeg_bytes, snap_hash = self.compute_snapshot_hash(plate_crop)

                results.append({
                    "detected_plate": normalized_plate,
                    "confidence": round(conf, 4),
                    "char_confidences": char_confs,
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
                })
            return results

        # --- DETERMINISTIC TEST MODE ---
        candidate_plate = camera_info.get("test_plate") or camera_info.get("license_plate")
        if not candidate_plate:
            plate_idx = (self._test_counter + abs(hash(camera_id))) % len(DETERMINISTIC_TEST_PLATES)
            candidate_plate = DETERMINISTIC_TEST_PLATES[plate_idx]
            self._test_counter += 1

        if frame is not None and frame.size > 0:
            h, w = frame.shape[:2]
            box_w = max(40, int(w * 0.25))
            box_h = max(16, int(h * 0.10))
            x1 = max(0, int((w - box_w) / 2))
            y1 = max(0, int(h * 0.65))
            bbox = [x1, y1, min(w, x1 + box_w), min(h, y1 + box_h)]
            crop = frame[y1:bbox[3], x1:bbox[2]]
        else:
            bbox = [100, 200, 250, 250]
            crop = np.zeros((50, 150, 3), dtype=np.uint8)

        jpeg_bytes, snap_hash = self.compute_snapshot_hash(crop)

        results.append({
            "detected_plate": candidate_plate,
            "confidence": 0.95,
            "char_confidences": [0.95] * len(candidate_plate),
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
        })
        return results
