import React from 'react';
import { CameraDepartment, Camera } from '../types';

interface CameraFilterProps {
  cameras: Camera[];
  selectedDepartments: string[];
  onToggleDepartment: (dept: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

const ALL_DEPARTMENTS: CameraDepartment[] = [
  'Police',
  'Transport (RTO)',
  'GSRTC',
  'Municipal Corp',
  'Health',
  'Panchayat',
  'Private',
  'Food & Civil Supplies'
];

export const CameraFilter: React.FC<CameraFilterProps> = ({
  cameras,
  selectedDepartments,
  onToggleDepartment,
  onSelectAll,
  onClearAll,
}) => {
  // Count cameras per department
  const getDepartmentCount = (dept: string) => {
    return cameras.filter((c) => c.department === dept).length;
  };

  const getDepartmentBadgeColor = (dept: string) => {
    switch (dept) {
      case 'Police':
        return 'border-cyan-500/40 text-cyan-400 bg-cyan-950/30';
      case 'Transport (RTO)':
        return 'border-amber-500/40 text-amber-400 bg-amber-950/30';
      case 'GSRTC':
        return 'border-blue-500/40 text-blue-400 bg-blue-950/30';
      case 'Municipal Corp':
        return 'border-emerald-500/40 text-emerald-400 bg-emerald-950/30';
      case 'Health':
        return 'border-rose-500/40 text-rose-400 bg-rose-950/30';
      case 'Panchayat':
        return 'border-purple-500/40 text-purple-400 bg-purple-950/30';
      default:
        return 'border-gray-500/40 text-gray-400 bg-gray-950/30';
    }
  };

  return (
    <div className="bg-[#111827]/90 backdrop-blur border border-[#1f2937] rounded-lg p-3 text-xs shadow-xl">
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-[#1f2937]">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="font-semibold text-gray-200 uppercase tracking-wider text-[11px]">
            GIS Department Feeds
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium px-1.5 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/40"
          >
            All
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="text-gray-400 hover:text-gray-300 transition-colors font-medium px-1.5 py-0.5 rounded bg-gray-900 border border-gray-800"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
        {ALL_DEPARTMENTS.map((dept) => {
          const count = getDepartmentCount(dept);
          const isSelected = selectedDepartments.includes(dept);

          return (
            <label
              key={dept}
              className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer border transition-all ${
                isSelected
                  ? `${getDepartmentBadgeColor(dept)} border-opacity-70`
                  : 'border-[#1f2937] bg-[#0a0f1d]/50 text-gray-400 hover:border-gray-700'
              }`}
            >
              <div className="flex items-center gap-1.5 overflow-hidden">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleDepartment(dept)}
                  className="rounded bg-[#0a0f1d] border-gray-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 h-3 w-3 cursor-pointer"
                />
                <span className="truncate font-medium text-[11px] select-none">{dept}</span>
              </div>
              <span className="ml-1 text-[10px] font-mono px-1 rounded bg-black/40 text-gray-300">
                {count}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};
