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

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Setup Socket.IO for real-time WebSockets
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
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
app.use(cors());
app.use(express.json());

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
  socket.on('request:snapshot', () => {
    import('./controllers/telemetryController.js').then(({ getLiveReading }) => {
      // Socket snapshot request handled
    });
  });
});

// Connect to MongoDB and MQTT
const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();
  initMqtt();

  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`⚡ Smart Energy Meter MERN Backend running on port ${PORT}`);
    console.log(`   ➜ REST API:       http://localhost:${PORT}/api/telemetry`);
    console.log(`   ➜ Health Check:   http://localhost:${PORT}/api/health`);
    console.log(`   ➜ WebSocket:      ws://localhost:${PORT}`);
    console.log(`   ➜ ESP32 Endpoint: POST http://localhost:${PORT}/api/telemetry`);
    console.log(`======================================================\n`);
  });
}

startServer();
