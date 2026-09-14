import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../services/api';
import { VehicleSearchItem } from '../types';
import { ThreatBadge } from './ThreatBadge';
import { PlateNumber } from './PlateNumber';

interface PlateSearchProps {
  activePlate: string;
  onSelectPlate: (plate: string) => void;
  isLoadingTrajectory?: boolean;
  showPresets?: boolean;
}

export const PlateSearch: React.FC<PlateSearchProps> = ({
  activePlate,
  onSelectPlate,
  isLoadingTrajectory = false,
  showPresets = true,
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
          onFocus={() => {
            if (query && query !== activePlate && query.length >= 2) {
              executeSearch(query);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="SEARCH VEHICLE PLATE (e.g. GJ01ER8842)"
          className="w-full pl-9 pr-20 py-1.5 bg-[#040711] border border-[#1e293b] focus:border-slate-500 focus:outline-none rounded-lg text-white font-mono text-xs tracking-wider placeholder:text-slate-500 transition-colors"
        />

        <div className="absolute right-1.5 flex items-center gap-1.5">
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
              }}
              className="text-slate-400 hover:text-white p-1 text-xs transition-colors rounded cursor-pointer"
              title="Clear search"
            >
              ✕
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSelect(query)}
            disabled={!query.trim() || isLoadingTrajectory}
            className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded font-mono transition-colors cursor-pointer"
          >
            LOCATE
          </button>
        </div>
      </div>

      {/* Preset Quick Tags for Quick Evaluation / Jury Demonstration */}
      {showPresets && (
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs font-mono">
          <span className="text-slate-400 text-[10px] uppercase font-mono font-bold tracking-wider mr-1 shrink-0">
            Presets:
          </span>
          <button
            type="button"
            onClick={() => handleSelect('GJ01ER8842')}
            className={`px-2 py-0.5 rounded font-mono text-xs font-bold border cursor-pointer shrink-0 transition-colors ${
              activePlate === 'GJ01ER8842'
                ? 'bg-[#1e293b] text-red-400 border-red-500/50'
                : 'bg-transparent text-slate-400 border-[#1e293b] hover:text-white'
            }`}
            title="Core Jury Test Case: Armed Suspect Vikram Solanki (Stolen Creta)"
          >
            GJ01ER8842 (Stolen)
          </button>
          <button
            type="button"
            onClick={() => handleSelect('GJ05CX9988')}
            className={`px-2 py-0.5 rounded font-mono text-xs font-bold border cursor-pointer shrink-0 transition-colors ${
              activePlate === 'GJ05CX9988'
                ? 'bg-[#1e293b] text-amber-400 border-amber-500/50'
                : 'bg-transparent text-slate-400 border-[#1e293b] hover:text-white'
            }`}
            title="Stolen Vehicle Surat & Suspended DL"
          >
            GJ05CX9988 (Suspended)
          </button>
          <button
            type="button"
            onClick={() => handleSelect('GJ01AB1234')}
            className={`px-2 py-0.5 rounded font-mono text-xs font-bold border cursor-pointer shrink-0 transition-colors ${
              activePlate === 'GJ01AB1234'
                ? 'bg-[#1e293b] text-emerald-400 border-emerald-500/50'
                : 'bg-transparent text-slate-400 border-[#1e293b] hover:text-white'
            }`}
            title="Clean Vehicle Verified Registration"
          >
            GJ01AB1234 (Clean)
          </button>
        </div>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#0a101f] border border-[#1e293b] rounded-lg shadow-2xl z-50 max-h-72 overflow-y-auto tactical-scrollbar">
          <div className="px-3 py-1.5 border-b border-[#1e293b] text-[10px] text-slate-400 font-mono uppercase tracking-wider flex justify-between bg-[#040711] font-bold">
            <span>Surveillance Registries Matches ({suggestions.length})</span>
            <span>Press Enter to select</span>
          </div>

          {suggestions.map((item) => (
            <div
              key={item.plate_number}
              role="button"
              tabIndex={0}
              onClick={() => handleSelect(item.plate_number)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(item.plate_number);
                }
              }}
              className="p-3 hover:bg-[#111827] focus-visible:bg-[#111827] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70 cursor-pointer border-b border-slate-800/80 last:border-0 transition-colors flex items-center justify-between"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <PlateNumber plate={item.plate_number} size="sm" interactive={false} />
                  <ThreatBadge level={item.threat_level} size="sm" />
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {item.owner_name && <span className="text-slate-200 font-bold">{item.owner_name} &bull; </span>}
                  <span>{item.vehicle_class || 'Motor Car'}</span>
                </div>
              </div>

              <div className="text-right font-mono">
                <div className="text-xs text-cyan-400 font-bold tabular-nums">
                  {item.total_sightings} sightings
                </div>
                {item.last_seen && (
                  <div className="text-[10px] text-slate-400 mt-0.5 tabular-nums">
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

