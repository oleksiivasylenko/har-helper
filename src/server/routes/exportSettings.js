import { Router } from 'express';
import { getExportSettingsByArchive, saveExportSettings, copyExportSettings } from '../database/exportSettings.js';

var router = Router();

router.get('/:archiveId', function(req, res) {
  try {
    var settings = getExportSettingsByArchive(req.userId, parseInt(req.params.archiveId));
    res.json({ exportSettings: settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:archiveId', function(req, res) {
  try {
    saveExportSettings(req.userId, parseInt(req.params.archiveId), req.body);
    var settings = getExportSettingsByArchive(req.userId, parseInt(req.params.archiveId));
    res.json({ exportSettings: settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:archiveId/copy', function(req, res) {
  try {
    var { sourceArchiveId, copyNoiseHeaders } = req.body;
    copyExportSettings(req.userId, sourceArchiveId, parseInt(req.params.archiveId), copyNoiseHeaders !== false);
    var settings = getExportSettingsByArchive(req.userId, parseInt(req.params.archiveId));
    res.json({ exportSettings: settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
