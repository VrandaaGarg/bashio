import { Command } from 'clipanion';
import pc from 'picocolors';
import { PROVIDER_DISPLAY_NAMES } from '../../core/auth.js';
import { configExists, getConfigPath, loadConfig } from '../../core/config.js';
import type { ProviderName } from '../../core/types.js';
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

    const activeSettings = config.providers[config.activeProvider];
    const configuredProviders = Object.keys(config.providers) as ProviderName[];

    console.log(pc.bold('\n  Bashio Configuration\n'));
    console.log(
      `  Active Provider: ${pc.cyan(PROVIDER_DISPLAY_NAMES[config.activeProvider])}`,
    );
    console.log(
      `  Model:           ${pc.cyan(activeSettings?.model || 'N/A')}`,
    );

    // Show all configured providers
    if (configuredProviders.length > 1) {
      console.log();
      console.log(pc.bold('  Configured Providers'));
      for (const p of configuredProviders) {
        const settings = config.providers[p];
        const isActive = p === config.activeProvider;
        const marker = isActive ? pc.green('●') : pc.dim('○');
        console.log(
          `  ${marker} ${PROVIDER_DISPLAY_NAMES[p]} - ${pc.dim(settings?.model || 'N/A')}`,
        );
      }
    }

    // Settings section
    const settings = config.settings;
    console.log();
    console.log(pc.bold('  Settings'));
    console.log(
      `  History:                ${settings?.historyEnabled !== false ? pc.green('enabled') : pc.gray('disabled')}`,
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
