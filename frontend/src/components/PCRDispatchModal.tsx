import React, { useState } from 'react';
import { ShieldAlert, Radio, Navigation, CheckCircle2, Copy, Check, X } from 'lucide-react';
import { AlertEvent } from '../types';
import rawPlateImg from '../assets/crops/raw_plate.jpg';
import enhancedPlateImg from '../assets/crops/enhanced_plate.jpg';

interface PCRDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  alert?: AlertEvent | null;
  plateNumber?: string;
}

export const PCRDispatchModal: React.FC<PCRDispatchModalProps> = ({
  isOpen,
  onClose,
  alert,
  plateNumber = 'GJ01ER8842',
}) => {
  const [dispatched, setDispatched] = useState(false);
  const [dispatchTime, setDispatchTime] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState(false);

  if (!isOpen) return null;

  const currentPlate = plateNumber || alert?.detected_plate || 'GJ01ER8842';
  const shaHash =
    alert?.snapshot_hash_sha256 ||
    '7f89d4e1c2a6b3f0e9d7c5a8e1f4b6d9c2e3a7f0b1c6d8e9f0a4c2b8d1e6f3c81e7a';

  const handleDispatch = () => {
    setDispatched(true);
    setDispatchTime(new Date().toLocaleTimeString() + ' IST');
  };

  const handleCopyHash = async () => {
    try {
      await navigator.clipboard.writeText(shaHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-[#070b14] border-2 border-red-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 font-sans max-h-[90vh]">
        {/* Top Emergency Header */}
        <div className="bg-gradient-to-r from-red-950 via-[#14070a] to-[#0d1424] border-b border-red-500/50 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500 flex items-center justify-center text-red-400 animate-pulse">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg font-black tracking-wider uppercase font-mono text-white flex items-center gap-2">
                  <span className="text-red-500">🚨</span> INTERCEPT ORDER — PRIORITY ALPHA
                </h1>
                <span className="px-2 py-0.5 rounded bg-red-500 text-white font-mono text-[10px] font-black tracking-wider">
                  THREAT: CRITICAL
                </span>
              </div>
              <p className="text-xs text-red-200/80 font-mono mt-0.5">
                CASE REF: GP/CIU/2026/1784 • GUJARAT POLICE STATE CRIME INVESTIGATION DEPT
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right font-mono text-xs text-slate-400">
              <div>OPERATION: <span className="text-red-400 font-bold">STATEWIDE PURSUIT</span></div>
              <div>CHANNEL: <span className="text-cyan-400 font-bold">TETRA TAC-09</span></div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3-Column Tactical Command Body */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 tactical-scrollbar">
          {/* Column 1: Suspect Information */}
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-red-950 border border-red-600 text-red-400 text-[10px] font-mono font-bold flex items-center justify-center">
                    01
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wide">
                    Suspect Information
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/40">
                  WANTED
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div>
                  <span className="text-slate-400 text-[11px] block">Target Vehicle:</span>
                  <div className="inline-block mt-0.5 px-3 py-1 rounded bg-slate-900 border-2 border-cyan-500/60 text-white font-extrabold text-base tracking-widest font-mono">
                    {currentPlate}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60">
                  <div>
                    <span className="text-slate-400 text-[10px]">Make / Model:</span>
                    <div className="text-slate-200 font-bold">Hyundai Creta</div>
                    <div className="text-slate-400 text-[10px]">Polar White (2023)</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Registered Owner:</span>
                    <div className="text-slate-200 font-bold">Vikramaditya Solanki</div>
                    <div className="text-slate-400 text-[10px]">Age: 34 • Male</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60">
                  <span className="text-slate-400 text-[10px]">Legal Status:</span>
                  <div className="text-red-400 font-extrabold">
                    WANTED — Sec 302 IPC / Sec 103 BNS
                  </div>
                  <div className="text-slate-400 text-[10px]">
                    FIR: 2026/0412 — Ahmedabad City Crime Branch
                  </div>
                </div>
              </div>
            </div>

            {/* Vehicle Optical Evidence Crop */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <div className="bg-[#070b14] p-1.5 rounded border border-slate-800 text-center">
                <span className="text-[9px] font-mono text-slate-400 block mb-1">CCTV SNAPSHOT</span>
                <img src={rawPlateImg} alt="Vehicle Crop" className="w-full h-12 object-contain bg-black rounded" />
                <span className="text-[9px] font-mono text-slate-500 mt-1 block">cam04 SG Hwy</span>
              </div>
              <div className="bg-[#070b14] p-1.5 rounded border border-cyan-500/30 text-center">
                <span className="text-[9px] font-mono text-cyan-400 block mb-1">ENHANCED HSRP</span>
                <img src={enhancedPlateImg} alt="Enhanced Crop" className="w-full h-12 object-contain bg-black rounded" />
                <span className="text-[9px] font-mono text-emerald-400 mt-1 block">96.2% Confidence</span>
              </div>
            </div>
          </div>

          {/* Column 2: Last Known Position & Heading */}
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-cyan-950 border border-cyan-600 text-cyan-400 text-[10px] font-mono font-bold flex items-center justify-center">
                    02
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wide">
                    Last Known Position
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                  LIVE RADAR
                </span>
              </div>

              <div className="space-y-2.5 text-xs font-mono">
                <div className="p-2.5 bg-[#070b14] rounded-lg border border-slate-800">
                  <div className="flex items-center gap-1.5 text-red-400 font-bold mb-1">
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Latest Node: CAM-POL-AHM-09</span>
                  </div>
                  <div className="text-slate-200 font-bold text-sm">
                    Madhapar Chowkadi, Rajkot Bypass
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">
                    Coordinates: 22.3160° N, 70.7850° E
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-[#070b14] rounded border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Kinematic Speed:</span>
                    <span className="text-red-400 font-extrabold text-sm">82.4 km/h</span>
                  </div>
                  <div className="p-2 bg-[#070b14] rounded border border-slate-800">
                    <span className="text-slate-400 text-[10px] block">Heading Vector:</span>
                    <span className="text-cyan-300 font-bold text-xs">SW on NH-27</span>
                  </div>
                </div>

                <div className="p-2.5 bg-[#070b14] rounded-lg border border-emerald-500/30 text-[11px]">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Haversine Kinematics Validated</span>
                  </div>
                  <span className="text-slate-400">
                    Calculated velocity (82.4 km/h) is physically consistent with highway corridor traffic.
                  </span>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-red-950/20 border border-red-900/40 rounded-lg text-[11px] font-mono text-slate-300">
              <span className="text-red-400 font-bold">⚠️ Tactical Warning:</span> Suspect has active firearm history (Arms Act violation). Do not approach vehicle alone without backup.
            </div>
          </div>

          {/* Column 3: Dispatch Assignment & Rapid Action */}
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-cyan-950 border border-cyan-600 text-cyan-400 text-[10px] font-mono font-bold flex items-center justify-center">
                    03
                  </span>
                  <span className="font-mono text-xs font-bold text-slate-200 uppercase tracking-wide">
                    Dispatch Assignment
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  UNIT READY
                </span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between p-2.5 bg-[#070b14] rounded-lg border border-slate-800">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Patrol Interceptor:</span>
                    <span className="text-cyan-300 font-extrabold text-base">PCR-09</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[10px] block">Division:</span>
                    <span className="text-slate-200 font-bold">SG Highway North</span>
                  </div>
                </div>

                <div className="p-2.5 bg-[#070b14] rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400 text-[10px]">Optimal Intercept Point:</span>
                    <span className="text-emerald-400 font-bold text-xs">ETA: ~3 MINS</span>
                  </div>
                  <div className="text-slate-100 font-bold">
                    SG Highway Northbound Ramp / Thaltej Flyover
                  </div>
                  <div className="text-slate-400 text-[10px] mt-0.5">
                    Distance: 2.8 km • Vector Heading: 014°
                  </div>
                </div>
              </div>
            </div>

            {/* Big Action Button */}
            <div className="pt-2">
              {dispatched ? (
                <div className="p-4 bg-emerald-950/80 border-2 border-emerald-500 rounded-xl text-center space-y-1 shadow-lg shadow-emerald-950/60">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 font-extrabold text-sm font-mono uppercase tracking-wider">
                    <CheckCircle2 className="w-5 h-5" />
                    DISPATCH TRANSMITTED
                  </div>
                  <p className="text-xs text-slate-300 font-mono">
                    PCR-09 en route. Live telemetry &amp; intercept telemetry synced to MDT terminal at {dispatchTime}.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleDispatch}
                  className="w-full py-4 px-4 bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:to-red-400 text-white font-extrabold font-mono text-sm tracking-wider uppercase rounded-xl border border-red-400/60 shadow-xl shadow-red-950/80 flex items-center justify-center gap-2.5 transition-all duration-75 active:scale-[0.98] cursor-pointer"
                >
                  <Radio className="w-5 h-5 animate-pulse" />
                  <span>DISPATCH UNIT PCR-09 NOW</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer Bar: Evidence Chain Digest & Legal Admissibility */}
        <div className="bg-[#0a0f1d] border-t border-slate-800 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-slate-400 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto truncate">
            <span className="text-slate-300 font-bold shrink-0">SHA-256:</span>
            <span className="text-cyan-400 truncate max-w-xs">{shaHash}</span>
            <button
              onClick={handleCopyHash}
              className="text-slate-400 hover:text-white shrink-0 p-1"
              title="Copy Evidence Hash"
            >
              {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-bold">
              BSA 2023 §63 COMPLIANT
            </span>
            <span className="text-slate-500 hidden md:inline">
              AUTHORIZED PERSONNEL ONLY
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
export default PCRDispatchModal;
