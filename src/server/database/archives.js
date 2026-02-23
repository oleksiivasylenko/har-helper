import { getOne, getAll, runQuery, insertAndGetId } from './init.js';

export function getArchivesByUser(userId) {
  return getAll('SELECT id, user_id, name, file_name, entry_count, created_at FROM archives WHERE user_id = ? ORDER BY created_at DESC', [userId]);
}

export function getArchiveById(id, userId) {
  return getOne('SELECT id, user_id, name, file_name, entry_count, created_at FROM archives WHERE id = ? AND user_id = ?', [id, userId]);
}

export function getArchiveWithHarData(id, userId) {
  return getOne('SELECT * FROM archives WHERE id = ? AND user_id = ?', [id, userId]);
}

export function createArchive(userId, name, fileName, entryCount, harData) {
  var harDataJson = harData ? JSON.stringify(harData) : null;
  var id = insertAndGetId(
    'INSERT INTO archives (user_id, name, file_name, entry_count, har_data) VALUES (?, ?, ?, ?, ?)',
    [userId, name, fileName, entryCount, harDataJson]
  );
  return getArchiveById(id, userId);
}

export function updateArchiveHarData(id, userId, harData) {
  var harDataJson = harData ? JSON.stringify(harData) : null;
  runQuery('UPDATE archives SET har_data = ? WHERE id = ? AND user_id = ?', [harDataJson, id, userId]);
}

export function deleteArchive(id, userId) {
  runQuery('DELETE FROM archives WHERE id = ? AND user_id = ?', [id, userId]);
}

export function updateArchive(id, userId, updates) {
  var fields = [];
  var values = [];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.entryCount !== undefined) {
    fields.push('entry_count = ?');
    values.push(updates.entryCount);
  }
  
  if (fields.length === 0) return;
  
  values.push(id, userId);
  runQuery(
    'UPDATE archives SET ' + fields.join(', ') + ' WHERE id = ? AND user_id = ?',
    values
  );
}
