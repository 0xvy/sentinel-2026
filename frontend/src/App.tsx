import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Camera, 
  AlertEvent, 
  TrajectoryResponse, 
  Sighting 
} from './types';
import { api } from './services/api';
import { useAlertWebSocket } from './hooks/useAlertWebSocket';
import { GISMap } from './components/GISMap';
import { PlateSearch } from './components/PlateSearch';
import { CameraFilter } from './components/CameraFilter';
import { PCRDispatchCard } from './components/PCRDispatchCard';
import { ExportButton } from './components/ExportButton';
import { ForensicDrawer } from './components/ForensicDrawer';
import { PCRDispatchModal } from './components/PCRDispatchModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { LiveCCTVStrip } from './components/LiveCCTVStrip';
import enhancedPlateImg from './assets/crops/enhanced_plate.jpg';
import { 
  Shield, 
  ShieldAlert, 
  Radio, 
  FileText, 
  Layers, 
  CheckCircle2, 
  Zap, 
  Navigation, 
  Bell, 
  Clock, 
  Filter
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
  const { alerts, connectionStatus } = useAlertWebSocket();

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

  // Fetch trajectory for active plate (DO NOT call flyTo on load so fitBounds stays active!)
  const fetchTrajectory = useCallback(async (plate: string) => {
    if (!plate) return;
    try {
      setIsLoadingTrajectory(true);
      const data = await api.getTrajectory(plate);
      setActiveTrajectory(data);
      setActivePlate(plate);
      // NOTE: We deliberately do NOT call setFlyToLocation here.
      // MapController automatically calls map.fitBounds() to display the complete statewide corridor!
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

  // Counts & status
  const criticalAlertCount = alerts.filter((a) => a.threat_level === 'CRITICAL').length;
  const onlineFederatedCount = cameras.length ? cameras.filter((c) => c.status === 'Online').length : 78;
  const totalCamerasCount = cameras.length || 80;
  const isCriticalTarget = activePlate === 'GJ01ER8842' || activeTrajectory?.watchlist_status?.threat_level === 'CRITICAL';

  // Department camera counts
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    cameras.forEach((c) => {
      counts[c.department] = (counts[c.department] || 0) + 1;
    });
    return counts;
  }, [cameras]);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#040711] text-slate-100 font-sans select-none overflow-hidden">
      {/* 1. TOP COMMAND HEADER */}
      <header className="h-14 bg-[#0a101f] border-b border-[#1e293b] px-3 sm:px-4 flex items-center justify-between z-30 shadow-2xl shrink-0 gap-2">
        {/* Left: Gujarat Police Emblem & Command Header */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/90 border border-cyan-500/60 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950/60">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-extrabold text-sm sm:text-base tracking-wider text-white">
                SENTINEL <span className="text-cyan-400 font-mono">2026</span>
              </h1>
              <span className="bg-cyan-950/90 border border-cyan-700/80 text-cyan-300 font-mono text-[9px] px-1.5 py-0.5 rounded font-bold hidden md:inline-block">
                GUJARAT POLICE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden lg:block tracking-wide">
              Command Center • Statewide Surveillance Intelligence Grid
            </p>
          </div>
        </div>

        {/* Center: Search Bar with Tiny Compact Presets Directly Below (ZERO Collision) */}
        <div className="flex-1 max-w-xl mx-2 flex flex-col justify-center">
          <PlateSearch
            activePlate={activePlate}
            onSelectPlate={fetchTrajectory}
            isLoadingTrajectory={isLoadingTrajectory}
            showPresets={false}
          />
          {/* Tiny preset pills — compact, no collision */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] text-slate-500 font-mono font-bold">PRESETS:</span>
            <button
              type="button"
              onClick={() => fetchTrajectory('GJ01ER8842')}
              className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold cursor-pointer transition-colors ${
                activePlate === 'GJ01ER8842'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/30'
              }`}
              title="Core Jury Target: Vikram Solanki (Stolen Creta • Sec 302 IPC)"
            >
              GJ01ER8842 (Stolen)
            </button>
            <button
              type="button"
              onClick={() => fetchTrajectory('GJ05CD5678')}
              className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold cursor-pointer transition-colors ${
                activePlate === 'GJ05CD5678'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
              }`}
              title="Suspended Driver License • Active FIR"
            >
              GJ05CD5678 (Suspended)
            </button>
            <button
              type="button"
              onClick={() => fetchTrajectory('GJ27K9012')}
              className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold cursor-pointer transition-colors ${
                activePlate === 'GJ27K9012'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
              }`}
              title="Verified Clean Registration (Clean Vehicle)"
            >
              GJ27K9012 (Clean)
            </button>
          </div>
        </div>

        {/* Right: Threat Alert, Camera Status & Time */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Target Threat Priority Banner */}
          {isCriticalTarget ? (
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs animate-pulse">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <div>
                <div className="font-bold text-[11px] leading-tight">CRITICAL: STOLEN &amp; WANTED</div>
                <div className="text-[9px] text-red-400/80">VAHAN • eGujCop • Sec 302 IPC</div>
              </div>
            </div>
          ) : activePlate === 'GJ05CD5678' || activeTrajectory?.watchlist_status?.threat_level === 'HIGH' ? (
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <div>
                <div className="font-bold text-[11px] leading-tight">HIGH: SUSPENDED DL &amp; FIR</div>
                <div className="text-[9px] text-amber-400/80">SARTHI: SUSPENDED • eGujCop</div>
              </div>
            </div>
          ) : (
            <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-bold text-[11px] leading-tight">NORMAL: CLEAN VEHICLE</div>
                <div className="text-[9px] text-emerald-400/80">VAHAN: Verified Registration</div>
              </div>
            </div>
          )}

          {/* Online Cameras Count (28/30 RTSP LIVE • 78/80 FEDERATED) */}
          <div className="hidden md:flex flex-col items-end px-2.5 py-0.5 bg-[#040711] rounded-lg border border-[#1e293b] text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-emerald-400 font-bold tabular-nums">
                28/30 RTSP LIVE
              </span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span>{onlineFederatedCount}/{totalCamerasCount} FEDERATED • {connectionStatus === 'connected' ? 'WS LIVE' : 'WS RECONN'}</span>
            </div>
          </div>

          {/* Clock */}
          <div className="hidden 2xl:flex flex-col items-end text-slate-400 text-xs font-mono tabular-nums px-2 border-l border-[#1e293b]">
            <div className="flex items-center gap-1 text-slate-300 font-bold">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>{currentTime.split('•')[1] || 'IST'}</span>
            </div>
            <span className="text-[9px] text-slate-500">{currentTime.split('•')[0] || ''}</span>
          </div>

          {/* Tactical Action Triggers */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsDispatchModalOpen(true)}
              className="tactile-active-press flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-red-950/80 cursor-pointer active:scale-95"
              title="Open Tactical PCR Intercept Order"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline">Dispatch</span>
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
              className="tactile-active-press flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-300 font-mono text-xs font-bold transition-all cursor-pointer active:scale-95"
              title="NFSU Forensic Dossier & BSA 2023 §63 Seal"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dossier</span>
            </button>

            <button
              type="button"
              onClick={() => setIsArchModalOpen(true)}
              className="tactile-active-press hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white font-mono text-xs font-bold transition-all cursor-pointer active:scale-95"
              title="View 5-Layer End-to-End System Architecture"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Arch</span>
            </button>

            <ExportButton currentPlate={activePlate} />
          </div>
        </div>
      </header>

      {/* 2. MAIN INTELLIGENCE WORKSPACE (NO LEFT RAIL - 100% WIDTH UTILIZED) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* LEFT COLUMN: 65% Width — GIS Tactical Map (Top 60%) + Live Night CCTV Strip (Bottom 40%) */}
        <div className="w-full lg:w-[65%] h-full flex flex-col border-r border-[#1e293b] overflow-hidden relative">
          {/* Top Section (60% height): GIS Tactical Map */}
          <div className="h-[60%] w-full relative flex flex-col border-b border-[#1e293b]">
            {/* GIS Map Sub-Header Bar */}
            <div className="h-8 bg-[#0a101f] border-b border-[#1e293b] px-3 flex items-center justify-between z-10 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                <span className="font-heading font-bold text-xs tracking-wider text-slate-100 uppercase">
                  LIVE TACTICAL MAP — GUJARAT STATE
                </span>
              </div>

              {/* Department Quick Filter Badges */}
              <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={handleSelectAllDepartments}
                  className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                    selectedDepartments.length === INITIAL_DEPARTMENTS.length
                      ? 'bg-cyan-600 text-slate-950 font-bold'
                      : 'bg-[#121b2d] text-slate-400 hover:text-white border border-[#1e293b]'
                  }`}
                >
                  All ({cameras.length || 28})
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDepartment('Police')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    selectedDepartments.includes('Police')
                      ? 'bg-blue-900/60 border border-blue-500/60 text-blue-300 font-bold'
                      : 'bg-[#121b2d] text-slate-500 border border-[#1e293b]'
                  }`}
                >
                  Police ({deptCounts['Police'] || 12})
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDepartment('Transport (RTO)')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    selectedDepartments.includes('Transport (RTO)')
                      ? 'bg-orange-900/60 border border-orange-500/60 text-orange-300 font-bold'
                      : 'bg-[#121b2d] text-slate-500 border border-[#1e293b]'
                  }`}
                >
                  RTO ({deptCounts['Transport (RTO)'] || 6})
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDepartment('GSRTC')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    selectedDepartments.includes('GSRTC')
                      ? 'bg-emerald-900/60 border border-emerald-500/60 text-emerald-300 font-bold'
                      : 'bg-[#121b2d] text-slate-500 border border-[#1e293b]'
                  }`}
                >
                  GSRTC ({deptCounts['GSRTC'] || 5})
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDepartment('Municipal Corp')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    selectedDepartments.includes('Municipal Corp')
                      ? 'bg-cyan-900/60 border border-cyan-500/60 text-cyan-300 font-bold'
                      : 'bg-[#121b2d] text-slate-500 border border-[#1e293b]'
                  }`}
                >
                  Municipal ({deptCounts['Municipal Corp'] || 3})
                </button>
              </div>

              {/* Active Target Tracking Pill */}
              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                <span className="text-slate-400">TRACKING:</span>
                <span className="text-cyan-300 font-bold bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/60">
                  {activePlate}
                </span>
                <button
                  type="button"
                  onClick={() => setShowFilterModal(!showFilterModal)}
                  className="p-1 rounded bg-[#121b2d] hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-[#1e293b] transition-colors ml-1 cursor-pointer"
                  title="Filter Cameras by Department"
                >
                  <Filter className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Floating Department Filter Modal */}
            {showFilterModal && (
              <div className="absolute top-10 right-3 w-72 z-50 shadow-2xl">
                <CameraFilter
                  cameras={cameras}
                  selectedDepartments={selectedDepartments}
                  onToggleDepartment={handleToggleDepartment}
                  onSelectAll={handleSelectAllDepartments}
                  onClearAll={handleClearAllDepartments}
                />
              </div>
            )}

            {/* Tactical GIS Map Viewport (Dark OpenStreetMap with CSS Inversion) */}
            <div className="flex-1 w-full h-full relative">
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

              {/* Route Details Overlay Box (Bottom-Right of Map) */}
              {activeTrajectory && (
                <div className="absolute bottom-3 right-3 z-[1000] bg-[#0a101f]/90 backdrop-blur-md border border-[#1e293b] rounded-lg p-2.5 font-mono text-[10px] text-slate-300 shadow-2xl pointer-events-none hidden sm:block">
                  <div className="font-bold text-cyan-400 uppercase tracking-wider mb-1">
                    Corridor Reconstruction Details
                  </div>
                  <div className="space-y-0.5">
                    <div><span className="text-slate-500">Corridor:</span> <span className="text-white font-bold">Ahmedabad &rarr; Rajkot (221 km)</span></div>
                    <div><span className="text-slate-500">Estimated Travel:</span> <span className="text-white font-bold">5h 16m</span></div>
                    <div><span className="text-slate-500">Waypoints:</span> <span className="text-cyan-300 font-bold">{activeTrajectory.total_sightings} Sightings</span></div>
                    <div><span className="text-slate-500">Kinematics Avg:</span> <span className="text-emerald-400 font-bold">71.3 km/h</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section (40% height): Live 3-Camera Night CCTV Video Wall */}
          <div className="h-[40%] w-full">
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

        {/* RIGHT COLUMN: 35% Width — SINGLE UNIFIED VERTICALLY SCROLLABLE INTELLIGENCE FEED (NO TABS) */}
        <div className="w-full lg:w-[35%] h-full bg-[#0a101f] flex flex-col overflow-y-auto p-3 gap-3 tactical-scrollbar select-none">
          {/* Active Urgent Alert Dispatch Notification Card (When alert is clicked) */}
          {selectedAlert && (
            <div className="shrink-0">
              <PCRDispatchCard
                alert={selectedAlert}
                onClose={() => setSelectedAlert(null)}
                onFocusMap={(lat, lng) => setFlyToLocation({ lat, lng, zoom: 14 })}
              />
            </div>
          )}

          {/* Section 1: ML Pipeline Quick Stats */}
          <div className="bg-[#040711] border border-[#1e293b] rounded-lg p-3 shrink-0 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>ML Pipeline Telemetry</span>
              </div>
              <span className="text-[9px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.5 rounded font-bold">
                Dual-Stage Edge AI
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono bg-[#121b2d] p-2 rounded border border-[#1e293b] mb-2.5">
              <span className="text-white font-bold">21.6ms</span>
              <span className="text-slate-600">|</span>
              <span className="text-white font-bold">64 FPS</span>
              <span className="text-slate-600">|</span>
              <span className="text-emerald-400 font-bold">EDGE READY</span>
            </div>
            {/* Plate Crop Preview */}
            <div className="flex items-center gap-2.5 p-2 bg-[#121b2d] rounded border border-[#1e293b]">
              <img 
                src={enhancedPlateImg} 
                alt="Plate Crop" 
                className="h-8 border border-cyan-500/50 rounded filter contrast-150 brightness-110 object-contain" 
              />
              <div>
                <div className="font-plate text-sm text-cyan-300 font-bold tracking-[0.2em]">{activePlate}</div>
                <div className="text-[9px] font-mono text-emerald-400 font-semibold">10/10 Chars Verified • 5/5 Kalman Lock</div>
              </div>
            </div>
          </div>

          {/* Section 2: 5-Database Law Enforcement Correlation Dossier (ALWAYS VISIBLE, NO TABS) */}
          <div className="bg-[#040711] border border-[#1e293b] rounded-lg p-3 shrink-0 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                <span>5-Database Correlation Dossier</span>
              </div>
              <span className="text-[9px] font-mono text-emerald-400 font-bold">1.2ms (Total)</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between items-center p-1.5 rounded border border-[#1e293b] bg-[#121b2d]">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">1. VAHAN</span>
                  <span className="text-[9px] text-slate-500">(Vehicle Registry)</span>
                </div>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                  isCriticalTarget
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {isCriticalTarget ? 'STOLEN' : 'VERIFIED'}
                </span>
              </div>
              <div className="flex justify-between items-center p-1.5 rounded border border-[#1e293b] bg-[#121b2d]">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">2. SARTHI</span>
                  <span className="text-[9px] text-slate-500">(DL Registry)</span>
                </div>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                  activePlate === 'GJ01ER8842' || activePlate === 'GJ05CD5678'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {activePlate === 'GJ01ER8842' || activePlate === 'GJ05CD5678' ? 'SUSPENDED' : 'VALID DL'}
                </span>
              </div>
              <div className="flex justify-between items-center p-1.5 rounded border border-[#1e293b] bg-[#121b2d]">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">3. eGujCop</span>
                  <span className="text-[9px] text-slate-500">(Police CCTNS)</span>
                </div>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                  isCriticalTarget
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                    : activePlate === 'GJ05CD5678'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {isCriticalTarget ? 'WANTED Sec 302' : activePlate === 'GJ05CD5678' ? 'OPEN FIR' : 'NO RECORD'}
                </span>
              </div>
              <div className="flex justify-between items-center p-1.5 rounded border border-[#1e293b] bg-[#121b2d]">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">4. AFIS</span>
                  <span className="text-[9px] text-slate-500">(State Biometrics)</span>
                </div>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                  isCriticalTarget
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {isCriticalTarget ? 'MATCH #AF-8942' : 'NO RECORD'}
                </span>
              </div>
              <div className="flex justify-between items-center p-1.5 rounded border border-[#1e293b] bg-[#121b2d]">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">5. NAFIS</span>
                  <span className="text-[9px] text-slate-500">(National Biometrics)</span>
                </div>
                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                  isCriticalTarget
                    ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {isCriticalTarget ? 'FUGITIVE' : 'CLEAN'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 3: Route Summary (Trajectory Reconstruction) */}
          <div className="bg-[#040711] border border-[#1e293b] rounded-lg p-3 shrink-0 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                <span>Route Summary</span>
              </div>
              <span className="text-[9px] font-mono text-slate-400">
                {activeTrajectory?.total_sightings || 7} Sightings
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300 bg-[#121b2d] p-2.5 rounded border border-[#1e293b]">
              <div>Corridor: <span className="text-white font-bold">221 km</span></div>
              <div>Travel Time: <span className="text-white font-bold">5h 16m</span></div>
              <div>Waypoints: <span className="text-cyan-300 font-bold">{activeTrajectory?.total_sightings || 7} pts</span></div>
              <div>Avg Speed: <span className="text-emerald-400 font-bold">71.3 km/h</span></div>
            </div>
          </div>

          {/* Section 4: Forensic & Dispatch Action Buttons */}
          <div className="grid grid-cols-2 gap-2 shrink-0">
            <button 
              type="button"
              onClick={() => {
                const latest = activeTrajectory?.sightings?.[activeTrajectory.sightings.length - 1] || null;
                setForensicSighting(latest);
                setForensicAlert(null);
                setForensicPlate(activePlate);
                setIsForensicOpen(true);
              }} 
              className="p-2.5 bg-[#121b2d] hover:bg-cyan-950/60 border border-cyan-500/40 hover:border-cyan-400 rounded-lg text-cyan-300 font-mono text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-md transition-all"
              title="Open Tamper-Evident Forensic Dossier under BSA 2023 §63"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Forensic Dossier</span>
            </button>
            <button 
              type="button"
              onClick={() => setIsDispatchModalOpen(true)} 
              className="p-2.5 bg-red-600 hover:bg-red-500 rounded-lg text-white font-mono text-xs font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-red-950 active:scale-95 cursor-pointer transition-all"
              title="Dispatch PCR Intercept Units"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>PCR Dispatch</span>
            </button>
          </div>

          {/* Section 5: Latest 5 Alerts */}
          <div className="bg-[#040711] border border-[#1e293b] rounded-lg p-3 shrink-0 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-cyan-400" />
                <span>Latest Alerts</span>
              </div>
              <span className="text-[9px] font-mono text-red-400 font-bold">
                {criticalAlertCount} Critical
              </span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto tactical-scrollbar text-[11px] font-mono">
              {alerts.slice(0, 5).map((alert, i) => (
                <div 
                  key={alert.alert_id || i} 
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedAlert(alert);
                    fetchTrajectory(alert.detected_plate);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedAlert(alert);
                      fetchTrajectory(alert.detected_plate);
                    }
                  }}
                  className="flex items-center justify-between p-1.5 rounded border border-[#1e293b] hover:border-cyan-500/60 bg-[#121b2d] hover:bg-[#1a263d] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      alert.threat_level === 'CRITICAL' ? 'bg-red-500 animate-pulse' : alert.threat_level === 'HIGH' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    <span className="text-slate-400 truncate text-[10px]">{alert.camera_id}</span>
                    <span className="text-white font-bold">{alert.detected_plate}</span>
                  </div>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                    alert.threat_level === 'CRITICAL'
                      ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                      : alert.threat_level === 'HIGH'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {alert.threat_level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. TACTICAL STATUS FOOTER BAR */}
      <footer className="h-8 bg-[#0a0f1d] border-t border-[#1e293b] px-4 flex items-center justify-between text-xs font-mono shrink-0 z-30">
        <div className="flex items-center gap-4 text-slate-400 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-bold tabular-nums">28/30 RTSP LIVE</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 font-bold">{onlineFederatedCount}/{totalCamerasCount} FEDERATED</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-slate-600">•</span>
            <span>CRITICAL ALERTS:</span>
            <span className="text-red-400 font-bold tabular-nums">{criticalAlertCount}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-slate-600">•</span>
            <span>TRACKING TARGET:</span>
            <span className="text-cyan-300 font-plate font-bold tracking-[0.2em]">{activePlate}</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5">
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              BSA 2023 §63 PRIMARY ELECTRONIC EVIDENCE SEAL
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400 hidden xl:inline font-mono text-[11px]">
            NFSU DIGITAL FORENSIC LOG TAMPER-EVIDENT
          </span>
          <ExportButton currentPlate={activePlate} />
        </div>
      </footer>

      {/* 4. MODALS & DRAWERS */}
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
