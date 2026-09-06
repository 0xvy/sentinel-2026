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
      case '2x2': return 'grid-cols-2';
      case '3x3': return 'grid-cols-3';
      case '4x4': return 'grid-cols-4';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#070b14] p-3 text-xs overflow-hidden">
      {/* Control Bar */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            <span className="font-heading font-bold text-xs tracking-wider text-slate-100 uppercase">
              Tactical Video Wall Matrix
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#0d1424] border border-slate-800 p-1 rounded-lg">
            {(['2x2', '3x3', '4x4'] as GridDimension[]).map((dim) => (
              <button
                key={dim}
                type="button"
                onClick={() => setGridSize(dim)}
                className={`px-2.5 py-0.5 rounded font-mono text-xs font-bold transition-all ${
                  gridSize === dim
                    ? 'bg-cyan-600 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {dim}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 font-mono">Filter Agency:</label>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-[#0d1424] border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-cyan-500 font-mono"
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

      {/* Grid Matrix with 16:9 Aspect Ratio Cells */}
      <div className={`grid ${getGridClass()} gap-3 flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700`}>
        {filteredCameras.map((cam, idx) => (
          <div
            key={cam.camera_id}
            onClick={() => onSelectCamera && onSelectCamera(cam)}
            className="relative bg-[#0d1424] border border-slate-800 rounded-lg overflow-hidden flex flex-col group hover:border-cyan-500/80 transition-all duration-150 cursor-pointer shadow-lg aspect-video"
          >
            {/* Camera Viewport Simulation (16:9) */}
            <div className="relative w-full h-full bg-[#070b14] flex items-center justify-center overflow-hidden tactical-grid-bg">
              {/* Tactical Crosshair Overlay */}
              <div className="absolute inset-0 pointer-events-none opacity-30">
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-cyan-500"></div>
                <div className="absolute top-1/2 left-0 right-0 h-px bg-cyan-500"></div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 border border-cyan-400/60 rounded-full"></div>
                {/* Corner reticles */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-cyan-500/40"></div>
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-cyan-500/40"></div>
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-cyan-500/40"></div>
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-cyan-500/40"></div>
              </div>

              {/* Top-Left: Feed Resolution and Cam Index */}
              <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10 font-mono text-[10px]">
                <span className="text-cyan-300 bg-[#070b14]/80 px-1.5 py-0.5 rounded border border-slate-700">
                  CAM-{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                </span>
                <span className="text-slate-400 bg-[#070b14]/80 px-1.5 py-0.5 rounded border border-slate-800">
                  {cam.resolution || '1080p'}
                </span>
              </div>

              {/* Top-Right: Status Dot Indicator */}
              <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10 bg-[#070b14]/80 px-2 py-0.5 rounded-full border border-slate-700">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-[10px] font-bold text-emerald-400">
                  LIVE
                </span>
              </div>

              {/* Center Tactical Emblem */}
              <div className="text-center p-2 z-10 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity">
                <div className="w-7 h-7 mx-auto mb-1 rounded-full bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center text-cyan-400 shadow-md">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                  </svg>
                </div>
              </div>

              {/* Camera Name Overlay at Bottom of Each Cell */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/90 to-transparent p-2 pt-4 z-10">
                <div className="flex items-center justify-between">
                  <div className="truncate mr-2">
                    <div className="text-white font-bold text-xs truncate drop-shadow-sm">
                      {cam.camera_name}
                    </div>
                    <div className="text-cyan-400 font-mono text-[10px] truncate">
                      {cam.camera_id} &bull; {cam.district} &bull; {cam.department}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1 font-mono text-[9px]">
                    {cam.ptz_capable && (
                      <span className="px-1 py-0.2 rounded bg-blue-950/80 border border-blue-800 text-blue-300">
                        PTZ
                      </span>
                    )}
                    <span className="text-slate-400 bg-slate-900/80 px-1 py-0.2 rounded border border-slate-700">
                      {cam.vms_vendor || 'Milestone'}
                    </span>
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
