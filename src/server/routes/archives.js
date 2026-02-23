import { Router } from 'express';
import { getArchivesByUser, getArchiveById, getArchiveWithHarData, createArchive, deleteArchive, updateArchive } from '../database/archives.js';

var router = Router();

router.get('/', function(req, res) {
  try {
    var archives = getArchivesByUser(req.userId);
    res.json({ archives: archives });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', function(req, res) {
  try {
    var archive = getArchiveById(parseInt(req.params.id), req.userId);
    if (!archive) {
      return res.status(404).json({ error: 'Archive not found' });
    }
    res.json({ archive: archive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/har', function(req, res) {
  try {
    var archive = getArchiveWithHarData(parseInt(req.params.id), req.userId);
    if (!archive) {
      return res.status(404).json({ error: 'Archive not found' });
    }
    var harData = archive.har_data ? JSON.parse(archive.har_data) : null;
    res.json({ harData: harData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', function(req, res) {
  try {
    var { name, fileName, entryCount, harData } = req.body;
    var archive = createArchive(req.userId, name, fileName, entryCount, harData);
    res.json({ archive: archive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', function(req, res) {
  try {
    var id = parseInt(req.params.id);
    updateArchive(id, req.userId, req.body);
    var archive = getArchiveById(id, req.userId);
    res.json({ archive: archive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', function(req, res) {
  try {
    deleteArchive(parseInt(req.params.id), req.userId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
