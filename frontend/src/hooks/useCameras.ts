import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CameraRegistryEntry, CameraStats } from '../types';
import { getApiBaseUrl } from '../utils/constants';

export function useCameras(departmentFilter?: string) {
  const [cameras, setCameras] = useState<CameraRegistryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCameras = useCallback(async () => {
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const baseUrl = getApiBaseUrl();
      const params = new URLSearchParams();

      if (departmentFilter && departmentFilter !== 'All' && departmentFilter.trim() !== '') {
        params.append('department', departmentFilter.trim());
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`${baseUrl}/api/cameras${queryString}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to load cameras: HTTP ${response.status} ${response.statusText}`);
      }

      const data: CameraRegistryEntry[] = await response.json();
      setCameras(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Camera fetch request timed out');
      } else {
        const message = err instanceof Error ? err.message : 'Unknown camera fetch error';
        console.error('[useCameras] Error:', message);
        setError(message);
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [departmentFilter]);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  // Aggregate statewide health telemetry
  const stats: CameraStats = useMemo(() => {
    let online = 0;
    let offline = 0;
    let degraded = 0;

    for (const cam of cameras) {
      if (cam.status === 'Online') online++;
      else if (cam.status === 'Offline') offline++;
      else if (cam.status === 'Degraded') degraded++;
      else online++;
    }

    return {
      total: cameras.length,
      online,
      offline,
      degraded,
    };
  }, [cameras]);

  return {
    cameras,
    loading,
    error,
    refetch: fetchCameras,
    stats,
  };
}

export default useCameras;
