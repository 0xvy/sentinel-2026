/**
 * Sentinel 2026 - Formatting and Display Utilities
 */

import { THREAT_COLORS } from './constants';
import type { ThreatLevel, DirectionOfTravel } from '../types';

/**
 * Formats an ISO 8601 timestamp into human-friendly tactical format
 * Example: "05 Sep 2026, 17:08:40"
 */
export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return String(iso);
  }
}

/**
 * Formats an ISO timestamp into short time-only format: "17:08:40"
 */
export function formatTimeOnly(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return String(iso);
  }
}

/**
 * Formats hardware presentation timestamp (PTS) in milliseconds
 * strictly required for NFSU chain of custody and forensic timing.
 * Example: "125,430 ms (02:05.430)"
 */
export function formatPTS(pts_ms: number): string {
  if (pts_ms == null || isNaN(pts_ms)) return 'PTS: —';
  const safeMs = Math.max(0, Math.floor(pts_ms));
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ms = safeMs % 1000;

  const pad = (n: number, digits = 2) => String(n).padStart(digits, '0');
  const timecode = hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(ms, 3)}`
    : `${pad(minutes)}:${pad(seconds)}.${pad(ms, 3)}`;

  return `PTS ${safeMs.toLocaleString()} ms (${timecode})`;
}

/**
 * Formats confidence score (0.0 - 1.0 or 0 - 100) into a clean percentage string.
 * Example: 0.9423 → "94.2%"
 */
export function formatConfidence(conf: number | null | undefined): string {
  if (conf == null || isNaN(conf)) return '0.0%';
  const val = conf > 1.0 ? conf : conf * 100;
  return `${Math.min(100, Math.max(0, val)).toFixed(1)}%`;
}

/**
 * Returns hex color code for a given threat level
 */
export function getThreatColor(level: string | null | undefined): string {
  if (!level) return '#94a3b8';
  const normalized = level.toUpperCase() as ThreatLevel;
  return THREAT_COLORS[normalized] || '#94a3b8';
}

/**
 * Returns descriptive human-readable label for a threat level
 */
export function getThreatLabel(level: string | null | undefined): string {
  if (!level) return 'UNKNOWN';
  switch (level.toUpperCase()) {
    case 'CRITICAL':
      return 'CRITICAL — Stolen / Wanted';
    case 'HIGH':
      return 'HIGH — Blacklisted / Suspended';
    case 'MEDIUM':
      return 'MEDIUM — Under Investigation';
    case 'LOW':
      return 'LOW — Advisory Notice';
    case 'NORMAL':
      return 'NORMAL — Verified Clean';
    default:
      return level.toUpperCase();
  }
}

/**
 * Formats directional heading vector into directional arrow and text
 * Example: "N" → "↑ North"
 */
export function formatDirection(dir: DirectionOfTravel | string | null | undefined): string {
  if (!dir) return '— Unknown';
  switch (dir.toUpperCase()) {
    case 'N':
      return '↑ North';
    case 'NE':
      return '↗ North-East';
    case 'E':
      return '→ East';
    case 'SE':
      return '↘ South-East';
    case 'S':
      return '↓ South';
    case 'SW':
      return '↙ South-West';
    case 'W':
      return '← West';
    case 'NW':
      return '↖ North-West';
    case 'UNKNOWN':
    default:
      return '— Unknown';
  }
}

/**
 * Parses Indian license plate into distinct components for high-contrast tactical display
 * Example: "GJ01ER8842" → { state: "GJ", rto: "01", series: "ER", number: "8842" }
 */
export function parsePlateParts(plate: string | null | undefined): {
  state: string;
  rto: string;
  series: string;
  number: string;
  raw: string;
} {
  const raw = (plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const match = raw.match(/^([A-Z]{2})([0-9]{1,2})([A-Z]{0,3})([0-9]{1,4})$/);
  if (match) {
    return {
      state: match[1],
      rto: match[2],
      series: match[3],
      number: match[4],
      raw,
    };
  }
  return {
    state: raw.slice(0, 2),
    rto: raw.slice(2, 4),
    series: '',
    number: raw.slice(4),
    raw,
  };
}

/**
 * Computes elapsed duration string from ISO timestamp
 * Example: "Just now", "4m ago", "1h ago"
 */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diffSec < 5) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    return `${diffDays}d ago`;
  } catch {
    return '—';
  }
}
