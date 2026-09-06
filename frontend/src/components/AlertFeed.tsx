import React, { useState } from 'react';
import { AlertEvent, ThreatLevel } from '../types';
import { ThreatBadge } from './ThreatBadge';
import { PlateNumber } from './PlateNumber';

interface AlertFeedProps {
  alerts: AlertEvent[];
  selectedAlert: AlertEvent | null;
  onSelectAlert: (alert: AlertEvent) => void;
  onSelectPlate: (plate: string) => void;
}

export const AlertFeed: React.FC<AlertFeedProps> = ({
  alerts,
  selectedAlert,
  onSelectAlert,
  onSelectPlate,
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
            className={`px-2 py-1 rounded text-xs transition-all ${
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
            className={`px-2 py-1 rounded text-xs transition-all ${
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
            className={`px-2 py-1 rounded text-xs transition-all ${
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
            className={`px-2 py-1 rounded text-xs transition-all ${
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
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 p-2 space-y-2">
        {filteredAlerts.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-slate-500 text-xs">
            <svg className="w-8 h-8 mb-2 opacity-40 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span className="font-mono text-slate-400 text-xs tracking-wider">No alerts matching filter</span>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isSelected = selectedAlert?.alert_id === alert.alert_id;
            return (
              <div
                key={alert.alert_id}
                onClick={() => onSelectAlert(alert)}
                className={`p-2.5 rounded-r border cursor-pointer transition-all duration-150 relative ${getCardBorder(
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
                      className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded transition-colors active:scale-95"
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
                <div className="text-xs text-slate-200 font-semibold truncate mb-1">
                  {alert.camera_name || alert.camera_id}
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
                  <span className="font-mono text-[11px] text-slate-400">
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
