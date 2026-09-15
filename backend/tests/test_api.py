import os
import re
import json
import csv
import io
from datetime import datetime, timezone
import pytest
import jsonschema
from pathlib import Path


@pytest.mark.asyncio
async def test_health_endpoint(client):
    """Test GET /health returns expected status and version."""
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "sentinel-2026-backend"
    assert data["version"] == "1.0.0"


@pytest.mark.asyncio
async def test_cameras_endpoint(client, load_contract_schema):
    """
    Test GET /api/cameras returns all cameras and validates against
    contracts/camera_registry.json schema.
    """
    camera_schema = load_contract_schema("camera_registry.json")

    response = await client.get("/api/cameras")
    assert response.status_code == 200
    cameras = response.json()
    assert len(cameras) == 80

    # Validate each camera against official contract schema
    for cam in cameras:
        jsonschema.validate(instance=cam, schema=camera_schema)

    # Test department filter
    resp_pol = await client.get("/api/cameras?department=Police")
    assert resp_pol.status_code == 200
    police_cams = resp_pol.json()
    assert len(police_cams) >= 15
    for c in police_cams:
        assert c["department"] == "Police"

    # Test district filter
    resp_ahm = await client.get("/api/cameras?district=Ahmedabad")
    assert resp_ahm.status_code == 200
    ahm_cams = resp_ahm.json()
    assert len(ahm_cams) >= 10
    for c in ahm_cams:
        assert c["district"] == "Ahmedabad"


@pytest.mark.asyncio
async def test_ingest_endpoint(client):
    """
    Test GET /api/ingest returns active camera stream endpoints for vision engine.
    Satisfies Commandment 3 (Never hardcode RTSP URLs).
    """
    response = await client.get("/api/ingest")
    assert response.status_code == 200
    streams = response.json()
    assert len(streams) == 78
    for s in streams:
        assert "camera_id" in s
        assert "stream_url" in s
        assert s["stream_url"] is not None
        assert s["status"] == "Online"


@pytest.mark.asyncio
async def test_core_trajectory_endpoint_suspect(client, load_contract_schema):
    """
    THE CORE JURY EVALUATION TEST CASE:
    GET /api/vehicles/{plate_number}/trajectory for GJ01ER8842.
    Must return chronological cross-camera route, 5-database correlation,
    threat level CRITICAL, and strictly validate against contracts/trajectory_response.json.
    """
    trajectory_schema = load_contract_schema("trajectory_response.json")

    response = await client.get("/api/vehicles/GJ01ER8842/trajectory")
    assert response.status_code == 200
    data = response.json()

    # Schema validation against official contract
    jsonschema.validate(instance=data, schema=trajectory_schema)

    assert data["plate_number"] == "GJ01ER8842"
    assert data["total_sightings"] >= 5
    assert len(data["sightings"]) == data["total_sightings"]
    assert data["first_seen"] is not None
    assert data["last_seen"] is not None

    # Watchlist federation validation
    wl = data["watchlist_status"]
    assert wl["is_watchlisted"] is True
    assert wl["threat_level"] == "CRITICAL"
    assert "FIR-892/2026/CRIME-BR" in wl["associated_firs"]
    for db_name in ["VAHAN", "SARTHI", "eGujCop", "AFIS", "NAFIS"]:
        assert db_name in wl["matched_databases"]

    # Verify chronological sequence
    sightings = data["sightings"]
    iso_timestamps = [s["timestamp_iso"] for s in sightings]
    assert iso_timestamps == sorted(iso_timestamps)

    # Verify cross-camera progression (Ahmedabad -> Mehsana -> Rajkot)
    assert any("Ahmedabad" in s["camera_name"] or "SG Highway" in s["camera_name"] for s in sightings[:2])
    assert any("Mehsana" in s["camera_name"] for s in sightings[2:4])
    assert any("Rajkot" in s["camera_name"] for s in sightings[4:])

    # Verify SHA-256 snapshot hashes exist and are valid 64-char hex
    for s in sightings:
        assert len(s["snapshot_hash_sha256"]) == 64
        assert int(s["snapshot_hash_sha256"], 16) > 0


@pytest.mark.asyncio
async def test_trajectory_endpoint_clean_vehicle(client, load_contract_schema):
    """Test trajectory for clean vehicle GJ01AB1234."""
    trajectory_schema = load_contract_schema("trajectory_response.json")

    response = await client.get("/api/vehicles/GJ01AB1234/trajectory")
    assert response.status_code == 200
    data = response.json()

    jsonschema.validate(instance=data, schema=trajectory_schema)
    assert data["plate_number"] == "GJ01AB1234"
    assert data["total_sightings"] >= 4
    assert data["watchlist_status"]["is_watchlisted"] is False
    assert data["watchlist_status"]["threat_level"] == "NORMAL"


@pytest.mark.asyncio
async def test_search_endpoint(client):
    """Test GET /api/search fuzzy search functionality."""
    response = await client.get("/api/search?plate=GJ01")
    assert response.status_code == 200
    results = response.json()
    assert len(results) > 0
    plates = [r["plate_number"] for r in results]
    assert "GJ01ER8842" in plates

    # Search with empty query returns top sighted
    resp_blank = await client.get("/api/search")
    assert resp_blank.status_code == 200
    assert len(resp_blank.json()) > 0


@pytest.mark.asyncio
async def test_alerts_endpoint(client, load_contract_schema, db_conn):
    """
    Test POST /api/alerts:
    1. Validates payload matching contracts/alert_event.json
    2. Persists sighting to sightings table (Commandment 7)
    3. Correlates against 5 databases
    4. Appends to audit log
    5. Returns enriched alert
    """
    alert_schema = load_contract_schema("alert_event.json")

    sample_alert = {
        "alert_id": "ALT-2026-0905-0099",
        "timestamp_pts_ms": 135400,
        "timestamp_iso": datetime.now(timezone.utc).isoformat(),
        "camera_id": "CAM-POL-AHM-04",
        "camera_dept": "Police",
        "camera_lat": 23.0365,
        "camera_lng": 72.5611,
        "detected_plate": "GJ01ER8842",
        "confidence": 0.96,
        "threat_level": "NORMAL",  # Backend should enrich to CRITICAL
        "snapshot_url": "/snapshots/GJ01ER8842_test.jpg",
        "snapshot_hash_sha256": "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
    }

    # Post alert
    response = await client.post("/api/alerts", json=sample_alert)
    assert response.status_code == 200
    enriched = response.json()

    # Validate against alert_event contract schema
    jsonschema.validate(instance=enriched, schema=alert_schema)

    assert enriched["alert_id"] == "ALT-2026-0905-0099"
    assert enriched["threat_level"] == "CRITICAL"
    assert enriched["vahan_match"]["owner_name"] == "Vikram Solanki"
    assert "FIR-892/2026/CRIME-BR" in enriched["egujcop_match"]["fir_number"]

    # Verify sighting was persisted to sightings table (Commandment 7)
    async with db_conn.execute(
        "SELECT * FROM sightings WHERE pts_timestamp_ms = 135400 AND plate_number = 'GJ01ER8842'"
    ) as cur:
        persisted = await cur.fetchone()
        assert persisted is not None
        assert persisted["camera_id"] == "CAM-POL-AHM-04"
        assert persisted["watchlist_match_flag"] == 1

    # Verify GET /api/alerts returns recent alerts
    resp_recent = await client.get("/api/alerts?limit=500")
    assert resp_recent.status_code == 200
    alerts_list = resp_recent.json()
    assert any(a["alert_id"] == "ALT-2026-0905-0099" for a in alerts_list)

    # Clean up test artifact from database so it doesn't affect UI corridor
    await db_conn.execute("DELETE FROM sightings WHERE pts_timestamp_ms = 135400 AND plate_number = 'GJ01ER8842'")
    await db_conn.execute("DELETE FROM alerts WHERE alert_id = 'ALT-2026-0905-0099'")
    await db_conn.commit()


@pytest.mark.asyncio
async def test_export_csv_endpoint(client, load_contract_schema):
    """
    Test GET /api/export/csv:
    Strictly verifies column headers and content format according to contracts/evaluation_csv.json.
    """
    eval_csv_schema = load_contract_schema("evaluation_csv.json")
    columns_list = eval_csv_schema.get("columns") or eval_csv_schema.get("properties", {}).get("columns", {}).get("default", [])
    expected_columns = [col["name"] for col in columns_list]

    response = await client.get("/api/export/csv?plate_number=GJ01ER8842")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]

    content = response.text
    reader = csv.reader(io.StringIO(content))
    rows = list(reader)

    assert len(rows) > 1  # Header + rows
    header = rows[0]
    assert header == expected_columns

    # Verify row structure
    for r in rows[1:]:
        assert len(r) == len(expected_columns)
        cam_id, cam_name, dept, plate, pts, human_time, wl_flag, fir = r
        assert re.match(r"^(CAM-[A-Z]+-[A-Z]+-[0-9]+|cam[0-9]{2})$", cam_id)
        assert plate == "GJ01ER8842"
        assert int(pts) >= 0
        assert wl_flag in ("True", "False")
        assert fir == "FIR-892/2026/CRIME-BR"
