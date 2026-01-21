import pc from 'picocolors';
import { accent } from './colors.js';

export const logger = {
  info: (msg: string) => console.log(pc.blue('i'), msg),
  success: (msg: string) => console.log(accent('✓'), msg),
  warn: (msg: string) => console.log(accent('⚠'), msg),
  error: (msg: string) => console.log(pc.red('✗'), msg),

  command: (cmd: string) => {
    console.log(pc.gray('>'), accent('Will run:'), pc.white(cmd));
  },

  output: (text: string) => {
    console.log(pc.gray('─'.repeat(50)));
    console.log(text);
    console.log(pc.gray('─'.repeat(50)));
  },

  exitCode: (code: number) => {
    if (code === 0) {
      console.log(accent('✓'), pc.gray(`Done (exit code: ${code})`));
    } else {
      console.log(pc.red('✗'), pc.gray(`Failed (exit code: ${code})`));
    }
  },

  box: (title: string, content: string) => {
    const lines = content.split('\n');
    const maxLen = Math.max(title.length, ...lines.map((l) => l.length));
    const border = '─'.repeat(maxLen + 4);

    console.log(pc.gray(`┌${border}┐`));
    console.log(pc.gray('│'), pc.bold(title.padEnd(maxLen + 2)), pc.gray('│'));
    console.log(pc.gray(`├${border}┤`));
    for (const line of lines) {
      console.log(pc.gray('│'), line.padEnd(maxLen + 2), pc.gray('│'));
    }
    console.log(pc.gray(`└${border}┘`));
  },
};
