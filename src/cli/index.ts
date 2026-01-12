import { Builtins, Cli } from 'clipanion';
import { AuthCommand } from './commands/AuthCommand.js';
import { ConfigCommand } from './commands/ConfigCommand.js';
import { DefaultCommand } from './commands/DefaultCommand.js';

const cli = new Cli({
  binaryLabel: 'Shell Agent',
  binaryName: 's',
  binaryVersion: '0.1.0',
});

cli.register(DefaultCommand);
cli.register(AuthCommand);
cli.register(ConfigCommand);
cli.register(Builtins.HelpCommand);
cli.register(Builtins.VersionCommand);

export { cli };
