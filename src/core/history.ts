import { getDatabase, getMetadata, setMetadata } from './database.js';
import type { HistoryEntry, HistoryStats } from './types.js';

interface HistoryRow {
  id: number;
  query: string;
  command: string;
  source: string;
  working_directory: string;
  executed: number;
  exit_code: number | null;
  created_at: string;
}

interface CountResult {
  count: number;
}

interface TopCommandRow {
  command: string;
  use_count: number;
  source: string;
}

function rowToHistoryEntry(row: HistoryRow): HistoryEntry {
  return {
    id: row.id,
    query: row.query,
    command: row.command,
    source: row.source as 'ai' | 'shortcut',
    workingDirectory: row.working_directory,
    executed: row.executed,
    exitCode: row.exit_code,
    createdAt: row.created_at,
  };
}

export function recordCommand(data: {
  query: string;
  command: string;
  source: 'ai' | 'shortcut';
  workingDirectory?: string;
}): number {
  const db = getDatabase();
  const now = new Date().toISOString();
  const workingDir = data.workingDirectory || process.cwd();

  // Insert into history table
  const historyResult = db
    .prepare(
      `INSERT INTO history (query, command, source, working_directory, executed, created_at) 
       VALUES (?, ?, ?, ?, 0, ?)`,
    )
    .run(data.query, data.command, data.source, workingDir, now);

  // Update or insert into query_stats table (keyed by COMMAND, not query)
  const existingStats = db
    .prepare('SELECT id FROM query_stats WHERE command = ?')
    .get(data.command) as { id: number } | undefined;

  if (existingStats) {
    // Command already exists, just increment use_count
    db.prepare(
      `UPDATE query_stats 
       SET use_count = use_count + 1, 
           last_used = ?
       WHERE command = ?`,
    ).run(now, data.command);
  } else {
    // New command, insert into stats
    db.prepare(
      `INSERT INTO query_stats (command, source, use_count, success_count, suggested, first_used, last_used)
       VALUES (?, ?, 1, 0, 0, ?, ?)`,
    ).run(data.command, data.source, now, now);
  }

  return historyResult.lastInsertRowid as number;
}

export function markExecuted(historyId: number, exitCode: number): void {
  const db = getDatabase();

  // Update history entry
  db.prepare('UPDATE history SET executed = 1, exit_code = ? WHERE id = ?').run(
    exitCode,
    historyId,
  );

  // Get the command to update query_stats
  const historyRow = db
    .prepare('SELECT command FROM history WHERE id = ?')
    .get(historyId) as { command: string } | undefined;

  if (historyRow && exitCode === 0) {
    db.prepare(
      'UPDATE query_stats SET success_count = success_count + 1 WHERE command = ?',
    ).run(historyRow.command);
  }
}

export function getRecentHistory(limit = 20): HistoryEntry[] {
  const db = getDatabase();
  const rows = db
    .prepare('SELECT * FROM history ORDER BY created_at DESC LIMIT ?')
    .all(limit) as HistoryRow[];

  return rows.map(rowToHistoryEntry);
}

export function searchHistory(searchTerm: string, limit = 20): HistoryEntry[] {
  const db = getDatabase();
  const pattern = `%${searchTerm}%`;
  const rows = db
    .prepare(
      `SELECT * FROM history 
       WHERE query LIKE ? OR command LIKE ?
       ORDER BY created_at DESC 
       LIMIT ?`,
    )
    .all(pattern, pattern, limit) as HistoryRow[];

  return rows.map(rowToHistoryEntry);
}

export function getHistoryByDirectory(
  directory: string,
  limit = 20,
): HistoryEntry[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT * FROM history 
       WHERE working_directory = ?
       ORDER BY created_at DESC 
       LIMIT ?`,
    )
    .all(directory, limit) as HistoryRow[];

  return rows.map(rowToHistoryEntry);
}

export function getStats(): HistoryStats {
  const db = getDatabase();

  const totalResult = db
    .prepare('SELECT COUNT(*) as count FROM history')
    .get() as CountResult;

  const todayResult = db
    .prepare(
      `SELECT COUNT(*) as count FROM history 
       WHERE date(created_at) = date('now')`,
    )
    .get() as CountResult;

  const thisWeekResult = db
    .prepare(
      `SELECT COUNT(*) as count FROM history 
       WHERE created_at >= datetime('now', '-7 days')`,
    )
    .get() as CountResult;

  const executedResult = db
    .prepare('SELECT COUNT(*) as count FROM history WHERE executed = 1')
    .get() as CountResult;

  const aiResult = db
    .prepare("SELECT COUNT(*) as count FROM history WHERE source = 'ai'")
    .get() as CountResult;

  const shortcutResult = db
    .prepare("SELECT COUNT(*) as count FROM history WHERE source = 'shortcut'")
    .get() as CountResult;

  const topCommands = db
    .prepare(
      `SELECT command, use_count, source FROM query_stats 
       ORDER BY use_count DESC 
       LIMIT 5`,
    )
    .all() as TopCommandRow[];

  const total = totalResult.count;
  const executed = executedResult.count;

  return {
    totalCommands: total,
    todayCommands: todayResult.count,
    thisWeekCommands: thisWeekResult.count,
    totalExecuted: executed,
    executionRate: total > 0 ? Math.round((executed / total) * 100) : 0,
    aiCount: aiResult.count,
    shortcutCount: shortcutResult.count,
    topQueries: topCommands.map((c) => ({
      query: c.command,
      useCount: c.use_count,
      source: c.source,
    })),
  };
}

export function cleanupHistory(config: {
  retentionDays: number;
  maxEntries: number;
}): number {
  const db = getDatabase();

  // Delete old entries based on retention days
  const deleteByAgeResult = db
    .prepare(
      `DELETE FROM history 
       WHERE created_at < datetime('now', '-' || ? || ' days')`,
    )
    .run(config.retentionDays);

  // Delete excess entries beyond max
  const deleteExcessResult = db
    .prepare(
      `DELETE FROM history 
       WHERE id NOT IN (
         SELECT id FROM history 
         ORDER BY created_at DESC 
         LIMIT ?
       )`,
    )
    .run(config.maxEntries);

  // Update last cleanup timestamp
  setMetadata('last_cleanup', new Date().toISOString());

  return deleteByAgeResult.changes + deleteExcessResult.changes;
}

export function clearAllHistory(): number {
  const db = getDatabase();
  const result = db.prepare('DELETE FROM history').run();
  return result.changes;
}

export function clearHistoryOlderThan(days: number): number {
  const db = getDatabase();
  const result = db
    .prepare(
      `DELETE FROM history 
       WHERE created_at < datetime('now', '-' || ? || ' days')`,
    )
    .run(days);
  return result.changes;
}

export function shouldRunCleanup(): boolean {
  const lastCleanup = getMetadata('last_cleanup');
  if (!lastCleanup || lastCleanup === '0') {
    return true;
  }

  const lastCleanupDate = new Date(lastCleanup);
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;

  return now.getTime() - lastCleanupDate.getTime() > oneDayMs;
}

export function getHistoryCount(): number {
  const db = getDatabase();
  const result = db
    .prepare('SELECT COUNT(*) as count FROM history')
    .get() as CountResult;
  return result.count;
}
