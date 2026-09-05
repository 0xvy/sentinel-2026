import React, { useState } from 'react';
import { Camera } from '../types';

interface VideoWallProps {
  cameras: Camera[];
  onSelectCamera?: (camera: Camera) => void;
}

type GridDimension = '2x2' | '3x3' | '4x4';

export const VideoWall: React.FC<VideoWallProps> = ({ cameras, onSelectCamera }) => {
  const [gridSize, setGridSize] = useState<GridDimension>('2x2');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  const getCellCount = () => {
    switch (gridSize) {
      case '2x2': return 4;
      case '3x3': return 9;
      case '4x4': return 16;
    }
  };

  const filteredCameras = cameras
    .filter((c) => selectedDept === 'ALL' || c.department === selectedDept)
    .slice(0, getCellCount());

  const getGridClass = () => {
    switch (gridSize) {
      case '2x2': return 'grid-cols-2 grid-rows-2';
      case '3x3': return 'grid-cols-3 grid-rows-3';
      case '4x4': return 'grid-cols-4 grid-rows-4';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] p-3 text-xs overflow-hidden">
      {/* Control Bar */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1f2937]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="font-heading font-bold text-sm tracking-wider text-gray-100 uppercase">
              Tactical Video Wall Matrix
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#111827] border border-[#1f2937] p-0.5 rounded">
            {(['2x2', '3x3', '4x4'] as GridDimension[]).map((dim) => (
              <button
                key={dim}
                type="button"
                onClick={() => setGridSize(dim)}
                className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold transition-all ${
                  gridSize === dim
                    ? 'bg-cyan-600 text-slate-950 shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {dim}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[11px] text-gray-400 font-medium">Department:</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-[#111827] border border-[#1f2937] text-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Departments</option>
            <option value="Police">Police</option>
            <option value="Transport (RTO)">Transport (RTO)</option>
            <option value="GSRTC">GSRTC</option>
            <option value="Municipal Corp">Municipal Corp</option>
            <option value="Health">Health</option>
            <option value="Panchayat">Panchayat</option>
          </select>
        </div>
      </div>

      {/* Grid Matrix */}
      <div className={`grid ${getGridClass()} gap-2 flex-1 min-h-0`}>
        {filteredCameras.map((cam, idx) => (
          <div
            key={cam.camera_id}
            onClick={() => onSelectCamera && onSelectCamera(cam)}
            className="relative bg-[#111827] border border-[#1f2937] rounded-lg overflow-hidden flex flex-col group hover:border-cyan-500/80 transition-all cursor-pointer shadow-lg"
          >
            {/* Camera Viewport Simulation */}
            <div className="relative flex-1 bg-black/80 flex items-center justify-center overflow-hidden tactical-grid-bg">
              {/* Tactical Crosshair Overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-25">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-500"></div>
                <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-500"></div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 border border-cyan-400/50 rounded-full"></div>
              </div>

              {/* Feed Status and Live Simulated Time */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-[10px] font-bold text-emerald-400 bg-black/60 px-1.5 py-0.2 rounded border border-emerald-900/60">
                  LIVE RTSP
                </span>
                <span className="font-mono text-[10px] text-gray-400 bg-black/60 px-1 rounded">
                  {cam.resolution || '1080p'}
                </span>
              </div>

              <div className="absolute top-2 right-2 text-[10px] font-mono text-cyan-300 bg-black/60 px-1.5 py-0.2 rounded z-10">
                CAM-{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
              </div>

              {/* Center Camera ID & Location Display */}
              <div className="text-center p-3 z-10">
                <div className="w-8 h-8 mx-auto mb-1.5 rounded-full bg-cyan-950/70 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                </div>
                <div className="text-white font-bold text-xs truncate max-w-[200px]">
                  {cam.camera_name}
                </div>
                <div className="text-cyan-400 font-mono text-[10px] mt-0.5">
                  {cam.camera_id} • {cam.district}
                </div>
              </div>

              {/* Bottom Stream URL */}
              <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-gray-400 bg-black/70 px-2 py-0.5 rounded">
                <span className="truncate">{cam.stream_url || 'rtsp://internal/live/feed'}</span>
                <span className="text-cyan-400 ml-2">{cam.vms_vendor || 'Milestone'}</span>
              </div>
            </div>

            {/* Bottom Footer Info */}
            <div className="px-2.5 py-1.5 bg-[#111827] border-t border-[#1f2937] flex items-center justify-between text-[11px]">
              <span className="text-gray-300 font-medium truncate">{cam.department}</span>
              <div className="flex items-center gap-1 text-[10px]">
                {cam.ptz_capable && (
                  <span className="px-1 rounded bg-blue-950/60 border border-blue-800/60 text-blue-300 font-mono">
                    PTZ
                  </span>
                )}
                <span className="text-emerald-400 font-bold">ONLINE</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
