import React from 'react';
import { X, Layers, Cpu, Database, ShieldAlert, Network, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2500] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-6xl bg-[#070b14] border-2 border-cyan-500/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 font-sans max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#0d1424] border-b border-slate-800 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-500/60 flex items-center justify-center text-cyan-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-extrabold text-base tracking-wider text-white uppercase">
                  Sentinel 2026 — End-to-End System Architecture
                </h2>
                <span className="bg-cyan-950/80 border border-cyan-700/60 text-cyan-300 font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                  MODEL 1 FEDERATION
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Real-Time Vehicle Intelligence &amp; Law Enforcement Integration • Gujarat Police Command Grid
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5-Column Architecture Pipeline Body */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-5 gap-3 flex-1 tactical-scrollbar text-xs font-mono">
          {/* Layer 1: Ingestion Layer */}
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-800 text-cyan-400 font-bold">
                <Network className="w-4 h-4" />
                <span>1. INGESTION LAYER</span>
              </div>
              <p className="text-[10px] text-slate-400 mb-2">
                Video Acquisition &amp; Gateway Management
              </p>

              <div className="space-y-2">
                <div className="p-2 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-white font-bold text-[11px]">30 CCTV Feeds</div>
                  <div className="text-emerald-400 text-[10px]">28 Online • 2 Maint</div>
                  <div className="text-slate-500 text-[9px] mt-0.5">Police • RTO • GSRTC • AMC</div>
                </div>

                <div className="p-2 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-slate-300 text-[10px]">RTSP/TCP Gateway</div>
                  <div className="text-cyan-300 text-[9px] truncate">103.250.160.189:8554</div>
                  <div className="text-slate-500 text-[9px] mt-0.5">Zero UDP packet loss</div>
                </div>

                <div className="p-2 bg-[#070b14] rounded border border-slate-800 text-[9px] space-y-0.5 text-slate-400">
                  <div>Res: <span className="text-slate-200">1080p Full HD</span></div>
                  <div>FPS: <span className="text-slate-200">25 FPS per cam</span></div>
                  <div>Sync: <span className="text-slate-200">Hardware PTS</span></div>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
              <span>Latency</span>
              <span>&lt; 200ms</span>
            </div>
          </div>

          {/* Layer 2: ML Vision Engine */}
          <div className="bg-[#0a0f1d] border border-cyan-500/40 rounded-xl p-3 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-800 text-cyan-300 font-bold">
                <Cpu className="w-4 h-4" />
                <span>2. ML VISION ENGINE</span>
              </div>
              <p className="text-[10px] text-slate-400 mb-2">
                Dual-Stage Detection &amp; Dual-OCR
              </p>

              <div className="space-y-1.5 text-[10px]">
                <div className="p-1.5 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-white font-bold">Stage 1: Vehicle Detect</div>
                  <div className="text-cyan-400 text-[9px]">YOLOv8n (8.4ms)</div>
                </div>

                <div className="p-1.5 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-white font-bold">Stage 2: Plate Slicing</div>
                  <div className="text-cyan-400 text-[9px]">YOLOv11n-Plate (4.1ms)</div>
                </div>

                <div className="p-1.5 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-white font-bold">Stage 3: Glare-Crusher</div>
                  <div className="text-emerald-400 text-[9px]">CLAHE + Lanczos4 (3.1ms)</div>
                </div>

                <div className="p-1.5 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-white font-bold">Stage 4: Dual-OCR</div>
                  <div className="text-cyan-400 text-[9px]">Fast-Plate-OCR CCT (21.6ms)</div>
                </div>

                <div className="p-1.5 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-white font-bold">Stage 5: Kalman Consensus</div>
                  <div className="text-emerald-400 text-[9px]">5-Frame Smoothing (5.4ms)</div>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
              <span>Total Latency</span>
              <span>37.1ms E2E</span>
            </div>
          </div>

          {/* Layer 3: Correlation Engine */}
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-800 text-amber-400 font-bold">
                <Database className="w-4 h-4" />
                <span>3. CORRELATION</span>
              </div>
              <p className="text-[10px] text-slate-400 mb-2">
                5-Database State Federation
              </p>

              <div className="space-y-1.5 text-[10px]">
                <div className="p-1.5 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-white font-bold">VAHAN</div>
                  <div className="text-slate-400 text-[9px]">Vehicle &amp; Stolen Check (&lt;1ms)</div>
                </div>

                <div className="p-1.5 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-white font-bold">SARTHI</div>
                  <div className="text-slate-400 text-[9px]">DL Suspension Check (&lt;1ms)</div>
                </div>

                <div className="p-1.5 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-white font-bold">eGujCop (CCTNS)</div>
                  <div className="text-rose-400 text-[9px]">FIRs &amp; Wanted Absconders</div>
                </div>

                <div className="p-1.5 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-white font-bold">AFIS (State)</div>
                  <div className="text-slate-400 text-[9px]">Biometric Records Match</div>
                </div>

                <div className="p-1.5 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-white font-bold">NAFIS (National)</div>
                  <div className="text-slate-400 text-[9px]">Interstate Fugitive Crosslink</div>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
              <span>Query Time</span>
              <span>&lt; 3ms Total</span>
            </div>
          </div>

          {/* Layer 4: Intelligence & Legal */}
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-800 text-rose-400 font-bold">
                <ShieldAlert className="w-4 h-4" />
                <span>4. INTELLIGENCE</span>
              </div>
              <p className="text-[10px] text-slate-400 mb-2">
                Kinematics &amp; Court Admissibility
              </p>

              <div className="space-y-1.5 text-[10px]">
                <div className="p-1.5 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-white font-bold">Threat Engine</div>
                  <div className="text-rose-400 text-[9px]">🔴 CRITICAL • 🟠 HIGH • 🟢 NORMAL</div>
                </div>

                <div className="p-1.5 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-white font-bold">Trajectory &amp; Haversine</div>
                  <div className="text-emerald-400 text-[9px]">Kinematic v &le; 160 km/h bound</div>
                </div>

                <div className="p-1.5 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-white font-bold">NFSU SHA-256</div>
                  <div className="text-cyan-400 text-[9px]">Hardware memory digest</div>
                </div>

                <div className="p-1.5 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-white font-bold">BSA 2023 §63</div>
                  <div className="text-emerald-400 text-[9px]">Primary Electronic Evidence</div>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
              <span>Audit Storage</span>
              <span>WORM Intact</span>
            </div>
          </div>

          {/* Layer 5: Delivery & Action */}
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-3 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-800 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>5. DELIVERY</span>
              </div>
              <p className="text-[10px] text-slate-400 mb-2">
                Real-Time Ops &amp; Field Dispatch
              </p>

              <div className="space-y-1.5 text-[10px]">
                <div className="p-1.5 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-white font-bold">FastAPI Backend</div>
                  <div className="text-cyan-400 text-[9px]">Async WebSocket &amp; REST</div>
                </div>

                <div className="p-1.5 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-white font-bold">React RTCC UI</div>
                  <div className="text-slate-300 text-[9px]">GIS Map + Video Wall</div>
                </div>

                <div className="p-1.5 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-white font-bold">1-Click PCR Dispatch</div>
                  <div className="text-rose-400 text-[9px]">TETRA Encrypted Intercept</div>
                </div>

                <div className="p-1.5 bg-[#070b14] rounded border border-slate-800">
                  <div className="text-white font-bold">Evaluation Export</div>
                  <div className="text-emerald-400 text-[9px]">Jury CSV Report Ready</div>
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-emerald-400 font-bold">
              <span>Dispatch ETA</span>
              <span>~3 mins</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#0d1424] border-t border-slate-800 p-4 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
          <div className="flex items-center gap-2 text-cyan-400">
            <ShieldCheck className="w-4 h-4" />
            <span>FULL STATEWIDE CORRELATION ACTIVE • 80,000 CAMERA FEDERATION READY</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg transition-colors"
          >
            Close Architecture
          </button>
        </div>
      </div>
    </div>
  );
};
export default ArchitectureModal;
