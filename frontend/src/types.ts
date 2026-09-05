/**
 * Sentinel 2026 - Unified Frontend Type Definitions
 * Strictly mirrors contracts defined in `contracts/` and backend models.
 */

export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL';

export type CameraDepartment =
  | 'Police'
  | 'Transport (RTO)'
  | 'GSRTC'
  | 'Health'
  | 'Municipal Corp'
  | 'Panchayat'
  | 'Private'
  | 'Food & Civil Supplies';

export type CameraStatus = 'Online' | 'Offline' | 'Degraded';

export type VMSVendor =
  | 'Milestone'
  | 'Genetec'
  | 'ONVIF_NVR'
  | 'Analog_DVR'
  | 'Direct_IP';

export type CameraResolution = '1080p' | '720p' | '4K' | '480p' | 'Analog';

export type DirectionOfTravel =
  | 'N'
  | 'NE'
  | 'E'
  | 'SE'
  | 'S'
  | 'SW'
  | 'W'
  | 'NW'
  | 'Unknown';

export interface CameraRegistryEntry {
  camera_id: string;
  camera_name: string;
  department: CameraDepartment | string;
  district: string;
  lat: number;
  lng: number;
  status: CameraStatus;
  stream_url?: string | null;
  vms_vendor?: VMSVendor | string;
  installed_date?: string | null;
  resolution?: CameraResolution | string;
  ptz_capable?: boolean;
  last_health_check?: string | null;
}

export type Camera = CameraRegistryEntry;
export type Sighting = SightingItem;
export type EgujcopMatch = EGujCopMatch;

export interface SightingItem {
  sighting_id: string;
  camera_id: string;
  camera_name: string;
  department: string;
  lat: number;
  lng: number;
  pts_timestamp_ms: number;
  timestamp_iso: string;
  confidence: number;
  direction_of_travel: DirectionOfTravel;
  snapshot_url: string;
  snapshot_hash_sha256: string;
}

export interface WatchlistStatus {
  is_watchlisted: boolean;
  threat_level: ThreatLevel;
  matched_databases: string[];
  associated_firs: string[];
}

export interface TrajectoryResponse {
  plate_number: string;
  total_sightings: number;
  first_seen: string | null;
  last_seen: string | null;
  sightings: SightingItem[];
  watchlist_status: WatchlistStatus;
}

export interface VahanMatch {
  stolen_flag?: boolean | null;
  blacklist_status?: string | null;
  owner_name?: string | null;
  vehicle_class?: string | null;
}

export interface EGujCopMatch {
  fir_number?: string | null;
  crime_head?: string | null;
  wanted_status?: string | null;
  police_station?: string | null;
  threat_priority?: string | null;
}

export interface SarthiMatch {
  dl_number?: string | null;
  license_status?: string | null;
  driver_name?: string | null;
}

export interface AfisMatch {
  state_afis_id?: string | null;
  biometric_match_confidence?: number | null;
  suspect_name?: string | null;
  arrest_record?: string | null;
}

export interface NafisMatch {
  national_fingerprint_number?: string | null;
  interstate_crime_record?: string | null;
  cross_jurisdiction_flag?: boolean | null;
  federal_linking_status?: string | null;
}

export interface AlertEvent {
  alert_id: string;
  timestamp_pts_ms: number;
  timestamp_iso?: string | null;
  camera_id: string;
  camera_name?: string | null;
  camera_dept?: string | null;
  camera_lat?: number | null;
  camera_lng?: number | null;
  detected_plate: string;
  confidence: number;
  threat_level: ThreatLevel;
  source_databases?: string[];
  vahan_match?: VahanMatch | null;
  egujcop_match?: EGujCopMatch | null;
  sarthi_match?: SarthiMatch | null;
  afis_match?: AfisMatch | null;
  nafis_match?: NafisMatch | null;
  recommended_action?: string | null;
  snapshot_url?: string | null;
  snapshot_hash_sha256?: string | null;
  created_at?: string | null;
}

export interface VehicleSearchItem {
  plate_number: string;
  vehicle_class?: string | null;
  owner_name?: string | null;
  blacklist_status?: string | null;
  stolen_flag: boolean;
  threat_level: ThreatLevel;
  total_sightings: number;
  last_seen?: string | null;
}

export interface CameraStats {
  total: number;
  online: number;
  offline: number;
  degraded: number;
}

export interface SystemHealth {
  status: string;
  service?: string;
  version?: string;
  timestamp?: string;
}
