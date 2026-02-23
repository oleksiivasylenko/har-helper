import { Router } from 'express';
import { getGlobalSettings, saveGlobalSettings } from '../database/globalSettings.js';

var router = Router();

router.get('/global', function(req, res) {
  try {
    var settings = getGlobalSettings(req.userId);
    res.json({ settings: settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/global', function(req, res) {
  try {
    saveGlobalSettings(req.userId, req.body);
    var settings = getGlobalSettings(req.userId);
    res.json({ settings: settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
