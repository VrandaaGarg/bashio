import { Command } from 'clipanion';
import pc from 'picocolors';
import { runAuthSetup } from '../../core/auth.js';

export class AuthCommand extends Command {
  static paths = [['auth'], ['--auth']];

  static usage = Command.Usage({
    description: 'Configure AI provider for Bashio',
    examples: [['Configure AI provider', '$0 --auth']],
  });

  async execute(): Promise<number> {
    const success = await runAuthSetup();

    if (success) {
      console.log(
        pc.green("You're all set! Try:"),
        pc.cyan('b find all png files'),
      );
      console.log();
    }

    return success ? 0 : 1;
  }
}
