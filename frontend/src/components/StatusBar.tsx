import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Radio,
  Video,
  AlertOctagon,
  Download,
  Clock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import type { CameraStats } from '../types';
import { getApiBaseUrl } from '../utils/constants';

export interface StatusBarProps {
  wsConnected?: boolean;
  cameraStats?: CameraStats;
  criticalAlertCount?: number;
  totalAlertCount?: number;
  selectedPlate?: string | null;
  onExportCsv?: () => void;
  className?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  wsConnected = false,
  cameraStats = { total: 50, online: 45, degraded: 3, offline: 2 },
  criticalAlertCount = 0,
  totalAlertCount = 0,
  selectedPlate = null,
  onExportCsv,
  className = '',
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);

  // High precision tactical clock ticking every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format: 05 SEP 2026
      const dateStr = new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
        .format(now)
        .toUpperCase();

      // Format: 17:08:40 IST
      const timeStr = new Intl.DateTimeFormat('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);

      setCurrentDate(dateStr);
      setCurrentTime(`${timeStr} IST`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle CSV export directly or trigger parent callback
  const handleExport = useCallback(async () => {
    if (onExportCsv) {
      onExportCsv();
      return;
    }

    setExporting(true);
    try {
      const baseUrl = getApiBaseUrl();
      const query = selectedPlate ? `?plate_number=${encodeURIComponent(selectedPlate)}` : '';
      const response = await fetch(`${baseUrl}/api/export/csv${query}`);

      if (!response.ok) {
        throw new Error(`Export failed with HTTP status ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sentinel_evaluation_${selectedPlate || 'statewide'}_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 2500);
    } catch (err) {
      console.error('[StatusBar] Export error:', err);
    } finally {
      setExporting(false);
    }
  }, [selectedPlate, onExportCsv]);

  return (
    <header
      className={`w-full bg-[#0a0f1d]/95 backdrop-blur-md border-b border-slate-800 text-slate-100 px-4 py-2.5 shadow-xl select-none ${className}`}
      role="banner"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Section: Brand & Tactical Agency Identity */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-900/60 to-slate-900 border border-blue-500/40 shadow-inner">
            <Shield className="w-5 h-5 text-cyan-400" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-[#0a0f1d]" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-black tracking-widest text-white drop-shadow-sm">
                SENTINEL<span className="text-cyan-400 ml-1">2026</span>
              </span>
              <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded bg-blue-950/80 text-cyan-300 border border-cyan-800/60">
                GUJARAT POLICE
              </span>
            </div>
            <p className="text-[10.5px] tracking-wider text-slate-400 font-sans uppercase font-medium">
              Statewide CCTV Reconnaissance &amp; ANPR Tactical Grid
            </p>
          </div>
        </div>

        {/* Center Section: Telemetry, Camera Health, Active Alerts */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          {/* Real-time WebSocket Connection Indicator */}
          <div
            className={`flex items-center gap-2 px-2.5 py-1 rounded-md border transition-all ${
              wsConnected
                ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-400'
                : 'bg-red-950/30 border-red-800/60 text-red-400'
            }`}
            title={wsConnected ? 'Connected to live WebSocket alert stream' : 'WebSocket disconnected - reconnecting'}
          >
            <span className="relative flex h-2.5 w-2.5">
              {wsConnected && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  wsConnected ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
            </span>
            <Radio className="w-3.5 h-3.5 shrink-0" />
            <span className="font-bold tracking-wider">{wsConnected ? 'CONNECTED' : 'DISCONNECTED'}</span>
          </div>

          {/* Camera Network Health Status */}
          <div className="flex items-center gap-3 px-3 py-1 bg-slate-900/80 rounded-md border border-slate-800 text-slate-300">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Video className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-bold text-slate-200">{cameraStats.total}</span>
              <span className="text-[11px]">CAMS</span>
            </div>

            <div className="h-3 w-px bg-slate-700" />

            <div className="flex items-center gap-1 text-emerald-400" title="Online Cameras">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>{cameraStats.online}</span>
            </div>

            <div className="flex items-center gap-1 text-amber-400" title="Degraded Stream Health">
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>{cameraStats.degraded}</span>
            </div>

            <div className="flex items-center gap-1 text-red-400" title="Offline Cameras">
              <XCircle className="w-3 h-3 text-red-400" />
              <span>{cameraStats.offline}</span>
            </div>
          </div>

          {/* Real-time Alerts Counter */}
          <div className="flex items-center gap-2 px-3 py-1 bg-slate-900/80 rounded-md border border-slate-800">
            <span className="text-slate-400 text-[11px]">ALERTS:</span>
            <span className="font-bold text-slate-200">{totalAlertCount}</span>

            {criticalAlertCount > 0 && (
              <span className="relative flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/80 font-black animate-pulse">
                <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
                <span>{criticalAlertCount} CRITICAL</span>
              </span>
            )}
          </div>
        </div>

        {/* Right Section: Time & Export Actions */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Tactical Digital Clock */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-950/60 rounded-md border border-slate-800 font-mono text-xs">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400">{currentDate}</span>
            <span className="text-slate-600">|</span>
            <span className="font-bold text-cyan-300">{currentTime}</span>
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md font-mono text-xs font-bold uppercase transition-all duration-150 border cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              exportSuccess
                ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300'
                : 'bg-gradient-to-r from-blue-700 to-cyan-700 hover:from-blue-600 hover:to-cyan-600 text-white border-cyan-400/40 shadow-md shadow-cyan-950/40'
            }`}
            title="Export official jury evaluation sightings CSV"
          >
            {exporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : exportSuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Download className="w-3.5 h-3.5 text-cyan-200" />
            )}
            <span>
              {exporting
                ? 'GENERATING...'
                : exportSuccess
                ? 'DOWNLOADED'
                : selectedPlate
                ? `EXPORT (${selectedPlate})`
                : 'EXPORT CSV'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default StatusBar;
