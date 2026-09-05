"""Database initialization and access package for Sentinel 2026."""
from .database import init_db, get_db
from .seed import seed_database
from .queries import (
    correlate_plate,
    get_vehicle_trajectory,
    search_plates,
    get_cameras,
    insert_sighting,
    insert_alert,
    get_recent_alerts,
    get_export_sightings,
)

__all__ = [
    "init_db",
    "get_db",
    "seed_database",
    "correlate_plate",
    "get_vehicle_trajectory",
    "search_plates",
    "get_cameras",
    "insert_sighting",
    "insert_alert",
    "get_recent_alerts",
    "get_export_sightings",
]
