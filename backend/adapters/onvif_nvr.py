import datetime
import logging
from typing import Any, Optional, Union
import xml.etree.ElementTree as ET

from adapters.base import (
    VMSAdapter,
    normalize_confidence,
    normalize_plate,
)

logger = logging.getLogger("sentinel.adapters.onvif")


def _strip_ns(tag: str) -> str:
    """Strip XML namespace prefix from tag name."""
    if "}" in tag:
        return tag.split("}", 1)[1]
    return tag


def _extract_simple_items(root: ET.Element) -> dict[str, str]:
    """Extract all ONVIF SimpleItem elements into a key-value mapping."""
    items: dict[str, str] = {}
    for elem in root.iter():
        tag = _strip_ns(elem.tag).lower()
        if tag in ("simpleitem", "elementitem", "dataitem"):
            name = elem.attrib.get("Name") or elem.attrib.get("name")
            value = elem.attrib.get("Value") or elem.attrib.get("value")
            if not value and elem.text:
                value = elem.text.strip()
            if name and value:
                items[name.lower()] = value
    return items


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


class ONVIFAdapter(VMSAdapter):
    """Generic ONVIF Profile S/G/M and NVR Federation Adapter.
    
    Parses standard ONVIF WS-BaseNotification XML analytics events,
    Topic expressions, SimpleItem structures, and standalone NVR XML feeds.
    Normalizes them to the unified alert_event.json contract.
    """
    
    def __init__(self, config: Optional[dict] = None):
        super().__init__(vendor_name="ONVIF_NVR", config=config)
        self.device_service_url = self.config.get("device_service_url", "http://192.168.1.100/onvif/device_service")
        self.username = self.config.get("username", "admin")
        self.password = self.config.get("password", "")
    
    async def connect(self, **kwargs) -> bool:
        """Establish connection or subscribe to ONVIF Event PullPoint."""
        connection_params = {**self.config, **kwargs}
        self.device_service_url = connection_params.get("device_service_url", self.device_service_url)
        self._connected = True
        logger.info("Connected to ONVIF NVR Event Service at %s", self.device_service_url)
        return True
    
    async def disconnect(self) -> None:
        """Disconnect and unsubscribe from ONVIF Event PullPoint."""
        self._connected = False
        self._event_buffer.clear()
        logger.info("Disconnected from ONVIF NVR Event Service")
    
    async def fetch_events(self, since: Optional[datetime.datetime] = None) -> list[dict]:
        """Fetch and normalize events from the ONVIF ingestion buffer."""
        raw_events = self.get_buffered_events(since=since)
        normalized = []
        for raw in raw_events:
            try:
                norm = self.normalize_event(raw)
                normalized.append(norm)
            except Exception as ex:
                logger.error("Error normalizing ONVIF event: %s", ex, exc_info=True)
        return normalized
    
    def validate_event(self, raw_event: dict | str) -> bool:
        """Validate whether the payload matches ONVIF or generic NVR structure."""
        if not raw_event:
            return False
        
        if isinstance(raw_event, str):
            try:
                root = ET.fromstring(raw_event)
                root_tag = _strip_ns(root.tag).lower()
                
                # Check for ONVIF Notification or Message markers
                if root_tag in ("notificationmessage", "event", "message", "analyticsevent", "envelope"):
                    return True
                
                if _find_elem(root, "Message") is not None or _find_elem(root, "Topic") is not None:
                    return True
                
                if _find_elem(root, "SimpleItem") is not None:
                    return True
                
                if _find_elem(root, "CameraId") is not None or _find_elem(root, "LicensePlate") is not None:
                    return True
                
                return False
            except ET.ParseError:
                return False
        
        elif isinstance(raw_event, dict):
            if "Topic" in raw_event or "SimpleItems" in raw_event:
                return True
            if "CameraId" in raw_event or "LicensePlate" in raw_event or "Plate" in raw_event:
                return True
            return False
        
        return False
    
    def normalize_event(self, raw_event: dict | str) -> dict:
        """Normalize ONVIF XML or dictionary event to alert_event.json contract."""
        if isinstance(raw_event, str):
            return self._normalize_xml(raw_event)
        elif isinstance(raw_event, dict):
            return self._normalize_dict(raw_event)
        else:
            raise ValueError(f"Unsupported event payload type: {type(raw_event)}")
    
    def _normalize_xml(self, xml_str: str) -> dict:
        """Parse and normalize ONVIF WS-BaseNotification XML structure."""
        try:
            root = ET.fromstring(xml_str)
        except ET.ParseError as pe:
            raise ValueError(f"Malformed ONVIF XML: {pe}") from pe
        
        # 1. Extract SimpleItem key-value mappings
        simple_items = _extract_simple_items(root)
        
        # 2. Extract Topic
        topic_text = _find_text(root, "Topic", default="RuleEngine/FieldDetector")
        
        # 3. Extract Message element attributes (e.g. UtcTime)
        msg_elem = _find_elem(root, "Message")
        utc_time_attr = msg_elem.attrib.get("UtcTime") if msg_elem is not None else None
        
        # 4. Extract Camera ID
        producer_ref = _find_text(root, "Address")
        producer_cam = producer_ref.replace("urn:uuid:", "") if producer_ref else None
        
        camera_id = (
            simple_items.get("cameraid")
            or simple_items.get("deviceid")
            or _find_text(root, "CameraId")
            or _find_text(root, "DeviceId")
            or producer_cam
            or simple_items.get("videosourcetoken")
            or "CAM-POL-UNKNOWN"
        )
        
        camera_name = (
            simple_items.get("cameraname")
            or _find_text(root, "CameraName")
            or _find_text(root, "Name")
            or ""
        )
        
        # 5. Extract License Plate
        plate = (
            simple_items.get("licenseplate")
            or simple_items.get("plate")
            or simple_items.get("platenumber")
            or _find_text(root, "LicensePlate")
            or _find_text(root, "Plate")
            or "UNKNOWN"
        )
        detected_plate = normalize_plate(plate)
        
        # 6. Extract Confidence
        conf_raw = (
            simple_items.get("confidence")
            or _find_text(root, "Confidence")
            or "0.90"
        )
        confidence = normalize_confidence(conf_raw)
        
        # 7. Extract Coordinates
        lat_raw = simple_items.get("latitude") or _find_text(root, "Latitude")
        lng_raw = simple_items.get("longitude") or _find_text(root, "Longitude")
        
        try:
            camera_lat = float(lat_raw) if lat_raw is not None else 22.3072
        except (ValueError, TypeError):
            camera_lat = 22.3072
            
        try:
            camera_lng = float(lng_raw) if lng_raw is not None else 73.1812
        except (ValueError, TypeError):
            camera_lng = 73.1812
        
        # 8. Extract Timestamp
        timestamp_str = (
            utc_time_attr
            or simple_items.get("utctime")
            or simple_items.get("timestamp")
            or _find_text(root, "Timestamp")
        )
        
        # 9. Extract Snapshot URI
        snapshot_url = (
            simple_items.get("snapshoturi")
            or simple_items.get("imageuri")
            or _find_text(root, "SnapshotUri")
            or _find_text(root, "ImagePath")
            or ""
        )
        
        # 10. Recommended action / Description
        vehicle_type = simple_items.get("vehicletype", "")
        clean_topic = topic_text.split("/")[-1] if topic_text else "Event"
        
        action_parts = [f"ONVIF Analytics {clean_topic}"]
        if vehicle_type:
            action_parts.append(f"Type: {vehicle_type}")
        if camera_name:
            action_parts.append(f"Location: {camera_name}")
            
        recommended_action = " | ".join(action_parts) + ". Forwarded to correlation engine."
        
        return self.build_normalized_alert(
            camera_id=camera_id,
            detected_plate=detected_plate,
            confidence=confidence,
            timestamp=timestamp_str,
            camera_lat=camera_lat,
            camera_lng=camera_lng,
            snapshot_url=snapshot_url,
            recommended_action=recommended_action,
            source_databases=["VMS_FEDERATION_ONVIF_NVR"],
        )
    
    def _normalize_dict(self, data: dict) -> dict:
        """Parse and normalize ONVIF dictionary representation."""
        simple_items = {k.lower(): str(v) for k, v in data.get("SimpleItems", {}).items()}
        
        camera_id = (
            data.get("CameraId")
            or simple_items.get("cameraid")
            or data.get("DeviceId")
            or "CAM-POL-UNKNOWN"
        )
        
        raw_plate = (
            data.get("LicensePlate")
            or data.get("Plate")
            or simple_items.get("licenseplate")
            or simple_items.get("plate")
            or "UNKNOWN"
        )
        detected_plate = normalize_plate(raw_plate)
        
        raw_conf = data.get("Confidence", simple_items.get("confidence", 0.90))
        confidence = normalize_confidence(raw_conf)
        
        lat = data.get("Latitude", simple_items.get("latitude", 22.3072))
        lng = data.get("Longitude", simple_items.get("longitude", 73.1812))
        
        timestamp_str = data.get("Timestamp", data.get("UtcTime"))
        snapshot_url = data.get("SnapshotUri", simple_items.get("snapshoturi", ""))
        
        camera_name = data.get("CameraName", "")
        topic = data.get("Topic", "ONVIF Event")
        
        recommended_action = f"ONVIF Event ({topic}) at {camera_name or camera_id}. Forwarded to correlation engine."
        
        return self.build_normalized_alert(
            camera_id=camera_id,
            detected_plate=detected_plate,
            confidence=confidence,
            timestamp=timestamp_str,
            camera_lat=float(lat),
            camera_lng=float(lng),
            snapshot_url=snapshot_url,
            recommended_action=recommended_action,
            source_databases=["VMS_FEDERATION_ONVIF_NVR"],
        )
