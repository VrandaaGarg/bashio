import { Command } from 'clipanion';
import pc from 'picocolors';
import { PACKAGE_VERSION } from '../../core/constants.js';
import { accent, renderTable } from '../../utils/table.js';

export class HelpCommand extends Command {
  static paths = [['help'], ['--help'], ['-h']];

  static usage = Command.Usage({
    description: 'Show help information',
  });

  async execute(): Promise<number> {
    console.log();
    console.log(pc.bold(`  Bashio v${PACKAGE_VERSION}`));
    console.log(pc.dim('  Natural language to shell commands\n'));

    renderTable({
      title: 'Commands',
      columns: [
        { header: 'Command', key: 'command', width: 24, color: accent },
        { header: 'Description', key: 'description', width: 42 },
      ],
      data: [
        // Core
        {
          command: 'b <query>',
          description: 'Convert natural language to shell commands',
        },
        {
          command: 'b --chat',
          description: 'Start interactive AI chat session',
        },

        // Configuration
        { command: 'b --auth', description: 'Configure AI provider' },
        { command: 'b --config', description: 'View current configuration' },
        { command: 'b --model', description: 'Change AI provider/model' },
        { command: 'b --theme', description: 'Change color theme' },

        // Shortcuts
        { command: 'b --shortcuts', description: 'List all shortcuts' },
        { command: 'b --add-shortcut', description: 'Add a new shortcut' },
        { command: 'b --remove-shortcut', description: 'Remove a shortcut' },
        {
          command: 'b --edit-shortcuts',
          description: 'Edit shortcuts in editor',
        },

        // History & Stats
        { command: 'b --history', description: 'View command history' },
        { command: 'b --stats', description: 'View usage statistics' },
        { command: 'b --clear-history', description: 'Clear command history' },
        {
          command: 'b --suggest-shortcuts',
          description: 'Suggest shortcuts from history',
        },

        // Help
        { command: 'b --help', description: 'Show this help message' },
        { command: 'b --version', description: 'Show version number' },
      ],
    });

    console.log();
    console.log(pc.dim('  Examples:'));
    console.log(pc.gray('    b find all files larger than 100mb'));
    console.log(pc.gray('    b kill whatever is running on port 3000'));
    console.log(pc.gray('    b --chat') + pc.dim('  (interactive mode)'));
    console.log();

    return 0;
  }
}
