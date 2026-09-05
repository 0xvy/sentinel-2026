import { useState, useCallback } from 'react';
import type { TrajectoryResponse } from '../types';
import { getApiBaseUrl } from '../utils/constants';

export function useTrajectory() {
  const [trajectory, setTrajectory] = useState<TrajectoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activePlate, setActivePlate] = useState<string | null>(null);

  /**
   * Search for chronological cross-camera trajectory for a target license plate.
   * Core benchmark jury evaluation: GET /api/vehicles/{plate}/trajectory
   */
  const searchPlate = useCallback(async (plate: string): Promise<TrajectoryResponse | null> => {
    const cleanPlate = (plate || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (!cleanPlate) {
      setError('Please provide a valid license plate number');
      return null;
    }

    setLoading(true);
    setError(null);
    setActivePlate(cleanPlate);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(
        `${baseUrl}/api/vehicles/${encodeURIComponent(cleanPlate)}/trajectory`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (response.status === 404) {
        setTrajectory(null);
        setError(`No historical trajectory sightings found for plate "${cleanPlate}"`);
        return null;
      }

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }

      const data: TrajectoryResponse = await response.json();
      setTrajectory(data);
      return data;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError(`Trajectory query timed out for "${cleanPlate}"`);
      } else {
        const message = err instanceof Error ? err.message : 'Failed to retrieve vehicle trajectory';
        console.error('[useTrajectory] Search error:', message);
        setError(message);
      }
      setTrajectory(null);
      return null;
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  const clearTrajectory = useCallback(() => {
    setTrajectory(null);
    setError(null);
    setActivePlate(null);
  }, []);

  return {
    trajectory,
    loading,
    error,
    activePlate,
    searchPlate,
    clearTrajectory,
  };
}

export default useTrajectory;
