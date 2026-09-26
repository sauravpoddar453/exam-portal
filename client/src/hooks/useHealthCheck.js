import { useState, useEffect, useCallback } from 'react';
import { safeFetchJson } from '../utils/api';

export function useHealthCheck() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { ok, data } = await safeFetchJson('/api/health');
      if (ok && data) {
        setHealthData(data);
        setIsConnected(true);
      } else {
        throw new Error(data?.message || 'Server connection failed');
      }
    } catch (err) {
      console.warn('[HealthCheck Hook] Could not connect to backend:', err.message);
      setError(err.message);
      setIsConnected(false);
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    // Refresh health check every 15 seconds
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  return { healthData, loading, error, isConnected, refetch: checkHealth };
}
