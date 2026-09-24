import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema(
  {
    tariffRate: {
      type: Number,
      default: 8.00,
    },
    currency: {
      type: String,
      default: '₹',
    },
    highVoltageLimit: {
      type: Number,
      default: 260,
    },
    lowVoltageLimit: {
      type: Number,
      default: 180,
    },
    maxPowerLimit: {
      type: Number,
      default: 5000,
    },
    billingCycleDay: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Settings', SettingsSchema);
