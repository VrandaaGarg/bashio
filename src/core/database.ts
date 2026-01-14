import { chmodSync, existsSync } from 'node:fs';
import Database from 'better-sqlite3';
import { ensureConfigDir, getConfigDir } from './config.js';

const DB_PATH = `${getConfigDir()}/history.db`;

let db: Database.Database | null = null;

const SCHEMA = `
-- History table: stores recent command history (auto-cleaned based on retention)
CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  command TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('ai', 'shortcut')),
  working_directory TEXT NOT NULL,
  executed INTEGER DEFAULT 0,
  exit_code INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Query stats table: aggregated stats (never deleted, stays tiny)
-- Keyed by command to handle query variations (typos, synonyms, different phrasings)
CREATE TABLE IF NOT EXISTS query_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('ai', 'shortcut')),
  use_count INTEGER DEFAULT 1,
  success_count INTEGER DEFAULT 0,
  suggested INTEGER DEFAULT 0,
  first_used TEXT NOT NULL,
  last_used TEXT NOT NULL
);

-- Metadata table for DB version and settings
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_history_created ON history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_query ON history(query);
CREATE INDEX IF NOT EXISTS idx_history_working_dir ON history(working_directory);
CREATE INDEX IF NOT EXISTS idx_stats_use_count ON query_stats(use_count DESC);

-- Initial metadata
INSERT OR IGNORE INTO metadata (key, value) VALUES ('db_version', '1');
INSERT OR IGNORE INTO metadata (key, value) VALUES ('last_cleanup', '0');
`;

export function initDatabase(): Database.Database {
  if (db) {
    return db;
  }

  ensureConfigDir();

  const isNew = !existsSync(DB_PATH);

  db = new Database(DB_PATH);

  // Set secure file permissions (owner read/write only)
  if (isNew) {
    chmodSync(DB_PATH, 0o600);
  }

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Create schema
  db.exec(SCHEMA);

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function getMetadata(key: string): string | null {
  const database = getDatabase();
  const row = database
    .prepare('SELECT value FROM metadata WHERE key = ?')
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setMetadata(key: string, value: string): void {
  const database = getDatabase();
  database
    .prepare('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)')
    .run(key, value);
}

export function getDatabasePath(): string {
  return DB_PATH;
}
