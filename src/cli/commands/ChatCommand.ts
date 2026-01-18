import { Command } from 'clipanion';

export class ChatCommand extends Command {
  static paths = [['chat'], ['--chat']];

  static usage = Command.Usage({
    description: 'Start an interactive AI chat session',
    examples: [
      ['Start chat', '$0 chat'],
      ['Start chat (alternate)', '$0 --chat'],
    ],
  });

  async execute(): Promise<number> {
    const { runChat } = await import('../../chat/App.js');
    return runChat();
  }
}
