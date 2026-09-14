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
import { PlateSearch } from './components/PlateSearch';
import { AlertFeed } from './components/AlertFeed';
import { TrajectoryPanel } from './components/TrajectoryPanel';
import { CameraFilter } from './components/CameraFilter';
import { PCRDispatchCard } from './components/PCRDispatchCard';
import { VideoWall } from './components/VideoWall';
import { ExportButton } from './components/ExportButton';
import { ForensicDrawer } from './components/ForensicDrawer';
import { MLTelemetryPanel } from './components/MLTelemetryPanel';
import { PCRDispatchModal } from './components/PCRDispatchModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { 
  Map as MapIcon, 
  Video, 
  Zap, 
  Navigation, 
  Bell, 
  FileText, 
  Radio, 
  Layers, 
  Shield, 
  ShieldAlert, 
  CheckCircle2
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
  const [activePlate, setActivePlate] = useState<string>('GJ01ER8842'); // Primary suspect
  const [activeTrajectory, setActiveTrajectory] = useState<TrajectoryResponse | null>(null);
  const [isLoadingTrajectory, setIsLoadingTrajectory] = useState<boolean>(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertEvent | null>(null);
  const [selectedSighting, setSelectedSighting] = useState<Sighting | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'videowall'>('map');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [rightPanelTab, setRightPanelTab] = useState<'telemetry' | 'trajectory' | 'alerts'>('telemetry');
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

  // Clock updater (IST)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) +
        ' • ' +
        now.toLocaleTimeString() +
        ' IST'
      );
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

      // Auto fly map to the latest sighting in the trajectory
      if (data && data.sightings && data.sightings.length > 0) {
        const latest = data.sightings[data.sightings.length - 1];
        setFlyToLocation({ lat: latest.lat, lng: latest.lng, zoom: 13 });
      }
    } catch (err) {
      console.error('Failed to load trajectory for plate:', plate, err);
    } finally {
      setIsLoadingTrajectory(false);
    }
  }, []);

  // Load initial trajectory for demo plate GJ01ER8842
  useEffect(() => {
    fetchTrajectory('GJ01ER8842');
  }, [fetchTrajectory]);

  // Handle department toggles
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

  // Handle alert selection
  const handleSelectAlert = (alert: AlertEvent) => {
    setSelectedAlert(alert);
    if (alert.camera_lat && alert.camera_lng) {
      setFlyToLocation({ lat: alert.camera_lat, lng: alert.camera_lng, zoom: 15 });
    }
  };

  // Handle waypoint click in trajectory panel
  const handleSelectWaypoint = (sighting: Sighting) => {
    setSelectedSighting(sighting);
    setFlyToLocation({ lat: sighting.lat, lng: sighting.lng, zoom: 15 });
  };

  // Quick select plate from alert card
  const handleSelectPlate = (plate: string) => {
    fetchTrajectory(plate);
  };

  // Open Forensic Deep-Dive Drawer handlers
  const handleOpenForensicSighting = (sighting: Sighting) => {
    setForensicSighting(sighting);
    setForensicAlert(null);
    setForensicPlate(activePlate);
    setIsForensicOpen(true);
  };

  const handleOpenForensicAlert = (alert: AlertEvent) => {
    setForensicAlert(alert);
    setForensicSighting(null);
    setForensicPlate(alert.detected_plate);
    setIsForensicOpen(true);
  };

  // Counts for tactical HUD
  const criticalAlertCount = alerts.filter((a) => a.threat_level === 'CRITICAL').length;
  const onlineCamerasCount = cameras.filter((c) => c.status === 'Online').length;
  const isCriticalTarget = activePlate === 'GJ01ER8842' || activeTrajectory?.watchlist_status?.threat_level === 'CRITICAL';

  return (
    <div className="flex flex-col h-screen w-screen bg-[#070b14] text-[#f9fafb] font-sans select-none overflow-hidden">
      {/* 1. TOP COMMAND HEADER */}
      <header className="h-14 bg-[#0a0f1d] border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between z-30 shadow-xl shrink-0 gap-2">
        {/* Left: Emblem & Platform Title */}
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
            <p className="text-[10px] text-slate-400 hidden lg:block tracking-wide font-mono">
              Statewide CCTV Intelligence Grid • 80,000 Cameras Integrated
            </p>
          </div>
        </div>

        {/* Center: Search Bar with Autocomplete & Presets */}
        <div className="flex-1 max-w-xl mx-2">
          <PlateSearch
            activePlate={activePlate}
            onSelectPlate={fetchTrajectory}
            isLoadingTrajectory={isLoadingTrajectory}
          />
        </div>

        {/* Right: Threat Alert, Camera Status & Time */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Target Threat Priority Banner */}
          {isCriticalTarget && (
            <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-lg bg-red-950/60 border border-red-500/80 text-red-300 font-mono text-xs animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span className="font-bold">CRITICAL: STOLEN &amp; WANTED</span>
              <span className="text-[10px] text-red-400 opacity-80">(Sec 302 IPC)</span>
            </div>
          )}

          {/* Online Cameras Count */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#070b14] rounded-lg border border-slate-800 text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">NODES:</span>
            <span className="text-emerald-400 font-bold tabular-nums">
              {onlineCamerasCount || 28}/30 LIVE
            </span>
          </div>

          {/* WebSocket Status Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-[#070b14] rounded-lg border border-slate-800 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
            <span className="text-slate-400 uppercase">{connectionStatus === 'connected' ? 'WS LIVE' : 'WS RECONN'}</span>
          </div>

          {/* Clock */}
          <div className="hidden lg:block text-slate-400 text-xs font-mono tabular-nums px-2">
            {currentTime || 'Clock Sync...'}
          </div>

          {/* Action Triggers */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsDispatchModalOpen(true)}
              className="tactile-active-press flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600/90 hover:bg-red-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-red-950/80 cursor-pointer active:scale-95"
              title="Open Tactical PCR Dispatch Order"
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
              title="NFSU Forensic Dossier & Legal Admissibility Seal"
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

      {/* 2. MAIN SPLIT BODY WITH LEFT TACTICAL RAIL */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT TACTICAL NAVIGATION RAIL (Mockup 1 & 10) */}
        <aside className="w-14 bg-[#0a0f1d] border-r border-slate-800 flex flex-col items-center justify-between py-3 shrink-0 z-20">
          <div className="flex flex-col items-center gap-3 w-full">
            {/* GIS Tactical Map Mode */}
            <button
              onClick={() => setViewMode('map')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                viewMode === 'map'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/60 shadow-lg shadow-cyan-950/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="GIS Tactical Map"
            >
              <MapIcon className="w-5 h-5" />
            </button>

            {/* Video Wall Mode */}
            <button
              onClick={() => setViewMode('videowall')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                viewMode === 'videowall'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/60 shadow-lg shadow-cyan-950/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="4-Grid Live CCTV Video Wall"
            >
              <Video className="w-5 h-5" />
            </button>

            <div className="w-6 h-[1px] bg-slate-800 my-1" />

            {/* Switch to ML Telemetry */}
            <button
              onClick={() => setRightPanelTab('telemetry')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                rightPanelTab === 'telemetry'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/60 shadow-lg shadow-cyan-950/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="SpaceX-Style ML Pipeline Telemetry"
            >
              <Zap className="w-5 h-5" />
            </button>

            {/* Switch to Trajectory */}
            <button
              onClick={() => setRightPanelTab('trajectory')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                rightPanelTab === 'trajectory'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/60 shadow-lg shadow-cyan-950/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Chronological Trajectory & Kinematics"
            >
              <Navigation className="w-5 h-5" />
            </button>

            {/* Switch to Live Alerts */}
            <button
              onClick={() => setRightPanelTab('alerts')}
              className={`w-10 h-10 rounded-xl flex items-center justify-center relative transition-all cursor-pointer ${
                rightPanelTab === 'alerts'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/60 shadow-lg shadow-cyan-950/60'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title="Live WebSocket Alert Feed"
            >
              <Bell className="w-5 h-5" />
              {criticalAlertCount > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>

            <div className="w-6 h-[1px] bg-slate-800 my-1" />

            {/* Architecture Modal Trigger */}
            <button
              onClick={() => setIsArchModalOpen(true)}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition-all cursor-pointer"
              title="System Architecture Diagram"
            >
              <Layers className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest -rotate-90 origin-center my-6 whitespace-nowrap">
              GUJARAT
            </div>
            <div className="w-7 h-7 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[9px] font-mono text-cyan-400 font-bold">
              GP
            </div>
          </div>
        </aside>

        {/* WORKSPACE CONTENT AREA (Map/VideoWall on Left, Telemetry/Trajectory on Right) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* LEFT PANEL: 60% Width — GIS Map or Video Wall */}
          <div className="w-full md:w-[60%] h-1/2 md:h-full flex flex-col relative border-r border-slate-800">
            {viewMode === 'map' ? (
              <div className="relative w-full h-full">
                <GISMap
                  cameras={cameras}
                  selectedDepartments={selectedDepartments}
                  activeTrajectory={activeTrajectory}
                  selectedSighting={selectedSighting}
                  flyToLocation={flyToLocation}
                  onSelectCamera={(cam) => {
                    setFlyToLocation({ lat: cam.lat, lng: cam.lng, zoom: 15 });
                  }}
                  onSelectSighting={handleSelectWaypoint}
                />

                {/* Floating Agency Filter Toggle Button */}
                <div className="absolute top-3 right-3 z-[1000]">
                  <button
                    type="button"
                    onClick={() => setShowFilterModal(!showFilterModal)}
                    className="px-3 py-1.5 rounded-lg bg-[#0d1424]/90 border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 font-bold text-xs shadow-xl backdrop-blur flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  >
                    <span>Agencies ({selectedDepartments.length}/8)</span>
                  </button>

                  {showFilterModal && (
                    <div className="absolute top-full right-0 mt-2 w-72 z-50">
                      <CameraFilter
                        cameras={cameras}
                        selectedDepartments={selectedDepartments}
                        onToggleDepartment={handleToggleDepartment}
                        onSelectAll={handleSelectAllDepartments}
                        onClearAll={handleClearAllDepartments}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <VideoWall
                cameras={cameras}
                onSelectCamera={(cam) => {
                  setViewMode('map');
                  setFlyToLocation({ lat: cam.lat, lng: cam.lng, zoom: 15 });
                }}
              />
            )}
          </div>

          {/* RIGHT PANEL: 40% Width — Tabs for ML Telemetry, Trajectory, and Live Alerts */}
          <div className="w-full md:w-[40%] h-1/2 md:h-full flex flex-col bg-[#070b14] overflow-hidden p-3 gap-3">
            {/* Active Urgent Alert Dispatch Notification Card */}
            {selectedAlert && (
              <div className="shrink-0">
                <PCRDispatchCard
                  alert={selectedAlert}
                  onClose={() => setSelectedAlert(null)}
                  onFocusMap={(lat, lng) => setFlyToLocation({ lat, lng, zoom: 15 })}
                />
              </div>
            )}

            {/* Tab Switcher */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 shrink-0">
              <button
                type="button"
                onClick={() => setRightPanelTab('telemetry')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
                  rightPanelTab === 'telemetry'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/60 shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>ML Vision Telemetry</span>
              </button>

              <button
                type="button"
                onClick={() => setRightPanelTab('trajectory')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
                  rightPanelTab === 'trajectory'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/60 shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Trajectory ({activeTrajectory?.total_sightings || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setRightPanelTab('alerts')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all relative cursor-pointer active:scale-95 ${
                  rightPanelTab === 'alerts'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/60 shadow-md shadow-cyan-950/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Alerts ({alerts.length})</span>
                {criticalAlertCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute -top-0.5 -right-0.5" />
                )}
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {rightPanelTab === 'telemetry' ? (
                <MLTelemetryPanel
                  activePlate={activePlate}
                  isScanning={isLoadingTrajectory}
                  onRefresh={() => fetchTrajectory(activePlate)}
                />
              ) : rightPanelTab === 'trajectory' ? (
                <TrajectoryPanel
                  trajectory={activeTrajectory}
                  onSelectWaypoint={handleSelectWaypoint}
                  selectedWaypointId={selectedSighting?.sighting_id}
                  onClose={() => setRightPanelTab('alerts')}
                  onOpenForensicDrawer={handleOpenForensicSighting}
                />
              ) : (
                <AlertFeed
                  alerts={alerts}
                  selectedAlert={selectedAlert}
                  onSelectAlert={handleSelectAlert}
                  onSelectPlate={handleSelectPlate}
                  onOpenForensicDrawer={handleOpenForensicAlert}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. TACTICAL STATUS FOOTER BAR */}
      <footer className="h-8 bg-[#0a0f1d] border-t border-slate-800 px-4 flex items-center justify-between text-xs font-mono shrink-0 z-30">
        <div className="flex items-center gap-4 text-slate-400 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>CAMERAS:</span>
            <span className="text-white font-bold tabular-nums">
              {onlineCamerasCount || 28}/30 ONLINE
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-slate-600">•</span>
            <span>CRITICAL ALERTS:</span>
            <span className="text-rose-400 font-bold tabular-nums">{criticalAlertCount}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-slate-600">•</span>
            <span>TRACKING TARGET:</span>
            <span className="text-cyan-300 font-plate font-bold tracking-wider">{activePlate}</span>
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
