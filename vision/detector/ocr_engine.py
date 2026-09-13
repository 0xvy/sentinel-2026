import os
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

import logging
import re
from typing import Any, Dict, List, Optional, Tuple
import cv2
import numpy as np

from vision.detector.enhancement import enhance_plate_crop

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
    Supports inductive prefix completion (e.g. '01ER8842' -> 'GJ01ER8842').
    """
    if not raw_text:
        return None

    cleaned = re.sub(r"[^A-Za-z0-9]", "", str(raw_text)).upper()

    if len(cleaned) < 6 or len(cleaned) > 14:
        return None

    # 1. If starts with 2 letters: must be GJ or known OCR misread of GJ
    if len(cleaned) >= 2 and (cleaned[:2].isalpha() or cleaned[:2] in ("G1", "6J", "L1", "EI")):
        if cleaned.startswith(("GJ", "G1", "CJ", "6J", "LJ", "LI", "L1", "EJ", "EI")):
            cleaned = "GJ" + cleaned[2:]
        elif cleaned.startswith("IND"):
            sub = cleaned[3:]
            if len(sub) in (7, 8):
                cleaned = "GJ" + sub
            elif sub.startswith(("GJ", "G1", "CJ", "6J", "LJ", "LI", "L1", "EJ", "EI")):
                cleaned = "GJ" + sub[2:]
            else:
                return None
        else:
            # Another state prefix (e.g. MH, DL, RJ, KA) -> reject
            return None
    # 2. Inductive prefix: text begins directly with RTO (2 digits) + Series (1-2 chars) + Sequence (4 digits)
    elif len(cleaned) in (7, 8):
        rto_cand = cleaned[:2]
        series_cand = cleaned[2:-4]
        seq_cand = cleaned[-4:]
        if (all(c.isdigit() or c in CHAR_TO_NUM for c in rto_cand) and
            all(c.isalpha() or c in NUM_TO_CHAR for c in series_cand) and
            all(c.isdigit() or c in CHAR_TO_NUM for c in seq_cand)):
            cleaned = "GJ" + cleaned
        else:
            return None
    else:
        return None

    if len(cleaned) < 8 or len(cleaned) > 11:
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

    # Disambiguate Series Letters (Chars between RTO and Seq -> Letters)
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
      Supports dual-OCR attack selecting the optimal candidate.
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

    def _get_easy_reader(self):
        """Lazy initialization of EasyOCR to preserve fast startup."""
        if self.easy_reader is None and EASYOCR_AVAILABLE:
            try:
                gpu_flag = self._has_cuda() if self.use_gpu is None else self.use_gpu
                self.easy_reader = easyocr.Reader(["en"], gpu=gpu_flag, verbose=False)
                logger.info(f"Initialized EasyOCR fallback (gpu={gpu_flag})")
            except Exception as exc:
                logger.warning(f"EasyOCR initialization failed: {exc}")
                self.easy_reader = None
        return self.easy_reader

    @property
    def reader(self):
        """Backwards-compatibility property for existing test suites checking ocr.reader."""
        return self.fast_recognizer or self._get_easy_reader()

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

    def extract_with_confidence(
        self, plate_image: np.ndarray, try_dual: bool = True
    ) -> Tuple[str, List[float]]:
        """
        Extract text string and per-character confidence scores using Dual-OCR Attack:
        Tier 1: Fast-Plate-OCR (CCT-S-v2 Transformer)
        Tier 2: EasyOCR (with 30px synthetic white border padding)
        Picks candidate that normalizes cleanly, or has higher character count/confidence.
        Returns: (raw_text, char_confidences)
        """
        if plate_image is None or plate_image.size == 0:
            return "", []

        fast_text = ""
        fast_probs = []

        # TIER 1: Fast-Plate-OCR CCT Model
        if self.fast_recognizer is not None:
            try:
                enhanced = enhance_plate_crop(plate_image)
                if len(enhanced.shape) == 3 and enhanced.shape[2] == 3:
                    rgb_input = cv2.cvtColor(enhanced, cv2.COLOR_BGR2RGB)
                else:
                    rgb_input = enhanced

                pred = self.fast_recognizer.run_one(rgb_input, return_confidence=True)
                fast_text = pred.plate.strip()
                fast_probs = pred.char_probs.tolist() if pred.char_probs is not None else [0.9] * len(fast_text)
            except Exception as exc:
                logger.debug(f"Fast-Plate-OCR execution failed: {exc}")

        # If Fast-Plate-OCR found a full normalized plate, return immediately
        norm_fast = normalize_gujarat_plate(fast_text) if fast_text else None
        if norm_fast and len(fast_text) >= 8:
            return fast_text, fast_probs

        # TIER 2: EasyOCR Fallback / Dual Attack
        easy_text = ""
        easy_probs = []
        reader = self._get_easy_reader()
        if reader is not None and (try_dual or not fast_text):
            try:
                h, w = plate_image.shape[:2]
                scale = max(1, int(100 / max(h, 1)))
                resized = cv2.resize(plate_image, (w * scale, h * scale), interpolation=cv2.INTER_LANCZOS4)
                padded = cv2.copyMakeBorder(resized, 30, 30, 30, 30, cv2.BORDER_CONSTANT, value=[255, 255, 255])

                res = reader.readtext(
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
                    easy_text = "".join(text_parts).strip()
                    easy_probs = confs
            except Exception as exc:
                logger.debug(f"EasyOCR fallback execution failed: {exc}")

        norm_easy = normalize_gujarat_plate(easy_text) if easy_text else None

        # Dual-OCR arbitration:
        if norm_fast and not norm_easy:
            return fast_text, fast_probs
        if norm_easy and not norm_fast:
            return easy_text, easy_probs
        if len(fast_text) >= len(easy_text):
            return (fast_text, fast_probs) if fast_text else (easy_text, easy_probs)
        else:
            return easy_text, easy_probs

    def normalize_plate(self, raw_text: str) -> Optional[str]:
        return normalize_gujarat_plate(raw_text)
