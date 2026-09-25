import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB, getDbStatus } from './config/db.js';
import { initMqtt } from './services/mqttService.js';
import { setSocketIO } from './controllers/telemetryController.js';
import { setDeviceSocketIO } from './controllers/deviceController.js';
import telemetryRoutes from './routes/telemetryRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import deviceRoutes from './routes/deviceRoutes.js';
import os from 'os';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Setup Socket.IO for real-time WebSockets
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Pass socket.io to controllers
setSocketIO(io);
setDeviceSocketIO(io);

// Middlewares
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-CSRF-Token'],
}));
app.options('*', cors());
app.use(express.json());

// In serverless environments, ensure DB connection is initialized
app.use(async (req, res, next) => {
  if (!getDbStatus()) {
    try {
      await connectDB();
    } catch (_) {}
  }
  next();
});

// API Routes
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/device', deviceRoutes);

// System Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    service: 'Smart Energy Meter Backend',
    databaseConnected: getDbStatus(),
    timestamp: new Date(),
    esp32Endpoints: {
      postTelemetryHttp: 'POST http://<server-ip>:5000/api/telemetry',
      mqttTopicTelemetry: process.env.MQTT_TELEMETRY_TOPIC || 'home/esp32/meter_01/tele',
      mqttTopicCommand: process.env.MQTT_COMMAND_TOPIC || 'home/esp32/meter_01/cmd',
    },
  });
});

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  console.log(`[WebSocket] Client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[WebSocket] Client disconnected: ${socket.id}`);
  });

  // Client requests immediate live snapshot
  socket.on('request:snapshot', async () => {
    try {
      const { getLatestReading, getDevice, getSettings } = await import('./services/storeService.js');
      const [latest, device, settings] = await Promise.all([getLatestReading(), getDevice(), getSettings()]);
      const latestData = typeof latest.toObject === 'function' ? latest.toObject() : latest;
      const deviceData = typeof device.toObject === 'function' ? device.toObject() : device;
      socket.emit('telemetry:snapshot', {
        ...latestData,
        tariffRate: settings.tariffRate,
        relayState: deviceData.relayState,
        deviceOnline: deviceData.status === 'online',
        lastSeen: deviceData.lastSeen,
      });
    } catch (e) {
      console.error('[WebSocket] Snapshot request error:', e.message);
    }
  });
});

// 404 Catch-All handler with CORS headers
app.use((req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handler with CORS headers
app.use((err, req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  console.error('[Express Error Handler]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// Connect to MongoDB and MQTT
const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();
  initMqtt();

  

// Helper to get the first non‑internal IPv4 address
function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIPAddress();

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`⚡ Smart Energy Meter MERN Backend running on port ${PORT}`);
    console.log(`   ➜ REST API:       http://${localIP}:${PORT}/api/telemetry`);
    console.log(`   ➜ Health Check:   http://${localIP}:${PORT}/api/health`);
    console.log(`   ➜ WebSocket:      ws://${localIP}:${PORT}`);
    console.log(`   ➜ ESP32 Endpoint: POST http://${localIP}:${PORT}/api/telemetry`);
    console.log(`======================================================\n`);
  });
}

// Start server only when run directly (e.g. Render, Railway, VPS, Localhost)
// On Vercel Serverless, app is exported as the request handler
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  startServer();
} else {
  // In serverless environment, initiate DB connection
  connectDB().catch(console.error);
}

export { app, server, io };
export default app;
