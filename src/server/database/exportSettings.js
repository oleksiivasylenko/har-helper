import { getOne, runQuery, insertAndGetId } from './init.js';
import { getArchiveById } from './archives.js';

var DEFAULT_EXPORT_SETTINGS = {
  requestBody: true,
  requestCookies: true,
  responseBody: true,
  responseCookies: true,
  timings: true,
  serverIp: true,
  queryString: true,
  includeInitiator: true,
  hideNoiseReq: true,
  hideNoiseResp: true,
  useOriginalOrder: true,
  includedRequestHeaders: {},
  includedResponseHeaders: {},
  userNoiseHeaders: {},
  disabledNoiseHeaders: {},
  deselectedEntries: {}
};

export function getExportSettingsByArchive(userId, archiveId) {
  var row = getOne(
    'SELECT * FROM export_settings WHERE user_id = ? AND archive_id = ?',
    [userId, archiveId]
  );
  
  if (!row) {
    return { ...DEFAULT_EXPORT_SETTINGS };
  }
  
  return {
    id: row.id,
    ...JSON.parse(row.export_settings_json || '{}')
  };
}

export function saveExportSettings(userId, archiveId, settings) {
  var archive = getArchiveById(archiveId, userId);
  var archiveName = archive ? archive.name : null;
  
  var existing = getOne(
    'SELECT id FROM export_settings WHERE user_id = ? AND archive_id = ?',
    [userId, archiveId]
  );
  
  if (existing) {
    runQuery(
      `UPDATE export_settings SET 
        export_settings_json = ?,
        archive_name = COALESCE(?, archive_name),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [JSON.stringify(settings), archiveName, existing.id]
    );
  } else {
    insertAndGetId(
      `INSERT INTO export_settings (user_id, archive_id, archive_name, export_settings_json)
       VALUES (?, ?, ?, ?)`,
      [userId, archiveId, archiveName, JSON.stringify(settings)]
    );
  }
}

export function copyExportSettings(userId, sourceArchiveId, targetArchiveId, copyNoiseHeaders = true) {
  var source = getExportSettingsByArchive(userId, sourceArchiveId);
  delete source.id;
  
  if (!copyNoiseHeaders) {
    var target = getExportSettingsByArchive(userId, targetArchiveId);
    source.userNoiseHeaders = target.userNoiseHeaders || {};
    source.disabledNoiseHeaders = target.disabledNoiseHeaders || {};
  }
  
  saveExportSettings(userId, targetArchiveId, source);
}

export function deleteExportSettingsByArchive(userId, archiveId) {
  runQuery('DELETE FROM export_settings WHERE user_id = ? AND archive_id = ?', [userId, archiveId]);
}
