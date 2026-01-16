import { Command } from 'clipanion';
import pc from 'picocolors';
import { configExists, getConfigPath, loadConfig } from '../../core/config.js';
import { logger } from '../../utils/logger.js';

export class ConfigCommand extends Command {
  static paths = [['config'], ['--config']];

  static usage = Command.Usage({
    description: 'View current Bashio configuration',
    examples: [['View config', '$0 --config']],
  });

  async execute(): Promise<number> {
    if (!configExists()) {
      logger.warn('Bashio is not configured yet.');
      console.log(pc.gray("Run 'b --auth' to set up your AI provider.\n"));
      return 1;
    }

    const config = loadConfig();
    if (!config) {
      logger.error('Failed to load configuration.');
      return 1;
    }

    console.log(pc.bold('\n  Bashio Configuration\n'));
    console.log(`  Provider:    ${pc.cyan(config.provider)}`);
    console.log(`  Model:       ${pc.cyan(config.model)}`);
    console.log(`  Auth:        ${pc.green('Configured')}`);

    // Settings section
    const settings = config.settings;
    console.log();
    console.log(pc.bold('  Settings'));
    console.log(
      `  History:              ${settings?.historyEnabled !== false ? pc.green('enabled') : pc.gray('disabled')}`,
    );
    console.log(
      `  Auto-confirm shortcuts: ${settings?.autoConfirmShortcuts ? pc.green('enabled') : pc.gray('disabled')}`,
    );

    console.log();
    console.log(pc.gray(`  Config file: ${getConfigPath()}`));
    console.log();

    return 0;
  }
}
