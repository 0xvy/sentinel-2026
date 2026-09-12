import pytest
from db.queries import (
    correlate_plate,
    get_vehicle_trajectory,
    search_plates,
    get_cameras,
    normalize_plate,
)

@pytest.mark.asyncio
async def test_seed_record_counts(db_conn):
    """Verify all 6 tables plus sightings table have expected record counts."""
    async with db_conn.execute("SELECT COUNT(*) FROM cameras") as cur:
        assert (await cur.fetchone())[0] == 80

    async with db_conn.execute("SELECT COUNT(*) FROM vahan") as cur:
        assert (await cur.fetchone())[0] >= 25

    async with db_conn.execute("SELECT COUNT(*) FROM sarthi") as cur:
        assert (await cur.fetchone())[0] >= 15

    async with db_conn.execute("SELECT COUNT(*) FROM egujcop") as cur:
        assert (await cur.fetchone())[0] >= 20

    async with db_conn.execute("SELECT COUNT(*) FROM afis") as cur:
        assert (await cur.fetchone())[0] >= 10

    async with db_conn.execute("SELECT COUNT(*) FROM nafis") as cur:
        assert (await cur.fetchone())[0] >= 5

    async with db_conn.execute("SELECT COUNT(*) FROM sightings") as cur:
        assert (await cur.fetchone())[0] >= 15


@pytest.mark.asyncio
async def test_correlate_demo_suspect(db_conn):
    """
    Test correlation for demo suspect GJ01ER8842:
    Must link across VAHAN, SARTHI, eGujCop, AFIS, NAFIS and evaluate to CRITICAL.
    """
    res = await correlate_plate(db_conn, "GJ01ER8842")
    assert res["is_watchlisted"] is True
    assert res["threat_level"] == "CRITICAL"
    assert "VAHAN" in res["source_databases"]
    assert "SARTHI" in res["source_databases"]
    assert "eGujCop" in res["source_databases"]
    assert "AFIS" in res["source_databases"]
    assert "NAFIS" in res["source_databases"]
    assert "FIR-892/2026/CRIME-BR" in res["associated_firs"]
    assert res["vahan_match"]["owner_name"] == "Vikram Solanki"
    assert res["sarthi_match"]["license_status"] == "Suspended"
    assert res["egujcop_match"]["wanted_status"] == "Absconding"
    assert res["afis_match"]["biometric_match_confidence"] >= 0.95
    assert res["nafis_match"]["cross_jurisdiction_flag"] is True


@pytest.mark.asyncio
async def test_correlate_stolen_vehicle(db_conn):
    """Test correlation for stolen vehicle GJ05CX9988."""
    res = await correlate_plate(db_conn, "GJ-05-CX-9988")
    assert res["is_watchlisted"] is True
    assert res["threat_level"] == "CRITICAL"
    assert res["vahan_match"]["stolen_flag"] is True
    assert "FIR-402/2026/SURAT-CR" in res["associated_firs"]


@pytest.mark.asyncio
async def test_correlate_blacklisted_vehicle(db_conn):
    """Test correlation for blacklisted vehicle GJ03KJ4521."""
    res = await correlate_plate(db_conn, "GJ03KJ4521")
    assert res["is_watchlisted"] is True
    assert res["threat_level"] == "HIGH"
    assert res["vahan_match"]["blacklist_status"] == "Blacklisted"
    assert res["sarthi_match"]["license_status"] == "Disqualified"


@pytest.mark.asyncio
async def test_correlate_clean_vehicle(db_conn):
    """Test correlation for clean vehicle GJ01AB1234."""
    res = await correlate_plate(db_conn, "GJ01AB1234")
    assert res["threat_level"] == "NORMAL"
    assert res["is_watchlisted"] is False
    assert res["associated_firs"] == []


@pytest.mark.asyncio
async def test_trajectory_reconstruction(db_conn):
    """
    Test trajectory reconstruction for GJ01ER8842:
    Route from Ahmedabad -> Mehsana -> Rajkot with chronological progression.
    """
    traj = await get_vehicle_trajectory(db_conn, "GJ01ER8842")
    assert traj["plate_number"] == "GJ01ER8842"
    assert traj["total_sightings"] >= 5
    assert len(traj["sightings"]) == traj["total_sightings"]
    
    # Chronological order verification
    timestamps = [s["timestamp_iso"] for s in traj["sightings"]]
    assert timestamps == sorted(timestamps)

    # Route check: first in Ahmedabad, middle in Mehsana, last in Rajkot
    assert "Ahmedabad" in traj["sightings"][0]["camera_name"] or "SG Highway" in traj["sightings"][0]["camera_name"]
    assert "Mehsana" in traj["sightings"][2]["camera_name"]
    assert any("Rajkot" in s["camera_name"] for s in traj["sightings"])


@pytest.mark.asyncio
async def test_fuzzy_plate_search(db_conn):
    """Test fuzzy plate search."""
    results = await search_plates(db_conn, "GJ01", limit=10)
    assert len(results) > 0
    plates = [r["plate_number"] for r in results]
    assert "GJ01ER8842" in plates
