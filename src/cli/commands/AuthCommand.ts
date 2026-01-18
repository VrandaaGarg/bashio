import { Command } from 'clipanion';
import { runAuthSetup } from '../../core/auth.js';
import { orange } from '../../utils/colors.js';

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
        orange("You're all set! Try:"),
        orange('b find all png files'),
      );
      console.log();
    }

    return success ? 0 : 1;
  }
}
