import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      default: 'ESP32-SMART-METER-IND-7782',
    },
    type: {
      type: String,
      enum: ['HIGH_VOLTAGE', 'LOW_VOLTAGE', 'OVERLOAD', 'OFFLINE', 'BREAKER_TRIPPED', 'INFO'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'warning',
    },
    resolved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Alert', AlertSchema);
