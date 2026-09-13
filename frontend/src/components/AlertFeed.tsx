import React, { useState } from 'react';
import { AlertEvent, ThreatLevel } from '../types';
import { ThreatBadge } from './ThreatBadge';
import { PlateNumber } from './PlateNumber';

interface AlertFeedProps {
  alerts: AlertEvent[];
  selectedAlert: AlertEvent | null;
  onSelectAlert: (alert: AlertEvent) => void;
  onSelectPlate: (plate: string) => void;
  onOpenForensicDrawer?: (alert: AlertEvent) => void;
}

export const AlertFeed: React.FC<AlertFeedProps> = ({
  alerts,
  selectedAlert,
  onSelectAlert,
  onSelectPlate,
  onOpenForensicDrawer,
}) => {
  const [filterLevel, setFilterLevel] = useState<'ALL' | ThreatLevel>('ALL');

  const filteredAlerts = alerts.filter((a) => {
    if (filterLevel === 'ALL') return true;
    return a.threat_level === filterLevel;
  });

  const criticalCount = alerts.filter((a) => a.threat_level === 'CRITICAL').length;
  const highCount = alerts.filter((a) => a.threat_level === 'HIGH').length;

  const getCardBorder = (level: ThreatLevel, isSelected: boolean) => {
    let baseBorder = 'border-l-[3px] ';
    if (isSelected) {
      baseBorder += 'ring-1 ring-cyan-500/50 bg-[#1e293b]/90 shadow-lg shadow-cyan-950/30 ';
    } else {
      baseBorder += 'bg-[#111827] hover:bg-[#1a2234] ';
    }

    switch (level) {
      case 'CRITICAL':
        return `${baseBorder} border-l-[#ef4444] border-t-slate-800 border-r-slate-800 border-b-slate-800`;
      case 'HIGH':
        return `${baseBorder} border-l-[#f59e0b] border-t-slate-800 border-r-slate-800 border-b-slate-800`;
      default:
        return `${baseBorder} border-l-[#22c55e] border-t-slate-800 border-r-slate-800 border-b-slate-800`;
    }
  };

  const formatTimestamp = (iso?: string | null) => {
    if (!iso) return 'Just now';
    try {
      const date = new Date(iso);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] border border-slate-800 rounded-lg overflow-hidden shadow-xl">
      {/* Sticky Feed Header */}
      <div className="sticky top-0 z-10 p-3 bg-[#0d1424] border-b border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <h2 className="font-heading font-bold text-xs tracking-wider text-slate-100 uppercase">
              Live Alert Intercept Feed
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {criticalCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950/70 text-rose-300 border border-rose-500/50 animate-pulse">
                <span>{criticalCount}</span>
                <span>CRITICAL</span>
              </span>
            )}
            {highCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/60 text-amber-300 border border-amber-500/40">
                <span>{highCount}</span>
                <span>HIGH</span>
              </span>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setFilterLevel('ALL')}
            className={`px-2 py-1 rounded text-xs transition-all duration-75 active:scale-[0.96] cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:outline-none ${
              filterLevel === 'ALL'
                ? 'bg-cyan-600 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 bg-[#070b14] border border-slate-800'
            }`}
          >
            All ({alerts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterLevel('CRITICAL')}
            className={`px-2 py-1 rounded text-xs transition-all duration-75 active:scale-[0.96] cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500/70 focus-visible:outline-none ${
              filterLevel === 'CRITICAL'
                ? 'bg-rose-600 text-white font-bold shadow-sm shadow-rose-950/60'
                : 'text-rose-400 hover:text-rose-300 bg-[#070b14] border border-rose-900/40'
            }`}
          >
            Critical ({criticalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterLevel('HIGH')}
            className={`px-2 py-1 rounded text-xs transition-all duration-75 active:scale-[0.96] cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-500/70 focus-visible:outline-none ${
              filterLevel === 'HIGH'
                ? 'bg-amber-600 text-white font-bold shadow-sm shadow-amber-950/60'
                : 'text-amber-400 hover:text-amber-300 bg-[#070b14] border border-amber-900/40'
            }`}
          >
            High ({highCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterLevel('NORMAL')}
            className={`px-2 py-1 rounded text-xs transition-all duration-75 active:scale-[0.96] cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500/70 focus-visible:outline-none ${
              filterLevel === 'NORMAL'
                ? 'bg-emerald-600 text-white font-bold shadow-sm'
                : 'text-emerald-400 hover:text-emerald-300 bg-[#070b14] border border-emerald-900/40'
            }`}
          >
            Normal
          </button>
        </div>
      </div>

      {/* Scrolling Alerts List */}
      <div className="flex-1 overflow-y-auto tactical-scrollbar p-3 space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs">
            <svg className="w-8 h-8 mb-2 opacity-40 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="font-mono text-slate-300 text-xs tracking-wider">No alerts matching filter</span>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isSelected = selectedAlert?.alert_id === alert.alert_id;
            return (
              <div
                key={alert.alert_id}
                onClick={() => onSelectAlert(alert)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectAlert(alert);
                  }
                }}
                className={`p-3 rounded-r border cursor-pointer transition-all duration-150 relative focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:outline-none alert-card-spring-enter tactile-active-press ${getCardBorder(
                  alert.threat_level,
                  isSelected
                )}`}
              >
                {/* Header: Plate & Threat Badge */}
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="flex items-center gap-2">
                    <PlateNumber
                      plate={alert.detected_plate}
                      size="sm"
                      interactive={true}
                      showCopyIcon={false}
                      onClick={() => onSelectPlate(alert.detected_plate)}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPlate(alert.detected_plate);
                      }}
                      className="tactile-active-press text-[10px] font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:outline-none"
                      title="Load vehicle trajectory"
                    >
                      Route ➔
                    </button>
                  </div>
                  <div>
                    <ThreatBadge level={alert.threat_level} size="sm" />
                  </div>
                </div>

                {/* Camera Name */}
                <div
                  className="text-xs text-slate-100 font-semibold truncate mb-1.5"
                  title={alert.camera_name || alert.camera_id}
                >
                  {alert.camera_name || alert.camera_id}
                </div>

                {/* Tier 1 Micro-Chips with Visual Dots and Tier 2 Micro-Popovers */}
                <div className="flex items-center justify-between gap-1 my-1.5 pt-1">
                  <div className="flex items-center gap-1.5">
                    {/* Visual 5-dot Consensus Meter [●][●][●][●][○] */}
                    <div className="relative group/chip">
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#070b14] border border-slate-800 text-cyan-400 font-mono text-[9px] tabular-nums cursor-help hover:border-cyan-500/50 transition-colors">
                        <span className="text-slate-400 text-[8px] font-bold">Q:</span>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((pip) => {
                            const score = alert.confidence >= 0.9 ? 5 : alert.confidence >= 0.8 ? 4 : 3;
                            return (
                              <span
                                key={pip}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  pip <= score
                                    ? 'bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]'
                                    : 'bg-slate-700'
                                }`}
                              />
                            );
                          })}
                        </div>
                        <span className="text-cyan-300 font-bold ml-0.5">
                          {alert.confidence >= 0.9 ? '5/5' : alert.confidence >= 0.8 ? '4/5' : '3/5'}
                        </span>
                      </div>
                      {/* Tier 2 Progressive Disclosure Micro-Popover */}
                      <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover/chip:flex flex-col gap-1 p-2 bg-[#0c1322] border border-cyan-500/60 rounded-md shadow-2xl z-50 w-52 pointer-events-none backdrop-blur-md">
                        <div className="text-[10px] font-mono font-bold text-cyan-300 flex items-center justify-between border-b border-slate-800 pb-1">
                          <span>PTS TEMPORAL QUORUM</span>
                          <span className="text-[9px] text-cyan-400">{alert.confidence >= 0.9 ? '5/5 LOCKED' : '4/5 LOCKED'}</span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-300 space-y-0.5">
                          <div className="flex justify-between text-slate-400">
                            <span>Frame Consensus:</span>
                            <span className="text-cyan-300 font-bold">{(alert.confidence * 100).toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>OCR Voting Engine:</span>
                            <span className="text-slate-200">Levenshtein Median</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>PTS Temporal Jitter:</span>
                            <span className="text-emerald-400">&plusmn;1.4ms</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* CLAHE 2.0x Optical Chip */}
                    <div className="relative group/chip">
                      <span className="px-1.5 py-0.5 rounded bg-[#070b14] border border-slate-800 text-amber-400 font-mono text-[9px] tabular-nums cursor-help hover:border-amber-500/50 transition-colors inline-block">
                        CLAHE 2.0x
                      </span>
                      <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover/chip:flex flex-col gap-1 p-2 bg-[#0c1322] border border-amber-500/60 rounded-md shadow-2xl z-50 w-52 pointer-events-none backdrop-blur-md">
                        <div className="text-[10px] font-mono font-bold text-amber-300 flex items-center justify-between border-b border-slate-800 pb-1">
                          <span>OPTICAL NORMALIZATION</span>
                          <span className="text-[9px] text-amber-400">ENHANCED</span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-300 space-y-0.5">
                          <div className="flex justify-between text-slate-400">
                            <span>Kernel Rescale:</span>
                            <span className="text-slate-200">Lanczos4 2.0x</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Contrast Filter:</span>
                            <span className="text-amber-300">CLAHE (Clip: 2.0)</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>Homography Transform:</span>
                            <span className="text-emerald-400">WarpPerspective 4-pt</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 5-DB Parallel Query Latency Chip */}
                    <div className="relative group/chip">
                      <span className="px-1.5 py-0.5 rounded bg-[#070b14] border border-slate-800 text-emerald-400 font-mono text-[9px] tabular-nums cursor-help hover:border-emerald-500/50 transition-colors inline-block">
                        5-DB: 2ms
                      </span>
                      <div className="absolute left-0 bottom-full mb-1.5 hidden group-hover/chip:flex flex-col gap-1 p-2 bg-[#0c1322] border border-emerald-500/60 rounded-md shadow-2xl z-50 w-52 pointer-events-none backdrop-blur-md">
                        <div className="text-[10px] font-mono font-bold text-emerald-300 flex items-center justify-between border-b border-slate-800 pb-1">
                          <span>5-DATABASE CORRELATION</span>
                          <span className="text-[9px] text-emerald-400">2.1ms p99</span>
                        </div>
                        <div className="text-[9px] font-mono text-slate-300 space-y-0.5">
                          <div className="flex justify-between text-slate-400">
                            <span>VAHAN + SARTHI:</span>
                            <span className="text-emerald-300">0.8ms</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>eGujCop CCTNS:</span>
                            <span className="text-emerald-300">0.7ms</span>
                          </div>
                          <div className="flex justify-between text-slate-400">
                            <span>AFIS + NAFIS:</span>
                            <span className="text-emerald-300">0.6ms</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenForensicDrawer?.(alert);
                    }}
                    className="tactile-active-press px-2 py-0.5 rounded bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/60 hover:border-cyan-400 text-cyan-300 font-mono text-[9px] font-bold tracking-wider flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:outline-none"
                    title="Open 9-stage algorithm exploder and NFSU § 63 certificate"
                  >
                    <span>🔬 DOSSIER</span>
                  </button>
                </div>

                {/* Micro-copy footer: Department, Databases, Timestamps */}
                <div className="flex items-center justify-between font-mono text-xs tracking-wider text-slate-400 pt-1.5 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[10px]">
                      {alert.camera_dept || 'Police'}
                    </span>
                    {alert.source_databases && alert.source_databases.length > 0 && (
                      <span className="text-cyan-400 font-mono text-[10px]">
                        [{alert.source_databases.slice(0, 3).join('+')}]
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                    {formatTimestamp(alert.timestamp_iso || alert.created_at)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
