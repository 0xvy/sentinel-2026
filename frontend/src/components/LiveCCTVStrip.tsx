import React, { useState } from 'react';
import { Camera } from '../types';
import { Eye, EyeOff } from 'lucide-react';

interface LiveCCTVStripProps {
  cameras: Camera[];
  onSelectCamera?: (camera: Camera) => void;
  activePlate?: string;
  currentTime?: string;
}

interface PlateScannerTarget {
  plate: string;
  confidence: string;
  status: string;
  threatLevel: 'CRITICAL' | 'HIGH' | 'NORMAL';
  top: string;
  left: string;
  width: string;
  height: string;
}

interface DefaultCCTVFeed {
  id: string;
  code: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  dept: string;
  targetPlate: PlateScannerTarget;
}

const DEFAULT_FEEDS: DefaultCCTVFeed[] = [
  {
    id: 'cam04',
    code: 'CAMERA 3:30',
    name: 'CAM-POL-AHM-04',
    location: 'Paldi Circle • SG Highway',
    lat: 23.0125,
    lng: 72.5620,
    dept: 'Police',
    targetPlate: {
      plate: 'GJ01ER8842',
      confidence: '99.4%',
      status: 'STOLEN & WANTED',
      threatLevel: 'CRITICAL',
      top: '60%',
      left: '26%',
      width: '21%',
      height: '7.5%',
    },
  },
  {
    id: 'cam10',
    code: 'CAMERA 2:00',
    name: 'CAM-MUN-JUN-10',
    location: 'Char Chowk Road • Junagadh',
    lat: 21.5190,
    lng: 70.4590,
    dept: 'Municipal Corp',
    targetPlate: {
      plate: 'GJ05CD5678',
      confidence: '97.2%',
      status: 'SUSPENDED DL',
      threatLevel: 'HIGH',
      top: '56%',
      left: '44%',
      width: '19%',
      height: '7%',
    },
  },
  {
    id: 'cam13',
    code: 'CAMERA 12:3',
    name: 'CAM-POL-AHM-13',
    location: 'CN Vidhyalaya • Ambawadi',
    lat: 23.0230,
    lng: 72.5480,
    dept: 'Police',
    targetPlate: {
      plate: 'GJ27K9012',
      confidence: '98.8%',
      status: 'VERIFIED CLEAN',
      threatLevel: 'NORMAL',
      top: '52%',
      left: '30%',
      width: '19%',
      height: '7%',
    },
  },
];

export const LiveCCTVStrip: React.FC<LiveCCTVStripProps> = ({
  cameras,
  onSelectCamera,
  activePlate,
  currentTime,
}) => {
  const [showANPRHUD, setShowANPRHUD] = useState<boolean>(true);

  const feeds = DEFAULT_FEEDS.map((df) => {
    const matchedCam = cameras.find((c) => c.camera_id === df.id || c.camera_id.endsWith(df.id));
    return {
      ...df,
      camera: matchedCam || ({
        camera_id: df.id,
        camera_name: df.name,
        lat: df.lat,
        lng: df.lng,
        department: df.dept,
        status: 'Online',
        district: 'Ahmedabad',
        resolution: '1080p',
        fps: 25,
        stream_url: `rtsp://103.250.160.189:8554/live/${df.id}`,
        vms_vendor: 'Milestone XProtect',
        ptz_capable: true,
        last_heartbeat: new Date().toISOString(),
      } as Camera),
    };
  });

  const timestampDisplay = currentTime
    ? `2026/09/14 ${currentTime.split('•')[1]?.trim() || '21:08:30'}`
    : '2026/09/14 21:08:30';

  return (
    <div className="flex flex-col h-full bg-[#070b14] border-t border-slate-800 p-3 overflow-hidden select-none">
      {/* Top Strip Header */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            LIVE NIGHT CCTV VIDEO WALL
          </h2>
          <span className="text-slate-600 text-xs">•</span>
          <span className="text-[10px] font-mono text-slate-400">
            HSRP ANPR SCANNER
          </span>
        </div>

        {/* Tactical ANPR HUD Toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowANPRHUD(!showANPRHUD)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer border ${
              showANPRHUD
                ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500/70 shadow-cyan-950/40'
                : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle ANPR Number Plate Scanning Reticles"
          >
            {showANPRHUD ? <Eye className="w-3 h-3 text-cyan-400" /> : <EyeOff className="w-3 h-3" />}
            <span>ANPR RETICLE: {showANPRHUD ? 'ACTIVE' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* 3-Camera Grid Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 min-h-0">
        {feeds.map((item) => {
          const isTargetFeed = item.id === 'cam04' || item.camera.camera_id === 'CAM-POL-AHM-04';
          const plateText = isTargetFeed && activePlate ? activePlate : item.targetPlate.plate;
          const isCritical = isTargetFeed || item.targetPlate.threatLevel === 'CRITICAL';
          const isHigh = !isCritical && item.targetPlate.threatLevel === 'HIGH';

          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectCamera && onSelectCamera(item.camera)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectCamera && onSelectCamera(item.camera);
                }
              }}
              className="group relative bg-[#040711] border border-slate-800 rounded-lg overflow-hidden flex flex-col h-full cursor-pointer transition-colors hover:border-slate-600"
              title={`Click to focus map on ${item.name}`}
            >
              {/* Video Viewport Container */}
              <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
                {/* Grayscale Night CCTV Surveillance MJPEG Stream */}
                <img
                  src={`/api/streams/${item.id}/feed`}
                  alt={item.name}
                  className="absolute inset-0 w-full h-full object-cover z-0 filter grayscale contrast-125 brightness-90"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = '0.5';
                  }}
                />

                {/* Tactical Number Plate Scanning Reticle */}
                {showANPRHUD && (
                  <div
                    className={`absolute pointer-events-none transition-all duration-300 z-[3] ${
                      isCritical
                        ? 'border-2 border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.7)]'
                        : isHigh
                        ? 'border-2 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.6)]'
                        : 'border-2 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.6)]'
                    } bg-black/25 rounded-xs`}
                    style={{
                      top: item.targetPlate.top,
                      left: item.targetPlate.left,
                      width: item.targetPlate.width,
                      height: item.targetPlate.height,
                    }}
                  >
                    {/* Corner Brackets for Military/Police ANPR Reticle */}
                    <div className={`absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 ${isCritical ? 'border-red-400' : isHigh ? 'border-amber-300' : 'border-emerald-300'}`} />
                    <div className={`absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 ${isCritical ? 'border-red-400' : isHigh ? 'border-amber-300' : 'border-emerald-300'}`} />
                    <div className={`absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 ${isCritical ? 'border-red-400' : isHigh ? 'border-amber-300' : 'border-emerald-300'}`} />
                    <div className={`absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 ${isCritical ? 'border-red-400' : isHigh ? 'border-amber-300' : 'border-emerald-300'}`} />

                    {/* Center Plate Reticle Crosshair */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className={`w-3 h-0.5 ${isCritical ? 'bg-red-500/80' : 'bg-emerald-400/80'}`} />
                      <div className={`h-3 w-0.5 absolute ${isCritical ? 'bg-red-500/80' : 'bg-emerald-400/80'}`} />
                    </div>

                    {/* Laser Scan Sweep Animation */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className={`w-full h-0.5 ${isCritical ? 'bg-red-400 shadow-[0_0_8px_#ef4444]' : 'bg-emerald-400 shadow-[0_0_8px_#10b981]'} animate-pulse`} />
                    </div>

                    {/* Pinned HSRP Plate Badge (Top) */}
                    <div className={`absolute -top-5.5 left-0 flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold whitespace-nowrap shadow-xl border ${
                      isCritical
                        ? 'bg-[#070b14]/95 border-red-500 text-red-400'
                        : isHigh
                        ? 'bg-[#070b14]/95 border-amber-500 text-amber-300'
                        : 'bg-[#070b14]/95 border-emerald-500 text-emerald-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-red-500 animate-ping' : isHigh ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                      <span className="tracking-wider">HSRP: {plateText}</span>
                      <span className="text-[8px] opacity-80">({item.targetPlate.confidence})</span>
                      {isCritical && (
                        <span className="bg-red-600 text-white px-1 py-0.2 rounded text-[8px] font-extrabold uppercase tracking-wide">
                          {item.targetPlate.status}
                        </span>
                      )}
                    </div>

                    {/* Bottom IND Spec Tag */}
                    <div className="absolute -bottom-4 right-0 flex items-center gap-1 text-[8px] font-mono text-slate-300 bg-black/85 px-1 rounded border border-slate-700/60 whitespace-nowrap">
                      <span className="text-cyan-400 font-bold">IND</span>
                      <span>HSRP ANPR</span>
                    </div>
                  </div>
                )}

                {/* Top Bar inside Viewport: Camera Name & Synchronized Timestamp */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 font-mono text-[10px] pointer-events-none">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-bold tracking-wider drop-shadow-md bg-black/60 px-1.5 py-0.5 rounded border border-slate-800">
                      {item.code}
                    </span>
                    <span className="text-slate-400 text-[9px] drop-shadow-md hidden sm:inline">
                      {item.dept}
                    </span>
                  </div>
                  <span className="text-slate-300 drop-shadow-md bg-black/60 px-1.5 py-0.5 rounded border border-slate-800">
                    {timestampDisplay}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LiveCCTVStrip;
