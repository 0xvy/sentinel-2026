import asyncio
import os
import re
import unittest
import numpy as np

from vision.alert_emitter import AlertEmitter
from vision.config import VisionConfig
from vision.detector.dual_mode import DualModePipeline
from vision.detector.ocr_engine import OCREngine, normalize_gujarat_plate
from vision.detector.plate_detector import PlateDetector
from vision.ingestion_scheduler import IngestionScheduler
from vision.pipeline import DetectionPipeline
from vision.stream_manager import StreamManager
from vision.tracker.tracker import PTSKalmanTracker, compute_iou


class TestVisionConfig(unittest.TestCase):
    def test_default_config(self):
        cfg = VisionConfig()
        self.assertEqual(cfg.MAX_CONCURRENT_STREAMS, 5)
        self.assertEqual(cfg.INFERENCE_FPS, 1.0)
        self.assertEqual(cfg.BATCH_SIZE, 5)
        self.assertEqual(cfg.RECONNECT_INITIAL_DELAY, 2.0)
        self.assertEqual(cfg.RECONNECT_MAX_DELAY, 30.0)
        self.assertEqual(cfg.RECONNECT_BACKOFF_MULTIPLIER, 2.0)
        self.assertEqual(cfg.DETECTION_MODE, "deterministic")

    def test_to_dict_keys(self):
        cfg = VisionConfig()
        d = cfg.to_dict()
        required_keys = [
            "max_concurrent_streams",
            "inference_fps",
            "batch_size",
            "batch_rotation_interval_seconds",
            "frame_queue_max_size",
            "backpressure_strategy",
            "gpu_memory_threshold_mb",
            "reconnect_initial_delay_ms",
            "reconnect_max_delay_ms",
            "reconnect_backoff_multiplier",
        ]
        for k in required_keys:
            self.assertIn(k, d)


class TestStreamManager(unittest.TestCase):
    def setUp(self):
        self.cfg = VisionConfig()
        self.sm = StreamManager(self.cfg)

    def test_tcp_env_set(self):
        opt = os.environ.get("OPENCV_FFMPEG_CAPTURE_OPTIONS")
        self.assertEqual(opt, "rtsp_transport;tcp")

    def test_discontinuity_detection(self):
        # Initial call should not trigger discontinuity
        self.assertFalse(self.sm.check_discontinuity(1000.0, -1.0))
        # Normal step (1000ms increment)
        self.assertFalse(self.sm.check_discontinuity(2000.0, 1000.0))
        # 12-hour loop cut (jump backward to 0)
        self.assertTrue(self.sm.check_discontinuity(0.0, 43200000.0))
        # Massive forward jump > 5000ms
        self.assertTrue(self.sm.check_discontinuity(10000.0, 2000.0))

    def test_subsampling_logic(self):
        # First frame should always be processed
        self.assertTrue(self.sm.subsample(1000.0, -1.0, 1.0))
        # Next frame too soon (500ms after last frame at 1 FPS)
        self.assertFalse(self.sm.subsample(1500.0, 1000.0, 1.0))
        # Frame at or after 1000ms interval
        self.assertTrue(self.sm.subsample(2000.0, 1000.0, 1.0))


class TestIngestionScheduler(unittest.TestCase):
    def setUp(self):
        self.cfg = VisionConfig(batch_size=2, max_concurrent_streams=2)
        self.cameras = [
            {"camera_id": f"CAM-POL-0{i}", "department": "Police"} for i in range(1, 6)
        ]
        self.scheduler = IngestionScheduler(self.cameras, self.cfg)

    def test_batch_partitioning_and_rotation(self):
        # 5 cameras with batch_size=2 -> 3 batches: [2, 2, 1]
        self.assertEqual(len(self.scheduler.batches), 3)
        b1 = self.scheduler.get_current_batch()
        self.assertEqual(len(b1), 2)
        self.assertEqual(b1[0]["camera_id"], "CAM-POL-01")

        # Rotate to batch 2
        b2 = self.scheduler.rotate_batch()
        self.assertEqual(len(b2), 2)
        self.assertEqual(b2[0]["camera_id"], "CAM-POL-03")

        # Rotate to batch 3
        b3 = self.scheduler.rotate_batch()
        self.assertEqual(len(b3), 1)
        self.assertEqual(b3[0]["camera_id"], "CAM-POL-05")

        # Rotate back to batch 1
        b_loop = self.scheduler.rotate_batch()
        self.assertEqual(b_loop[0]["camera_id"], "CAM-POL-01")

    def test_frame_queue_drop_oldest(self):
        cfg = VisionConfig(frame_queue_max_size=3, backpressure_strategy="drop_oldest")
        sch = IngestionScheduler(self.cameras, cfg)
        sch.push_frame({"id": 1})
        sch.push_frame({"id": 2})
        sch.push_frame({"id": 3})
        self.assertEqual(sch.get_queue_size(), 3)

        # Pushing 4th item should drop the oldest (id=1)
        sch.push_frame({"id": 4})
        self.assertEqual(sch.get_queue_size(), 3)
        self.assertEqual(sch.dropped_frames_count, 1)
        item = sch.pop_frame()
        self.assertEqual(item["id"], 2)


class TestPlateDetector(unittest.TestCase):
    def test_crop_plate_safety(self):
        detector = PlateDetector()
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        # Normal crop
        crop = detector.crop_plate(frame, [100, 100, 200, 200])
        self.assertEqual(crop.shape, (100, 100, 3))

        # Out-of-bounds crop should clamp safely
        crop_oob = detector.crop_plate(frame, [-50, -50, 1000, 1000])
        self.assertEqual(crop_oob.shape, (480, 640, 3))

    def test_detect_fallback(self):
        detector = PlateDetector()
        detector.model = None  # Explicitly test deterministic fallback mode
        frame = np.zeros((720, 1280, 3), dtype=np.uint8)
        dets = detector.detect(frame)
        self.assertTrue(len(dets) >= 1)
        self.assertIn("bbox", dets[0])
        self.assertIn("confidence", dets[0])


class TestGujaratPlateNormalizer(unittest.TestCase):
    def test_normalization_rules(self):
        # Spaced and hyphenated
        self.assertEqual(normalize_gujarat_plate("GJ - 01 - AB - 1234"), "GJ01AB1234")
        # Glyph disambiguation O -> 0
        self.assertEqual(normalize_gujarat_plate("GJO1AB1234"), "GJ01AB1234")
        # Standard Surat plate
        self.assertEqual(normalize_gujarat_plate("GJ05CX9988"), "GJ05CX9988")
        # Single-letter series (Rajkot)
        self.assertEqual(normalize_gujarat_plate("GJ03D0007"), "GJ03D0007")
        # Ahmedabad East
        self.assertEqual(normalize_gujarat_plate("GJ27BB4567"), "GJ27BB4567")
        # Missing state code prefix
        self.assertEqual(normalize_gujarat_plate("01AB1234"), "GJ01AB1234")
        # Non-Gujarat plates must be rejected
        self.assertIsNone(normalize_gujarat_plate("MH01AB1234"))
        self.assertIsNone(normalize_gujarat_plate("DL04CC9999"))
        self.assertIsNone(normalize_gujarat_plate(""))


class TestAlertEmitter(unittest.TestCase):
    def test_alert_id_format(self):
        emitter = AlertEmitter()
        alert_id = emitter.generate_alert_id()
        pattern = r"^ALT-[0-9]{4}-[0-9]{4}-[0-9]{4}$"
        self.assertTrue(re.match(pattern, alert_id), f"Alert ID '{alert_id}' failed pattern {pattern}")

    def test_build_alert_payload_contract(self):
        emitter = AlertEmitter()
        detection = {
            "detected_plate": "GJ01AB1234",
            "confidence": 0.95,
            "pts_timestamp_ms": 15000,
            "threat_level": "NORMAL",
        }
        camera = {
            "camera_id": "CAM-AMC-AHM-01",
            "department": "Police",
            "lat": 23.0270,
            "lng": 72.5998,
        }
        payload = emitter.build_alert_payload(detection, camera)

        # Required fields in contracts/alert_event.json
        self.assertTrue(re.match(r"^ALT-[0-9]{4}-[0-9]{4}-[0-9]{4}$", payload["alert_id"]))
        self.assertEqual(payload["camera_id"], "CAM-AMC-AHM-01")
        self.assertEqual(payload["detected_plate"], "GJ01AB1234")
        self.assertEqual(payload["confidence"], 0.95)
        self.assertEqual(payload["threat_level"], "NORMAL")
        self.assertEqual(payload["timestamp_pts_ms"], 15000)
        # SHA-256 hash must be 64 hexadecimal chars
        self.assertTrue(re.match(r"^[a-fA-F0-9]{64}$", payload["snapshot_hash_sha256"]))


class TestPTSKalmanTracker(unittest.TestCase):
    def test_tracker_discontinuity_reset(self):
        tracker = PTSKalmanTracker()
        det = {"bbox": [100, 100, 200, 200], "license_plate": "GJ01AB1234"}

        # Normal frame sequence
        tracker.update([det], 1000.0)
        tracker.update([det], 2000.0)
        self.assertEqual(tracker.reset_count, 0)
        self.assertTrue(len(tracker.tracks) >= 1)

        # 12-hour loop cut: PTS jumps backward
        tracker.update([det], 0.0)
        self.assertEqual(tracker.reset_count, 1)

        # Forward jump > 5000ms
        tracker.update([det], 10000.0)
        self.assertEqual(tracker.reset_count, 2)


class TestDetectionPipeline(unittest.IsolatedAsyncioTestCase):
    async def test_pipeline_process_frame(self):
        cfg = VisionConfig(detection_mode="deterministic")
        pipeline = DetectionPipeline(cfg)
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        camera = {
            "camera_id": "CAM-AMC-AHM-01",
            "camera_name": "Kalupur Station",
            "department": "Police",
            "lat": 23.0270,
            "lng": 72.5998,
            "test_plate": "GJ01AB1234",
        }

        alerts = await pipeline.process_single_frame(frame, 2000.0, camera)
        self.assertEqual(len(alerts), 1)
        self.assertEqual(alerts[0]["detected_plate"], "GJ01AB1234")
        self.assertEqual(alerts[0]["camera_id"], "CAM-AMC-AHM-01")
        self.assertEqual(alerts[0]["timestamp_pts_ms"], 2000)


if __name__ == "__main__":
    unittest.main()
