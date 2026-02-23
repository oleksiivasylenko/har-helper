import { Router } from 'express';
import { getFiltersByArchive, saveFilters, getFilterSources, copyFilters } from '../database/filters.js';

var router = Router();

router.get('/:archiveId', function(req, res) {
  try {
    var filters = getFiltersByArchive(req.userId, parseInt(req.params.archiveId));
    res.json({ filters: filters });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:archiveId', function(req, res) {
  try {
    saveFilters(req.userId, parseInt(req.params.archiveId), req.body);
    var filters = getFiltersByArchive(req.userId, parseInt(req.params.archiveId));
    res.json({ filters: filters });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:archiveId/sources', function(req, res) {
  try {
    var sources = getFilterSources(req.userId, parseInt(req.params.archiveId));
    res.json({ sources: sources });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:archiveId/copy', function(req, res) {
  try {
    var { sourceArchiveId, mode, copyNoiseHeaders } = req.body;
    copyFilters(req.userId, sourceArchiveId, parseInt(req.params.archiveId), mode || 'replace', copyNoiseHeaders !== false);
    var filters = getFiltersByArchive(req.userId, parseInt(req.params.archiveId));
    res.json({ filters: filters });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
