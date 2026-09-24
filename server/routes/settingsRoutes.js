import express from 'express';
import {
  getSettingsHandler,
  updateSettingsHandler,
} from '../controllers/settingsController.js';

const router = express.Router();

router.get('/', getSettingsHandler);
router.put('/', updateSettingsHandler);

export default router;
