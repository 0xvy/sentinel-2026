import csv
import io
import re
from datetime import datetime
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_export_csv_returns_csv_content(client: AsyncClient):
    """Test GET /api/export/csv returns 200 with text/csv media type and content."""
    response = await client.get("/api/export/csv")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    content_type = response.headers.get("content-type", "")
    assert "text/csv" in content_type, f"Expected 'text/csv' media type, got {content_type}"

    content_disp = response.headers.get("content-disposition", "")
    assert ".csv" in content_disp, f"Expected attachment filename with .csv, got {content_disp}"

    assert len(response.text) > 0, "CSV body must not be empty"


@pytest.mark.asyncio
async def test_export_csv_exact_headers(client: AsyncClient):
    """
    Test CSV output has exact headers specified in contracts/evaluation_csv.json:
    camera_id,camera_name,department,license_plate,pts_timestamp_ms,human_time,watchlist_match_flag,associated_fir
    """
    response = await client.get("/api/export/csv")
    assert response.status_code == 200

    csv_reader = csv.reader(io.StringIO(response.text))
    headers = next(csv_reader)

    expected_headers = [
        "camera_id",
        "camera_name",
        "department",
        "license_plate",
        "pts_timestamp_ms",
        "human_time",
        "watchlist_match_flag",
        "associated_fir",
    ]

    assert headers == expected_headers, f"CSV headers mismatch.\nExpected: {expected_headers}\nGot: {headers}"


@pytest.mark.asyncio
async def test_export_csv_valid_row_data_types(client: AsyncClient):
    """Test every row in the exported CSV conforms to required column data types."""
    response = await client.get("/api/export/csv")
    assert response.status_code == 200

    csv_reader = csv.DictReader(io.StringIO(response.text))
    rows = list(csv_reader)
    assert len(rows) > 0, "Expected at least one sighting row in exported CSV"

    allowed_departments = {
        "Police",
        "Transport (RTO)",
        "GSRTC",
        "Health",
        "Municipal Corp",
        "Panchayat",
        "Private",
        "Food & Civil Supplies",
    }

    boolean_true_values = {"true", "1"}
    boolean_false_values = {"false", "0"}
    valid_booleans = boolean_true_values | boolean_false_values

    for idx, row in enumerate(rows):
        # 1. camera_id: Non-empty string matching standard pattern
        cam_id = row["camera_id"]
        assert re.match(r"^(CAM-[A-Z]+-[A-Z]+-[0-9]+|cam[0-9]{2})$", cam_id), f"Row {idx}: invalid camera_id {cam_id}"

        # 2. camera_name: Non-empty string
        assert len(row["camera_name"].strip()) > 0, f"Row {idx}: empty camera_name"

        # 3. department: Valid department enum
        dept = row["department"]
        assert dept in allowed_departments, f"Row {idx}: invalid department {dept}"

        # 4. license_plate: Valid alphanumeric plate string
        plate = row["license_plate"]
        assert len(plate) >= 6 and plate.isalnum(), f"Row {idx}: invalid license_plate {plate}"

        # 5. pts_timestamp_ms: Valid integer >= 0
        pts_str = row["pts_timestamp_ms"]
        assert pts_str.isdigit(), f"Row {idx}: pts_timestamp_ms must be integer, got {pts_str}"
        assert int(pts_str) >= 0

        # 6. human_time: Valid ISO 8601 date-time
        iso_str = row["human_time"]
        try:
            datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        except ValueError as err:
            pytest.fail(f"Row {idx}: invalid human_time ISO timestamp '{iso_str}': {err}")

        # 7. watchlist_match_flag: Valid boolean string representation
        flag_str = row["watchlist_match_flag"].lower()
        assert flag_str in valid_booleans, (
            f"Row {idx}: watchlist_match_flag must be boolean string, got '{row['watchlist_match_flag']}'"
        )

        # 8. associated_fir: String or empty
        fir = row["associated_fir"]
        assert isinstance(fir, str)


@pytest.mark.asyncio
async def test_export_csv_filtered_by_plate(client: AsyncClient):
    """Test filtering CSV export by plate_number returns only sightings for that plate."""
    suspect_plate = "GJ01ER8842"
    response = await client.get(f"/api/export/csv?plate_number={suspect_plate}")
    assert response.status_code == 200

    csv_reader = csv.DictReader(io.StringIO(response.text))
    rows = list(csv_reader)

    assert len(rows) >= 5, f"Expected >= 5 sightings for suspect {suspect_plate}, got {len(rows)}"

    for row in rows:
        assert row["license_plate"] == suspect_plate, (
            f"Expected plate {suspect_plate}, got {row['license_plate']}"
        )
        assert row["watchlist_match_flag"].lower() in ("true", "1")
        assert "FIR-892/2026/CRIME-BR" in row["associated_fir"]
