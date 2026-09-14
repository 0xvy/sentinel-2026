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
import { AlertFeed } from './components/AlertFeed';
import { TrajectoryPanel } from './components/TrajectoryPanel';
import { CameraFilter } from './components/CameraFilter';
import { PCRDispatchCard } from './components/PCRDispatchCard';
import { ExportButton } from './components/ExportButton';
import { ForensicDrawer } from './components/ForensicDrawer';
import { MLTelemetryPanel } from './components/MLTelemetryPanel';
import { PCRDispatchModal } from './components/PCRDispatchModal';
import { ArchitectureModal } from './components/ArchitectureModal';
import { LiveCCTVStrip } from './components/LiveCCTVStrip';
import { CorrelationMatrix } from './components/CorrelationMatrix';
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
  Database,
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
  const [rightPanelTab, setRightPanelTab] = useState<'telemetry' | 'correlation' | 'trajectory' | 'alerts'>('telemetry');
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

  // Clock updater (IST format: 14-09-2026 21:08:07 IST SAT)
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

      // Auto center map on the latest sighting in trajectory
      if (data && data.sightings && data.sightings.length > 0) {
        const latest = data.sightings[data.sightings.length - 1];
        setFlyToLocation({ lat: latest.lat, lng: latest.lng, zoom: 12 });
      }
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

  // Handle alert selection
  const handleSelectAlert = (alert: AlertEvent) => {
    setSelectedAlert(alert);
    if (alert.camera_lat && alert.camera_lng) {
      setFlyToLocation({ lat: alert.camera_lat, lng: alert.camera_lng, zoom: 14 });
    }
  };

  // Handle waypoint click in trajectory panel or map
  const handleSelectWaypoint = (sighting: Sighting) => {
    setSelectedSighting(sighting);
    setFlyToLocation({ lat: sighting.lat, lng: sighting.lng, zoom: 14 });
  };

  // Quick select plate
  const handleSelectPlate = (plate: string) => {
    fetchTrajectory(plate);
  };

  // Open Forensic Deep-Dive Drawer
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

  // Counts & status
  const criticalAlertCount = alerts.filter((a) => a.threat_level === 'CRITICAL').length;
  const onlineCamerasCount = cameras.filter((c) => c.status === 'Online').length;
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
    <div className="flex flex-col h-screen w-screen bg-[#070b14] text-[#f9fafb] font-sans select-none overflow-hidden">
      {/* 1. TOP COMMAND HEADER */}
      <header className="h-16 bg-[#0a0f1d] border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between z-30 shadow-2xl shrink-0 gap-2">
        {/* Left: Gujarat Police Emblem & Command Header */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/90 border border-cyan-500/60 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950/60">
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

        {/* Center: Search Bar with Clean Presets Row Below */}
        <div className="flex-1 max-w-xl mx-2 flex flex-col justify-center">
          <PlateSearch
            activePlate={activePlate}
            onSelectPlate={fetchTrajectory}
            isLoadingTrajectory={isLoadingTrajectory}
            showPresets={true}
          />
        </div>

        {/* Right: Threat Alert, Camera Status & Time */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Target Threat Priority Banner */}
          {isCriticalTarget && (
            <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-lg bg-red-950/70 border border-red-500/80 text-red-300 font-mono text-xs animate-pulse">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <div>
                <div className="font-bold text-[11px] leading-tight">CRITICAL: STOLEN &amp; WANTED</div>
                <div className="text-[9px] text-red-400/80">VAHAN • eGujCop • Sec 302 IPC</div>
              </div>
            </div>
          )}

          {/* Online Cameras Count (28/30 RTSP LIVE • 78/80 FEDERATED) */}
          <div className="hidden md:flex flex-col items-end px-2.5 py-1 bg-[#070b14] rounded-lg border border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-emerald-400 font-bold tabular-nums">
                {onlineCamerasCount || 28}/30 RTSP LIVE
              </span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              <span>78/80 FEDERATED • {connectionStatus === 'connected' ? 'WS LIVE' : 'WS RECONN'}</span>
            </div>
          </div>

          {/* Clock */}
          <div className="hidden 2xl:flex flex-col items-end text-slate-400 text-xs font-mono tabular-nums px-2 border-l border-slate-800">
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
        {/* LEFT COLUMN: 63% Width — GIS Tactical Map (Top 60%) + Live Night CCTV Strip (Bottom 40%) */}
        <div className="w-full lg:w-[63%] h-full flex flex-col border-r border-slate-800 overflow-hidden relative">
          {/* Top Section (60% height): GIS Tactical Map */}
          <div className="h-[60%] w-full relative flex flex-col border-b border-slate-800">
            {/* GIS Map Sub-Header Bar */}
            <div className="h-8 bg-[#0a0f1d] border-b border-slate-800/80 px-3 flex items-center justify-between z-10 shrink-0">
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
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
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
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  Police ({deptCounts['Police'] || 12})
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDepartment('Transport (RTO)')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    selectedDepartments.includes('Transport (RTO)')
                      ? 'bg-purple-900/60 border border-purple-500/60 text-purple-300 font-bold'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
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
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
                  }`}
                >
                  GSRTC ({deptCounts['GSRTC'] || 5})
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDepartment('Municipal Corp')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                    selectedDepartments.includes('Municipal Corp')
                      ? 'bg-amber-900/60 border border-amber-500/60 text-amber-300 font-bold'
                      : 'bg-slate-900 text-slate-500 border border-slate-800'
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
                  className="p-1 rounded bg-[#0d1424] hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-700 transition-colors ml-1"
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

            {/* Tactical GIS Map Viewport */}
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
                <div className="absolute bottom-3 right-3 z-[1000] bg-[#0a0f1d]/90 backdrop-blur-md border border-slate-800 rounded-lg p-2.5 font-mono text-[10px] text-slate-300 shadow-2xl pointer-events-none hidden sm:block">
                  <div className="font-bold text-cyan-400 uppercase tracking-wider mb-1">
                    Route Reconstruction Details
                  </div>
                  <div className="space-y-0.5">
                    <div><span className="text-slate-500">Total Corridor:</span> <span className="text-white font-bold">221 km</span></div>
                    <div><span className="text-slate-500">Estimated Travel:</span> <span className="text-white font-bold">3h 10m</span></div>
                    <div><span className="text-slate-500">Waypoints:</span> <span className="text-cyan-300 font-bold">{activeTrajectory.total_sightings} Sighting Nodes</span></div>
                    <div><span className="text-slate-500">Kinematics Avg:</span> <span className="text-emerald-400 font-bold">71.2 km/h</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Section (40% height): Live 3-Camera Night CCTV Strip */}
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

        {/* RIGHT COLUMN: 37% Width — ML Telemetry, 5-DB Correlation Dossier, Trajectory, and Live Alert Feed */}
        <div className="w-full lg:w-[37%] h-full flex flex-col bg-[#070b14] overflow-hidden p-2.5 gap-2.5">
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

          {/* Tactical Tab Switcher */}
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 shrink-0 font-mono text-xs">
            <button
              type="button"
              onClick={() => setRightPanelTab('telemetry')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
                rightPanelTab === 'telemetry'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/60 shadow-md shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>ML Vision</span>
            </button>

            <button
              type="button"
              onClick={() => setRightPanelTab('correlation')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
                rightPanelTab === 'correlation'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/60 shadow-md shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>5-DB Dossier</span>
            </button>

            <button
              type="button"
              onClick={() => setRightPanelTab('trajectory')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-95 ${
                rightPanelTab === 'trajectory'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/60 shadow-md shadow-cyan-950/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Trail ({activeTrajectory?.total_sightings || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setRightPanelTab('alerts')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all relative cursor-pointer active:scale-95 ${
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

          {/* Tab Content Display */}
          <div className="flex-1 min-h-0 overflow-y-auto tactical-scrollbar">
            {rightPanelTab === 'telemetry' ? (
              <div className="flex flex-col gap-2.5 h-full">
                <div className="flex-1 min-h-[360px]">
                  <MLTelemetryPanel
                    activePlate={activePlate}
                    isScanning={isLoadingTrajectory}
                    onRefresh={() => fetchTrajectory(activePlate)}
                  />
                </div>
                <div className="shrink-0">
                  <CorrelationMatrix
                    activePlate={activePlate}
                    onOpenDispatch={() => setIsDispatchModalOpen(true)}
                    onOpenForensic={() => {
                      const latest = activeTrajectory?.sightings?.[activeTrajectory.sightings.length - 1] || null;
                      setForensicSighting(latest);
                      setForensicAlert(null);
                      setForensicPlate(activePlate);
                      setIsForensicOpen(true);
                    }}
                  />
                </div>
              </div>
            ) : rightPanelTab === 'correlation' ? (
              <div className="h-full">
                <CorrelationMatrix
                  activePlate={activePlate}
                  onOpenDispatch={() => setIsDispatchModalOpen(true)}
                  onOpenForensic={() => {
                    const latest = activeTrajectory?.sightings?.[activeTrajectory.sightings.length - 1] || null;
                    setForensicSighting(latest);
                    setForensicAlert(null);
                    setForensicPlate(activePlate);
                    setIsForensicOpen(true);
                  }}
                />
              </div>
            ) : rightPanelTab === 'trajectory' ? (
              <TrajectoryPanel
                trajectory={activeTrajectory}
                onSelectWaypoint={handleSelectWaypoint}
                selectedWaypointId={selectedSighting?.sighting_id}
                onClose={() => setRightPanelTab('telemetry')}
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
