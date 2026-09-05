import datetime
import logging
from typing import Any, Optional, Union
import xml.etree.ElementTree as ET

from adapters.base import (
    VMSAdapter,
    infer_camera_dept,
    normalize_confidence,
    normalize_plate,
    parse_timestamp_iso,
)

logger = logging.getLogger("sentinel.adapters.milestone")


def _strip_ns(tag: str) -> str:
    """Strip XML namespace prefix from tag name."""
    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


def _find_elem(root: ET.Element, target_tag: str) -> Optional[ET.Element]:
    """Find element by tag name case-insensitively ignoring namespace."""
    target_lower = target_tag.lower()
    for elem in root.iter():
        if _strip_ns(elem.tag).lower() == target_lower:
            return elem
    return None


def _find_text(root: ET.Element, target_tag: str, default: Optional[str] = None) -> Optional[str]:
    """Find text content of element by tag name case-insensitively ignoring namespace."""
    elem = _find_elem(root, target_tag)
    if elem is not None and elem.text is not None:
        val = elem.text.strip()
        if val:
            return val
    return default


class MilestoneAdapter(VMSAdapter):
    """Milestone XProtect VMS Federation Adapter.
    
    Parses Milestone XProtect MIP XML event formats (LPR Alarms,
    Analytics Events, Motion & Object Detection) and normalizes them
    into the unified alert_event.json contract.
    """
    
    def __init__(self, config: Optional[dict] = None):
        super().__init__(vendor_name="Milestone", config=config)
        self.host = self.config.get("host", "127.0.0.1")
        self.port = self.config.get("port", 7563)
        self.mip_version = self.config.get("mip_version", "2026 R1")
    
    async def connect(self, **kwargs) -> bool:
        """Establish connection to Milestone XProtect Event Server."""
        connection_params = {**self.config, **kwargs}
        self.host = connection_params.get("host", self.host)
        self.port = connection_params.get("port", self.port)
        self._connected = True
        logger.info("Connected to Milestone XProtect Event Server at %s:%s", self.host, self.port)
        return True
    
    async def disconnect(self) -> None:
        """Disconnect from Milestone XProtect Event Server."""
        self._connected = False
        self._event_buffer.clear()
        logger.info("Disconnected from Milestone XProtect Event Server")
    
    async def fetch_events(self, since: Optional[datetime.datetime] = None) -> list[dict]:
        """Fetch and normalize events from the local buffer."""
        raw_events = self.get_buffered_events(since=since)
        normalized = []
        for raw in raw_events:
            try:
                norm = self.normalize_event(raw)
                normalized.append(norm)
            except Exception as ex:
                logger.error("Error normalizing Milestone event: %s", ex, exc_info=True)
        return normalized
    
    def validate_event(self, raw_event: dict | str) -> bool:
        """Validate whether the raw event is a valid Milestone event."""
        if not raw_event:
            return False
        
        if isinstance(raw_event, str):
            try:
                root = ET.fromstring(raw_event)
                # Check for Milestone specific XML markers
                root_tag = _strip_ns(root.tag).lower()
                has_header = _find_elem(root, "EventHeader") is not None
                has_body = _find_elem(root, "EventBody") is not None
                has_source = _find_elem(root, "Source") is not None or _find_elem(root, "DeviceId") is not None
                
                if root_tag in ("event", "analyticsevent", "alarm", "milestoneevent"):
                    return True
                if has_header or (has_body and has_source):
                    return True
                return False
            except ET.ParseError:
                return False
        
        elif isinstance(raw_event, dict):
            # Milestone JSON representation
            if "EventHeader" in raw_event or "EventBody" in raw_event:
                return True
            if "EventType" in raw_event and raw_event.get("Vendor") == "Milestone":
                return True
            if "DeviceId" in raw_event and ("LicensePlate" in raw_event or "Data" in raw_event):
                return True
            return False
        
        return False
    
    def normalize_event(self, raw_event: dict | str) -> dict:
        """Normalize Milestone XProtect XML or dict event to alert_event.json contract."""
        if isinstance(raw_event, str):
            return self._normalize_xml(raw_event)
        elif isinstance(raw_event, dict):
            return self._normalize_dict(raw_event)
        else:
            raise ValueError(f"Unsupported event payload type: {type(raw_event)}")
    
    def _normalize_xml(self, xml_str: str) -> dict:
        """Parse and normalize Milestone XML structure."""
        try:
            root = ET.fromstring(xml_str)
        except ET.ParseError as pe:
            raise ValueError(f"Malformed Milestone XML: {pe}") from pe
        
        # 1. Camera identification
        camera_id = (
            _find_text(root, "DeviceId")
            or _find_text(root, "CameraId")
            or _find_text(root, "SourceId")
            or "CAM-POL-UNKNOWN"
        )
        
        camera_name = _find_text(root, "Name")
        
        # 2. License plate detection
        plate = (
            _find_text(root, "LicensePlate")
            or _find_text(root, "Plate")
            or _find_text(root, "PlateNumber")
            or _find_text(root, "VehiclePlate")
            or "UNKNOWN"
        )
        
        # 3. Confidence score
        conf_str = (
            _find_text(root, "Confidence")
            or _find_text(root, "Score")
            or "0.90"
        )
        confidence = normalize_confidence(conf_str)
        
        # 4. GPS Coordinates (Gujarat bounding)
        lat_str = _find_text(root, "Latitude") or _find_text(root, "Lat")
        lng_str = _find_text(root, "Longitude") or _find_text(root, "Lng") or _find_text(root, "Lon")
        
        camera_lat = float(lat_str) if lat_str is not None else 23.0225
        camera_lng = float(lng_str) if lng_str is not None else 72.5714
        
        # 5. Timestamp
        timestamp_str = _find_text(root, "Timestamp") or _find_text(root, "Time")
        
        # 6. Snapshot image path
        image_path = (
            _find_text(root, "ImagePath")
            or _find_text(root, "Snapshot")
            or _find_text(root, "SnapshotPath")
            or _find_text(root, "ImageUri")
            or ""
        )
        
        # 7. Event details / action
        event_class = _find_text(root, "Class") or "AnalyticsEvent"
        event_type = _find_text(root, "Type") or "Alarm"
        obj_class = _find_text(root, "ObjectClassification") or ""
        
        action_parts = [f"Milestone XProtect {event_class} ({event_type})"]
        if obj_class:
            action_parts.append(f"Target: {obj_class}")
        if camera_name:
            action_parts.append(f"Location: {camera_name}")
        recommended_action = " | ".join(action_parts) + ". Forwarded to correlation engine."
        
        return self.build_normalized_alert(
            camera_id=camera_id,
            detected_plate=plate,
            confidence=confidence,
            timestamp=timestamp_str,
            camera_lat=camera_lat,
            camera_lng=camera_lng,
            snapshot_url=image_path,
            recommended_action=recommended_action,
            source_databases=["VMS_FEDERATION_MILESTONE"],
        )
    
    def _normalize_dict(self, data: dict) -> dict:
        """Parse and normalize Milestone dictionary payload."""
        header = data.get("EventHeader", {})
        body = data.get("EventBody", {})
        source = body.get("Source", {}) if isinstance(body, dict) else {}
        event_data = body.get("Data", {}) if isinstance(body, dict) else {}
        geo = body.get("GeoLocation", {}) if isinstance(body, dict) else {}
        
        camera_id = (
            source.get("DeviceId")
            or source.get("CameraId")
            or data.get("DeviceId")
            or data.get("CameraId")
            or "CAM-POL-UNKNOWN"
        )
        
        plate = (
            event_data.get("LicensePlate")
            or event_data.get("Plate")
            or data.get("LicensePlate")
            or data.get("Plate")
            or "UNKNOWN"
        )
        
        confidence = normalize_confidence(
            event_data.get("Confidence", data.get("Confidence", 0.90))
        )
        
        lat = geo.get("Latitude", data.get("Latitude", 23.0225))
        lng = geo.get("Longitude", data.get("Longitude", 72.5714))
        
        timestamp_str = header.get("Timestamp", data.get("Timestamp"))
        snapshot_url = (
            event_data.get("ImagePath")
            or event_data.get("SnapshotUri")
            or data.get("ImagePath")
            or ""
        )
        
        event_class = header.get("Class", data.get("Class", "AnalyticsEvent"))
        camera_name = source.get("Name", data.get("CameraName", ""))
        
        recommended_action = (
            f"Milestone XProtect {event_class} at {camera_name or camera_id}. "
            "Forwarded to correlation engine."
        )
        
        return self.build_normalized_alert(
            camera_id=camera_id,
            detected_plate=plate,
            confidence=confidence,
            timestamp=timestamp_str,
            camera_lat=float(lat),
            camera_lng=float(lng),
            snapshot_url=snapshot_url,
            recommended_action=recommended_action,
            source_databases=["VMS_FEDERATION_MILESTONE"],
        )
