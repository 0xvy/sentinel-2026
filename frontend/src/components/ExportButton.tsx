import React, { useState } from 'react';
import { api } from '../services/api';

interface ExportButtonProps {
  currentPlate?: string;
  className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ currentPlate, className = '' }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const csvData = await api.exportCSV(currentPlate);

      // Create a blob and trigger browser download
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = currentPlate
        ? `SENTINEL_Forensic_Trajectory_${currentPlate}_${timestamp}.csv`
        : `SENTINEL_2026_Evaluation_Report_${timestamp}.csv`;

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to export evaluation CSV:', err);
      alert('Failed to export evaluation report. Please verify connection.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      className={`relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-semibold tracking-wide uppercase transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
        exportSuccess
          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
          : 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold shadow-lg shadow-cyan-950/50'
      } ${className}`}
      title={currentPlate ? `Export trajectory log for ${currentPlate}` : 'Export statewide evaluation report CSV'}
    >
      {isExporting ? (
        <>
          <svg className="animate-spin h-3.5 w-3.5 text-slate-950" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Exporting CSV...</span>
        </>
      ) : exportSuccess ? (
        <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path>
          </svg>
          <span>Downloaded!</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
          <span>Export Evaluation CSV</span>
        </>
      )}
    </button>
  );
};
