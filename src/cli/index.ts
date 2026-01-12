import { Builtins, Cli } from 'clipanion';
import { AddShortcutCommand } from './commands/AddShortcutCommand.js';
import { AuthCommand } from './commands/AuthCommand.js';
import { ConfigCommand } from './commands/ConfigCommand.js';
import { DefaultCommand } from './commands/DefaultCommand.js';
import { EditShortcutsCommand } from './commands/EditShortcutsCommand.js';
import { ModelCommand } from './commands/ModelCommand.js';
import { RemoveShortcutCommand } from './commands/RemoveShortcutCommand.js';
import { ShortcutsCommand } from './commands/ShortcutsCommand.js';

const cli = new Cli({
  binaryLabel: 'Shell Agent',
  binaryName: 's',
  binaryVersion: '0.3.0',
});

cli.register(DefaultCommand);
cli.register(AuthCommand);
cli.register(ConfigCommand);
cli.register(ModelCommand);
cli.register(ShortcutsCommand);
cli.register(AddShortcutCommand);
cli.register(RemoveShortcutCommand);
cli.register(EditShortcutsCommand);
cli.register(Builtins.HelpCommand);
cli.register(Builtins.VersionCommand);

export { cli };
