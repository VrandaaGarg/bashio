import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { input } from '@inquirer/prompts';
import { ensureConfigDir, getConfigDir } from './config.js';
import type {
  ResolvedShortcut,
  ShortcutDefinition,
  ShortcutsFile,
} from './types.js';
import { ShortcutsFile as ShortcutsFileSchema } from './types.js';

const SHORTCUTS_FILE = join(getConfigDir(), 'shortcuts.json');

export function shortcutsFileExists(): boolean {
  return existsSync(SHORTCUTS_FILE);
}

export function loadShortcuts(): ShortcutsFile {
  if (!shortcutsFileExists()) {
    return { version: 1, shortcuts: {} };
  }

  try {
    const raw = readFileSync(SHORTCUTS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return ShortcutsFileSchema.parse(data);
  } catch {
    return { version: 1, shortcuts: {} };
  }
}

export function saveShortcuts(shortcuts: ShortcutsFile): void {
  ensureConfigDir();
  const data = JSON.stringify(shortcuts, null, 2);
  writeFileSync(SHORTCUTS_FILE, data, { encoding: 'utf-8', mode: 0o600 });
  chmodSync(SHORTCUTS_FILE, 0o600);
}

export function getShortcut(name: string): ShortcutDefinition | null {
  const file = loadShortcuts();
  return file.shortcuts[name] || null;
}

export function addShortcut(
  name: string,
  definition: ShortcutDefinition,
): void {
  const file = loadShortcuts();
  file.shortcuts[name] = definition;
  saveShortcuts(file);
}

export function removeShortcut(name: string): boolean {
  const file = loadShortcuts();
  if (!file.shortcuts[name]) {
    return false;
  }
  delete file.shortcuts[name];
  saveShortcuts(file);
  return true;
}

export function listShortcuts(): Record<string, ShortcutDefinition> {
  const file = loadShortcuts();
  return file.shortcuts;
}

export function getShortcutsFilePath(): string {
  return SHORTCUTS_FILE;
}

/**
 * Parses user input to extract shortcut name and arguments
 * For single-arg shortcuts, join all remaining parts as one argument
 */
function parseInput(
  queryParts: string[],
  expectedArgCount: number,
): { name: string; args: string[] } {
  if (queryParts.length === 0) {
    return { name: '', args: [] };
  }

  const name = queryParts[0];
  const remainingParts = queryParts.slice(1);

  if (remainingParts.length === 0) {
    return { name, args: [] };
  }

  // If shortcut expects only 1 argument, join all remaining parts as one
  // This handles: b commit my commit message -> message = "my commit message"
  if (expectedArgCount === 1) {
    return { name, args: [remainingParts.join(' ')] };
  }

  // For multi-arg shortcuts, each part is a separate argument
  return { name, args: remainingParts };
}

/**
 * Replaces {{placeholder}} in template with provided arguments
 */
function fillTemplate(
  template: string,
  argNames: string[],
  argValues: string[],
): string {
  let result = template;

  for (let i = 0; i < argNames.length; i++) {
    const placeholder = `{{${argNames[i]}}}`;
    const value = argValues[i] || '';
    result = result.split(placeholder).join(value);
  }

  return result;
}

/**
 * Tries to resolve a shortcut from user input
 * Returns null if no matching shortcut found
 */
export async function tryResolveShortcut(
  queryParts: string[],
): Promise<ResolvedShortcut | null> {
  if (queryParts.length === 0) {
    return null;
  }

  // First check if the first word matches a shortcut
  const shortcutName = queryParts[0];
  const shortcut = getShortcut(shortcutName);

  if (!shortcut) {
    return null;
  }

  const requiredArgs = shortcut.args || [];
  const { args: providedArgs } = parseInput(queryParts, requiredArgs.length);
  const finalArgs: string[] = [...providedArgs];

  // If not enough args provided, prompt for missing ones
  if (finalArgs.length < requiredArgs.length) {
    for (let i = finalArgs.length; i < requiredArgs.length; i++) {
      const argName = requiredArgs[i];
      const value = await input({
        message: `Enter ${argName}:`,
      });
      finalArgs.push(value);
    }
  }

  const command = fillTemplate(shortcut.template, requiredArgs, finalArgs);

  return {
    name: shortcutName,
    command,
    source: 'shortcut',
  };
}
