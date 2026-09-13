import React from 'react';
import { CameraDepartment, Camera } from '../types';
import { DEPARTMENT_COLORS } from '../utils/constants';

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
  'Food & Civil Supplies',
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

  return (
    <div className="bg-[#0d1424]/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-3 text-xs shadow-2xl">
      {/* Header with Title & Action Buttons */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="font-heading font-bold text-slate-100 uppercase tracking-wider text-xs">
            Agency Surveillance Grid
          </span>
        </div>

        {/* Select All / Clear All Buttons */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-cyan-300 hover:text-cyan-200 transition-colors font-bold px-2 py-0.5 rounded bg-cyan-950/70 border border-cyan-600/50 hover:bg-cyan-900/60 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="text-slate-400 hover:text-slate-200 transition-colors font-medium px-2 py-0.5 rounded bg-slate-900 border border-slate-700 hover:bg-slate-800 active:scale-95 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Checkboxes List */}
      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto tactical-scrollbar pr-1">
        {ALL_DEPARTMENTS.map((dept) => {
          const count = getDepartmentCount(dept);
          const isSelected = selectedDepartments.includes(dept);
          const deptColor = DEPARTMENT_COLORS[dept] || '#3b82f6';

          return (
            <label
              key={dept}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer border transition-all duration-150 select-none ${
                isSelected
                  ? 'border-slate-600 bg-slate-900/90 text-slate-100 shadow-sm'
                  : 'border-slate-800/80 bg-[#070b14]/60 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden mr-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleDepartment(dept)}
                  className="rounded bg-[#070b14] border-slate-700 text-cyan-500 focus:ring-0 focus:ring-offset-0 h-3.5 w-3.5 cursor-pointer shrink-0"
                />
                {/* Department Colored Dot */}
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                  style={{ backgroundColor: deptColor }}
                  title={`${dept} agency color`}
                />
                <span className="truncate font-medium text-[11px]">{dept}</span>
              </div>

              {/* Camera Count Badge */}
              <span
                className={`ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded font-bold tabular-nums ${
                  isSelected
                    ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                    : 'bg-slate-900/80 text-slate-400'
                }`}
              >
                {count}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};
