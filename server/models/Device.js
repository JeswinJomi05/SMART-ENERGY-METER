import mongoose from 'mongoose';

const DeviceSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    deviceName: {
      type: String,
      default: 'Smart Energy Meter ESP32',
    },
    status: {
      type: String,
      enum: ['online', 'offline'],
      default: 'online',
    },
    relayState: {
      type: Boolean,
      default: true, // true = power ON, false = tripped / cut off
    },
    ipAddress: {
      type: String,
      default: '192.168.1.145',
    },
    macAddress: {
      type: String,
      default: '24:6F:28:B4:A1:90',
    },
    firmwareVersion: {
      type: String,
      default: 'v2.4.1',
    },
    wifiRssi: {
      type: Number,
      default: -58,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Device', DeviceSchema);
