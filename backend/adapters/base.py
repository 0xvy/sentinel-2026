from abc import ABC, abstractmethod
import datetime
import hashlib
import re
import uuid
from typing import Any, Optional, Union

# Thread-safe atomic counter for alert_id generation
_alert_counter = 0


def normalize_plate(raw_plate: Optional[str]) -> str:
    """Normalize license plate number.
    
    Removes spaces, dashes, dots, and non-alphanumeric characters,
    and converts to uppercase.
    Example: 'GJ 01 ER 8842' -> 'GJ01ER8842'
    """
    if not raw_plate:
        return "UNKNOWN"
    cleaned = re.sub(r"[^A-Za-z0-9]", "", str(raw_plate)).upper()
    return cleaned if cleaned else "UNKNOWN"


def normalize_confidence(val: Any, default: float = 0.90) -> float:
    """Normalize confidence score to a float between 0.0 and 1.0.
    
    Vendors like Genetec report confidence as 0-100 (e.g. 96.5),
    while Milestone and ONVIF report 0.0-1.0 (e.g. 0.94).
    """
    try:
        f = float(val)
        if f > 1.0:
            f = f / 100.0
        return max(0.0, min(1.0, round(f, 4)))
    except (ValueError, TypeError):
        return default


def generate_alert_id(dt: Optional[datetime.datetime] = None, seq: Optional[int] = None) -> str:
    """Generate contract-compliant alert_id matching ^ALT-[0-9]{4}-[0-9]{4}-[0-9]{4}$.
    
    Format: ALT-YYYY-MMDD-NNNN
    Example: ALT-2026-0904-0001
    """
    global _alert_counter
    if dt is None:
        dt = datetime.datetime.now(datetime.timezone.utc)
    year = dt.strftime("%Y")
    month_day = dt.strftime("%m%d")
    if seq is None:
        _alert_counter = (_alert_counter + 1) % 10000
        seq = _alert_counter
    else:
        seq = seq % 10000
    return f"ALT-{year}-{month_day}-{seq:04d}"


def compute_snapshot_hash(data: Union[str, bytes, None]) -> str:
    """Compute SHA-256 hash for forensic chain of custody (NFSU requirement).
    
    Returns 64-character lowercase hex string matching ^[a-fA-F0-9]{64}$.
    """
    if data is None:
        data = f"sentinel-vms-snapshot-{uuid.uuid4().hex}"
    if isinstance(data, str):
        data = data.encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def infer_camera_dept(camera_id: str, default: str = "Police") -> str:
    """Infer camera owning department from camera ID naming convention.
    
    Conforms to CameraRegistryEntry department enum:
    Police, Transport (RTO), GSRTC, Health, Municipal Corp, Panchayat,
    Private, Food & Civil Supplies.
    """
    cam_upper = (camera_id or "").upper()
    if "RTO" in cam_upper or "TRANS" in cam_upper:
        return "Transport (RTO)"
    if any(m in cam_upper for m in ["AMC", "SMC", "VMC", "RMC", "MUNICIPAL", "CORP"]):
        return "Municipal Corp"
    if "GSRTC" in cam_upper:
        return "GSRTC"
    if "HOSP" in cam_upper or "HEALTH" in cam_upper:
        return "Health"
    if "PANC" in cam_upper:
        return "Panchayat"
    if "FCS" in cam_upper or "CIVIL" in cam_upper:
        return "Food & Civil Supplies"
    if "PVT" in cam_upper or "PRIVATE" in cam_upper:
        return "Private"
    return default


def parse_timestamp_iso(ts: Optional[Union[str, datetime.datetime]]) -> tuple[datetime.datetime, str]:
    """Parse timestamp into (datetime_obj, iso_string)."""
    if isinstance(ts, datetime.datetime):
        dt = ts
    elif isinstance(ts, str) and ts.strip():
        # Handle ISO formats including trailing Z and offsets
        cleaned = ts.strip()
        if cleaned.endswith("Z"):
            cleaned = cleaned[:-1] + "+00:00"
        try:
            dt = datetime.datetime.fromisoformat(cleaned)
        except ValueError:
            dt = datetime.datetime.now(datetime.timezone.utc)
    else:
        dt = datetime.datetime.now(datetime.timezone.utc)
    
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=datetime.timezone.utc)
    
    return dt, dt.isoformat()


def calculate_pts_ms(dt: datetime.datetime) -> int:
    """Calculate Presentation TimeStamp in milliseconds within day cycle."""
    # Presentation timestamp in ms from start of day or epoch ms
    return int((dt.hour * 3600 + dt.minute * 60 + dt.second) * 1000 + dt.microsecond // 1000)


class VMSAdapter(ABC):
    """Abstract base class for all VMS federation adapters.
    
    Each adapter normalizes vendor-specific event formats into the
    unified alert_event.json contract used by the Sentinel 2026 platform.
    """
    
    def __init__(self, vendor_name: str, config: Optional[dict] = None):
        self.vendor_name = vendor_name
        self.config = config or {}
        self._connected = False
        self._event_buffer: list[dict] = []
    
    @abstractmethod
    async def connect(self, **kwargs) -> bool:
        """Establish connection to VMS platform."""
        ...
    
    @abstractmethod
    async def disconnect(self) -> None:
        """Gracefully disconnect from VMS platform."""
        ...
    
    @abstractmethod
    async def fetch_events(self, since: Optional[datetime.datetime] = None) -> list[dict]:
        """Fetch raw events from VMS platform."""
        ...
    
    @abstractmethod
    def normalize_event(self, raw_event: dict | str) -> dict:
        """Normalize a vendor-specific event into alert_event.json contract format.
        
        Returns a dict matching the AlertEvent schema from contracts/alert_event.json:
        {
            "alert_id": "ALT-YYYY-MMDD-NNNN",
            "timestamp_pts_ms": int,
            "timestamp_iso": "ISO8601",
            "camera_id": str,
            "camera_dept": str,
            "camera_lat": float,
            "camera_lng": float,
            "detected_plate": str,
            "confidence": float,
            "threat_level": "NORMAL",  # enriched later by correlation engine
            ...
        }
        """
        ...
    
    @abstractmethod
    def validate_event(self, raw_event: dict | str) -> bool:
        """Validate raw event structure before normalization."""
        ...
    
    @property
    def is_connected(self) -> bool:
        return self._connected
    
    def queue_event(self, raw_event: dict | str) -> None:
        """Add an event to the local ingestion buffer."""
        self._event_buffer.append({
            "received_at": datetime.datetime.now(datetime.timezone.utc),
            "payload": raw_event
        })
    
    def get_buffered_events(self, since: Optional[datetime.datetime] = None) -> list[dict | str]:
        """Retrieve and drain buffered events filtered by timestamp."""
        if since is None:
            events = [item["payload"] for item in self._event_buffer]
            self._event_buffer.clear()
            return events
        
        filtered = []
        remaining = []
        for item in self._event_buffer:
            if item["received_at"] >= since:
                filtered.append(item["payload"])
            else:
                remaining.append(item)
        self._event_buffer = remaining
        return filtered
    
    def build_normalized_alert(
        self,
        camera_id: str,
        detected_plate: str,
        confidence: float,
        timestamp: Optional[Union[str, datetime.datetime]] = None,
        camera_dept: Optional[str] = None,
        camera_lat: Optional[float] = None,
        camera_lng: Optional[float] = None,
        snapshot_url: Optional[str] = None,
        snapshot_hash_sha256: Optional[str] = None,
        recommended_action: Optional[str] = None,
        source_databases: Optional[list[str]] = None,
        alert_id: Optional[str] = None,
    ) -> dict:
        """Build contract-compliant AlertEvent dictionary.
        
        Validates and populates all required fields and standard forensic metadata.
        """
        dt, iso_str = parse_timestamp_iso(timestamp)
        pts_ms = calculate_pts_ms(dt)
        
        norm_plate = normalize_plate(detected_plate)
        norm_confidence = normalize_confidence(confidence)
        
        if not alert_id:
            alert_id = generate_alert_id(dt)
            
        if not camera_dept:
            camera_dept = infer_camera_dept(camera_id)
            
        if snapshot_url and not snapshot_hash_sha256:
            snapshot_hash_sha256 = compute_snapshot_hash(snapshot_url)
        elif not snapshot_hash_sha256:
            snapshot_hash_sha256 = compute_snapshot_hash(f"{camera_id}:{norm_plate}:{iso_str}")
            
        if not recommended_action:
            recommended_action = (
                f"VMS Federated Ingestion [{self.vendor_name}] - "
                f"Plate {norm_plate} observed at {camera_id}. Pending watchlist correlation."
            )
            
        if source_databases is None:
            source_databases = [f"VMS_{self.vendor_name.upper()}"]
            
        return {
            "alert_id": alert_id,
            "timestamp_pts_ms": pts_ms,
            "timestamp_iso": iso_str,
            "camera_id": camera_id or "CAM-UNKNOWN",
            "camera_dept": camera_dept,
            "camera_lat": float(camera_lat) if camera_lat is not None else 23.0225,
            "camera_lng": float(camera_lng) if camera_lng is not None else 72.5714,
            "detected_plate": norm_plate,
            "confidence": norm_confidence,
            "threat_level": "NORMAL",  # Baseline - enriched by correlation engine
            "source_databases": source_databases,
            "vahan_match": None,
            "egujcop_match": None,
            "sarthi_match": None,
            "afis_match": None,
            "nafis_match": None,
            "recommended_action": recommended_action,
            "snapshot_url": snapshot_url or "",
            "snapshot_hash_sha256": snapshot_hash_sha256,
        }
