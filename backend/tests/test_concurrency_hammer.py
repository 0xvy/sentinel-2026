"""
SENTINEL 2026 — SQLite WAL Concurrency Hammer & Isolation Tests (Gate 6)
========================================================================
Stress tests the database layer under heavy concurrent load:
1. 50 concurrent worker threads executing 1,000 combined writes
2. 10 concurrent reader threads querying trajectories
3. Asserts 0 'database is locked' errors under WAL mode + busy_timeout
4. Asserts PRAGMA integrity_check returns strictly ['ok']
5. Asserts p99 read query latency <= 25 ms
6. Strictly isolated to a temporary SQLite database (zero production DB pollution)
"""

import os
import time
import uuid
import tempfile
import sqlite3
import concurrent.futures
from typing import List
import numpy as np
import pytest

from db.database import INIT_SQL


def init_isolated_wal_db() -> str:
    """Creates a fresh, isolated temporary SQLite database with full WAL mode."""
    fd, path = tempfile.mkstemp(suffix="_sentinel_hammer.db")
    os.close(fd)

    conn = sqlite3.connect(path)
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA temp_store = MEMORY;")
    conn.execute("PRAGMA mmap_size = 268435456;")
    conn.execute("PRAGMA cache_size = -64000;")
    conn.executescript(INIT_SQL)

    # Performance indices for high-concurrency trajectory lookups
    conn.execute("CREATE INDEX IF NOT EXISTS idx_sightings_plate_pts ON sightings(plate_number, pts_timestamp_ms);")

    # Seed sample camera and trajectory data for readers
    conn.execute(
        "INSERT INTO cameras (camera_id, camera_name, department, district, lat, lng, status) "
        "VALUES ('CAM-TEST-01', 'Test Highway Junction', 'Police', 'Ahmedabad', 23.0225, 72.5714, 'Online')"
    )
    conn.execute(
        "INSERT INTO sightings (sighting_id, camera_id, camera_name, department, plate_number, "
        "pts_timestamp_ms, timestamp_iso, lat, lng, confidence, direction_of_travel, snapshot_url, "
        "snapshot_hash_sha256, watchlist_match_flag, created_at) "
        "VALUES ('s-01', 'CAM-TEST-01', 'Test Highway Junction', 'Police', 'GJ01TEST99', "
        "100000, '2026-09-12T12:00:00Z', 23.0225, 72.5714, 0.98, 'N', '/snapshots/s1.jpg', "
        "'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 1, '2026-09-12T12:00:01Z')"
    )
    conn.commit()
    conn.close()
    return path


def test_sqlite_wal_concurrency_hammer():
    """
    Gate 6: 50 concurrent writers + 10 concurrent readers.
    Asserts zero lock errors, integrity check strictly ['ok'], and p99 latency <= 25ms.
    """
    db_path = init_isolated_wal_db()
    errors: List[str] = []
    read_latencies_ms: List[float] = []

    def writer_task(worker_id: int, write_count: int):
        conn = None
        try:
            conn = sqlite3.connect(db_path, timeout=15.0)
            conn.execute("PRAGMA busy_timeout = 5000;")
            conn.execute("PRAGMA synchronous = NORMAL;")
            conn.execute("BEGIN IMMEDIATE;")
            for i in range(write_count):
                s_id = str(uuid.uuid4())
                pts = 100000 + (worker_id * 1000) + i
                conn.execute(
                    "INSERT INTO sightings (sighting_id, camera_id, camera_name, department, "
                    "plate_number, pts_timestamp_ms, timestamp_iso, lat, lng, confidence, "
                    "direction_of_travel, snapshot_url, snapshot_hash_sha256, watchlist_match_flag, created_at) "
                    "VALUES (?, 'CAM-TEST-01', 'Test Highway', 'Police', 'GJ01TEST99', ?, "
                    "'2026-09-12T12:05:00Z', 23.0225, 72.5714, 0.95, 'N', '/snap.jpg', "
                    "'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', 0, '2026-09-12T12:05:01Z')",
                    (s_id, pts),
                )
            conn.commit()
        except Exception as e:
            errors.append(f"Writer {worker_id} error: {e}")
        finally:
            if conn:
                conn.close()

    def reader_task(reader_id: int, read_count: int):
        conn = None
        try:
            conn = sqlite3.connect(db_path, timeout=10.0)
            conn.execute("PRAGMA busy_timeout = 5000;")
            conn.execute("PRAGMA query_only = 1;")
            conn.execute("PRAGMA mmap_size = 268435456;")
            conn.execute("PRAGMA cache_size = -64000;")
            for _ in range(read_count):
                t0 = time.perf_counter()
                cur = conn.execute(
                    "SELECT sighting_id, pts_timestamp_ms FROM sightings WHERE plate_number = ? "
                    "ORDER BY pts_timestamp_ms ASC LIMIT 20",
                    ("GJ01TEST99",),
                )
                _ = cur.fetchall()
                t1 = time.perf_counter()
                read_latencies_ms.append((t1 - t0) * 1000.0)
        except Exception as e:
            errors.append(f"Reader {reader_id} error: {e}")
        finally:
            if conn:
                conn.close()

    try:
        # Launch 50 writers (20 writes each = 1,000 writes total) + 10 readers (50 reads each = 500 reads)
        with concurrent.futures.ThreadPoolExecutor(max_workers=60) as executor:
            futures = []
            for w in range(50):
                futures.append(executor.submit(writer_task, w, 20))
            for r in range(10):
                futures.append(executor.submit(reader_task, r, 50))
            concurrent.futures.wait(futures)

        # 1. Assert exactly 0 errors
        assert len(errors) == 0, f"SQLite concurrency hammer errors: {errors}"

        # 2. Verify PRAGMA integrity_check returns strictly ['ok']
        conn = sqlite3.connect(db_path)
        cur = conn.execute("PRAGMA integrity_check;")
        check_res = [row[0] for row in cur.fetchall()]
        assert check_res == ["ok"], f"Database integrity check failed: {check_res}"

        # Verify total writes persisted (1 initial + 1000 written = 1001)
        cur = conn.execute("SELECT COUNT(*) FROM sightings WHERE plate_number = 'GJ01TEST99'")
        total_rows = cur.fetchone()[0]
        assert total_rows == 1001, f"Expected 1001 rows, found {total_rows}"
        conn.close()

        # 3. Verify p99 read query latency <= 25 ms
        assert len(read_latencies_ms) > 0
        p99_latency = float(np.percentile(read_latencies_ms, 99))
        assert p99_latency <= 25.0, f"p99 read query latency was {p99_latency:.2f}ms (> 25.0ms)"

    finally:
        # Clean up temporary database files
        for ext in ["", "-wal", "-shm"]:
            fpath = db_path + ext
            if os.path.exists(fpath):
                try:
                    os.remove(fpath)
                except OSError:
                    pass
