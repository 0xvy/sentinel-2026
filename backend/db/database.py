import os
import aiosqlite
from typing import AsyncGenerator
from app.config import settings

INIT_SQL = """
CREATE TABLE IF NOT EXISTS cameras (
    camera_id TEXT PRIMARY KEY,
    camera_name TEXT NOT NULL,
    department TEXT NOT NULL,
    district TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    status TEXT DEFAULT 'Online',
    stream_url TEXT,
    vms_vendor TEXT,
    installed_date TEXT,
    resolution TEXT DEFAULT '1080p',
    ptz_capable INTEGER DEFAULT 0,
    last_health_check TEXT
);

CREATE TABLE IF NOT EXISTS vahan (
    plate_number TEXT PRIMARY KEY,
    vehicle_class TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    chassis_number TEXT NOT NULL,
    engine_number TEXT NOT NULL,
    registration_date TEXT NOT NULL,
    blacklist_status TEXT DEFAULT 'Clean',
    stolen_flag INTEGER DEFAULT 0,
    linked_fir TEXT
);

CREATE TABLE IF NOT EXISTS sarthi (
    dl_number TEXT PRIMARY KEY,
    driver_name TEXT NOT NULL,
    linked_aadhaar_hash TEXT NOT NULL,
    license_status TEXT DEFAULT 'Active',
    linked_plate TEXT,
    suspect_link_id TEXT
);

CREATE TABLE IF NOT EXISTS egujcop (
    fir_number TEXT PRIMARY KEY,
    police_station TEXT NOT NULL,
    district TEXT NOT NULL,
    crime_head TEXT NOT NULL,
    accused_name TEXT NOT NULL,
    alias TEXT,
    wanted_status TEXT NOT NULL,
    linked_plate TEXT,
    missing_person_flag INTEGER DEFAULT 0,
    unidentified_body_flag INTEGER DEFAULT 0,
    threat_priority TEXT DEFAULT 'MEDIUM'
);

CREATE TABLE IF NOT EXISTS afis (
    state_afis_id TEXT PRIMARY KEY,
    linked_fir TEXT NOT NULL,
    biometric_match_confidence REAL NOT NULL,
    suspect_name TEXT NOT NULL,
    arrest_record TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS nafis (
    national_fingerprint_number TEXT PRIMARY KEY,
    state_afis_id TEXT NOT NULL,
    interstate_crime_record TEXT NOT NULL,
    cross_jurisdiction_flag INTEGER DEFAULT 0,
    federal_linking_status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sightings (
    sighting_id TEXT PRIMARY KEY,
    camera_id TEXT NOT NULL,
    camera_name TEXT NOT NULL,
    department TEXT NOT NULL,
    plate_number TEXT NOT NULL,
    pts_timestamp_ms INTEGER NOT NULL,
    timestamp_iso TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    confidence REAL NOT NULL,
    direction_of_travel TEXT DEFAULT 'Unknown',
    snapshot_url TEXT,
    snapshot_hash_sha256 TEXT,
    watchlist_match_flag INTEGER DEFAULT 0,
    associated_fir TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sightings_plate ON sightings(plate_number);
CREATE INDEX IF NOT EXISTS idx_sightings_camera ON sightings(camera_id);
CREATE INDEX IF NOT EXISTS idx_sightings_time ON sightings(timestamp_iso);

CREATE TABLE IF NOT EXISTS alerts (
    alert_id TEXT PRIMARY KEY,
    timestamp_pts_ms INTEGER NOT NULL,
    timestamp_iso TEXT NOT NULL,
    camera_id TEXT NOT NULL,
    camera_dept TEXT,
    camera_lat REAL,
    camera_lng REAL,
    detected_plate TEXT NOT NULL,
    confidence REAL NOT NULL,
    threat_level TEXT NOT NULL,
    source_databases TEXT,
    vahan_match TEXT,
    egujcop_match TEXT,
    sarthi_match TEXT,
    afis_match TEXT,
    nafis_match TEXT,
    recommended_action TEXT,
    snapshot_url TEXT,
    snapshot_hash_sha256 TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alerts_created ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_plate ON alerts(detected_plate);
"""

async def init_db(db_path: str = None) -> None:
    """Initialize database schemas and create tables/indices."""
    path = db_path or settings.DB_PATH
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    async with aiosqlite.connect(path) as db:
        await db.executescript(INIT_SQL)
        await db.commit()

async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """FastAPI dependency for obtaining an aiosqlite connection."""
    db = await aiosqlite.connect(settings.DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()
