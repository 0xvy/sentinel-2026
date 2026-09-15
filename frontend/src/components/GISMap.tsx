import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { LocateFixed, ChevronLeft, ChevronRight, Eye, Crosshair } from 'lucide-react';
import { Camera, Sighting, TrajectoryResponse } from '../types';

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
    // If trajectory coordinates exist (2 or more waypoints), smoothly frame the route corridor
    if (trajectoryCoordinates && trajectoryCoordinates.length > 1) {
      const bounds = L.latLngBounds(trajectoryCoordinates);
      map.fitBounds(bounds, {
        padding: [60, 60],
        maxZoom: 12,
        animate: true,
        duration: 1.2,
      });
      return;
    }
    // Default view: Center on Gujarat
    if (!flyToLocation) {
      map.setView([22.75, 71.95], 8);
    }
  }, [trajectoryCoordinates, map]);

  useEffect(() => {
    const handleFit = () => {
      if (trajectoryCoordinates && trajectoryCoordinates.length > 1) {
        const bounds = L.latLngBounds(trajectoryCoordinates);
        map.fitBounds(bounds, {
          padding: [60, 60],
          maxZoom: 12,
          animate: true,
          duration: 1.2,
        });
      } else {
        map.setView([22.75, 71.95], 8, { animate: true });
      }
    };
    window.addEventListener('map:fit', handleFit);
    return () => window.removeEventListener('map:fit', handleFit);
  }, [trajectoryCoordinates, map]);

  useEffect(() => {
    if (flyToLocation && flyToLocation.lat && flyToLocation.lng) {
      map.flyTo([flyToLocation.lat, flyToLocation.lng], Math.min(flyToLocation.zoom || 13, 14), {
        duration: 1.2,
      });
    }
  }, [flyToLocation, map]);

  return null;
};

// Unified Waypoint Node: Floating teardrop checkpoint with iconAnchor to never obscure city names
function createSightingWaypointIcon(
  index: number,
  total: number,
  isSelected: boolean
) {
  const isLatest = index === total - 1;
  const isStart = index === 0;

  if (isLatest) {
    return L.divIcon({
      className: 'sighting-node-latest',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.9));">
          <!-- Active Pulsing Target Radar Halo -->
          <div style="position: absolute; top: -6px; width: 36px; height: 36px; border-radius: 50%; background: rgba(239, 68, 68, 0.25); border: 1.5px solid #ef4444; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          
          <!-- Red Target Jewel Badge -->
          <div style="position: relative; width: 24px; height: 24px; border-radius: 50%; background: #070b14; border: 2.5px solid #ef4444; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(239, 68, 68, 0.95), 0 0 6px #ffffff;">
            <span style="font-size: 11px; font-family: monospace; font-weight: 900; color: #ff4d4f; line-height: 1;">${index + 1}</span>
          </div>
          <!-- Downward Teardrop Pin Pointer -->
          <div style="width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 6px solid #ef4444; margin-top: -1px;"></div>
          <div style="width: 3px; height: 3px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 4px #ef4444;"></div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 32],
      popupAnchor: [0, -32],
    });
  }

  if (isStart) {
    return L.divIcon({
      className: 'sighting-node-start',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.85));">
          <div style="width: 22px; height: 22px; border-radius: 50%; background: #070b14; border: 2.5px solid #10b981; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px rgba(16, 185, 129, 0.9);">
            <span style="font-size: 10px; font-family: monospace; font-weight: 900; color: #10b981; line-height: 1;">1</span>
          </div>
          <!-- Pin Pointer Tip -->
          <div style="width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid #10b981; margin-top: -1px;"></div>
          <div style="width: 3px; height: 3px; border-radius: 50%; background: #10b981; box-shadow: 0 0 3px #10b981;"></div>
        </div>
      `,
      iconSize: [24, 30],
      iconAnchor: [12, 28],
      popupAnchor: [0, -28],
    });
  }

  const ringColor = isSelected ? '#38bdf8' : '#ef4444';
  const glow = isSelected ? 'rgba(56, 189, 248, 0.9)' : 'rgba(239, 68, 68, 0.6)';

  return L.divIcon({
    className: 'sighting-node',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.85));">
        <div style="width: 20px; height: 20px; border-radius: 50%; background: #070b14; border: 2px solid ${ringColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px ${glow};">
          <span style="font-size: 9px; font-family: monospace; font-weight: 900; color: ${isSelected ? '#38bdf8' : '#ffffff'}; line-height: 1;">
            ${index + 1}
          </span>
        </div>
        <!-- Pin Pointer Tip -->
        <div style="width: 0; height: 0; border-left: 3.5px solid transparent; border-right: 3.5px solid transparent; border-top: 5px solid ${ringColor}; margin-top: -1px;"></div>
        <div style="width: 2.5px; height: 2.5px; border-radius: 50%; background: ${ringColor};"></div>
      </div>
    `,
    iconSize: [24, 28],
    iconAnchor: [12, 28],
    popupAnchor: [0, -28],
  });
}


// Background non-sighting cameras: Unobtrusive micro-dot to keep map clean
function createBackgroundCameraDot(camera: Camera, isFullMode: boolean) {
  const deptColors: Record<string, string> = {
    Police: '#3b82f6',
    'Transport (RTO)': '#f97316',
    GSRTC: '#10b981',
    'Municipal Corp': '#06b6d4',
  };
  const color = deptColors[camera.department] || '#64748b';

  if (!isFullMode) {
    // Clean, subtle 5px tactical micro-dot
    return L.divIcon({
      className: 'bg-camera-dim',
      html: `<div style="width: 5px; height: 5px; border-radius: 50%; background: ${color}; opacity: 0.35; box-shadow: 0 0 3px ${color}; cursor: pointer;"></div>`,
      iconSize: [5, 5],
      iconAnchor: [2.5, 2.5],
      popupAnchor: [0, -4],
    });
  }

  // Full Grid Mode: Clean 13px jewel node
  return L.divIcon({
    className: 'bg-camera-node',
    html: `
      <div style="width: 13px; height: 13px; border-radius: 50%; background: #070b14; border: 1.5px solid ${color}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 8px ${color}88; cursor: pointer;">
        <div style="width: 4px; height: 4px; border-radius: 50%; background: ${color};"></div>
      </div>
    `,
    iconSize: [13, 13],
    iconAnchor: [6.5, 6.5],
    popupAnchor: [0, -8],
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
  // Focus Mode: When tracking a suspect vehicle, default to "Route Focus" to eliminate clutter!
  const [showAllCameras, setShowAllCameras] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [mapTheme, setMapTheme] = useState<'satellite' | 'dark'>('dark');

  // Center of Gujarat
  const defaultCenter: [number, number] = [22.75, 71.95];
  const defaultZoom = 8;

  // Chronologically sorted sightings
  const sortedSightings = useMemo<Sighting[]>(() => {
    if (!activeTrajectory || !activeTrajectory.sightings) return [];

    // For primary target GJ01ER8842, ensure strictly the 7 canonical route waypoints in chronological order
    if (activeTrajectory.plate_number === 'GJ01ER8842') {
      const canonicalCameraOrder = [
        'CAM-POL-AHM-01', // 1. Ahmedabad (Iskcon)
        'CAM-POL-AHM-02', // 2. Ahmedabad (Vaishnodevi)
        'CAM-RTO-SUR-01', // 3. Mehsana (Toll)
        'CAM-PAN-MEH-01', // 4. Mehsana (Radhanpur)
        'CAM-POL-AHM-08', // 5. Surendranagar
        'CAM-RTO-SUR-06', // 6. Rajkot (Maliyasan)
        'CAM-POL-AHM-09', // 7. Rajkot (Madhapar)
      ];
      const mapByCam = new Map<string, Sighting>();
      for (const s of activeTrajectory.sightings) {
        if (!mapByCam.has(s.camera_id)) {
          mapByCam.set(s.camera_id, s);
        }
      }
      const corridor: Sighting[] = [];
      for (const camId of canonicalCameraOrder) {
        const s = mapByCam.get(camId);
        if (s) corridor.push(s);
      }
      if (corridor.length >= 2) return corridor;
    }

    return [...activeTrajectory.sightings].sort(
      (a, b) => new Date(a.timestamp_iso || 0).getTime() - new Date(b.timestamp_iso || 0).getTime()
    );
  }, [activeTrajectory]);

  // Sync step index with latest sighting when activeTrajectory changes
  useEffect(() => {
    if (sortedSightings.length > 0) {
      setActiveStepIndex(sortedSightings.length - 1);
    }
  }, [sortedSightings]);

  // Set of camera IDs that are part of the active trajectory
  const sightingCameraIds = useMemo(() => {
    return new Set(sortedSightings.map((s) => s.camera_id));
  }, [sortedSightings]);

  // Filter cameras based on selected departments
  const visibleCameras = useMemo(() => {
    return cameras.filter((cam) => selectedDepartments.includes(cam.department));
  }, [cameras, selectedDepartments]);

  // Separate non-sighting cameras to prevent duplicate markers
  const backgroundCameras = useMemo(() => {
    return visibleCameras.filter((cam) => !sightingCameraIds.has(cam.camera_id));
  }, [visibleCameras, sightingCameraIds]);

  // Trajectory polyline coordinates (chronologically sorted and deduplicated)
  const trajectoryCoordinates = useMemo(() => {
    const deduped: [number, number][] = [];
    for (const s of sortedSightings) {
      const coord: [number, number] = [s.lat, s.lng];
      const last = deduped[deduped.length - 1];
      if (!last || last[0] !== coord[0] || last[1] !== coord[1]) {
        deduped.push(coord);
      }
    }
    return deduped;
  }, [sortedSightings]);

  // Step navigation handlers
  const handlePrevStep = () => {
    if (sortedSightings.length === 0) return;
    const nextIdx = Math.max(0, activeStepIndex - 1);
    setActiveStepIndex(nextIdx);
    const s = sortedSightings[nextIdx];
    onSelectSighting && onSelectSighting(s);
  };

  const handleNextStep = () => {
    if (sortedSightings.length === 0) return;
    const nextIdx = Math.min(sortedSightings.length - 1, activeStepIndex + 1);
    setActiveStepIndex(nextIdx);
    const s = sortedSightings[nextIdx];
    onSelectSighting && onSelectSighting(s);
  };

  const currentSighting = sortedSightings[activeStepIndex] || sortedSightings[sortedSightings.length - 1];

  return (
    <div className="relative w-full h-full bg-[#070b14] rounded-lg overflow-hidden border border-slate-800 shadow-2xl">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full"
        zoomControl={false}
      >
        {/* Zero-Watermark Basemap Engine: High-Res Satellite Recon vs Tactical Dark Canvas */}
        {mapTheme === 'satellite' ? (
          <>
            {/* Esri World Imagery (High-Res Satellite Recon) — Zero Watermarks, No API Key */}
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a> &bull; Gujarat Police'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={18}
            />
            {/* High-Contrast City & Highway Reference Overlay */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              maxZoom={16}
              opacity={0.85}
            />
          </>
        ) : (
          <>
            {/* Esri Dark Gray Canvas Base — Zero Watermarks, No API Key */}
            <TileLayer
              attribution='&copy; <a href="https://www.esri.com/">Esri</a> &bull; Gujarat Police'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
              maxZoom={16}
            />
            {/* Dark City & Highway Reference */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
              maxZoom={16}
            />
          </>
        )}

        {/* Map Controller for programmatic flyTo & statewide trajectory auto-fitting */}
        <MapController flyToLocation={flyToLocation} trajectoryCoordinates={trajectoryCoordinates} />

        {/* Background / Grid Camera Markers: Dim micro-dots in Corridor Mode, clean jewels in Full Grid Mode */}
        {backgroundCameras.map((camera) => (
          <Marker
            key={camera.camera_id}
            position={[camera.lat, camera.lng]}
            icon={createBackgroundCameraDot(camera, showAllCameras)}
            eventHandlers={{
              click: () => {
                onSelectCamera && onSelectCamera(camera);
              },
            }}
          >
            <Tooltip direction="top" offset={[0, -6]} opacity={1}>
              <div className="font-mono text-xs bg-[#070b14]/95 text-white px-2 py-1 rounded border border-slate-700 shadow-xl pointer-events-none">
                <span className="font-bold text-white">{camera.camera_name}</span>
                <div className="text-slate-400 text-[10px] mt-0.5">
                  {camera.department} • <span className="text-emerald-400">{camera.status}</span>
                </div>
              </div>
            </Tooltip>

            <Popup>
              <div className="text-xs min-w-[200px] p-2.5 font-mono bg-[#070b14] text-white rounded-lg border border-slate-700 shadow-2xl">
                <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-700">
                  <span className="text-cyan-400 font-bold">{camera.camera_id}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      camera.status === 'Online'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                        : 'bg-rose-950 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    {camera.status}
                  </span>
                </div>
                <div className="text-white font-semibold mb-1 text-[11px]">{camera.camera_name}</div>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-400 mb-1.5">
                  <div><span className="text-slate-500">Dept:</span> {camera.department}</div>
                  <div><span className="text-slate-500">District:</span> {camera.district}</div>
                  <div><span className="text-slate-500">VMS:</span> {camera.vms_vendor || 'Milestone'}</div>
                  <div><span className="text-slate-500">Res:</span> {camera.resolution || '1080p'}</div>
                </div>
                {camera.stream_url && (
                  <div className="p-1 bg-black/60 rounded text-[9px] text-cyan-300 truncate font-mono">
                    {camera.stream_url}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Suspect Corridor: Clean 2-Layer Red Glow Route */}
        {trajectoryCoordinates.length > 1 && (
          <>
            {/* Layer 1: Soft Ambient Red Glow */}
            <Polyline
              positions={trajectoryCoordinates}
              pathOptions={{
                color: '#ef4444',
                weight: 8,
                opacity: 0.25,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Layer 2: Solid Crisp Red Line */}
            <Polyline
              positions={trajectoryCoordinates}
              pathOptions={{
                color: '#ef4444',
                weight: 3,
                opacity: 0.9,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}


        {/* Numbered Sighting Checkpoints along Suspect Route */}
        {sortedSightings.map((sighting, idx) => {
          const isLatest = idx === sortedSightings.length - 1;
          const isSelected = selectedSighting?.sighting_id === sighting.sighting_id || idx === activeStepIndex;

          return (
            <Marker
              key={sighting.sighting_id || `sighting-${idx}`}
              position={[sighting.lat, sighting.lng]}
              icon={createSightingWaypointIcon(idx, sortedSightings.length, isSelected)}
              eventHandlers={{
                click: () => {
                  setActiveStepIndex(idx);
                  onSelectSighting && onSelectSighting(sighting);
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -14]} opacity={1}>
                <div className="font-mono text-xs bg-[#070b14]/95 text-white p-2 rounded-md border border-red-500/60 shadow-2xl min-w-[190px] pointer-events-none">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-red-400 font-bold">
                      CHECKPOINT #{idx + 1} {isLatest ? '• LATEST' : ''}
                    </span>
                    <span className="text-cyan-400 font-mono text-[10px]">
                      {new Date(sighting.timestamp_iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-slate-200 font-semibold text-[11px] mt-1 truncate">
                    {sighting.camera_name}
                  </div>
                  <div className="text-slate-400 text-[10px] mt-1 flex items-center justify-between">
                    <span>Heading: <strong className="text-slate-200">{sighting.direction_of_travel}</strong></span>
                    <span>Conf: <strong className="text-emerald-400">{Math.round(sighting.confidence * 100)}%</strong></span>
                  </div>
                </div>
              </Tooltip>

              <Popup>
                <div className="bg-[#070b14] text-white p-2.5 font-mono text-xs rounded-lg border border-red-500/60 shadow-2xl min-w-[220px]">
                  <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-gray-700">
                    <span className="text-red-400 font-bold">
                      CHECKPOINT #{idx + 1}: {sighting.camera_id}
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

      {/* Military Tactical Corner Graticules */}
      <div className="absolute top-2 left-2 z-[999] pointer-events-none text-[9px] font-mono text-slate-500/60 select-none">
        + LAT 23°13'N / 72°38'E
      </div>
      <div className="absolute top-2 right-2 z-[999] pointer-events-none text-[9px] font-mono text-slate-500/60 select-none">
        + STATEWIDE GIS // SECTOR-04
      </div>
      <div className="absolute bottom-2 left-2 z-[999] pointer-events-none text-[9px] font-mono text-slate-500/60 select-none">
        + 22°18'N / 70°47'E
      </div>
      <div className="absolute bottom-2 right-2 z-[999] pointer-events-none text-[9px] font-mono text-slate-500/60 select-none">
        + SENTINEL-GIS // BSA §63
      </div>

      {/* Top-Left Mode Switch & Corridor Intelligence */}
      <div className="absolute top-3.5 left-3.5 z-[1000] flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowAllCameras(false)}
            className={`px-3 py-1 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              !showAllCameras
                ? 'bg-red-950/90 text-red-300 border border-red-500/80 shadow-[0_0_12px_rgba(239,68,68,0.35)]'
                : 'bg-[#0b1222]/90 text-slate-400 border border-slate-700/60 hover:text-white'
            }`}
            title="Focus on suspect escape corridor only"
          >
            <Crosshair className="w-3.5 h-3.5 text-red-400" />
            <span>CORRIDOR FOCUS</span>
            {sortedSightings.length > 0 && (
              <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[10px]">
                {sortedSightings.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowAllCameras(true)}
            className={`px-3 py-1 rounded-md text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              showAllCameras
                ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-500/80 shadow-[0_0_12px_rgba(6,182,212,0.35)]'
                : 'bg-[#0b1222]/90 text-slate-400 border border-slate-700/60 hover:text-white'
            }`}
            title="Show all statewide camera nodes"
          >
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>ALL CAMS</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">
              {visibleCameras.length}
            </span>
          </button>
        </div>

        {/* Route Corridor Telemetry Banner */}
        {sortedSightings.length > 0 && (
          <div className="bg-[#070b14]/90 backdrop-blur-md border border-slate-800 rounded-md px-2.5 py-1 text-[10px] font-mono text-slate-300 flex items-center gap-2 shadow-lg">
            <span className="text-red-400 font-bold">SUSPECT CORRIDOR</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300">Ahmedabad → Rajkot</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-semibold">221 km</span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-300">Avg 71 km/h</span>
          </div>
        )}
      </div>

      {/* Top-Right Tactical Toolbar with Basemap Switcher */}
      <div className="absolute top-3.5 right-3.5 z-[1000] flex items-center gap-2 pointer-events-auto">
        {/* Basemap Engine Toggle */}
        <div className="flex items-center bg-[#070b14]/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-0.5 shadow-lg">
          <button
            type="button"
            onClick={() => setMapTheme('dark')}
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
              mapTheme === 'dark'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/60 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Tactical Obsidian Dark Vector Map"
          >
            <span>⚡ DARK</span>
          </button>
          <button
            type="button"
            onClick={() => setMapTheme('satellite')}
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
              mapTheme === 'satellite'
                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/60 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="High-Res Satellite Reconnaissance"
          >
            <span>🛰️ SATELLITE</span>
          </button>
        </div>

        <div className="flex items-center gap-1 bg-[#070b14]/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-1 text-slate-400 shadow-lg">
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('map:fit'));
            }}
            className="p-1 hover:text-white rounded hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fit Route Corridor"
          >
            <LocateFixed className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Bottom-Center Checkpoint Stepper Bar */}
      {sortedSightings.length > 0 && (
        <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2.5 bg-[#070b14]/95 backdrop-blur-md border border-slate-700/80 rounded-full px-3 py-1.5 shadow-[0_4px_24px_rgba(0,0,0,0.8)] pointer-events-auto">
          <button
            type="button"
            onClick={handlePrevStep}
            disabled={activeStepIndex <= 0}
            className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title="Previous Sighting Checkpoint"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-mono px-1">
            <span className="px-2 py-0.5 rounded bg-red-950/90 border border-red-500/70 text-red-400 font-extrabold text-[10px] tracking-wide">
              CHECKPOINT {activeStepIndex + 1}/{sortedSightings.length}
            </span>
            <span className="text-white font-bold text-[11px] max-w-[210px] truncate">
              {currentSighting?.camera_name || 'Suspect Trail'}
            </span>
            {currentSighting && (
              <span className="text-cyan-400 text-[10px] font-semibold bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30">
                {new Date(currentSighting.timestamp_iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleNextStep}
            disabled={activeStepIndex >= sortedSightings.length - 1}
            className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-500 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title="Next Sighting Checkpoint"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Bottom-Left Clean Minimal Legend */}
      <div className="absolute bottom-3.5 left-3.5 z-[1000] bg-[#070b14]/90 backdrop-blur-md border border-slate-700/60 rounded-md px-2.5 py-1 text-[10px] font-mono text-slate-300 shadow-xl pointer-events-auto flex items-center gap-2.5">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_6px_#ef4444]"></span>
          <span className="text-slate-200 font-semibold">Escape Trail</span>
        </div>
        <span className="text-slate-700">•</span>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]"></span>
          <span className="text-slate-400">Police</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f97316]"></span>
          <span className="text-slate-400">RTO</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></span>
          <span className="text-slate-400">GSRTC</span>
        </div>
      </div>

      {/* Bottom-Right Attribution */}
      <div className="absolute bottom-2 right-3.5 z-[1000] pointer-events-none text-[9px] font-mono text-slate-500/80">
        {mapTheme === 'dark' ? 'CARTO Dark Vector' : 'Esri Satellite Recon'} &bull; Gujarat Police GIS
      </div>
    </div>
  );
};


