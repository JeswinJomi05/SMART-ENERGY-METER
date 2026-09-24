import express from 'express';
import {
  postTelemetry,
  getLiveReading,
  getHistory,
  getTrend,
  simulateReading,
} from '../controllers/telemetryController.js';

const router = express.Router();

// ESP32 Telemetry ingestion endpoint (HTTP POST)
router.post('/', postTelemetry);

// Live parameters snapshot
router.get('/live', getLiveReading);

// Historical reading logs
router.get('/history', getHistory);

// Trend curve for chart
router.get('/trend', getTrend);

// Simulator pulse trigger
router.post('/simulate', simulateReading);

export default router;
