"""
SENTINEL 2026 — Kinematic Geodesic Sanity Checker
===================================================
Enforces the laws of physics on suspect trajectory routes:
1. Haversine great-circle distance between consecutive sightings (WGS-84 R = 6371.0088 km)
2. Velocity <= 160 km/h physical roadway upper bound (rules out GPS teleportation)
3. Strict handling of 12-hour video loop discontinuity (Commandment 6)
"""

import math
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple


class KinematicSanityChecker:
    EARTH_RADIUS_KM = 6371.0088
    MAX_SPEED_KMH = 160.0

    @classmethod
    def haversine_distance_km(
        cls, lat1: float, lon1: float, lat2: float, lon2: float
    ) -> float:
        """
        Calculates great-circle distance between two Gujarat coordinates in kilometers.
        Formula:
            a = sin^2(dlat/2) + cos(lat1)*cos(lat2)*sin^2(dlon/2)
            c = 2 * atan2(sqrt(a), sqrt(1-a))
            d = R * c
        """
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (
            math.sin(delta_phi / 2.0) ** 2
            + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        )
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return cls.EARTH_RADIUS_KM * c

    @classmethod
    def parse_iso_seconds(cls, iso_str: str) -> float:
        """Parses ISO-8601 timestamp string to POSIX epoch seconds."""
        cleaned = iso_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(cleaned)
        return dt.timestamp()

    @classmethod
    def validate_trajectory(
        cls, sightings: List[Dict[str, Any]]
    ) -> Tuple[bool, List[str]]:
        """
        Validates an array of vehicle sightings for physical kinematic plausibility.
        Each sighting must contain: 'lat', 'lng', and either 'timestamp_iso' or 'pts_timestamp_ms'.
        Returns (is_valid, list_of_error_strings).
        """
        errors: List[str] = []
        if not sightings or len(sightings) < 2:
            return True, errors

        for i in range(1, len(sightings)):
            s_prev = sightings[i - 1]
            s_curr = sightings[i]

            lat1, lon1 = float(s_prev["lat"]), float(s_prev["lng"])
            lat2, lon2 = float(s_curr["lat"]), float(s_curr["lng"])

            cam1 = s_prev.get("camera_id", "CAM_PREV")
            cam2 = s_curr.get("camera_id", "CAM_CURR")

            pts1 = s_prev.get("pts_timestamp_ms")
            pts2 = s_curr.get("pts_timestamp_ms")

            # 1. Check for 12-hour video loop discontinuity on PTS
            if pts1 is not None and pts2 is not None:
                pts_delta = pts2 - pts1
                # Negative jump (e.g. 12h loop reset 43,200,000 -> 0) or massive intra-camera skip
                if pts_delta < 0 or (cam1 == cam2 and pts_delta > 5000):
                    # Discontinuity detected: reset baseline cleanly without throwing (Commandment 6)
                    continue

            # 2. Determine elapsed time in seconds
            iso1 = s_prev.get("timestamp_iso")
            iso2 = s_curr.get("timestamp_iso")

            if iso1 and iso2:
                t1 = cls.parse_iso_seconds(iso1)
                t2 = cls.parse_iso_seconds(iso2)
                elapsed_sec = t2 - t1
            elif pts1 is not None and pts2 is not None:
                elapsed_sec = (pts2 - pts1) / 1000.0
            else:
                elapsed_sec = 0.0

            # 3. Compute spherical distance
            dist_km = cls.haversine_distance_km(lat1, lon1, lat2, lon2)

            # Stationary vehicle at same checkpoint
            if dist_km == 0.0:
                continue

            # Check zero or negative time
            if elapsed_sec <= 0.0:
                errors.append(
                    f"Step {i}: Non-positive elapsed time ({elapsed_sec:.2f}s) between "
                    f"different locations {cam1} ({lat1},{lon1}) and {cam2} ({lat2},{lon2})! Distance: {dist_km:.2f} km"
                )
                continue

            # 4. Compute velocity in km/h
            velocity_kmh = dist_km / (elapsed_sec / 3600.0)

            # 5. Velocity upper bound assertion
            if velocity_kmh > cls.MAX_SPEED_KMH:
                errors.append(
                    f"Step {i}: Implausible velocity {velocity_kmh:.1f} km/h between "
                    f"{cam1} and {cam2} ({dist_km:.2f} km in {elapsed_sec:.1f}s). "
                    f"Max allowed: {cls.MAX_SPEED_KMH} km/h"
                )

        return len(errors) == 0, errors
