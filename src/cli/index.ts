import { Builtins, Cli } from 'clipanion';
import pc from 'picocolors';
import updateNotifier from 'update-notifier';
import { loadConfig } from '../core/config.js';
import { initDatabase } from '../core/database.js';
import { cleanupHistory, shouldRunCleanup } from '../core/history.js';

const pkg = {
  name: 'bashio',
  version: '0.7.0',
};

// Check for updates (runs in background, cached for 1 day)
const notifier = updateNotifier({
  pkg,
  updateCheckInterval: 1000 * 60 * 60 * 24, // 1 day
});

// Custom update notification matching welcome banner theme
if (notifier.update) {
  const { current, latest } = notifier.update;
  const cyan = pc.cyan;
  const width = 44;

  const ansiRegex = new RegExp(
    `${String.fromCharCode(27)}\\[[0-9;]*[a-zA-Z]`,
    'g',
  );
  const stripAnsi = (str: string): string => str.replace(ansiRegex, '');
  const visibleLength = (str: string): number => stripAnsi(str).length;
  const pad = (text: string, len: number): string => {
    const padding = len - visibleLength(text);
    return text + ' '.repeat(Math.max(0, padding));
  };
  const line = (content: string): string =>
    cyan('  │') + pad(content, width) + cyan('│');

  console.log();
  console.log(cyan(`  ┌${'─'.repeat(width)}┐`));
  console.log(line(''));
  console.log(line(pc.bold('     Bashio Update Available!')));
  console.log(line(''));
  console.log(line(`   ${pc.dim(current)} → ${pc.green(pc.bold(latest))}`));
  console.log(line(''));
  console.log(line(`   Run: ${pc.cyan('npm i -g bashio@latest')}`));
  console.log(line(''));
  console.log(cyan(`  └${'─'.repeat(width)}┘`));
  console.log();
}

import { AddShortcutCommand } from './commands/AddShortcutCommand.js';
import { AuthCommand } from './commands/AuthCommand.js';
import { ClearHistoryCommand } from './commands/ClearHistoryCommand.js';
import { ConfigCommand } from './commands/ConfigCommand.js';
import { DefaultCommand } from './commands/DefaultCommand.js';
import { EditShortcutsCommand } from './commands/EditShortcutsCommand.js';
import { HistoryCommand } from './commands/HistoryCommand.js';
import { ModelCommand } from './commands/ModelCommand.js';
import { RemoveShortcutCommand } from './commands/RemoveShortcutCommand.js';
import { ShortcutsCommand } from './commands/ShortcutsCommand.js';
import { StatsCommand } from './commands/StatsCommand.js';
import { SuggestShortcutsCommand } from './commands/SuggestShortcutsCommand.js';

// Initialize database on startup
initDatabase();

// Run cleanup if needed (once per day)
if (shouldRunCleanup()) {
  const config = loadConfig();
  const retentionDays = config?.settings?.historyRetentionDays ?? 30;
  const maxEntries = config?.settings?.historyMaxEntries ?? 2000;
  cleanupHistory({ retentionDays, maxEntries });
}

const cli = new Cli({
  binaryLabel: 'Bashio',
  binaryName: 'b',
  binaryVersion: pkg.version,
});

cli.register(DefaultCommand);
cli.register(AuthCommand);
cli.register(ConfigCommand);
cli.register(ModelCommand);
cli.register(ShortcutsCommand);
cli.register(AddShortcutCommand);
cli.register(RemoveShortcutCommand);
cli.register(EditShortcutsCommand);
cli.register(HistoryCommand);
cli.register(StatsCommand);
cli.register(ClearHistoryCommand);
cli.register(SuggestShortcutsCommand);
cli.register(Builtins.HelpCommand);
cli.register(Builtins.VersionCommand);

export { cli };
