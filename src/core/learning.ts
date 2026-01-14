import { getDatabase } from './database.js';
import { listShortcuts } from './shortcuts.js';
import type { ShortcutSuggestion } from './types.js';

interface QueryStatsRow {
  id: number;
  command: string;
  source: string;
  use_count: number;
  success_count: number;
  suggested: number;
}

export function suggestShortcutNameFromCommand(command: string): string {
  // Extract meaningful parts from the command
  // Examples:
  // "find . -size +100M" → "largefiles"
  // "lsof -ti:3000 | xargs kill -9" → "killport"
  // "git add . && git commit -m" → "commit"

  // Simple heuristic: take first 2-3 significant words/operators
  const parts = command
    .split(/[\s\-&|;()]+/)
    .filter((p) => p.length > 0 && !p.match(/^[.+]/));

  if (parts.length === 0) {
    return 'cmd';
  }

  // Common command names
  const mainCmd = parts[0];

  // For compound commands, combine main cmd with key argument
  if (parts.length > 1) {
    const keyArg = parts[1];
    if (keyArg && keyArg.length > 0) {
      const combined = `${mainCmd}${keyArg}`.slice(0, 12);
      return combined;
    }
  }

  return mainCmd.slice(0, 12);
}

export function getShortcutSuggestions(threshold = 3): ShortcutSuggestion[] {
  const db = getDatabase();

  // Get frequently used AI commands that haven't been suggested yet
  // Keyed by COMMAND, not query, to handle variations (typos, synonyms)
  const rows = db
    .prepare(
      `SELECT id, command, source, use_count, success_count, suggested
       FROM query_stats 
       WHERE source = 'ai' 
         AND use_count >= ?
         AND suggested = 0
       ORDER BY use_count DESC
       LIMIT 10`,
    )
    .all(threshold) as QueryStatsRow[];

  // Get existing shortcuts to filter out conflicts
  const existingShortcuts = listShortcuts();
  const existingNames = new Set(Object.keys(existingShortcuts));

  const suggestions: ShortcutSuggestion[] = [];

  for (const row of rows) {
    // Generate shortcut name from COMMAND, not query
    let suggestedName = suggestShortcutNameFromCommand(row.command);

    // Ensure unique name
    let counter = 1;
    const baseName = suggestedName;
    while (existingNames.has(suggestedName)) {
      suggestedName = `${baseName}${counter}`;
      counter++;
    }

    suggestions.push({
      query: row.command, // Store command as "query" for now (for interface compatibility)
      command: row.command,
      useCount: row.use_count,
      suggestedName,
    });
  }

  return suggestions;
}

export function markPatternAsSuggested(command: string): void {
  const db = getDatabase();
  // Now marking by COMMAND instead of query
  db.prepare('UPDATE query_stats SET suggested = 1 WHERE command = ?').run(
    command,
  );
}

export function resetSuggestionFlags(): void {
  const db = getDatabase();
  db.prepare('UPDATE query_stats SET suggested = 0').run();
}

export function getCommandStats(command: string): QueryStatsRow | null {
  const db = getDatabase();
  const row = db
    .prepare('SELECT * FROM query_stats WHERE command = ?')
    .get(command) as QueryStatsRow | undefined;
  return row ?? null;
}
