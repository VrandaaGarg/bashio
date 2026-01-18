import { Command } from 'clipanion';
import pc from 'picocolors';
import { listShortcuts } from '../../core/shortcuts.js';
import { renderTable } from '../../utils/table.js';

export class ShortcutsCommand extends Command {
  static paths = [['shortcuts'], ['--shortcuts']];

  static usage = Command.Usage({
    description: 'List all configured shortcuts',
    examples: [['List shortcuts', '$0 --shortcuts']],
  });

  async execute(): Promise<number> {
    const shortcuts = listShortcuts();
    const names = Object.keys(shortcuts);

    if (names.length === 0) {
      console.log(pc.yellow('\n  No shortcuts configured yet.\n'));
      console.log(pc.gray('  Add one with: b --add-shortcut\n'));
      return 0;
    }

    const data = names.map((name) => {
      const shortcut = shortcuts[name];
      return {
        name,
        template: shortcut.template,
        args: shortcut.args?.length ? shortcut.args.join(', ') : '-',
      };
    });

    renderTable({
      title: 'Your Shortcuts',
      columns: [
        { header: 'Name', key: 'name', width: 15, color: pc.yellow },
        {
          header: 'Command Template',
          key: 'template',
          width: 45,
          color: pc.white,
        },
        { header: 'Arguments', key: 'args', width: 15, color: pc.gray },
      ],
      data,
    });

    console.log(
      pc.dim(
        `\n  Total: ${names.length} shortcut${names.length === 1 ? '' : 's'}\n`,
      ),
    );

    return 0;
  }
}
