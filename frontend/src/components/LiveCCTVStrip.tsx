import React from 'react';
import { Camera } from '../types';
import { Maximize2, Radio, CheckCircle2 } from 'lucide-react';

interface LiveCCTVStripProps {
  cameras: Camera[];
  onSelectCamera?: (camera: Camera) => void;
  activePlate?: string;
  currentTime?: string;
}

interface DefaultCCTVFeed {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  dept: string;
  boxes: Array<{
    label: string;
    conf: string;
    top: string;
    left: string;
    width: string;
    height: string;
  }>;
}

const DEPT_BORDER_COLORS: Record<string, string> = {
  Police: 'border-[#3b82f6]/70 hover:border-[#3b82f6] shadow-[0_0_12px_rgba(59,130,246,0.15)]',
  'Transport (RTO)': 'border-[#f97316]/70 hover:border-[#f97316] shadow-[0_0_12px_rgba(249,115,22,0.15)]',
  GSRTC: 'border-[#10b981]/70 hover:border-[#10b981] shadow-[0_0_12px_rgba(16,185,129,0.15)]',
  'Municipal Corp': 'border-[#06b6d4]/70 hover:border-[#06b6d4] shadow-[0_0_12px_rgba(6,182,212,0.15)]',
  Health: 'border-[#10b981]/70 hover:border-[#10b981] shadow-[0_0_12px_rgba(16,185,129,0.15)]',
  Panchayat: 'border-[#f97316]/70 hover:border-[#f97316] shadow-[0_0_12px_rgba(249,115,22,0.15)]',
};

const DEFAULT_FEEDS: DefaultCCTVFeed[] = [
  {
    id: 'cam04',
    name: 'CAM-POL-AHM-04',
    location: '04 Paldi Circle • SG Highway, Ahmedabad',
    lat: 23.0125,
    lng: 72.5620,
    dept: 'Police',
    boxes: [
      { label: 'Car 96%', conf: '96%', top: '48%', left: '16%', width: '28%', height: '34%' },
      { label: 'Auto 87%', conf: '87%', top: '56%', left: '52%', width: '18%', height: '24%' },
      { label: 'Motorcycle 78%', conf: '78%', top: '64%', left: '74%', width: '12%', height: '20%' },
    ],
  },
  {
    id: 'cam10',
    name: 'CAM-MUN-JUN-10',
    location: '10 Char Chowk Road • Junagadh',
    lat: 21.5190,
    lng: 70.4590,
    dept: 'Municipal Corp',
    boxes: [
      { label: 'Bus 92%', conf: '92%', top: '42%', left: '44%', width: '38%', height: '42%' },
      { label: 'Car 89%', conf: '89%', top: '60%', left: '18%', width: '24%', height: '28%' },
    ],
  },
  {
    id: 'cam13',
    name: 'CAM-POL-AHM-13',
    location: '13 CN Vidhyalaya • Ambawadi, Ahmedabad',
    lat: 23.0230,
    lng: 72.5480,
    dept: 'Police',
    boxes: [
      { label: 'Car 94%', conf: '94%', top: '52%', left: '22%', width: '26%', height: '30%' },
      { label: 'Auto 81%', conf: '81%', top: '58%', left: '58%', width: '16%', height: '22%' },
      { label: 'Motorcycle 76%', conf: '76%', top: '62%', left: '78%', width: '14%', height: '24%' },
    ],
  },
];

export const LiveCCTVStrip: React.FC<LiveCCTVStripProps> = ({
  cameras,
  onSelectCamera,
  currentTime,
}) => {
  // Map feeds to available cameras if loaded
  const feeds = DEFAULT_FEEDS.map((df) => {
    const matchedCam = cameras.find((c) => c.camera_id === df.id || c.camera_id.endsWith(df.id));
    return {
      ...df,
      camera: matchedCam || {
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
      } as Camera,
    };
  });

  return (
    <div className="flex flex-col h-full bg-[#070b14] border-t border-slate-800 p-2.5 overflow-hidden select-none">
      {/* Top Strip Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <h3 className="font-mono text-xs font-bold text-white tracking-wider uppercase flex items-center gap-1.5">
            <span>LIVE CCTV FEEDS</span>
            <span className="text-cyan-400 text-[10px] font-normal">(3-CH NIGHT INTERCEPT GRID)</span>
          </h3>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px] text-slate-400">
          <div className="hidden sm:flex items-center gap-1">
            <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span className="text-slate-500">STREAM:</span>
            <span className="text-emerald-400 font-bold">LIVE (TCP)</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            <span className="text-slate-500">RECORDING:</span>
            <span className="text-cyan-400 font-bold">ACTIVE</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-300 font-bold">25 FPS</span>
          </div>
        </div>
      </div>

      {/* 3-Camera Grid Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 min-h-0 pt-2">
        {feeds.map((item) => (
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
            className={`group relative bg-[#0a0f1d] border ${DEPT_BORDER_COLORS[item.dept] || 'border-slate-800'} rounded-lg overflow-hidden flex flex-col transition-all cursor-pointer shadow-lg aspect-video sm:aspect-auto h-full`}
            title={`Click to focus map on ${item.name}`}
          >
            {/* Video Viewport Container */}
            <div className="relative w-full h-full bg-[#05070e] flex items-center justify-center overflow-hidden">
              {/* Actual MJPEG Stream */}
              <img
                src={`/api/streams/${item.id}/feed`}
                alt={item.name}
                className="absolute inset-0 w-full h-full object-cover z-0"
                onError={(e) => {
                  // If gateway feed stream is connecting, dim opacity and retain HUD
                  (e.target as HTMLImageElement).style.opacity = '0.5';
                }}
              />

              {/* Simulated Tactical Night CCTV Texture & Vignette */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70 pointer-events-none z-[2]" />

              {/* Bounding Box Overlays */}
              <div className="absolute inset-0 pointer-events-none z-[3]">
                {item.boxes.map((box, bIdx) => (
                  <div
                    key={bIdx}
                    className="absolute border border-emerald-400 bg-emerald-500/10 transition-all"
                    style={{
                      top: box.top,
                      left: box.left,
                      width: box.width,
                      height: box.height,
                    }}
                  >
                    <span className="absolute -top-4 left-0 bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 font-mono text-[8px] font-bold px-1 py-0.2 rounded whitespace-nowrap shadow-sm">
                      {box.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Tactical Crosshair / Corner Reticles */}
              <div className="absolute inset-0 pointer-events-none opacity-30 z-[4]">
                <div className="absolute top-1.5 left-1.5 w-2.5 h-2.5 border-t border-l border-cyan-400"></div>
                <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 border-t border-r border-cyan-400"></div>
                <div className="absolute bottom-1.5 left-1.5 w-2.5 h-2.5 border-b border-l border-cyan-400"></div>
                <div className="absolute bottom-1.5 right-1.5 w-2.5 h-2.5 border-b border-r border-cyan-400"></div>
              </div>

              {/* Top Bar inside Viewport */}
              <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between z-10 font-mono text-[9px]">
                <div className="flex items-center gap-1 bg-black/75 backdrop-blur-xs px-1.5 py-0.5 rounded border border-slate-700/60 text-slate-200">
                  <span className="text-cyan-300 font-bold">{item.name}</span>
                  <span className="text-emerald-400 text-[8px] font-bold">[LIVE]</span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="hidden xl:inline bg-black/75 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400 text-[8px]">
                    {currentTime ? currentTime.split('•')[1]?.trim() : 'LIVE'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCamera && onSelectCamera(item.camera);
                    }}
                    className="p-1 bg-black/75 hover:bg-cyan-950 text-slate-300 hover:text-cyan-300 rounded border border-slate-700 transition-colors"
                    title="Focus on Map"
                  >
                    <Maximize2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>

              {/* Bottom Metadata Bar */}
              <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/90 via-black/70 to-transparent z-10 font-mono">
                <div className="flex items-center justify-between text-[9px]">
                  <span className="text-slate-300 truncate font-semibold drop-shadow-sm pr-1">
                    {item.location}
                  </span>
                  <div className="flex items-center gap-1 shrink-0 text-[8px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-emerald-400 font-bold">LIVE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveCCTVStrip;
