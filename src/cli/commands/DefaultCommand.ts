import * as readline from 'node:readline';
import { confirm, input } from '@inquirer/prompts';
import { Command, Option } from 'clipanion';
import pc from 'picocolors';
import { runAuthSetup } from '../../core/auth.js';
import { configExists, loadConfig } from '../../core/config.js';
import { executeCommand } from '../../core/executor.js';
import { markExecuted, recordCommand } from '../../core/history.js';
import { tryResolveShortcut } from '../../core/shortcuts.js';
import { createProvider } from '../../providers/index.js';
import { copyToClipboard } from '../../utils/clipboard.js';
import { accent } from '../../utils/colors.js';
import { detectDangerousShellCommand } from '../../utils/danger.js';
import { renderDangerBanner } from '../../utils/danger-ui.js';
import { getBashioTheme } from '../../utils/inquirerTheme.js';
import { logger } from '../../utils/logger.js';
import { createSpinner } from '../../utils/spinner.js';

type ConfirmAction = 'yes' | 'no' | 'explain' | 'copy' | 'edit';
type CommandSource = 'shortcut' | 'ai';

interface ExecutionContext {
  queryText: string;
  historyId: number | null;
  historyEnabled: boolean;
  shortcutName?: string;
}

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

    // Load config for history settings
    const config = loadConfig();
    const historyEnabled = config?.settings?.historyEnabled !== false;

    // Step 1: Check if it's a shortcut
    const shortcut = await tryResolveShortcut(this.query);

    if (shortcut) {
      let historyId: number | null = null;

      if (historyEnabled) {
        historyId = recordCommand({
          query: this.query.join(' '),
          command: shortcut.command,
          source: 'shortcut',
        });
      }

      const context: ExecutionContext = {
        queryText: this.query.join(' '),
        historyId,
        historyEnabled,
        shortcutName: shortcut.name,
      };

      // Check if auto-confirm shortcuts is enabled
      if (config?.settings?.autoConfirmShortcuts) {
        return this.executeShortcutAutoConfirm(shortcut.command, context);
      }

      return this.executeWithConfirmation(
        shortcut.command,
        'shortcut',
        context,
      );
    }

    // Step 2: Not a shortcut, use AI provider
    let currentConfig = config;
    if (!configExists() || !currentConfig) {
      const success = await runAuthSetup();
      if (!success) {
        return 1;
      }
      console.log(accent('Setup complete! Running your command...\n'));
      currentConfig = loadConfig();
      if (!currentConfig) {
        logger.error('Failed to load configuration after setup.');
        return 1;
      }
    }

    const queryText = this.query.join(' ').trim();
    const provider = createProvider(currentConfig);
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

    // Record history for AI command
    let historyId: number | null = null;
    if (historyEnabled) {
      historyId = recordCommand({
        query: queryText,
        command: generatedCommand,
        source: 'ai',
      });
    }

    return this.executeWithConfirmation(generatedCommand, 'ai', {
      queryText,
      historyId,
      historyEnabled,
    });
  }

  private showHelp(): void {
    console.log(pc.bold('\n  Bashio - Natural language to shell commands\n'));
    console.log('  Usage:');
    console.log(pc.yellow('    b <natural language query>'));
    console.log(pc.yellow('    b <shortcut> [arguments]'));
    console.log();
    console.log('  Examples:');
    console.log(pc.gray('    b find all files larger than 100mb'));
    console.log(pc.gray('    b kill whatever is running on port 3000'));
    console.log(pc.gray('    b killport 3000') + pc.yellow('  (shortcut)'));
    console.log();
    console.log('  Commands:');
    console.log(pc.gray('    b --chat              Start interactive chat'));
    console.log(pc.gray('    b --auth              Configure AI provider'));
    console.log(
      pc.gray('    b --config            View current configuration'),
    );
    console.log(pc.gray('    b --model             Change AI model'));
    console.log(pc.gray('    b --theme             Change color theme'));
    console.log(pc.gray('    b --shortcuts         List all shortcuts'));
    console.log(pc.gray('    b --add-shortcut      Add a new shortcut'));
    console.log(pc.gray('    b --remove-shortcut   Remove a shortcut'));
    console.log(pc.gray('    b --edit-shortcuts    Edit shortcuts in editor'));
    console.log();
    console.log('  History & Stats:');
    console.log(pc.gray('    b --history           View command history'));
    console.log(pc.gray('    b --stats             View usage statistics'));
    console.log(pc.gray('    b --clear-history     Clear command history'));
    console.log(pc.gray('    b --suggest-shortcuts Suggest new shortcuts'));
    console.log();
    console.log(pc.gray('    b --help              Show help'));
    console.log();
  }

  private async executeWithConfirmation(
    command: string,
    source: CommandSource,
    context: ExecutionContext,
  ): Promise<number> {
    let currentCommand = command;

    console.log();

    if (source === 'shortcut' && context.shortcutName) {
      console.log(pc.gray(`  [shortcut: ${context.shortcutName}]`));
    }

    logger.command(currentCommand);
    console.log();

    let action = await this.promptConfirmation();

    while (action !== 'yes' && action !== 'no' && action !== 'copy') {
      if (action === 'explain') {
        if (source === 'shortcut') {
          console.log(
            pc.gray('\n  This command comes from a shortcut, not AI.\n'),
          );
        } else {
          const explainConfig = loadConfig();
          if (explainConfig) {
            const provider = createProvider(explainConfig);
            const explainSpinner = createSpinner(
              'Getting explanation...',
            ).start();
            try {
              const explanation = await provider.explainCommand(currentCommand);
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
      } else if (action === 'edit') {
        try {
          const edited = await this.editCommandInline(currentCommand);
          currentCommand = edited.trim();
          console.log();
          logger.command(currentCommand);
          console.log();
        } catch {
          logger.error('Edit cancelled');
        }
      }

      action = await this.promptConfirmation();
    }

    // Handle copy - just copy and exit
    if (action === 'copy') {
      const success = await copyToClipboard(currentCommand);
      if (success) {
        logger.success('Copied to clipboard!');
      } else {
        logger.error('Failed to copy to clipboard');
      }
      console.log();
      return 0;
    }

    if (action === 'no') {
      logger.info('Cancelled.');
      return 0;
    }

    const danger = detectDangerousShellCommand(currentCommand);
    if (danger) {
      const confirmed = await this.promptDangerConfirmation(
        currentCommand,
        danger.reasons,
      );
      if (!confirmed) {
        logger.info('Cancelled.');
        return 0;
      }
    }

    console.log();

    const result = await executeCommand(currentCommand);

    // Only show exit code if command failed
    if (result.exitCode !== 0) {
      console.log();
      logger.exitCode(result.exitCode);
    }
    console.log();

    // Update history with execution result
    if (context.historyEnabled && context.historyId !== null) {
      markExecuted(context.historyId, result.exitCode);
    }

    return result.exitCode;
  }

  private async executeShortcutAutoConfirm(
    command: string,
    context: ExecutionContext,
  ): Promise<number> {
    // Still check for dangerous commands even with auto-confirm
    const danger = detectDangerousShellCommand(command);
    if (danger) {
      console.log();
      if (context.shortcutName) {
        console.log(pc.gray(`  [shortcut: ${context.shortcutName}]`));
      }
      logger.command(command);
      console.log();

      const confirmed = await this.promptDangerConfirmation(
        command,
        danger.reasons,
      );
      if (!confirmed) {
        logger.info('Cancelled.');
        return 0;
      }
    }

    console.log();

    const result = await executeCommand(command);

    // Only show exit code if command failed
    if (result.exitCode !== 0) {
      console.log();
      logger.exitCode(result.exitCode);
    }
    console.log();

    // Update history with execution result
    if (context.historyEnabled && context.historyId !== null) {
      markExecuted(context.historyId, result.exitCode);
    }

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
      message: 'Execute? (y/n/e/c/edit)',
      default: 'y',
      theme: getBashioTheme(),
    });

    const normalized = answer.toLowerCase().trim();

    if (['y', 'yes', ''].includes(normalized)) {
      return 'yes';
    }
    if (['e', 'explain'].includes(normalized)) {
      return 'explain';
    }
    if (['c', 'copy'].includes(normalized)) {
      return 'copy';
    }
    if (['edit'].includes(normalized)) {
      return 'edit';
    }
    return 'no';
  }

  private async promptDangerConfirmation(
    command: string,
    reasons: string[],
  ): Promise<boolean> {
    for (const line of renderDangerBanner(
      'This command may cause irreversible changes.',
    )) {
      console.log(line);
    }
    console.log();
    console.log(pc.yellow('  Reasons:'));
    for (const reason of reasons) {
      console.log(pc.yellow(`  - ${reason}`));
    }
    console.log();
    console.log(pc.gray('  Command:'));
    console.log(pc.yellow(`  ${command}`));
    console.log();

    return confirm({
      message: 'Proceed with this command?',
      default: false,
    });
  }

  private editCommandInline(currentCommand: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      // Show the prompt
      process.stdout.write(`${accent('?')} ${pc.bold('Edit command:')} `);

      // Pre-fill the input with current command
      rl.write(currentCommand);

      rl.on('line', (answer) => {
        rl.close();
        resolve(answer || currentCommand);
      });

      rl.on('close', () => {
        resolve(currentCommand);
      });

      rl.on('SIGINT', () => {
        rl.close();
        reject(new Error('Edit cancelled'));
      });
    });
  }
}
