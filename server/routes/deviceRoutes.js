import express from 'express';
import {
  getDeviceStatus,
  toggleRelay,
  pollEsp32,
} from '../controllers/deviceController.js';

const router = express.Router();

router.get('/status', getDeviceStatus);
router.post('/relay', toggleRelay);
router.post