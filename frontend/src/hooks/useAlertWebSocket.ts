import { useState, useEffect, useRef, useCallback } from 'react';
import { AlertEvent } from '../types';
import { api } from '../services/api';

export type WebSocketConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export function useAlertWebSocket() {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [latestAlert, setLatestAlert] = useState<AlertEvent | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<WebSocketConnectionStatus>('connecting');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);

  // Initial load of historical alerts from API
  useEffect(() => {
    let isMounted = true;
    api.getAlerts(100).then((initialAlerts) => {
      if (isMounted && initialAlerts && initialAlerts.length > 0) {
        setAlerts(initialAlerts);
        setLatestAlert(initialAlerts[0]);
      }
    }).catch((err) => {
      console.warn('Failed to load initial alerts:', err);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const connectWebSocket = useCallback(() => {
    // Determine WS URL
    const envWs = import.meta.env.VITE_WS_URL;
    let wsUrl = envWs;

    if (!wsUrl) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // If we are running in dev with proxy or default port 8000
      const host = window.location.host;
      wsUrl = `${protocol}//${host}/ws/alerts`;
    }

    try {
      setConnectionStatus('connecting');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        console.log('Tactical Alert WebSocket established at:', wsUrl);
      };

      ws.onmessage = (event) => {
        try {
          const newAlert: AlertEvent = JSON.parse(event.data);
          setAlerts((prev) => {
            // Avoid duplicate alert IDs
            const filtered = prev.filter((a) => a.alert_id !== newAlert.alert_id);
            return [newAlert, ...filtered];
          });
          setLatestAlert(newAlert);
        } catch (e) {
          console.error('Failed to parse incoming WebSocket alert JSON:', e);
        }
      };

      ws.onerror = () => {
        setConnectionStatus('disconnected');
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        // Exponential backoff reconnect
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 15000);
        reconnectAttemptsRef.current += 1;
        
        if (reconnectTimeoutRef.current) {
          window.clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connectWebSocket();
        }, delay);
      };
    } catch (err) {
      console.warn('WebSocket connection attempt error:', err);
      setConnectionStatus('disconnected');
    }
  }, []);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  // Trigger manual simulation / test alert
  const injectAlert = useCallback((customAlert: AlertEvent) => {
    setAlerts((prev) => [customAlert, ...prev]);
    setLatestAlert(customAlert);
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    setLatestAlert(null);
  }, []);

  return {
    alerts,
    latestAlert,
    connectionStatus,
    injectAlert,
    clearAlerts,
  };
}
