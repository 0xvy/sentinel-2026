---
name: sentinel-gis-registry
description: Step-by-step implementation guide for Model 1 centralized GIS camera registry across 5 Gujarat departments, health monitoring, Leaflet.js map components, and highway gap analysis.
---

# Sentinel GIS Registry Skill

## Overview
The Model 1 Centralized GIS Camera Registry federates 50+ camera streams across Gujarat state, unifying disparate infrastructure from 5 distinct government departments into a single spatial intelligence layer:
1. **Police**: City traffic junctions, national/state highway checkpoints, inter-state borders.
2. **Transport / RTO**: Automated weighbridges, border checkposts, RTO vehicle testing facilities.
3. **GSRTC (Gujarat State Road Transport Corporation)**: Inter-district bus stations, transit terminals.
4. **Municipal Corporations (AMC / SMC / VMC / RMC)**: Urban command and control centers.
5. **Health Department**: Civil hospital entries, medical college campuses, emergency trauma bays.

All camera metadata is structured in strict conformance with `contracts/camera_registry.json`.

---

## Step 1: Camera Registry Data Contract

Every camera in the registry adheres to the canonical schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CameraRegistryRecord",
  "type": "object",
  "required": [
    "camera_id",
    "camera_name",
    "department",
    "district",
    "latitude",
    "longitude",
    "status",
    "stream_url",
    "fps",
    "resolution",
    "last_ping_ms"
  ],
  "properties": {
    "camera_id": { "type": "string" },
    "camera_name": { "type": "string" },
    "department": { 
      "type": "string",
      "enum": ["Police", "Transport/RTO", "GSRTC", "Municipal Corp", "Health"]
    },
    "district": { "type": "string" },
    "latitude": { "type": "number", "minimum": 20.0, "maximum": 24.8 },
    "longitude": { "type": "number", "minimum": 68.0, "maximum": 74.5 },
    "status": { 
      "type": "string",
      "enum": ["Online", "Degraded", "Offline"]
    },
    "stream_url": { "type": "string", "pattern": "^(rtsp|http|https)://" },
    "fps": { "type": "number" },
    "resolution": { "type": "string" },
    "last_ping_ms": { "type": "integer" }
  }
}
```

---

## Step 2: 10 Representative Gujarat Cameras Dataset

This sample payload covers strategic statewide choke points and multi-department assets:

```json
[
  {
    "camera_id": "CAM-GJ-POL-001",
    "camera_name": "SG Highway - ISKCON Junction Crossroad",
    "department": "Police",
    "district": "Ahmedabad",
    "latitude": 23.0298,
    "longitude": 72.5074,
    "status": "Online",
    "stream_url": "rtsp://sandbox.sentinel.internal:554/live/pol_001",
    "fps": 25.0,
    "resolution": "1920x1080",
    "last_ping_ms": 1725528000000
  },
  {
    "camera_id": "CAM-GJ-POL-002",
    "camera_name": "Shamlaji Inter-State Border Checkpost",
    "department": "Police",
    "district": "Aravalli",
    "latitude": 23.6842,
    "longitude": 73.3853,
    "status": "Online",
    "stream_url": "rtsp://sandbox.sentinel.internal:554/live/pol_002",
    "fps": 25.0,
    "resolution": "1920x1080",
    "last_ping_ms": 1725528000000
  },
  {
    "camera_id": "CAM-GJ-RTO-001",
    "camera_name": "Bhilad RTO Heavy Vehicle Weighbridge",
    "department": "Transport/RTO",
    "district": "Valsad",
    "latitude": 20.2813,
    "longitude": 72.9157,
    "status": "Online",
    "stream_url": "rtsp://sandbox.sentinel.internal:554/live/rto_001",
    "fps": 15.0,
    "resolution": "1920x1080",
    "last_ping_ms": 1725528000000
  },
  {
    "camera_id": "CAM-GJ-RTO-002",
    "camera_name": "Subhash Bridge RTO Automated Track Entry",
    "department": "Transport/RTO",
    "district": "Ahmedabad",
    "latitude": 23.0645,
    "longitude": 72.5831,
    "status": "Degraded",
    "stream_url": "rtsp://sandbox.sentinel.internal:554/live/rto_002",
    "fps": 8.0,
    "resolution": "1280x720",
    "last_ping_ms": 1725527950000
  },
  {
    "camera_id": "CAM-GJ-RTC-001",
    "camera_name": "Geeta Mandir Central Bus Terminal Platform 1",
    "department": "GSRTC",
    "district": "Ahmedabad",
    "latitude": 23.0134,
    "longitude": 72.5891,
    "status": "Online",
    "stream_url": "rtsp://sandbox.sentinel.internal:554/live/rt_001",
    "fps": 20.0,
    "resolution": "1920x1080",
    "last_ping_ms": 1725528000000
  },
  {
    "camera_id": "CAM-GJ-RTC-002",
    "camera_name": "Vadodara Central GSRTC Bus Stand Entry",
    "department": "GSRTC",
    "district": "Vadodara",
    "latitude": 22.3117,
    "longitude": 73.1812,
    "status": "Online",
    "stream_url": "rtsp://sandbox.sentinel.internal:554/live/rt_002",
    "fps": 20.0,
    "resolution": "1920x1080",
    "last_ping_ms": 1725528000000
  },
  {
    "camera_id": "CAM-GJ-AMC-001",
    "camera_name": "AMC Paldi Smart City Command Feed",
    "department": "Municipal Corp",
    "district": "Ahmedabad",
    "latitude": 23.0142,
    "longitude": 72.5637,
    "status": "Online",
    "stream_url": "rtsp://sandbox.sentinel.internal:554/live/amc_001",
    "fps": 30.0,
    "resolution": "1920x1080",
    "last_ping_ms": 1725528000000
  },
  {
    "camera_id": "CAM-GJ-SMC-001",
    "camera_name": "SMC Ring Road - Majura Gate Junction",
    "department": "Municipal Corp",
    "district": "Surat",
    "latitude": 21.1804,
    "longitude": 72.8211,
    "status": "Online",
    "stream_url": "rtsp://sandbox.sentinel.internal:554/live/smc_001",
    "fps": 25.0,
    "resolution": "1920x1080",
    "last_ping_ms": 1725528000000
  },
  {
    "camera_id": "CAM-GJ-HLT-001",
    "camera_name": "Asarwa Civil Hospital Emergency Trauma Bay",
    "department": "Health",
    "district": "Ahmedabad",
    "latitude": 23.0531,
    "longitude": 72.6042,
    "status": "Online",
    "stream_url": "rtsp://sandbox.sentinel.internal:554/live/hlt_001",
    "fps": 25.0,
    "resolution": "1920x1080",
    "last_ping_ms": 1725528000000
  },
  {
    "camera_id": "CAM-GJ-POL-003",
    "camera_name": "Khavda Border Post - Rann of Kutch North Gate",
    "department": "Police",
    "district": "Kutch",
    "latitude": 23.8396,
    "longitude": 69.7225,
    "status": "Offline",
    "stream_url": "rtsp://sandbox.sentinel.internal:554/live/pol_003",
    "fps": 0.0,
    "resolution": "1920x1080",
    "last_ping_ms": 1725520000000
  }
]
```

---

## Step 3: Camera Health Monitor Service

A backend service continuously evaluates heartbeat status:
- **`Online`**: Ping response received within last 30 seconds with stable frame delivery.
- **`Degraded`**: Ping received but framerate dropped below 50% of nominal or packet loss detected.
- **`Offline`**: No heartbeat or RTSP packet received in >60 seconds.

```python
import time
from typing import Dict, Any

def evaluate_camera_health(camera: Dict[str, Any], current_time_ms: int) -> str:
    """Evaluate camera health state based on ping delta and stream metrics."""
    last_ping = camera.get("last_ping_ms", 0)
    delta_s = (current_time_ms - last_ping) / 1000.0
    
    if delta_s > 60.0:
        return "Offline"
    elif delta_s > 30.0 or camera.get("fps", 0) < 10.0:
        return "Degraded"
    else:
        return "Online"
```

---

## Step 4: React Leaflet GIS Component with Layer Filtering

```tsx
import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface CameraRecord {
  camera_id: string;
  camera_name: string;
  department: 'Police' | 'Transport/RTO' | 'GSRTC' | 'Municipal Corp' | 'Health';
  district: string;
  latitude: number;
  longitude: number;
  status: 'Online' | 'Degraded' | 'Offline';
  stream_url: string;
}

interface GapSegment {
  name: string;
  coordinates: [number, number][];
  distance_km: number;
}

const DEPARTMENT_COLORS: Record<string, string> = {
  'Police': '#3b82f6',         // Blue
  'Transport/RTO': '#f59e0b',  // Amber
  'GSRTC': '#10b981',          // Emerald Green
  'Municipal Corp': '#8b5cf6', // Violet
  'Health': '#ef4444',         // Red
};

// Known unmonitored highway gaps for tactical overlay
const HIGHWAY_GAPS: GapSegment[] = [
  {
    name: 'NH-48 Bharuch-Ankleshwar Bridge Corridor Blindspot',
    coordinates: [[21.7246, 72.9822], [21.6264, 73.0039]],
    distance_km: 14.2
  },
  {
    name: 'NE-1 Expressway Anand Bypass Gap',
    coordinates: [[22.5645, 72.9288], [22.4211, 72.9867]],
    distance_km: 18.5
  }
];

export const GujaratGISMap: React.FC<{ cameras: CameraRecord[] }> = ({ cameras }) => {
  const [activeDepts, setActiveDepts] = useState<Set<string>>(
    new Set(['Police', 'Transport/RTO', 'GSRTC', 'Municipal Corp', 'Health'])
  );
  const [showGaps, setShowGaps] = useState<boolean>(true);

  const toggleDept = (dept: string) => {
    setActiveDepts(prev => {
      const next = new Set(prev);
      if (next.has(dept)) next.delete(dept);
      else next.add(dept);
      return next;
    });
  };

  const filteredCameras = useMemo(() => {
    return cameras.filter(c => activeDepts.has(c.department));
  }, [cameras, activeDepts]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#0a0f1d' }}>
      {/* Tactical Department Filter Control Bar */}
      <div style={{
        position: 'absolute', top: 16, left: 60, zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.90)', backdropFilter: 'blur(8px)',
        padding: '12px 18px', borderRadius: 8, border: '1px solid #1e293b',
        color: '#f8fafc', display: 'flex', gap: 10, alignItems: 'center'
      }}>
        <span style={{ fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>
          Departments:
        </span>
        {Object.keys(DEPARTMENT_COLORS).map(dept => (
          <button
            key={dept}
            onClick={() => toggleDept(dept)}
            style={{
              background: activeDepts.has(dept) ? DEPARTMENT_COLORS[dept] : '#334155',
              color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4,
              cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.15s ease'
            }}
          >
            {dept}
          </button>
        ))}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginLeft: 8 }}>
          <input 
            type="checkbox" 
            checked={showGaps} 
            onChange={(e) => setShowGaps(e.target.checked)} 
          />
          Gap Analysis Overlay
        </label>
      </div>

      {/* Primary Map View Centered on Gujarat (22.2587° N, 71.1924° E) */}
      <MapContainer
        center={[22.5000, 71.8000]}
        zoom={8}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Camera Markers */}
        {filteredCameras.map(cam => {
          const color = DEPARTMENT_COLORS[cam.department] || '#94a3b8';
          const stroke = cam.status === 'Online' ? '#10b981' : cam.status === 'Degraded' ? '#f59e0b' : '#ef4444';
          return (
            <CircleMarker
              key={cam.camera_id}
              center={[cam.latitude, cam.longitude]}
              radius={7}
              pathOptions={{ fillColor: color, fillOpacity: 0.85, color: stroke, weight: 2 }}
            >
              <Popup>
                <div style={{ color: '#0f172a', fontSize: 13, lineHeight: 1.5 }}>
                  <strong style={{ fontSize: 14 }}>{cam.camera_name}</strong><br />
                  <b>ID:</b> {cam.camera_id}<br />
                  <b>Department:</b> {cam.department}<br />
                  <b>District:</b> {cam.district}<br />
                  <b>Status:</b> <span style={{ fontWeight: 600 }}>{cam.status}</span><br />
                  <b>Stream:</b> <code>{cam.stream_url}</code>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Highway Gap Analysis Overlay */}
        {showGaps && HIGHWAY_GAPS.map(gap => (
          <Polyline
            key={gap.name}
            positions={gap.coordinates}
            pathOptions={{ color: '#ef4444', weight: 4, dashArray: '8, 8', opacity: 0.9 }}
          >
            <Popup>
              <div style={{ color: '#0f172a' }}>
                <strong>Surveillance Gap Warning</strong><br />
                {gap.name}<br />
                <b>Unmonitored Span:</b> {gap.distance_km} km
              </div>
            </Popup>
          </Polyline>
        ))}
      </MapContainer>
    </div>
  );
};
```

---

## Step 5: Gap Analysis Spatial Algorithm

To detect unmonitored highway segments where camera spacing exceeds 15 km:

```python
import math
from typing import List, Tuple, Dict

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great circle distance between two points in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 + 
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * 
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def detect_corridor_gaps(
    corridor_coords: List[Tuple[float, float]], 
    cameras: List[Dict[str, float]], 
    threshold_km: float = 15.0
) -> List[Dict[str, Any]]:
    """Scan route waypoints for segments farther than threshold_km from nearest camera."""
    gaps = []
    for i in range(len(corridor_coords) - 1):
        pt_a = corridor_coords[i]
        pt_b = corridor_coords[i+1]
        mid_lat = (pt_a[0] + pt_b[0]) / 2.0
        mid_lon = (pt_a[1] + pt_b[1]) / 2.0
        
        # Find nearest camera to midpoint
        min_dist = min(
            haversine_km(mid_lat, mid_lon, cam["latitude"], cam["longitude"])
            for cam in cameras
        ) if cameras else float("inf")
        
        if min_dist > threshold_km:
            gaps.append({
                "segment_start": pt_a,
                "segment_end": pt_b,
                "distance_to_nearest_cam_km": round(min_dist, 2)
            })
    return gaps
```

---

## Anti-Patterns

### ❌ Anti-Pattern 1: Hardcoding Map Markers as Fixed HTML
```tsx
// ❌ NEVER hardcode camera elements in JSX
<Marker position={[23.0298, 72.5074]}><Popup>Cam 1</Popup></Marker>
```
*Why it fails*: Model 1 requires dynamic synchronization with the backend camera registry (`GET /api/cameras`). Adding or disabling cameras must automatically update the GIS canvas.

### ❌ Anti-Pattern 2: Ignoring Health State in Map Styling
```tsx
// ❌ NEVER render all cameras with identical color/opacity
<Marker position={[cam.lat, cam.lng]} icon={defaultIcon} />
```
*Why it fails*: Operators cannot distinguish between functioning feeds and failed/offline sensors. Offline cameras must show visible degraded/offline indicators.

---

## Validation Test

```bash
python -c "
import json

sample_camera = {
    'camera_id': 'CAM-GJ-POL-001',
    'camera_name': 'SG Highway - ISKCON Junction',
    'department': 'Police',
    'district': 'Ahmedabad',
    'latitude': 23.0298,
    'longitude': 72.5074,
    'status': 'Online',
    'stream_url': 'rtsp://sandbox.sentinel.internal:554/live/pol_001',
    'fps': 25.0,
    'resolution': '1920x1080',
    'last_ping_ms': 1725528000000
}

# Assert required fields and types
required = ['camera_id', 'camera_name', 'department', 'district', 'latitude', 'longitude', 'status', 'stream_url', 'fps', 'resolution', 'last_ping_ms']
for field in required:
    assert field in sample_camera, f'Missing required field: {field}'

assert 20.0 <= sample_camera['latitude'] <= 24.8, 'Latitude out of Gujarat bounds'
assert 68.0 <= sample_camera['longitude'] <= 74.5, 'Longitude out of Gujarat bounds'
assert sample_camera['department'] in ['Police', 'Transport/RTO', 'GSRTC', 'Municipal Corp', 'Health']
print('PASS: Camera registry schema validation succeeded.')
"
```
