import { getOne, runQuery, insertAndGetId } from './init.js';

var DEFAULT_GLOBAL_SETTINGS = {
  useNoiseInspect: true,
  expressionCollapsed: false
};

export function getGlobalSettings(userId) {
  var row = getOne(
    'SELECT * FROM settings WHERE user_id = ? AND archive_id IS NULL',
    [userId]
  );
  
  if (!row) {
    return { ...DEFAULT_GLOBAL_SETTINGS };
  }
  
  return {
    id: row.id,
    ...DEFAULT_GLOBAL_SETTINGS,
    ...JSON.parse(row.settings_json || '{}')
  };
}

export function saveGlobalSettings(userId, settings) {
  var existing = getOne(
    'SELECT id FROM settings WHERE user_id = ? AND archive_id IS NULL',
    [userId]
  );
  
  if (existing) {
    runQuery(
      `UPDATE settings SET 
        settings_json = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [JSON.stringify(settings), existing.id]
    );
  } else {
    insertAndGetId(
      `INSERT INTO settings (user_id, archive_id, settings_json)
       VALUES (?, NULL, ?)`,
      [userId, JSON.stringify(settings)]
    );
  }
}
