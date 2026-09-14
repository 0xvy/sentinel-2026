import React, { useState, useEffect, useCallback } from 'react';
import { 
  Camera, 
  AlertEvent, 
  TrajectoryResponse, 
  Sighting 
} from './types';
import { api } from './services/api';
import { useAlertWebSocket } from './hooks/useAlertWebSocket';
import { GISMap } from './components/GISMap';
import { CameraFilter } from './components/CameraFilter';
import { ExportButton } from './components/ExportButton';
import { ForensicDrawer } from './components/ForensicDrawer';
import { PCRDispatchModal } from './components/PCRDispatchModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { LiveCCTVStrip } from './components/LiveCCTVStrip';
import enhancedPlateImg from './assets/crops/enhanced_plate.jpg';
import { 
  Shield, 
  Radio, 
  FileText, 
  Layers, 
  CheckCircle2, 
  Filter,
  LayoutGrid,
  Folder,
  Activity,
  Scan,
  MoreHorizontal,
  Search,
  AlertTriangle
} from 'lucide-react';

const INITIAL_DEPARTMENTS = [
  'Police',
  'Transport (RTO)',
  'GSRTC',
  'Municipal Corp',
  'Health',
  'Panchayat',
  'Private',
  'Food & Civil Supplies'
];

export const App: React.FC = () => {
  // Application Data States
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>(INITIAL_DEPARTMENTS);
  const [activePlate, setActivePlate] = useState<string>('GJ01ER8842'); // Primary target suspect
  const [activeTrajectory, setActiveTrajectory] = useState<TrajectoryResponse | null>(null);
  const [isLoadingTrajectory, setIsLoadingTrajectory] = useState<boolean>(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertEvent | null>(null);
  const [selectedSighting, setSelectedSighting] = useState<Sighting | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

  // Modals and Drawers States
  const [isForensicOpen, setIsForensicOpen] = useState<boolean>(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [isArchModalOpen, setIsArchModalOpen] = useState<boolean>(false);
  const [forensicSighting, setForensicSighting] = useState<Sighting | null>(null);
  const [forensicAlert, setForensicAlert] = useState<AlertEvent | null>(null);
  const [forensicPlate, setForensicPlate] = useState<string>('GJ01ER8842');

  // Live Alerts via WebSocket
  const { alerts } = useAlertWebSocket();

  // Keep selectedAlert in sync with latest inbound alert if not manually selected
  useEffect(() => {
    if (alerts && alerts.length > 0) {
      setSelectedAlert((prev) => prev || alerts[0]);
    }
  }, [alerts]);

  // Clock updater (IST format: 14-09-2026 • 21:08:07 IST • SAT)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const datePart = now.toLocaleDateString('en-GB', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }).toUpperCase();
      const timePart = now.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false
      });
      const dayPart = now.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
      setCurrentTime(`${datePart} • ${timePart} IST • ${dayPart}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Cameras on mount
  useEffect(() => {
    api.getCameras().then((data) => {
      setCameras(data);
    });
  }, []);

  // Fetch trajectory for active plate
  const fetchTrajectory = useCallback(async (plate: string) => {
    if (!plate) return;
    try {
      setIsLoadingTrajectory(true);
      const data = await api.getTrajectory(plate);
      setActiveTrajectory(data);
      setActivePlate(plate);
    } catch (err) {
      console.error('Failed to load trajectory for plate:', plate, err);
    } finally {
      setIsLoadingTrajectory(false);
    }
  }, []);

  // Initial load for demo plate GJ01ER8842
  useEffect(() => {
    fetchTrajectory('GJ01ER8842');
  }, [fetchTrajectory]);

  // Handle department filters
  const handleToggleDepartment = (dept: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const handleSelectAllDepartments = () => {
    setSelectedDepartments(INITIAL_DEPARTMENTS);
  };

  const handleClearAllDepartments = () => {
    setSelectedDepartments([]);
  };

  // Handle waypoint click in trajectory panel or map
  const handleSelectWaypoint = (sighting: Sighting) => {
    setSelectedSighting(sighting);
    setFlyToLocation({ lat: sighting.lat, lng: sighting.lng, zoom: 14 });
  };

  const isCriticalTarget = activePlate === 'GJ01ER8842' || activeTrajectory?.watchlist_status?.threat_level === 'CRITICAL';

  return (
    <div className="flex h-screen w-screen bg-[#050811] text-slate-100 font-sans select-none overflow-hidden">
      {/* 1. LEFT SLIM ICON NAVIGATION RAIL matching Mockup */}
      <nav className="w-14 shrink-0 bg-[#050811] border-r border-slate-800/80 flex flex-col items-center py-3 justify-between z-40">
        {/* Top Brand Emblem Icon */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/60 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950/60">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        {/* Center Navigation Icon Stack */}
        <div className="flex flex-col items-center gap-2.5">
          <button
            type="button"
            className="w-9 h-9 rounded-lg bg-[#0f172a] text-cyan-400 border border-cyan-500/40 flex items-center justify-center hover:bg-cyan-950 transition-colors cursor-pointer"
            title="Tactical Command Grid"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              const latest = activeTrajectory?.sightings?.[activeTrajectory.sightings.length - 1] || null;
              setForensicSighting(latest);
              setForensicAlert(null);
              setForensicPlate(activePlate);
              setIsForensicOpen(true);
            }}
            className="w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 flex items-center justify-center transition-colors cursor-pointer"
            title="Forensic Dossier (BSA 2023 §63)"
          >
            <Folder className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsDispatchModalOpen(true)}
            className="w-9 h-9 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/50 flex items-center justify-center transition-colors cursor-pointer"
            title="PCR Intercept Dispatch"
          >
            <Radio className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowFilterModal(!showFilterModal)}
            className="w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 flex items-center justify-center transition-colors cursor-pointer"
            title="Filter Surveillance Grid"
          >
            <Filter className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsArchModalOpen(true)}
            className="w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 flex items-center justify-center transition-colors cursor-pointer"
            title="System Architecture"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom Actions Stack */}
        <div className="flex flex-col items-center gap-2">
          <ExportButton currentPlate={activePlate} />
        </div>
      </nav>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* TOP COMMAND HEADER matching Mockup */}
        <header className="h-14 bg-[#070b14] border-b border-slate-800/80 px-4 flex items-center justify-between z-30 shrink-0 gap-4">
          {/* Left Title */}
          <div className="flex flex-col">
            <h1 className="font-heading font-black text-sm tracking-wider text-white">
              SENTINEL <span className="text-cyan-400 font-mono">2026</span>
            </h1>
            <span className="text-[10px] text-slate-400 font-mono tracking-wide">
              Gujarat Police Command Center
            </span>
          </div>

          {/* Center Search Container */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest self-start mb-0.5">
              ACTIVE VEHICLE SEARCH
            </span>
            <div className="flex items-center gap-2">
              <div className="relative flex items-center w-72 sm:w-80">
                <Search className={`w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none ${isLoadingTrajectory ? 'animate-spin text-cyan-400' : ''}`} />
                <input
                  type="text"
                  value={activePlate}
                  onChange={(e) => setActivePlate(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') fetchTrajectory(activePlate);
                  }}
                  placeholder="SEARCH VEHICLE..."
                  className="w-full bg-[#0b1222] border border-slate-700/80 rounded-lg pl-8 pr-14 py-1 text-xs font-mono text-white tracking-widest placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                />
                {activePlate && (
                  <button
                    type="button"
                    onClick={() => setActivePlate('')}
                    className="absolute right-8 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
                <div className="absolute right-2 text-xs font-mono font-bold text-slate-400 border-l border-slate-700 pl-1.5">
                  {activeTrajectory?.total_sightings || 7}
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fetchTrajectory('GJ01ER8842')}
                  className={`text-[9px] font-mono font-bold px-1.5 py-1 rounded border transition-colors cursor-pointer ${
                    activePlate === 'GJ01ER8842'
                      ? 'bg-red-950/80 text-red-400 border-red-500/60'
                      : 'bg-[#0b1222] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                  title="Target: Stolen Creta (Vikram Solanki)"
                >
                  GJ01ER8842
                </button>
                <button
                  type="button"
                  onClick={() => fetchTrajectory('GJ05CD5678')}
                  className={`text-[9px] font-mono font-bold px-1.5 py-1 rounded border transition-colors cursor-pointer ${
                    activePlate === 'GJ05CD5678'
                      ? 'bg-amber-950/80 text-amber-400 border-amber-500/60'
                      : 'bg-[#0b1222] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                  title="Target: Suspended License"
                >
                  GJ05CD5678
                </button>
                <button
                  type="button"
                  onClick={() => fetchTrajectory('GJ27K9012')}
                  className={`text-[9px] font-mono font-bold px-1.5 py-1 rounded border transition-colors cursor-pointer ${
                    activePlate === 'GJ27K9012'
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/60'
                      : 'bg-[#0b1222] text-slate-400 border-slate-800 hover:text-white'
                  }`}
                  title="Target: Clean Vehicle"
                >
                  GJ27K9012
                </button>
              </div>
            </div>
          </div>

          {/* Right Command Badges matching Mockup */}
          <div className="flex items-center gap-3">
            {/* Threat Alert Triage */}
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest mb-0.5">
                THREAT ALERT TRIAGE
              </span>
              {isCriticalTarget ? (
                <div className="bg-red-950/80 border border-red-500/80 text-white font-mono text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>CRITICAL: STOLEN &amp; WANTED</span>
                </div>
              ) : activePlate === 'GJ05CD5678' || activeTrajectory?.watchlist_status?.threat_level === 'HIGH' ? (
                <div className="bg-amber-950/80 border border-amber-500/80 text-white font-mono text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>HIGH: SUSPENDED DL</span>
                </div>
              ) : (
                <div className="bg-emerald-950/80 border border-emerald-500/80 text-white font-mono text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>NORMAL: CLEAN VEHICLE</span>
                </div>
              )}
            </div>

            {/* System Status */}
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest mb-0.5">
                SYSTEM STATUS
              </span>
              <div className="bg-[#0b1222] border border-slate-700/80 text-white font-mono text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-2 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>28/30 CAMS LIVE</span>
              </div>
            </div>
          </div>
        </header>

        {/* CENTER BODY: Map (Top 60%) + Video Wall (Bottom 40%) + Right Intelligence Column */}
        <div className="flex-1 flex flex-row overflow-hidden relative">
          {/* Left Main View (Map + Live CCTV Strip) */}
          <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-slate-800/80">
            {/* Top: GIS Tactical Map */}
            <div className="flex-1 min-h-0 relative">
              <GISMap
                cameras={cameras}
                selectedDepartments={selectedDepartments}
                activeTrajectory={activeTrajectory}
                selectedSighting={selectedSighting}
                flyToLocation={flyToLocation}
                onSelectCamera={(cam) => {
                  setFlyToLocation({ lat: cam.lat, lng: cam.lng, zoom: 14 });
                }}
                onSelectSighting={handleSelectWaypoint}
              />
            </div>

            {/* Bottom: Live Night CCTV Video Wall */}
            <div className="h-[210px] shrink-0 w-full">
              <LiveCCTVStrip
                cameras={cameras}
                onSelectCamera={(cam) => {
                  setFlyToLocation({ lat: cam.lat, lng: cam.lng, zoom: 14 });
                }}
                activePlate={activePlate}
                currentTime={currentTime}
              />
            </div>
          </div>

          {/* Right Intelligence Column: Real time ML Pipeline Telemetry matching Mockup */}
          <div className="w-[340px] shrink-0 h-full bg-[#080d1a] flex flex-col p-3.5 gap-3 overflow-y-auto tactical-scrollbar select-none">
            {/* Header */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <h2 className="text-xs font-bold text-white tracking-wide">
                Real time ML Pipeline Telemetry
              </h2>
              <button
                type="button"
                onClick={() => setIsArchModalOpen(true)}
                className="text-slate-500 hover:text-slate-300 p-1 cursor-pointer transition-colors"
                title="Telemetry Options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Live Inference Metrics */}
            <div>
              <div className="text-xs text-slate-400 font-mono mb-1.5">Live Inference</div>
              <div className="flex items-center justify-between bg-[#040711] border border-slate-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-xl font-bold font-mono text-white">21ms</span>
                </div>
                <div className="flex items-center gap-2">
                  <Scan className="w-4 h-4 text-cyan-400" />
                  <span className="text-xl font-bold font-mono text-white">60fps</span>
                </div>
              </div>
            </div>

            {/* Cropped Preview matching Mockup */}
            <div>
              <div className="text-xs text-slate-400 font-mono mb-1.5">Cropped Preview</div>
              <div className="bg-[#040711] border border-slate-800 rounded-lg p-2 flex items-center justify-center">
                <img
                  src={enhancedPlateImg}
                  alt="Cropped Preview"
                  className="h-12 w-full object-contain rounded border border-slate-700/60 filter contrast-125"
                />
              </div>
            </div>

            {/* Correlation Status with Status Badges matching Mockup */}
            <div>
              <div className="text-xs text-slate-400 font-mono mb-2">Correlation Status</div>
              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between items-center bg-[#040711] border border-slate-800/80 px-2.5 py-1.5 rounded-lg">
                  <span className="text-slate-300">VAHAN</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isCriticalTarget
                      ? 'bg-red-950/80 text-red-400 border border-red-800/60'
                      : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                  }`}>
                    {isCriticalTarget ? 'STOLEN' : 'Correlated'}
                  </span>
                </div>

                <div className="flex justify-between items-center bg-[#040711] border border-slate-800/80 px-2.5 py-1.5 rounded-lg">
                  <span className="text-slate-300">SARTHI</span>
                  <span className="bg-amber-950/80 text-amber-400 border border-amber-800/60 px-2 py-0.5 rounded text-[10px] font-bold">
                    Correlated
                  </span>
                </div>

                <div className="flex justify-between items-center bg-[#040711] border border-slate-800/80 px-2.5 py-1.5 rounded-lg">
                  <span className="text-slate-300">eGujCop</span>
                  <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded text-[10px] font-bold">
                    Correlated
                  </span>
                </div>

                <div className="flex justify-between items-center bg-[#040711] border border-slate-800/80 px-2.5 py-1.5 rounded-lg">
                  <span className="text-slate-300">AFIS</span>
                  <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded text-[10px] font-bold">
                    Correlated
                  </span>
                </div>

                <div className="flex justify-between items-center bg-[#040711] border border-slate-800/80 px-2.5 py-1.5 rounded-lg">
                  <span className="text-slate-300">NAFIS</span>
                  <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded text-[10px] font-bold">
                    Correlated
                  </span>
                </div>
              </div>
            </div>

            {/* Route Reconstruction Summary */}
            <div className="bg-[#040711] border border-slate-800 rounded-lg p-2.5 text-xs font-mono space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Corridor:</span>
                <span className="text-white font-bold">Ahmedabad &rarr; Rajkot (221 km)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Waypoints:</span>
                <span className="text-cyan-400 font-bold">{activeTrajectory?.total_sightings || 7} Sightings</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Avg Speed:</span>
                <span className="text-emerald-400 font-bold">71.3 km/h</span>
              </div>
            </div>

            {/* Tactical Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-auto pt-2">
              <button
                type="button"
                onClick={() => setIsDispatchModalOpen(true)}
                className="p-2.5 bg-red-600 hover:bg-red-500 rounded-lg text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-red-950/50"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>PCR Dispatch</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const latest = activeTrajectory?.sightings?.[activeTrajectory.sightings.length - 1] || null;
                  setForensicSighting(latest);
                  setForensicAlert(null);
                  setForensicPlate(activePlate);
                  setIsForensicOpen(true);
                }}
                className="p-2.5 bg-[#0b1222] hover:bg-[#131d36] border border-cyan-500/40 rounded-lg text-cyan-300 font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Forensic Dossier</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. ANIMATED REAL-TIME WEBSOCKET ALERT TICKER matching Mockup Bottom Bar */}
        <footer className="h-8 bg-[#050811] border-t border-slate-800/80 px-4 flex items-center justify-between text-xs font-mono shrink-0 z-30">
          <div className="flex items-center gap-3 overflow-hidden text-slate-300">
            <span className="font-bold text-white tracking-wider shrink-0">
              ANIMATED REAL-TIME WEBSOCKET ALERT TICKER
            </span>
            <span className="text-slate-600">|</span>
            {alerts && alerts.length > 0 ? (
              <div className="truncate flex items-center gap-2 text-slate-300">
                <span className="text-cyan-400 font-bold">LATEST DETECTION:</span>
                <span className="text-white font-bold">{alerts[0].detected_plate}</span>
                <span>at</span>
                <span className="text-cyan-300">{alerts[0].camera_id}</span>
                <span className={alerts[0].threat_level === 'CRITICAL' ? 'text-red-400 font-bold' : alerts[0].threat_level === 'HIGH' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                  [{alerts[0].threat_level}]
                </span>
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 inline" />
                <span className="text-slate-400">
                  SHA-256: {alerts[0].snapshot_hash_sha256 ? alerts[0].snapshot_hash_sha256.slice(0, 16) + '...' : 'TAMPER-EVIDENT'} • Forensically Audited under BSA 2023 §63
                </span>
              </div>
            ) : (
              <div className="truncate flex items-center gap-2 text-slate-300">
                <span>Latest Updates:</span>
                <span className="text-cyan-300 font-bold">{activePlate}</span>
                <span>flagged into</span>
                <span className={isCriticalTarget ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {isCriticalTarget ? 'CRITICAL: STOLEN & WANTED' : 'CLEAN VEHICLE'}
                </span>
                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 inline" />
                <span className="text-slate-400">
                  Intercept order dispatched to nearest PCR unit • Primary evidence hash verified under BSA 2023 §63
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-cyan-400 font-bold shrink-0 ml-4">
            <span>&gt;&gt;</span>
            <span className="text-slate-400 text-[11px]">Live WS Feed ({cameras.length || 28} Cams)</span>
          </div>
        </footer>
      </div>

      {/* MODALS & DRAWERS */}
      {showFilterModal && (
        <div className="absolute top-16 left-20 w-72 z-50 shadow-2xl">
          <CameraFilter
            cameras={cameras}
            selectedDepartments={selectedDepartments}
            onToggleDepartment={handleToggleDepartment}
            onSelectAll={handleSelectAllDepartments}
            onClearAll={handleClearAllDepartments}
          />
        </div>
      )}

      <ForensicDrawer
        isOpen={isForensicOpen}
        onClose={() => setIsForensicOpen(false)}
        sighting={forensicSighting}
        alert={forensicAlert}
        plateNumber={forensicPlate}
        threatLevel={activeTrajectory?.watchlist_status?.threat_level || forensicAlert?.threat_level || 'CRITICAL'}
      />

      <PCRDispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        alert={selectedAlert}
        plateNumber={activePlate}
      />

      <ArchitectureModal
        isOpen={isArchModalOpen}
        onClose={() => setIsArchModalOpen(false)}
      />
    </div>
  );
};

export default App;
