import os
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

import logging
import re
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Character disambiguation dictionaries for Indian HSRP standard
NUM_TO_CHAR = {"0": "O", "1": "I", "2": "Z", "5": "S", "8": "B"}
CHAR_TO_NUM = {"O": "0", "I": "1", "Z": "2", "S": "5", "B": "8", "Q": "0", "D": "0"}

# Strict Gujarat MoRTH format
GJ_PLATE_REGEX = re.compile(r"^GJ(0[1-9]|[1-3][0-9]|40|\d{2})[A-Z]{1,2}\d{4}$")

# Attempt Fast-Plate-OCR import
try:
    from fast_plate_ocr import LicensePlateRecognizer
    FAST_OCR_AVAILABLE = True
except ImportError:
    FAST_OCR_AVAILABLE = False
    logger.info("fast-plate-ocr not installed. Checking EasyOCR.")

# Attempt EasyOCR import
try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    logger.info("EasyOCR not installed. OCREngine will operate in deterministic fallback mode.")


def normalize_gujarat_plate(raw_text: str) -> Optional[str]:
    """
    Clean and normalize raw OCR text to strict Gujarat HSRP format:
    GJ[0-9]{2}[A-Z]{1,2}[0-9]{4}
    """
    if not raw_text:
        return None

    cleaned = re.sub(r"[^A-Za-z0-9]", "", str(raw_text)).upper()

    if len(cleaned) < 8 or len(cleaned) > 11:
        return None

    # Force state prefix to 'GJ' if initial letters match common OCR mistakes
    if cleaned.startswith(("GJ", "G1", "CJ", "6J", "LJ", "LI", "L1", "EJ", "EI")):
        cleaned = "GJ" + cleaned[2:]
    elif re.match(r"^\d{2}[A-Z]{1,2}\d{4}$", cleaned):
        cleaned = "GJ" + cleaned
    elif not cleaned.startswith("GJ"):
        return None

    remainder = cleaned[2:]
    if len(remainder) < 7:
        return None

    # Disambiguate RTO District Code (Chars 3-4 -> Digits)
    rto_part = list(remainder[:2])
    for i in range(2):
        if rto_part[i] in CHAR_TO_NUM:
            rto_part[i] = CHAR_TO_NUM[rto_part[i]]
    rto_str = "".join(rto_part)

    rest = remainder[2:]
    if len(rest) < 5:
        return None

    # Disambiguate Sequence Number (Last 4 Chars -> Digits)
    seq_part = list(rest[-4:])
    for i in range(4):
        if seq_part[i] in CHAR_TO_NUM:
            seq_part[i] = CHAR_TO_NUM[seq_part[i]]
    seq_str = "".join(seq_part)

    # Disambiguate Series Letters (Chars 5-6 -> Letters)
    series_raw = rest[:-4]
    if len(series_raw) < 1 or len(series_raw) > 2:
        return None

    series_part = list(series_raw)
    for i in range(len(series_part)):
        if series_part[i] in NUM_TO_CHAR:
            series_part[i] = NUM_TO_CHAR[series_part[i]]
    series_str = "".join(series_part)

    candidate = f"GJ{rto_str}{series_str}{seq_str}"
    return candidate if GJ_PLATE_REGEX.match(candidate) else None


class OCREngine:
    """
    Dual-Tier Production OCR Engine for Indian HSRP Plates:
      Tier 1: Fast-Plate-OCR (CCT-S-v2 Transformer) — 21ms CPU / 2ms GPU
      Tier 2: EasyOCR (with 30px synthetic white border padding)
    """

    def __init__(self, use_gpu: Optional[bool] = None):
        self.fast_recognizer = None
        self.easy_reader = None
        self.use_gpu = use_gpu

        # Initialize Tier 1: Fast-Plate-OCR
        if FAST_OCR_AVAILABLE:
            try:
                device = "cuda" if (use_gpu or (use_gpu is None and self._has_cuda())) else "cpu"
                self.fast_recognizer = LicensePlateRecognizer(
                    hub_ocr_model="cct-s-v2-global-model",
                    device=device,
                )
                logger.info(f"Initialized Fast-Plate-OCR (device={device})")
            except Exception as exc:
                logger.warning(f"Fast-Plate-OCR initialization failed: {exc}")
                self.fast_recognizer = None

        # Initialize Tier 2: EasyOCR Fallback
        if EASYOCR_AVAILABLE and self.fast_recognizer is None:
            try:
                gpu_flag = self._has_cuda() if self.use_gpu is None else self.use_gpu
                self.easy_reader = easyocr.Reader(["en"], gpu=gpu_flag, verbose=False)
                logger.info(f"Initialized EasyOCR fallback (gpu={gpu_flag})")
            except Exception as exc:
                logger.warning(f"EasyOCR fallback initialization failed: {exc}")
                self.easy_reader = None

    @property
    def reader(self):
        """Backwards-compatibility property for existing test suites checking ocr.reader."""
        return self.fast_recognizer or self.easy_reader

    @staticmethod
    def _has_cuda() -> bool:
        try:
            import torch
            return torch.cuda.is_available()
        except ImportError:
            return False

    def extract_text(self, plate_image: np.ndarray) -> str:
        """
        Extract text string from cropped plate image.
        """
        text, _ = self.extract_with_confidence(plate_image)
        return text

    def extract_with_confidence(self, plate_image: np.ndarray) -> Tuple[str, List[float]]:
        """
        Extract text string and per-character confidence scores.
        Returns: (raw_text, char_confidences)
        """
        if plate_image is None or plate_image.size == 0:
            return "", []

        # TIER 1: Fast-Plate-OCR CCT Model
        if self.fast_recognizer is not None:
            try:
                pred = self.fast_recognizer.run_one(plate_image, return_confidence=True)
                text = pred.plate.strip()
                probs = pred.char_probs.tolist() if pred.char_probs is not None else [0.9] * len(text)
                if text:
                    return text, probs
            except Exception as exc:
                logger.debug(f"Fast-Plate-OCR execution failed: {exc}")

        # TIER 2: EasyOCR with Auto-Padding & Scaling
        if self.easy_reader is not None:
            try:
                h, w = plate_image.shape[:2]
                scale = max(1, int(100 / max(h, 1)))
                resized = cv2.resize(plate_image, (w * scale, h * scale), interpolation=cv2.INTER_LANCZOS4)
                # CRAFT requires padding around tight plate crops to identify word boundaries
                padded = cv2.copyMakeBorder(resized, 25, 25, 25, 25, cv2.BORDER_CONSTANT, value=[255, 255, 255])

                res = self.easy_reader.readtext(
                    padded,
                    detail=1,
                    text_threshold=0.20,
                    low_text=0.20,
                    link_threshold=0.20,
                    mag_ratio=1.5,
                )
                if res:
                    text_parts = [r[1] for r in res]
                    confs = [float(r[2]) for r in res]
                    return "".join(text_parts).strip(), confs
            except Exception as exc:
                logger.debug(f"EasyOCR fallback execution failed: {exc}")

        return "", []

    def normalize_plate(self, raw_text: str) -> Optional[str]:
        return normalize_gujarat_plate(raw_text)
