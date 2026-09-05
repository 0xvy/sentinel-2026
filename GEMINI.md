# SENTINEL 2026 — WORKSPACE ROOT RULES

> [!IMPORTANT]
> These rules apply to ALL agents, subagents, and sessions operating in this workspace.

## THE 8 OFFICIAL SANDBOX COMMANDMENTS (INVARIANTS)
1. ❌ NEVER USE UDP FOR RTSP: Always set os.environ['OPENCV_FFMPEG_CAPTURE_OPTIONS'] = 'rtsp_transport;tcp' BEFORE importing cv2.
2. ❌ NEVER USE CAP_PROP_FPS OR ARRIVAL TIME FOR TRACKING: Arrival time breaks when gateway bursts cached keyframes. Always use Presentation Timestamps (PTS): cap.get(cv2.CAP_PROP_POS_MSEC).
3. ❌ NEVER HARDCODE RTSP STREAM URLS: Always query GET /api/ingest dynamically to fetch live camera URLs and metadata.
4. ❌ NEVER CRASH ON JOIN DECODE WARNINGS: Suppress H.264/H.265 RPS and POC warnings on join; they clear on the first IDR frame.
5. ✅ ALWAYS IMPLEMENT EXPONENTIAL BACKOFF: Reconnect at 2s initial scaling up to 30s. Never reconnect in a tight loop.
6. ✅ ALWAYS HANDLE 12-HOUR LOOP CUTS: When PTS delta > 5000ms between frames, reset Kalman tracker state cleanly.
7. ✅ ALWAYS LOG ALL SIGHTINGS: Persist every detected plate to the sightings table (not just watchlist alerts) to enable historical route reconstruction (GET /api/vehicles/{plate}/trajectory).
8. ✅ ALWAYS PACE STREAM LOAD: Use frame sub-sampling (1–2 FPS per stream) and batching of 5 streams. Never open 50 unscaled live decoders simultaneously.

## DIRECTORY BOUNDARIES
- Backend code: ONLY edit backend/.
- Vision code: ONLY edit vision/.
- Frontend code: ONLY edit frontend/.
- Docs & Presentations: ONLY edit docs/.
