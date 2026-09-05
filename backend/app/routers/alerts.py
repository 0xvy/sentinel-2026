import os
import json
import uuid
import hashlib
from datetime import datetime, timezone
from typing import List, Set
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
import aiosqlite

from app.models import AlertEvent
from app.config import settings
from db.database import get_db
from db.queries import (
    correlate_plate,
    insert_sighting,
    insert_alert,
    get_recent_alerts,
    normalize_plate,
)

router = APIRouter(tags=["Alerts"])

# --- WebSocket Broadcast Manager ---

class AlertConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast(self, message: dict):
        dead_connections = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.add(connection)
        for dead in dead_connections:
            self.disconnect(dead)

alert_manager = AlertConnectionManager()


def append_audit_log(entry_type: str, payload: dict) -> None:
    """
    Append-only forensic audit trail (NFSU requirement).
    Maintains tamper-evident sequential logging with SHA-256 hash.
    """
    now = datetime.now(timezone.utc).isoformat()
    raw_text = json.dumps(payload, sort_keys=True)
    entry_hash = hashlib.sha256(f"{now}:{entry_type}:{raw_text}".encode("utf-8")).hexdigest()
    
    log_line = f"[{now}] [{entry_type}] [HASH:{entry_hash}] {raw_text}\n"
    
    os.makedirs(os.path.dirname(os.path.abspath(settings.AUDIT_LOG_PATH)), exist_ok=True)
    with open(settings.AUDIT_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(log_line)


# --- HTTP Endpoints ---

@router.post("/api/alerts", response_model=AlertEvent)
async def ingest_alert(
    alert: AlertEvent,
    db: aiosqlite.Connection = Depends(get_db),
):
    """
    Unified alert ingestion endpoint.
    Emitted by vision engine or VMS federation adapters.
    1. Validates payload matching contracts/alert_event.json
    2. Persists sighting to sightings table for trajectory reconstruction (Commandment 7)
    3. Correlates against 5-database watchlist
    4. Computes highest-priority threat level
    5. Broadcasts enriched alert to WebSocket clients (/ws/alerts)
    6. Appends to NFSU forensic audit trail
    7. Returns enriched alert response
    """
    clean_plate = normalize_plate(alert.detected_plate)
    now_iso = alert.timestamp_iso or datetime.now(timezone.utc).isoformat()
    
    # 1. Fetch camera metadata if not fully populated
    async with db.execute(
        "SELECT camera_name, department, lat, lng FROM cameras WHERE camera_id = ?",
        (alert.camera_id,)
    ) as cursor:
        cam_row = await cursor.fetchone()

    cam_name = cam_row["camera_name"] if cam_row else f"Camera {alert.camera_id}"
    cam_dept = alert.camera_dept or (cam_row["department"] if cam_row else "Police")
    cam_lat = alert.camera_lat or (cam_row["lat"] if cam_row else 23.0225)
    cam_lng = alert.camera_lng or (cam_row["lng"] if cam_row else 72.5714)

    # 2. Correlate against 5 databases (VAHAN, SARTHI, eGujCop, AFIS, NAFIS)
    watchlist_info = await correlate_plate(db, clean_plate)
    threat_level = watchlist_info["threat_level"]
    is_watchlisted = watchlist_info["is_watchlisted"]
    associated_firs = watchlist_info["associated_firs"]
    first_fir = associated_firs[0] if associated_firs else None

    # 3. Snapshot hash (NFSU chain of custody requirement)
    snapshot_hash = alert.snapshot_hash_sha256
    if not snapshot_hash:
        snapshot_hash = hashlib.sha256(
            f"{alert.alert_id}:{clean_plate}:{now_iso}".encode("utf-8")
        ).hexdigest()

    # 4. CRITICAL: Persist to sightings table for trajectory reconstruction
    sighting_id = str(uuid.uuid4())
    sighting_data = {
        "sighting_id": sighting_id,
        "camera_id": alert.camera_id,
        "camera_name": cam_name,
        "department": cam_dept,
        "plate_number": clean_plate,
        "pts_timestamp_ms": alert.timestamp_pts_ms,
        "timestamp_iso": now_iso,
        "lat": cam_lat,
        "lng": cam_lng,
        "confidence": alert.confidence,
        "direction_of_travel": alert.direction_of_travel or "Unknown",
        "snapshot_url": alert.snapshot_url or f"/snapshots/{clean_plate}_{alert.timestamp_pts_ms}.jpg",
        "snapshot_hash_sha256": snapshot_hash,
        "watchlist_match_flag": 1 if is_watchlisted else 0,
        "associated_fir": first_fir,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await insert_sighting(db, sighting_data)

    # 5. Build enriched alert payload
    enriched_alert_dict = {
        "alert_id": alert.alert_id,
        "timestamp_pts_ms": alert.timestamp_pts_ms,
        "timestamp_iso": now_iso,
        "camera_id": alert.camera_id,
        "camera_dept": cam_dept,
        "camera_lat": cam_lat,
        "camera_lng": cam_lng,
        "detected_plate": clean_plate,
        "confidence": alert.confidence,
        "threat_level": threat_level,
        "direction_of_travel": sighting_data["direction_of_travel"],
        "source_databases": watchlist_info["source_databases"],
        "vahan_match": watchlist_info["vahan_match"],
        "egujcop_match": watchlist_info["egujcop_match"],
        "sarthi_match": watchlist_info["sarthi_match"],
        "afis_match": watchlist_info["afis_match"],
        "nafis_match": watchlist_info["nafis_match"],
        "recommended_action": watchlist_info["recommended_action"],
        "snapshot_url": sighting_data["snapshot_url"],
        "snapshot_hash_sha256": snapshot_hash,
        "created_at": sighting_data["created_at"],
    }

    # 6. Persist alert to database
    await insert_alert(db, enriched_alert_dict)

    # 7. Append to NFSU Forensic Audit Log
    append_audit_log("ALERT_EMITTED", {
        "alert_id": alert.alert_id,
        "plate": clean_plate,
        "threat_level": threat_level,
        "camera_id": alert.camera_id,
        "snapshot_hash": snapshot_hash,
    })

    # 8. Broadcast to all WebSocket clients (/ws/alerts)
    await alert_manager.broadcast(enriched_alert_dict)

    return AlertEvent(**enriched_alert_dict)


@router.get("/api/alerts", response_model=List[AlertEvent])
async def list_recent_alerts(
    limit: int = 100,
    db: aiosqlite.Connection = Depends(get_db),
):
    """
    Retrieve recent alert events (last 100) enriched with watchlist correlation data.
    Used by Frontend Command Center live alert feed.
    """
    alerts = await get_recent_alerts(db, limit=limit)
    return [AlertEvent(**a) for a in alerts]


# --- WebSocket Endpoint ---

@router.websocket("/ws/alerts")
async def websocket_alerts_endpoint(websocket: WebSocket):
    """
    Real-time alert broadcast channel for Frontend Tactical Command Center.
    Receives immediate notification on any camera ANPR detection.
    """
    await alert_manager.connect(websocket)
    try:
        # Keep connection open and handle incoming ping/messages
        while True:
            data = await websocket.receive_text()
            # Client heartbeat or ack
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        alert_manager.disconnect(websocket)
    except Exception:
        alert_manager.disconnect(websocket)
