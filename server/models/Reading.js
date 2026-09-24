import mongoose from 'mongoose';

const ReadingSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
      default: 'ESP32-SMART-METER-IND-7782',
    },
    voltage: {
      type: Number,
      required: true,
    },
    current: {
      type: Number,
      required: true,
    },
    power: {
      type: Number,
      required: true,
    },
    energy: {
      type: Number,
      required: true,
    },
    frequency: {
      type: Number,
      default: 50.0,
    },
    powerFactor: {
      type: Number,
      default: 0.98,
    },
    cost: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

ReadingSchema.index({ deviceId: 1, timestamp: -1 });

export default mongoose.model('Reading', ReadingSchema);
