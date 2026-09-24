import { io } from 'socket.io-client';

// Sanitize backend URL (auto-corrects accidental Vercel dashboard URLs and strips trailing slashes)
export const sanitizeBackendUrl = (rawUrl) => {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim().replace(/\/+$/, '');

  // Detect accidental copy-paste of Vercel dashboard URL:
  // e.g. https://vercel.com/jeswinjomi05s-projects/smart-energy-meter-backend
  const vercelDashboardMatch = url.match(/^https?:\/\/vercel\.com\/[^/]+\/([^/?#]+)/i);
  if (vercelDashboardMatch) {
    const projectName = vercelDashboardMatch[1];
    const corrected = `https://${projectName}.vercel.app`;
    console.warn(
      `[Smart Meter] Detected Vercel dashboard URL in VITE_API_URL: "${url}". Auto-correcting to deployment domain: "${corrected}". Please update your Vercel Project Settings > Environment Variables with this correct URL.`
    );
    url = corrected;
  }
  return url;
};

// Base API endpoints (supports Vite VITE_API_URL for production/Vercel)
export const BACKEND_URL = sanitizeBackendUrl(
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://127.0.0.1:5000' : '')
);

export const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

// Returns valid Socket.IO target URL, or null if running on static host with no backend URL configured
export const getSocketTarget = () => {
  if (BACKEND_URL) {
    return BACKEND_URL;
  }
  // In local dev, Vite proxy forwards /socket.io to localhost:5000
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return window.location.origin;
    }
  }
  // In production with no backend URL, return null so we don't spam the static host with WebSocket errors
  return null;
};

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
  const socketTarget = getSocketTarget();

  if (!socketTarget) {
    console.info('[WebSocket] Real-time WebSocket to static host skipped (no backend URL configured). Using HTTP polling fallback.');
    if (onStatusChange) onStatusChange(false);
    return null;
  }

  const socket = io(socketTarget, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[WebSocket] Connected to Smart Energy Meter backend at', socketTarget);
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
