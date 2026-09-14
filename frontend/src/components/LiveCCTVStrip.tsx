import React from 'react';
import { Camera } from '../types';
import { MoreHorizontal } from 'lucide-react';

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
  boxes: Array<{
    label: string;
    type: string;
    color: string;
    badgeBg: string;
    top: string;
    left: string;
    width: string;
    height: string;
  }>;
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
    boxes: [
      { label: 'YOLO', type: 'Car', color: 'border-orange-500', badgeBg: 'bg-orange-500', top: '48%', left: '16%', width: '28%', height: '34%' },
      { label: 'YOLO', type: 'Auto', color: 'border-blue-500', badgeBg: 'bg-blue-500', top: '56%', left: '52%', width: '18%', height: '24%' },
    ],
  },
  {
    id: 'cam10',
    code: 'CAMERA 2:00',
    name: 'CAM-MUN-JUN-10',
    location: 'Char Chowk Road • Junagadh',
    lat: 21.5190,
    lng: 70.4590,
    dept: 'Municipal Corp',
    boxes: [
      { label: 'YOLO', type: 'TARGET', color: 'border-red-500', badgeBg: 'bg-red-600', top: '44%', left: '42%', width: '28%', height: '38%' },
      { label: 'YOLO', type: 'Car', color: 'border-red-400', badgeBg: 'bg-red-500', top: '62%', left: '18%', width: '22%', height: '26%' },
    ],
  },
  {
    id: 'cam13',
    code: 'CAMERA 12:3',
    name: 'CAM-POL-AHM-13',
    location: 'CN Vidhyalaya • Ambawadi',
    lat: 23.0230,
    lng: 72.5480,
    dept: 'Police',
    boxes: [
      { label: 'YOLO', type: 'Car', color: 'border-emerald-500', badgeBg: 'bg-emerald-600', top: '50%', left: '20%', width: '26%', height: '32%' },
      { label: 'YOLO', type: 'Car', color: 'border-emerald-500', badgeBg: 'bg-emerald-600', top: '44%', left: '56%', width: '22%', height: '28%' },
      { label: 'YOLO', type: 'TARGET', color: 'border-red-500', badgeBg: 'bg-red-600', top: '58%', left: '76%', width: '18%', height: '26%' },
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

  const timestampDisplay = currentTime
    ? `2026/09/14 ${currentTime.split('•')[1]?.trim() || '21:08:30'}`
    : '2026/09/14 21:08:30';

  return (
    <div className="flex flex-col h-full bg-[#070b14] border-t border-slate-800 p-3 overflow-hidden select-none">
      {/* Top Strip Header matching Mockup */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
          LIVE NIGHT CCTV VIDEO WALL
        </h2>
        <button
          type="button"
          className="text-slate-500 hover:text-slate-300 p-1 transition-colors cursor-pointer"
          title="Video Wall Options"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* 3-Camera Grid Strip */}
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

              {/* Bounding Box Overlays matching Mockup */}
              <div className="absolute inset-0 pointer-events-none z-[3]">
                {item.boxes.map((box, bIdx) => (
                  <div
                    key={bIdx}
                    className={`absolute border-2 ${box.color} bg-black/10`}
                    style={{
                      top: box.top,
                      left: box.left,
                      width: box.width,
                      height: box.height,
                    }}
                  >
                    <span
                      className={`absolute -top-4 left-0 ${box.badgeBg} text-white font-mono text-[9px] font-extrabold px-1 rounded-xs tracking-wider uppercase shadow-sm`}
                    >
                      {box.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Top Bar inside Viewport: CAMERA 3:30 and Timestamp matching Mockup */}
              <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 font-mono text-[10px] pointer-events-none">
                <span className="text-white font-bold tracking-wider drop-shadow-md">
                  {item.code}
                </span>
                <span className="text-slate-300 drop-shadow-md">
                  {timestampDisplay}
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
