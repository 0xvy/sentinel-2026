import datetime
import json
import logging
from typing import Any, Optional, Union

from adapters.base import (
    VMSAdapter,
    normalize_confidence,
    normalize_plate,
)

logger = logging.getLogger("sentinel.adapters.genetec")


class GenetecAdapter(VMSAdapter):
    """Genetec Omnicast / Security Center VMS Federation Adapter.
    
    Parses Genetec Omnicast and Security Center webhook JSON payloads:
    - AutoVu LPR reads (LprRead)
    - Alarm events (AlarmTriggered)
    - Camera analytics and perimeter intrusion events
    Normalizes them to the unified alert_event.json contract.
    """
    
    def __init__(self, config: Optional[dict] = None):
        super().__init__(vendor_name="Genetec", config=config)
        self.webhook_endpoint = self.config.get("webhook_endpoint", "/api/vms/genetec/webhook")
        self.server_url = self.config.get("server_url", "https://genetec-server:443")
    
    async def connect(self, **kwargs) -> bool:
        """Establish connection or activate webhook ingestion listener."""
        connection_params = {**self.config, **kwargs}
        self.server_url = connection_params.get("server_url", self.server_url)
        self._connected = True
        logger.info("Genetec Omnicast adapter connected to %s", self.server_url)
        return True
    
    async def disconnect(self) -> None:
        """Disconnect and flush pending events."""
        self._connected = False
        self._event_buffer.clear()
        logger.info("Genetec Omnicast adapter disconnected")
    
    async def fetch_events(self, since: Optional[datetime.datetime] = None) -> list[dict]:
        """Fetch and normalize events received from Genetec webhooks."""
        raw_events = self.get_buffered_events(since=since)
        normalized = []
        for raw in raw_events:
            try:
                norm = self.normalize_event(raw)
                normalized.append(norm)
            except Exception as ex:
                logger.error("Error normalizing Genetec event: %s", ex, exc_info=True)
        return normalized
    
    def validate_event(self, raw_event: dict | str) -> bool:
        """Validate whether the payload is a valid Genetec event structure."""
        if not raw_event:
            return False
        
        data = None
        if isinstance(raw_event, str):
            try:
                data = json.loads(raw_event)
            except (json.JSONDecodeError, UnicodeDecodeError):
                return False
        elif isinstance(raw_event, dict):
            data = raw_event
        else:
            return False
        
        if not isinstance(data, dict):
            return False
        
        # Check for characteristic Genetec keys
        has_event_type = "EventType" in data
        has_source = "Source" in data and isinstance(data["Source"], dict)
        has_entity_id = has_source and ("EntityId" in data["Source"] or "Id" in data["Source"])
        has_lpr_or_alarm = any(k in data for k in ("LprData", "Alarm", "VehicleData", "Position"))
        
        if has_event_type and (has_source or has_lpr_or_alarm):
            return True
        if "PlateRead" in data or "Plate" in data:
            return True
        
        return False
    
    def normalize_event(self, raw_event: dict | str) -> dict:
        """Normalize Genetec Omnicast JSON webhook to alert_event.json contract."""
        if isinstance(raw_event, str):
            try:
                data = json.loads(raw_event)
            except json.JSONDecodeError as err:
                raise ValueError(f"Invalid JSON payload for Genetec event: {err}") from err
        elif isinstance(raw_event, dict):
            data = raw_event
        else:
            raise ValueError(f"Unsupported event payload type: {type(raw_event)}")
        
        # 1. Extract Camera / Source Entity
        source = data.get("Source", {})
        if not isinstance(source, dict):
            source = {}
            
        camera_id = (
            source.get("EntityId")
            or source.get("Id")
            or data.get("EntityId")
            or data.get("CameraId")
            or "CAM-POL-UNKNOWN"
        )
        camera_name = source.get("EntityName", data.get("CameraName", ""))
        
        # 2. Extract License Plate and Confidence
        lpr_data = data.get("LprData", {})
        if not isinstance(lpr_data, dict):
            lpr_data = {}
            
        vehicle_data = data.get("VehicleData", {})
        if not isinstance(vehicle_data, dict):
            vehicle_data = {}
            
        raw_plate = (
            lpr_data.get("PlateRead")
            or vehicle_data.get("Plate")
            or data.get("PlateRead")
            or data.get("Plate")
            or data.get("LicensePlate")
            or "UNKNOWN"
        )
        
        # Normalize plate (e.g. 'GJ 01 ER 8842' -> 'GJ01ER8842')
        detected_plate = normalize_plate(raw_plate)
        
        # Genetec reports confidence on a 0-100 scale (e.g. 96.5) -> normalized to 0.0-1.0
        raw_conf = (
            lpr_data.get("Confidence")
            or vehicle_data.get("Confidence")
            or data.get("Confidence")
            or 95.0
        )
        confidence = normalize_confidence(raw_conf)
        
        # 3. Extract GPS Position (Gujarat Coordinates)
        position = data.get("Position", {})
        if not isinstance(position, dict):
            position = {}
            
        lat_val = position.get("Latitude", data.get("Latitude", 23.0225))
        lng_val = position.get("Longitude", data.get("Longitude", 72.5714))
        try:
            camera_lat = float(lat_val)
        except (ValueError, TypeError):
            camera_lat = 23.0225
            
        try:
            camera_lng = float(lng_val)
        except (ValueError, TypeError):
            camera_lng = 72.5714
        
        # 4. Extract Timestamp
        timestamp_str = (
            data.get("Timestamp")
            or data.get("UtcTime")
            or data.get("DateTime")
        )
        
        # 5. Extract Snapshot Image
        snapshot_obj = data.get("Snapshot", {})
        snapshot_uri = ""
        if isinstance(snapshot_obj, dict):
            snapshot_uri = snapshot_obj.get("Uri", "")
            
        if not snapshot_uri:
            snapshot_uri = (
                lpr_data.get("ImageUri")
                or vehicle_data.get("ImageUri")
                or data.get("ImageUri")
                or data.get("SnapshotUrl")
                or ""
            )
        
        # 6. Recommended Action / Event Description
        event_type = data.get("EventType", "LprRead")
        alarm_data = data.get("Alarm", {})
        alarm_name = alarm_data.get("AlarmName") if isinstance(alarm_data, dict) else ""
        direction = lpr_data.get("Direction", "")
        
        desc_parts = [f"Genetec Omnicast {event_type}"]
        if alarm_name:
            desc_parts.append(f"Alarm: {alarm_name}")
        if direction:
            desc_parts.append(f"Heading: {direction}")
        if camera_name:
            desc_parts.append(f"Location: {camera_name}")
            
        recommended_action = " | ".join(desc_parts) + ". Forwarded to correlation engine."
        
        return self.build_normalized_alert(
            camera_id=camera_id,
            detected_plate=detected_plate,
            confidence=confidence,
            timestamp=timestamp_str,
            camera_lat=camera_lat,
            camera_lng=camera_lng,
            snapshot_url=snapshot_uri,
            recommended_action=recommended_action,
            source_databases=["VMS_FEDERATION_GENETEC"],
        )
