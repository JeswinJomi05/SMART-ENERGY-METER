import { getDevice, updateDevice } from '../services/storeService.js';
import { publishMqttMessage } from '../services/mqttService.js';
import { processIncomingTelemetry } from './telemetryController.js';

let ioInstance = null;
export const setDeviceSocketIO = (io) => {
  ioInstance = io;
};

export const getDeviceStatus = async (req, res) => {
  try {
    const device = await getDevice();
    return res.status(200).json({ success: true, data: device });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const toggleRelay = async (req, res) => {
  try {
    const { relayState } = req.body;
    const device = await updateDevice('ESP32-SMART-METER-IND-7782', {
      relayState: Boolean(relayState),
    });

    // Send command to ESP32 over MQTT
    publishMqttMessage('home/esp32/meter_01/cmd', {
      action: 'SET_RELAY',
      relayState: Boolean(relayState),
      timestamp: Date.now(),
    });

    // Notify React web client via WebSockets
    if (ioInstance) {
      ioInstance.emit('device:relay', { relayState: Boolean(relayState) });
    }

    return res.status(200).json({
      success: true,
      message: `Relay state updated to ${relayState ? 'ON (Normal)' : 'OFF (Safety Cut-off)'}`,
      data: device,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Poll ESP32 directly via HTTP GET http://<ESP32_IP>/data
export const pollEsp32 = async (req, res) => {
  const { ip } = req.body;
  if (!ip) return res.status(400).json({ success: false, error: 'IP address required' });

  try {
    const cleanIp = ip.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const url = `http://${cleanIp}/data`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) throw new Error(`ESP32 returned HTTP status ${response.status}`);
    const data = await response.json();

    const { reading, device } = await processIncomingTelemetry({
      ...data,
      ipAddress: cleanIp,
    });

    return res.status(200).json({
      success: true,
      message: `Polled ESP32 at ${cleanIp} successfully`,
      data: reading,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: `Could not connect to ESP32 at ${ip}: ${error.message}`,
    });
  }
};
