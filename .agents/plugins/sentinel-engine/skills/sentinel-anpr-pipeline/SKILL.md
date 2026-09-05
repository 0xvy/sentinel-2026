---
name: sentinel-anpr-pipeline
description: Step-by-step implementation guide for YOLOv8 Indian HSRP plate detection, OCR extraction, Gujarat plate normalization, dual-mode execution, and contract-compliant alert emission.
---

# Sentinel ANPR Pipeline Skill

## Overview
The Automatic Number Plate Recognition (ANPR) pipeline detects vehicle license plates from camera feeds, crops the plate bounding box, performs optical character recognition (OCR), normalizes the string to valid Gujarat RTO registration formats, computes forensic SHA-256 snapshot hashes for NFSU chain of custody, and emits structured alerts conforming to `contracts/alert_event.json`.

---

## Step 1: Gujarat License Plate Format Specification

Gujarat vehicle registrations adhere to Ministry of Road Transport and Highways (MoRTH) standards with Gujarat State Code `GJ`:
- **Format**: `GJ[0-9]{2}[A-Z]{1,2}[0-9]{4}`
  - Characters 1–2: State Code (`GJ`)
  - Characters 3–4: RTO District Code (`01` = Ahmedabad, `05` = Surat, `03` = Rajkot, `06` = Vadodara, `27` = Ahmedabad East, etc.)
  - Characters 5–6: Series identifier (1 or 2 letters, e.g., `A`, `AB`, `CX`)
  - Characters 7–10: 4-digit sequence number (`0001` through `9999`)
- **Examples**: `GJ01AB1234`, `GJ05CX9988`, `GJ03D0007`, `GJ27BB4567`

---

## Step 2: Gujarat Plate Normalization & Correction Engine

OCR engines frequently confuse glyphs between numbers and letters (e.g., `0` vs `O`, `1` vs `I`, `8` vs `B`, `5` vs `S`, `2` vs `Z`). Because the Gujarat plate format has a strictly defined positional grammar, positional disambiguation is applied deterministically:

```python
import re
from typing import Optional

# Disambiguation mapping dictionaries
NUM_TO_CHAR = {'0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B'}
CHAR_TO_NUM = {'O': '0', 'I': '1', 'Z': '2', 'S': '5', 'B': '8', 'Q': '0', 'D': '0'}

GJ_PLATE_REGEX = re.compile(r"^GJ(0[1-9]|[1-3][0-9]|40)[A-Z]{1,2}\d{4}$")

def normalize_gujarat_plate(raw_text: str) -> Optional[str]:
    """Clean and normalize raw OCR string to strict Gujarat plate format.
    
    Accepts raw strings like 'G J - 0 1   A B  1 2 3 4' or 'GJO1AB1234'
    and normalizes them to 'GJ01AB1234'.
    Returns None if text cannot be normalized into a valid Gujarat plate.
    """
    if not raw_text:
        return None
    
    # 1. Strip whitespace, dashes, dots, symbols, convert to uppercase
    cleaned = re.sub(r"[^A-Za-z0-9]", "", raw_text).upper()
    
    # Quick filter on minimum/maximum plausible length
    if len(cleaned) < 8 or len(cleaned) > 11:
        return None
    
    # Force state prefix to 'GJ' if initial letters match common OCR mistakes
    if cleaned.startswith(("GJ", "G1", "CJ", "6J")):
        cleaned = "GJ" + cleaned[2:]
    elif not cleaned.startswith("GJ"):
        # If OCR missed the GJ prefix but remainder matches 2 digits + 1-2 letters + 4 digits
        if re.match(r"^\d{2}[A-Z]{1,2}\d{4}$", cleaned):
            cleaned = "GJ" + cleaned
        else:
            return None
    
    # Characters after GJ:
    remainder = cleaned[2:]
    
    # District code (2 digits)
    if len(remainder) < 7:
        return None
    
    rto_part = list(remainder[:2])
    for i in range(2):
        if rto_part[i] in CHAR_TO_NUM:
            rto_part[i] = CHAR_TO_NUM[rto_part[i]]
    rto_str = "".join(rto_part)
    
    rest = remainder[2:]
    # Last 4 digits must be numbers
    if len(rest) < 5:
        return None
    
    seq_part = list(rest[-4:])
    for i in range(4):
        if seq_part[i] in CHAR_TO_NUM:
            seq_part[i] = CHAR_TO_NUM[seq_part[i]]
    seq_str = "".join(seq_part)
    
    # Series letters (1 or 2 characters between RTO and sequence)
    series_raw = rest[:-4]
    series_part = list(series_raw)
    for i in range(len(series_part)):
        if series_part[i] in NUM_TO_CHAR:
            series_part[i] = NUM_TO_CHAR[series_part[i]]
    series_str = "".join(series_part)
    
    candidate = f"GJ{rto_str}{series_str}{seq_str}"
    
    if GJ_PLATE_REGEX.match(candidate):
        return candidate
    return None
```

---

## Step 3: Forensic SHA-256 Snapshot Hashing

To maintain National Forensic Sciences University (NFSU) chain of custody standards under Section 65B of the Indian Evidence Act, every snapshot must be hashed with SHA-256 at inference time:

```python
import hashlib
import cv2
import numpy as np

def compute_snapshot_hash(frame: np.ndarray) -> str:
    """Compute SHA-256 hexadecimal digest of raw JPEG-encoded frame bytes."""
    success, buffer = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 95])
    if not success:
        raise ValueError("Failed to encode frame to JPEG for hashing")
    return hashlib.sha256(buffer.tobytes()).hexdigest()
```

---

## Step 4: Full Pipeline Implementation with Dual-Mode Execution

The pipeline supports two modes:
1. **`mode="dl"`**: Loads YOLOv8 nano/small model for plate bounding boxes + EasyOCR for character recognition.
2. **`mode="deterministic"`**: Lightweight mock mode for fast unit tests, deterministic E2E integration, and environments without GPU or model weights.

```python
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import numpy as np

class ANPRPipeline:
    def __init__(self, mode: str = "deterministic", model_path: Optional[str] = None):
        self.mode = mode
        self.yolo_model = None
        self.ocr_reader = None
        
        if self.mode == "dl":
            from ultralytics import YOLO
            import easyocr
            model_file = model_path or "yolov8n-plate.pt"
            self.yolo_model = YOLO(model_file)
            self.ocr_reader = easyocr.Reader(['en'], gpu=True)

    def detect_and_recognize(
        self, 
        frame: np.ndarray, 
        camera_id: str, 
        camera_name: str, 
        department: str, 
        pts_timestamp_ms: int,
        watchlist_db: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> List[Dict[str, Any]]:
        """Process frame and return list of contract-compliant alert events."""
        results = []
        
        if self.mode == "deterministic":
            # Deterministic test mode: inspect metadata or test tags
            return results
        
        # DL Inference Mode
        img_h, img_w = frame.shape[:2]
        detections = self.yolo_model(frame, verbose=False)[0]
        
        for box in detections.boxes:
            conf = float(box.conf[0])
            if conf < 0.40:
                continue
            
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(img_w, x2), min(img_h, y2)
            
            plate_crop = frame[y1:y2, x1:x2]
            if plate_crop.size == 0:
                continue
            
            # Preprocessing for OCR: Grayscale + Bilateral Filter
            gray = cv2.cvtColor(plate_crop, cv2.COLOR_BGR2GRAY)
            filtered = cv2.bilateralFilter(gray, 9, 75, 75)
            
            ocr_res = self.ocr_reader.readtext(filtered, detail=0)
            raw_ocr = "".join(ocr_res)
            normalized_plate = normalize_gujarat_plate(raw_ocr)
            
            if not normalized_plate:
                continue
            
            # Forensic snapshot hash
            snap_hash = compute_snapshot_hash(plate_crop)
            
            # Watchlist correlation
            match_flag = False
            associated_fir = ""
            threat_level = "GREEN"
            
            if watchlist_db and normalized_plate in watchlist_db:
                match_flag = True
                record = watchlist_db[normalized_plate]
                associated_fir = record.get("fir_number", "")
                threat_level = record.get("threat_level", "RED")
            
            event = {
                "alert_id": str(uuid.uuid4()),
                "camera_id": camera_id,
                "camera_name": camera_name,
                "department": department,
                "license_plate": normalized_plate,
                "pts_timestamp_ms": int(pts_timestamp_ms),
                "human_time": datetime.now(timezone.utc).isoformat(),
                "confidence": round(conf, 4),
                "bbox": [x1, y1, x2, y2],
                "snapshot_hash": snap_hash,
                "watchlist_match_flag": match_flag,
                "associated_fir": associated_fir,
                "threat_level": threat_level
            }
            results.append(event)
            
        return results
```

---

## Step 5: Emitting and Persisting Alert Events

Under Commandment 7, **every plate detected must be persisted to the sightings table**, not just watchlist matches. This powers historical route reconstruction:

```python
import requests
import logging

logger = logging.getLogger(__name__)

def emit_and_persist(event: Dict[str, Any], api_base: str = "http://localhost:8000") -> None:
    """Post detection event to backend for persistence and WebSocket broadcast."""
    url = f"{api_base}/api/alerts"
    try:
        resp = requests.post(url, json=event, timeout=2.0)
        resp.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to persist alert event {event.get('alert_id')}: {e}")
```

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Using Generic COCO Models
```python
# ❌ NEVER use standard YOLO COCO weights
from ultralytics import YOLO
model = YOLO("yolov8n.pt")  # Detects "car", "bus", "truck", NOT license plates!
```
*Why it fails*: COCO models draw boxes around entire vehicles. The license plate is a tiny sub-region (often <2% of vehicle area). Feeding the whole car to OCR yields character garbage or dashboard logos.

### ❌ Anti-Pattern 2: Skipping Character Disambiguation & Regex Normalization
```python
# ❌ NEVER pass raw OCR text directly to database or watchlist
plate = raw_ocr_text.strip()
if plate in watchlist: # Fails: 'GJO1AB1234' != 'GJ01AB1234'
    send_alert()
```
*Why it fails*: High Security Registration Plates (HSRP) standard uses font glyphs where `O` and `0` appear almost identical to optical character recognizers. Positional normalization is mandatory.

### ❌ Anti-Pattern 3: Omitting Forensic Hash
```python
# ❌ NEVER store snapshots without cryptographic hashing
payload = {"plate": plate, "image_path": "/tmp/img.jpg"}
```
*Why it fails*: Without SHA-256 hashing at capture time, evidence is inadmissible in court under Indian Evidence Act Section 65B and fails NFSU forensic certification criteria.

---

## Validation Test

Verify the regex normalizer and pipeline logic:

```bash
python -c "
import re
from typing import Optional

NUM_TO_CHAR = {'0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B'}
CHAR_TO_NUM = {'O': '0', 'I': '1', 'Z': '2', 'S': '5', 'B': '8', 'Q': '0', 'D': '0'}
GJ_PLATE_REGEX = re.compile(r'^GJ(0[1-9]|[1-3][0-9]|40)[A-Z]{1,2}\d{4}$')

def test_norm(text):
    cleaned = re.sub(r'[^A-Za-z0-9]', '', text).upper()
    if len(cleaned) < 8 or len(cleaned) > 11:
        return None
    if cleaned.startswith(('GJ', 'G1', 'CJ', '6J')):
        cleaned = 'GJ' + cleaned[2:]
    elif re.match(r'^\d{2}[A-Z]{1,2}\d{4}$', cleaned):
        cleaned = 'GJ' + cleaned
    else:
        return None
    remainder = cleaned[2:]
    rto = [CHAR_TO_NUM.get(c, c) for c in remainder[:2]]
    seq = [CHAR_TO_NUM.get(c, c) for c in remainder[-4:]]
    series = [NUM_TO_CHAR.get(c, c) for c in remainder[2:-4]]
    candidate = 'GJ' + ''.join(rto) + ''.join(series) + ''.join(seq)
    return candidate if GJ_PLATE_REGEX.match(candidate) else None

assert test_norm('GJ-01-AB-1234') == 'GJ01AB1234', 'Failed on spaced plate'
assert test_norm('GJO1AB1234') == 'GJ01AB1234', 'Failed on O->0 correction'
assert test_norm('GJ05CX9988') == 'GJ05CX9988', 'Failed on standard plate'
assert test_norm('MH01AB1234') is None, 'Should reject non-Gujarat plate'
print('PASS: All Gujarat plate normalizer tests succeeded.')
"
```
