from typing import List, Optional, Literal
from pydantic import BaseModel, Field, ConfigDict

# --- VMS & GIS Camera Models ---

CameraDepartment = Literal[
    "Police",
    "Transport (RTO)",
    "GSRTC",
    "Health",
    "Municipal Corp",
    "Panchayat",
    "Private",
    "Food & Civil Supplies",
]

CameraStatus = Literal["Online", "Offline", "Degraded"]
VMSVendor = Literal["Milestone", "Genetec", "ONVIF_NVR", "Analog_DVR", "Direct_IP"]
CameraResolution = Literal["1080p", "720p", "4K", "480p", "Analog"]

class CameraRegistryEntry(BaseModel):
    camera_id: str = Field(
        ...,
        pattern=r"^CAM-[A-Z]+-[A-Z]+-[0-9]+$",
        description="Unique camera identifier, e.g. CAM-AMC-AHM-01",
    )
    camera_name: str = Field(..., description="Human-readable camera location name")
    department: CameraDepartment = Field(..., description="Camera owning department")
    district: str = Field(..., description="Gujarat district or commissionerate")
    lat: float = Field(..., ge=20.0, le=24.5, description="Latitude (Gujarat range)")
    lng: float = Field(..., ge=68.0, le=74.5, description="Longitude (Gujarat range)")
    status: CameraStatus = Field(default="Online", description="Operational health status")
    stream_url: Optional[str] = Field(default=None, description="RTSP or live stream endpoint")
    vms_vendor: Optional[VMSVendor] = Field(default="Direct_IP", description="VMS provider")
    installed_date: Optional[str] = Field(default=None, description="Installation date (YYYY-MM-DD)")
    resolution: Optional[CameraResolution] = Field(default="1080p", description="Stream resolution")
    ptz_capable: Optional[bool] = Field(default=False, description="PTZ control support")
    last_health_check: Optional[str] = Field(default=None, description="Last health check ISO timestamp")

    model_config = ConfigDict(from_attributes=True)


# --- Sighting & Trajectory Models ---

DirectionOfTravel = Literal["N", "NE", "E", "SE", "S", "SW", "W", "NW", "Unknown"]
ThreatLevel = Literal["CRITICAL", "HIGH", "MEDIUM", "LOW", "NORMAL"]

class SightingItem(BaseModel):
    sighting_id: str = Field(..., description="Unique sighting UUID")
    camera_id: str = Field(..., description="Camera asset identifier")
    camera_name: str = Field(..., description="Camera location name")
    department: str = Field(..., description="Camera owning department")
    lat: float = Field(..., ge=20.0, le=24.5, description="Latitude")
    lng: float = Field(..., ge=68.0, le=74.5, description="Longitude")
    pts_timestamp_ms: int = Field(..., ge=0, description="Hardware presentation timestamp in ms")
    timestamp_iso: str = Field(..., description="ISO 8601 sighting timestamp")
    confidence: float = Field(..., ge=0.0, le=1.0, description="OCR confidence score")
    direction_of_travel: DirectionOfTravel = Field(default="Unknown", description="Motion heading vector")
    snapshot_url: str = Field(..., description="Storage URL of crop image")
    snapshot_hash_sha256: str = Field(
        ...,
        pattern=r"^[a-fA-F0-9]{64}$",
        description="SHA-256 cryptographic hash of snapshot for NFSU chain of custody",
    )

    model_config = ConfigDict(from_attributes=True)


class WatchlistStatus(BaseModel):
    is_watchlisted: bool = Field(..., description="True if vehicle or owner is flagged")
    threat_level: ThreatLevel = Field(..., description="Highest threat rating assigned to vehicle")
    matched_databases: List[str] = Field(default_factory=list, description="List of matched databases")
    associated_firs: List[str] = Field(default_factory=list, description="Array of linked FIR numbers")


class TrajectoryResponse(BaseModel):
    plate_number: str = Field(..., description="Target vehicle license plate")
    total_sightings: int = Field(..., ge=0, description="Total verified sightings")
    first_seen: Optional[str] = Field(default=None, description="Timestamp of earliest sighting")
    last_seen: Optional[str] = Field(default=None, description="Timestamp of most recent sighting")
    sightings: List[SightingItem] = Field(default_factory=list, description="Chronological sightings array")
    watchlist_status: WatchlistStatus = Field(..., description="Federated watchlist status")


# --- Watchlist Match Details Models ---

class VahanMatch(BaseModel):
    stolen_flag: Optional[bool] = None
    blacklist_status: Optional[str] = None
    owner_name: Optional[str] = None
    vehicle_class: Optional[str] = None


class EGujCopMatch(BaseModel):
    fir_number: Optional[str] = None
    crime_head: Optional[str] = None
    wanted_status: Optional[str] = None
    police_station: Optional[str] = None
    threat_priority: Optional[str] = None


class SarthiMatch(BaseModel):
    dl_number: Optional[str] = None
    license_status: Optional[str] = None
    driver_name: Optional[str] = None


class AfisMatch(BaseModel):
    state_afis_id: Optional[str] = None
    biometric_match_confidence: Optional[float] = None
    suspect_name: Optional[str] = None
    arrest_record: Optional[str] = None


class NafisMatch(BaseModel):
    national_fingerprint_number: Optional[str] = None
    interstate_crime_record: Optional[str] = None
    cross_jurisdiction_flag: Optional[bool] = None
    federal_linking_status: Optional[str] = None


# --- Alert Event Model (contracts/alert_event.json) ---

class AlertEvent(BaseModel):
    alert_id: str = Field(
        ...,
        pattern=r"^ALT-[0-9]{4}-[0-9]{4}-[0-9]{4}$",
        description="Unique alert identifier e.g. ALT-2026-0905-0012",
    )
    timestamp_pts_ms: int = Field(..., description="Hardware presentation timestamp in ms")
    timestamp_iso: Optional[str] = Field(default=None, description="ISO 8601 human-readable timestamp")
    camera_id: str = Field(..., description="Camera asset ID")
    camera_dept: Optional[str] = Field(default=None, description="Camera owning department")
    camera_lat: Optional[float] = Field(default=None, description="Camera latitude")
    camera_lng: Optional[float] = Field(default=None, description="Camera longitude")
    detected_plate: str = Field(..., description="Normalized plate number")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Detection / OCR confidence")
    threat_level: ThreatLevel = Field(..., description="Threat rating")
    source_databases: Optional[List[str]] = Field(default_factory=list, description="Databases matched")
    vahan_match: Optional[VahanMatch] = None
    egujcop_match: Optional[EGujCopMatch] = None
    sarthi_match: Optional[SarthiMatch] = None
    afis_match: Optional[AfisMatch] = None
    nafis_match: Optional[NafisMatch] = None
    recommended_action: Optional[str] = None
    snapshot_url: Optional[str] = None
    snapshot_hash_sha256: Optional[str] = Field(
        default=None,
        description="SHA-256 hash of snapshot for NFSU chain of custody",
    )
    direction_of_travel: Optional[DirectionOfTravel] = Field(
        default="Unknown",
        description="Estimated vehicle heading vector from Kalman tracking",
    )

    model_config = ConfigDict(from_attributes=True)


# --- Search & Ingestion Models ---

class VehicleSearchItem(BaseModel):
    plate_number: str
    vehicle_class: Optional[str] = None
    owner_name: Optional[str] = None
    blacklist_status: Optional[str] = None
    stolen_flag: bool = False
    threat_level: str = "NORMAL"
    total_sightings: int = 0
    last_seen: Optional[str] = None


class CameraIngestItem(BaseModel):
    camera_id: str
    camera_name: str
    department: str
    district: str
    lat: float
    lng: float
    stream_url: Optional[str] = None
    status: str
    resolution: str
    ptz_capable: bool = False
    vms_vendor: Optional[str] = None
