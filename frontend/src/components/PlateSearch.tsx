import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { VehicleSearchItem, ThreatLevel } from '../types';

interface PlateSearchProps {
  activePlate: string;
  onSelectPlate: (plate: string) => void;
  isLoadingTrajectory?: boolean;
}

export const PlateSearch: React.FC<PlateSearchProps> = ({
  activePlate,
  onSelectPlate,
  isLoadingTrajectory = false,
}) => {
  const [query, setQuery] = useState(activePlate || '');
  const [suggestions, setSuggestions] = useState<VehicleSearchItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Sync internal state if parent changes activePlate
  useEffect(() => {
    if (activePlate && activePlate !== query) {
      setQuery(activePlate);
    }
  }, [activePlate]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const executeSearch = useCallback(async (searchTerm: string) => {
    try {
      setIsSearching(true);
      const results = await api.searchPlate(searchTerm, 10);
      setSuggestions(results);
      setIsOpen(true);
    } catch (err) {
      console.warn('Plate search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setQuery(value);

    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(() => {
      executeSearch(value);
    }, 250);
  };

  const handleSelect = (plate: string) => {
    const clean = plate.toUpperCase().replace(/\s+/g, '');
    setQuery(clean);
    setIsOpen(false);
    onSelectPlate(clean);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0 && isOpen) {
        handleSelect(suggestions[0].plate_number);
      } else if (query.trim()) {
        handleSelect(query.trim());
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const getThreatBadge = (level: ThreatLevel, stolen: boolean) => {
    if (stolen || level === 'CRITICAL') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-600/60 font-mono">
          {stolen ? 'STOLEN' : 'CRITICAL'}
        </span>
      );
    }
    if (level === 'HIGH') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-600/60 font-mono">
          HIGH
        </span>
      );
    }
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-600/60 font-mono">
        CLEAN
      </span>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-cyan-400 pointer-events-none">
          {isLoadingTrajectory || isSearching ? (
            <svg className="animate-spin h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0118 0z"></path>
            </svg>
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => executeSearch(query)}
          onKeyDown={handleKeyDown}
          placeholder="SEARCH VEHICLE PLATE (e.g. GJ01ER8842)"
          className="w-full pl-10 pr-24 py-2.5 bg-[#0a0f1d] border-2 border-cyan-500/60 focus:border-cyan-400 rounded-lg text-white font-plate text-sm md:text-base tracking-widest placeholder:text-gray-500 placeholder:font-sans placeholder:tracking-normal outline-none shadow-lg shadow-cyan-950/40 transition-all"
        />

        <div className="absolute right-2 flex items-center gap-1.5">
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
              }}
              className="text-gray-500 hover:text-gray-300 p-1 text-xs"
              title="Clear search"
            >
              ✕
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSelect(query)}
            disabled={!query.trim() || isLoadingTrajectory}
            className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs rounded tracking-wider transition-colors"
          >
            LOCATE
          </button>
        </div>
      </div>

      {/* Preset Quick Tags for Quick Evaluation / Jury Demonstration */}
      <div className="flex items-center gap-1.5 mt-2 overflow-x-auto text-[11px] pb-1">
        <span className="text-gray-400 text-[10px] uppercase font-bold tracking-wider mr-1">
          Test Plates:
        </span>
        <button
          type="button"
          onClick={() => handleSelect('GJ01ER8842')}
          className={`px-2 py-0.5 rounded font-mono font-bold transition-all border ${
            activePlate === 'GJ01ER8842'
              ? 'bg-rose-600 text-white border-rose-400 shadow'
              : 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/60'
          }`}
          title="Core Jury Test Case: Armed Suspect Vikram Solanki"
        >
          GJ01ER8842 (CRITICAL)
        </button>
        <button
          type="button"
          onClick={() => handleSelect('GJ05CX9988')}
          className={`px-2 py-0.5 rounded font-mono font-bold transition-all border ${
            activePlate === 'GJ05CX9988'
              ? 'bg-rose-600 text-white border-rose-400 shadow'
              : 'bg-rose-950/30 text-rose-300 border-rose-900/40 hover:bg-rose-900/50'
          }`}
          title="Stolen Vehicle Surat: Amit Shah"
        >
          GJ05CX9988
        </button>
        <button
          type="button"
          onClick={() => handleSelect('GJ03KJ4521')}
          className={`px-2 py-0.5 rounded font-mono font-bold transition-all border ${
            activePlate === 'GJ03KJ4521'
              ? 'bg-amber-600 text-white border-amber-400 shadow'
              : 'bg-amber-950/30 text-amber-300 border-amber-900/40 hover:bg-amber-900/50'
          }`}
          title="Blacklisted Vehicle Rajkot"
        >
          GJ03KJ4521
        </button>
        <button
          type="button"
          onClick={() => handleSelect('GJ01AB1234')}
          className={`px-2 py-0.5 rounded font-mono font-bold transition-all border ${
            activePlate === 'GJ01AB1234'
              ? 'bg-emerald-600 text-white border-emerald-400 shadow'
              : 'bg-emerald-950/30 text-emerald-300 border-emerald-900/40 hover:bg-emerald-900/50'
          }`}
          title="Clean Vehicle Ahmedabad"
        >
          GJ01AB1234
        </button>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#111827] border border-cyan-500/50 rounded-lg shadow-2xl z-50 max-h-72 overflow-y-auto">
          <div className="p-2 border-b border-[#1f2937] text-[10px] text-gray-400 uppercase tracking-wider flex justify-between">
            <span>Registration & Surveillance Matches ({suggestions.length})</span>
            <span>Press Enter to select</span>
          </div>

          {suggestions.map((item) => (
            <div
              key={item.plate_number}
              onClick={() => handleSelect(item.plate_number)}
              className="p-2.5 hover:bg-[#1f2937] cursor-pointer border-b border-gray-800/60 last:border-0 transition-colors flex items-center justify-between"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-plate text-sm font-bold text-white">
                    {item.plate_number}
                  </span>
                  {getThreatBadge(item.threat_level, item.stolen_flag)}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {item.owner_name && <span className="text-gray-300 font-medium">{item.owner_name} • </span>}
                  <span>{item.vehicle_class || 'Motor Car'}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-mono text-cyan-400 font-semibold">
                  {item.total_sightings} sightings
                </div>
                {item.last_seen && (
                  <div className="text-[10px] text-gray-400">
                    {new Date(item.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
