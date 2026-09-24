# ⚡ Smart Energy Meter (IoT Powered) — Full MERN Stack + ESP32

A full-stack IoT Smart Energy Meter application built with the **MERN Stack** (MongoDB, Express, React, Node.js), **Socket.IO WebSockets**, **MQTT**, and **ESP32 Firmware** to measure, record, and control electricity consumption in real time.

---

## 🏛️ System Architecture

```
  +--------------------------------+
  |    ESP32 Smart Energy Meter    |
  |  (PZEM-004T / CT Sensor / Relay)|
  +---------------+----------------+
                  |
      HTTP POST / | MQTT Telemetry
      /api/telemetry (Every 3 sec)
                  v
  +--------------------------------+
  |     Node.js + Express Backend  | <====> [ MongoDB / Atlas ]
  |           (Port 5000)          |        Stores: Readings, Devices,
  |   Socket.IO WebSocket Server   |        Alerts, Settings
  +---------------+----------------+
                  |
                  | Real-Time WebSockets (Socket.IO)
                  | REST API
                  v
  +--------------------------------+
  |      React Frontend Client     |
  |      (Port 3000 via Vite)      |
  |   Live Gauges, Chart & Controls|
  +--------------------------------+
```

---

## 📦 Directory Structure

```
Tesla/
├── esp32_firmware/
│   ├── esp32_smart_meter.ino   # Arduino C++ sketch for ESP32 (HTTP & MQTT)
│   └── README_ESP32.md         # Hardware wiring and flashing guide
├── server/                     # MERN Backend (Express, Mongoose, Socket.io, MQTT)
│   ├── config/
│   │   └── db.js               # MongoDB connection (with Atlas & local fallback)
│   ├── controllers/
│   │   ├── telemetryController.js # Ingests ESP32 data, checks alerts, emits sockets
│   │   ├── deviceController.js    # ESP32 status & remote breaker relay control
│   │   └── settingsController.js  # Tariff rates & threshold configuration
│   ├── models/
│   │   ├── Reading.js          # Mongoose schema for V, I, P, kWh, PF, Cost
│   │   ├── Device.js           # Mongoose schema for ESP32 device metadata
│   │   ├── Settings.js         # Mongoose schema for tariff and alert limits
│   │   └── Alert.js            # Mongoose schema for voltage/overload anomalies
│   ├── routes/
│   │   ├── telemetryRoutes.js  # /api/telemetry
│   │   ├── deviceRoutes.js     # /api/device
│   │   └── settingsRoutes.js   # /api/settings
│   ├── services/
│   │   ├── storeService.js     # Unified database persistence
│   │   └── mqttService.js      # MQTT client subscribing to ESP32
│   ├── .env                    # Backend environment config
│   ├── package.json
│   └── server.js               # Server entry point
├── src/                        # React Frontend (Vite)
│   ├── components/
│   │   ├── GaugeCard.jsx       # 4 Circular SVG radial gauges
│   │   ├── EnergyTrendChart.jsx# 24H Bezier trend spline chart
│   │   ├── HeroCard.jsx        # Total cost & quick power metrics
│   │   ├── DeviceStatusCard.jsx# Live ESP32 connection & refresh status
│   │   ├── QuickInfoCard.jsx   # Tariff rate and consumption breakdown
│   │   ├── Sidebar.jsx         # Navigation sidebar
│   │   ├── HouseIllustration.jsx# IoT house SVG vector artwork
│   │   ├── MobileBottomNav.jsx # Mobile navigation bar
│   │   ├── HistoryView.jsx     # History table & CSV exporter
│   │   ├── SettingsView.jsx    # Tariff & breaker control
│   │   └── ProfileView.jsx     # ESP32 diagnostic specifications
│   ├── App.jsx                 # Main application with Socket.IO connection
│   └── index.css               # Vanilla CSS design tokens & animations
└── package.json
```

---

## 🚀 Running the Project

Both servers are already running in background daemons:

1. **Frontend**: [http://localhost:3000/](http://localhost:3000/)
2. **Backend**: [http://localhost:5000/](http://localhost:5000/)
3. **Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### Starting manually in separate terminals:

**Terminal 1 (Backend):**
```powershell
cd server
npm start
```

**Terminal 2 (Frontend):**
```powershell
npm run dev
```

---

## 📡 ESP32 Integration Endpoints

### 1. HTTP REST Ingestion
- **URL**: `POST http://<YOUR-PC-IP>:5000/api/telemetry`
- **Payload format**:
```json
{
  "deviceId": "ESP32-SMART-METER-IND-7782",
  "voltage": 228.4,
  "current": 8.42,
  "power": 1955.0,
  "energy": 12.8,
  "frequency": 50.0,
  "powerFactor": 0.98,
  "ipAddress": "192.168.1.145"
}
```
- **Response from Backend**:
```json
{
  "success": true,
  "message": "Telemetry received successfully",
  "relayState": true,
  "serverTime": 1790252813482
}
```
*Note: The response includes `relayState: true/false`. If tripped from the dashboard, the ESP32 automatically cuts off the relay.*

### 2. MQTT Telemetry
- **Broker**: `broker.emqx.io:1883` (configurable in `server/.env`)
- **Telemetry Topic (ESP32 publishes)**: `home/esp32/meter_01/tele`
- **Command Topic (Backend sends to ESP32)**: `home/esp32/meter_01/cmd`

### 3. Remote Relay Breaker Control
- **URL**: `POST http://localhost:5000/api/device/relay`
- **Payload**: `{"relayState": false}` (trips breaker) or `{"relayState": true}` (restores power).

---

## 🗄️ MongoDB Configuration

In `server/.env`:
```env
# Local MongoDB:
MONGODB_URI=mongodb://127.0.0.1:27017/smart_energy_meter

# Or MongoDB Atlas Cloud:
# MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/smart_energy_meter?retryWrites=true&w=majority
```
*The backend features an automatic resilient fallback store, so all APIs and WebSockets work even before MongoDB is connected!*
