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

// Create tactical camera DivIcon
function createCameraIcon(camera: Camera) {
  let statusColor = '#22c55e'; // Online
  let pulseClass = '';

  if (camera.status === 'Offline') {
    statusColor = '#ef4444';
  } else if (camera.status === 'Degraded') {
    statusColor = '#f59e0b';
  } else {
    pulseClass = 'animate-ping';
  }

  const deptShort = camera.department.slice(0, 3).toUpperCase();

  return L.divIcon({
    className: 'custom-camera-marker',
    html: `
      <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
        ${
          camera.status === 'Online'
            ? `<span style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background-color: ${statusColor}; opacity: 0.35;" class="${pulseClass}"></span>`
            : ''
        }
        <div style="width: 20px; height: 20px; border-radius: 50%; background-color: #0a0f1d; border: 2px solid ${statusColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 8px rgba(0,0,0,0.8); z-index: 2;">
          <span style="font-size: 8px; font-family: 'JetBrains Mono', monospace; font-weight: 800; color: ${statusColor};">
            ${deptShort === 'POL' ? 'P' : deptShort === 'TRA' ? 'R' : deptShort === 'GSR' ? 'G' : 'C'}
          </span>
        </div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -14],
  });
}

// Create tactical waypoint DivIcon for vehicle trajectory
function createWaypointIcon(
  _sighting: Sighting,
  index: number,
  isLatest: boolean,
  threatLevel: ThreatLevel
) {
  const color =
    threatLevel === 'CRITICAL' ? '#ef4444' : threatLevel === 'HIGH' ? '#f59e0b' : '#22c55e';

  return L.divIcon({
    className: 'custom-waypoint-marker',
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        ${
          isLatest
            ? `<span style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background-color: ${color}; opacity: 0.5;" class="animate-ping"></span>`
            : ''
        }
        <div style="width: 26px; height: 26px; border-radius: 50%; background-color: ${color}; border: 2px solid #ffffff; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 0 12px ${color}; z-index: 5;">
          <span style="font-size: 10px; font-family: 'JetBrains Mono', monospace; font-weight: 900; color: #0a0f1d; line-height: 1;">
            ${index + 1}
          </span>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
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

        {/* Trajectory Polyline overlay */}
        {trajectoryCoordinates.length > 1 && (
          <Polyline
            positions={trajectoryCoordinates}
            pathOptions={{
              color: trajectoryColor,
              weight: 4,
              opacity: 0.9,
              dashArray: '8, 8',
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
      <div className="absolute top-3 left-3 pointer-events-none z-[1000] flex flex-col gap-1">
        <div className="bg-[#0a0f1d]/85 backdrop-blur px-2.5 py-1.5 rounded border border-[#1f2937] text-[11px] font-mono text-gray-300 shadow-lg">
          <span className="text-cyan-400 font-bold">GUJARAT STATE POLICE GIS</span>
          <div className="text-[10px] text-gray-400">
            {visibleCameras.length} of {cameras.length} CCTV Feeds Online
          </div>
        </div>

        {activeTrajectory && (
          <div className="bg-[#0a0f1d]/90 backdrop-blur px-2.5 py-1.5 rounded border border-cyan-500/50 text-[11px] text-gray-200 shadow-lg">
            <span className="text-[10px] text-gray-400 block uppercase font-bold">Active Reconstruction</span>
            <span className="font-plate text-cyan-400 font-bold tracking-wider">
              {activeTrajectory.plate_number}
            </span>
            <span className="text-gray-400 ml-1">({activeTrajectory.sightings.length} waypoints)</span>
          </div>
        )}
      </div>
    </div>
  );
};
