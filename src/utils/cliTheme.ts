import chalk from 'chalk';
import { getThemeByName, type Theme } from '../chat/utils/themes.js';
import { loadConfig } from '../core/config.js';

export interface CliTheme {
  accent: (text: string) => string;
  textPrimary: (text: string) => string;
  textDim: (text: string) => string;
  raw: Theme;
}

let cachedTheme: CliTheme | null = null;

export function getCliTheme(): CliTheme {
  if (cachedTheme) {
    return cachedTheme;
  }

  const config = loadConfig();
  const themeName = config?.settings?.theme ?? 'bashio';
  const theme = getThemeByName(themeName);

  cachedTheme = {
    accent: chalk.hex(theme.accent),
    textPrimary:
      theme.textPrimary === 'white'
        ? chalk.white
        : chalk.hex(theme.textPrimary),
    textDim: theme.textDim === 'gray' ? chalk.gray : chalk.hex(theme.textDim),
    raw: theme,
  };

  return cachedTheme;
}

export function accent(text: string): string {
  return getCliTheme().accent(text);
}

export function clearThemeCache(): void {
  cachedTheme = null;
}
