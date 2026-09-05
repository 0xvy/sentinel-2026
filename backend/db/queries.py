import re
import json
import hashlib
from typing import Optional, List, Dict, Any
import aiosqlite


def normalize_plate(plate: str) -> str:
    """Normalize license plate: remove hyphens, spaces, and convert to uppercase."""
    if not plate:
        return ""
    return re.sub(r"[\s\-_]+", "", plate).upper()


async def correlate_plate(db: aiosqlite.Connection, plate_number: str) -> Dict[str, Any]:
    """
    Correlate a target license plate across all 5 databases:
    1. VAHAN (National Vehicle Registry)
    2. SARTHI (Driving License Registry)
    3. eGujCop (Gujarat Police CCTNS FIRs & Wanted Persons)
    4. AFIS (State Fingerprint Bureau)
    5. NAFIS (National NCRB Biometrics & Interstate Crimes)

    Computes federated threat level:
    - CRITICAL: stolen_flag=true OR wanted_status IN (Absconding, Active Warrant)
    - HIGH: blacklist_status=Blacklisted OR license_status IN (Suspended, Disqualified) OR linked to open FIR
    - NORMAL: No watchlist matches
    """
    clean_plate = normalize_plate(plate_number)
    
    source_databases: List[str] = []
    associated_firs: List[str] = []
    
    vahan_match: Optional[Dict[str, Any]] = None
    sarthi_match: Optional[Dict[str, Any]] = None
    egujcop_match: Optional[Dict[str, Any]] = None
    afis_match: Optional[Dict[str, Any]] = None
    nafis_match: Optional[Dict[str, Any]] = None

    # 1. VAHAN lookup
    async with db.execute(
        "SELECT plate_number, vehicle_class, owner_name, blacklist_status, stolen_flag, linked_fir "
        "FROM vahan WHERE plate_number = ?",
        (clean_plate,)
    ) as cursor:
        row = await cursor.fetchone()
        if row:
            source_databases.append("VAHAN")
            vahan_match = {
                "stolen_flag": bool(row["stolen_flag"]),
                "blacklist_status": row["blacklist_status"],
                "owner_name": row["owner_name"],
                "vehicle_class": row["vehicle_class"],
            }
            if row["linked_fir"]:
                associated_firs.append(row["linked_fir"])

    # 2. SARTHI lookup by linked_plate
    async with db.execute(
        "SELECT dl_number, driver_name, license_status, suspect_link_id "
        "FROM sarthi WHERE linked_plate = ?",
        (clean_plate,)
    ) as cursor:
        row = await cursor.fetchone()
        if row:
            source_databases.append("SARTHI")
            sarthi_match = {
                "dl_number": row["dl_number"],
                "license_status": row["license_status"],
                "driver_name": row["driver_name"],
            }

    # 3. eGujCop lookup by linked_plate OR linked_fir
    eguj_query = "SELECT fir_number, police_station, district, crime_head, accused_name, wanted_status, threat_priority " \
                 "FROM egujcop WHERE linked_plate = ?"
    eguj_params: list[Any] = [clean_plate]
    if associated_firs:
        eguj_query += f" OR fir_number IN ({','.join(['?']*len(associated_firs))})"
        eguj_params.extend(associated_firs)

    async with db.execute(eguj_query, eguj_params) as cursor:
        row = await cursor.fetchone()
        if row:
            source_databases.append("eGujCop")
            egujcop_match = {
                "fir_number": row["fir_number"],
                "crime_head": row["crime_head"],
                "wanted_status": row["wanted_status"],
                "police_station": row["police_station"],
                "threat_priority": row["threat_priority"],
            }
            if row["fir_number"] not in associated_firs:
                associated_firs.append(row["fir_number"])

    # 4. AFIS lookup if any FIR is linked
    if associated_firs:
        placeholders = ",".join(["?"] * len(associated_firs))
        async with db.execute(
            f"SELECT state_afis_id, linked_fir, biometric_match_confidence, suspect_name, arrest_record "
            f"FROM afis WHERE linked_fir IN ({placeholders})",
            associated_firs
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                source_databases.append("AFIS")
                afis_match = {
                    "state_afis_id": row["state_afis_id"],
                    "biometric_match_confidence": float(row["biometric_match_confidence"]),
                    "suspect_name": row["suspect_name"],
                    "arrest_record": row["arrest_record"],
                }

    # 5. NAFIS lookup if state_afis_id found
    if afis_match and afis_match.get("state_afis_id"):
        async with db.execute(
            "SELECT national_fingerprint_number, interstate_crime_record, cross_jurisdiction_flag, federal_linking_status "
            "FROM nafis WHERE state_afis_id = ?",
            (afis_match["state_afis_id"],)
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                source_databases.append("NAFIS")
                nafis_match = {
                    "national_fingerprint_number": row["national_fingerprint_number"],
                    "interstate_crime_record": row["interstate_crime_record"],
                    "cross_jurisdiction_flag": bool(row["cross_jurisdiction_flag"]),
                    "federal_linking_status": row["federal_linking_status"],
                }

    # 6. Compute federated threat level
    threat_level = "NORMAL"
    is_watchlisted = False

    is_stolen = vahan_match and vahan_match.get("stolen_flag") is True
    wanted_status = egujcop_match.get("wanted_status") if egujcop_match else None
    blacklist_status = vahan_match.get("blacklist_status") if vahan_match else None
    license_status = sarthi_match.get("license_status") if sarthi_match else None
    has_open_fir = len(associated_firs) > 0
    cross_jurisdiction = nafis_match.get("cross_jurisdiction_flag") if nafis_match else False
    eguj_priority = egujcop_match.get("threat_priority") if egujcop_match else None

    # CRITICAL criteria
    if is_stolen or wanted_status in ("Absconding", "Active Warrant") or eguj_priority == "CRITICAL" or cross_jurisdiction:
        threat_level = "CRITICAL"
        is_watchlisted = True
    # HIGH criteria
    elif (
        blacklist_status in ("Blacklisted", "RTO Seizure Notice")
        or license_status in ("Suspended", "Disqualified")
        or has_open_fir
        or eguj_priority == "HIGH"
    ):
        threat_level = "HIGH"
        is_watchlisted = True
    elif eguj_priority == "MEDIUM" or (source_databases and blacklist_status not in (None, "Clean")):
        threat_level = "MEDIUM"
        is_watchlisted = True
    elif source_databases and any([vahan_match, sarthi_match, egujcop_match, afis_match, nafis_match]):
        # Check if any watchlist condition is met
        if blacklist_status == "Clean" and license_status == "Active" and not has_open_fir:
            threat_level = "NORMAL"
            is_watchlisted = False
        else:
            threat_level = "LOW"
            is_watchlisted = True
    else:
        threat_level = "NORMAL"
        is_watchlisted = False

    # 7. Compute tactical recommended action
    if threat_level == "CRITICAL":
        recommended_action = (
            "TACTICAL RED ALERT: Immediate PCR Van Intercept. Vehicle associated with active warrant / absconding suspect / stolen report. Notify District SP & State Command Center."
        )
    elif threat_level == "HIGH":
        recommended_action = (
            "TACTICAL AMBER ALERT: Intercept & Verify at next toll naka or junction. Plate flagged for RTO seizure / license suspension / open FIR."
        )
    elif threat_level == "MEDIUM":
        recommended_action = (
            "MONITOR: Log checkpoint passage and maintain automated route tracking."
        )
    else:
        recommended_action = "ROUTINE: Normal traffic flow; no active enforcement action required."

    return {
        "is_watchlisted": is_watchlisted,
        "threat_level": threat_level,
        "source_databases": source_databases,
        "associated_firs": associated_firs,
        "vahan_match": vahan_match,
        "sarthi_match": sarthi_match,
        "egujcop_match": egujcop_match,
        "afis_match": afis_match,
        "nafis_match": nafis_match,
        "recommended_action": recommended_action,
    }


async def get_vehicle_trajectory(db: aiosqlite.Connection, plate_number: str) -> Dict[str, Any]:
    """
    Retrieve chronological cross-camera trajectory reconstruction for a target vehicle plate.
    The core jury evaluation test case.
    """
    clean_plate = normalize_plate(plate_number)

    # 1. Fetch all sightings ordered by timestamp ascending
    async with db.execute(
        "SELECT sighting_id, camera_id, camera_name, department, lat, lng, "
        "pts_timestamp_ms, timestamp_iso, confidence, direction_of_travel, "
        "snapshot_url, snapshot_hash_sha256 "
        "FROM sightings WHERE plate_number = ? "
        "ORDER BY timestamp_iso ASC, pts_timestamp_ms ASC",
        (clean_plate,)
    ) as cursor:
        rows = await cursor.fetchall()
        sightings = [dict(row) for row in rows]

    # 2. Correlate across databases
    watchlist_info = await correlate_plate(db, clean_plate)

    total_sightings = len(sightings)
    first_seen = sightings[0]["timestamp_iso"] if sightings else None
    last_seen = sightings[-1]["timestamp_iso"] if sightings else None

    return {
        "plate_number": clean_plate,
        "total_sightings": total_sightings,
        "first_seen": first_seen,
        "last_seen": last_seen,
        "sightings": sightings,
        "watchlist_status": {
            "is_watchlisted": watchlist_info["is_watchlisted"],
            "threat_level": watchlist_info["threat_level"],
            "matched_databases": watchlist_info["source_databases"],
            "associated_firs": watchlist_info["associated_firs"],
        },
    }


async def search_plates(
    db: aiosqlite.Connection, partial_plate: str, limit: int = 20
) -> List[Dict[str, Any]]:
    """
    Fuzzy/partial plate search across VAHAN and sightings.
    Returns top matching plates with summary metadata.
    """
    query_str = f"%{normalize_plate(partial_plate)}%"
    
    # Union plates from vahan and sightings matching search term
    sql = """
    SELECT DISTINCT p.plate_number,
           v.vehicle_class,
           v.owner_name,
           v.blacklist_status,
           COALESCE(v.stolen_flag, 0) AS stolen_flag,
           (SELECT COUNT(*) FROM sightings s WHERE s.plate_number = p.plate_number) AS total_sightings,
           (SELECT MAX(s.timestamp_iso) FROM sightings s WHERE s.plate_number = p.plate_number) AS last_seen
    FROM (
        SELECT plate_number FROM vahan WHERE plate_number LIKE ?
        UNION
        SELECT plate_number FROM sightings WHERE plate_number LIKE ?
    ) p
    LEFT JOIN vahan v ON p.plate_number = v.plate_number
    ORDER BY total_sightings DESC, last_seen DESC
    LIMIT ?
    """
    results: List[Dict[str, Any]] = []
    async with db.execute(sql, (query_str, query_str, limit)) as cursor:
        rows = await cursor.fetchall()
        for row in rows:
            plate = row["plate_number"]
            corr = await correlate_plate(db, plate)
            results.append({
                "plate_number": plate,
                "vehicle_class": row["vehicle_class"] or "Unknown",
                "owner_name": row["owner_name"] or "Unknown",
                "blacklist_status": row["blacklist_status"] or "Clean",
                "stolen_flag": bool(row["stolen_flag"]),
                "threat_level": corr["threat_level"],
                "total_sightings": row["total_sightings"] or 0,
                "last_seen": row["last_seen"],
            })
    return results


async def get_cameras(
    db: aiosqlite.Connection,
    department: Optional[str] = None,
    status: Optional[str] = None,
    district: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Query cameras table with optional filters."""
    conditions: List[str] = []
    params: List[Any] = []

    if department:
        conditions.append("department = ?")
        params.append(department)
    if status:
        conditions.append("status = ?")
        params.append(status)
    if district:
        conditions.append("district = ?")
        params.append(district)

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    sql = f"SELECT * FROM cameras {where_clause} ORDER BY camera_id ASC"

    async with db.execute(sql, params) as cursor:
        rows = await cursor.fetchall()
        cameras = []
        for r in rows:
            item = dict(r)
            item["ptz_capable"] = bool(item.get("ptz_capable", 0))
            cameras.append(item)
        return cameras


async def insert_sighting(db: aiosqlite.Connection, sighting: Dict[str, Any]) -> None:
    """Persist a verified vehicle sighting into the database."""
    sql = """
    INSERT INTO sightings (
        sighting_id, camera_id, camera_name, department, plate_number,
        pts_timestamp_ms, timestamp_iso, lat, lng, confidence,
        direction_of_travel, snapshot_url, snapshot_hash_sha256,
        watchlist_match_flag, associated_fir, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    await db.execute(
        sql,
        (
            sighting["sighting_id"],
            sighting["camera_id"],
            sighting["camera_name"],
            sighting["department"],
            normalize_plate(sighting["plate_number"]),
            sighting["pts_timestamp_ms"],
            sighting["timestamp_iso"],
            sighting["lat"],
            sighting["lng"],
            sighting["confidence"],
            sighting.get("direction_of_travel", "Unknown"),
            sighting.get("snapshot_url", ""),
            sighting.get("snapshot_hash_sha256", hashlib.sha256(b"sentinel_default").hexdigest()),
            1 if sighting.get("watchlist_match_flag") else 0,
            sighting.get("associated_fir"),
            sighting["created_at"],
        ),
    )
    await db.commit()


async def insert_alert(db: aiosqlite.Connection, alert: Dict[str, Any]) -> None:
    """Persist an enriched alert event."""
    sql = """
    INSERT OR REPLACE INTO alerts (
        alert_id, timestamp_pts_ms, timestamp_iso, camera_id, camera_dept,
        camera_lat, camera_lng, detected_plate, confidence, threat_level,
        source_databases, vahan_match, egujcop_match, sarthi_match,
        afis_match, nafis_match, recommended_action, snapshot_url,
        snapshot_hash_sha256, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """
    await db.execute(
        sql,
        (
            alert["alert_id"],
            alert["timestamp_pts_ms"],
            alert["timestamp_iso"],
            alert["camera_id"],
            alert.get("camera_dept"),
            alert.get("camera_lat"),
            alert.get("camera_lng"),
            normalize_plate(alert["detected_plate"]),
            alert["confidence"],
            alert["threat_level"],
            json.dumps(alert.get("source_databases", [])),
            json.dumps(alert.get("vahan_match")) if alert.get("vahan_match") else None,
            json.dumps(alert.get("egujcop_match")) if alert.get("egujcop_match") else None,
            json.dumps(alert.get("sarthi_match")) if alert.get("sarthi_match") else None,
            json.dumps(alert.get("afis_match")) if alert.get("afis_match") else None,
            json.dumps(alert.get("nafis_match")) if alert.get("nafis_match") else None,
            alert.get("recommended_action"),
            alert.get("snapshot_url"),
            alert.get("snapshot_hash_sha256"),
            alert.get("created_at") or alert.get("timestamp_iso"),
        ),
    )
    await db.commit()


async def get_recent_alerts(db: aiosqlite.Connection, limit: int = 100) -> List[Dict[str, Any]]:
    """Retrieve the latest alerts enriched with parsed JSON metadata."""
    sql = "SELECT * FROM alerts ORDER BY timestamp_iso DESC, created_at DESC LIMIT ?"
    async with db.execute(sql, (limit,)) as cursor:
        rows = await cursor.fetchall()
        alerts = []
        for r in rows:
            d = dict(r)
            d["source_databases"] = json.loads(d["source_databases"]) if d.get("source_databases") else []
            d["vahan_match"] = json.loads(d["vahan_match"]) if d.get("vahan_match") else None
            d["egujcop_match"] = json.loads(d["egujcop_match"]) if d.get("egujcop_match") else None
            d["sarthi_match"] = json.loads(d["sarthi_match"]) if d.get("sarthi_match") else None
            d["afis_match"] = json.loads(d["afis_match"]) if d.get("afis_match") else None
            d["nafis_match"] = json.loads(d["nafis_match"]) if d.get("nafis_match") else None
            alerts.append(d)
        return alerts


async def get_export_sightings(
    db: aiosqlite.Connection, plate_number: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Retrieve sightings data for jury evaluation CSV export."""
    params: List[Any] = []
    where_clause = ""
    if plate_number:
        where_clause = "WHERE s.plate_number = ?"
        params.append(normalize_plate(plate_number))

    sql = f"""
    SELECT s.camera_id,
           s.camera_name,
           s.department,
           s.plate_number AS license_plate,
           s.pts_timestamp_ms,
           s.timestamp_iso AS human_time,
           s.watchlist_match_flag,
           s.associated_fir
    FROM sightings s
    {where_clause}
    ORDER BY s.timestamp_iso ASC, s.pts_timestamp_ms ASC
    """
    async with db.execute(sql, params) as cursor:
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
