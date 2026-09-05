---
name: sentinel-evaluation-csv
description: Step-by-step implementation guide for exporting and validating jury evaluation CSV reports with exact column ordering, ISO 8601 timestamps, and schema integrity.
---

# Sentinel Jury Evaluation CSV Skill

## Overview
At the conclusion of an operational surveillance scenario or benchmark evaluation, the jury evaluation panel inspects an exported CSV file recording all vehicle sightings and watchlist detections. The evaluation scoring scripts parse this file automatically; any column reordering, missing header, or invalid timestamp formatting causes automated grading failure.

---

## Step 1: Exact CSV Schema Specification

The evaluation CSV **MUST** contain exactly 8 columns in this precise sequence:

| Col # | Header Name | Type | Description | Example |
|---|---|---|---|---|
| 1 | `camera_id` | String | Unique camera sensor identifier | `CAM-GJ-POL-001` |
| 2 | `camera_name` | String | Human-readable camera location | `SG Highway - ISKCON Junction Crossroad` |
| 3 | `department` | String | Originating department | `Police` |
| 4 | `license_plate` | String | Normalized Gujarat plate registration | `GJ01AB1234` |
| 5 | `pts_timestamp_ms` | Integer | Stream Presentation Timestamp in ms | `125430` |
| 6 | `human_time` | String | ISO 8601 formatted timestamp | `2026-09-05T08:15:30.430Z` |
| 7 | `watchlist_match_flag` | Boolean | `True` if matched against eGujCop/VAHAN watchlist, else `False` | `True` |
| 8 | `associated_fir` | String | Active FIR / Case number, or empty string `""` if not on watchlist | `CR-012/2026-SG` |

---

## Step 2: Sample 5-Row CSV Output

```csv
camera_id,camera_name,department,license_plate,pts_timestamp_ms,human_time,watchlist_match_flag,associated_fir
CAM-GJ-POL-001,SG Highway - ISKCON Junction Crossroad,Police,GJ01AB1234,10450,2026-09-05T08:11:10.450Z,True,CR-012/2026-SG
CAM-GJ-POL-001,SG Highway - ISKCON Junction Crossroad,Police,GJ01KR5521,11800,2026-09-05T08:11:11.800Z,False,
CAM-GJ-RTO-001,Bhilad RTO Heavy Vehicle Weighbridge,Transport/RTO,GJ05CX9988,24120,2026-09-05T08:11:24.120Z,True,FIR-404/2026-BLD
CAM-GJ-RTC-001,Geeta Mandir Central Bus Terminal Platform 1,GSRTC,GJ27AA0001,45200,2026-09-05T08:11:45.200Z,False,
CAM-GJ-AMC-001,AMC Paldi Smart City Command Feed,Municipal Corp,GJ01CD7744,58900,2026-09-05T08:11:58.900Z,False,
```

---

## Step 3: Python CSV Exporter Implementation

```python
import csv
import io
from datetime import datetime, timezone
from typing import List, Dict, Any

EVALUATION_HEADERS = [
    "camera_id",
    "camera_name",
    "department",
    "license_plate",
    "pts_timestamp_ms",
    "human_time",
    "watchlist_match_flag",
    "associated_fir"
]

def format_human_time(dt: datetime) -> str:
    """Format datetime into ISO 8601 UTC string with millisecond precision."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

def generate_evaluation_csv(sightings: List[Dict[str, Any]], output_filepath: str) -> None:
    """Export sightings list to jury evaluation CSV with strict schema adherence."""
    with open(output_filepath, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=EVALUATION_HEADERS, extrasaction="ignore")
        writer.writeheader()
        
        for record in sightings:
            # Normalize timestamp
            raw_time = record.get("human_time")
            if isinstance(raw_time, datetime):
                human_time_str = format_human_time(raw_time)
            elif isinstance(raw_time, str):
                human_time_str = raw_time
            else:
                human_time_str = format_human_time(datetime.now(timezone.utc))

            # Normalize boolean flag
            match_flag = bool(record.get("watchlist_match_flag", False))
            
            # Normalize FIR string (never None)
            fir_str = str(record.get("associated_fir", "") or "").strip()

            row = {
                "camera_id": str(record.get("camera_id", "")),
                "camera_name": str(record.get("camera_name", "")),
                "department": str(record.get("department", "")),
                "license_plate": str(record.get("license_plate", "")),
                "pts_timestamp_ms": int(record.get("pts_timestamp_ms", 0)),
                "human_time": human_time_str,
                "watchlist_match_flag": "True" if match_flag else "False",
                "associated_fir": fir_str
            }
            writer.writerow(row)
```

---

## Step 4: Python CSV Schema Validator

Use this verification script to guarantee CSV compliance before submitting to evaluation:

```python
import csv
import re
from datetime import datetime
from typing import Tuple, List

EXPECTED_HEADERS = [
    "camera_id",
    "camera_name",
    "department",
    "license_plate",
    "pts_timestamp_ms",
    "human_time",
    "watchlist_match_flag",
    "associated_fir"
]

ISO_8601_REGEX = re.compile(
    r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$"
)

def validate_evaluation_csv(filepath: str) -> Tuple[bool, List[str]]:
    """Validate that the given CSV file strictly satisfies jury criteria.
    
    Returns (is_valid, list_of_errors).
    """
    errors = []
    
    try:
        with open(filepath, mode="r", encoding="utf-8") as f:
            reader = csv.reader(f)
            headers = next(reader, None)
            
            if headers != EXPECTED_HEADERS:
                errors.append(f"Header mismatch!\nExpected: {EXPECTED_HEADERS}\nFound:    {headers}")
                return False, errors
            
            for line_idx, row in enumerate(reader, start=2):
                if len(row) != 8:
                    errors.append(f"Line {line_idx}: Expected 8 columns, got {len(row)}")
                    continue
                
                cam_id, cam_name, dept, plate, pts_ms, human_time, match_flag, fir = row
                
                # Check required non-empty
                if not cam_id: errors.append(f"Line {line_idx}: camera_id cannot be empty")
                if not plate: errors.append(f"Line {line_idx}: license_plate cannot be empty")
                
                # Check pts_timestamp_ms is integer
                try:
                    int(pts_ms)
                except ValueError:
                    errors.append(f"Line {line_idx}: pts_timestamp_ms must be integer, got '{pts_ms}'")
                
                # Check human_time is ISO 8601
                if not ISO_8601_REGEX.match(human_time):
                    errors.append(f"Line {line_idx}: human_time is not valid ISO 8601: '{human_time}'")
                
                # Check watchlist_match_flag is 'True' or 'False'
                if match_flag not in ("True", "False"):
                    errors.append(f"Line {line_idx}: watchlist_match_flag must be 'True' or 'False', got '{match_flag}'")
                
                # If watchlist match is True, associated_fir should ideally not be empty
                if match_flag == "True" and not fir:
                    errors.append(f"Line {line_idx}: watchlist_match_flag is True but associated_fir is empty")

    except Exception as e:
        errors.append(f"Fatal error reading CSV: {str(e)}")
        return False, errors

    return len(errors) == 0, errors
```

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Reordering or Renaming Columns
```python
# ❌ NEVER change column order or casing
fieldnames = ["plate", "camera", "pts_ms", "time", "match", "fir"] # BANNED
```
*Why it fails*: Evaluation automation uses index-based or exact header string parsing. Changing header names or order returns 0 score on automated grading test harnesses.

### ❌ Anti-Pattern 2: Non-ISO Human Timestamp
```python
# ❌ NEVER use locale-dependent time formatting
row["human_time"] = datetime.now().strftime("%d/%m/%Y %I:%M %p") # BANNED: '05/09/2026 01:45 PM'
```
*Why it fails*: Regex parsers expecting ISO 8601 (`YYYY-MM-DDTHH:MM:SS.sssZ`) will reject local date formatting and flag the entire dataset as corrupted.

### ❌ Anti-Pattern 3: Emitting Python `None` or String `"null"`
```python
# ❌ NEVER serialize None into CSV as "None" or "null"
row["associated_fir"] = record.get("fir") # If None, prints "None" into CSV!
```
*Why it fails*: An entry without an FIR must be an empty string `""` so CSV parsers treat it as blank, rather than assuming the vehicle has an active FIR with case number `"None"`.

---

## Validation Test

```bash
python -c "
import csv
import io
import re

headers = ['camera_id', 'camera_name', 'department', 'license_plate', 'pts_timestamp_ms', 'human_time', 'watchlist_match_flag', 'associated_fir']
sample_row = ['CAM-GJ-POL-001', 'SG Highway', 'Police', 'GJ01AB1234', '10450', '2026-09-05T08:11:10.450Z', 'True', 'CR-012/2026-SG']

buffer = io.StringIO()
writer = csv.writer(buffer)
writer.writerow(headers)
writer.writerow(sample_row)

content = buffer.getvalue()
lines = content.strip().split('\r\n') if '\r\n' in content else content.strip().split('\n')

assert len(lines) == 2, 'Should have header and 1 data row'
assert lines[0] == ','.join(headers), 'Headers do not match exact order'
assert re.match(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z$', sample_row[5]), 'Timestamp not ISO 8601'
print('PASS: CSV format validation succeeded.')
"
```
