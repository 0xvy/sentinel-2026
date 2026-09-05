from typing import List, Optional
from fastapi import APIRouter, Depends, Query
import aiosqlite

from app.models import CameraRegistryEntry, CameraIngestItem
from db.database import get_db
from db.queries import get_cameras

router = APIRouter(prefix="/api", tags=["Cameras"])

@router.get("/cameras", response_model=List[CameraRegistryEntry])
async def list_cameras(
    department: Optional[str] = Query(None, description="Filter by owning department"),
    status: Optional[str] = Query(None, description="Filter by operational status"),
    district: Optional[str] = Query(None, description="Filter by Gujarat district"),
    db: aiosqlite.Connection = Depends(get_db),
):
    """
    Model 1 GIS Camera Registry endpoint.
    Returns statewide CCTV cameras matching filter criteria.
    """
    cameras = await get_cameras(db, department=department, status=status, district=district)
    return cameras

@router.get("/ingest", response_model=List[CameraIngestItem])
async def get_ingest_streams(
    department: Optional[str] = Query(None, description="Filter by department"),
    status: Optional[str] = Query("Online", description="Filter by status, default Online"),
    db: aiosqlite.Connection = Depends(get_db),
):
    """
    Dynamic stream ingestion endpoint for AI Vision Engine.
    Vision engine queries this endpoint dynamically to discover active RTSP stream endpoints.
    Enforces Sandbox Commandment 3: Never hardcode RTSP URLs.
    """
    cameras = await get_cameras(db, department=department, status=status)
    return [
        CameraIngestItem(
            camera_id=c["camera_id"],
            camera_name=c["camera_name"],
            department=c["department"],
            district=c["district"],
            lat=c["lat"],
            lng=c["lng"],
            stream_url=c.get("stream_url"),
            status=c["status"],
            resolution=c.get("resolution", "1080p"),
            ptz_capable=bool(c.get("ptz_capable", False)),
            vms_vendor=c.get("vms_vendor"),
        )
        for c in cameras
    ]
