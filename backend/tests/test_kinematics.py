"""
SENTINEL 2026 — Kinematic Geodesic Sanity Tests (Gate 4)
=========================================================
Tests:
1. Haversine distance accuracy against known Gujarat geographical benchmarks
2. Rejection of synthetic Mach-speed GPS teleportation anomalies (v > 160 km/h)
3. Zero-violation verification of real seeded suspect route (GJ01ER8842)
4. Smooth handling of 12-hour video loop discontinuities (PTS jumps / wrap-around)
5. Physical validation of stationary vehicles at checkpoints (distance = 0)
"""

import pytest
from httpx import AsyncClient
from backend.tests.kinematic_sanity_checker import KinematicSanityChecker


def test_haversine_accuracy_benchmark():
    """
    Gate 4: Haversine distance accuracy tested against known Gujarat benchmark:
    Ahmedabad (23.0225, 72.5714) to Rajkot (22.3039, 70.8022) is approx 198.3 - 204.8 km.
    """
    d = KinematicSanityChecker.haversine_distance_km(23.0225, 72.5714, 22.3039, 70.8022)
    assert 195.0 <= d <= 210.0, f"Distance {d:.2f} km outside expected Gujarat benchmark"


def test_mach_speed_teleportation_rejected():
    """
    Gate 4: Synthetic Mach-speed teleportation test:
    Ahmedabad to Rajkot (approx 200 km) traversed in 10 seconds (~72,000 km/h)
    MUST be strictly rejected with valid == False and error flagging velocity > 160 km/h.
    """
    teleporting_sightings = [
        {
            "camera_id": "CAM-POL-AHM-01",
            "lat": 23.0225,
            "lng": 72.5714,
            "timestamp_iso": "2026-09-12T10:00:00Z",
            "pts_timestamp_ms": 100000,
        },
        {
            "camera_id": "CAM-POL-RJK-01",
            "lat": 22.3039,
            "lng": 70.8022,
            "timestamp_iso": "2026-09-12T10:00:10Z",  # 10 seconds later
            "pts_timestamp_ms": 100010,
        },
    ]

    valid, errors = KinematicSanityChecker.validate_trajectory(teleporting_sightings)
    assert valid is False, "Mach-speed teleportation was erroneously accepted as valid!"
    assert len(errors) == 1
    assert "Implausible velocity" in errors[0]
    assert "Max allowed: 160.0 km/h" in errors[0]


@pytest.mark.asyncio
async def test_seeded_suspect_trajectory_physically_plausible(client: AsyncClient):
    """
    Gate 4: Real seeded suspect route (GJ01ER8842):
    Queries GET /api/vehicles/GJ01ER8842/trajectory and asserts zero kinematic violations
    across the verified seeded suspect route between Ahmedabad, Mehsana, and Rajkot.
    """
    resp = await client.get("/api/vehicles/GJ01ER8842/trajectory")
    assert resp.status_code == 200, f"Failed to retrieve trajectory: {resp.text}"

    data = resp.json()
    all_sightings = data.get("sightings", [])
    assert len(all_sightings) >= 5, f"Expected >= 5 sightings for demo suspect, got {len(all_sightings)}"

    # Validate the official seeded route sightings
    seeded_sightings = [
        s for s in all_sightings
        if s.get("sighting_id", "").startswith("a1b2c3d4-e5f6-4a1b-8c2d-")
    ]
    target_sightings = seeded_sightings if len(seeded_sightings) >= 5 else all_sightings[:7]
    assert len(target_sightings) >= 5

    valid, errors = KinematicSanityChecker.validate_trajectory(target_sightings)
    assert valid is True, f"Kinematic violations detected on seeded suspect route: {errors}"
    assert len(errors) == 0


def test_stationary_vehicle_zero_distance_accepted():
    """
    A vehicle stationary at a police toll gate or checkpoint:
    Distance == 0.0 across sequential sightings must pass with 0 errors.
    """
    stationary_sightings = [
        {
            "camera_id": "CAM-POL-AHM-01",
            "lat": 23.0225,
            "lng": 72.5714,
            "timestamp_iso": "2026-09-12T12:00:00Z",
            "pts_timestamp_ms": 100000,
        },
        {
            "camera_id": "CAM-POL-AHM-01",
            "lat": 23.0225,
            "lng": 72.5714,
            "timestamp_iso": "2026-09-12T12:02:00Z",
            "pts_timestamp_ms": 102000,
        },
    ]

    valid, errors = KinematicSanityChecker.validate_trajectory(stationary_sightings)
    assert valid is True
    assert len(errors) == 0


def test_12_hour_loop_cut_discontinuity_reset():
    """
    Gate 4: 12-hour video loop discontinuity test (Commandment 6).
    When PTS jumps backward (43,200,000 -> 0) or > 5000ms on the same camera,
    tracker must reset baseline cleanly without crashing or calculating negative velocity.
    """
    loop_cut_sightings = [
        {
            "camera_id": "CAM-POL-AHM-01",
            "lat": 23.0225,
            "lng": 72.5714,
            "pts_timestamp_ms": 43200000,  # End of 12-hour video
        },
        {
            "camera_id": "CAM-POL-AHM-01",
            "lat": 23.0225,
            "lng": 72.5714,
            "pts_timestamp_ms": 100,  # Loop cut wrap-around to 0
        },
    ]

    valid, errors = KinematicSanityChecker.validate_trajectory(loop_cut_sightings)
    assert valid is True
    assert len(errors) == 0


def test_non_positive_elapsed_time_between_different_cameras_rejected():
    """
    If two sightings have distinct geographical coordinates but non-positive elapsed time,
    the checker must flag a physical impossibility error.
    """
    bad_sightings = [
        {
            "camera_id": "CAM-POL-AHM-01",
            "lat": 23.0225,
            "lng": 72.5714,
            "timestamp_iso": "2026-09-12T12:00:00Z",
        },
        {
            "camera_id": "CAM-POL-SUR-01",
            "lat": 21.1702,
            "lng": 72.8311,
            "timestamp_iso": "2026-09-12T12:00:00Z",  # Identical timestamp!
        },
    ]

    valid, errors = KinematicSanityChecker.validate_trajectory(bad_sightings)
    assert valid is False
    assert len(errors) == 1
    assert "Non-positive elapsed time" in errors[0]
