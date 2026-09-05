import React, { useState } from 'react';
import { AlertEvent } from '../types';

interface PCRDispatchCardProps {
  alert: AlertEvent;
  onClose: () => void;
  onFocusMap?: (lat: number, lng: number) => void;
}

export const PCRDispatchCard: React.FC<PCRDispatchCardProps> = ({ alert, onClose, onFocusMap }) => {
  const [dispatched, setDispatched] = useState(false);
  const [dispatchTime, setDispatchTime] = useState<string | null>(null);

  const handleDispatch = () => {
    setDispatched(true);
    setDispatchTime(new Date().toLocaleTimeString());
  };

  const isCritical = alert.threat_level === 'CRITICAL';
  const firNumber = alert.egujcop_match?.fir_number || 'FIR-PENDING/CRIME-BR';
  const ownerName = alert.vahan_match?.owner_name || 'Vikram Solanki';
  const vehicleClass = alert.vahan_match?.vehicle_class || 'Motor Car (LMV)';
  const crimeHead = alert.egujcop_match?.crime_head || 'Armed Robbery / Inter-State Gang Operation';
  const recommendedAction = alert.recommended_action || 'Intercept immediately at nearest checkpoint.';

  return (
    <div
      className={`border rounded-xl p-4 shadow-2xl transition-all relative overflow-hidden ${
        isCritical
          ? 'bg-gradient-to-b from-rose-950/90 to-[#111827] border-rose-600/80 animate-critical-glow'
          : 'bg-[#111827] border-amber-500/70'
      }`}
    >
      {/* Top Banner */}
      <div className="flex items-start justify-between gap-2 border-b border-rose-500/30 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-3.5 w-3.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-rose-400 font-bold tracking-wider text-sm">
                TACTICAL PCR INTERCEPT PROTOCOL
              </h3>
              <span className="bg-rose-500/20 text-rose-300 font-mono text-[10px] px-2 py-0.5 rounded border border-rose-500/40">
                {alert.egujcop_match?.threat_priority || 'PRIORITY 1'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Gujarat Police State Control Room — Instant Tactical Action
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors"
          title="Close PCR Card"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
        <div className="bg-[#0a0f1d]/80 rounded p-2 border border-[#1f2937]">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Suspect Vehicle</div>
          <div className="font-plate text-white text-base tracking-widest mt-0.5 text-rose-300">
            {alert.detected_plate}
          </div>
          <div className="text-gray-300 text-[11px]">{vehicleClass}</div>
        </div>

        <div className="bg-[#0a0f1d]/80 rounded p-2 border border-[#1f2937]">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Registered Owner / Suspect</div>
          <div className="text-white font-semibold mt-0.5 truncate">{ownerName}</div>
          <div className="text-rose-400 text-[11px] font-mono truncate">{firNumber}</div>
        </div>
      </div>

      {/* Sighting Location & Crime Head */}
      <div className="bg-rose-950/30 border border-rose-800/40 rounded p-2.5 mb-3 text-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-gray-400 font-medium">Intercept Location:</span>
          {alert.camera_lat && alert.camera_lng && (
            <button
              type="button"
              onClick={() => onFocusMap && onFocusMap(alert.camera_lat!, alert.camera_lng!)}
              className="text-cyan-400 hover:text-cyan-300 underline text-[11px] flex items-center gap-1"
            >
              <span>Fly to Camera</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              </svg>
            </button>
          )}
        </div>
        <div className="text-gray-200 font-medium flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          <span>{alert.camera_name || alert.camera_id}</span>
        </div>
        <div className="mt-1 text-[11px] text-rose-300 font-medium">
          Crime Record: {crimeHead}
        </div>
        <div className="mt-1 text-[11px] text-gray-300 italic">
          Directive: {recommendedAction}
        </div>
      </div>

      {/* Recommended Patrol Unit */}
      <div className="bg-[#0a0f1d]/90 border border-cyan-800/40 rounded p-2.5 mb-3 flex items-center justify-between text-xs">
        <div>
          <div className="text-[10px] text-cyan-400 font-medium tracking-wider uppercase">
            Recommended Patrol Unit
          </div>
          <div className="text-gray-200 font-bold text-xs mt-0.5">
            PCR Vanguard-04 (Sector 2 Patrol)
          </div>
          <div className="text-[11px] text-gray-400">
            Distance: 1.2 km • Estimated Intercept: ~3 mins
          </div>
        </div>
        <div className="px-2 py-1 bg-cyan-950/60 border border-cyan-700/50 rounded text-cyan-300 font-mono text-[11px]">
          READY
        </div>
      </div>

      {/* Dispatch Action Button */}
      {dispatched ? (
        <div className="bg-emerald-950/80 border border-emerald-500/60 rounded-lg p-2.5 text-center">
          <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>PATROL UNIT DISPATCHED — EN ROUTE</span>
          </div>
          <div className="text-[10px] text-gray-300 mt-0.5">
            Broadcast to PCR Vanguard-04 at {dispatchTime} • Radio Channel: CH-09 TacNet
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleDispatch}
          className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 px-4 rounded-lg shadow-lg shadow-rose-950/60 transition-all transform active:scale-98 flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
          <span>1-Click PCR Unit Immediate Intercept Dispatch</span>
        </button>
      )}
    </div>
  );
};
