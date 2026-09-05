import React, { useState } from 'react';
import { TrajectoryResponse, Sighting, ThreatLevel } from '../types';

interface TrajectoryPanelProps {
  trajectory: TrajectoryResponse | null;
  onSelectWaypoint: (sighting: Sighting) => void;
  selectedWaypointId?: string;
  onClose?: () => void;
}

export const TrajectoryPanel: React.FC<TrajectoryPanelProps> = ({
  trajectory,
  onSelectWaypoint,
  selectedWaypointId,
  onClose,
}) => {
  const [expandedHashId, setExpandedHashId] = useState<string | null>(null);

  if (!trajectory) {
    return (
      <div className="bg-[#111827] border border-[#1f2937] rounded-lg p-6 text-center text-gray-500 text-xs">
        <svg className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
        </svg>
        <p className="text-gray-400 font-medium">No vehicle trajectory loaded</p>
        <p className="mt-1 text-[11px]">Enter a license plate or select a test vehicle above to reconstruct cross-camera route.</p>
      </div>
    );
  }

  const { watchlist_status, sightings, plate_number, total_sightings } = trajectory;

  const getThreatBadge = (level: ThreatLevel) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-rose-950 text-rose-300 border border-rose-600/70 animate-pulse">
            CRITICAL THREAT
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-amber-950 text-amber-300 border border-amber-600/70">
            HIGH THREAT
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-emerald-950 text-emerald-300 border border-emerald-600/70">
            NORMAL
          </span>
        );
    }
  };

  const getDirectionArrow = (dir: string) => {
    switch (dir) {
      case 'N': return '↑ N';
      case 'NE': return '↗ NE';
      case 'E': return '→ E';
      case 'SE': return '↘ SE';
      case 'S': return '↓ S';
      case 'SW': return '↙ SW';
      case 'W': return '← W';
      case 'NW': return '↖ NW';
      default: return '• Unknown';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1424] border border-[#1f2937] rounded-lg overflow-hidden shadow-xl">
      {/* Target Vehicle Header */}
      <div className="p-3 bg-[#111827] border-b border-[#1f2937]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-plate text-lg font-extrabold text-cyan-400 tracking-wider">
              {plate_number}
            </span>
            {getThreatBadge(watchlist_status.threat_level)}
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors"
              title="Close trajectory view"
            >
              ✕
            </button>
          )}
        </div>

        {/* Watchlist Correlation Metadata */}
        <div className="grid grid-cols-2 gap-2 text-[11px] bg-[#0a0f1d] p-2 rounded border border-[#1f2937]">
          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-semibold">Total Sightings</span>
            <span className="font-mono text-cyan-300 font-bold">{total_sightings} verified events</span>
          </div>
          <div>
            <span className="text-gray-500 block text-[10px] uppercase font-semibold">Matched Registries</span>
            <span className="font-mono text-white truncate block">
              {watchlist_status.matched_databases.length > 0
                ? watchlist_status.matched_databases.join(', ')
                : 'None (Clean)'}
            </span>
          </div>

          {watchlist_status.associated_firs.length > 0 && (
            <div className="col-span-2 pt-1 border-t border-gray-800">
              <span className="text-rose-400 text-[10px] uppercase font-bold block">
                Linked eGujCop FIRs:
              </span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {watchlist_status.associated_firs.map((fir) => (
                  <span
                    key={fir}
                    className="px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800/60 text-rose-300 font-mono text-[10px]"
                  >
                    {fir}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chronological Waypoint Timeline */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
          <span className="uppercase font-bold tracking-wider">Chronological Reconstructed Path</span>
          <span className="text-cyan-400 text-[10px] font-mono">Earliest ➔ Latest</span>
        </div>

        <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-cyan-500/30">
          {sightings.map((sighting, idx) => {
            const isSelected = selectedWaypointId === sighting.sighting_id;
            const isLast = idx === sightings.length - 1;

            return (
              <div
                key={sighting.sighting_id}
                onClick={() => onSelectWaypoint(sighting)}
                className={`relative p-2.5 rounded-lg border cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'bg-[#1e293b] border-cyan-400 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400/50'
                    : 'bg-[#111827] border-[#1f2937] hover:border-cyan-700/60'
                }`}
              >
                {/* Timeline Dot Indicator */}
                <div
                  className={`absolute -left-[23px] top-3.5 w-3.5 h-3.5 rounded-full border-2 transition-all flex items-center justify-center ${
                    isLast
                      ? 'bg-rose-500 border-white ring-2 ring-rose-500/50'
                      : isSelected
                      ? 'bg-cyan-400 border-slate-950'
                      : 'bg-slate-900 border-cyan-500'
                  }`}
                >
                  <span className="w-1 h-1 rounded-full bg-white"></span>
                </div>

                {/* Waypoint Card Header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-cyan-400 font-bold text-xs">
                      #{idx + 1}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-900 border border-gray-800 text-gray-300 font-medium">
                      {sighting.department}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-900/60">
                    {getDirectionArrow(sighting.direction_of_travel)}
                  </div>
                </div>

                {/* Location / Camera Name */}
                <div className="text-xs font-semibold text-gray-100 mb-1">
                  {sighting.camera_name}
                </div>

                {/* Metadata Row */}
                <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                  <span>{new Date(sighting.timestamp_iso).toLocaleTimeString()}</span>
                  <span className="text-emerald-400 font-semibold">
                    {(sighting.confidence * 100).toFixed(1)}% Conf
                  </span>
                </div>

                {/* NFSU Forensic Chain of Custody SHA-256 Hash */}
                <div className="mt-2 pt-1.5 border-t border-gray-800/80 flex items-center justify-between text-[10px]">
                  <span className="text-gray-500 uppercase tracking-wider">NFSU Hash</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedHashId(expandedHashId === sighting.sighting_id ? null : sighting.sighting_id);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-mono transition-colors"
                  >
                    {expandedHashId === sighting.sighting_id ? 'Hide' : `${sighting.snapshot_hash_sha256.slice(0, 10)}...`}
                  </button>
                </div>

                {expandedHashId === sighting.sighting_id && (
                  <div className="mt-1.5 p-1.5 bg-black/80 rounded border border-cyan-800/60 text-[9px] font-mono text-cyan-300 break-all select-all">
                    SHA-256: {sighting.snapshot_hash_sha256}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
