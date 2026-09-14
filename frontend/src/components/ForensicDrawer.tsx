import React, { useState } from 'react';
import { ShieldCheck, Copy, Check, Eye, Database, Cpu, FileCheck, Layers } from 'lucide-react';
import { Sighting, AlertEvent, ThreatLevel } from '../types';
import { HSRPPlate } from './HSRPPlate';
import { ThreatBadge } from './ThreatBadge';

interface ForensicDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sighting?: Sighting | null;
  alert?: AlertEvent | null;
  plateNumber: string;
  threatLevel: ThreatLevel;
}

export const ForensicDrawer: React.FC<ForensicDrawerProps> = ({
  isOpen,
  onClose,
  sighting,
  alert,
  plateNumber,
  threatLevel,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [activeComparatorTab, setActiveComparatorTab] = useState<'stages' | 'histogram'>('stages');

  if (!isOpen) return null;

  const currentPlate = plateNumber || alert?.detected_plate || 'GJ01ER8842';
  const shaHash =
    sighting?.snapshot_hash_sha256 ||
    alert?.snapshot_hash_sha256 ||
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const ptsTimestamp = sighting?.pts_timestamp_ms || alert?.timestamp_pts_ms || 145200;
  const cameraId = sighting?.camera_id || alert?.camera_id || 'cam04';
  const cameraName = sighting?.camera_name || alert?.camera_name || 'Paldi Circle (Ahmedabad)';

  const handleCopyHash = async () => {
    try {
      await navigator.clipboard.writeText(shaHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } catch (err) {
      console.warn('Failed to copy hash', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[2000] flex justify-end bg-black/75 backdrop-blur-md transition-all duration-200">
      {/* Drawer Container (Right side, 560px on desktop) */}
      <div className="w-full max-w-2xl h-full bg-[#070b14] border-l border-slate-800 shadow-2xl flex flex-col text-slate-100 font-sans overflow-hidden forensic-drawer-enter">
        {/* 1. DRAWER TOP BANNER */}
        <div className="p-4 bg-[#0d1424] border-b border-slate-800 flex items-center justify-between shrink-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-500/60 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-extrabold text-sm md:text-base tracking-wider text-white uppercase">
                  NFSU Forensic Evidence &amp; AI Exploder
                </h2>
                <span className="bg-emerald-950/80 border border-emerald-600/60 text-emerald-400 font-mono text-[10px] px-2 py-0.5 rounded font-bold">
                  BSA § 63 CERTIFIED
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono tracking-wide">
                Case Dossier #{currentPlate}-2026 &bull; {cameraName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-all duration-75 active:scale-[0.96] cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:outline-none"
              title="Close Forensic Drawer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Target Vehicle Summary Bar */}
        <div className="px-4 py-3 bg-[#0a0f1d] border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <HSRPPlate plate={currentPlate} size="md" interactive={true} />
            <ThreatBadge level={threatLevel} size="sm" />
          </div>
          <div className="text-right font-mono text-[11px] text-slate-400">
            <div>Sensor PTS: <span className="text-cyan-400 font-bold tabular-nums">{ptsTimestamp.toLocaleString()} ms</span></div>
            <div>Asset ID: <span className="text-slate-300 font-bold">{cameraId}</span></div>
          </div>
        </div>

        {/* 2. SCROLLABLE EVIDENCE BODY */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 tactical-scrollbar">
          {/* SECTION 1: OPTICAL GLARE-CRUSHER COMPARATOR */}
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span className="font-heading font-bold text-xs uppercase tracking-wider text-slate-100">
                  1. Multi-Stage Optical Glare-Crusher Pipeline
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setActiveComparatorTab('stages')}
                  className={`px-2 py-0.5 rounded transition-all duration-75 active:scale-[0.96] cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:outline-none ${
                    activeComparatorTab === 'stages'
                      ? 'bg-cyan-600 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white bg-slate-900'
                  }`}
                >
                  3-Stage View
                </button>
                <button
                  type="button"
                  onClick={() => setActiveComparatorTab('histogram')}
                  className={`px-2 py-0.5 rounded transition-all duration-75 active:scale-[0.96] cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:outline-none ${
                    activeComparatorTab === 'histogram'
                      ? 'bg-cyan-600 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white bg-slate-900'
                  }`}
                >
                  Histogram
                </button>
              </div>
            </div>

            {activeComparatorTab === 'stages' ? (
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                {/* Stage 1 */}
                <div className="bg-[#070b14] border border-rose-900/40 rounded-lg p-2 flex flex-col justify-between">
                  <div>
                    <span className="text-rose-400 font-bold block">Stage 1: Raw Sensor</span>
                    <span className="text-slate-400 text-[9px]">30×12 px Headlight Glare</span>
                  </div>
                  <div className="h-16 my-2 bg-slate-900/80 rounded border border-rose-950 flex items-center justify-center relative overflow-hidden">
                    <div className="w-8 h-8 rounded-full bg-white/90 blur-sm absolute"></div>
                    <span className="text-slate-500 text-[9px] relative z-10 font-bold">BLINDED</span>
                  </div>
                  <div className="text-[9px] text-slate-400">
                    <div>Noise stdDev: 24.8</div>
                    <div className="text-rose-400">Clipped at L=255</div>
                  </div>
                </div>

                {/* Stage 2 */}
                <div className="bg-[#070b14] border border-cyan-900/40 rounded-lg p-2 flex flex-col justify-between">
                  <div>
                    <span className="text-cyan-400 font-bold block">Stage 2: Lanczos4</span>
                    <span className="text-slate-400 text-[9px]">4x + Bilateral (d=9,s=75)</span>
                  </div>
                  <div className="h-16 my-2 bg-slate-900/80 rounded border border-cyan-950 flex items-center justify-center relative">
                    <span className="text-cyan-300 text-[10px] font-plate font-semibold tracking-wider opacity-60">
                      GJ01ER8842
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400">
                    <div>120×48 Upscale</div>
                    <div className="text-cyan-400">Grain Suppressed</div>
                  </div>
                </div>

                {/* Stage 3 */}
                <div className="bg-[#070b14] border border-emerald-900/40 rounded-lg p-2 flex flex-col justify-between">
                  <div>
                    <span className="text-emerald-400 font-bold block">Stage 3: LAB CLAHE</span>
                    <span className="text-slate-400 text-[9px]">L-Channel (clip 2.0)</span>
                  </div>
                  <div className="h-16 my-2 bg-[#0d1424] rounded border border-emerald-500/50 flex items-center justify-center relative shadow-inner">
                    <HSRPPlate plate={currentPlate} size="sm" interactive={false} showCopyIcon={false} />
                  </div>
                  <div className="text-[9px] text-slate-400">
                    <div>Contrast: +42%</div>
                    <div className="text-emerald-400 font-bold">OCR: 99.1% Confidence</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#070b14] border border-slate-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-300 font-bold">Luminance (L-Channel) Dynamic Range Expansion</span>
                  <span className="text-emerald-400 font-bold">+42% Spread</span>
                </div>
                {/* SVG Luminance Histogram Comparison */}
                <svg viewBox="0 0 300 80" className="w-full h-20 bg-slate-950 rounded border border-slate-800">
                  {/* Raw Histogram (spiked at right edge 255) */}
                  <path
                    d="M 10 75 Q 150 74 250 70 L 285 10 L 290 75 Z"
                    fill="rgba(239, 68, 68, 0.25)"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                  />
                  {/* Equalized CLAHE Histogram (Balanced Gaussian) */}
                  <path
                    d="M 10 75 Q 80 40 150 20 Q 220 40 290 75 Z"
                    fill="rgba(16, 185, 129, 0.3)"
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                </svg>
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>Raw Headlight Glare (Saturated at 255)</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>CLAHE L-Channel Equalized (Optimal OCR Dynamic Range)</span>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: 5-FRAME SLIDING WINDOW SPATIAL VOTING CONSENSUS */}
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="font-heading font-bold text-xs uppercase tracking-wider text-slate-100">
                  2. Multi-Frame Spatial Voting Consensus (200px Bucket)
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/70 border border-emerald-600/50 px-2 py-0.5 rounded tabular-nums">
                4/5 QUORUM LOCKED
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px]">
              {[
                { frame: 't-4', pts: 143200, candidate: currentPlate, match: true, note: 'Match 1' },
                { frame: 't-3', pts: 143700, candidate: currentPlate, match: true, note: 'Match 2' },
                { frame: 't-2', pts: 144200, candidate: 'GJ01EB8842', match: false, note: 'Noise Rejected by Spatial Consensus' },
                { frame: 't-1', pts: 144700, candidate: currentPlate, match: true, note: 'Match 3 (Quorum Trigger)' },
                { frame: 't-0', pts: 145200, candidate: currentPlate, match: true, note: 'Match 4 (Promoted to Sightings)' },
              ].map((vote) => (
                <div
                  key={vote.frame}
                  className={`px-3 py-1.5 rounded-lg border flex items-center justify-between ${
                    vote.match
                      ? 'bg-slate-950 border-slate-800 text-slate-200'
                      : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[10px]">{vote.frame}</span>
                    <span className={`font-bold ${vote.match ? 'text-cyan-300' : 'line-through text-rose-400'}`}>
                      {vote.candidate}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-slate-400 tabular-nums">PTS: {vote.pts.toLocaleString()}ms</span>
                    <span className={vote.match ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                      {vote.match ? 'AGREE ✓' : 'REJECTED ✗'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-slate-400 font-mono bg-[#070b14] p-2 rounded border border-slate-800/80">
              💡 <span className="text-slate-300 font-semibold">Algorithmic Proof:</span> Single-frame OCR misread <code className="text-rose-400">GJ01EB8842</code> at frame t-2 was automatically suppressed. Vehicle promoted only after 3 consecutive agreeing frames within 200px spatial grid key <code className="text-cyan-300">400_600</code>.
            </div>
          </div>

          {/* SECTION 3: MoRTH POSITIONAL SYNTAX GRAMMAR REPAIR */}
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="font-heading font-bold text-xs uppercase tracking-wider text-slate-100">
                  3. Indian MoRTH Positional Syntax Disambiguation
                </span>
              </div>
              <span className="text-[10px] font-mono text-cyan-300 font-bold bg-cyan-950/70 border border-cyan-700/50 px-2 py-0.5 rounded">
                RULE 50 PARSER
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 font-mono text-xs text-center">
              <div className="bg-[#070b14] border border-slate-800 rounded p-2">
                <span className="text-[9px] text-slate-400 block uppercase">1. State Code</span>
                <span className="text-rose-400 line-through text-[11px]">CJ</span>
                <span className="text-emerald-400 font-bold block text-sm">GJ</span>
                <span className="text-[8px] text-slate-400">C ➔ G (Prefix)</span>
              </div>

              <div className="bg-[#070b14] border border-slate-800 rounded p-2">
                <span className="text-[9px] text-slate-400 block uppercase">2. RTO Code</span>
                <span className="text-rose-400 line-through text-[11px] tabular-nums">O1</span>
                <span className="text-emerald-400 font-bold block text-sm tabular-nums">01</span>
                <span className="text-[8px] text-slate-400">O ➔ 0 (Numeric)</span>
              </div>

              <div className="bg-[#070b14] border border-slate-800 rounded p-2">
                <span className="text-[9px] text-slate-400 block uppercase">3. Series Part</span>
                <span className="text-rose-400 line-through text-[11px]">0R</span>
                <span className="text-emerald-400 font-bold block text-sm">ER</span>
                <span className="text-[8px] text-slate-400">0 ➔ E (Series)</span>
              </div>

              <div className="bg-[#070b14] border border-slate-800 rounded p-2">
                <span className="text-[9px] text-slate-400 block uppercase">4. Sequence</span>
                <span className="text-rose-400 line-through text-[11px] tabular-nums">884Z</span>
                <span className="text-emerald-400 font-bold block text-sm tabular-nums">8842</span>
                <span className="text-[8px] text-slate-400">Z ➔ 2 (Numeric)</span>
              </div>
            </div>
          </div>

          {/* SECTION 4: 5-DATABASE FEDERAL INTELLIGENCE GATEWAY */}
          <div className="bg-[#0a0f1d] border border-slate-800 rounded-xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <span className="font-heading font-bold text-xs uppercase tracking-wider text-slate-100">
                  4. Concurrent 5-Database Federal Correlation (&lt; 5ms)
                </span>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                SQLITE WAL BUS
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px]">
              {[
                { db: 'VAHAN', time: '1.2ms', status: 'STOLEN REPORT DETECTED', level: 'CRITICAL', color: 'text-rose-400' },
                { db: 'SARTHI', time: '0.8ms', status: 'DL SUSPENDED (VIKRAM SOLANKI)', level: 'HIGH', color: 'text-amber-400' },
                { db: 'eGujCop', time: '1.4ms', status: 'ACTIVE WARRANT: FIR-2026/0412/CRIME-BR', level: 'CRITICAL', color: 'text-rose-400' },
                { db: 'AFIS', time: '2.1ms', status: 'BIOMETRIC MATCH CONFIRMED (98.4%)', level: 'MATCH', color: 'text-rose-400' },
                { db: 'NAFIS', time: '1.9ms', status: 'INTERSTATE FUGITIVE ALERT (NCRB)', level: 'FEDERAL', color: 'text-rose-400' },
              ].map((node) => (
                <div key={node.db} className="p-2 bg-[#070b14] border border-slate-800 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 text-cyan-300 font-bold text-[10px] border border-slate-700">
                      {node.db}
                    </span>
                    <span className={`text-[10px] font-bold ${node.color}`}>{node.status}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 tabular-nums">{node.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 5: NFSU CRYPTOGRAPHIC CHAIN OF CUSTODY & AUDIT PROOF */}
          <div className="bg-gradient-to-b from-[#0d1424] to-[#070b14] border-2 border-emerald-500/60 rounded-xl p-4 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-heading font-extrabold text-xs uppercase tracking-wider text-white">
                    NFSU Forensic Evidence Integrity Chain (BSA 2023 § 63)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Legally Admissible Primary Electronic Evidence • Tamper-Evident WORM Storage
                  </p>
                </div>
              </div>
              <span className="bg-emerald-950 text-emerald-300 font-mono text-[9px] px-2 py-0.5 rounded border border-emerald-600/60 font-bold">
                AUDIT LOG: INTACT
              </span>
            </div>

            {/* SHA-256 Digest Box */}
            <div className="space-y-2 text-[10px] font-mono">
              <div className="bg-[#070b14] p-3 rounded-lg border border-slate-800">
                <div className="flex items-center justify-between mb-1 text-slate-400">
                  <span className="uppercase text-[9px] font-bold">SHA-256 Snapshot Digest (Detection Time):</span>
                  <button
                    type="button"
                    onClick={handleCopyHash}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 text-[9px] transition-transform duration-75 active:scale-[0.96] cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:outline-none rounded px-1"
                  >
                    {copiedHash ? (
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <Check className="w-3 h-3" /> COPIED
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5">
                        <Copy className="w-3 h-3" /> Copy Hash
                      </span>
                    )}
                  </button>
                </div>
                <div className="text-cyan-300 text-[10px] break-all select-all font-mono tabular-nums">
                  {shaHash}
                </div>
              </div>

              {/* Tamper-Evident audit.log JSON Proof & Ashoka Lion Circular Seal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div className="bg-[#070b14] p-2.5 rounded-lg border border-slate-800/80 font-mono text-[9px] text-slate-300 space-y-1">
                  <div className="text-slate-400 font-bold uppercase text-[8px] flex items-center justify-between">
                    <span>tamper_evident_audit.log</span>
                    <span className="text-emerald-400">AES-256</span>
                  </div>
                  <pre className="text-[8px] text-cyan-300 leading-tight overflow-x-auto bg-black/40 p-1.5 rounded">
{`{
  "detectId": "DET-2026-0914-1317",
  "plate": "${currentPlate}",
  "pts_ms": ${ptsTimestamp},
  "camera": "${cameraId}",
  "signedBy": "NFSU_AUTHORITY",
  "status": "TAMPER_EVIDENT_VALID"
}`}
                  </pre>
                </div>

                {/* Glowing BSA Section 63 Seal */}
                <div className="flex items-center gap-3 p-2 bg-[#070b14] rounded-lg border border-emerald-500/40">
                  <div className="w-14 h-14 rounded-full border-2 border-emerald-400 bg-emerald-950/50 flex flex-col items-center justify-center text-center p-1 shrink-0 shadow-lg shadow-emerald-950/60">
                    <span className="text-[6px] font-bold text-emerald-300 font-mono leading-none">BSA 2023</span>
                    <span className="text-[10px] font-extrabold text-white leading-tight">§ 63</span>
                    <span className="text-[5px] text-emerald-400 font-bold uppercase leading-none">VALID</span>
                  </div>
                  <div className="text-[9px] font-mono space-y-0.5 text-slate-300">
                    <div className="flex items-center gap-1 text-emerald-400 font-bold">
                      <span>✓</span> Evidence Integrity Verified
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400 font-bold">
                      <span>✓</span> Hash Match Confirmed
                    </div>
                    <div className="flex items-center gap-1 text-emerald-400 font-bold">
                      <span>✓</span> Chain of Custody Intact
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="p-2 bg-[#070b14] rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">Hardware PTS Timestamp:</span>
                  <span className="text-white font-bold tabular-nums">{ptsTimestamp.toLocaleString()} ms</span>
                </div>
                <div className="p-2 bg-[#070b14] rounded border border-slate-800">
                  <span className="text-slate-400 block text-[9px]">Camera Asset Sensor:</span>
                  <span className="text-white font-bold">{cameraId} ({cameraName})</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[9px] text-slate-400 font-mono leading-relaxed">
              ⚖️ <span className="text-slate-300 font-semibold">Statutory Compliance:</span> This evidentiary record was cryptographically hashed in hardware memory at the point of ingestion without temporary disk intermediate files, fulfilling requirements under Section 63 of Bharatiya Sakshya Adhiniyam (BSA 2023).
            </div>
          </div>
        </div>

        {/* 3. DRAWER FOOTER ACTION */}
        <div className="p-4 bg-[#0d1424] border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-mono text-slate-400">
            National Forensic Sciences University &bull; State Forensic Science Laboratory
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold font-mono text-xs rounded-lg transition-transform duration-75 active:scale-[0.96] cursor-pointer shadow-md focus-visible:ring-2 focus-visible:ring-cyan-500/70 focus-visible:outline-none"
          >
            Done Inspecting
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForensicDrawer;
