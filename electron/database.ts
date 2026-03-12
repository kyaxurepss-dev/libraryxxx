import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database;

export function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'kyaxa-library.db');
  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Create all tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      folder_path TEXT,
      exe_path TEXT,
      cover_url TEXT,
      hero_url TEXT,
      logo_url TEXT,
      description TEXT,
      metacritic_score INTEGER,
      playtime_minutes INTEGER DEFAULT 0,
      favorite INTEGER DEFAULT 0,
      added_at TEXT DEFAULT (datetime('now')),
      last_played TEXT,
      igdb_id INTEGER,
      release_year INTEGER,
      launch_options TEXT,
      game_modes TEXT,
      emulator_id INTEGER,
      rom_path TEXT,
      FOREIGN KEY (emulator_id) REFERENCES emulators(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS screenshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS dlcs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      dlc_name TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS game_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
      UNIQUE(game_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS collection_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection_id INTEGER NOT NULL,
      game_id INTEGER NOT NULL,
      FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
      UNIQUE(collection_id, game_id)
    );

    CREATE TABLE IF NOT EXISTS extras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'other',
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scan_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL UNIQUE,
      name TEXT,
      icon TEXT DEFAULT '📁',
      color TEXT DEFAULT '#3b82f6'
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS play_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_minutes INTEGER DEFAULT 0,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS emulators (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      exe_path TEXT NOT NULL,
      args_template TEXT NOT NULL,
      platforms TEXT
    );

    CREATE TABLE IF NOT EXISTS game_videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL,
      video_id TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );
  `);

  // Schema Migrations (adding missing columns to existing DBs)
  try {
    const tableInfo = db.pragma('table_info(games)') as { name: string }[];
    const cols = new Set(tableInfo.map(c => c.name));

    if (!cols.has('hero_url')) db.exec('ALTER TABLE games ADD COLUMN hero_url TEXT');
    if (!cols.has('logo_url')) db.exec('ALTER TABLE games ADD COLUMN logo_url TEXT');
    if (!cols.has('release_year')) db.exec('ALTER TABLE games ADD COLUMN release_year INTEGER');
    if (!cols.has('launch_options')) db.exec('ALTER TABLE games ADD COLUMN launch_options TEXT');
    if (!cols.has('game_modes')) db.exec('ALTER TABLE games ADD COLUMN game_modes TEXT');
    if (!cols.has('emulator_id')) db.exec('ALTER TABLE games ADD COLUMN emulator_id INTEGER REFERENCES emulators(id) ON DELETE SET NULL');
    if (!cols.has('rom_path')) db.exec('ALTER TABLE games ADD COLUMN rom_path TEXT');

    // scan_folders migrations
    const sfInfo = db.pragma('table_info(scan_folders)') as { name: string }[];
    const sfCols = new Set(sfInfo.map(c => c.name));
    if (!sfCols.has('name')) db.exec('ALTER TABLE scan_folders ADD COLUMN name TEXT');
    if (!sfCols.has('icon')) db.exec("ALTER TABLE scan_folders ADD COLUMN icon TEXT DEFAULT '📁'");
    if (!sfCols.has('color')) db.exec("ALTER TABLE scan_folders ADD COLUMN color TEXT DEFAULT '#3b82f6'");
  } catch (e) {
    console.error('Migration failed:', e);
  }

  return db;
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function closeDb(): void {
  try {
    if (db) {
      db.close();
    }
  } catch (e) {
    console.error('Error closing database:', e);
  }
}
