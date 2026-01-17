import { input } from '@inquirer/prompts';
import { Command, Option } from 'clipanion';
import pc from 'picocolors';
import { addShortcut, getShortcut } from '../../core/shortcuts.js';
import { logger } from '../../utils/logger.js';

export class AddShortcutCommand extends Command {
  static paths = [['add-shortcut'], ['--add-shortcut']];

  static usage = Command.Usage({
    description: 'Add a new shortcut',
    examples: [
      ['Interactive mode', '$0 --add-shortcut'],
      [
        'One-liner',
        '$0 --add-shortcut killport "lsof -ti:{{port}} | xargs kill -9" port',
      ],
    ],
  });

  // Optional positional args for one-liner mode
  name = Option.String({ required: false });
  template = Option.String({ required: false });
  args = Option.String({ required: false });

  async execute(): Promise<number> {
    let shortcutName: string;
    let shortcutTemplate: string;
    let shortcutArgs: string[];
    let shortcutDescription: string | undefined;

    // One-liner mode: b --add-shortcut "name" "template" "args"
    if (this.name && this.template) {
      shortcutName = this.name;
      shortcutTemplate = this.template;
      shortcutArgs = this.args ? this.args.split(',').map((a) => a.trim()) : [];
    } else {
      // Interactive mode
      console.log(pc.bold('\n  Add New Shortcut\n'));

      shortcutName = await input({
        message: 'Shortcut name:',
        validate: (value) => {
          if (!value.trim()) return 'Name is required';
          if (value.includes(' ')) return 'Name cannot contain spaces';
          return true;
        },
      });

      // Check if shortcut already exists
      if (getShortcut(shortcutName)) {
        logger.warn(
          `Shortcut "${shortcutName}" already exists. It will be overwritten.`,
        );
      }

      shortcutTemplate = await input({
        message: 'Command template (use {{arg}} for placeholders):',
        validate: (value) => {
          if (!value.trim()) return 'Template is required';
          return true;
        },
      });

      const argsInput = await input({
        message: 'Arguments (comma-separated, or leave empty):',
      });

      shortcutArgs = argsInput
        ? argsInput
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean)
        : [];

      shortcutDescription = await input({
        message: 'Description (optional):',
      });
    }

    // Validate that template placeholders match args
    const placeholders = shortcutTemplate.match(/\{\{(\w+)\}\}/g) || [];
    const placeholderNames = placeholders.map((p) => p.replace(/[{}]/g, ''));

    for (const ph of placeholderNames) {
      if (!shortcutArgs.includes(ph)) {
        logger.warn(
          `Placeholder "{{${ph}}}" found but not in arguments list. Adding it.`,
        );
        shortcutArgs.push(ph);
      }
    }

    addShortcut(shortcutName, {
      template: shortcutTemplate,
      args: shortcutArgs,
      description: shortcutDescription || undefined,
    });

    console.log();
    logger.success(`Shortcut "${shortcutName}" added!`);

    if (shortcutArgs.length > 0) {
      console.log(
        pc.gray(
          `  Usage: b ${shortcutName} ${shortcutArgs.map((a) => `<${a}>`).join(' ')}`,
        ),
      );
    } else {
      console.log(pc.gray(`  Usage: b ${shortcutName}`));
    }
    console.log();

    return 0;
  }
}
