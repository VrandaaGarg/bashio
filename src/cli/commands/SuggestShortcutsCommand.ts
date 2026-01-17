import { confirm, input } from '@inquirer/prompts';
import { Command, Option } from 'clipanion';
import pc from 'picocolors';
import {
  getShortcutSuggestions,
  markPatternAsSuggested,
} from '../../core/learning.js';
import { addShortcut, getShortcut } from '../../core/shortcuts.js';
import type { ShortcutDefinition } from '../../core/types.js';
import { logger } from '../../utils/logger.js';

type SuggestionAction = 'yes' | 'no' | 'exit';

export class SuggestShortcutsCommand extends Command {
  static paths = [['--suggest-shortcuts']];

  static usage = Command.Usage({
    description: 'Suggest shortcuts based on frequently used commands',
    examples: [
      ['Get suggestions', '$0 --suggest-shortcuts'],
      ['Set minimum use count', '$0 --suggest-shortcuts --threshold 5'],
    ],
  });

  threshold = Option.String('--threshold,-t', '3', {
    description: 'Minimum use count to suggest (default: 3)',
  });

  async execute(): Promise<number> {
    const thresholdNum = Number.parseInt(this.threshold, 10) || 3;
    const suggestions = getShortcutSuggestions(thresholdNum);

    console.log(pc.bold('\n  Shortcut Suggestions\n'));

    if (suggestions.length === 0) {
      console.log(
        pc.gray(
          '  No suggestions yet. Use Bashio more to get personalized suggestions.',
        ),
      );
      console.log(
        pc.dim(`  (Commands need to be used ${thresholdNum}+ times)\n`),
      );
      return 0;
    }

    console.log(
      pc.dim(
        `  Found ${suggestions.length} frequently used commands that could be shortcuts:\n`,
      ),
    );

    for (const suggestion of suggestions) {
      console.log(pc.dim('  ────────────────────────────────────────'));
      console.log(`  ${pc.yellow('Command:')} ${pc.cyan(suggestion.command)}`);
      console.log(
        `  ${pc.yellow('Used:')} ${pc.white(suggestion.useCount.toString())} times`,
      );
      console.log();

      const action = await this.promptCreateShortcut();

      if (action === 'exit') {
        console.log(pc.dim('\n  Exiting suggestions.\n'));
        return 0;
      }

      if (action === 'yes') {
        // Step 1: Get unique shortcut name from user (with validation loop)
        const finalName = await this.getUniqueShortcutName(
          suggestion.suggestedName,
        );

        if (!finalName) {
          // User cancelled
          markPatternAsSuggested(suggestion.command);
          console.log();
          continue;
        }

        // Step 2: Check if command has numbers/parameters
        const hasNumbers = /\d+/.test(suggestion.command);
        let template = suggestion.command;
        const args: string[] = [];

        if (hasNumbers) {
          const parameterize = await confirm({
            message: 'Make numbers into parameters?',
            default: true,
          });

          if (parameterize) {
            const numbers = suggestion.command.match(/\d+/g) || [];
            const uniqueNumbers = [...new Set(numbers)];

            for (let i = 0; i < uniqueNumbers.length; i++) {
              const argName = `arg${i + 1}`;
              args.push(argName);
              template = template.replace(
                new RegExp(uniqueNumbers[i], 'g'),
                `{{${argName}}}`,
              );
            }
          }
        }

        // Step 3: Create the shortcut
        addShortcut(finalName, {
          template,
          args,
          description: `Auto-suggested shortcut for: ${suggestion.command}`,
        });

        markPatternAsSuggested(suggestion.command);

        logger.success(`✓ Created shortcut: ${finalName}`);
        console.log(
          pc.dim(
            `  Usage: b ${finalName}${args.length > 0 ? ` ${args.map((a) => `<${a}>`).join(' ')}` : ''}`,
          ),
        );
        console.log();
      } else {
        // action === 'no'
        markPatternAsSuggested(suggestion.command);
        console.log();
      }
    }

    console.log(pc.dim('  ────────────────────────────────────────\n'));

    return 0;
  }

  private async promptCreateShortcut(): Promise<SuggestionAction> {
    const answer = await input({
      message: 'Create shortcut? (y/n/e)',
      default: 'y',
    });

    const normalized = answer.toLowerCase().trim();

    if (['y', 'yes', ''].includes(normalized)) {
      return 'yes';
    }
    if (['e', 'exit'].includes(normalized)) {
      return 'exit';
    }
    return 'no';
  }

  private async getUniqueShortcutName(
    defaultName: string,
  ): Promise<string | null> {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const enteredName = await input({
        message: 'Shortcut name:',
        default: defaultName,
      });

      const finalName = enteredName.trim();

      if (!finalName) {
        logger.error('Shortcut name cannot be empty.');
        attempts++;
        continue;
      }

      // Check if shortcut already exists
      const existingShortcut = getShortcut(finalName);

      if (existingShortcut) {
        // Show table with existing shortcut details
        this.showExistingShortcutTable(finalName, existingShortcut);
        attempts++;
        continue;
      }

      // Name is valid and unique
      return finalName;
    }

    // Max attempts reached
    logger.error('Too many invalid attempts. Skipping this suggestion.');
    return null;
  }

  private showExistingShortcutTable(
    name: string,
    shortcut: ShortcutDefinition,
  ): void {
    const boxWidth = 50;
    const line = '─'.repeat(boxWidth);

    console.log();
    console.log(pc.red(`  ┌${line}┐`));
    console.log(
      pc.red('  │') +
        pc.bold(pc.red(' ❌ Shortcut Already Exists')) +
        ' '.repeat(boxWidth - 27) +
        pc.red('│'),
    );
    console.log(pc.red(`  ├${line}┤`));

    // Name row
    const nameLabel = '  Name:     ';
    const nameValue = name;
    const namePadding = boxWidth - nameLabel.length - nameValue.length + 2;
    console.log(
      pc.red('  │') +
        pc.gray(nameLabel) +
        pc.white(nameValue) +
        ' '.repeat(Math.max(0, namePadding)) +
        pc.red('│'),
    );

    // Command row (may wrap if too long)
    const cmdLabel = '  Command:  ';
    const cmdValue =
      shortcut.template.length > 35
        ? `${shortcut.template.slice(0, 32)}...`
        : shortcut.template;
    const cmdPadding = boxWidth - cmdLabel.length - cmdValue.length + 2;
    console.log(
      pc.red('  │') +
        pc.gray(cmdLabel) +
        pc.cyan(cmdValue) +
        ' '.repeat(Math.max(0, cmdPadding)) +
        pc.red('│'),
    );

    // Args row (if any)
    if (shortcut.args && shortcut.args.length > 0) {
      const argsLabel = '  Args:     ';
      const argsValue = shortcut.args.join(', ');
      const argsPadding = boxWidth - argsLabel.length - argsValue.length + 2;
      console.log(
        pc.red('  │') +
          pc.gray(argsLabel) +
          pc.yellow(argsValue) +
          ' '.repeat(Math.max(0, argsPadding)) +
          pc.red('│'),
      );
    }

    console.log(pc.red(`  └${line}┘`));
    console.log();
    console.log(pc.yellow('  Please enter a different name:\n'));
  }
}
