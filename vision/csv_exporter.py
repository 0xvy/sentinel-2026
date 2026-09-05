"""Sentinel Vision Engine - Evaluation CSV Exporter.

Strict jury format serialization for vehicle sightings, trajectory evaluation,
and watchlist alerts. Conforms exactly to contracts/evaluation_csv.json.
"""

import csv
import io
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

# MANDATORY STREAM RULE: TCP transport must be set before any cv2 import
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

# Regex for validating ISO 8601 formatted timestamps (e.g. 2026-09-05T08:15:30.430Z)
ISO_8601_REGEX = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$"
)


def format_human_time(dt: Optional[datetime] = None) -> str:
    """Format datetime into standard ISO 8601 UTC string with millisecond precision."""
    if dt is None:
        dt = datetime.now(timezone.utc)
    elif dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


class EvaluationCSVExporter:
    """Jury evaluation CSV report generator and validator."""

    HEADERS: List[str] = [
        "camera_id",
        "camera_name",
        "department",
        "license_plate",
        "pts_timestamp_ms",
        "human_time",
        "watchlist_match_flag",
        "associated_fir",
    ]

    def __init__(self) -> None:
        self.rows: List[Dict[str, Any]] = []

    def add_detection(
        self,
        camera_id: str,
        camera_name: str,
        department: str,
        plate: str,
        pts_ms: Union[int, float],
        watchlist_match: bool = False,
        fir: Optional[str] = None,
        human_time: Optional[Union[datetime, str]] = None,
    ) -> Dict[str, Any]:
        """Record a single vehicle sighting for jury evaluation."""
        if human_time is None:
            time_str = format_human_time()
        elif isinstance(human_time, datetime):
            time_str = format_human_time(human_time)
        else:
            time_str = str(human_time)

        # Normalize FIR string (never None in CSV, empty string if clean)
        fir_str = "" if fir is None else str(fir).strip()

        row: Dict[str, Any] = {
            "camera_id": str(camera_id).strip(),
            "camera_name": str(camera_name).strip(),
            "department": str(department).strip(),
            "license_plate": str(plate).strip().upper(),
            "pts_timestamp_ms": int(pts_ms),
            "human_time": time_str,
            "watchlist_match_flag": bool(watchlist_match),
            "associated_fir": fir_str,
        }

        self.rows.append(row)
        return row

    def export_csv(self, filepath: Optional[str] = None) -> str:
        """Export sightings to CSV file or return as formatted string."""
        buffer = io.StringIO()
        writer = csv.DictWriter(
            buffer,
            fieldnames=self.HEADERS,
            lineterminator="\n",
            extrasaction="ignore",
        )
        writer.writeheader()

        for r in self.rows:
            csv_row = dict(r)
            # Guarantee strict boolean strings "True" or "False"
            csv_row["watchlist_match_flag"] = "True" if r["watchlist_match_flag"] else "False"
            # Guarantee empty string for clean records without FIR
            csv_row["associated_fir"] = "" if r.get("associated_fir") is None else str(r["associated_fir"])
            writer.writerow(csv_row)

        content = buffer.getvalue()

        if filepath is not None:
            # Ensure parent directories exist
            parent = os.path.dirname(os.path.abspath(filepath))
            if parent and not os.path.exists(parent):
                os.makedirs(parent, exist_ok=True)
            with open(filepath, mode="w", newline="", encoding="utf-8") as f:
                f.write(content)

        return content

    def validate_row(self, row: Dict[str, Any]) -> bool:
        """Validate an individual row dictionary against contracts/evaluation_csv.json."""
        # 1. Check presence of all required fields
        required_fields = [
            "camera_id",
            "camera_name",
            "department",
            "license_plate",
            "pts_timestamp_ms",
            "human_time",
            "watchlist_match_flag",
        ]
        for field in required_fields:
            if field not in row or row[field] is None:
                return False

        # 2. String field non-emptiness
        for field in ["camera_id", "camera_name", "department", "license_plate"]:
            val = row[field]
            if not isinstance(val, str) or len(val.strip()) == 0:
                return False

        # 3. pts_timestamp_ms must be integer >= 0
        pts_val = row["pts_timestamp_ms"]
        if not isinstance(pts_val, int) or isinstance(pts_val, bool) or pts_val < 0:
            try:
                # If passed as string of int
                if int(pts_val) < 0:
                    return False
            except (ValueError, TypeError):
                return False

        # 4. human_time must be ISO 8601
        time_val = str(row["human_time"])
        if not ISO_8601_REGEX.match(time_val):
            return False

        # 5. watchlist_match_flag must be boolean or "True"/"False" string
        flag_val = row["watchlist_match_flag"]
        if not (isinstance(flag_val, bool) or flag_val in ("True", "False")):
            return False

        # 6. associated_fir must be str or None
        fir_val = row.get("associated_fir")
        if fir_val is not None and not isinstance(fir_val, str):
            return False

        return True


def validate_evaluation_csv(filepath_or_content: str) -> Tuple[bool, List[str]]:
    """Validate full CSV file or string content against official jury criteria.

    Returns:
        (is_valid, list_of_errors)
    """
    errors: List[str] = []

    try:
        if os.path.isfile(filepath_or_content):
            with open(filepath_or_content, mode="r", encoding="utf-8") as f:
                content = f.read()
        else:
            content = filepath_or_content

        reader = csv.reader(io.StringIO(content))
        headers = next(reader, None)

        if headers != EvaluationCSVExporter.HEADERS:
            errors.append(
                f"Header mismatch!\nExpected: {EvaluationCSVExporter.HEADERS}\nFound:    {headers}"
            )
            return False, errors

        for line_idx, row in enumerate(reader, start=2):
            if len(row) != 8:
                errors.append(f"Line {line_idx}: Expected 8 columns, got {len(row)}")
                continue

            cam_id, cam_name, dept, plate, pts_ms, human_time, match_flag, fir = row

            if not cam_id.strip():
                errors.append(f"Line {line_idx}: camera_id cannot be empty")
            if not plate.strip():
                errors.append(f"Line {line_idx}: license_plate cannot be empty")

            try:
                pts_int = int(pts_ms)
                if pts_int < 0:
                    errors.append(f"Line {line_idx}: pts_timestamp_ms cannot be negative")
            except ValueError:
                errors.append(f"Line {line_idx}: pts_timestamp_ms must be integer, got '{pts_ms}'")

            if not ISO_8601_REGEX.match(human_time):
                errors.append(f"Line {line_idx}: human_time is not valid ISO 8601: '{human_time}'")

            if match_flag not in ("True", "False"):
                errors.append(
                    f"Line {line_idx}: watchlist_match_flag must be 'True' or 'False', got '{match_flag}'"
                )

    except Exception as e:
        errors.append(f"Fatal error reading CSV: {str(e)}")
        return False, errors

    return len(errors) == 0, errors
