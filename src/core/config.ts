import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { Config } from './types.js';

const CONFIG_DIR = join(homedir(), '.shellio');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

export function configExists(): boolean {
  return existsSync(CONFIG_FILE);
}

export function loadConfig(): Config | null {
  if (!configExists()) {
    return null;
  }

  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return Config.parse(data);
  } catch {
    return null;
  }
}

export function saveConfig(config: Config): void {
  ensureConfigDir();
  const data = JSON.stringify(config, null, 2);
  writeFileSync(CONFIG_FILE, data, { encoding: 'utf-8', mode: 0o600 });
  chmodSync(CONFIG_FILE, 0o600);
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}
