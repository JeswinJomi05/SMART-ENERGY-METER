import { io } from 'socket.io-client';

// Base API endpoints (supports Vite VITE_API_URL for production/Vercel)
export const BACKEND_URL = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://127.0.0.1:5000' : '')
).replace(/\/+$/, '');

export const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

export const fetchLiveTelemetry = async () => {
  const res = await fetch(`${API_BASE}/telemetry/live`);
  if (!res.ok) throw new Error('Failed to fetch live telemetry');
  const json = await res.json();
  return json.data;
};

export const fetchHistory = async (limit = 50) => {
  const res = await fetch(`${API_BASE}/telemetry/history?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch telemetry history');
  const json = await res.json();
  return json.data;
};

export const fetchTrend = async () => {
  const res = await fetch(`${API_BASE}/telemetry/trend`);
  if (!res.ok) throw new Error('Failed to fetch trend data');
  const json = await res.json();
  return json.data;
};

export const fetchSettings = async () => {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  const json = await res.json();
  return json.data;
};

export const updateSettingsAPI = async (newSettings) => {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newSettings),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  const json = await res.json();
  return json.data;
};

export const fetchDeviceStatus = async () => {
  const res = await fetch(`${API_BASE}/device/status`);
  if (!res.ok) throw new Error('Failed to fetch device status');
  const json = await res.json();
  return json.data;
};

export const toggleRelayAPI = async (relayState) => {
  const res = await fetch(`${API_BASE}/device/relay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ relayState }),
  });
  if (!res.ok) throw new Error('Failed to update relay state');
  const json = await res.json();
  return json.data;
};

// Ask the MERN backend to fetch data from the ESP32's /data endpoint right now
export const pollEsp32ViaBackend = async (espIp) => {
  const res = await fetch(`${API_BASE}/device/poll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip: espIp }),
  });
  if (!res.ok) throw new Error('Backend poll of ESP32 failed');
  return await res.json();
};

// Fetch directly from ESP32 /data endpoint (browser to ESP32 directly, same network)
export const fetchEsp32Directly = async (espIp) => {
  const cleanIp = espIp.replace(/^\/+/, '').replace(/^https?:\/\//, '');
  const res = await fetch(`http://${cleanIp}/data`, { signal: AbortSignal.timeout(3500) });
  if (!res.ok) throw new Error(`ESP32 returned HTTP ${res.status}`);
  return await res.json();
};

export const triggerSimulateAPI = async (mode = 'normal') => {
  const res = await fetch(`${API_BASE}/telemetry/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error('Failed to trigger simulation');
  return await res.json();
};

// WebSocket Service with Socket.IO
export const setupSocketConnection = ({ onTelemetry, onRelay, onAlert, onStatusChange }) => {
  // Connect via BACKEND_URL or current origin
  const socketTarget = BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const socket = socketTarget
    ? io(socketTarget, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1500,
      })
    : io({
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1500,
      });

  socket.on('connect', () => {
    console.log('[WebSocket] Connected to Smart Energy Meter backend!');
    if (onStatusChange) onStatusChange(true);
  });

  socket.on('disconnect', () => {
    console.warn('[WebSocket] Disconnected from backend.');
    if (onStatusChange) onStatusChange(false);
  });

  socket.on('connect_error', (err) => {
    console.warn('[WebSocket] Connection error (retrying):', err.message);
    if (onStatusChange) onStatusChange(false);
  });

  socket.on('telemetry:live', (data) => {
    if (onTelemetry) onTelemetry(data);
  });

  socket.on('device:relay', (data) => {
    if (onRelay) onRelay(data);
  });

  socket.on('alert:new', (data) => {
    if (onAlert) onAlert(data);
  });

  return socket;
};
