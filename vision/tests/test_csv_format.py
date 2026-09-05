"""Tests for Sentinel Vision Engine Evaluation CSV Exporter.

Verifies:
1. CSV has exact 8 headers in correct order
2. pts_timestamp_ms is integer
3. human_time is valid ISO 8601 format
4. watchlist_match_flag is boolean
5. associated_fir is string or empty
6. Multiple detections produce valid multi-row CSV
7. Export to file works correctly
8. Schema matches contracts/evaluation_csv.json
"""

import csv
import json
import os
import re
from datetime import datetime, timezone
import pytest

# MANDATORY STREAM RULE: TCP transport must be set before any cv2 import
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

from vision.csv_exporter import (
    EvaluationCSVExporter,
    ISO_8601_REGEX,
    format_human_time,
    validate_evaluation_csv,
)

EXPECTED_HEADERS = [
    "camera_id",
    "camera_name",
    "department",
    "license_plate",
    "pts_timestamp_ms",
    "human_time",
    "watchlist_match_flag",
    "associated_fir",
]


def test_csv_has_exact_8_headers_in_correct_order():
    """Verify that EvaluationCSVExporter defines the exact 8 headers in the exact order."""
    assert EvaluationCSVExporter.HEADERS == EXPECTED_HEADERS
    assert len(EvaluationCSVExporter.HEADERS) == 8

    exporter = EvaluationCSVExporter()
    csv_str = exporter.export_csv()
    lines = csv_str.strip().split("\n")
    assert lines[0] == ",".join(EXPECTED_HEADERS)


def test_pts_timestamp_ms_is_integer():
    """Verify pts_timestamp_ms is always serialized as an integer."""
    exporter = EvaluationCSVExporter()
    # Float PTS should be cast to integer
    row = exporter.add_detection(
        camera_id="CAM-GJ-POL-001",
        camera_name="SG Highway - ISKCON Junction Crossroad",
        department="Police",
        plate="GJ01AB1234",
        pts_ms=10450.75,
        watchlist_match=True,
        fir="CR-012/2026-SG",
    )
    assert isinstance(row["pts_timestamp_ms"], int)
    assert row["pts_timestamp_ms"] == 10450

    csv_str = exporter.export_csv()
    reader = csv.DictReader(csv_str.strip().split("\n"))
    exported_rows = list(reader)
    assert len(exported_rows) == 1
    assert exported_rows[0]["pts_timestamp_ms"] == "10450"
    assert int(exported_rows[0]["pts_timestamp_ms"]) == 10450


def test_human_time_is_valid_iso_8601():
    """Verify human_time is formatted strictly in ISO 8601 UTC format."""
    exporter = EvaluationCSVExporter()

    # 1. From datetime object
    dt = datetime(2026, 9, 5, 8, 11, 10, 450000, tzinfo=timezone.utc)
    row1 = exporter.add_detection(
        camera_id="CAM-GJ-POL-001",
        camera_name="SG Highway",
        department="Police",
        plate="GJ01AB1234",
        pts_ms=10450,
        human_time=dt,
    )
    assert ISO_8601_REGEX.match(row1["human_time"])
    assert row1["human_time"] == "2026-09-05T08:11:10.450Z"

    # 2. From default (None passed -> generated on the fly)
    row2 = exporter.add_detection(
        camera_id="CAM-GJ-POL-002",
        camera_name="Paldi Crossroad",
        department="Police",
        plate="GJ01CD5678",
        pts_ms=20000,
    )
    assert ISO_8601_REGEX.match(row2["human_time"])
    assert row2["human_time"].endswith("Z")


def test_watchlist_match_flag_is_boolean():
    """Verify watchlist_match_flag is boolean in memory and 'True'/'False' in CSV."""
    exporter = EvaluationCSVExporter()

    exporter.add_detection(
        camera_id="CAM-GJ-POL-001",
        camera_name="SG Highway",
        department="Police",
        plate="GJ01AB1234",
        pts_ms=1000,
        watchlist_match=True,
    )
    exporter.add_detection(
        camera_id="CAM-GJ-POL-002",
        camera_name="Paldi",
        department="Police",
        plate="GJ01CD5678",
        pts_ms=2000,
        watchlist_match=False,
    )

    # In memory representation
    assert exporter.rows[0]["watchlist_match_flag"] is True
    assert exporter.rows[1]["watchlist_match_flag"] is False

    # In CSV export
    csv_str = exporter.export_csv()
    reader = csv.DictReader(csv_str.strip().split("\n"))
    exported_rows = list(reader)

    assert exported_rows[0]["watchlist_match_flag"] == "True"
    assert exported_rows[1]["watchlist_match_flag"] == "False"


def test_associated_fir_is_string_or_empty():
    """Verify associated_fir is an FIR string when matched, and empty string when clean."""
    exporter = EvaluationCSVExporter()

    # Match with FIR
    exporter.add_detection(
        camera_id="CAM-GJ-POL-001",
        camera_name="SG Highway",
        department="Police",
        plate="GJ01AB1234",
        pts_ms=1000,
        watchlist_match=True,
        fir="CR-012/2026-SG",
    )

    # Non-match with None FIR
    exporter.add_detection(
        camera_id="CAM-GJ-POL-002",
        camera_name="Paldi",
        department="Police",
        plate="GJ01CD5678",
        pts_ms=2000,
        watchlist_match=False,
        fir=None,
    )

    csv_str = exporter.export_csv()
    reader = csv.DictReader(csv_str.strip().split("\n"))
    exported_rows = list(reader)

    assert exported_rows[0]["associated_fir"] == "CR-012/2026-SG"
    assert exported_rows[1]["associated_fir"] == ""
    assert "None" not in exported_rows[1]["associated_fir"]
    assert "null" not in exported_rows[1]["associated_fir"]


def test_multiple_detections_produce_valid_multi_row_csv():
    """Verify multiple detections produce a strictly compliant jury CSV."""
    exporter = EvaluationCSVExporter()

    sample_detections = [
        ("CAM-GJ-POL-001", "SG Highway - ISKCON Junction Crossroad", "Police", "GJ01AB1234", 10450, True, "CR-012/2026-SG"),
        ("CAM-GJ-POL-001", "SG Highway - ISKCON Junction Crossroad", "Police", "GJ01KR5521", 11800, False, None),
        ("CAM-GJ-RTO-001", "Bhilad RTO Heavy Vehicle Weighbridge", "Transport/RTO", "GJ05CX9988", 24120, True, "FIR-404/2026-BLD"),
        ("CAM-GJ-RTC-001", "Geeta Mandir Central Bus Terminal Platform 1", "GSRTC", "GJ27AA0001", 45200, False, None),
        ("CAM-GJ-AMC-001", "AMC Paldi Smart City Command Feed", "Municipal Corp", "GJ01CD7744", 58900, False, None),
    ]

    for cam_id, name, dept, plate, pts, match, fir in sample_detections:
        exporter.add_detection(
            camera_id=cam_id,
            camera_name=name,
            department=dept,
            plate=plate,
            pts_ms=pts,
            watchlist_match=match,
            fir=fir,
            human_time=datetime(2026, 9, 5, 8, 11, int(pts / 1000), (pts % 1000) * 1000, tzinfo=timezone.utc),
        )

    csv_str = exporter.export_csv()
    lines = csv_str.strip().split("\n")
    assert len(lines) == 6  # 1 header + 5 rows

    is_valid, errors = validate_evaluation_csv(csv_str)
    assert is_valid, f"CSV failed validation: {errors}"
    assert len(errors) == 0


def test_export_to_file(tmp_path):
    """Verify exporting directly to a filesystem path works properly."""
    csv_file = tmp_path / "jury_evaluation.csv"

    exporter = EvaluationCSVExporter()
    exporter.add_detection(
        camera_id="CAM-GJ-POL-001",
        camera_name="SG Highway",
        department="Police",
        plate="GJ01AB1234",
        pts_ms=15000,
        watchlist_match=True,
        fir="CR-999/2026",
    )

    returned_content = exporter.export_csv(str(csv_file))

    assert csv_file.exists()
    with open(csv_file, "r", encoding="utf-8") as f:
        file_content = f.read()

    assert file_content == returned_content
    is_valid, errors = validate_evaluation_csv(str(csv_file))
    assert is_valid, f"Validation of saved file failed: {errors}"


def test_schema_matches_contracts_evaluation_csv_json():
    """Verify exporter schema conforms exactly to contracts/evaluation_csv.json."""
    contract_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "contracts", "evaluation_csv.json"
    )
    contract_path = os.path.abspath(contract_path)

    assert os.path.exists(contract_path), f"Contract file not found at {contract_path}"

    with open(contract_path, "r", encoding="utf-8") as f:
        contract_data = json.load(f)

    # 1. Verify default columns specification
    contract_columns = contract_data["properties"]["columns"]["default"]
    expected_names = [col["name"] for col in contract_columns]

    assert expected_names == EvaluationCSVExporter.HEADERS, (
        f"Contract column order mismatch!\nContract: {expected_names}\nExporter: {EvaluationCSVExporter.HEADERS}"
    )

    # 2. Verify all required properties in row schema
    row_props = contract_data["properties"]["row"]["properties"]
    for header in EvaluationCSVExporter.HEADERS:
        assert header in row_props, f"Header '{header}' missing from row schema definition"


def test_validate_row():
    """Verify validate_row method correctly flags valid and invalid records."""
    exporter = EvaluationCSVExporter()

    valid_row = {
        "camera_id": "CAM-GJ-POL-001",
        "camera_name": "SG Highway",
        "department": "Police",
        "license_plate": "GJ01AB1234",
        "pts_timestamp_ms": 10450,
        "human_time": "2026-09-05T08:11:10.450Z",
        "watchlist_match_flag": True,
        "associated_fir": "CR-012/2026-SG",
    }
    assert exporter.validate_row(valid_row) is True

    # Missing required camera_id
    invalid_row_1 = dict(valid_row, camera_id="")
    assert exporter.validate_row(invalid_row_1) is False

    # Negative PTS
    invalid_row_2 = dict(valid_row, pts_timestamp_ms=-100)
    assert exporter.validate_row(invalid_row_2) is False

    # Non-ISO human_time
    invalid_row_3 = dict(valid_row, human_time="05/09/2026 08:11:10 AM")
    assert exporter.validate_row(invalid_row_3) is False

    # Invalid watchlist flag
    invalid_row_4 = dict(valid_row, watchlist_match_flag="invalid_flag")
    assert exporter.validate_row(invalid_row_4) is False
