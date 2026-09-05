import jsonschema
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_post_alert_valid_payload_returns_200_or_201(client: AsyncClient, load_contract_schema):
    """Test POST /api/alerts with valid alert payload returns 200/201 and valid schema."""
    valid_payload = {
        "alert_id": "ALT-2026-0905-1001",
        "timestamp_pts_ms": 1350000,
        "timestamp_iso": "2026-09-05T14:30:00Z",
        "camera_id": "CAM-POL-AHM-01",
        "camera_dept": "Police",
        "camera_lat": 23.0275,
        "camera_lng": 72.5074,
        "detected_plate": "GJ05CX9988",
        "confidence": 0.96,
        "threat_level": "CRITICAL",
        "snapshot_url": "/snapshots/ALT-2026-0905-1001.jpg",
        "snapshot_hash_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    }

    response = await client.post("/api/alerts", json=valid_payload)
    assert response.status_code in (200, 201), f"Expected 200/201, got {response.status_code}: {response.text}"

    data = response.json()
    assert data["alert_id"] == valid_payload["alert_id"]
    assert data["detected_plate"] == "GJ05CX9988"

    # Validate returned alert against contracts/alert_event.json schema
    schema = load_contract_schema("alert_event.json")
    jsonschema.validate(instance=data, schema=schema)


@pytest.mark.asyncio
async def test_alert_persisted_to_sightings_for_trajectory_reconstruction(client: AsyncClient):
    """
    Commandment 7 & Core Test Case:
    Test posted alert is persisted to sightings table, and trajectory reconstruction
    includes this newly posted sighting.
    """
    test_plate = "GJ05ALERT01"
    alert_payload = {
        "alert_id": "ALT-2026-0905-2002",
        "timestamp_pts_ms": 1400000,
        "timestamp_iso": "2026-09-05T15:00:00Z",
        "camera_id": "CAM-POL-AHM-03",
        "camera_dept": "Police",
        "camera_lat": 23.0238,
        "camera_lng": 72.5358,
        "detected_plate": test_plate,
        "confidence": 0.94,
        "threat_level": "NORMAL",
        "snapshot_url": f"/snapshots/{test_plate}.jpg",
        "snapshot_hash_sha256": "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    }

    # 1. Post the alert
    post_resp = await client.post("/api/alerts", json=alert_payload)
    assert post_resp.status_code in (200, 201)

    # 2. Query trajectory endpoint for this vehicle plate
    traj_resp = await client.get(f"/api/vehicles/{test_plate}/trajectory")
    assert traj_resp.status_code == 200

    traj_data = traj_resp.json()
    assert traj_data["total_sightings"] >= 1, (
        f"Expected newly posted alert to appear in trajectory sightings, got {traj_data['total_sightings']}"
    )

    sightings = traj_data["sightings"]
    matching_sighting = next((s for s in sightings if s["pts_timestamp_ms"] == 1400000), None)
    assert matching_sighting is not None, f"Could not find posted sighting in trajectory: {sightings}"
    assert matching_sighting["camera_id"] == "CAM-POL-AHM-03"
    assert matching_sighting["lat"] == 23.0238
    assert matching_sighting["lng"] == 72.5358


@pytest.mark.asyncio
async def test_alert_response_includes_enriched_watchlist_correlation(client: AsyncClient):
    """Test alert response includes enriched watchlist correlation (threat level, source dbs, matches)."""
    suspect_payload = {
        "alert_id": "ALT-2026-0905-3003",
        "timestamp_pts_ms": 1450000,
        "timestamp_iso": "2026-09-05T15:30:00Z",
        "camera_id": "CAM-POL-AHM-04",
        "detected_plate": "GJ05CX9988",
        "confidence": 0.98,
        "threat_level": "NORMAL",  # Sent as NORMAL, backend correlation must enrich to CRITICAL
    }

    response = await client.post("/api/alerts", json=suspect_payload)
    assert response.status_code in (200, 201)
    data = response.json()

    # Backend enrichment must upgrade threat level to CRITICAL for suspect plate
    assert data["threat_level"] == "CRITICAL"
    assert "source_databases" in data
    assert any("VAHAN" in db for db in data["source_databases"])
    assert any("eGujCop" in db for db in data["source_databases"])
    assert data.get("recommended_action") is not None
    assert len(data["recommended_action"]) > 0


@pytest.mark.asyncio
async def test_post_alert_invalid_payload_returns_422(client: AsyncClient):
    """Test invalid payload (missing required fields, bad types, bad pattern) returns 422 Unprocessable Entity."""
    # 1. Missing required detected_plate
    invalid_payload_1 = {
        "alert_id": "ALT-2026-0905-4004",
        "timestamp_pts_ms": 100000,
        "camera_id": "CAM-POL-AHM-01",
        # missing detected_plate
        "confidence": 0.90,
        "threat_level": "NORMAL",
    }
    resp1 = await client.post("/api/alerts", json=invalid_payload_1)
    assert resp1.status_code == 422

    # 2. Invalid alert_id format (does not match ^ALT-[0-9]{4}-[0-9]{4}-[0-9]{4}$)
    invalid_payload_2 = {
        "alert_id": "NOT-AN-ALERT-ID",
        "timestamp_pts_ms": 100000,
        "camera_id": "CAM-POL-AHM-01",
        "detected_plate": "GJ01AB1234",
        "confidence": 0.90,
        "threat_level": "NORMAL",
    }
    resp2 = await client.post("/api/alerts", json=invalid_payload_2)
    assert resp2.status_code == 422

    # 3. Invalid threat_level (not in enum)
    invalid_payload_3 = {
        "alert_id": "ALT-2026-0905-4005",
        "timestamp_pts_ms": 100000,
        "camera_id": "CAM-POL-AHM-01",
        "detected_plate": "GJ01AB1234",
        "confidence": 0.90,
        "threat_level": "ULTRA_DANGEROUS",  # Invalid enum value
    }
    resp3 = await client.post("/api/alerts", json=invalid_payload_3)
    assert resp3.status_code == 422
