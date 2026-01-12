import { Command } from 'clipanion';
import pc from 'picocolors';
import { listShortcuts } from '../../core/shortcuts.js';

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
      console.log(pc.gray('  Add one with: s --add-shortcut\n'));
      return 0;
    }

    console.log(pc.bold('\n  YOUR SHORTCUTS\n'));

    // Calculate column widths
    const maxNameLen = Math.max(8, ...names.map((n) => n.length));
    const maxTemplateLen = Math.max(
      16,
      ...names.map((n) => shortcuts[n].template.length),
    );
    const maxArgsLen = Math.max(
      9,
      ...names.map((n) => (shortcuts[n].args?.join(', ') || '-').length),
    );

    // Header
    const header = `  ${pc.bold('Name'.padEnd(maxNameLen))}  ${pc.bold('Command Template'.padEnd(maxTemplateLen))}  ${pc.bold('Arguments')}`;
    console.log(header);
    console.log(
      pc.gray(
        `  ${'─'.repeat(maxNameLen)}  ${'─'.repeat(maxTemplateLen)}  ${'─'.repeat(maxArgsLen)}`,
      ),
    );

    // Rows
    for (const name of names) {
      const shortcut = shortcuts[name];
      const argsStr = shortcut.args?.length ? shortcut.args.join(', ') : '-';
      const templateDisplay =
        shortcut.template.length > 50
          ? `${shortcut.template.slice(0, 47)}...`
          : shortcut.template;

      console.log(
        `  ${pc.cyan(name.padEnd(maxNameLen))}  ${pc.white(templateDisplay.padEnd(maxTemplateLen))}  ${pc.gray(argsStr)}`,
      );
    }

    console.log();
    console.log(
      pc.gray(
        `  Total: ${names.length} shortcut${names.length === 1 ? '' : 's'}`,
      ),
    );
    console.log();

    return 0;
  }
}
