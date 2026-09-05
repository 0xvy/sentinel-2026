/**
 * Sentinel 2026 - Gujarat Police Surveillance Grid Constants
 */

import type { ThreatLevel, CameraDepartment, CameraStatus } from '../types';

export const THREAT_COLORS: Record<ThreatLevel, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f59e0b',
  MEDIUM: '#eab308',
  LOW: '#3b82f6',
  NORMAL: '#22c55e',
} as const;

export const DEPARTMENT_COLORS: Record<CameraDepartment | string, string> = {
  'Police': '#3b82f6',
  'Transport (RTO)': '#8b5cf6',
  'GSRTC': '#06b6d4',
  'Health': '#10b981',
  'Municipal Corp': '#f59e0b',
  'Panchayat': '#f97316',
  'Private': '#6b7280',
  'Food & Civil Supplies': '#ec4899',
};

export const STATUS_COLORS: Record<CameraStatus, string> = {
  Online: '#22c55e',
  Offline: '#ef4444',
  Degraded: '#f59e0b',
};

export const GUJARAT_CENTER = { lat: 22.3, lng: 71.5 } as const;
export const GUJARAT_ZOOM = 7;
export const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
export const DARK_TILE_ATTRIBUTION = '&copy; <a href="https://carto.com/">CARTO</a> dark tiles | Gujarat Police Dept';

/** Primary target test plate for jury benchmark evaluations */
export const CORE_TEST_PLATE = 'GJ01ER8842';

/** All monitored departments */
export const ALL_DEPARTMENTS: CameraDepartment[] = [
  'Police',
  'Transport (RTO)',
  'GSRTC',
  'Health',
  'Municipal Corp',
  'Panchayat',
  'Private',
  'Food & Civil Supplies',
];

/** Base API URL resolving either VITE_API_URL or relative proxy */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string') {
    return envUrl.replace(/\/$/, '');
  }
  return '';
}

/** Base WebSocket URL resolving either VITE_API_URL or current host */
export function getWebSocketAlertsUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string') {
    const url = new URL(envUrl, window.location.href);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = '/ws/alerts';
    return url.toString();
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/alerts`;
}
