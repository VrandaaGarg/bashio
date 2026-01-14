import { confirm } from '@inquirer/prompts';
import { Command, Option } from 'clipanion';
import pc from 'picocolors';
import {
  clearAllHistory,
  clearHistoryOlderThan,
  getHistoryCount,
} from '../../core/history.js';
import { renderDangerBanner } from '../../utils/danger-ui.js';
import { logger } from '../../utils/logger.js';

export class ClearHistoryCommand extends Command {
  static paths = [['--clear-history']];

  static usage = Command.Usage({
    description: 'Clear command history',
    examples: [
      ['Clear all history', '$0 --clear-history --all'],
      ['Clear entries older than 7 days', '$0 --clear-history --older-than 7'],
    ],
  });

  all = Option.Boolean('--all,-a', false, {
    description: 'Clear all history entries',
  });

  olderThan = Option.String('--older-than,-o', {
    description: 'Clear entries older than N days',
  });

  async execute(): Promise<number> {
    if (!this.all && !this.olderThan) {
      console.log(pc.bold('\n  Clear History\n'));
      console.log(pc.gray('  Options:'));
      console.log(pc.gray('    --all           Clear all history'));
      console.log(
        pc.gray('    --older-than N  Clear entries older than N days'),
      );
      console.log();
      console.log(pc.dim('  Example: s --clear-history --older-than 30\n'));
      return 1;
    }

    const currentCount = getHistoryCount();

    if (currentCount === 0) {
      logger.info('History is already empty.');
      return 0;
    }

    if (this.all) {
      console.log();
      for (const line of renderDangerBanner(
        `This will permanently delete ${currentCount} history entries.`,
      )) {
        console.log(line);
      }
      console.log();

      const confirmed = await confirm({
        message: 'Proceed with clearing all history?',
        default: false,
      });

      if (!confirmed) {
        logger.info('Cancelled.');
        return 0;
      }

      const deleted = clearAllHistory();
      logger.success(`Cleared ${deleted} history entries.`);
      return 0;
    }

    if (this.olderThan) {
      const days = Number.parseInt(this.olderThan, 10);

      if (Number.isNaN(days) || days < 1) {
        logger.error('Invalid number of days.');
        return 1;
      }

      console.log();
      for (const line of renderDangerBanner(
        `This will permanently delete entries older than ${days} days.`,
      )) {
        console.log(line);
      }
      console.log();

      const confirmed = await confirm({
        message: `Proceed with clearing entries older than ${days} days?`,
        default: false,
      });

      if (!confirmed) {
        logger.info('Cancelled.');
        return 0;
      }

      const deleted = clearHistoryOlderThan(days);

      if (deleted === 0) {
        logger.info(`No entries older than ${days} days.`);
      } else {
        logger.success(`Cleared ${deleted} entries older than ${days} days.`);
      }

      return 0;
    }

    return 0;
  }
}
