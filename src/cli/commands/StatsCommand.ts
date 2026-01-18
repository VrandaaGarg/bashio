import { Command } from 'clipanion';
import pc from 'picocolors';
import { getStats } from '../../core/history.js';
import { orange } from '../../utils/colors.js';
import { renderTable } from '../../utils/table.js';

export class StatsCommand extends Command {
  static paths = [['--stats']];

  static usage = Command.Usage({
    description: 'View usage statistics',
    examples: [['View stats', '$0 --stats']],
  });

  async execute(): Promise<number> {
    const stats = getStats();

    console.log(pc.bold('\n  Bashio Usage Statistics\n'));

    // Overview stats table
    renderTable({
      title: 'Overview',
      columns: [
        { header: 'Metric', key: 'metric', width: 20 },
        { header: 'Value', key: 'value', width: 15, align: 'right' },
      ],
      data: [
        { metric: 'Commands Generated', value: stats.totalCommands.toString() },
        {
          metric: 'Executed',
          value: `${stats.totalExecuted} (${stats.executionRate}%)`,
        },
        { metric: 'Today', value: stats.todayCommands.toString() },
        { metric: 'This Week', value: stats.thisWeekCommands.toString() },
      ],
    });

    console.log();

    // Source breakdown table
    const total = stats.aiCount + stats.shortcutCount;
    const aiPercent = total > 0 ? Math.round((stats.aiCount / total) * 100) : 0;
    const shortcutPercent =
      total > 0 ? Math.round((stats.shortcutCount / total) * 100) : 0;

    renderTable({
      title: 'Source Breakdown',
      columns: [
        { header: 'Source', key: 'source', width: 15 },
        { header: 'Count', key: 'count', width: 10, align: 'right' },
        { header: 'Percentage', key: 'percent', width: 12, align: 'right' },
      ],
      data: [
        {
          source: 'AI Generated',
          count: stats.aiCount.toString(),
          percent: `${aiPercent}%`,
        },
        {
          source: 'Shortcuts',
          count: stats.shortcutCount.toString(),
          percent: `${shortcutPercent}%`,
        },
      ],
    });

    // Top queries table (if any)
    if (stats.topQueries.length > 0) {
      console.log();

      renderTable({
        title: 'Most Used Commands',
        columns: [
          { header: '#', key: 'rank', width: 3, align: 'right' },
          { header: 'Command', key: 'command', width: 45, color: orange },
          { header: 'Uses', key: 'uses', width: 8, align: 'right' },
          {
            header: 'Source',
            key: 'source',
            width: 10,
            color: (v) => pc.yellow(v),
          },
        ],
        data: stats.topQueries.map((q, i) => ({
          rank: (i + 1).toString(),
          command: q.query.length > 42 ? `${q.query.slice(0, 39)}...` : q.query,
          uses: q.useCount.toString(),
          source: q.source,
        })),
      });
    }

    console.log();

    return 0;
  }
}
