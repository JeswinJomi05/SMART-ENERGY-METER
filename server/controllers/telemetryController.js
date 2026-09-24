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

  const toNum = (val, fallback = 0) => {
    if (val === undefined || val === null || val === '') return fallback;
    const n = parseFloat(val);
    return Number.isFinite(n) ? n : fallback;
  };
  
  // Support both standard names and esp/esp.ino variable names
  const voltage = toNum(payload.voltage ?? payload.voltageRMS, 0.0);
  const current = toNum(payload.current ?? payload.currentRMS, 0.0);
  const power = (payload.power !== undefined || payload.powerW !== undefined)
    ? toNum(payload.power ?? payload.powerW, 0.0)
    : Math.round(voltage * current);
  const energy = toNum(payload.energy ?? payload.energyKWh, 0.0);
  const frequency = toNum(payload.frequency, 50.0);
  const powerFactor = toNum(payload.powerFactor, 0.98);

  // Fetch current tariff rate
  const settings = await getSettings();
  const tariffRate = settings.tariffRate || 8.0;
  const cost = parseFloat((energy * tariffRate).toFixed(2));

  const readingData = {
    deviceId,
    voltage,
    current,
    power,
    energy,
    frequency,
    powerFactor,
    cost,
    isSimulated: Boolean(payload.isSimulated),
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

    // Use toObject() if it's a Mongoose document so spread works correctly
    const latestData = typeof latest.toObject === 'function' ? latest.toObject() : latest;
    const deviceData = typeof device.toObject === 'function' ? device.toObject() : device;
    const settingsData = typeof settings.toObject === 'function' ? settings.toObject() : settings;

    return res.status(200).json({
      success: true,
      data: {
        ...latestData,
        tariffRate: settingsData.tariffRate,
        relayState: deviceData.relayState,
        deviceOnline: deviceData.status === 'online',
        lastSeen: deviceData.lastSeen,
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
      current: a,
      power,
      energy,
      frequency: 50.0,
      powerFactor: 0.98,
      isSimulated: true,
    });

    return res.status(200).json({ success: true, reading, device });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
