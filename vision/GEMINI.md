# VISION DIRECTORY RULES

> [!IMPORTANT]
> These rules apply to ALL agents working in `vision/`.

## DIRECTORY BOUNDARY
- You may ONLY create/edit files inside `vision/`. NEVER touch `backend/`, `frontend/`, or `docs/`.

## THE 4 UNBREAKABLE STREAM RULES
1. **TCP ONLY**: Set `os.environ['OPENCV_FFMPEG_CAPTURE_OPTIONS'] = 'rtsp_transport;tcp'` BEFORE `import cv2`. Every. Single. File.
2. **PTS ONLY**: Use `cap.get(cv2.CAP_PROP_POS_MSEC)` for ALL timing. NEVER use `CAP_PROP_FPS`, `time.time()`, or frame arrival timestamps.
3. **EXPONENTIAL BACKOFF**: Reconnect at 2s initial, scaling to 30s max. NEVER tight-loop reconnect.
4. **SUPPRESS JOIN WARNINGS**: H.264/H.265 RPS and POC decode warnings on stream join are NON-FATAL. Suppress them; they clear on the first IDR frame.

## KALMAN TRACKER RULES
- Initialize Kalman state from PTS-only measurements.
- When PTS delta between consecutive frames exceeds 5000ms, this indicates a 12-hour feed loop cut. RESET the Kalman tracker state cleanly — do not propagate stale predictions across the discontinuity.
- Track IDs must be stable within a continuous PTS segment.

## INGESTION SCHEDULER RULES
- Frame sub-sampling: decode at 1–2 FPS per camera. Surveillance vehicles don't teleport.
- Round-robin batch inference: group cameras into batches of 5 active streams; rotate batches.
- `MAX_CONCURRENT_STREAMS` (default: 5) and `INFERENCE_FPS` (default: 1.0) must be configurable via env vars.
- Frame queue with backpressure: drop oldest frames if inference falls behind. NEVER block the decoder.
- GPU memory guard: detect available VRAM and auto-scale batch size.

## DETECTION OUTPUT
- Every detection MUST be POSTed to the backend `/api/alerts` endpoint to persist in the `sightings` table.
- Alert payloads MUST conform to `contracts/alert_event.json`.
- SHA-256 hash every snapshot image at detection time.

## EVALUATION CSV
- Output MUST match `contracts/evaluation_csv.json` schema exactly.
- Columns: camera_id, camera_name, department, license_plate, pts_timestamp_ms, human_time, watchlist_match_flag, associated_fir
