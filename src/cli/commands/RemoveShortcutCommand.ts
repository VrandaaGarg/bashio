import { confirm } from '@inquirer/prompts';
import { Command, Option } from 'clipanion';
import pc from 'picocolors';
import { getShortcut, removeShortcut } from '../../core/shortcuts.js';
import { renderDangerBanner } from '../../utils/danger-ui.js';
import { bashioTheme } from '../../utils/inquirerTheme.js';
import { logger } from '../../utils/logger.js';

export class RemoveShortcutCommand extends Command {
  static paths = [['remove-shortcut'], ['--remove-shortcut']];

  static usage = Command.Usage({
    description: 'Remove a shortcut',
    examples: [['Remove shortcut', '$0 --remove-shortcut killport']],
  });

  name = Option.String({ required: true });

  async execute(): Promise<number> {
    const shortcut = getShortcut(this.name);

    if (!shortcut) {
      logger.error(`Shortcut "${this.name}" not found.`);
      return 1;
    }

    console.log();
    console.log(pc.gray(`  Template: ${shortcut.template}`));
    if (shortcut.description) {
      console.log(pc.gray(`  Description: ${shortcut.description}`));
    }
    console.log();

    for (const line of renderDangerBanner(
      `This will permanently remove shortcut "${this.name}".`,
    )) {
      console.log(line);
    }
    console.log();

    const confirmed = await confirm({
      message: `Proceed with removing "${this.name}"?`,
      default: false,
      theme: bashioTheme,
    });

    if (!confirmed) {
      logger.info('Cancelled.');
      return 0;
    }

    removeShortcut(this.name);
    logger.success(`Shortcut "${this.name}" removed.`);
    console.log();

    return 0;
  }
}
