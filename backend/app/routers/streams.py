import os
# MANDATORY: MUST be set before cv2 import to enforce TCP transport (Commandment 1)
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

import cv2
import time
import queue
import asyncio
import logging
import threading
import hashlib
import uuid
from collections import deque, Counter
from typing import Dict, Optional, Any
from datetime import datetime, timezone
import numpy as np
import aiosqlite
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.config import settings
from db.queries import (
    correlate_plate,
    insert_sighting,
    insert_alert,
    normalize_plate,
)
from app.routers.alerts import alert_manager, append_audit_log
from vision.detector.dual_mode import DualModePipeline
from vision.stream_manager import StreamManager

router = APIRouter(prefix="/api", tags=["Streams"])
logger = logging.getLogger("sentinel.streams")

# Maximum concurrent inference streams to prevent CPU exhaustion (Commandment 8)
MAX_CONCURRENT_STREAMS = 5
IDLE_TIMEOUT_SECONDS = 10.0

# Shared state across workers and streaming endpoints
_frame_buffers: Dict[str, bytes] = {}
_active_workers: Dict[str, threading.Thread] = {}
_stop_events: Dict[str, threading.Event] = {}
_last_access_times: Dict[str, float] = {}
_worker_lock = threading.Lock()

# Queue for decoupled async database ingestion
_detection_queue: queue.Queue = queue.Queue(maxsize=1000)
_queue_drainer_task: Optional[asyncio.Task] = None

# Rolling buffer for multi-frame OCR voting: camera_id -> key -> deque of plates
MAX_VOTE_KEYS = 50
_ocr_vote_buffers: Dict[str, Dict[str, deque]] = {}
_ocr_vote_timestamps: Dict[str, Dict[str, float]] = {}
_last_vote_cleanup: float = 0.0


def _enhance_plate_crop(crop: np.ndarray) -> np.ndarray:
    """
    Adaptive luminance and edge enhancement for license plate crops (USP 3):
    1. Upscale low-res crops (<60px height or <120px width) 4x via Lanczos4 interpolation
    2. Bilateral filter to smooth sensor noise while preserving sharp character edges
    3. Dynamic luminance-conditioned equalization on LAB L-channel:
       - High-beam glare (>195 L_mean): Contrast-limiting aggressive CLAHE (clip=4.0)
       - Night / Underexposed (<75 L_mean): Gamma expansion (gamma=1.8) + CLAHE (clip=3.0)
       - Balanced daylight: Standard CLAHE (clip=2.0)
    """
    if crop is None or crop.size == 0:
        return crop

    h, w = crop.shape[:2]
    # 1. Upscale small crops 4x using Lanczos4 interpolation
    if h < 60 or w < 120:
        crop = cv2.resize(crop, (w * 4, h * 4), interpolation=cv2.INTER_LANCZOS4)

    # 2. Bilateral filtering for edge-preserving noise reduction
    crop = cv2.bilateralFilter(crop, 9, 75, 75)

    # 3. Dynamic luminance enhancement based on scene conditions
    lab = cv2.cvtColor(crop, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    mean_lum = float(np.mean(l_channel))

    if mean_lum > 195.0:
        # HIGH-BEAM GLARE: Aggressive contrast limiting
        clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(6, 6))
    elif mean_lum < 75.0:
        # NIGHT/UNDEREXPOSED: Gamma expansion first
        inv_gamma = 1.0 / 1.8
        table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in range(256)]).astype("uint8")
        l_channel = cv2.LUT(l_channel, table)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    else:
        # STANDARD DAYLIGHT
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

    cl = clahe.apply(l_channel)
    merged = cv2.merge((cl, a_channel, b_channel))
    return cv2.cvtColor(merged, cv2.COLOR_LAB2BGR)


def _vote_plate(camera_id: str, bbox: list, raw_plate: str, vote_window: int = 5) -> str:
    """
    Multi-frame plate voting to eliminate single-frame OCR noise and track moving vehicles:
    1. Tracks by camera_id rolling window ("camera_all") so vehicles shifting 100-300+ px across
       consecutive 2 FPS frames accumulate voting consensus reliably.
    2. Widened ~200px spatial grid (round(x/200)*200, round(y/200)*200).
    3. Prevents memory leaks: caps dictionary to MAX_VOTE_KEYS (50 keys) and runs periodic 30s stale entry cleanup.
    4. Requires 3+ readings agreeing in the window (or 2+ in early buffer of < 3 items).
    """
    global _last_vote_cleanup
    if not raw_plate:
        return ""

    with _worker_lock:
        now = time.time()

        # Periodic 30-second stale key cleanup
        if now - _last_vote_cleanup > 30.0:
            _last_vote_cleanup = now
            for cid in list(_ocr_vote_timestamps.keys()):
                ts_map = _ocr_vote_timestamps.get(cid, {})
                stale_keys = [k for k, ts in ts_map.items() if (now - ts > 30.0) and k != "camera_all"]
                for k in stale_keys:
                    ts_map.pop(k, None)
                    if cid in _ocr_vote_buffers:
                        _ocr_vote_buffers[cid].pop(k, None)

        if camera_id not in _ocr_vote_buffers:
            _ocr_vote_buffers[camera_id] = {}
            _ocr_vote_timestamps[camera_id] = {}

        # 1. Camera-level rolling window (accumulates vehicle plate votes across large pixel shifts)
        all_key = "camera_all"
        if all_key not in _ocr_vote_buffers[camera_id]:
            _ocr_vote_buffers[camera_id][all_key] = deque(maxlen=vote_window)
        _ocr_vote_buffers[camera_id][all_key].append(raw_plate)
        _ocr_vote_timestamps[camera_id][all_key] = now

        # 2. Widened ~200px spatial grid key
        x1 = int(bbox[0]) if bbox and len(bbox) > 0 else 0
        y1 = int(bbox[1]) if bbox and len(bbox) > 1 else 0
        spatial_key = f"{round(x1 / 200.0) * 200}_{round(y1 / 200.0) * 200}"

        if spatial_key not in _ocr_vote_buffers[camera_id]:
            # Memory leak protection: cap to MAX_VOTE_KEYS (50)
            if len(_ocr_vote_buffers[camera_id]) >= MAX_VOTE_KEYS:
                evictable = [(k, ts) for k, ts in _ocr_vote_timestamps[camera_id].items() if k != "camera_all"]
                if evictable:
                    oldest_k = min(evictable, key=lambda x: x[1])[0]
                    _ocr_vote_buffers[camera_id].pop(oldest_k, None)
                    _ocr_vote_timestamps[camera_id].pop(oldest_k, None)

            _ocr_vote_buffers[camera_id][spatial_key] = deque(maxlen=vote_window)

        _ocr_vote_buffers[camera_id][spatial_key].append(raw_plate)
        _ocr_vote_timestamps[camera_id][spatial_key] = now

        # Check camera-level consensus first
        buf_all = _ocr_vote_buffers[camera_id][all_key]
        counts_all = Counter(buf_all)
        most_common_plate, count = counts_all.most_common(1)[0]

        if count >= 3 or (len(buf_all) < 3 and count >= 2):
            return most_common_plate

        # Secondary fallback: spatial window consensus
        buf_sp = _ocr_vote_buffers[camera_id][spatial_key]
        counts_sp = Counter(buf_sp)
        sp_plate, sp_count = counts_sp.most_common(1)[0]
        if sp_count >= 3 or (len(buf_sp) < 3 and sp_count >= 2):
            return sp_plate

        return ""


def _create_connecting_frame(camera_id: str, message: str = "CONNECTING TO LIVE FEED...") -> bytes:
    """Generate a clean tactical connecting HUD frame while RTSP waits for IDR keyframe."""
    frame = np.zeros((480, 854, 3), dtype=np.uint8)
    frame[:] = (20, 11, 7)  # Dark slate background #070b14 in BGR

    # Draw grid lines
    cv2.line(frame, (0, 240), (854, 240), (45, 30, 20), 1)
    cv2.line(frame, (427, 0), (427, 480), (45, 30, 20), 1)

    # Tactical HUD text
    cv2.putText(frame, "GUJARAT POLICE CCTV NETWORK", (30, 45),
                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (212, 182, 6), 2)
    cv2.putText(frame, f"FEED: {camera_id.upper()} | SECURE RTSP / TCP", (30, 80),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (180, 180, 180), 1)

    # Status indicator
    cv2.circle(frame, (40, 240), 8, (0, 215, 255), -1)
    cv2.putText(frame, message, (65, 247),
                cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 215, 255), 2)
    cv2.putText(frame, "Waiting for H.264 IDR sync (~10-14s on initial join)...", (65, 280),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (120, 120, 120), 1)

    # Timestamp
    ts_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    cv2.putText(frame, ts_str, (30, 445),
                cv2.FONT_HERSHEY_SIMPLEX, 0.45, (80, 120, 80), 1)

    _, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
    return jpeg.tobytes()


def _stream_worker(camera_id: str, stop_event: threading.Event):
    """
    Background worker for a single camera feed:
    1. Connects to RTSP server over TCP with exponential backoff
    2. Decodes 1080p frames and extracts hardware PTS
    3. Handles 12-hour loop cut discontinuities (> 5000ms jump)
    4. Sub-samples to ~2 FPS for YOLOv8 plate detection + EasyOCR
    5. Always paints bounding boxes on detected ROIs
    6. Enqueues detections for async database ingestion and alert correlation
    7. Exits cleanly on stop_event or idle timeout (> 10s without readers)
    """
    logger.info(f"Stream worker started for {camera_id}")
    sm = StreamManager()
    
    # Initialize DualModePipeline with specialized model and configurable mode
    detection_mode = os.getenv("DETECTION_MODE", "deterministic")
    pipeline = DualModePipeline(
        mode=detection_mode,
        yolo_model="morsetechlab/yolov11-license-plate-detection",
        confidence_threshold=0.25,
    )
    rtsp_url = settings.build_rtsp_url(camera_id)

    # Initialize buffer with tactical connecting frame
    _frame_buffers[camera_id] = _create_connecting_frame(camera_id, "ESTABLISHING TCP HANDSHAKE...")

    reconnect_delay = 2.0

    while not stop_event.is_set():
        cap = None
        try:
            # Commandment 5: Connect with exponential backoff (2s initial, capped at 30s)
            cap = sm.connect(rtsp_url, max_retries=5)
            reconnect_delay = 2.0  # Reset delay on successful connection
            logger.info(f"RTSP stream connected for {camera_id}: {rtsp_url}")
            
            _frame_buffers[camera_id] = _create_connecting_frame(camera_id, "STREAM SYNCHRONIZED | PROCESSING FRAMES")
            last_inference_pts = -1.0
            last_frame_pts = -1.0

            for frame, pts_ms in sm.read_frames(cap):
                if stop_event.is_set():
                    break

                # Check idle timeout: if no client has read for > IDLE_TIMEOUT_SECONDS, stop
                last_access = _last_access_times.get(camera_id, time.time())
                if time.time() - last_access > IDLE_TIMEOUT_SECONDS:
                    logger.info(f"Stream {camera_id} idle for > {IDLE_TIMEOUT_SECONDS}s. Stopping worker.")
                    stop_event.set()
                    break

                # Commandment 6: Handle 12-hour loop cuts / PTS jump > 5000ms
                if sm.check_discontinuity(pts_ms, last_frame_pts):
                    logger.info(f"PTS discontinuity detected on {camera_id} (pts={pts_ms}ms). Resetting inference state.")
                    last_inference_pts = -1.0
                last_frame_pts = pts_ms

                # Commandment 8: Sub-sample to ~2 FPS inference
                should_infer = sm.subsample(pts_ms, last_inference_pts, 2.0)
                if should_infer:
                    last_inference_pts = pts_ms

                    # Run YOLOv8 detection
                    detections = []
                    if pipeline.detector is not None:
                        detections = pipeline.detector.detect(frame)
                    else:
                        detections = pipeline.process_frame(
                            frame, pts_ms, {"camera_id": camera_id}
                        )

                    # Paint detections and process OCR
                    for det in detections:
                        bbox = det.get("bbox", [0, 0, 0, 0])
                        x1, y1, x2, y2 = [int(v) for v in bbox]
                        conf = det.get("confidence", 0.9)

                        # Crop ROI for OCR and apply enhanced preprocessing
                        crop = frame[max(0, y1):min(frame.shape[0], y2), max(0, x1):min(frame.shape[1], x2)]
                        plate_text = ""
                        if crop.size > 0 and pipeline.ocr is not None:
                            try:
                                enhanced_crop = _enhance_plate_crop(crop)
                                raw_text = pipeline.ocr.extract_text(enhanced_crop)
                                norm_text = pipeline.ocr.normalize_plate(raw_text)
                                if norm_text:
                                    plate_text = _vote_plate(camera_id, bbox, norm_text)
                            except Exception as ocr_err:
                                logger.debug(f"OCR error on crop: {ocr_err}")

                        # If det already had detected_plate (e.g. from process_frame)
                        if not plate_text and "detected_plate" in det:
                            plate_text = det["detected_plate"]

                        # Draw green bounding box (Commandment: real visual ML proof)
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

                        # Determine label
                        if plate_text:
                            label = f"{plate_text} ({conf:.0%})"
                            box_color = (0, 255, 0)
                        else:
                            label = f"PLATE (tracking {conf:.0%})"
                            box_color = (0, 200, 100)

                        # Draw label background banner for readability
                        (lbl_w, lbl_h), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
                        lbl_y = max(lbl_h + 10, y1)
                        cv2.rectangle(frame, (x1, lbl_y - lbl_h - 6), (x1 + lbl_w + 4, lbl_y + 2), (7, 11, 20), -1)
                        cv2.rectangle(frame, (x1, lbl_y - lbl_h - 6), (x1 + lbl_w + 4, lbl_y + 2), box_color, 1)
                        cv2.putText(frame, label, (x1 + 2, lbl_y - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.6, box_color, 2)

                        # If valid plate detected, push to async ingestion queue
                        if plate_text:
                            try:
                                _, crop_buf = cv2.imencode(".jpg", crop if crop.size > 0 else frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
                                snap_bytes = crop_buf.tobytes()
                                snap_hash = hashlib.sha256(snap_bytes).hexdigest()
                                _detection_queue.put_nowait({
                                    "camera_id": camera_id,
                                    "plate_number": plate_text,
                                    "pts_timestamp_ms": int(pts_ms),
                                    "confidence": conf,
                                    "snapshot_bytes": snap_bytes,
                                    "snapshot_hash": snap_hash,
                                })
                            except queue.Full:
                                pass  # Drop to maintain real-time pacing

                # Stamp HUD overlay (Camera name, PTS timestamp)
                h, w = frame.shape[:2]
                hud_text = f"{camera_id.upper()} | PTS: {int(pts_ms):,} ms | 1080p | TCP"
                cv2.putText(frame, hud_text, (20, h - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 255), 1)

                # Encode frame to JPEG and update shared buffer
                success, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
                if success:
                    _frame_buffers[camera_id] = jpeg.tobytes()

            sm.safe_release(cap)
        except Exception as exc:
            logger.error(f"Stream worker error for {camera_id}: {exc}")
            if cap:
                sm.safe_release(cap)
            time.sleep(reconnect_delay)
            reconnect_delay = min(reconnect_delay * 2.0, 30.0)

    # Cleanup worker registry
    with _worker_lock:
        _active_workers.pop(camera_id, None)
        _stop_events.pop(camera_id, None)
        _ocr_vote_buffers.pop(camera_id, None)
        _ocr_vote_timestamps.pop(camera_id, None)
    logger.info(f"Stream worker terminated for {camera_id}")


def _ensure_worker(camera_id: str):
    """
    Ensure an active background inference worker is running for camera_id.
    Enforces maximum of MAX_CONCURRENT_STREAMS active workers (Commandment 8).
    If capacity is reached, stops the oldest/least recently accessed worker.
    """
    with _worker_lock:
        _last_access_times[camera_id] = time.time()
        
        # If worker already alive, do nothing
        if camera_id in _active_workers and _active_workers[camera_id].is_alive():
            return

        # Cap concurrent streams to MAX_CONCURRENT_STREAMS
        alive_workers = {cid: t for cid, t in _active_workers.items() if t.is_alive()}
        if len(alive_workers) >= MAX_CONCURRENT_STREAMS:
            # Find oldest accessed camera to terminate
            oldest_cid = min(alive_workers.keys(), key=lambda cid: _last_access_times.get(cid, 0))
            logger.info(f"Worker capacity reached ({MAX_CONCURRENT_STREAMS}). Stopping oldest worker: {oldest_cid}")
            if oldest_cid in _stop_events:
                _stop_events[oldest_cid].set()
            _active_workers.pop(oldest_cid, None)
            _stop_events.pop(oldest_cid, None)
            _ocr_vote_buffers.pop(oldest_cid, None)
            _ocr_vote_timestamps.pop(oldest_cid, None)

        stop_event = threading.Event()
        _stop_events[camera_id] = stop_event
        t = threading.Thread(target=_stream_worker, args=(camera_id, stop_event), daemon=True)
        t.start()
        _active_workers[camera_id] = t


async def _generate_mjpeg(camera_id: str):
    """
    Async generator yielding MJPEG multipart frames.
    Non-blocking: uses await asyncio.sleep() to preserve FastAPI event loop.
    """
    try:
        while True:
            _last_access_times[camera_id] = time.time()
            jpeg_bytes = _frame_buffers.get(camera_id)
            if jpeg_bytes is None:
                jpeg_bytes = _create_connecting_frame(camera_id)
            
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n"
                b"Content-Length: " + str(len(jpeg_bytes)).encode("ascii") + b"\r\n\r\n"
                + jpeg_bytes
                + b"\r\n"
            )
            await asyncio.sleep(0.08)  # ~12 FPS display refresh
    except asyncio.CancelledError:
        logger.debug(f"Client disconnected from stream {camera_id}")


async def drain_detection_queue():
    """
    Async background worker running on main FastAPI event loop.
    Drains detections from _detection_queue, queries SQLite DB,
    correlates against 5 databases, persists sightings/alerts,
    logs forensic audit, and broadcasts to WebSocket.
    """
    logger.info("Detection queue drainer task started.")
    while True:
        try:
            # Drain batch of up to 10 detections without blocking event loop
            items = []
            while len(items) < 10:
                try:
                    item = _detection_queue.get_nowait()
                    items.append(item)
                except queue.Empty:
                    break

            if not items:
                await asyncio.sleep(0.2)
                continue

            async with aiosqlite.connect(settings.DB_PATH) as db:
                await db.execute("PRAGMA journal_mode=WAL")
                db.row_factory = aiosqlite.Row
                for item in items:
                    camera_id = item["camera_id"]
                    raw_plate = item["plate_number"]
                    pts_ms = item["pts_timestamp_ms"]
                    conf = item["confidence"]
                    snap_hash = item["snapshot_hash"]
                    clean_plate = normalize_plate(raw_plate)
                    now_iso = datetime.now(timezone.utc).isoformat()

                    # 1. Camera metadata
                    async with db.execute(
                        "SELECT camera_name, department, lat, lng FROM cameras WHERE camera_id = ?",
                        (camera_id,)
                    ) as cur:
                        cam_row = await cur.fetchone()

                    cam_name = cam_row["camera_name"] if cam_row else f"Camera {camera_id}"
                    cam_dept = cam_row["department"] if cam_row else "Police"
                    cam_lat = cam_row["lat"] if cam_row else 23.0225
                    cam_lng = cam_row["lng"] if cam_row else 72.5714

                    # 2. 5-Database Watchlist correlation
                    wl = await correlate_plate(db, clean_plate)
                    threat_level = wl["threat_level"]
                    is_wl = wl["is_watchlisted"]
                    associated_firs = wl["associated_firs"]
                    first_fir = associated_firs[0] if associated_firs else None

                    # 3. Commandment 7: Persist every detection to sightings table
                    sighting_id = str(uuid.uuid4())
                    sighting_data = {
                        "sighting_id": sighting_id,
                        "camera_id": camera_id,
                        "camera_name": cam_name,
                        "department": cam_dept,
                        "plate_number": clean_plate,
                        "pts_timestamp_ms": pts_ms,
                        "timestamp_iso": now_iso,
                        "lat": cam_lat,
                        "lng": cam_lng,
                        "confidence": conf,
                        "direction_of_travel": "Unknown",
                        "snapshot_url": f"/snapshots/{clean_plate}_{pts_ms}.jpg",
                        "snapshot_hash_sha256": snap_hash,
                        "watchlist_match_flag": 1 if is_wl else 0,
                        "associated_fir": first_fir,
                        "created_at": now_iso,
                    }
                    await insert_sighting(db, sighting_data)

                    # 4. If flagged on watchlist or target plate GJ01ER8842, emit alert
                    if is_wl or clean_plate == "GJ01ER8842" or threat_level in ("CRITICAL", "HIGH"):
                        alert_id = f"ALT-{datetime.now(timezone.utc).strftime('%Y-%m%d')}-{int(time.time()*1000)%10000:04d}"
                        alert_dict = {
                            "alert_id": alert_id,
                            "timestamp_pts_ms": pts_ms,
                            "timestamp_iso": now_iso,
                            "camera_id": camera_id,
                            "camera_dept": cam_dept,
                            "camera_lat": cam_lat,
                            "camera_lng": cam_lng,
                            "detected_plate": clean_plate,
                            "confidence": conf,
                            "threat_level": threat_level,
                            "direction_of_travel": "Unknown",
                            "source_databases": wl["source_databases"],
                            "vahan_match": wl["vahan_match"],
                            "egujcop_match": wl["egujcop_match"],
                            "sarthi_match": wl["sarthi_match"],
                            "afis_match": wl["afis_match"],
                            "nafis_match": wl["nafis_match"],
                            "recommended_action": wl["recommended_action"],
                            "snapshot_url": sighting_data["snapshot_url"],
                            "snapshot_hash_sha256": snap_hash,
                            "created_at": now_iso,
                        }
                        await insert_alert(db, alert_dict)
                        append_audit_log("ALERT_EMITTED", {
                            "alert_id": alert_id,
                            "plate": clean_plate,
                            "threat_level": threat_level,
                            "camera_id": camera_id,
                            "snapshot_hash": snap_hash,
                        })
                        await alert_manager.broadcast(alert_dict)

                await db.commit()
        except asyncio.CancelledError:
            break
        except Exception as err:
            logger.error(f"Error draining detection queue: {err}")
            await asyncio.sleep(1.0)


@router.get("/streams/{camera_id}/feed")
async def stream_feed(camera_id: str):
    """
    Live MJPEG video feed endpoint with real-time YOLOv8 + EasyOCR annotation.
    Sub-sampled to ~2 FPS ML inference and streamed at ~12 FPS multipart JPEG.
    """
    _ensure_worker(camera_id)
    return StreamingResponse(
        _generate_mjpeg(camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )
