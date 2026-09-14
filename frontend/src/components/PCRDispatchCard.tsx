import React, { useState } from 'react';
import { AlertEvent } from '../types';

interface PCRDispatchCardProps {
  alert: AlertEvent;
  onClose: () => void;
  onFocusMap?: (lat: number, lng: number) => void;
}

export const PCRDispatchCard: React.FC<PCRDispatchCardProps> = ({ alert, onClose }) => {
  const [dispatched, setDispatched] = useState(false);
  const [dispatchTime, setDispatchTime] = useState<string | null>(null);

  const handleDispatch = () => {
    setDispatched(true);
    setDispatchTime(new Date().toLocaleTimeString());
  };

  const isCritical = alert.threat_level === 'CRITICAL';
  const firNumber = alert.egujcop_match?.fir_number || 'FIR-2026/0412/CRIME-BR';
  const policeStation = alert.egujcop_match?.police_station || 'Sector-7 Police Station';
  const ownerName = alert.vahan_match?.owner_name || 'Vikram Solanki';
  const vehicleClass = alert.vahan_match?.vehicle_class || 'Motor Car (LMV)';
  const crimeHead = alert.egujcop_match?.crime_head || 'Armed Robbery / Gang Op';

  return (
    <div className="bg-[#0a101f] border border-[#1e293b] rounded-lg p-3">
      {/* Section Header */}
      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 font-bold flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>TACTICAL PCR DISPATCH</span>
          <span className={isCritical ? 'text-red-400 font-bold' : 'text-amber-400 font-bold'}>
            {alert.egujcop_match?.threat_priority || 'PRIORITY 1'}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-0.5 text-xs font-bold cursor-pointer transition-colors"
          title="Close PCR Card"
        >
          ✕
        </button>
      </div>

      {/* Target Data Fields */}
      <div className="space-y-2 mb-3 text-xs font-mono">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Target Plate</span>
          <span className="text-white font-bold">{alert.detected_plate}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Owner</span>
          <span className="text-white font-bold truncate max-w-[170px]">{ownerName}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Vehicle Class</span>
          <span className="text-white font-bold">{vehicleClass}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">FIR & Crime Head</span>
          <span className="text-red-400 font-bold truncate max-w-[170px]">{firNumber} ({crimeHead})</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Nearest Station</span>
          <span className="text-white font-bold truncate max-w-[170px]">{policeStation}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Patrol ETA</span>
          <span className="text-emerald-400 font-bold">PCR Vanguard-04 (~3m)</span>
        </div>
      </div>

      {/* Action Button */}
      {dispatched ? (
        <div className="p-2 rounded-lg bg-[#040711] border border-emerald-500/50 text-center font-mono text-xs text-emerald-400 font-bold">
          UNIT DISPATCHED ({dispatchTime})
        </div>
      ) : (
        <button
          type="button"
          onClick={handleDispatch}
          className="w-full p-2.5 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold rounded-lg transition-colors cursor-pointer"
        >
          CONFIRM PCR INTERCEPT
        </button>
      )}
    </div>
  );
};

export default PCRDispatchCard;
