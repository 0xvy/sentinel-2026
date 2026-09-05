import hashlib
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional
import httpx
import requests

logger = logging.getLogger(__name__)


class AlertEmitter:
    """
    Alert Emitter client for Sentinel 2026.
    Constructs contract-compliant AlertEvent payloads (contracts/alert_event.json)
    and POSTs every detection to the backend /api/alerts endpoint to persist
    in the statewide sightings database (Commandment 7 & 10).
    """

    def __init__(self, backend_url: str = "http://localhost:8000", snapshot_dir: str = "snapshots"):
        self.backend_url = backend_url.rstrip("/")
        self.snapshot_dir = snapshot_dir
        self._alert_counter: int = 1

        # Ensure snapshot directory exists
        try:
            os.makedirs(self.snapshot_dir, exist_ok=True)
        except Exception as exc:
            logger.warning(f"Could not initialize snapshot directory {self.snapshot_dir}: {exc}")

    def generate_alert_id(self) -> str:
        """
        Generate unique alert ID adhering strictly to regex pattern:
        ^ALT-[0-9]{4}-[0-9]{4}-[0-9]{4}$
        Format: ALT-YYYY-MMDD-NNNN
        """
        now = datetime.now(timezone.utc)
        year_str = now.strftime("%Y")
        mmdd_str = now.strftime("%m%d")
        seq_str = f"{self._alert_counter % 10000:04d}"
        self._alert_counter += 1
        return f"ALT-{year_str}-{mmdd_str}-{seq_str}"

    def build_alert_payload(self, detection: Dict[str, Any], camera: Dict[str, Any]) -> Dict[str, Any]:
        """
        Build an AlertEvent dictionary conforming strictly to contracts/alert_event.json.
        """
        alert_id = self.generate_alert_id()
        now_iso = datetime.now(timezone.utc).isoformat()

        # Extract camera details with fallbacks
        cam_id = camera.get("camera_id") or detection.get("camera_id") or "CAM-AMC-AHM-01"
        cam_dept = camera.get("department") or detection.get("camera_dept") or "Police"
        cam_lat = float(camera.get("lat") or detection.get("camera_lat") or 23.0225)
        cam_lng = float(camera.get("lng") or detection.get("camera_lng") or 72.5714)

        pts_ms = int(detection.get("pts_timestamp_ms", 0))
        plate = detection.get("detected_plate", "")
        confidence = float(detection.get("confidence", 0.90))
        threat_level = detection.get("threat_level", "NORMAL")

        # Snapshot handling: save bytes if present and obtain hash
        snap_hash = detection.get("snapshot_hash_sha256")
        snapshot_bytes = detection.get("snapshot_bytes")
        snapshot_path = f"/snapshots/{alert_id}.jpg"

        if snapshot_bytes:
            if not snap_hash:
                snap_hash = hashlib.sha256(snapshot_bytes).hexdigest()
            # Save to disk for forensic archive
            try:
                disk_path = os.path.join(self.snapshot_dir, f"{alert_id}.jpg")
                with open(disk_path, "wb") as f:
                    f.write(snapshot_bytes)
            except Exception as exc:
                logger.warning(f"Could not persist snapshot image to disk: {exc}")
        elif not snap_hash:
            # Deterministic synthetic hash if snapshot_bytes not provided
            snap_hash = hashlib.sha256(f"{alert_id}:{plate}:{pts_ms}".encode("utf-8")).hexdigest()

        payload = {
            "alert_id": alert_id,
            "timestamp_pts_ms": pts_ms,
            "timestamp_iso": now_iso,
            "camera_id": cam_id,
            "camera_dept": cam_dept,
            "camera_lat": cam_lat,
            "camera_lng": cam_lng,
            "detected_plate": plate,
            "confidence": round(confidence, 4),
            "threat_level": threat_level,
            "source_databases": detection.get("source_databases", []),
            "vahan_match": detection.get("vahan_match"),
            "egujcop_match": detection.get("egujcop_match"),
            "sarthi_match": detection.get("sarthi_match"),
            "afis_match": detection.get("afis_match"),
            "nafis_match": detection.get("nafis_match"),
            "recommended_action": detection.get(
                "recommended_action", "Automated ANPR sighting recorded for route reconstruction."
            ),
            "snapshot_url": snapshot_path,
            "snapshot_hash_sha256": snap_hash,
            "direction_of_travel": detection.get("direction_of_travel", "Unknown"),
        }

        return payload

    async def emit_alert(self, detection: Dict[str, Any], camera: Dict[str, Any]) -> Dict[str, Any]:
        """
        Asynchronously POST detection event to backend /api/alerts.
        Returns the backend response (enriched AlertEvent).
        """
        payload = self.build_alert_payload(detection, camera)
        url = f"{self.backend_url}/api/alerts"

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                enriched = response.json()
                logger.info(
                    f"Emitted alert {payload['alert_id']} for plate {payload['detected_plate']} "
                    f"to {url} (Threat: {enriched.get('threat_level', 'NORMAL')})"
                )
                return enriched
        except Exception as exc:
            logger.warning(
                f"Failed to post alert {payload['alert_id']} to {url}: {exc}. "
                "Returning local payload."
            )
            return payload

    def emit_alert_sync(self, detection: Dict[str, Any], camera: Dict[str, Any]) -> Dict[str, Any]:
        """Synchronous fallback to POST detection event to backend /api/alerts."""
        payload = self.build_alert_payload(detection, camera)
        url = f"{self.backend_url}/api/alerts"

        try:
            response = requests.post(url, json=payload, timeout=5.0)
            response.raise_for_status()
            enriched = response.json()
            logger.info(f"Sync emitted alert {payload['alert_id']} for {payload['detected_plate']}")
            return enriched
        except Exception as exc:
            logger.warning(f"Sync post failed for alert {payload['alert_id']} to {url}: {exc}")
            return payload
