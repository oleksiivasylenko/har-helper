import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var DB_PATH = path.join(__dirname, '../../../data/har-helper.db');

var db = null;

export async function initDatabase() {
  var dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  var SQL = await initSqlJs();
  
  if (fs.existsSync(DB_PATH)) {
    var buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS archives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      entry_count INTEGER DEFAULT 0,
      har_data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      archive_id INTEGER,
      settings_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (archive_id) REFERENCES archives(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS filters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      archive_id INTEGER,
      archive_name TEXT,
      expression_tree_json TEXT NOT NULL DEFAULT '{"type":"group","operator":"and","children":[]}',
      quick_filters_json TEXT NOT NULL DEFAULT '{}',
      tag_filters_json TEXT NOT NULL DEFAULT '{}',
      domain_filters_json TEXT NOT NULL DEFAULT '{}',
      user_noise_headers_json TEXT NOT NULL DEFAULT '{}',
      disabled_noise_headers_json TEXT NOT NULL DEFAULT '{}',
      sort_column TEXT,
      sort_direction TEXT DEFAULT 'asc',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (archive_id) REFERENCES archives(id)
    )
  `);

  try {
    db.run(`ALTER TABLE filters ADD COLUMN domain_filters_json TEXT NOT NULL DEFAULT '{}'`);
  } catch (e) {}

  db.run(`
    CREATE TABLE IF NOT EXISTS export_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      archive_id INTEGER,
      archive_name TEXT,
      export_settings_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (archive_id) REFERENCES archives(id)
    )
  `);

  saveDatabase();
  console.log('Database initialized at', DB_PATH);
  return db;
}

export function getDatabase() {
  return db;
}

export function saveDatabase() {
  if (db) {
    var data = db.export();
    var buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

export function runQuery(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
}

export function getOne(sql, params = []) {
  var stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    var row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

export function getAll(sql, params = []) {
  var stmt = db.prepare(sql);
  stmt.bind(params);
  var results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function insertAndGetId(sql, params = []) {
  db.run(sql, params);
  var result = getOne('SELECT last_insert_rowid() as id');
  saveDatabase();
  return result ? result.id : null;
}
