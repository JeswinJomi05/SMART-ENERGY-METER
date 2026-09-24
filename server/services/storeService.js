import Reading from '../models/Reading.js';
import Device from '../models/Device.js';
import Settings from '../models/Settings.js';
import Alert from '../models/Alert.js';
import { getDbStatus } from '../config/db.js';

// Fallback in-memory store initialized with reference image data
const memoryStore = {
  readings: [
    {
      deviceId: 'ESP32-SMART-METER-IND-7782',
      voltage: 228,
      current: 8.4,
      power: 1955,
      energy: 12.8,
      frequency: 50.0,
      powerFactor: 0.98,
      cost: 102.40,
      timestamp: new Date(),
    },
  ],
  device: {
    deviceId: 'ESP32-SMART-METER-IND-7782',
    deviceName: 'Smart Energy Meter ESP32',
    status: 'online',
    relayState: true,
    ipAddress: '192.168.1.145',
    macAddress: '24:6F:28:B4:A1:90',
    firmwareVersion: 'v2.4.1',
    wifiRssi: -58,
    lastSeen: new Date(),
  },
  settings: {
    tariffRate: 8.00,
    currency: '₹',
    highVoltageLimit: 260,
    lowVoltageLimit: 180,
    maxPowerLimit: 5000,
    billingCycleDay: 1,
  },
  alerts: [],
};

// 24H Seed Trend data matching the UI screenshot
const now = new Date();
for (let i = 8; i >= 0; i--) {
  const d = new Date(now.getTime() - i * 2.5 * 3600 * 1000);
  const values = [4.5, 4.8, 8.2, 10.5, 7.2, 6.0, 10.4, 11.5, 12.8];
  memoryStore.readings.push({
    deviceId: 'ESP32-SMART-METER-IND-7782',
    voltage: 228 + (i % 3),
    current: 8.4,
    power: 1955,
    energy: values[8 - i] || 12.8,
    frequency: 50.0,
    powerFactor: 0.98,
    cost: ((values[8 - i] || 12.8) * 8.0).toFixed(2),
    timestamp: d,
  });
}

export const saveReading = async (data) => {
  if (getDbStatus()) {
    try {
      const doc = new Reading(data);
      return await doc.save();
    } catch (e) {
      console.error('[StoreService] MongoDB save error, falling back to memory:', e.message);
    }
  }
  const item = { ...data, timestamp: data.timestamp || new Date(), _id: Date.now().toString() };
  memoryStore.readings.unshift(item);
  if (memoryStore.readings.length > 500) memoryStore.readings.pop();
  return item;
};

export const getLatestReading = async (deviceId) => {
  if (getDbStatus()) {
    try {
      const latest = await Reading.findOne({ deviceId: deviceId || 'ESP32-SMART-METER-IND-7782' })
        .sort({ timestamp: -1 });
      if (latest) return latest;
    } catch (e) {
      console.error('[StoreService] MongoDB query error:', e.message);
    }
  }
  return memoryStore.readings[0] || {
    voltage: 228,
    current: 8.4,
    power: 1955,
    energy: 12.8,
    frequency: 50.0,
    powerFactor: 0.98,
    cost: 102.40,
    timestamp: new Date(),
  };
};

export const getReadingsHistory = async (limit = 50) => {
  if (getDbStatus()) {
    try {
      const list = await Reading.find().sort({ timestamp: -1 }).limit(limit);
      if (list.length > 0) return list;
    } catch (e) {
      console.error('[StoreService] MongoDB history query error:', e.message);
    }
  }
  return memoryStore.readings.slice(0, limit);
};

export const getSettings = async () => {
  if (getDbStatus()) {
    try {
      let settings = await Settings.findOne();
      if (!settings) {
        settings = await Settings.create(memoryStore.settings);
      }
      return settings;
    } catch (e) {
      console.error('[StoreService] MongoDB settings error:', e.message);
    }
  }
  return memoryStore.settings;
};

export const updateSettings = async (newSettings) => {
  if (getDbStatus()) {
    try {
      let settings = await Settings.findOne();
      if (!settings) {
        settings = new Settings(newSettings);
      } else {
        Object.assign(settings, newSettings);
      }
      return await settings.save();
    } catch (e) {
      console.error('[StoreService] MongoDB settings update error:', e.message);
    }
  }
  memoryStore.settings = { ...memoryStore.settings, ...newSettings };
  return memoryStore.settings;
};

export const getDevice = async (deviceId = 'ESP32-SMART-METER-IND-7782') => {
  if (getDbStatus()) {
    try {
      let dev = await Device.findOne({ deviceId });
      if (!dev) {
        dev = await Device.create(memoryStore.device);
      }
      return dev;
    } catch (e) {
      console.error('[StoreService] MongoDB device error:', e.message);
    }
  }
  return memoryStore.device;
};

export const updateDevice = async (deviceId, updateData) => {
  if (getDbStatus()) {
    try {
      return await Device.findOneAndUpdate(
        { deviceId },
        { ...updateData, lastSeen: new Date() },
        { upsert: true, new: true }
      );
    } catch (e) {
      console.error('[StoreService] MongoDB device update error:', e.message);
    }
  }
  memoryStore.device = { ...memoryStore.device, ...updateData, lastSeen: new Date() };
  return memoryStore.device;
};

export const createAlert = async (alertData) => {
  if (getDbStatus()) {
    try {
      const doc = new Alert(alertData);
      return await doc.save();
    } catch (e) {
      console.error('[StoreService] MongoDB alert error:', e.message);
    }
  }
  const alertItem = { ...alertData, _id: Date.now().toString(), createdAt: new Date() };
  memoryStore.alerts.unshift(alertItem);
  return alertItem;
};
