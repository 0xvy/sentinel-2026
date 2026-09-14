import React from 'react';
import { 
  ShieldAlert, 
  Car, 
  FileText, 
  Fingerprint, 
  Radio, 
  ShieldCheck, 
  Clock
} from 'lucide-react';

interface CorrelationMatrixProps {
  activePlate: string;
  onOpenDispatch?: () => void;
  onOpenForensic?: () => void;
}

export const CorrelationMatrix: React.FC<CorrelationMatrixProps> = ({
  activePlate = 'GJ01ER8842',
  onOpenDispatch,
  onOpenForensic,
}) => {
  const cleanPlate = activePlate.replace(/\s+/g, '').toUpperCase();
  const isTargetPlate = cleanPlate === 'GJ01ER8842';
  const isSwift = cleanPlate === 'GJ05CD5678';

  return (
    <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col font-sans">
      {/* Dossier Header */}
      <div className="px-3.5 py-2 bg-[#0d1424] border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-cyan-950/80 border border-cyan-500/60 flex items-center justify-center text-cyan-400">
            <ShieldAlert className="w-3 h-3 text-cyan-400" />
          </div>
          <h3 className="font-heading font-bold text-xs tracking-wider uppercase text-white">
            5-Database Law Enforcement Correlation Dossier
          </h3>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px]">
          <div className="flex items-center gap-1 text-slate-400 bg-[#070b14] px-2 py-0.5 rounded border border-slate-800">
            <Clock className="w-2.5 h-2.5 text-cyan-400" />
            <span>Query:</span>
            <span className="text-emerald-400 font-bold">1.2ms (Total)</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold">
            Status: COMPLETE
          </span>
        </div>
      </div>

      {/* 5-Database Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 p-2.5 bg-[#070b14]">
        {/* 1. VAHAN */}
        <div className="bg-[#0d1424] border border-slate-800 hover:border-slate-700 rounded-lg p-2 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <span className="font-mono font-bold text-[10px] text-slate-200">1. VAHAN</span>
              <Car className="w-3 h-3 text-slate-400" />
            </div>
            <p className="text-[9px] text-slate-500 font-mono mt-0.5">Ministry of Road Transport</p>

            <div className="my-1.5 flex justify-center">
              {isTargetPlate ? (
                <span className="w-full py-0.5 text-center font-mono font-extrabold text-[11px] bg-red-950/80 border border-red-500 text-red-300 rounded shadow-xs shadow-red-950/50">
                  STOLEN
                </span>
              ) : isSwift ? (
                <span className="w-full py-0.5 text-center font-mono font-bold text-[11px] bg-amber-950/70 border border-amber-500/60 text-amber-300 rounded">
                  FLAGGED
                </span>
              ) : (
                <span className="w-full py-0.5 text-center font-mono font-bold text-[11px] bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 rounded">
                  VERIFIED
                </span>
              )}
            </div>

            <div className="space-y-0.5 font-mono text-[9px] text-slate-400">
              <div><span className="text-slate-500">Owner:</span> <span className="text-slate-200 font-semibold">{isTargetPlate ? 'Vikramaditya S.' : isSwift ? 'Pooja Sharma' : 'Ramesh Patel'}</span></div>
              <div><span className="text-slate-500">Model:</span> <span className="text-slate-300">{isTargetPlate ? 'Hyundai Creta' : isSwift ? 'Maruti Swift' : 'Tata Nexon'}</span></div>
              <div><span className="text-slate-500">Reg:</span> <span className="text-slate-400">{isTargetPlate ? '12-08-2023' : '05-11-2021'}</span></div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 mt-1 border-t border-slate-800/60 font-mono text-[8px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 0.8ms
            </span>
            <span className="text-slate-500">LIVE SYNC</span>
          </div>
        </div>

        {/* 2. SARTHI */}
        <div className="bg-[#0d1424] border border-slate-800 hover:border-slate-700 rounded-lg p-2 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <span className="font-mono font-bold text-[10px] text-slate-200">2. SARTHI</span>
              <FileText className="w-3 h-3 text-slate-400" />
            </div>
            <p className="text-[9px] text-slate-500 font-mono mt-0.5">Driver License Registry</p>

            <div className="my-1.5 flex justify-center">
              {isTargetPlate || isSwift ? (
                <span className="w-full py-0.5 text-center font-mono font-extrabold text-[11px] bg-amber-950/80 border border-amber-500 text-amber-300 rounded shadow-xs shadow-amber-950/50">
                  SUSPENDED
                </span>
              ) : (
                <span className="w-full py-0.5 text-center font-mono font-bold text-[11px] bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 rounded">
                  VALID DL
                </span>
              )}
            </div>

            <div className="space-y-0.5 font-mono text-[9px] text-slate-400">
              <div><span className="text-slate-500">Driver:</span> <span className="text-slate-200 font-semibold">{isTargetPlate ? 'Vikram Solanki' : isSwift ? 'Pooja Sharma' : 'Ramesh Patel'}</span></div>
              <div><span className="text-slate-500">DL No:</span> <span className="text-slate-300">{isTargetPlate ? 'GJ01-2018-045' : 'GJ05-2019-892'}</span></div>
              <div><span className="text-slate-500">Status:</span> <span className={isTargetPlate || isSwift ? 'text-amber-400 font-bold' : 'text-emerald-400'}>{isTargetPlate || isSwift ? 'DISQUALIFIED' : 'ACTIVE'}</span></div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 mt-1 border-t border-slate-800/60 font-mono text-[8px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 0.6ms
            </span>
            <span className="text-slate-500">LIVE SYNC</span>
          </div>
        </div>

        {/* 3. eGujCop */}
        <div className="bg-[#0d1424] border border-slate-800 hover:border-slate-700 rounded-lg p-2 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <span className="font-mono font-bold text-[10px] text-slate-200">3. eGujCop</span>
              <ShieldAlert className="w-3 h-3 text-slate-400" />
            </div>
            <p className="text-[9px] text-slate-500 font-mono mt-0.5">Gujarat Police CCTNS</p>

            <div className="my-1.5 flex justify-center">
              {isTargetPlate ? (
                <span className="w-full py-0.5 text-center font-mono font-extrabold text-[11px] bg-red-950/80 border border-red-500 text-red-300 rounded shadow-xs shadow-red-950/50 animate-pulse">
                  WANTED
                </span>
              ) : isSwift ? (
                <span className="w-full py-0.5 text-center font-mono font-bold text-[11px] bg-amber-950/70 border border-amber-500/60 text-amber-300 rounded">
                  OPEN FIR
                </span>
              ) : (
                <span className="w-full py-0.5 text-center font-mono font-bold text-[11px] bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 rounded">
                  NO RECORD
                </span>
              )}
            </div>

            <div className="space-y-0.5 font-mono text-[9px] text-slate-400">
              <div><span className="text-slate-500">Charge:</span> <span className={isTargetPlate ? 'text-red-300 font-bold' : 'text-slate-300'}>{isTargetPlate ? 'Sec 302 IPC (Murder)' : isSwift ? 'Sec 279 (Rash)' : 'All Clear'}</span></div>
              <div><span className="text-slate-500">FIR:</span> <span className="text-slate-300">{isTargetPlate ? '2026/0412 Crime Br.' : isSwift ? '2025/1109' : 'None'}</span></div>
              <div><span className="text-slate-500">Warrant:</span> <span className={isTargetPlate ? 'text-red-400 font-bold' : 'text-slate-400'}>{isTargetPlate ? 'NON-BAILABLE' : 'NONE'}</span></div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 mt-1 border-t border-slate-800/60 font-mono text-[8px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 1.2ms
            </span>
            <span className="text-slate-500">LIVE SYNC</span>
          </div>
        </div>

        {/* 4. AFIS */}
        <div className="bg-[#0d1424] border border-slate-800 hover:border-slate-700 rounded-lg p-2 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <span className="font-mono font-bold text-[10px] text-slate-200">4. AFIS</span>
              <Fingerprint className="w-3 h-3 text-slate-400" />
            </div>
            <p className="text-[9px] text-slate-500 font-mono mt-0.5">State Biometric Fingerprint</p>

            <div className="my-1.5 flex justify-center">
              {isTargetPlate ? (
                <span className="w-full py-0.5 text-center font-mono font-extrabold text-[11px] bg-red-950/80 border border-red-500 text-red-300 rounded shadow-xs shadow-red-950/50">
                  MATCH #AF-8942
                </span>
              ) : (
                <span className="w-full py-0.5 text-center font-mono font-bold text-[11px] bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 rounded">
                  NO BIOMETRIC HIT
                </span>
              )}
            </div>

            <div className="space-y-0.5 font-mono text-[9px] text-slate-400">
              <div><span className="text-slate-500">Match:</span> <span className={isTargetPlate ? 'text-cyan-300 font-bold' : 'text-slate-400'}>{isTargetPlate ? '99.4% Biometric' : 'No Record'}</span></div>
              <div><span className="text-slate-500">Docket:</span> <span className="text-slate-300">{isTargetPlate ? '#CR-2022-7714' : 'N/A'}</span></div>
              <div><span className="text-slate-500">Priors:</span> <span className="text-slate-300">{isTargetPlate ? '2 Armed Robbery' : 'None'}</span></div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 mt-1 border-t border-slate-800/60 font-mono text-[8px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 2.1ms
            </span>
            <span className="text-slate-500">LIVE SYNC</span>
          </div>
        </div>

        {/* 5. NAFIS */}
        <div className="bg-[#0d1424] border border-slate-800 hover:border-slate-700 rounded-lg p-2 flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
              <span className="font-mono font-bold text-[10px] text-slate-200">5. NAFIS</span>
              <ShieldCheck className="w-3 h-3 text-slate-400" />
            </div>
            <p className="text-[9px] text-slate-500 font-mono mt-0.5">National Fingerprint Grid</p>

            <div className="my-1.5 flex justify-center">
              {isTargetPlate ? (
                <span className="w-full py-0.5 text-center font-mono font-extrabold text-[11px] bg-red-950/80 border border-red-500 text-red-300 rounded shadow-xs shadow-red-950/50">
                  FUGITIVE LINK
                </span>
              ) : (
                <span className="w-full py-0.5 text-center font-mono font-bold text-[11px] bg-emerald-950/70 border border-emerald-500/60 text-emerald-300 rounded">
                  CLEAN STATUS
                </span>
              )}
            </div>

            <div className="space-y-0.5 font-mono text-[9px] text-slate-400">
              <div><span className="text-slate-500">Interstate:</span> <span className={isTargetPlate ? 'text-red-300 font-bold' : 'text-slate-400'}>{isTargetPlate ? 'RJ • MP • GJ' : 'Clean'}</span></div>
              <div><span className="text-slate-500">Linked:</span> <span className="text-slate-300">{isTargetPlate ? '4 Inter-State Cases' : '0'}</span></div>
              <div><span className="text-slate-500">Alert:</span> <span className={isTargetPlate ? 'text-red-400 font-bold' : 'text-slate-400'}>{isTargetPlate ? 'ALL UNITS ACTIVE' : 'NONE'}</span></div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 mt-1 border-t border-slate-800/60 font-mono text-[8px]">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 2.4ms
            </span>
            <span className="text-slate-500">LIVE SYNC</span>
          </div>
        </div>
      </div>

      {/* 1-Click Action Intercept Bar */}
      <div className="px-3 py-2 bg-[#0d1424] border-t border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>ALL 5 ENGINES SYNCED</span>
          <span className="text-slate-600">•</span>
          <span className="text-cyan-400 font-bold">BSA 2023 SEC 63 COMPLIANT</span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenDispatch && (
            <button
              type="button"
              onClick={onOpenDispatch}
              className="tactile-active-press px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-all shadow-md shadow-red-950/80 cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <Radio className="w-3 h-3 animate-pulse" />
              <span>1-Click PCR Dispatch</span>
            </button>
          )}

          {onOpenForensic && (
            <button
              type="button"
              onClick={onOpenForensic}
              className="tactile-active-press px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/60 text-cyan-300 font-mono text-xs font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <FileText className="w-3 h-3" />
              <span>Forensic Dossier</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CorrelationMatrix;
