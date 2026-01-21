import * as readline from 'node:readline';
import chalk from 'chalk';
import { Command } from 'clipanion';
import pc from 'picocolors';
import { getThemeByName, THEMES, type Theme } from '../../chat/utils/themes.js';
import { configExists, loadConfig, saveConfig } from '../../core/config.js';
import type { ConfigV2 } from '../../core/types.js';
import { clearThemeCache } from '../../utils/cliTheme.js';
import { logger } from '../../utils/logger.js';

const MAX_VISIBLE = 10;

interface ThemePickerResult {
  theme: string | null;
  cancelled: boolean;
}

function renderThemePicker(
  themes: Theme[],
  selectedIndex: number,
  currentThemeName: string,
  scrollOffset: number,
): string[] {
  const lines: string[] = [];
  const selectedTheme = themes[selectedIndex];
  const accentColor = chalk.hex(selectedTheme.accent);

  lines.push(accentColor('?') + pc.bold(' Select theme:'));

  const visibleThemes = themes.slice(scrollOffset, scrollOffset + MAX_VISIBLE);

  for (let i = 0; i < visibleThemes.length; i++) {
    const theme = visibleThemes[i];
    const actualIndex = scrollOffset + i;
    const isSelected = actualIndex === selectedIndex;
    const isCurrent = theme.name === currentThemeName;

    const cursor = isSelected ? accentColor('❯') : ' ';
    const marker = isCurrent ? accentColor('●') : pc.dim('○');
    const colorPreview = chalk.hex(theme.accent)('■');
    const name = isSelected
      ? accentColor(theme.displayName)
      : theme.displayName;

    lines.push(`${cursor} ${marker} ${colorPreview} ${name}`);
  }

  // Show scroll indicators
  if (scrollOffset > 0) {
    lines.push(pc.dim('  ↑ more themes above'));
  }
  if (scrollOffset + MAX_VISIBLE < themes.length) {
    lines.push(pc.dim('  ↓ more themes below'));
  }

  lines.push('');
  lines.push(pc.dim('↑↓ navigate • ↵ select • esc cancel'));

  return lines;
}

async function interactiveThemePicker(
  currentThemeName: string,
): Promise<ThemePickerResult> {
  return new Promise((resolve) => {
    const themes = THEMES;
    let selectedIndex = themes.findIndex((t) => t.name === currentThemeName);
    if (selectedIndex === -1) selectedIndex = 0;

    let scrollOffset = Math.max(
      0,
      Math.min(
        selectedIndex - Math.floor(MAX_VISIBLE / 2),
        themes.length - MAX_VISIBLE,
      ),
    );

    let renderedLines = 0;

    const clearRenderedLines = () => {
      if (renderedLines > 0) {
        process.stdout.write(`\x1b[${renderedLines}A`);
        process.stdout.write('\x1b[0J');
      }
    };

    const render = () => {
      clearRenderedLines();

      const lines = renderThemePicker(
        themes,
        selectedIndex,
        currentThemeName,
        scrollOffset,
      );
      renderedLines = lines.length;

      for (const line of lines) {
        console.log(line);
      }
    };

    const input = process.stdin;

    readline.emitKeypressEvents(input);
    if (input.isTTY) {
      input.setRawMode(true);
    }

    const cleanup = () => {
      input.removeListener('keypress', onKeypress);
      if (input.isTTY) {
        input.setRawMode(false);
      }
      input.pause();
      clearRenderedLines();
    };

    const onKeypress = (_str: string, key: readline.Key) => {
      if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        cleanup();
        resolve({ theme: null, cancelled: true });
        return;
      }

      if (key.name === 'return') {
        cleanup();
        resolve({ theme: themes[selectedIndex].name, cancelled: false });
        return;
      }

      if (key.name === 'up' || (key.ctrl && key.name === 'p')) {
        if (selectedIndex > 0) {
          selectedIndex--;
          if (selectedIndex < scrollOffset) {
            scrollOffset = selectedIndex;
          }
          render();
        }
      }

      if (key.name === 'down' || (key.ctrl && key.name === 'n')) {
        if (selectedIndex < themes.length - 1) {
          selectedIndex++;
          if (selectedIndex >= scrollOffset + MAX_VISIBLE) {
            scrollOffset = selectedIndex - MAX_VISIBLE + 1;
          }
          render();
        }
      }

      // Page up/down for faster navigation
      if (key.name === 'pageup') {
        selectedIndex = Math.max(0, selectedIndex - MAX_VISIBLE);
        scrollOffset = Math.max(0, scrollOffset - MAX_VISIBLE);
        render();
      }

      if (key.name === 'pagedown') {
        selectedIndex = Math.min(
          themes.length - 1,
          selectedIndex + MAX_VISIBLE,
        );
        scrollOffset = Math.min(
          themes.length - MAX_VISIBLE,
          scrollOffset + MAX_VISIBLE,
        );
        render();
      }

      // Home/End
      if (key.name === 'home') {
        selectedIndex = 0;
        scrollOffset = 0;
        render();
      }

      if (key.name === 'end') {
        selectedIndex = themes.length - 1;
        scrollOffset = Math.max(0, themes.length - MAX_VISIBLE);
        render();
      }
    };

    input.on('keypress', onKeypress);
    render();
  });
}

export class ThemeCommand extends Command {
  static paths = [['theme'], ['--theme']];

  static usage = Command.Usage({
    description: 'Change the color theme',
    examples: [['Change theme', '$0 --theme']],
  });

  async execute(): Promise<number> {
    if (!configExists()) {
      logger.warn('Bashio is not configured yet.');
      console.log(
        pc.gray("Run 'b --auth' to set up your AI provider first.\n"),
      );
      return 1;
    }

    const config = loadConfig();
    if (!config) {
      logger.error('Failed to load configuration.');
      return 1;
    }

    const currentThemeName = config.settings?.theme ?? 'bashio';
    const currentTheme = getThemeByName(currentThemeName);

    console.log(pc.bold('\n  Change Theme\n'));
    console.log(pc.gray(`  Current: ${currentTheme.displayName}\n`));

    const result = await interactiveThemePicker(currentThemeName);

    if (result.cancelled || !result.theme) {
      console.log(pc.dim('  Cancelled.\n'));
      return 0;
    }

    if (result.theme === currentThemeName) {
      logger.info('No changes made.');
      console.log();
      return 0;
    }

    const updatedConfig: ConfigV2 = {
      ...config,
      settings: {
        confirmBeforeExecute: config.settings?.confirmBeforeExecute ?? true,
        historyEnabled: config.settings?.historyEnabled ?? true,
        historyRetentionDays: config.settings?.historyRetentionDays ?? 30,
        historyMaxEntries: config.settings?.historyMaxEntries ?? 2000,
        autoConfirmShortcuts: config.settings?.autoConfirmShortcuts ?? false,
        theme: result.theme,
      },
    };

    saveConfig(updatedConfig);
    clearThemeCache();

    const newTheme = getThemeByName(result.theme);
    logger.success(`Theme changed to: ${newTheme.displayName}`);
    console.log(
      pc.dim('  Restart chat (b --chat) to see full theme changes.\n'),
    );

    return 0;
  }
}
