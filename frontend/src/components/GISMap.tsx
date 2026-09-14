import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Layers, Activity, Maximize2 } from 'lucide-react';
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
        padding: [60, 60],
        maxZoom: 10,
        animate: true,
        duration: 1.5,
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

// Feature 1: Camera-Anchored Geospatial Dragnet Wavefront Component
const RadarSweepWavefront: React.FC<{
  active: boolean;
  originCoords: [number, number];
}> = ({ active, originCoords }) => {
  const map = useMap();
  const [pixelPos, setPixelPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!active) {
      setPixelPos(null);
      return;
    }

    const updatePosition = () => {
      try {
        if (originCoords && originCoords[0] && originCoords[1]) {
          const pt = map.latLngToContainerPoint(originCoords);
          setPixelPos({ x: pt.x, y: pt.y });
        } else {
          const size = map.getSize();
          setPixelPos({ x: size.x / 2, y: size.y / 2 });
        }
      } catch {
        const size = map.getSize();
        setPixelPos({ x: size.x / 2, y: size.y / 2 });
      }
    };

    updatePosition();
    map.on('move', updatePosition);
    return () => {
      map.off('move', updatePosition);
    };
  }, [active, originCoords, map]);

  if (!active || !pixelPos) return null;

  return (
    <div
      className="pointer-events-none z-[999]"
      style={{
        position: 'absolute',
        left: `${pixelPos.x}px`,
        top: `${pixelPos.y}px`,
        width: 0,
        height: 0,
      }}
    >
      <div className="geospatial-sweep-wave"></div>
      <div className="geospatial-sweep-wave geospatial-sweep-wave-echo"></div>
    </div>
  );
};

// Create circular tactical camera DivIcon matching mockup (Blue=Police, Orange=RTO, Green=GSRTC, Cyan=Municipal)
function createCameraIcon(camera: Camera, _isRadarSweeping: boolean, isTargetLocked: boolean) {
  const deptColors: Record<string, string> = {
    Police: '#2563eb',
    'Transport (RTO)': '#ea580c',
    GSRTC: '#16a34a',
    'Municipal Corp': '#0891b2',
    Health: '#10b981',
    Panchayat: '#f97316',
    'Food & Civil Supplies': '#ec4899',
    Private: '#64748b',
  };
  const baseColor = deptColors[camera.department] || '#2563eb';
  const ringColor = isTargetLocked ? '#ef4444' : baseColor;

  return L.divIcon({
    className: 'custom-camera-marker',
    html: `
      <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
        <div style="width: 24px; height: 24px; border-radius: 50%; background-color: ${ringColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px ${ringColor}90, 0 2px 5px rgba(0,0,0,0.8); border: 1.5px solid rgba(255,255,255,0.7); cursor: pointer;">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 7l-7 5 7 5V7z"/>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

// Create vehicle waypoint DivIcon with red car badge and timestamp matching mockup
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
      className: 'custom-waypoint-marker',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="display: flex; align-items: center; gap: 4px; background-color: ${badgeColor}; border: 2px solid #ffffff; padding: 2px 6px; border-radius: 6px; box-shadow: 0 0 14px ${badgeColor}e6;">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.1 2 11.5 2 12v4c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/>
              <path d="M9 17h6"/>
              <circle cx="17" cy="17" r="2"/>
            </svg>
            <span style="font-size: 10px; font-family: monospace; font-weight: 800; color: #ffffff;">LATEST</span>
          </div>
          <span style="font-size: 9px; font-family: monospace; font-weight: bold; color: #fca5a5; background-color: rgba(7,11,20,0.85); padding: 1px 4px; border-radius: 3px; border: 1px solid ${badgeColor}80; margin-top: 2px;">
            ${timeStr}
          </span>
        </div>
      `,
      iconSize: [60, 36],
      iconAnchor: [30, 18],
      popupAnchor: [0, -18],
    });
  }

  return L.divIcon({
    className: 'custom-waypoint-marker',
    html: `
      <div style="display: flex; align-items: center; gap: 3px; cursor: pointer;">
        <div style="width: 24px; height: 18px; border-radius: 4px; background-color: ${badgeColor}; border: 1.5px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px ${badgeColor}cc;">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9C2.1 11.1 2 11.5 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <path d="M9 17h6"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
        </div>
        <span style="font-size: 9px; font-family: monospace; font-weight: bold; color: #fca5a5; background-color: rgba(7,11,20,0.85); padding: 1px 3px; border-radius: 3px; border: 1px solid ${badgeColor}66; white-space: nowrap;">
          ${timeStr}
        </span>
      </div>
    `,
    iconSize: [54, 20],
    iconAnchor: [12, 10],
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
  // Center of Gujarat (near Gandhinagar/Ahmedabad)
  const defaultCenter: [number, number] = [22.65, 71.85];
  const defaultZoom = 7;

  // Motion States: Radar Dragnet Sweep
  const [isRadarSweeping, setIsRadarSweeping] = useState<boolean>(false);
  const lastHandledPlateRef = useRef<string>('');

  // Automatically trigger radar sweep when target is selected
  useEffect(() => {
    if (!activeTrajectory || !activeTrajectory.plate_number) return;
    const plate = activeTrajectory.plate_number;

    if (lastHandledPlateRef.current !== plate) {
      lastHandledPlateRef.current = plate;
      setIsRadarSweeping(true);
      const sweepTimer = setTimeout(() => {
        setIsRadarSweeping(false);
      }, 950);
      return () => clearTimeout(sweepTimer);
    }
  }, [activeTrajectory]);

  // Filter cameras based on selected departments
  const visibleCameras = useMemo(() => {
    return cameras.filter((cam) => selectedDepartments.includes(cam.department));
  }, [cameras, selectedDepartments]);

  // Trajectory polyline coordinates (chronologically sorted and deduplicated)
  const trajectoryCoordinates = useMemo(() => {
    if (!activeTrajectory || !activeTrajectory.sightings) return [];
    // Sort by timestamp chronologically
    const sorted = [...activeTrajectory.sightings].sort(
      (a, b) => new Date(a.timestamp_iso || 0).getTime() - new Date(b.timestamp_iso || 0).getTime()
    );
    // Deduplicate consecutive identical coordinates (same camera)
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

  // Color for the trajectory line
  const trajectoryColor = useMemo(() => {
    if (!activeTrajectory) return '#06b6d4';
    const threat = activeTrajectory.watchlist_status.threat_level;
    if (threat === 'CRITICAL') return '#ef4444';
    if (threat === 'HIGH') return '#f59e0b';
    return '#22c55e';
  }, [activeTrajectory]);

  const isCam04Locked = activeTrajectory?.plate_number === 'GJ01ER8842';

  // Origin coordinates for the Google Maps Dragnet Radar Wavefront (anchored to camera / sighting)
  const sweepOriginCoords = useMemo<[number, number]>(() => {
    if (activeTrajectory?.sightings && activeTrajectory.sightings.length > 0) {
      const s = activeTrajectory.sightings[0];
      return [s.lat, s.lng];
    }
    return [23.0125, 72.5620]; // Default to Paldi Circle Cam04
  }, [activeTrajectory]);

  return (
    <div className="relative w-full h-full bg-[#0a0f1d] rounded-lg overflow-hidden border border-[#1f2937] shadow-2xl">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full"
        zoomControl={false}
      >
        {/* OpenStreetMap with Dark CSS Inversion Filter (Free forever, no API key watermark) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* Map Controller for programmatic flyTo & statewide trajectory auto-fitting */}
        <MapController flyToLocation={flyToLocation} trajectoryCoordinates={trajectoryCoordinates} />

        {/* Feature 1: Camera-Anchored Geospatial Dragnet Wavefront Overlay */}
        <RadarSweepWavefront active={isRadarSweeping} originCoords={sweepOriginCoords} />

        {/* 50 Camera Markers across Gujarat with scan excitation & cam04 lock */}
        {visibleCameras.map((camera) => {
          const isTargetNode = isCam04Locked && camera.camera_id === 'cam04';
          return (
            <Marker
              key={camera.camera_id}
              position={[camera.lat, camera.lng]}
              icon={createCameraIcon(camera, isRadarSweeping, isTargetNode)}
              eventHandlers={{
                click: () => {
                  onSelectCamera && onSelectCamera(camera);
                },
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
          );
        })}

        {/* Trajectory Polyline: Layer 1 (Outer Glow) */}
        {trajectoryCoordinates.length > 1 && (
          <Polyline
            positions={trajectoryCoordinates}
            pathOptions={{
              color: trajectoryColor,
              weight: 8,
              opacity: 0.35,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {/* Trajectory Polyline: Layer 2 (Core Sharp Artery with dash animation) */}
        {trajectoryCoordinates.length > 1 && (
          <Polyline
            positions={trajectoryCoordinates}
            pathOptions={{
              color: trajectoryColor === '#ef4444' ? '#f87171' : trajectoryColor === '#f59e0b' ? '#fbbf24' : '#4ade80',
              weight: 3,
              opacity: 0.95,
              dashArray: '8, 6',
              className: 'leaflet-animated-polyline',
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        )}

        {/* Timestamped Waypoints for active vehicle trajectory (Waypoints 1 to 7) */}
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

      {/* Top-Left Floating Tag: High-tech Tactical Dark GIS Map */}
      <div className="absolute top-3 left-3 z-[1000] pointer-events-none">
        <div className="bg-[#0b1222]/85 backdrop-blur-sm border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 shadow-xl">
          High-tech Tactical Dark GIS Map
        </div>
      </div>

      {/* Top-Right Map Tactical Toolbar Matching Mockup */}
      <div className="absolute top-3 right-3 z-[1000] flex items-center gap-1.5 bg-[#0b1222]/85 backdrop-blur-md border border-slate-700/60 rounded-lg p-1 text-slate-400 pointer-events-auto">
        <button type="button" className="px-1.5 py-0.5 text-xs hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer" title="Toggle Panel">«</button>
        <button type="button" className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer" title="Layers">
          <Layers className="w-3.5 h-3.5" />
        </button>
        <button type="button" className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer" title="Activity Wave">
          <Activity className="w-3.5 h-3.5" />
        </button>
        <button type="button" className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer" title="Fullscreen Map">
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom-Left Department Legend Matching Mockup */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-[#0b1222]/90 backdrop-blur-md border border-slate-700/60 rounded-xl p-3 text-xs font-mono text-slate-300 shadow-2xl pointer-events-auto min-w-[110px]">
        <div className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mb-2">
          Department
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563eb]"></span>
            <span className="text-white font-semibold text-xs">Police</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c]"></span>
            <span className="text-white font-semibold text-xs">RTO</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16a34a]"></span>
            <span className="text-white font-semibold text-xs">GSRTC</span>
          </div>
        </div>
      </div>

      {/* Bottom-Right Attribution Matching Mockup */}
      <div className="absolute bottom-2 right-3 z-[1000] pointer-events-none text-[10px] font-mono text-slate-500">
        Map data ©2026 Sentinel GIS Grid
      </div>
    </div>
  );
};
