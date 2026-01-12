import { input } from '@inquirer/prompts';
import { Command, Option } from 'clipanion';
import pc from 'picocolors';
import { configExists, loadConfig } from '../../core/config.js';
import { executeCommand } from '../../core/executor.js';
import { tryResolveShortcut } from '../../core/shortcuts.js';
import { createProvider } from '../../providers/index.js';
import { logger } from '../../utils/logger.js';
import { createSpinner } from '../../utils/spinner.js';

type ConfirmAction = 'yes' | 'no' | 'explain';
type CommandSource = 'shortcut' | 'ai';

export class DefaultCommand extends Command {
  static paths = [Command.Default];

  static usage = Command.Usage({
    description: 'Convert natural language to shell commands',
    examples: [
      ['Find large files', '$0 find files larger than 100mb'],
      ['Kill a port', '$0 kill whatever is running on port 3000'],
      ['Use a shortcut', '$0 killport 3000'],
    ],
  });

  query = Option.Rest({ required: 0 });

  async execute(): Promise<number> {
    if (this.query.length === 0) {
      this.showHelp();
      return 0;
    }

    // Step 1: Check if it's a shortcut
    const shortcut = await tryResolveShortcut(this.query);

    if (shortcut) {
      return this.executeWithConfirmation(
        shortcut.command,
        'shortcut',
        shortcut.name,
      );
    }

    // Step 2: Not a shortcut, use AI provider
    if (!configExists()) {
      logger.warn('Shell Agent is not configured yet.');
      console.log(pc.gray("Run 's --auth' to set up your AI provider.\n"));
      return 1;
    }

    const config = loadConfig();
    if (!config) {
      logger.error('Failed to load configuration.');
      console.log(pc.gray("Run 's --auth' to reconfigure.\n"));
      return 1;
    }

    const queryText = this.query.join(' ').trim();
    const provider = createProvider(config);
    const spinner = createSpinner('Generating command...').start();

    let generatedCommand: string;

    try {
      generatedCommand = await provider.generateCommand(queryText);
      spinner.stop();
    } catch (err) {
      spinner.fail('Failed to generate command');
      logger.error(err instanceof Error ? err.message : 'Unknown error');
      return 1;
    }

    generatedCommand = this.cleanCommand(generatedCommand);

    return this.executeWithConfirmation(generatedCommand, 'ai');
  }

  private showHelp(): void {
    console.log(
      pc.bold('\n  Shell Agent - Natural language to shell commands\n'),
    );
    console.log('  Usage:');
    console.log(pc.cyan('    s <natural language query>'));
    console.log(pc.cyan('    s <shortcut> [arguments]'));
    console.log();
    console.log('  Examples:');
    console.log(pc.gray('    s find all files larger than 100mb'));
    console.log(pc.gray('    s kill whatever is running on port 3000'));
    console.log(pc.gray('    s killport 3000') + pc.cyan('  (shortcut)'));
    console.log();
    console.log('  Commands:');
    console.log(pc.gray('    s --auth            Configure AI provider'));
    console.log(pc.gray('    s --config          View current configuration'));
    console.log(pc.gray('    s --shortcuts       List all shortcuts'));
    console.log(pc.gray('    s --add-shortcut    Add a new shortcut'));
    console.log(pc.gray('    s --remove-shortcut Remove a shortcut'));
    console.log(pc.gray('    s --help            Show help'));
    console.log();
  }

  private async executeWithConfirmation(
    command: string,
    source: CommandSource,
    shortcutName?: string,
  ): Promise<number> {
    console.log();

    if (source === 'shortcut' && shortcutName) {
      console.log(pc.gray(`  [shortcut: ${shortcutName}]`));
    }

    logger.command(command);
    console.log();

    let action = await this.promptConfirmation();

    // Handle explain mode - only for AI-generated commands
    while (action === 'explain') {
      if (source === 'shortcut') {
        console.log(
          pc.gray('\n  This command comes from a shortcut, not AI.\n'),
        );
      } else {
        const config = loadConfig();
        if (config) {
          const provider = createProvider(config);
          const explainSpinner = createSpinner(
            'Getting explanation...',
          ).start();
          try {
            const explanation = await provider.explainCommand(command);
            explainSpinner.stop();
            console.log();
            console.log(pc.bold('  Explanation:'));
            console.log(pc.gray(`  ${explanation.split('\n').join('\n  ')}`));
            console.log();
          } catch {
            explainSpinner.fail('Failed to get explanation');
          }
        }
      }
      action = await this.promptConfirmation();
    }

    if (action === 'no') {
      logger.info('Cancelled.');
      return 0;
    }

    console.log(pc.gray('\n  Executing...\n'));
    console.log(pc.gray('─'.repeat(50)));

    const result = await executeCommand(command);

    console.log(pc.gray('─'.repeat(50)));
    logger.exitCode(result.exitCode);
    console.log();

    return result.exitCode;
  }

  private cleanCommand(command: string): string {
    let cleaned = command.trim();

    if (cleaned.startsWith('```')) {
      const lines = cleaned.split('\n');
      const startIdx = lines[0].startsWith('```') ? 1 : 0;
      const endIdx =
        lines[lines.length - 1] === '```' ? lines.length - 1 : lines.length;
      cleaned = lines.slice(startIdx, endIdx).join('\n');
    }

    cleaned = cleaned.replace(/^`|`$/g, '');

    return cleaned.trim();
  }

  private async promptConfirmation(): Promise<ConfirmAction> {
    const answer = await input({
      message: 'Execute? (y/n/e for explain)',
      default: 'y',
    });

    const normalized = answer.toLowerCase().trim();

    if (['y', 'yes', ''].includes(normalized)) {
      return 'yes';
    }
    if (['e', 'explain'].includes(normalized)) {
      return 'explain';
    }
    return 'no';
  }
}
