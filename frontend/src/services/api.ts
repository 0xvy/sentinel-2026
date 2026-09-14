import {
  Camera,
  AlertEvent,
  TrajectoryResponse,
  VehicleSearchItem,
  SystemHealth
} from '../types';
import {
  MOCK_CAMERAS,
  MOCK_ALERTS,
  MOCK_TRAJECTORIES,
  MOCK_SEARCH_ITEMS,
  MOCK_EVALUATION_CSV
} from './mockData';

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface CameraQueryParams {
  department?: string;
  status?: string;
  district?: string;
}

export const api = {
  async getHealth(): Promise<SystemHealth> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return {
        status: "operational_offline_mode",
        service: "sentinel_2026_frontend",
        version: "1.0.0"
      };
    }
  },

  async getCameras(params?: CameraQueryParams): Promise<Camera[]> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.department && params.department !== 'ALL') {
        searchParams.set('department', params.department);
      }
      if (params?.status && params.status !== 'ALL') {
        searchParams.set('status', params.status);
      }
      if (params?.district) {
        searchParams.set('district', params.district);
      }

      const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
      const res = await fetch(`${API_BASE}/api/cameras${queryString}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : MOCK_CAMERAS;
    } catch (err) {
      console.warn('API getCameras fallback to mock data:', err);
      let filtered = [...MOCK_CAMERAS];
      if (params?.department && params.department !== 'ALL') {
        filtered = filtered.filter(c => c.department === params.department);
      }
      if (params?.status && params.status !== 'ALL') {
        filtered = filtered.filter(c => c.status === params.status);
      }
      if (params?.district) {
        filtered = filtered.filter(c => c.district.toLowerCase().includes(params.district!.toLowerCase()));
      }
      return filtered;
    }
  },

  async getTrajectory(plate: string): Promise<TrajectoryResponse> {
    const cleanPlate = plate.toUpperCase().replace(/\s+/g, '');
    try {
      const res = await fetch(`${API_BASE}/api/vehicles/${cleanPlate}/trajectory`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && (!data.sightings || data.sightings.length === 0) && MOCK_TRAJECTORIES[cleanPlate]) {
        return MOCK_TRAJECTORIES[cleanPlate];
      }
      return data;
    } catch (err) {
      console.warn(`API getTrajectory (${cleanPlate}) fallback to mock:`, err);
      if (MOCK_TRAJECTORIES[cleanPlate]) {
        return MOCK_TRAJECTORIES[cleanPlate];
      }
      // Generate synthetic trajectory for unknown searched plates
      return {
        plate_number: cleanPlate,
        total_sightings: 1,
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        watchlist_status: {
          is_watchlisted: false,
          threat_level: "NORMAL",
          matched_databases: ["VAHAN"],
          associated_firs: []
        },
        sightings: [
          {
            sighting_id: `synth-${Date.now()}`,
            camera_id: "CAM-POL-AHM-01",
            camera_name: "SG Highway Iskcon Junction",
            department: "Police",
            lat: 23.0275,
            lng: 72.5074,
            pts_timestamp_ms: 100000,
            timestamp_iso: new Date().toISOString(),
            confidence: 0.88,
            direction_of_travel: "NE",
            snapshot_url: "/snapshots/placeholder.jpg",
            snapshot_hash_sha256: "0000000000000000000000000000000000000000000000000000000000000000"
          }
        ]
      };
    }
  },

  async searchPlate(query: string, limit: number = 20): Promise<VehicleSearchItem[]> {
    const trimmed = query.trim().toUpperCase();
    try {
      const res = await fetch(`${API_BASE}/api/search?plate=${encodeURIComponent(trimmed)}&limit=${limit}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('API searchPlate fallback to mock:', err);
      if (!trimmed) {
        return MOCK_SEARCH_ITEMS.slice(0, limit);
      }
      return MOCK_SEARCH_ITEMS.filter(item =>
        item.plate_number.includes(trimmed) ||
        (item.owner_name && item.owner_name.toUpperCase().includes(trimmed))
      ).slice(0, limit);
    }
  },

  async getAlerts(limit: number = 100): Promise<AlertEvent[]> {
    try {
      const res = await fetch(`${API_BASE}/api/alerts?limit=${limit}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('API getAlerts fallback to mock:', err);
      return MOCK_ALERTS;
    }
  },

  async postAlert(alert: Partial<AlertEvent>): Promise<AlertEvent> {
    const res = await fetch(`${API_BASE}/api/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(alert),
    });
    if (!res.ok) {
      throw new Error(`Failed to post alert: HTTP ${res.status}`);
    }
    return await res.json();
  },

  async exportCSV(plate?: string): Promise<string> {
    try {
      const url = plate ? `${API_BASE}/api/export/csv?plate_number=${encodeURIComponent(plate)}` : `${API_BASE}/api/export/csv`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      console.warn('API exportCSV fallback:', err);
      return MOCK_EVALUATION_CSV;
    }
  }
};
