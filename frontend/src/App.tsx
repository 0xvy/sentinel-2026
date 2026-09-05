import React, { useState, useEffect, useCallback } from 'react';
import { Camera, AlertEvent, TrajectoryResponse, Sighting } from './types';
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
  const [activePlate, setActivePlate] = useState<string>('GJ01ER8842'); // Seeded with primary suspect
  const [activeTrajectory, setActiveTrajectory] = useState<TrajectoryResponse | null>(null);
  const [isLoadingTrajectory, setIsLoadingTrajectory] = useState<boolean>(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertEvent | null>(null);
  const [selectedSighting, setSelectedSighting] = useState<Sighting | null>(null);
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'videowall'>('map');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [rightPanelTab, setRightPanelTab] = useState<'alerts' | 'trajectory'>('trajectory');
  const [showFilterModal, setShowFilterModal] = useState<boolean>(false);

  // Live Alerts via WebSocket
  const { alerts, connectionStatus } = useAlertWebSocket();

  // Clock updater
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toUTCString().replace('GMT', 'UTC') + ' • ' + now.toLocaleTimeString() + ' IST');
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
      setRightPanelTab('trajectory');

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

  // Counts for tactical HUD
  const criticalAlertCount = alerts.filter((a) => a.threat_level === 'CRITICAL').length;
  const onlineCamerasCount = cameras.filter((c) => c.status === 'Online').length;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0f1d] text-[#f9fafb] font-sans select-none overflow-hidden">
      {/* 1. TOP COMMAND HEADER */}
      <header className="h-14 bg-[#0d1424] border-b border-[#1f2937] px-4 flex items-center justify-between z-30 shadow-xl shrink-0">
        {/* Left: Emblem & Platform Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/60 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950/50">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-heading font-extrabold text-base md:text-lg tracking-wider text-white">
                SENTINEL <span className="text-cyan-400 font-mono">2026</span>
              </h1>
              <span className="bg-cyan-950/70 border border-cyan-800/60 text-cyan-300 font-mono text-[10px] px-1.5 py-0.2 rounded hidden sm:inline-block">
                GUJARAT POLICE INTELLIGENCE
              </span>
            </div>
            <p className="text-[10px] text-gray-400 hidden sm:block tracking-wide">
              Cross-Agency CCTV Intelligence & AI Plate Trajectory Command
            </p>
          </div>
        </div>

        {/* Center: System Status & Time */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-[#0a0f1d] rounded border border-[#1f2937]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-gray-300">NFSU FORENSIC AUDIT:</span>
            <span className="text-emerald-400 font-bold">TAMPER-EVIDENT</span>
          </div>

          <div className="text-gray-400 text-[11px]">
            {currentTime || 'Synchronizing Clock...'}
          </div>
        </div>

        {/* Right: Mode Switcher & Status Controls */}
        <div className="flex items-center gap-2.5">
          {/* Mode Tabs: GIS Map vs Video Wall */}
          <div className="flex items-center bg-[#111827] p-1 rounded-lg border border-[#1f2937]">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
                viewMode === 'map'
                  ? 'bg-cyan-600 text-slate-950 shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              <span>GIS Tactical</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('videowall')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition-all ${
                viewMode === 'videowall'
                  ? 'bg-cyan-600 text-slate-950 shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span>Video Wall</span>
            </button>
          </div>

          {/* WebSocket Status Indicator */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] font-mono ${
              connectionStatus === 'connected'
                ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-300'
                : 'border-amber-500/50 bg-amber-950/40 text-amber-300'
            }`}
            title={`WebSocket status: ${connectionStatus}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
              }`}
            ></span>
            <span className="uppercase">{connectionStatus}</span>
          </div>

          {/* Top Quick Export CSV */}
          <ExportButton currentPlate={activePlate} />
        </div>
      </header>

      {/* 2. MAIN SPLIT BODY (60% Map / Left vs 40% Alerts & Search / Right) */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* LEFT PANEL: 60% Width — GIS Map or Video Wall */}
        <div className="w-full md:w-[60%] h-1/2 md:h-full flex flex-col relative border-r border-[#1f2937]">
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

              {/* Floating Department Filter Toggle Button on Map */}
              <div className="absolute top-3 right-3 z-[1000]">
                <button
                  type="button"
                  onClick={() => setShowFilterModal(!showFilterModal)}
                  className="px-3 py-1.5 rounded-lg bg-[#0d1424]/90 border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 font-bold text-xs shadow-xl backdrop-blur flex items-center gap-1.5 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
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

        {/* RIGHT PANEL: 40% Width — Search, Trajectory & Live Alert Feed */}
        <div className="w-full md:w-[40%] h-1/2 md:h-full flex flex-col bg-[#0a0f1d] overflow-hidden p-3 gap-3">
          {/* Top Search Bar */}
          <div className="shrink-0 bg-[#0d1424] p-3 rounded-lg border border-[#1f2937] shadow-lg">
            <PlateSearch
              activePlate={activePlate}
              onSelectPlate={fetchTrajectory}
              isLoadingTrajectory={isLoadingTrajectory}
            />
          </div>

          {/* Active PCR Dispatch Card (Urgent Critical Alert Selected) */}
          {selectedAlert && (
            <div className="shrink-0">
              <PCRDispatchCard
                alert={selectedAlert}
                onClose={() => setSelectedAlert(null)}
                onFocusMap={(lat, lng) => setFlyToLocation({ lat, lng, zoom: 15 })}
              />
            </div>
          )}

          {/* Tab Navigation for Right Panel (Trajectory vs Live Alert Stream) */}
          <div className="flex items-center gap-2 border-b border-[#1f2937] pb-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setRightPanelTab('trajectory')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                rightPanelTab === 'trajectory'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/60 shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>Trajectory ({activeTrajectory?.total_sightings || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => setRightPanelTab('alerts')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider transition-all relative ${
                rightPanelTab === 'alerts'
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-600/60 shadow'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>Live Alerts ({alerts.length})</span>
              {criticalAlertCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute -top-1 -right-1"></span>
              )}
            </button>
          </div>

          {/* Dynamic Tab Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {rightPanelTab === 'trajectory' ? (
              <TrajectoryPanel
                trajectory={activeTrajectory}
                onSelectWaypoint={handleSelectWaypoint}
                selectedWaypointId={selectedSighting?.sighting_id}
                onClose={() => setRightPanelTab('alerts')}
              />
            ) : (
              <AlertFeed
                alerts={alerts}
                selectedAlert={selectedAlert}
                onSelectAlert={handleSelectAlert}
                onSelectPlate={handleSelectPlate}
              />
            )}
          </div>
        </div>
      </div>

      {/* 3. TACTICAL STATUS FOOTER BAR */}
      <footer className="h-9 bg-[#0d1424] border-t border-[#1f2937] px-4 flex items-center justify-between text-[11px] font-mono shrink-0 z-30">
        <div className="flex items-center gap-4 text-gray-400 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>CCTV CAMERAS:</span>
            <span className="text-white font-bold">{onlineCamerasCount}/50 ONLINE</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-gray-500">•</span>
            <span>ACTIVE CRITICAL ALERTS:</span>
            <span className="text-rose-400 font-bold">{criticalAlertCount}</span>
          </div>

          <div className="hidden md:flex items-center gap-1.5">
            <span className="text-gray-500">•</span>
            <span>TARGET:</span>
            <span className="text-cyan-400 font-plate font-bold">{activePlate}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-gray-500 hidden lg:inline">
            NFSU DIGITAL CHAIN OF CUSTODY VERIFIED
          </span>
          <ExportButton currentPlate={activePlate} />
        </div>
      </footer>
    </div>
  );
};

export default App;
