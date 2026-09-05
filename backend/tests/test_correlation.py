import inspect
import pytest
import aiosqlite

from db.queries import correlate_plate


async def _invoke_correlate(db: aiosqlite.Connection, plate_number: str):
    """Invoke correlate_plate supporting both (db, plate) and (plate) signatures."""
    sig = inspect.signature(correlate_plate)
    if len(sig.parameters) == 1:
        result = correlate_plate(plate_number)
    else:
        result = correlate_plate(db, plate_number)
    if inspect.iscoroutine(result):
        return await result
    return result


@pytest.mark.asyncio
async def test_correlate_suspect_plate_critical(db_conn: aiosqlite.Connection):
    """
    Test correlate_plate('GJ01ER8842') returns CRITICAL threat level
    for suspect Vikram Solanki (linked to active FIR and absconding wanted status).
    """
    result = await _invoke_correlate(db_conn, "GJ01ER8842")

    assert isinstance(result, dict)
    assert result["is_watchlisted"] is True
    assert result["threat_level"] == "CRITICAL", f"Expected CRITICAL, got {result['threat_level']}"
    assert "associated_firs" in result
    assert len(result["associated_firs"]) > 0


@pytest.mark.asyncio
async def test_correlate_returns_all_5_databases(db_conn: aiosqlite.Connection):
    """
    Test correlate_plate returns all 5 database matches when applicable:
    1. VAHAN (National Vehicle Registry)
    2. SARTHI (Driver Licensing)
    3. eGujCop (Gujarat Police CCTNS FIRs & Wanted Records)
    4. AFIS (State Automated Fingerprint Identification System)
    5. NAFIS (National NCRB Interstate Biometrics)
    """
    result = await _invoke_correlate(db_conn, "GJ01ER8842")

    source_dbs = result.get("source_databases", [])
    expected_dbs = ["VAHAN", "SARTHI", "eGujCop", "AFIS", "NAFIS"]

    for db_name in expected_dbs:
        assert db_name in source_dbs, f"Expected {db_name} in matched source_databases: {source_dbs}"

    # Verify individual match structures
    assert result["vahan_match"] is not None, "Expected vahan_match details"
    assert result["vahan_match"]["owner_name"] == "Vikram Solanki"

    assert result["sarthi_match"] is not None, "Expected sarthi_match details"
    assert result["sarthi_match"]["license_status"] == "Suspended"

    assert result["egujcop_match"] is not None, "Expected egujcop_match details"
    assert result["egujcop_match"]["wanted_status"] == "Absconding"

    assert result["afis_match"] is not None, "Expected afis_match details"
    assert result["afis_match"]["biometric_match_confidence"] >= 0.90

    assert result["nafis_match"] is not None, "Expected nafis_match details"
    assert result["nafis_match"]["cross_jurisdiction_flag"] is True


@pytest.mark.asyncio
async def test_correlate_clean_plate_returns_normal(db_conn: aiosqlite.Connection):
    """Test clean plate returns NORMAL threat level with no watchlist matches."""
    # Test registered clean vehicle
    clean_registered = await _invoke_correlate(db_conn, "GJ01AB1234")
    assert clean_registered["threat_level"] == "NORMAL"
    assert clean_registered["is_watchlisted"] is False

    # Test completely unknown / unregistered plate
    unknown_plate = await _invoke_correlate(db_conn, "GJ99ZZ0000")
    assert unknown_plate["threat_level"] == "NORMAL"
    assert unknown_plate["is_watchlisted"] is False
    assert len(unknown_plate["source_databases"]) == 0
    assert len(unknown_plate["associated_firs"]) == 0


@pytest.mark.asyncio
async def test_correlate_suspended_license_returns_high(db_conn: aiosqlite.Connection):
    """
    Test plate linked to a suspended or disqualified driving license returns HIGH threat level.
    Threat Rule: license_status IN (Suspended, Disqualified) -> HIGH
    """
    # Insert clean vehicle with suspended driver license
    test_plate = "GJ20SUSP99"
    await db_conn.execute(
        "INSERT OR REPLACE INTO vahan (plate_number, vehicle_class, owner_name, chassis_number, "
        "engine_number, registration_date, blacklist_status, stolen_flag) "
        "VALUES (?, 'Motor Car (LMV)', 'Suspended Driver Test', 'CHASSIS-SUSP-99', 'ENG-SUSP-99', "
        "'2023-01-01', 'Clean', 0)",
        (test_plate,),
    )
    await db_conn.execute(
        "INSERT OR REPLACE INTO sarthi (dl_number, driver_name, linked_aadhaar_hash, license_status, linked_plate) "
        "VALUES ('GJ2020220099999', 'Suspended Driver Test', "
        "'0000111122223333444455556666777788889999aaaabbbbccccddddeeeeffff', 'Suspended', ?)",
        (test_plate,),
    )
    await db_conn.commit()

    result = await _invoke_correlate(db_conn, test_plate)
    assert result["is_watchlisted"] is True
    assert result["threat_level"] == "HIGH", f"Expected HIGH for suspended license, got {result['threat_level']}"
    assert "SARTHI" in result["source_databases"]


@pytest.mark.asyncio
async def test_correlate_blacklisted_plate_returns_high(db_conn: aiosqlite.Connection):
    """
    Test plate with blacklist status returns HIGH threat level.
    Threat Rule: blacklist_status=Blacklisted -> HIGH
    """
    # Plate GJ06MM8821 in seed data has blacklist_status='Blacklisted' and stolen_flag=0
    result = await _invoke_correlate(db_conn, "GJ06MM8821")
    assert result["is_watchlisted"] is True
    assert result["threat_level"] == "HIGH", f"Expected HIGH for blacklisted plate, got {result['threat_level']}"
    assert "VAHAN" in result["source_databases"]
    assert result["vahan_match"]["blacklist_status"] == "Blacklisted"


@pytest.mark.asyncio
async def test_correlate_stolen_vehicle_returns_critical(db_conn: aiosqlite.Connection):
    """
    Test stolen vehicle flag immediately triggers CRITICAL threat level.
    Threat Rule: stolen_flag=true -> CRITICAL
    """
    # Plate GJ05CX9988 in seed data has stolen_flag=1
    result = await _invoke_correlate(db_conn, "GJ05CX9988")
    assert result["is_watchlisted"] is True
    assert result["threat_level"] == "CRITICAL", f"Expected CRITICAL for stolen vehicle, got {result['threat_level']}"
    assert result["vahan_match"]["stolen_flag"] is True
