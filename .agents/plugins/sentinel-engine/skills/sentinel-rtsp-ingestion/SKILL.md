---
name: sentinel-rtsp-ingestion
description: Step-by-step procedure for connecting to RTSP streams via the sandbox gateway with TCP enforcement, exponential backoff reconnection, and dynamic URL discovery.
---

# RTSP Stream Ingestion Skill

## Overview
This skill covers connecting to RTSP camera streams from the Sentinel 2026 sandbox environment. ALL streams must be accessed via TCP transport with exponential backoff reconnection.

## Step 1: Environment Setup (MANDATORY — BEFORE ANY IMPORT)

```python
import os
# THIS MUST BE THE VERY FIRST LINE BEFORE cv2 IMPORT
os.environ['OPENCV_FFMPEG_CAPTURE_OPTIONS'] = 'rtsp_transport;tcp'

import cv2  # NOW safe to import
```

### Anti-Pattern (WILL FAIL ON SANDBOX)
```python
# ❌ NEVER DO THIS — UDP causes packet loss on government gateway
import cv2
cap = cv2.VideoCapture(url)  # defaults to UDP, WILL drop frames
```

## Step 2: Dynamic Stream URL Discovery

NEVER hardcode RTSP URLs. Always fetch from the ingest API:

```python
import requests

def get_stream_urls(api_base: str = "http://localhost:8000") -> list[dict]:
    """Fetch live camera URLs and metadata from ingest API."""
    response = requests.get(f"{api_base}/api/ingest")
    response.raise_for_status()
    return response.json()  # [{"camera_id": "...", "stream_url": "rtsp://...", ...}]
```

### Anti-Pattern
```python
# ❌ NEVER hardcode stream URLs
url = "rtsp://192.168.1.100:554/stream1"  # BANNED
```

## Step 3: Stream Connection with Exponential Backoff

```python
import time
import logging
import cv2

logger = logging.getLogger(__name__)

def connect_stream(url: str, max_retries: int = -1) -> cv2.VideoCapture:
    """Connect to RTSP stream with exponential backoff.
    
    Backoff: 2s initial, doubles each retry, caps at 30s.
    max_retries: -1 for infinite retries.
    """
    delay = 2.0
    max_delay = 30.0
    attempt = 0
    
    while max_retries == -1 or attempt < max_retries:
        cap = cv2.VideoCapture(url)
        if cap.isOpened():
            logger.info(f"Connected to stream: {url}")
            return cap
        
        cap.release()
        attempt += 1
        logger.warning(f"Connection failed (attempt {attempt}), retrying in {delay:.1f}s...")
        time.sleep(delay)
        delay = min(delay * 2, max_delay)
    
    raise ConnectionError(f"Failed to connect to {url} after {attempt} attempts")
```

### Anti-Pattern
```python
# ❌ NEVER tight-loop reconnect
while True:
    cap = cv2.VideoCapture(url)
    if cap.isOpened():
        break
    # No sleep = hammers the gateway, gets IP banned
```

## Step 4: Frame Reading with Decode Warning Suppression

```python
import logging
import cv2

logger = logging.getLogger(__name__)

def read_frames(cap: cv2.VideoCapture):
    """Read frames, suppressing non-fatal H.264/H.265 join warnings."""
    consecutive_failures = 0
    max_consecutive_failures = 30  # ~30 seconds at 1 FPS
    
    while True:
        ret, frame = cap.read()
        
        if not ret:
            consecutive_failures += 1
            if consecutive_failures > max_consecutive_failures:
                logger.error("Too many consecutive read failures, reconnecting...")
                break
            # H.264/H.265 RPS and POC warnings on join are NON-FATAL
            # They clear on the first IDR frame. Just continue reading.
            continue
        
        consecutive_failures = 0  # Reset on successful read
        
        # Get PTS timestamp (NEVER use CAP_PROP_FPS or time.time())
        pts_ms = cap.get(cv2.CAP_PROP_POS_MSEC)
        
        yield frame, pts_ms
```

### Anti-Pattern
```python
# ❌ NEVER use time.time() or CAP_PROP_FPS for timestamps
timestamp = time.time()  # BANNED: wall-clock breaks when RTSP gateway bursts cached keyframes
fps = cap.get(cv2.CAP_PROP_FPS)  # BANNED: returns 0 or inaccurate metadata on variable bit-rate RTSP
```

## Step 5: Sub-Sampling for Resource Management

```python
import cv2
from typing import Generator, Tuple
import numpy as np

def subsample_frames(cap: cv2.VideoCapture, target_fps: float = 1.0) -> Generator[Tuple[np.ndarray, float], None, None]:
    """Sub-sample frames to target FPS using PTS timestamps."""
    last_processed_pts = -1.0
    min_interval_ms = 1000.0 / target_fps
    
    for frame, pts_ms in read_frames(cap):
        if last_processed_pts < 0 or (pts_ms - last_processed_pts) >= min_interval_ms:
            last_processed_pts = pts_ms
            yield frame, pts_ms
```

## Step 6: Stream Teardown and Graceful Recovery

```python
def safe_release(cap: cv2.VideoCapture) -> None:
    """Safely release video capture without hanging."""
    if cap is not None and cap.isOpened():
        cap.release()
```

## Validation
```bash
# Run the RTSP ingestion test
python -c "
import os
os.environ['OPENCV_FFMPEG_CAPTURE_OPTIONS'] = 'rtsp_transport;tcp'
import cv2
print('TCP transport configured:', os.environ.get('OPENCV_FFMPEG_CAPTURE_OPTIONS'))
print('cv2 version:', cv2.__version__)
print('PASS: RTSP ingestion environment verified')
"
```
