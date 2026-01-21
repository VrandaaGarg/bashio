import { Command, Option } from 'clipanion';
import pc from 'picocolors';
import { getRecentHistory, searchHistory } from '../../core/history.js';
import type { HistoryEntry } from '../../core/types.js';
import { accent, renderTable } from '../../utils/table.js';

export class HistoryCommand extends Command {
  static paths = [['--history']];

  static usage = Command.Usage({
    description: 'View command history',
    examples: [
      ['View recent history', '$0 --history'],
      ['Limit results', '$0 --history --limit 10'],
      ['Search history', '$0 --history --search git'],
    ],
  });

  limit = Option.String('--limit,-l', '20', {
    description: 'Number of entries to show',
  });

  search = Option.String('--search,-s', {
    description: 'Search term to filter history',
  });

  async execute(): Promise<number> {
    const limitNum = Number.parseInt(this.limit, 10) || 20;

    let entries: HistoryEntry[];
    let title: string;

    if (this.search) {
      entries = searchHistory(this.search, limitNum);
      title = `Command History (search: "${this.search}")`;
    } else {
      entries = getRecentHistory(limitNum);
      title = 'Recent Command History';
    }

    if (entries.length === 0) {
      console.log(pc.bold(`\n  ${title}\n`));
      console.log(pc.gray('  No history entries found.\n'));
      return 0;
    }

    // Prepare data for table
    const data = entries.map((entry, index) => ({
      num: (index + 1).toString(),
      command: entry.command,
      query: entry.source === 'ai' ? entry.query : '-',
      source: entry.source,
      status: this.getStatusDisplay(entry),
      time: this.getTimeAgo(entry.createdAt),
    }));

    // Render table
    renderTable({
      title,
      columns: [
        { header: '#', key: 'num', width: 3, align: 'right' },
        { header: 'Command', key: 'command', width: 35, color: accent },
        { header: 'Query', key: 'query', width: 25, color: pc.gray },
        {
          header: 'Source',
          key: 'source',
          width: 8,
          color: (v) => pc.yellow(v),
        },
        { header: 'Status', key: 'status', width: 10 },
        { header: 'Time', key: 'time', width: 10 },
      ],
      data,
    });

    console.log(pc.dim(`\n  Showing ${entries.length} entries\n`));

    return 0;
  }

  private getStatusDisplay(entry: HistoryEntry): string {
    if (entry.executed === 0) {
      return `${pc.gray('○')} skipped`;
    }
    if (entry.exitCode === 0) {
      return `${accent('✓')} success`;
    }
    return `${pc.red('✗')} exit:${entry.exitCode}`;
  }

  private getTimeAgo(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  }
}
