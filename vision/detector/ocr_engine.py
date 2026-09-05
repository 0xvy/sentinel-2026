import os
# MANDATORY: MUST be set before cv2 import to enforce TCP transport (Commandment 1)
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

import logging
import re
from typing import Optional
import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Character disambiguation mapping for Indian HSRP font glyphs
NUM_TO_CHAR = {"0": "O", "1": "I", "2": "Z", "5": "S", "8": "B"}
CHAR_TO_NUM = {"O": "0", "I": "1", "Z": "2", "S": "5", "B": "8", "Q": "0", "D": "0"}

# Strict Gujarat RTO format: GJ + 2-digit RTO (01-40) + 1-2 letters + 4 digits
GJ_PLATE_REGEX = re.compile(r"^GJ(0[1-9]|[1-3][0-9]|40|\d{2})[A-Z]{1,2}\d{4}$")

# Attempt EasyOCR import
try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    logger.info("EasyOCR not installed. OCREngine will operate in deterministic mode.")


def normalize_gujarat_plate(raw_text: str) -> Optional[str]:
    """
    Clean and normalize raw OCR text to strict Gujarat HSRP format:
    GJ[0-9]{2}[A-Z]{1,2}[0-9]{4}
    
    Applies deterministic positional glyph disambiguation:
    - Characters 1-2: State code ('GJ')
    - Characters 3-4: RTO District Code (Digits, O->0, I->1, etc.)
    - Characters 5-6: Series identifier (Letters, 0->O, 1->I, etc.)
    - Characters 7-10: Sequence number (Digits, O->0, I->1, etc.)
    
    Returns normalized plate string or None if not a valid Gujarat plate.
    """
    if not raw_text:
        return None

    # 1. Strip whitespace, dashes, dots, symbols, convert to uppercase
    cleaned = re.sub(r"[^A-Za-z0-9]", "", str(raw_text)).upper()

    # Quick length filter (e.g. GJ01A1234=9, GJ01AB1234=10)
    if len(cleaned) < 8 or len(cleaned) > 11:
        return None

    # Force state prefix to 'GJ' if initial letters match common OCR mistakes
    if cleaned.startswith(("GJ", "G1", "CJ", "6J")):
        cleaned = "GJ" + cleaned[2:]
    elif re.match(r"^\d{2}[A-Z]{1,2}\d{4}$", cleaned):
        # Missing state code prefix, remainder matches standard format
        cleaned = "GJ" + cleaned
    elif not cleaned.startswith("GJ"):
        # Not a Gujarat plate (e.g., MH, DL, RJ) -> Reject
        return None

    remainder = cleaned[2:]
    if len(remainder) < 7:
        return None

    # 2. Positional Disambiguation: RTO District (2 digits)
    rto_part = list(remainder[:2])
    for i in range(2):
        if rto_part[i] in CHAR_TO_NUM:
            rto_part[i] = CHAR_TO_NUM[rto_part[i]]
    rto_str = "".join(rto_part)

    rest = remainder[2:]
    # Must have at least 1 series letter + 4 sequence digits = 5 chars
    if len(rest) < 5:
        return None

    # 3. Positional Disambiguation: Sequence Number (last 4 digits)
    seq_part = list(rest[-4:])
    for i in range(4):
        if seq_part[i] in CHAR_TO_NUM:
            seq_part[i] = CHAR_TO_NUM[seq_part[i]]
    seq_str = "".join(seq_part)

    # 4. Positional Disambiguation: Series Letters (1 or 2 characters)
    series_raw = rest[:-4]
    if len(series_raw) < 1 or len(series_raw) > 2:
        return None

    series_part = list(series_raw)
    for i in range(len(series_part)):
        if series_part[i] in NUM_TO_CHAR:
            series_part[i] = NUM_TO_CHAR[series_part[i]]
    series_str = "".join(series_part)

    candidate = f"GJ{rto_str}{series_str}{seq_str}"

    if GJ_PLATE_REGEX.match(candidate):
        return candidate
    return None


class OCREngine:
    """
    Optical Character Recognition (OCR) Engine for Indian HSRP License Plates.
    Integrates EasyOCR with image preprocessing (Grayscale + Bilateral Filter)
    and deterministic Gujarat RTO plate normalization.
    """

    def __init__(self, use_gpu: Optional[bool] = None):
        self.reader = None
        self.use_gpu = use_gpu

        if EASYOCR_AVAILABLE:
            try:
                import torch
                gpu_flag = torch.cuda.is_available() if self.use_gpu is None else self.use_gpu
                self.reader = easyocr.Reader(["en"], gpu=gpu_flag, verbose=False)
                logger.info(f"Initialized EasyOCR reader (gpu={gpu_flag})")
            except Exception as exc:
                logger.warning(f"Failed to initialize EasyOCR: {exc}. Using fallback parser.")
                self.reader = None

    def extract_text(self, plate_image: np.ndarray) -> str:
        """
        Extract raw alphanumeric text from cropped license plate image.
        Applies grayscale conversion and bilateral filter preprocessing.
        """
        if plate_image is None or plate_image.size == 0:
            return ""

        if self.reader is not None:
            try:
                # Preprocess: Grayscale + Bilateral Filter for noise removal
                if len(plate_image.shape) == 3 and plate_image.shape[2] == 3:
                    gray = cv2.cvtColor(plate_image, cv2.COLOR_BGR2GRAY)
                else:
                    gray = plate_image

                filtered = cv2.bilateralFilter(gray, 9, 75, 75)
                ocr_res = self.reader.readtext(filtered, detail=0)
                raw_text = "".join(ocr_res)
                return raw_text.strip()
            except Exception as exc:
                logger.error(f"EasyOCR extraction error: {exc}")

        return ""

    def normalize_plate(self, raw_text: str) -> Optional[str]:
        """
        Normalize raw OCR string using Gujarat positional rules.
        Returns cleaned standard Gujarat plate string e.g. 'GJ01AB1234' or None.
        """
        return normalize_gujarat_plate(raw_text)
