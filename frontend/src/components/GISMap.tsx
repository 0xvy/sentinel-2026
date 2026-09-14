import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Layers, Maximize2, LocateFixed } from 'lucide-react';
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

// Map controller to execute programmatic flyTo operations & auto-fit statewide trajectory
const MapController: React.FC<{
  flyToLocation: { lat: number; lng: number; zoom?: number } | null;
  trajectoryCoordinates: [number, number][];
}> = ({ flyToLocation, trajectoryCoordinates }) => {
  const map = useMap();

  useEffect(() => {
    // If trajectory coordinates exist (2 or more waypoints), fit the full statewide corridor
    if (trajectoryCoordinates && trajectoryCoordinates.length > 1) {
      const bounds = L.latLngBounds(trajectoryCoordinates);
      map.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 11,
        animate: true,
        duration: 1.2,
      });
      return;
    }
    // Default view: Center on Gujarat
    if (!flyToLocation) {
      map.setView([22.8, 71.8], 8);
    }
  }, [trajectoryCoordinates, map]);

  useEffect(() => {
    if (flyToLocation && flyToLocation.lat && flyToLocation.lng) {
      map.flyTo([flyToLocation.lat, flyToLocation.lng], Math.min(flyToLocation.zoom || 12, 13), {
        duration: 1.2,
      });
    }
  }, [flyToLocation, map]);

  return null;
};

// Sleek, minimal circular camera node: 14px clean disc with colored jewel dot
function createCameraIcon(camera: Camera, isTargetLocked: boolean) {
  const deptColors: Record<string, string> = {
    Police: '#3b82f6',
    'Transport (RTO)': '#f97316',
    GSRTC: '#10b981',
    'Municipal Corp': '#06b6d4',
    Health: '#ec4899',
    Panchayat: '#8b5cf6',
    'Food & Civil Supplies': '#eab308',
    Private: '#64748b',
  };
  const color = deptColors[camera.department] || '#3b82f6';

  if (isTargetLocked) {
    return L.divIcon({
      className: 'custom-camera-marker-locked',
      html: `
        <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(239, 68, 68, 0.3); border: 1.5px solid #ef4444; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 16px; height: 16px; border-radius: 50%; background: #0f172a; border: 2px solid #ef4444; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(239, 68, 68, 0.8);">
            <div style="width: 6px; height: 6px; border-radius: 50%; background: #ef4444;"></div>
          </div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -14],
    });
  }

  return L.divIcon({
    className: 'custom-camera-marker',
    html: `
      <div style="position: relative; width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="width: 14px; height: 14px; border-radius: 50%; background: #0f172a; border: 1.5px solid ${color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 5px ${color}80, 0 1px 3px rgba(0,0,0,0.8);">
          <div style="width: 4px; height: 4px; border-radius: 50%; background: ${color};"></div>
        </div>
      </div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

// Clean vehicle waypoint icon: 18px numbered disc along the route, with distinct target disc at the end
function createWaypointIcon(
  sighting: Sighting,
  index: number,
  isLatest: boolean,
  threatLevel: ThreatLevel
) {
  const badgeColor = threatLevel === 'CRITICAL' ? '#ef4444' : threatLevel === 'HIGH' ? '#f59e0b' : '#10b981';
  const timeStr = sighting.timestamp_iso
    ? new Date(sighting.timestamp_iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : `${index + 1}:00`;

  if (isLatest) {
    return L.divIcon({
      className: 'custom-waypoint-marker-latest',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="position: absolute; top: -3px; width: 30px; height: 30px; border-radius: 50%; background: rgba(239, 68, 68, 0.25); border: 1.5px solid ${badgeColor}; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 24px; height: 24px; border-radius: 50%; background: #070b14; border: 2px solid ${badgeColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px ${badgeColor}cc;">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="${badgeColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.1 2 11.5 2 12v4c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/>
              <path d="M9 17h6"/>
              <circle cx="17" cy="17" r="2"/>
            </svg>
          </div>
          <div style="margin-top: 2px; background: rgba(7, 11, 20, 0.95); border: 1px solid ${badgeColor}; border-radius: 3px; padding: 0.5px 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.8); display: flex; align-items: center; gap: 3px; white-space: nowrap;">
            <span style="font-size: 9px; font-family: monospace; font-weight: 800; color: #ffffff;">LATEST</span>
            <span style="font-size: 8px; font-family: monospace; color: #cbd5e1;">${timeStr}</span>
          </div>
        </div>
      `,
      iconSize: [50, 42],
      iconAnchor: [25, 12],
      popupAnchor: [0, -14],
    });
  }

  // Intermediate Waypoint: A clean numbered circle along the route
  const isStart = index === 0;
  const bg = isStart ? '#10b981' : '#ef4444';

  return L.divIcon({
    className: 'custom-waypoint-marker',
    html: `
      <div style="position: relative; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
        <div style="width: 18px; height: 18px; border-radius: 50%; background: ${bg}; border: 1.5px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 8px ${bg}99, 0 1px 3px rgba(0,0,0,0.8);">
          <span style="font-size: 9px; font-family: monospace; font-weight: 800; color: #ffffff; line-height: 1;">
            ${isStart ? 'A' : index + 1}
          </span>
        </div>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
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
  // Center of Gujarat
  const defaultCenter: [number, number] = [22.65, 71.85];
  const defaultZoom = 8;

  // Filter cameras based on selected departments
  const visibleCameras = useMemo(() => {
    return cameras.filter((cam) => selectedDepartments.includes(cam.department));
  }, [cameras, selectedDepartments]);

  // Trajectory polyline coordinates (chronologically sorted and deduplicated)
  const trajectoryCoordinates = useMemo(() => {
    if (!activeTrajectory || !activeTrajectory.sightings) return [];
    const sorted = [...activeTrajectory.sightings].sort(
      (a, b) => new Date(a.timestamp_iso || 0).getTime() - new Date(b.timestamp_iso || 0).getTime()
    );
    const deduped: [number, number][] = [];
    for (const s of sorted) {
      const coord: [number, number] = [s.lat, s.lng];
      const last = deduped[deduped.length - 1];
      if (!last || last[0] !== coord[0] || last[1] !== coord[1]) {
        deduped.push(coord);
      }
    }
    return deduped;
  }, [activeTrajectory]);

  const isCam04Locked = activeTrajectory?.plate_number === 'GJ01ER8842';

  return (
    <div className="relative w-full h-full bg-[#070b14] rounded-lg overflow-hidden border border-slate-800 shadow-2xl">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full"
        zoomControl={false}
      >
        {/* Esri World Dark Gray Canvas: High-tech dark tactical basemap (Zero Watermarks, No API Key) */}
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a> &bull; Gujarat Police'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
        />
        {/* Esri World Dark Gray Reference: Clean city and highway labels */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
          maxZoom={16}
        />

        {/* Map Controller for programmatic flyTo & statewide trajectory auto-fitting */}
        <MapController flyToLocation={flyToLocation} trajectoryCoordinates={trajectoryCoordinates} />

        {/* 50 Camera Markers across Gujarat: Clean 14px nodes with tooltips on hover */}
        {visibleCameras.map((camera) => {
          const isTargetNode = isCam04Locked && (camera.camera_id === 'CAM-POL-AHM-04' || camera.camera_id === 'cam04');
          return (
            <Marker
              key={camera.camera_id}
              position={[camera.lat, camera.lng]}
              icon={createCameraIcon(camera, isTargetNode)}
              eventHandlers={{
                click: () => {
                  onSelectCamera && onSelectCamera(camera);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                <div className="font-mono text-xs">
                  <span className="font-bold text-white">{camera.camera_name}</span>
                  <div className="text-slate-400 text-[10px]">
                    {camera.department} • {camera.camera_id} • <span className="text-emerald-400">{camera.status}</span>
                  </div>
                </div>
              </Tooltip>

              <Popup>
                <div className="text-xs min-w-[220px] p-2.5 font-mono">
                  <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-700">
                    <span className="text-cyan-400 font-bold">
                      {camera.camera_id}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        camera.status === 'Online'
                          ? 'bg-emerald-950 text-emerald-400'
                          : 'bg-rose-950 text-rose-400'
                      }`}
                    >
                      {camera.status}
                    </span>
                  </div>

                  <div className="text-white font-semibold mb-1 text-[11px]">
                    {camera.camera_name}
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 mb-2">
                    <div><span className="text-slate-500">Dept:</span> {camera.department}</div>
                    <div><span className="text-slate-500">District:</span> {camera.district}</div>
                    <div><span className="text-slate-500">VMS:</span> {camera.vms_vendor || 'Milestone'}</div>
                    <div><span className="text-slate-500">Res:</span> {camera.resolution || '1080p'}</div>
                  </div>

                  {camera.stream_url && (
                    <div className="p-1 bg-black/60 rounded text-[9px] text-cyan-300 truncate">
                      {camera.stream_url}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Trajectory Polyline: Soft Outer Ambient Glow */}
        {trajectoryCoordinates.length > 1 && (
          <Polyline
            positions={trajectoryCoordinates}
            pathOptions={{
              color: '#ef4444',
              weight: 6,
              opacity: 0.35,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {/* Trajectory Polyline: Core Crisp Route Line */}
        {trajectoryCoordinates.length > 1 && (
          <Polyline
            positions={trajectoryCoordinates}
            pathOptions={{
              color: '#ff4d4f',
              weight: 3,
              opacity: 0.95,
              lineCap: 'round',
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
                  activeTrajectory.watchlist_status?.threat_level || 'CRITICAL'
                )}
                eventHandlers={{
                  click: () => onSelectSighting && onSelectSighting(sighting),
                }}
              >
                <Tooltip direction="top" offset={[0, -12]} opacity={1}>
                  <div className="font-mono text-xs">
                    <span className="text-cyan-400 font-bold">Waypoint #{idx + 1}</span>: <span className="text-white font-semibold">{sighting.camera_name}</span>
                    <div className="text-slate-400 text-[10px] mt-0.5">
                      {new Date(sighting.timestamp_iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Heading: {sighting.direction_of_travel}
                    </div>
                  </div>
                </Tooltip>

                <Popup>
                  <div className="bg-[#0c1322] text-white p-2.5 font-mono text-xs rounded-lg border border-red-500/50 shadow-xl min-w-[220px]">
                    <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-gray-700">
                      <span className="text-red-400 font-bold">
                        WAYPOINT #{idx + 1}: {sighting.camera_id}
                      </span>
                      {isLatest && (
                        <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.2 rounded font-bold uppercase">
                          LATEST
                        </span>
                      )}
                    </div>
                    <div className="text-slate-200 font-semibold text-[11px] mb-1">
                      {sighting.camera_name}
                    </div>
                    <div className="text-[10px] text-slate-400 space-y-0.5 mb-1.5">
                      <div>Time: <span className="text-white font-bold">{new Date(sighting.timestamp_iso).toLocaleTimeString()}</span></div>
                      <div>Heading: <span className="text-cyan-300">{sighting.direction_of_travel}</span> • Conf: <span className="text-emerald-400 font-bold">{Math.round(sighting.confidence * 100)}%</span></div>
                    </div>
                    <div className="pt-1 border-t border-gray-700 text-[9px] text-cyan-400 truncate">
                      SHA: {sighting.snapshot_hash_sha256}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* Top-Left Floating Badge: Clean Status Tag */}
      <div className="absolute top-3 left-3 z-[1000] pointer-events-none">
        <div className="bg-[#0b1222]/90 backdrop-blur-sm border border-slate-700/60 rounded-md px-2.5 py-1 text-xs font-mono text-slate-200 shadow-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-bold tracking-wider">GUJARAT STATEWIDE GIS</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 text-[11px]">{visibleCameras.length} Feeds</span>
        </div>
      </div>

      {/* Top-Right Tactical Toolbar */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 bg-[#0b1222]/90 backdrop-blur-md border border-slate-700/60 rounded-lg p-1 text-slate-400 pointer-events-auto">
        <button
          type="button"
          onClick={() => {
            window.dispatchEvent(new CustomEvent('map:fit'));
          }}
          className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
          title="Reset Statewide Bounds"
        >
          <LocateFixed className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
          title="Map Layers"
        >
          <Layers className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
          title="Maximize View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom-Left Clean Horizontal Department Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-[#0b1222]/90 backdrop-blur-md border border-slate-700/60 rounded-lg px-3 py-2 text-xs font-mono text-slate-300 shadow-xl pointer-events-auto">
        <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-1">
          Surveillance Feeds
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></span>
            <span className="text-slate-200 font-medium">Police</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]"></span>
            <span className="text-slate-200 font-medium">RTO</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
            <span className="text-slate-200 font-medium">GSRTC</span>
          </div>
        </div>
      </div>

      {/* Bottom-Right Attribution */}
      <div className="absolute bottom-2 right-3 z-[1000] pointer-events-none text-[10px] font-mono text-slate-500">
        Esri Dark Canvas &bull; Gujarat Police GIS
      </div>
    </div>
  );
};
