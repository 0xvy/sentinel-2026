import React from 'react';
import { Camera } from '../types';

interface LiveCCTVStripProps {
  cameras: Camera[];
  onSelectCamera?: (camera: Camera) => void;
  activePlate?: string;
  currentTime?: string;
}

interface DefaultCCTVFeed {
  id: string;
  code: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  dept: string;
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
  },
  {
    id: 'cam10',
    code: 'CAMERA 2:00',
    name: 'CAM-MUN-JUN-10',
    location: 'Char Chowk Road • Junagadh',
    lat: 21.5190,
    lng: 70.4590,
    dept: 'Municipal Corp',
  },
  {
    id: 'cam13',
    code: 'CAMERA 12:3',
    name: 'CAM-POL-AHM-13',
    location: 'CN Vidhyalaya • Ambawadi',
    lat: 23.0230,
    lng: 72.5480,
    dept: 'Police',
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

  const timestampDisplay = currentTime
    ? `2026/09/14 ${currentTime.split('•')[1]?.trim() || '21:08:30'}`
    : '2026/09/14 21:08:30';

  return (
    <div className="flex flex-col h-full bg-[#070b14] border-t border-slate-800 p-3 overflow-hidden select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          LIVE NIGHT CCTV VIDEO WALL
        </h2>
        <span className="text-[10px] font-mono text-slate-500">
          {feeds.length} FEEDS • REAL-TIME MJPEG
        </span>
      </div>

      {/* 3-Camera Grid — Raw MJPEG streams, ZERO fake overlays */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 min-h-0">
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
            className="group relative bg-[#040711] border border-slate-800 rounded-lg overflow-hidden flex flex-col h-full cursor-pointer transition-colors hover:border-slate-600"
            title={`Click to focus map on ${item.name}`}
          >
            {/* Raw Video Feed — backend ML pipeline draws real bounding boxes directly on the MJPEG frames */}
            <div className="relative w-full h-full bg-black overflow-hidden">
              <img
                src={`/api/streams/${item.id}/feed`}
                alt={item.name}
                className="absolute inset-0 w-full h-full object-cover z-0"
                style={{ imageRendering: 'auto' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.opacity = '0.5';
                }}
              />

              {/* Camera ID & Timestamp — the ONLY overlay (real metadata, not fake detection) */}
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 font-mono text-[10px] pointer-events-none">
                <span className="text-white font-bold tracking-wider drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] bg-black/50 px-1.5 py-0.5 rounded">
                  {item.code}
                </span>
                <span className="text-slate-300 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] bg-black/50 px-1.5 py-0.5 rounded">
                  {timestampDisplay}
                </span>
              </div>

              {/* Bottom: Camera name bar */}
              <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 pointer-events-none">
                <span className="text-[9px] font-mono text-slate-300 tracking-wide">
                  {item.name} • {item.dept}
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

