import csv
import io
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response
import aiosqlite

from db.database import get_db
from db.queries import get_export_sightings, normalize_plate

router = APIRouter(prefix="/api/export", tags=["Export"])

@router.get("/csv")
async def export_evaluation_csv(
    plate_number: Optional[str] = Query(None, description="Filter sightings by specific license plate"),
    db: aiosqlite.Connection = Depends(get_db),
):
    """
    Official Jury Evaluation CSV Export Endpoint.
    Strictly conforms to contracts/evaluation_csv.json schema.
    Returns:
    camera_id, camera_name, department, license_plate, pts_timestamp_ms,
    human_time, watchlist_match_flag, associated_fir
    """
    clean_plate = normalize_plate(plate_number) if plate_number else None
    rows = await get_export_sightings(db, plate_number=clean_plate)

    output = io.StringIO()
    writer = csv.writer(output, lineterminator="\n")

    # CSV Header specified in evaluation_csv.json contract
    header = [
        "camera_id",
        "camera_name",
        "department",
        "license_plate",
        "pts_timestamp_ms",
        "human_time",
        "watchlist_match_flag",
        "associated_fir",
    ]
    writer.writerow(header)

    for row in rows:
        writer.writerow([
            row["camera_id"],
            row["camera_name"],
            row["department"],
            row["license_plate"],
            row["pts_timestamp_ms"],
            row["human_time"],
            bool(row["watchlist_match_flag"]),
            row["associated_fir"] or "",
        ])

    csv_data = output.getvalue()
    filename = f"sentinel_evaluation_{clean_plate or 'all'}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache",
        },
    )
