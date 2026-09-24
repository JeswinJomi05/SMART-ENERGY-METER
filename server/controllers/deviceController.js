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
    return re