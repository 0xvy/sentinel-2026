import React from 'react';
import { Camera } from '../types';
import { Maximize2, CheckCircle2 } from 'lucide-react';

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

const DEFAULT_FEEDS: DefaultCCTVFeed[] = [
  {
    id: 'cam04',
    name: 'CAM-POL-AHM-04',
    location: 'Paldi Circle • SG Highway, Ahmedabad',
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
    location: 'Char Chowk Road • Junagadh',
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
    location: 'CN Vidhyalaya • Ambawadi, Ahmedabad',
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

  return (
    <div className="flex flex-col h-full bg-[#0a101f] border-t border-[#1e293b] p-3 overflow-hidden select-none">
      {/* Top Strip Header */}
      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 font-bold flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span>LIVE CCTV FEEDS (3-CH INTERCEPT)</span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono font-normal">
          <div className="hidden sm:flex items-center gap-1">
            <span className="text-slate-400">STREAM:</span>
            <span className="text-white font-bold">TCP LIVE</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            <span className="text-slate-400">RECORDING:</span>
            <span className="text-white font-bold">ACTIVE</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-400 font-bold">25 FPS</span>
          </div>
        </div>
      </div>

      {/* 3-Camera Grid Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1 min-h-0">
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
            className="group relative bg-[#040711] border border-[#1e293b] rounded-lg overflow-hidden flex flex-col h-full cursor-pointer transition-colors hover:border-slate-600"
            title={`Click to focus map on ${item.name}`}
          >
            {/* Video Viewport Container */}
            <div className="relative w-full h-full bg-[#040711] flex items-center justify-center overflow-hidden">
              {/* MJPEG Stream */}
              <img
                src={`/api/streams/${item.id}/feed`}
                alt={item.name}
                className="absolute inset-0 w-full h-full object-cover z-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = '0.5';
                }}
              />

              {/* Bounding Box Overlays */}
              <div className="absolute inset-0 pointer-events-none z-[3]">
                {item.boxes.map((box, bIdx) => (
                  <div
                    key={bIdx}
                    className="absolute border border-emerald-400/80 bg-emerald-500/10"
                    style={{
                      top: box.top,
                      left: box.left,
                      width: box.width,
                      height: box.height,
                    }}
                  >
                    <span className="absolute -top-4 left-0 bg-[#0a101f] border border-[#1e293b] text-emerald-400 font-mono text-xs font-bold px-1 rounded whitespace-nowrap">
                      {box.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Corner Reticles */}
              <div className="absolute inset-0 pointer-events-none opacity-40 z-[4]">
                <div className="absolute top-1.5 left-1.5 w-2 h-2 border-t border-l border-cyan-400"></div>
                <div className="absolute top-1.5 right-1.5 w-2 h-2 border-t border-r border-cyan-400"></div>
                <div className="absolute bottom-1.5 left-1.5 w-2 h-2 border-b border-l border-cyan-400"></div>
                <div className="absolute bottom-1.5 right-1.5 w-2 h-2 border-b border-r border-cyan-400"></div>
              </div>

              {/* Top Bar inside Viewport */}
              <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between z-10 font-mono text-xs">
                <div className="flex items-center gap-1.5 bg-[#0a101f]/90 px-2 py-0.5 rounded border border-[#1e293b] text-white font-bold">
                  <span>{item.name}</span>
                  <span className="text-emerald-400">[LIVE]</span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="hidden xl:inline bg-[#0a101f]/90 px-1.5 py-0.5 rounded border border-[#1e293b] text-slate-400 text-xs">
                    {currentTime ? currentTime.split('•')[1]?.trim() : 'LIVE'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectCamera && onSelectCamera(item.camera);
                    }}
                    className="p-1 bg-[#0a101f]/90 hover:bg-[#1e293b] text-slate-300 hover:text-white rounded border border-[#1e293b] transition-colors"
                    title="Focus on Map"
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Bottom Metadata Bar */}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-[#0a101f]/90 border-t border-[#1e293b] z-10 font-mono flex items-center justify-between text-xs">
                <span className="text-white font-bold truncate">
                  {item.location}
                </span>
                <span className="text-emerald-400 font-bold shrink-0 ml-2">
                  LIVE
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveCCTVStrip;
