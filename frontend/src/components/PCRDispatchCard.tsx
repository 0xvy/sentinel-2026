import React, { useState } from 'react';
import { AlertEvent } from '../types';
import { PlateNumber } from './PlateNumber';

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
  const firNumber = alert.egujcop_match?.fir_number || 'FIR-2026/0412/CRIME-BR';
  const policeStation = alert.egujcop_match?.police_station || 'Gandhinagar Sector-7 Police Station';
  const ownerName = alert.vahan_match?.owner_name || 'Vikram Solanki';
  const vehicleClass = alert.vahan_match?.vehicle_class || 'Motor Car (LMV)';
  const registrationDate = (alert.vahan_match as { registration_date?: string })?.registration_date || '14-May-2022';
  const crimeHead = alert.egujcop_match?.crime_head || 'Armed Robbery / Inter-State Gang Operation';
  const recommendedAction = alert.recommended_action || 'Intercept immediately at nearest checkpoint.';

  return (
    <div
      className={`border rounded-xl p-4 shadow-2xl transition-all relative overflow-hidden ${
        isCritical
          ? 'bg-gradient-to-b from-rose-950/90 via-[#0d1424] to-[#070b14] border-rose-500/80 animate-critical-glow'
          : 'bg-[#0d1424] border-amber-500/70'
      }`}
    >
      {/* Top Tactical Banner */}
      <div className="flex items-start justify-between gap-2 border-b border-rose-500/30 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-3.5 w-3.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading text-rose-400 font-extrabold tracking-wider text-xs md:text-sm uppercase">
                TACTICAL PCR INTERCEPT PROTOCOL
              </h3>
              <span className="bg-rose-500/20 text-rose-300 font-mono text-[10px] px-2 py-0.5 rounded border border-rose-500/40">
                {alert.egujcop_match?.threat_priority || 'PRIORITY 1'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 tracking-wide font-mono mt-0.5">
              Gujarat Police State Control Room &bull; Rapid Action Command
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/70"
          title="Close PCR Card"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      {/* Grid Content: Suspect Vehicle & Registration Dossier */}
      <div className="grid grid-cols-2 gap-3 text-xs mb-3">
        <div className="bg-[#070b14]/90 rounded-lg p-3 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-medium">Suspect Vehicle</div>
            <div className="mt-1">
              <PlateNumber plate={alert.detected_plate} size="md" interactive={true} />
            </div>
          </div>
          <div className="text-slate-300 text-[11px] mt-2 font-mono">
            <span className="text-slate-400">Class:</span> {vehicleClass}
          </div>
        </div>

        <div className="bg-[#070b14]/90 rounded-lg p-3 border border-slate-800">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-medium">Registered Owner &amp; FIR</div>
          <div className="text-white font-bold mt-1 text-xs truncate">{ownerName}</div>
          <div className="text-rose-400 text-[11px] font-mono truncate">{firNumber}</div>
          <div className="text-[10px] text-slate-400 font-mono mt-1">
            <span className="text-slate-400">Reg Date:</span> <span className="text-slate-200 font-medium tabular-nums">{registrationDate}</span>
          </div>
        </div>
      </div>

      {/* Intercept Location, Crime Head & Nearest Police Station */}
      <div className="bg-rose-950/25 border border-rose-800/40 rounded-lg p-3 mb-3 text-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-slate-400 font-mono text-[11px]">Intercept Location:</span>
          {alert.camera_lat && alert.camera_lng && (
            <button
              type="button"
              onClick={() => onFocusMap && onFocusMap(alert.camera_lat!, alert.camera_lng!)}
              className="text-cyan-400 hover:text-cyan-300 text-[11px] font-mono flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70 rounded"
            >
              <span>Fly to Camera</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
              </svg>
            </button>
          )}
        </div>
        <div className="text-slate-100 font-semibold flex items-center gap-2 mb-1 text-xs">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
          <span className="truncate">{alert.camera_name || alert.camera_id}</span>
        </div>
        <div className="text-[11px] text-rose-300 font-mono mb-1">
          <span className="text-rose-400 font-bold uppercase">FIR Crime Head:</span> {crimeHead}
        </div>
        <div className="text-[11px] text-cyan-300 font-mono mb-1">
          <span className="text-slate-400 font-medium">Nearest Station:</span> {policeStation}
        </div>
        <div className="text-[11px] text-slate-300 italic pt-1 border-t border-rose-900/40">
          Directive: {recommendedAction}
        </div>
      </div>

      {/* Recommended Patrol Unit with Intercept ETA */}
      <div className="bg-[#070b14]/90 border border-cyan-800/40 rounded-lg p-3 mb-3 flex items-center justify-between text-xs">
        <div>
          <div className="text-[10px] text-cyan-400 font-mono tracking-wider uppercase font-semibold">
            Recommended Patrol Interceptor
          </div>
          <div className="text-slate-100 font-bold text-xs mt-0.5">
            PCR Vanguard-04 (Sector 2 Patrol)
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5 tabular-nums">
            Distance: 1.2 km &bull; <span className="text-emerald-400 font-bold">Intercept ETA: ~3 mins</span>
          </div>
        </div>
        <div className="px-2.5 py-1 bg-cyan-950/70 border border-cyan-600/50 rounded text-cyan-300 font-mono text-xs font-bold shadow-sm">
          READY
        </div>
      </div>

      {/* Large Dispatch Action Button with :active press-down scale */}
      {dispatched ? (
        <div className="bg-emerald-950/80 border border-emerald-500/60 rounded-lg p-3 text-center shadow-lg shadow-emerald-950/50">
          <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs font-mono tracking-wide">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>PATROL UNIT DISPATCHED — EN ROUTE TO INTERCEPT</span>
          </div>
          <div className="text-[11px] text-slate-300 font-mono mt-1 tabular-nums">
            Broadcast to PCR Vanguard-04 at {dispatchTime} &bull; Radio: CH-09 TacNet
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleDispatch}
          className="tactile-active-press w-full bg-rose-600 hover:bg-rose-500 text-white font-extrabold py-3 px-4 rounded-lg shadow-xl shadow-rose-950/80 hover:shadow-rose-900/50 flex items-center justify-center gap-2 uppercase tracking-wider text-xs cursor-pointer border border-rose-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        >
          <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
          <span>1-Click PCR Unit Immediate Intercept Dispatch</span>
        </button>
      )}
    </div>
  );
};
