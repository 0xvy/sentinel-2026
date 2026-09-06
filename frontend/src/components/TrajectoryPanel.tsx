import React, { useState } from 'react';
import { Copy, Check, Compass, ShieldCheck } from 'lucide-react';
import { TrajectoryResponse, Sighting } from '../types';
import { PlateNumber } from './PlateNumber';
import { ThreatBadge } from './ThreatBadge';

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
  const [copiedHashId, setCopiedHashId] = useState<string | null>(null);

  if (!trajectory) {
    return (
      <div className="bg-[#0a0f1d] border border-slate-800 rounded-lg p-6 text-center text-slate-500 text-xs">
        <svg className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"></path>
        </svg>
        <p className="text-slate-400 font-medium font-mono text-xs">No vehicle trajectory loaded</p>
        <p className="mt-1 text-[11px] text-slate-500">
          Enter a license plate or select a test vehicle above to reconstruct cross-camera route.
        </p>
      </div>
    );
  }

  const { watchlist_status, sightings, plate_number, total_sightings } = trajectory;

  const handleCopyHash = async (hash: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHashId(id);
      setTimeout(() => setCopiedHashId(null), 2000);
    } catch (err) {
      console.warn('Failed to copy hash', err);
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
      default: return '• N/A';
    }
  };

  const getDepartmentPill = (dept: string) => {
    switch (dept) {
      case 'Police':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Transport (RTO)':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'GSRTC':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'Municipal Corp':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Health':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Panchayat':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Food & Civil Supplies':
        return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
      case 'Private':
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] border border-slate-800 rounded-lg overflow-hidden shadow-xl">
      {/* Target Vehicle Header */}
      <div className="p-3 bg-[#0d1424] border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <PlateNumber plate={plate_number} size="md" interactive={true} />
            <ThreatBadge level={watchlist_status.threat_level} size="sm" />
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors"
              title="Close trajectory view"
            >
              ✕
            </button>
          )}
        </div>

        {/* Watchlist Correlation Metadata */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-[#070b14] p-2.5 rounded-lg border border-slate-800">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono font-semibold">Total Sightings</span>
            <span className="font-mono text-cyan-300 font-bold">{total_sightings} verified events</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-mono font-semibold">Matched Registries</span>
            <span className="font-mono text-slate-200 truncate block">
              {watchlist_status.matched_databases.length > 0
                ? watchlist_status.matched_databases.join(', ')
                : 'None (Clean)'}
            </span>
          </div>

          {watchlist_status.associated_firs.length > 0 && (
            <div className="col-span-2 pt-2 border-t border-slate-800">
              <span className="text-rose-400 text-[10px] uppercase font-mono font-bold block">
                Linked eGujCop FIRs:
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {watchlist_status.associated_firs.map((fir) => (
                  <span
                    key={fir}
                    className="px-1.5 py-0.5 rounded bg-rose-950/70 border border-rose-800/60 text-rose-300 font-mono text-[10px]"
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
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 p-3 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
          <span className="uppercase font-bold tracking-wider">Reconstructed Route Milestones</span>
          <span className="text-cyan-400 text-[10px]">Earliest ➔ Latest</span>
        </div>

        <div className="relative pl-8 space-y-3 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-cyan-500/25">
          {sightings.map((sighting, idx) => {
            const isSelected = selectedWaypointId === sighting.sighting_id;
            const isLast = idx === sightings.length - 1;

            return (
              <div
                key={sighting.sighting_id}
                onClick={() => onSelectWaypoint(sighting)}
                className={`relative p-3 rounded-lg border cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'bg-[#1e293b] border-cyan-400 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400/50'
                    : 'bg-[#111827] border-slate-800 hover:border-cyan-700/60'
                }`}
              >
                {/* Numbered Route Milestone Indicator */}
                <div
                  className={`absolute -left-[31px] top-3 w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center font-mono font-bold text-[10px] z-10 ${
                    isLast
                      ? 'bg-rose-500 text-white border-white ring-2 ring-rose-500/50'
                      : isSelected
                      ? 'bg-cyan-400 text-slate-950 border-slate-900 shadow-md'
                      : 'bg-slate-900 text-cyan-300 border-cyan-500/60'
                  }`}
                  title={`Milestone #${idx + 1}`}
                >
                  {idx + 1}
                </div>

                {/* Waypoint Card Header: Milestone, Dept pill, Compass heading */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-cyan-400 font-bold text-xs">
                      #{idx + 1}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase font-semibold ${getDepartmentPill(
                        sighting.department
                      )}`}
                    >
                      {sighting.department}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/60">
                    <Compass className="w-3 h-3 text-cyan-400" />
                    <span>{getDirectionArrow(sighting.direction_of_travel)}</span>
                  </div>
                </div>

                {/* Camera Name */}
                <div className="text-xs font-semibold text-slate-100 mb-2 truncate">
                  {sighting.camera_name}
                </div>

                {/* Confidence Bar & Time */}
                <div className="space-y-1 mb-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{new Date(sighting.timestamp_iso).toLocaleTimeString()}</span>
                    <span className="text-emerald-400 font-semibold font-mono text-[11px]">
                      {(sighting.confidence * 100).toFixed(1)}% Match
                    </span>
                  </div>
                  {/* Visual Confidence Progress Bar */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        sighting.confidence >= 0.9
                          ? 'bg-emerald-400'
                          : sighting.confidence >= 0.75
                          ? 'bg-cyan-400'
                          : 'bg-amber-400'
                      }`}
                      style={{ width: `${Math.min(100, sighting.confidence * 100)}%` }}
                    />
                  </div>
                </div>

                {/* NFSU Forensic Chain of Custody SHA-256 Hash with Copy Button */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-1 text-slate-400">
                    <ShieldCheck className="w-3 h-3 text-cyan-400" />
                    <span className="uppercase text-[10px] text-slate-400">NFSU HASH:</span>
                    <span className="text-slate-300">
                      {sighting.snapshot_hash_sha256.slice(0, 12)}...
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleCopyHash(sighting.snapshot_hash_sha256, sighting.sighting_id, e)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                      title="Copy full SHA-256 hash"
                    >
                      {copiedHashId === sighting.sighting_id ? (
                        <span className="text-emerald-400 flex items-center gap-0.5 text-[9px] font-bold">
                          <Check className="w-3 h-3" />
                          <span>COPIED</span>
                        </span>
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedHashId(expandedHashId === sighting.sighting_id ? null : sighting.sighting_id);
                      }}
                      className="text-cyan-400 hover:text-cyan-300 text-[10px] transition-colors"
                    >
                      {expandedHashId === sighting.sighting_id ? 'Hide' : 'Full'}
                    </button>
                  </div>
                </div>

                {expandedHashId === sighting.sighting_id && (
                  <div className="mt-2 p-2 bg-[#070b14] rounded border border-cyan-800/60 text-[9px] font-mono text-cyan-300 break-all select-all">
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
