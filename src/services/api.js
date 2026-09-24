import { io } from 'socket.io-client';

// Base API endpoints (uses Vite proxy in dev, direct URL in production)
const API_BASE = '/api';

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
  // Connect via current origin or direct port 5000 fallback
  const socket = io({
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
