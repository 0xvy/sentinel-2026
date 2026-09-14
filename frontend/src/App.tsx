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
  const { alerts } = useAlertWebSocket();

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
      {/* 1. TOP COMMAND HEADER — Height 56px (h-14), full width */}
      <header className="h-14 bg-[#0a101f] border-b border-[#1e293b] px-3 flex items-center justify-between z-30 shrink-0 gap-3">
        {/* Left: Gujarat Police Emblem & Title */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#040711] border border-[#1e293b] flex items-center justify-center text-cyan-400">
            <Shield className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-extrabold text-xs tracking-wider text-white">
                SENTINEL <span className="text-cyan-400 font-mono">2026</span>
              </h1>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest hidden md:inline-block">
                GUJARAT POLICE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden lg:block tracking-wide">
              Statewide Surveillance Command
            </p>
          </div>
        </div>

        {/* Center: Search Bar with Clean Presets Directly Below */}
        <div className="flex-1 max-w-xl mx-2 flex flex-col justify-center">
          <PlateSearch
            activePlate={activePlate}
            onSelectPlate={fetchTrajectory}
            isLoadingTrajectory={isLoadingTrajectory}
            showPresets={false}
          />
          <div className="flex items-center gap-2 mt-0">
            <span className="text-[10px] uppercase tracking-widest font-mono text-slate-400 font-bold">PRESETS:</span>
            <button
              type="button"
              onClick={() => fetchTrajectory('GJ01ER8842')}
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                activePlate === 'GJ01ER8842'
                  ? 'bg-[#1e293b] text-red-400 border-red-500/50'
                  : 'bg-transparent text-slate-400 border-[#1e293b] hover:text-white'
              }`}
              title="Core Jury Target: Vikram Solanki (Stolen Creta • Sec 302 IPC)"
            >
              GJ01ER8842 (Stolen)
            </button>
            <button
              type="button"
              onClick={() => fetchTrajectory('GJ05CD5678')}
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                activePlate === 'GJ05CD5678'
                  ? 'bg-[#1e293b] text-amber-400 border-amber-500/50'
                  : 'bg-transparent text-slate-400 border-[#1e293b] hover:text-white'
              }`}
              title="Suspended Driver License • Active FIR"
            >
              GJ05CD5678 (Suspended)
            </button>
            <button
              type="button"
              onClick={() => fetchTrajectory('GJ27K9012')}
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                activePlate === 'GJ27K9012'
                  ? 'bg-[#1e293b] text-emerald-400 border-emerald-500/50'
                  : 'bg-transparent text-slate-400 border-[#1e293b] hover:text-white'
              }`}
              title="Verified Clean Registration (Clean Vehicle)"
            >
              GJ27K9012 (Clean)
            </button>
          </div>
        </div>

        {/* Right: Target Threat Status, LIVE Indicator, Time & Action Buttons */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Target Threat Priority (Rule 4: transparent bg with colored text, NO pulse) */}
          {isCriticalTarget ? (
            <div className="hidden xl:flex items-center gap-1.5 text-red-400 font-mono text-xs font-bold">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>CRITICAL: STOLEN &amp; WANTED</span>
            </div>
          ) : activePlate === 'GJ05CD5678' || activeTrajectory?.watchlist_status?.threat_level === 'HIGH' ? (
            <div className="hidden xl:flex items-center gap-1.5 text-amber-400 font-mono text-xs font-bold">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>HIGH: SUSPENDED DL</span>
            </div>
          ) : (
            <div className="hidden xl:flex items-center gap-1.5 text-emerald-400 font-mono text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>NORMAL: CLEAN</span>
            </div>
          )}

          {/* Online Cameras Count — THE ONLY GREEN DOT WITH ANIMATE-PULSE IN ENTIRE APP */}
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-[#040711] rounded-lg border border-[#1e293b] text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-emerald-400 font-bold tabular-nums">28/30 RTSP LIVE</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">{onlineFederatedCount}/{totalCamerasCount} FEDERATED</span>
          </div>

          {/* Clock */}
          <div className="hidden 2xl:flex items-center gap-1.5 text-slate-400 text-xs font-mono tabular-nums px-2 border-l border-[#1e293b]">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-white font-bold">{currentTime.split('•')[1]?.trim() || 'IST'}</span>
          </div>

          {/* Tactical Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsDispatchModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-colors cursor-pointer"
              title="Open Tactical PCR Intercept Order"
            >
              <Radio className="w-3.5 h-3.5" />
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#040711] hover:bg-[#1e293b] border border-[#1e293b] text-white font-mono text-xs font-bold transition-colors cursor-pointer"
              title="NFSU Forensic Dossier & BSA 2023 §63 Seal"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Dossier</span>
            </button>

            <button
              type="button"
              onClick={() => setIsArchModalOpen(true)}
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#040711] hover:bg-[#1e293b] border border-[#1e293b] text-white font-mono text-xs font-bold transition-colors cursor-pointer"
              title="View 5-Layer End-to-End System Architecture"
            >
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Arch</span>
            </button>

            <ExportButton currentPlate={activePlate} />
          </div>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE (Rule 5: Left Column flex-1, Right Column exactly w-[340px] shrink-0) */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* LEFT COLUMN: Map flex-1 + Video Strip fixed h-[200px] shrink-0 */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top: GIS Tactical Map (flex-1 min-h-0) */}
          <div className="flex-1 min-h-0 relative flex flex-col border-b border-[#1e293b]">
            {/* GIS Map Subheader Bar */}
            <div className="h-8 bg-[#0a101f] border-b border-[#1e293b] px-3 flex items-center justify-between z-10 shrink-0">
              <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                LIVE TACTICAL MAP &mdash; GUJARAT STATE
              </div>

              {/* Department Quick Filter Buttons */}
              <div className="hidden sm:flex items-center gap-1 text-xs font-mono">
                <button
                  type="button"
                  onClick={handleSelectAllDepartments}
                  className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    selectedDepartments.length === INITIAL_DEPARTMENTS.length
                      ? 'bg-[#1e293b] text-white border-slate-600 font-bold'
                      : 'bg-transparent text-slate-400 border-[#1e293b] hover:text-white'
                  }`}
                >
                  All ({cameras.length || 28})
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDepartment('Police')}
                  className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    selectedDepartments.includes('Police')
                      ? 'bg-[#1e293b] text-white border-slate-600 font-bold'
                      : 'bg-transparent text-slate-400 border-[#1e293b] hover:text-white'
                  }`}
                >
                  Police ({deptCounts['Police'] || 12})
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDepartment('Transport (RTO)')}
                  className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    selectedDepartments.includes('Transport (RTO)')
                      ? 'bg-[#1e293b] text-white border-slate-600 font-bold'
                      : 'bg-transparent text-slate-400 border-[#1e293b] hover:text-white'
                  }`}
                >
                  RTO ({deptCounts['Transport (RTO)'] || 6})
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDepartment('GSRTC')}
                  className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    selectedDepartments.includes('GSRTC')
                      ? 'bg-[#1e293b] text-white border-slate-600 font-bold'
                      : 'bg-transparent text-slate-400 border-[#1e293b] hover:text-white'
                  }`}
                >
                  GSRTC ({deptCounts['GSRTC'] || 5})
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleDepartment('Municipal Corp')}
                  className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    selectedDepartments.includes('Municipal Corp')
                      ? 'bg-[#1e293b] text-white border-slate-600 font-bold'
                      : 'bg-transparent text-slate-400 border-[#1e293b] hover:text-white'
                  }`}
                >
                  Municipal ({deptCounts['Municipal Corp'] || 3})
                </button>
              </div>

              {/* Active Target Tracking Pill */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-400">TRACKING:</span>
                <span className="text-white font-bold">{activePlate}</span>
                <button
                  type="button"
                  onClick={() => setShowFilterModal(!showFilterModal)}
                  className="p-1 rounded bg-[#040711] hover:bg-[#1e293b] text-slate-400 hover:text-white border border-[#1e293b] transition-colors cursor-pointer"
                  title="Filter Cameras by Department"
                >
                  <Filter className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Floating Department Filter Modal */}
            {showFilterModal && (
              <div className="absolute top-10 right-3 w-72 z-50">
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

              {/* Route Details Overlay Box (Rule 2 container & Rule 3 typography) */}
              {activeTrajectory && (
                <div className="absolute bottom-3 right-3 z-[1000] bg-[#0a101f] border border-[#1e293b] rounded-lg p-3 text-xs font-mono text-slate-400 hidden sm:block pointer-events-none">
                  <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 font-bold">
                    CORRIDOR RECONSTRUCTION
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Corridor:</span>
                      <span className="text-white font-bold">Ahmedabad &rarr; Rajkot (221 km)</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Estimated Travel:</span>
                      <span className="text-white font-bold">5h 16m</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Waypoints:</span>
                      <span className="text-white font-bold">{activeTrajectory.total_sightings} Sightings</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Kinematics Avg:</span>
                      <span className="text-emerald-400 font-bold">71.3 km/h</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom: Video Strip fixed h-[200px] shrink-0 (Rule 5) */}
          <div className="h-[200px] shrink-0 w-full">
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

        {/* RIGHT COLUMN: w-[340px] shrink-0 h-full (Rule 5), bg-[#040711], stacked cards gap-3, p-3 */}
        <div className="w-[340px] shrink-0 h-full bg-[#040711] flex flex-col overflow-y-auto p-3 gap-3 tactical-scrollbar select-none border-l border-[#1e293b]">
          {/* Active Urgent Alert Dispatch Card (when selected) */}
          {selectedAlert && (
            <div className="shrink-0">
              <PCRDispatchCard
                alert={selectedAlert}
                onClose={() => setSelectedAlert(null)}
                onFocusMap={(lat, lng) => setFlyToLocation({ lat, lng, zoom: 14 })}
              />
            </div>
          )}

          {/* Card 1: ML Telemetry (Rule 2 Container + Rule 3 Typography) */}
          <div className="bg-[#0a101f] border border-[#1e293b] rounded-lg p-3 shrink-0">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 font-bold flex items-center justify-between">
              <span>ML TELEMETRY</span>
              <span className="text-xs text-emerald-400 font-mono font-bold">EDGE READY</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <div className="text-xs text-slate-400 font-mono">Latency</div>
                <div className="text-lg font-mono font-bold text-white">21.6ms</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-mono">Inference</div>
                <div className="text-lg font-mono font-bold text-white">64 FPS</div>
              </div>
            </div>
            {/* Plate Crop Preview */}
            <div className="flex items-center gap-2 p-2 bg-[#040711] border border-[#1e293b] rounded-lg">
              <img 
                src={enhancedPlateImg} 
                alt="Plate Crop" 
                className="h-8 border border-[#1e293b] rounded object-contain" 
              />
              <div className="min-w-0">
                <div className="text-xs text-white font-mono font-bold truncate">{activePlate}</div>
                <div className="text-xs text-emerald-400 font-mono font-bold">10/10 Chars &bull; 5/5 Lock</div>
              </div>
            </div>
          </div>

          {/* Card 2: 5-Database Correlation Dossier (Rule 2 Container + Rule 4 Clean Badges) */}
          <div className="bg-[#0a101f] border border-[#1e293b] rounded-lg p-3 shrink-0">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 font-bold flex items-center justify-between">
              <span>5-DATABASE CORRELATION</span>
              <span className="text-xs text-emerald-400 font-mono font-bold">1.2ms</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">1. VAHAN (Vehicle)</span>
                <span className={isCriticalTarget ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {isCriticalTarget ? 'STOLEN' : 'VERIFIED'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">2. SARTHI (License)</span>
                <span className={activePlate === 'GJ01ER8842' || activePlate === 'GJ05CD5678' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {activePlate === 'GJ01ER8842' || activePlate === 'GJ05CD5678' ? 'SUSPENDED' : 'VALID DL'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">3. eGujCop (CCTNS)</span>
                <span className={isCriticalTarget ? 'text-red-400 font-bold' : activePlate === 'GJ05CD5678' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {isCriticalTarget ? 'WANTED SEC 302' : activePlate === 'GJ05CD5678' ? 'OPEN FIR' : 'NO RECORD'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">4. AFIS (State Bio)</span>
                <span className={isCriticalTarget ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {isCriticalTarget ? 'MATCH #AF-8942' : 'NO RECORD'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-slate-400">5. NAFIS (National Bio)</span>
                <span className={isCriticalTarget ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold'}>
                  {isCriticalTarget ? 'FUGITIVE' : 'CLEAN'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Route Summary (Rule 2 Container + Rule 3 Big Numbers) */}
          <div className="bg-[#0a101f] border border-[#1e293b] rounded-lg p-3 shrink-0">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 font-bold flex items-center justify-between">
              <span>ROUTE SUMMARY</span>
              <span className="text-xs text-white font-mono font-bold">{activeTrajectory?.total_sightings || 7} SIGHTINGS</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-slate-400 font-mono">Corridor Distance</div>
                <div className="text-lg font-mono font-bold text-white">221 km</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-mono">Estimated Travel</div>
                <div className="text-lg font-mono font-bold text-white">5h 16m</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-mono">Tracked Waypoints</div>
                <div className="text-lg font-mono font-bold text-white">{activeTrajectory?.total_sightings || 7} pts</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-mono">Average Velocity</div>
                <div className="text-lg font-mono font-bold text-emerald-400">71.3 km/h</div>
              </div>
            </div>
          </div>

          {/* Card 4: Actions Card */}
          <div className="bg-[#0a101f] border border-[#1e293b] rounded-lg p-3 shrink-0">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 font-bold">
              TACTICAL ACTIONS
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const latest = activeTrajectory?.sightings?.[activeTrajectory.sightings.length - 1] || null;
                  setForensicSighting(latest);
                  setForensicAlert(null);
                  setForensicPlate(activePlate);
                  setIsForensicOpen(true);
                }}
                className="p-2.5 bg-[#040711] hover:bg-[#1e293b] border border-[#1e293b] hover:border-slate-600 rounded-lg text-white font-mono text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                title="Open Tamper-Evident Forensic Dossier under BSA 2023 §63"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>Dossier</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDispatchModalOpen(true)}
                className="p-2.5 bg-red-600 hover:bg-red-500 rounded-lg text-white font-mono text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                title="Dispatch PCR Intercept Units"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>PCR Dispatch</span>
              </button>
            </div>
          </div>

          {/* Card 5: Latest Alerts */}
          <div className="bg-[#0a101f] border border-[#1e293b] rounded-lg p-3 shrink-0">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 font-bold flex items-center justify-between">
              <span>LATEST ALERTS</span>
              <span className="text-xs text-red-400 font-mono font-bold">{criticalAlertCount} CRITICAL</span>
            </div>
            <div className="space-y-2">
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
                  className="flex items-center justify-between p-2 rounded-lg border border-[#1e293b] bg-[#040711] hover:border-slate-600 cursor-pointer transition-colors text-xs font-mono"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      alert.threat_level === 'CRITICAL' ? 'bg-red-400' : alert.threat_level === 'HIGH' ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    <span className="text-slate-400 font-mono truncate">{alert.camera_id}</span>
                    <span className="text-white font-bold">{alert.detected_plate}</span>
                  </div>
                  <span className={`font-bold shrink-0 ${
                    alert.threat_level === 'CRITICAL'
                      ? 'text-red-400'
                      : alert.threat_level === 'HIGH'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}>
                    {alert.threat_level}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. TACTICAL STATUS FOOTER BAR — Height 32px (h-8), full width (Rule 5) */}
      <footer className="h-8 bg-[#0a101f] border-t border-[#1e293b] px-3 flex items-center justify-between text-xs font-mono shrink-0 z-30">
        <div className="flex items-center gap-3 text-slate-400 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-emerald-400 font-bold tabular-nums">28/30 RTSP LIVE</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-white font-bold">{onlineFederatedCount}/{totalCamerasCount} FEDERATED</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-slate-600">&bull;</span>
            <span>CRITICAL ALERTS:</span>
            <span className="text-red-400 font-bold tabular-nums">{criticalAlertCount}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-slate-600">&bull;</span>
            <span>TRACKING:</span>
            <span className="text-white font-bold">{activePlate}</span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5">
            <span className="text-slate-600">&bull;</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              BSA 2023 &sect;63 PRIMARY EVIDENCE SEAL
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400 hidden xl:inline text-xs">
            NFSU FORENSIC AUDIT LOG
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
