import { getSettings, updateSettings } from '../services/storeService.js';

export const getSettingsHandler = async (req, res) => {
  try {
    const settings = await getSettings();
    return res.status(200).json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const updateSettingsHandler = async (req, res) => {
  try {
    const updated = await updateSettings(req.body);
    return res.status(200).json({ success: true, message: 'Settings updated successfully', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
