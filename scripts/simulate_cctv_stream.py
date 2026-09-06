"""
SENTINEL 2026 — Real-Time CCTV Event Simulator
================================================
Simulates suspect vehicle GJ01ER8842 (Vikram Solanki, Armed Robbery, Absconding)
transiting across Gujarat highway cameras in real-time.

Posts AlertEvent payloads to the backend every 3 seconds, which:
1. Persists each detection to the sightings table
2. Broadcasts over WebSocket /ws/alerts to the frontend
3. Triggers 5-database correlation (VAHAN+SARTHI+eGujCop+AFIS+NAFIS)

Usage:
    python scripts/simulate_cctv_stream.py
    python scripts/simulate_cctv_stream.py --interval 2 --backend http://127.0.0.1:8000
"""

import hashlib
import json
import os
import random
import sys
import time
import uuid
from datetime import datetime, timezone
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

# Fix Windows console encoding for emoji/unicode
if sys.platform == "win32":
    os.system("")  # Enable ANSI escape codes
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ─── Configuration ──────────────────────────────────────────────────────
BACKEND_URL = "http://127.0.0.1:8000"
ALERT_INTERVAL_SEC = 3

# ─── Suspect Vehicle Route: Ahmedabad → Mehsana → Surendranagar → Rajkot ─
# Each waypoint: (camera_id, camera_name, department, district, lat, lng, direction)
SUSPECT_ROUTE = [
    ("CAM-POL-AHM-04", "Navrangpura PS Surveillance Junction", "Police", "Ahmedabad", 23.0365, 72.5611, "NW"),
    ("CAM-POL-AHM-06", "Sola Bhagwat Vidyapith Ring Road", "Police", "Ahmedabad", 23.0812, 72.5262, "N"),
    ("CAM-RTO-SUR-07", "Subhash Bridge RTO Ahmedabad Entry", "Transport (RTO)", "Ahmedabad", 23.0642, 72.5855, "N"),
    ("CAM-PAN-MEH-03", "Chhatral Industrial Highway Panchayat Post", "Panchayat", "Gandhinagar", 23.3250, 72.4350, "NW"),
    ("CAM-GSRTC-VAD-05", "Mehsana GSRTC Depot Main Gate", "GSRTC", "Mehsana", 23.5910, 72.3750, "W"),
    ("CAM-RTO-SUR-01", "Mehsana Highway Toll Checkpost SH-41", "Transport (RTO)", "Mehsana", 23.5412, 72.3920, "SW"),
    ("CAM-PAN-MEH-01", "Radhanpur Crossroads Mehsana Gram Panchayat Naka", "Panchayat", "Mehsana", 23.5980, 72.3780, "W"),
    ("CAM-POL-AHM-08", "Surendranagar State Highway Junction", "Police", "Surendranagar", 22.7210, 71.6420, "W"),
    ("CAM-RTO-SUR-06", "Maliyasan Checkpost Rajkot-Ahmedabad Highway", "Transport (RTO)", "Rajkot", 22.3450, 70.8350, "W"),
    ("CAM-POL-AHM-09", "Madhapar Chowkadi Rajkot City Entry", "Police", "Rajkot", 22.3120, 70.7850, "SW"),
    ("CAM-POL-AHM-10", "Trikon Baug Traffic Intersection", "Police", "Rajkot", 22.3015, 70.8032, "S"),
    ("CAM-GSRTC-VAD-03", "Rajkot Central Bus Station Entry Gate", "GSRTC", "Rajkot", 22.3020, 70.8045, "S"),
]

# ─── Other vehicles to simulate background traffic ──────────────────────
BACKGROUND_VEHICLES = [
    ("GJ01AB1234", "NORMAL"),
    ("GJ05CX9988", "CRITICAL"),   # Stolen
    ("GJ03KJ4521", "NORMAL"),
    ("GJ06HH2299", "NORMAL"),
    ("GJ18PQ7766", "HIGH"),       # Blacklisted
    ("GJ27BC4433", "CRITICAL"),   # Stolen
    ("GJ01MK5678", "NORMAL"),
    ("GJ10RT3344", "NORMAL"),
]

# Background cameras to randomly pick from
BACKGROUND_CAMERAS = [
    ("CAM-POL-AHM-01", "SG Highway Iskcon Junction", "Police", "Ahmedabad", 23.0275, 72.5074),
    ("CAM-AMC-AHM-01", "AMC Smart City Command Center Junction Riverfront East", "Municipal Corp", "Ahmedabad", 23.0315, 72.5802),
    ("CAM-POL-AHM-11", "Varachha Main Road Ring Junction", "Police", "Surat", 21.2144, 72.8596),
    ("CAM-POL-AHM-13", "Sayajigunj Police Chowki Vadodara", "Police", "Vadodara", 22.3105, 73.1810),
    ("CAM-HLT-AHM-01", "Ahmedabad Civil Hospital Asarwa Emergency Gate", "Health", "Ahmedabad", 23.0535, 72.6025),
    ("CAM-GSRTC-VAD-01", "Gita Mandir Central Bus Terminal Platform A", "GSRTC", "Ahmedabad", 23.0112, 72.5938),
    ("CAM-RTO-SUR-05", "Vadodara Golden Chokdi Weighbridge", "Transport (RTO)", "Vadodara", 22.3685, 73.2105),
    ("CAM-AMC-AHM-05", "Surat Municipal Corp Muglisara Headquarters", "Municipal Corp", "Surat", 21.1985, 72.8290),
]

DIRECTIONS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]


def generate_alert_id() -> str:
    now = datetime.now(timezone.utc)
    seq = random.randint(1, 9999)
    return f"ALT-{now.strftime('%Y')}-{now.strftime('%m%d')}-{seq:04d}"


def generate_snapshot_hash(plate: str, camera_id: str, ts: str) -> str:
    raw = f"{plate}:{camera_id}:{ts}:{uuid.uuid4().hex[:8]}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def build_alert_payload(
    plate: str,
    camera_id: str,
    camera_dept: str,
    lat: float,
    lng: float,
    direction: str,
    threat_level: str,
    confidence: float | None = None,
) -> dict:
    now = datetime.now(timezone.utc)
    ts_iso = now.isoformat()
    pts_ms = int(now.timestamp() * 1000) % (86400 * 1000)  # Simulated PTS within 24h window

    if confidence is None:
        confidence = round(random.uniform(0.82, 0.99), 4)

    return {
        "alert_id": generate_alert_id(),
        "timestamp_pts_ms": pts_ms,
        "timestamp_iso": ts_iso,
        "camera_id": camera_id,
        "camera_dept": camera_dept,
        "camera_lat": lat,
        "camera_lng": lng,
        "detected_plate": plate,
        "confidence": confidence,
        "threat_level": threat_level,
        "source_databases": [],
        "direction_of_travel": direction,
        "snapshot_url": f"/snapshots/{plate}_{camera_id}_{now.strftime('%H%M%S')}.jpg",
        "snapshot_hash_sha256": generate_snapshot_hash(plate, camera_id, ts_iso),
    }


def post_alert(payload: dict, backend_url: str) -> dict | None:
    url = f"{backend_url}/api/alerts"
    data = json.dumps(payload).encode("utf-8")
    req = Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")

    try:
        with urlopen(req, timeout=5) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            return body
    except HTTPError as e:
        error_body = e.read().decode("utf-8") if e.fp else "No response body"
        print(f"  ✗ HTTP {e.code}: {error_body[:200]}")
        return None
    except URLError as e:
        print(f"  ✗ Connection failed: {e.reason}")
        print("    → Is the backend running? Start with: uvicorn app.main:app --host 127.0.0.1 --port 8000")
        return None


def check_backend(backend_url: str) -> bool:
    try:
        req = Request(f"{backend_url}/health", method="GET")
        with urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data.get("status") == "healthy"
    except Exception:
        return False


def print_banner():
    print()
    print("=" * 72)
    print("  🚨  SENTINEL 2026 — REAL-TIME CCTV EVENT SIMULATOR")
    print("=" * 72)
    print()
    print("  Suspect: Vikram Solanki (GJ01ER8842)")
    print("  Offence: Armed Robbery — FIR-892/2026/CRIME-BR")
    print("  Status:  ABSCONDING")
    print("  Route:   Ahmedabad → Mehsana → Surendranagar → Rajkot")
    print()
    print("  This simulator posts real AlertEvent payloads to the backend")
    print("  every 3 seconds. Open the frontend to see live alerts appear!")
    print()
    print("  Frontend: http://localhost:5173")
    print("  Backend:  http://127.0.0.1:8000/docs")
    print()
    print("-" * 72)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Sentinel 2026 CCTV Event Simulator")
    parser.add_argument("--backend", default=BACKEND_URL, help="Backend URL")
    parser.add_argument("--interval", type=float, default=ALERT_INTERVAL_SEC, help="Seconds between alerts")
    parser.add_argument("--loops", type=int, default=3, help="Number of full route loops (0=infinite)")
    args = parser.parse_args()

    print_banner()

    # Step 1: Check backend health
    print("  [1/2] Checking backend health...", end=" ", flush=True)
    if not check_backend(args.backend):
        print("✗ FAILED")
        print()
        print("  Backend is not running! Start it first:")
        print("    cd backend")
        print("    uvicorn app.main:app --host 127.0.0.1 --port 8000")
        print()
        sys.exit(1)
    print("✓ Backend healthy")

    # Step 2: Verify cameras exist
    print("  [2/2] Fetching camera registry...", end=" ", flush=True)
    try:
        req = Request(f"{args.backend}/api/cameras", method="GET")
        with urlopen(req, timeout=5) as resp:
            cameras = json.loads(resp.read().decode("utf-8"))
            print(f"✓ {len(cameras)} cameras online")
    except Exception as e:
        print(f"✗ Failed: {e}")
        sys.exit(1)

    print()
    print("=" * 72)
    print("  🟢  SIMULATION STARTED — Press Ctrl+C to stop")
    print("=" * 72)
    print()

    alert_count = 0
    loop_count = 0
    waypoint_idx = 0

    try:
        while True:
            # Every 2nd alert is the suspect, every other is background traffic
            if alert_count % 2 == 0:
                # ─── SUSPECT VEHICLE ─────────────────────────────
                wp = SUSPECT_ROUTE[waypoint_idx % len(SUSPECT_ROUTE)]
                cam_id, cam_name, dept, district, lat, lng, direction = wp

                payload = build_alert_payload(
                    plate="GJ01ER8842",
                    camera_id=cam_id,
                    camera_dept=dept,
                    lat=lat,
                    lng=lng,
                    direction=direction,
                    threat_level="CRITICAL",
                    confidence=round(random.uniform(0.91, 0.99), 4),
                )

                print(f"  🔴 [{alert_count+1:03d}] CRITICAL | GJ01ER8842 | {cam_name}")
                print(f"       ├─ Camera: {cam_id} ({dept}, {district})")
                print(f"       ├─ GPS: {lat:.4f}, {lng:.4f} | Direction: {direction}")
                print(f"       └─ ", end="", flush=True)

                result = post_alert(payload, args.backend)
                if result:
                    enriched_threat = result.get("threat_level", "?")
                    dbs = result.get("source_databases", [])
                    print(f"✓ Posted → Enriched: {enriched_threat} | DBs: {','.join(dbs) if dbs else 'correlating...'}")
                else:
                    print("✗ Failed to post")

                waypoint_idx += 1
                if waypoint_idx >= len(SUSPECT_ROUTE):
                    waypoint_idx = 0
                    loop_count += 1
                    print()
                    print(f"  ━━━ Route loop {loop_count} complete ━━━")
                    if args.loops > 0 and loop_count >= args.loops:
                        print(f"  Completed {args.loops} loops. Stopping.")
                        break
                    print(f"  Restarting route from Ahmedabad...")
                    print()

            else:
                # ─── BACKGROUND TRAFFIC ──────────────────────────
                plate, threat = random.choice(BACKGROUND_VEHICLES)
                cam = random.choice(BACKGROUND_CAMERAS)
                cam_id, cam_name, dept, district, lat, lng = cam
                direction = random.choice(DIRECTIONS)

                payload = build_alert_payload(
                    plate=plate,
                    camera_id=cam_id,
                    camera_dept=dept,
                    lat=lat,
                    lng=lng,
                    direction=direction,
                    threat_level=threat,
                )

                threat_icon = {"CRITICAL": "🔴", "HIGH": "🟠", "NORMAL": "🟢"}.get(threat, "⚪")
                print(f"  {threat_icon} [{alert_count+1:03d}] {threat:8s} | {plate} | {cam_name[:45]}")
                print(f"       └─ ", end="", flush=True)

                result = post_alert(payload, args.backend)
                if result:
                    print(f"✓ Posted")
                else:
                    print("✗ Failed")

            alert_count += 1
            print()
            time.sleep(args.interval)

    except KeyboardInterrupt:
        print()
        print()
        print("=" * 72)
        print(f"  🛑  SIMULATION STOPPED — {alert_count} alerts posted")
        print("=" * 72)
        print()
        print("  Now verify the results:")
        print(f"    1. Check trajectory: {args.backend}/api/vehicles/GJ01ER8842/trajectory")
        print(f"    2. Check alerts:     {args.backend}/api/alerts")
        print(f"    3. Export CSV:       {args.backend}/api/export/csv")
        print()


if __name__ == "__main__":
    main()
