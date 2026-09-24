import {
  saveReading,
  getLatestReading,
  getReadingsHistory,
  getSettings,
  getDevice,
  updateDevice,
  createAlert,
} from '../services/storeService.js';

let ioInstance = null;
export const setSocketIO = (io) => {
  ioInstance = io;
};

// Process telemetry from ESP32 (HTTP POST /api/telemetry, /data, or MQTT)
export const processIncomingTelemetry = async (payload) => {
  const deviceId = payload.deviceId || 'ESP32-SMART-METER-IND-7782';
  
  // Support both standard names and esp/esp.ino variable names
  const voltage = parseFloat(payload.voltage ?? payload.voltageRMS) || 228.0;
  const current = parseFloat(payload.current ?? payload.currentRMS) || 0.0;
  const power = parseFloat(payload.power ?? payload.powerW) || Math.round(voltage * current);
  const energy = parseFloat(payload.energy ?? payload.energyKWh) || 12.8;
  const frequency = parseFloat(payload.frequency) || 50.0;
  const powerFactor = parseFloat(payload.powerFactor) || 0.98;

  // Fetch current tariff rate
  const settings = await getSettings();
  const tariffRate = parseFloat(payload.tariff) || settings.tariffRate || 8.0;
  const cost = payload.bill !== undefined ? parseFloat(parseFloat(payload.bill).toFixed(2)) : parseFloat((energy * tariffRate).toFixed(2));

  const readingData = {
    deviceId,
    voltage,
    current,
    power,
    energy,
    frequency,
    powerFactor,
    cost,
    timestamp: new Date(),
  };

  // Check safety thresholds
  if (voltage > settings.highVoltageLimit) {
    await createAlert({
      deviceId,
      type: 'HIGH_VOLTAGE',
      message: `High Voltage Anomaly: ${voltage}V exceeded safety threshold of ${settings.highVoltageLimit}V`,
      severity: 'critical',
    });
    if (ioInstance) {
      ioInstance.emit('alert:new', {
        type: 'HIGH_VOLTAGE',
        message: `High Voltage Alert: ${voltage}V`,
      });
    }
  }

  if (power > settings.maxPowerLimit) {
    await createAlert({
      deviceId,
      type: 'OVERLOAD',
      message: `System Overload: ${power}W exceeded safe power limit of ${settings.maxPowerLimit}W`,
      severity: 'critical',
    });
    if (ioInstance) {
      ioInstance.emit('alert:new', {
        type: 'OVERLOAD',
        message: `Power Overload Alert: ${power}W`,
      });
    }
  }

  // Save to DB
  const savedDoc = await saveReading(readingData);

  // Update ESP32 Device presence
  const device = await updateDevice(deviceId, {
    status: 'online',
    lastSeen: new Date(),
    ipAddress: payload.ipAddress || '192.168.1.145',
  });

  // Real-time broadcast to connected React WebSockets
  if (ioInstance) {
    ioInstance.emit('telemetry:live', {
      reading: savedDoc,
      deviceStatus: device,
      tariffRate,
    });
  }

  return { reading: savedDoc, device };
};

// ESP32 HTTP POST Endpoint Handler
export const postTelemetry = async (req, res) => {
  try {
    const { reading, device } = await processIncomingTelemetry(req.body);
    // Respond with command payload for ESP32 (e.g. relay state control)
    return res.status(200).json({
      success: true,
      message: 'Telemetry received successfully',
      relayState: device.relayState,
      serverTime: Date.now(),
    });
  } catch (error) {
    console.error('[TelemetryController] Error receiving telemetry:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/telemetry/live
export const getLiveReading = async (req, res) => {
  try {
    const latest = await getLatestReading();
    const device = await getDevice();
    const settings = await getSettings();

    return res.status(200).json({
      success: true,
      data: {
        ...latest,
        tariffRate: settings.tariffRate,
        relayState: device.relayState,
        deviceOnline: device.status === 'online',
        lastSeen: device.lastSeen,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/telemetry/history
export const getHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const history = await getReadingsHistory(limit);
    return res.status(200).json({ success: true, count: history.length, data: history });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/telemetry/trend
export const getTrend = async (req, res) => {
  try {
    // 24H Trend points matching dashboard
    const trendPoints = [
      { label: '12 AM', value: 4.5, time: '12:00 AM' },
      { label: '3 AM', value: 4.8, time: '03:00 AM' },
      { label: '6 AM', value: 8.2, time: '06:00 AM' },
      { label: '9 AM', value: 10.5, time: '09:00 AM' },
      { label: '12 PM', value: 7.2, time: '12:00 PM' },
      { label: '3 PM', value: 6.0, time: '03:00 PM' },
      { label: '6 PM', value: 10.4, time: '06:00 PM' },
      { label: '9 PM', value: 11.5, time: '09:00 PM' },
      { label: '12 AM', value: 12.8, time: '11:59 PM' },
    ];
    return res.status(200).json({ success: true, data: trendPoints });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/telemetry/simulate (Trigger simulator pulse from UI or API)
export const simulateReading = async (req, res) => {
  try {
    const mode = req.body.mode || 'normal';
    let v = 228;
    let a = 8.4;

    if (mode === 'normal') {
      v = Math.round(227 + (Math.random() * 3 - 1));
      a = parseFloat((8.3 + (Math.random() * 0.3 - 0.1)).toFixed(1));
    } else if (mode === 'overload') {
      v = 222;
      a = 19.4;
    }

    const latest = await getLatestReading();
    const energy = parseFloat(((latest.energy || 12.8) + 0.002).toFixed(2));
    const power = Math.round(v * a * 0.98);

    const { reading, device } = await processIncomingTelemetry({
      voltage: v,
      current