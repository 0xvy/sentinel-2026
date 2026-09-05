import React, { useState } from 'react';
import { AlertEvent, ThreatLevel } from '../types';

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

  const getThreatBadge = (level: ThreatLevel) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 text-rose-400 border border-rose-600/50 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-500/50 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            HIGH
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/50 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            NORMAL
          </span>
        );
    }
  };

  const getCardBorder = (level: ThreatLevel, isSelected: boolean) => {
    let baseBorder = 'border-l-4 ';
    if (isSelected) {
      baseBorder += 'ring-1 ring-cyan-500/80 bg-[#1e293b]/90 ';
    } else {
      baseBorder += 'bg-[#111827]/80 hover:bg-[#1a2234] ';
    }

    switch (level) {
      case 'CRITICAL':
        return `${baseBorder} border-l-[#ef4444] border-t-[#1f2937] border-r-[#1f2937] border-b-[#1f2937]`;
      case 'HIGH':
        return `${baseBorder} border-l-[#f59e0b] border-t-[#1f2937] border-r-[#1f2937] border-b-[#1f2937]`;
      default:
        return `${baseBorder} border-l-[#22c55e] border-t-[#1f2937] border-r-[#1f2937] border-b-[#1f2937]`;
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
    <div className="flex flex-col h-full bg-[#0d1424] border border-[#1f2937] rounded-lg overflow-hidden shadow-xl">
      {/* Feed Header */}
      <div className="p-3 bg-[#111827] border-b border-[#1f2937]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></span>
            <h2 className="font-heading font-bold text-sm tracking-wide text-gray-100 uppercase">
              Live Alert Intercept Feed
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            {criticalCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-900/60 text-rose-300 border border-rose-500/40 animate-pulse">
                <span>{criticalCount}</span>
                <span>CRITICAL</span>
              </span>
            )}
            {highCount > 0 && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-900/50 text-amber-300 border border-amber-500/30">
                <span>{highCount}</span>
                <span>HIGH</span>
              </span>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => setFilterLevel('ALL')}
            className={`px-2 py-0.5 rounded transition-all ${
              filterLevel === 'ALL'
                ? 'bg-cyan-600 text-slate-950 font-bold'
                : 'text-gray-400 hover:text-gray-200 bg-[#0a0f1d] border border-gray-800'
            }`}
          >
            All ({alerts.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterLevel('CRITICAL')}
            className={`px-2 py-0.5 rounded transition-all ${
              filterLevel === 'CRITICAL'
                ? 'bg-rose-600 text-white font-bold'
                : 'text-rose-400 hover:text-rose-300 bg-[#0a0f1d] border border-rose-900/40'
            }`}
          >
            Critical ({criticalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterLevel('HIGH')}
            className={`px-2 py-0.5 rounded transition-all ${
              filterLevel === 'HIGH'
                ? 'bg-amber-600 text-white font-bold'
                : 'text-amber-400 hover:text-amber-300 bg-[#0a0f1d] border border-amber-900/40'
            }`}
          >
            High ({highCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterLevel('NORMAL')}
            className={`px-2 py-0.5 rounded transition-all ${
              filterLevel === 'NORMAL'
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-emerald-400 hover:text-emerald-300 bg-[#0a0f1d] border border-emerald-900/40'
            }`}
          >
            Normal
          </button>
        </div>
      </div>

      {/* Scrolling Alerts List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredAlerts.length === 0 ? (
          <div className="h-40 flex flex-col items-center justify-center text-gray-500 text-xs">
            <svg className="w-8 h-8 mb-2 opacity-40 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>No alerts matching current filter</span>
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
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-plate text-sm font-extrabold text-white tracking-wider bg-black/60 px-2 py-0.5 rounded border border-gray-700/80">
                      {alert.detected_plate}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPlate(alert.detected_plate);
                      }}
                      className="text-[10px] text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 px-1.5 py-0.5 rounded transition-colors"
                      title="Load vehicle trajectory"
                    >
                      Trajectory ➔
                    </button>
                  </div>
                  <div>{getThreatBadge(alert.threat_level)}</div>
                </div>

                {/* Camera & Department */}
                <div className="text-xs text-gray-300 font-medium truncate mb-1">
                  {alert.camera_name || alert.camera_id}
                </div>

                {/* Footer: Department, Databases, Timestamp */}
                <div className="flex items-center justify-between text-[10px] text-gray-400 pt-1 border-t border-gray-800/60">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 rounded bg-gray-900 border border-gray-800 text-gray-300">
                      {alert.camera_dept || 'Police'}
                    </span>
                    {alert.source_databases && alert.source_databases.length > 0 && (
                      <span className="text-cyan-400/90 font-mono">
                        [{alert.source_databases.slice(0, 3).join('+')}]
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-gray-400">
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
