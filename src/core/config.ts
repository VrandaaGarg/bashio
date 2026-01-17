import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  ConfigV1,
  ConfigV2,
  type ProviderName,
  type ProviderSettings,
} from './types.js';

const CONFIG_DIR = join(homedir(), '.bashio');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

export function configExists(): boolean {
  return existsSync(CONFIG_FILE);
}

function migrateV1toV2(v1: ConfigV1): ConfigV2 {
  return {
    version: 2,
    activeProvider: v1.provider,
    providers: {
      [v1.provider]: {
        model: v1.model,
        credentials: v1.credentials,
      },
    },
    settings: v1.settings,
  };
}

export function loadConfig(): ConfigV2 | null {
  if (!configExists()) {
    return null;
  }

  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8');
    const data = JSON.parse(raw);

    // Try V2 first
    const v2Result = ConfigV2.safeParse(data);
    if (v2Result.success) {
      return v2Result.data;
    }

    // Try V1 and migrate
    const v1Result = ConfigV1.safeParse(data);
    if (v1Result.success) {
      const migrated = migrateV1toV2(v1Result.data);
      saveConfig(migrated); // Auto-save migrated config
      return migrated;
    }

    return null;
  } catch {
    return null;
  }
}

export function saveConfig(config: ConfigV2): void {
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

// Helper to get active provider config
export function getActiveProviderConfig(
  config: ConfigV2,
): { provider: ProviderName; settings: ProviderSettings } | null {
  const settings = config.providers[config.activeProvider];
  if (!settings) return null;
  return { provider: config.activeProvider, settings };
}

// Helper to check if a provider is configured
export function isProviderConfigured(
  config: ConfigV2,
  provider: ProviderName,
): boolean {
  return provider in config.providers;
}

// Helper to add/update a provider
export function setProviderConfig(
  config: ConfigV2,
  provider: ProviderName,
  settings: ProviderSettings,
  setActive = true,
): ConfigV2 {
  return {
    ...config,
    activeProvider: setActive ? provider : config.activeProvider,
    providers: {
      ...config.providers,
      [provider]: settings,
    },
  };
}
