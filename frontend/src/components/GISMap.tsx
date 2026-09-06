import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Camera, Sighting, TrajectoryResponse, ThreatLevel } from '../types';

interface GISMapProps {
  cameras: Camera[];
  selectedDepartments: string[];
  activeTrajectory: TrajectoryResponse | null;
  selectedSighting: Sighting | null;
  flyToLocation: { lat: number; lng: number; zoom?: number } | null;
  onSelectCamera?: (camera: Camera) => void;
  onSelectSighting?: (sighting: Sighting) => void;
}

// Map controller to execute programmatic flyTo operations
const MapController: React.FC<{
  flyToLocation: { lat: number; lng: number; zoom?: number } | null;
}> = ({ flyToLocation }) => {
  const map = useMap();

  useEffect(() => {
    if (flyToLocation && flyToLocation.lat && flyToLocation.lng) {
      map.flyTo([flyToLocation.lat, flyToLocation.lng], flyToLocation.zoom || 14, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  }, [flyToLocation, map]);

  return null;
};

// Department SVG Icon and Color mappings
const DEPT_ICONS: Record<string, { color: string; svg: string }> = {
  Police: {
    color: '#3b82f6',
    svg: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  },
  'Transport (RTO)': {
    color: '#8b5cf6',
    svg: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`,
  },
  GSRTC: {
    color: '#06b6d4',
    svg: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 11h18"/><circle cx="7.5" cy="15" r="1.5"/><circle cx="16.5" cy="15" r="1.5"/><path d="M5 18v2"/><path d="M19 18v2"/></svg>`,
  },
  'Municipal Corp': {
    color: '#f59e0b',
    svg: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9h1"/><path d="M9 13h1"/><path d="M9 17h1"/></svg>`,
  },
  Health: {
    color: '#10b981',
    svg: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
  },
  Panchayat: {
    color: '#f97316',
    svg: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L7 10h3l-4 7h6v5h2v-5h6l-4-7h3z"/></svg>`,
  },
  'Food & Civil Supplies': {
    color: '#ec4899',
    svg: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,
  },
  Private: {
    color: '#94a3b8',
    svg: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`,
  },
};

// Create tactical camera DivIcon with distinct department SVGs and status dot
function createCameraIcon(camera: Camera) {
  let statusColor = '#22c55e'; // Online
  let pulseHtml = '';

  if (camera.status === 'Offline') {
    statusColor = '#ef4444';
  } else if (camera.status === 'Degraded') {
    statusColor = '#f59e0b';
  } else {
    pulseHtml = `<span style="position: absolute; top: -1px; right: -1px; width: 7px; height: 7px; border-radius: 50%; background-color: #22c55e; opacity: 0.75;" class="animate-ping"></span>`;
  }

  const deptMeta = DEPT_ICONS[camera.department] || DEPT_ICONS.Police;

  return L.divIcon({
    className: 'custom-camera-marker',
    html: `
      <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
        <div style="width: 24px; height: 24px; border-radius: 6px; background-color: #070b14; border: 1.5px solid ${deptMeta.color}; color: ${deptMeta.color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.8), 0 0 4px ${deptMeta.color}40; z-index: 2;">
          ${deptMeta.svg}
        </div>
        ${pulseHtml}
        <span style="position: absolute; top: -1px; right: -1px; width: 6px; height: 6px; border-radius: 50%; background-color: ${statusColor}; border: 1px solid #070b14; z-index: 4;"></span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

// Create tactical waypoint DivIcon with numbered milestones and critical halo glow
function createWaypointIcon(
  _sighting: Sighting,
  index: number,
  isLatest: boolean,
  threatLevel: ThreatLevel
) {
  const isCritical = threatLevel === 'CRITICAL';
  const color = isCritical ? '#ef4444' : threatLevel === 'HIGH' ? '#f59e0b' : '#22c55e';
  const haloBoxShadow = isCritical
    ? 'box-shadow: 0 0 12px rgba(239, 68, 68, 0.8), 0 0 24px rgba(239, 68, 68, 0.4);'
    : `box-shadow: 0 0 10px ${color}80;`;

  return L.divIcon({
    className: 'custom-waypoint-marker',
    html: `
      <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
        ${
          isLatest || isCritical
            ? `<span style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background-color: ${color}; opacity: 0.4;" class="animate-ping"></span>`
            : ''
        }
        <div style="width: 26px; height: 26px; border-radius: 50%; background-color: ${color}; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; ${haloBoxShadow} z-index: 5;">
          <span style="font-size: 11px; font-family: 'JetBrains Mono', monospace; font-weight: 900; color: #070b14; line-height: 1;">
            ${index + 1}
          </span>
        </div>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });
}

export const GISMap: React.FC<GISMapProps> = ({
  cameras,
  selectedDepartments,
  activeTrajectory,
  selectedSighting,
  flyToLocation,
  onSelectCamera,
  onSelectSighting,
}) => {
  // Center of Gujarat (near Gandhinagar/Ahmedabad)
  const defaultCenter: [number, number] = [22.65, 71.85];
  const defaultZoom = 7;

  // Filter cameras based on selected departments
  const visibleCameras = useMemo(() => {
    return cameras.filter((cam) => selectedDepartments.includes(cam.department));
  }, [cameras, selectedDepartments]);

  // Trajectory polyline coordinates
  const trajectoryCoordinates = useMemo(() => {
    if (!activeTrajectory || !activeTrajectory.sightings) return [];
    return activeTrajectory.sightings.map((s) => [s.lat, s.lng] as [number, number]);
  }, [activeTrajectory]);

  // Color for the trajectory line
  const trajectoryColor = useMemo(() => {
    if (!activeTrajectory) return '#06b6d4';
    const threat = activeTrajectory.watchlist_status.threat_level;
    if (threat === 'CRITICAL') return '#ef4444';
    if (threat === 'HIGH') return '#f59e0b';
    return '#22c55e';
  }, [activeTrajectory]);

  return (
    <div className="relative w-full h-full bg-[#0a0f1d] rounded-lg overflow-hidden border border-[#1f2937] shadow-2xl">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full"
        zoomControl={false}
      >
        {/* Dark Matter tiles from CartoDB */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &bull; Gujarat Police GIS'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {/* Map Controller for programmatic flyTo */}
        <MapController flyToLocation={flyToLocation} />

        {/* 50 Camera Markers across Gujarat */}
        {visibleCameras.map((camera) => (
          <Marker
            key={camera.camera_id}
            position={[camera.lat, camera.lng]}
            icon={createCameraIcon(camera)}
            eventHandlers={{
              click: () => onSelectCamera && onSelectCamera(camera),
            }}
          >
            <Popup>
              <div className="text-xs min-w-[220px]">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-gray-700">
                  <span className="font-mono text-cyan-400 font-bold text-[11px]">
                    {camera.camera_id}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      camera.status === 'Online'
                        ? 'bg-emerald-950 text-emerald-400'
                        : camera.status === 'Offline'
                        ? 'bg-rose-950 text-rose-400'
                        : 'bg-amber-950 text-amber-400'
                    }`}
                  >
                    {camera.status}
                  </span>
                </div>

                <div className="text-gray-100 font-semibold mb-1 text-[11px]">
                  {camera.camera_name}
                </div>

                <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-400 mb-2">
                  <div>
                    <span className="text-gray-500">Dept:</span> {camera.department}
                  </div>
                  <div>
                    <span className="text-gray-500">District:</span> {camera.district}
                  </div>
                  <div>
                    <span className="text-gray-500">VMS:</span> {camera.vms_vendor || 'Milestone'}
                  </div>
                  <div>
                    <span className="text-gray-500">Res:</span> {camera.resolution || '1080p'}
                  </div>
                </div>

                {camera.stream_url && (
                  <div className="p-1.5 bg-black/60 rounded text-[9px] font-mono text-cyan-300 truncate">
                    RTSP: {camera.stream_url}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Trajectory Polyline overlay with dashArray animation */}
        {trajectoryCoordinates.length > 1 && (
          <Polyline
            positions={trajectoryCoordinates}
            pathOptions={{
              color: trajectoryColor,
              weight: 4,
              opacity: 0.95,
              dashArray: '10, 10',
              className: 'leaflet-animated-polyline',
              lineJoin: 'round',
            }}
          />
        )}

        {/* Timestamped Waypoints for active vehicle trajectory */}
        {activeTrajectory &&
          activeTrajectory.sightings.map((sighting, idx) => {
            const isLatest = idx === activeTrajectory.sightings.length - 1;
            const isSelected = selectedSighting?.sighting_id === sighting.sighting_id;

            return (
              <Marker
                key={sighting.sighting_id}
                position={[sighting.lat, sighting.lng]}
                icon={createWaypointIcon(
                  sighting,
                  idx,
                  isLatest || isSelected,
                  activeTrajectory.watchlist_status.threat_level
                )}
                eventHandlers={{
                  click: () => onSelectSighting && onSelectSighting(sighting),
                }}
              >
                <Popup>
                  <div className="text-xs min-w-[240px]">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-gray-700">
                      <span className="font-plate text-cyan-400 font-extrabold text-sm">
                        {activeTrajectory.plate_number}
                      </span>
                      <span className="font-mono text-xs font-bold text-gray-300">
                        Waypoint #{idx + 1}
                      </span>
                    </div>

                    <div className="text-gray-100 font-semibold mb-1 text-[11px]">
                      {sighting.camera_name}
                    </div>

                    <div className="text-[10px] text-gray-400 space-y-0.5 mb-2 font-mono">
                      <div>Time: {new Date(sighting.timestamp_iso).toLocaleTimeString()}</div>
                      <div>Heading: {sighting.direction_of_travel} &bull; Conf: {(sighting.confidence * 100).toFixed(1)}%</div>
                      <div>Dept: {sighting.department}</div>
                    </div>

                    <div className="pt-1.5 border-t border-gray-700/80 text-[9px] font-mono text-cyan-400 truncate">
                      SHA: {sighting.snapshot_hash_sha256}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* Tactical Map Overlay HUD */}
      <div className="absolute top-3 left-3 pointer-events-none z-[1000] flex flex-col gap-2">
        <div className="bg-[#070b14]/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700/60 text-xs font-mono text-slate-300 shadow-xl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="text-cyan-400 font-bold tracking-wider">GUJARAT POLICE GIS GRID</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {visibleCameras.length} of {cameras.length} Feeds Monitored
          </div>
        </div>

        {activeTrajectory && (
          <div className="bg-[#070b14]/90 backdrop-blur-md px-3 py-2 rounded-lg border border-cyan-500/40 text-xs text-slate-200 shadow-xl">
            <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">
              Active Reconnaissance
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-plate text-cyan-400 font-extrabold tracking-wider text-sm">
                {activeTrajectory.plate_number}
              </span>
              <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">
                {activeTrajectory.sightings.length} waypoints
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
