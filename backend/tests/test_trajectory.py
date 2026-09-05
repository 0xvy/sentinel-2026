import re
from datetime import datetime
import jsonschema
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_trajectory_core_suspect_route(client: AsyncClient, load_contract_schema):
    """
    THE CORE TEST CASE — JURY EVALUATION ENDPOINT:
    GET /api/vehicles/GJ01ER8842/trajectory
    Verifies full chronological cross-camera trajectory reconstruction
    for suspect Vikram Solanki with >= 5 verified sightings across Gujarat.
    """
    response = await client.get("/api/vehicles/GJ01ER8842/trajectory")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()

    # 1. Validate full response against official contracts/trajectory_response.json
    schema = load_contract_schema("trajectory_response.json")
    jsonschema.validate(instance=data, schema=schema)

    # 2. Check top-level required fields
    assert data["plate_number"] == "GJ01ER8842"
    assert "total_sightings" in data
    assert "sightings" in data
    assert "watchlist_status" in data
    assert isinstance(data["sightings"], list)

    # 3. Test GJ01ER8842 has >= 5 sightings (the demo suspect route)
    assert data["total_sightings"] >= 5, f"Expected >= 5 sightings, got {data['total_sightings']}"
    assert len(data["sightings"]) == data["total_sightings"]
    assert len(data["sightings"]) >= 5


@pytest.mark.asyncio
async def test_trajectory_chronological_ordering(client: AsyncClient):
    """Test sightings are strictly in chronological order (each timestamp >= previous)."""
    response = await client.get("/api/vehicles/GJ01ER8842/trajectory")
    assert response.status_code == 200
    data = response.json()
    sightings = data["sightings"]

    assert len(sightings) >= 5

    prev_pts = -1
    prev_iso_dt = None

    for i, sighting in enumerate(sightings):
        pts = sighting["pts_timestamp_ms"]
        iso_str = sighting["timestamp_iso"]
        # Parse ISO timestamp
        cleaned_iso = iso_str.replace("Z", "+00:00")
        current_dt = datetime.fromisoformat(cleaned_iso)

        # Monotonic time check
        assert pts >= prev_pts, (
            f"Chronological violation at index {i}: PTS {pts} < previous PTS {prev_pts}"
        )
        if prev_iso_dt is not None:
            assert current_dt >= prev_iso_dt, (
                f"Chronological violation at index {i}: {current_dt} < previous {prev_iso_dt}"
            )

        prev_pts = pts
        prev_iso_dt = current_dt


@pytest.mark.asyncio
async def test_trajectory_sighting_item_structure_and_forensics(client: AsyncClient):
    """
    Test each sighting has required fields:
    sighting_id, camera_id, camera_name, department, lat, lng,
    pts_timestamp_ms, timestamp_iso, confidence, direction_of_travel,
    snapshot_url, snapshot_hash_sha256.
    """
    response = await client.get("/api/vehicles/GJ01ER8842/trajectory")
    assert response.status_code == 200
    data = response.json()

    valid_directions = {"N", "NE", "E", "SE", "S", "SW", "W", "NW", "Unknown"}
    sha256_pattern = re.compile(r"^[a-fA-F0-9]{64}$")

    for idx, s in enumerate(data["sightings"]):
        assert s.get("sighting_id"), f"Missing sighting_id at index {idx}"
        assert s.get("camera_id"), f"Missing camera_id at index {idx}"
        assert s.get("camera_name"), f"Missing camera_name at index {idx}"
        assert s.get("department"), f"Missing department at index {idx}"

        # Latitude and longitude within Gujarat bounds
        lat = s["lat"]
        lng = s["lng"]
        assert 20.0 <= lat <= 24.5, f"Lat {lat} out of Gujarat bounds at index {idx}"
        assert 68.0 <= lng <= 74.5, f"Lng {lng} out of Gujarat bounds at index {idx}"

        # PTS timestamp
        assert isinstance(s["pts_timestamp_ms"], int) and s["pts_timestamp_ms"] >= 0

        # Confidence
        assert 0.0 <= s["confidence"] <= 1.0

        # Direction of travel
        assert s["direction_of_travel"] in valid_directions

        # NFSU forensic requirement: SHA-256 hash
        assert "snapshot_hash_sha256" in s
        assert sha256_pattern.match(s["snapshot_hash_sha256"]), (
            f"Invalid SHA-256 hash format at index {idx}: {s.get('snapshot_hash_sha256')}"
        )


@pytest.mark.asyncio
async def test_trajectory_cross_department_federation(client: AsyncClient):
    """Test that GJ01ER8842 suspect sightings cross multiple government departments."""
    response = await client.get("/api/vehicles/GJ01ER8842/trajectory")
    assert response.status_code == 200
    data = response.json()

    observed_departments = {s["department"] for s in data["sightings"]}
    # Vikram Solanki's demo route traverses Police, Transport (RTO), and Panchayat cameras
    assert len(observed_departments) >= 2, (
        f"Expected cross-department tracking (>= 2 departments), got {observed_departments}"
    )


@pytest.mark.asyncio
async def test_trajectory_watchlist_correlation_critical(client: AsyncClient):
    """
    Test watchlist_status for suspect vehicle GJ01ER8842:
    - is_watchlisted == True
    - threat_level == 'CRITICAL'
    - matched_databases contains 'VAHAN' and 'eGujCop'
    - associated_firs contains active FIR
    """
    response = await client.get("/api/vehicles/GJ01ER8842/trajectory")
    assert response.status_code == 200
    data = response.json()

    wl = data["watchlist_status"]
    assert wl["is_watchlisted"] is True, "Suspect vehicle must be watchlisted"
    assert wl["threat_level"] == "CRITICAL", f"Expected threat_level 'CRITICAL', got '{wl['threat_level']}'"

    matched_dbs = wl["matched_databases"]
    assert "VAHAN" in matched_dbs, f"Expected 'VAHAN' in matched_databases: {matched_dbs}"
    assert "eGujCop" in matched_dbs, f"Expected 'eGujCop' in matched_databases: {matched_dbs}"

    # Associated FIR check
    firs = wl["associated_firs"]
    assert len(firs) > 0, "Expected at least one linked FIR for suspect vehicle"
    assert any("892" in fir for fir in firs), f"Expected FIR-892/2026/CRIME-BR in {firs}"


@pytest.mark.asyncio
async def test_trajectory_non_existent_or_clean_plate(client: AsyncClient, load_contract_schema):
    """Test non-existent plate returns 200 with empty sightings and NORMAL threat."""
    clean_plate = "GJ99ZZ9999"
    response = await client.get(f"/api/vehicles/{clean_plate}/trajectory")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    data = response.json()

    # Validate against schema
    schema = load_contract_schema("trajectory_response.json")
    jsonschema.validate(instance=data, schema=schema)

    assert data["plate_number"] == clean_plate
    assert data["total_sightings"] == 0
    assert len(data["sightings"]) == 0
    assert data["first_seen"] is None
    assert data["last_seen"] is None

    wl = data["watchlist_status"]
    assert wl["is_watchlisted"] is False
    assert wl["threat_level"] == "NORMAL"
    assert len(wl["matched_databases"]) == 0
    assert len(wl["associated_firs"]) == 0
