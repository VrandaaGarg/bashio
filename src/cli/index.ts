import { Builtins, Cli } from 'clipanion';
import { loadConfig } from '../core/config.js';
import { initDatabase } from '../core/database.js';
import { cleanupHistory, shouldRunCleanup } from '../core/history.js';
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
  binaryVersion: '0.4.0',
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
