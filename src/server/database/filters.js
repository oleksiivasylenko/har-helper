import { getOne, getAll, runQuery, insertAndGetId } from './init.js';
import { getArchiveById } from './archives.js';

var DEFAULT_EXPRESSION_TREE = JSON.stringify({ type: 'group', operator: 'and', children: [] });

export function getFiltersByArchive(userId, archiveId) {
  var row = getOne(
    'SELECT * FROM filters WHERE user_id = ? AND archive_id = ?',
    [userId, archiveId]
  );
  
  if (!row) {
    return {
      expressionTree: JSON.parse(DEFAULT_EXPRESSION_TREE),
      quickFilters: {},
      tagFilters: {},
      domainFilters: {},
      userNoiseHeaders: {},
      disabledNoiseHeaders: {},
      sortColumn: null,
      sortDirection: 'asc'
    };
  }
  
  return {
    id: row.id,
    expressionTree: JSON.parse(row.expression_tree_json || DEFAULT_EXPRESSION_TREE),
    quickFilters: JSON.parse(row.quick_filters_json || '{}'),
    tagFilters: JSON.parse(row.tag_filters_json || '{}'),
    domainFilters: JSON.parse(row.domain_filters_json || '{}'),
    userNoiseHeaders: JSON.parse(row.user_noise_headers_json || '{}'),
    disabledNoiseHeaders: JSON.parse(row.disabled_noise_headers_json || '{}'),
    sortColumn: row.sort_column || null,
    sortDirection: row.sort_direction || 'asc'
  };
}

export function saveFilters(userId, archiveId, filters) {
  var archive = getArchiveById(archiveId, userId);
  var archiveName = archive ? archive.name : null;
  
  var existing = getOne(
    'SELECT id FROM filters WHERE user_id = ? AND archive_id = ?',
    [userId, archiveId]
  );
  
  if (existing) {
    runQuery(
      `UPDATE filters SET
        expression_tree_json = ?,
        quick_filters_json = ?,
        tag_filters_json = ?,
        domain_filters_json = ?,
        user_noise_headers_json = ?,
        disabled_noise_headers_json = ?,
        sort_column = ?,
        sort_direction = ?,
        archive_name = COALESCE(?, archive_name),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
      [
        JSON.stringify(filters.expressionTree || { type: 'group', operator: 'and', children: [] }),
        JSON.stringify(filters.quickFilters || {}),
        JSON.stringify(filters.tagFilters || {}),
        JSON.stringify(filters.domainFilters || {}),
        JSON.stringify(filters.userNoiseHeaders || {}),
        JSON.stringify(filters.disabledNoiseHeaders || {}),
        filters.sortColumn || null,
        filters.sortDirection || 'asc',
        archiveName,
        existing.id
      ]
    );
  } else {
    insertAndGetId(
      `INSERT INTO filters (user_id, archive_id, archive_name, expression_tree_json, quick_filters_json, tag_filters_json, domain_filters_json, user_noise_headers_json, disabled_noise_headers_json, sort_column, sort_direction)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        archiveId,
        archiveName,
        JSON.stringify(filters.expressionTree || { type: 'group', operator: 'and', children: [] }),
        JSON.stringify(filters.quickFilters || {}),
        JSON.stringify(filters.tagFilters || {}),
        JSON.stringify(filters.domainFilters || {}),
        JSON.stringify(filters.userNoiseHeaders || {}),
        JSON.stringify(filters.disabledNoiseHeaders || {}),
        filters.sortColumn || null,
        filters.sortDirection || 'asc'
      ]
    );
  }
}

export function getFilterSources(userId, excludeArchiveId) {
  var rows = getAll(
    `SELECT DISTINCT
       settings_ids.archive_id as archive_id,
       a.name as archive_name,
       COALESCE(f.archive_name, e.archive_name) as stored_archive_name,
       CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as has_filters,
       CASE WHEN e.id IS NOT NULL THEN 1 ELSE 0 END as has_export_settings,
       CASE WHEN a.id IS NULL THEN 1 ELSE 0 END as is_deleted
     FROM (
       SELECT archive_id FROM filters WHERE user_id = ?
       UNION
       SELECT archive_id FROM export_settings WHERE user_id = ?
     ) AS settings_ids
     LEFT JOIN filters f ON f.archive_id = settings_ids.archive_id AND f.user_id = ?
     LEFT JOIN export_settings e ON e.archive_id = settings_ids.archive_id AND e.user_id = ?
     LEFT JOIN archives a ON a.id = settings_ids.archive_id AND a.user_id = ?
     WHERE settings_ids.archive_id != ?
     ORDER BY CASE WHEN a.created_at IS NULL THEN 1 ELSE 0 END, a.created_at DESC`,
    [userId, userId, userId, userId, userId, excludeArchiveId]
  );
  
  return rows.map(function(row) {
    var name = row.archive_name || row.stored_archive_name || 'Archive #' + row.archive_id;
    var isDeleted = row.is_deleted === 1;
    return {
      archiveId: row.archive_id,
      archiveName: name,
      hasFilters: row.has_filters === 1,
      hasExportSettings: row.has_export_settings === 1,
      isDeleted: isDeleted
    };
  });
}

export function copyFilters(userId, sourceArchiveId, targetArchiveId, mode, copyNoiseHeaders = true) {
  var source = getFiltersByArchive(userId, sourceArchiveId);
  var target = getFiltersByArchive(userId, targetArchiveId);
  
  if (mode === 'replace') {
    var filtersToSave = {
      ...source,
      userNoiseHeaders: copyNoiseHeaders ? source.userNoiseHeaders : target.userNoiseHeaders,
      disabledNoiseHeaders: copyNoiseHeaders ? source.disabledNoiseHeaders : target.disabledNoiseHeaders
    };
    saveFilters(userId, targetArchiveId, filtersToSave);
  } else {
    var merged = {
      expressionTree: source.expressionTree,
      quickFilters: { ...target.quickFilters, ...source.quickFilters },
      tagFilters: { ...target.tagFilters, ...source.tagFilters },
      domainFilters: { ...target.domainFilters, ...source.domainFilters },
      userNoiseHeaders: copyNoiseHeaders ? { ...target.userNoiseHeaders, ...source.userNoiseHeaders } : target.userNoiseHeaders,
      disabledNoiseHeaders: copyNoiseHeaders ? { ...target.disabledNoiseHeaders, ...source.disabledNoiseHeaders } : target.disabledNoiseHeaders,
      sortColumn: source.sortColumn,
      sortDirection: source.sortDirection
    };
    
    saveFilters(userId, targetArchiveId, merged);
  }
}

export function deleteFiltersByArchive(userId, archiveId) {
  runQuery('DELETE FROM filters WHERE user_id = ? AND archive_id = ?', [userId, archiveId]);
}
