# ⚡ ESP32 Smart Energy Meter — Firmware & Hardware Guide

This directory contains the complete, production-ready Arduino C++ firmware for the **ESP32 Smart Energy Meter** to transmit real-time telemetry to the **MERN Stack Backend**.

---

## 🛠️ Hardware Requirements

| Component | Purpose | Recommended Model |
| :--- | :--- | :--- |
| **Microcontroller** | Processing & Wi-Fi/MQTT communications | ESP32 NodeMCU / DevKit V1 (30 or 38 pin) |
| **AC Energy Sensor** | High-precision Voltage, Current, Power, Energy | PZEM-004T v3.0 (with Current Transformer CT coil) |
| **Relay Module** | Remote Smart Breaker (Power Cut-off / Trip) | 1-Channel 5V Optocoupler Relay (10A / 30A) |
| **Power Supply** | Powers the ESP32 | 5V 2A Micro-USB or AC-to-DC 5V buck converter |

---

## 🔌 Hardware Wiring Diagram

```
+--------------------+                 +---------------------+
|    PZEM-004T v3.0  |                 |     ESP32 DevKit    |
|                    |                 |                     |
|                5V  +-----------------+  5V (VIN)           |
|                GND +-----------------+  GND                |
|                TX  +-----------------+  GPIO 16 (RX2)      |
|                RX  +-----------------+  GPIO 17 (TX2)      |
+--------------------+                 |                     |
                                       |  GPIO 4 (or 16)     +---------> [Relay IN]
                                       |  GND                +---------> [Relay GND]
                                       |  VIN (5V)           +---------> [Relay VCC]
                                       +---------------------+
```

> [!CAUTION]
> **HIGH VOLTAGE WARNING**: Working with 110V/220V/240V AC mains electricity carries risk of severe electrical shock. Always ensure mains power is completely switched off before making or modifying AC connections.

---

## 📦 Required Arduino IDE Libraries

In the Arduino IDE Library Manager (`Ctrl + Shift + I`):
1. **ArduinoJson** (by Benoit Blanchon) — version `6.x` or `7.x`
2. **PubSubClient** (by Nick O'Leary) — for MQTT communications
3. **PZEM004Tv30** (by Jakub Mandula) — if using physical PZEM hardware

---

## ⚙️ Configuration in `esp32_smart_meter.ino`

Open `esp32_smart_meter.ino` and edit lines 25–30:

```cpp
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Replace with your PC's local LAN IP address (run `ipconfig` in terminal)
const char* SERVER_URL    = "http://192.168.1.100:5000/api/telemetry";
```

---

## 🚀 How It Works

1. **Power Up**: ESP32 boots and connects to your local Wi-Fi.
2. **Telemetry Ingestion**: Every 3 seconds, it samples:
   - Voltage (V)
   - Current (A)
   - Active Power (W)
   - Cumulative Energy (kWh)
   - Power Factor & Frequency
3. **Dual Transmission**:
   - **HTTP REST**: Sends `POST /api/telemetry` directly to the MERN backend.
   - **MQTT**: Publishes to `home/esp32/meter_01/tele` on public broker `broker.emqx.io`.
4. **Bi-directional Breaker Control**:
   - The server response contains `"relayState": true/false`.
   - If you click **"Trip / Cut Off Power"** from the React web dashboard, the server instructs the ESP32 to immediately open the relay, cutting off power to the circuit!
