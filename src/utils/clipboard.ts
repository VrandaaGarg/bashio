import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    const platform = process.platform;

    if (platform === 'darwin') {
      // macOS
      await execAsync(`echo ${JSON.stringify(text)} | pbcopy`);
    } else if (platform === 'linux') {
      // Linux (requires xclip or xsel)
      try {
        await execAsync(
          `echo ${JSON.stringify(text)} | xclip -selection clipboard`,
        );
      } catch {
        await execAsync(
          `echo ${JSON.stringify(text)} | xsel --clipboard --input`,
        );
      }
    } else if (platform === 'win32') {
      // Windows
      await execAsync(`echo ${text} | clip`);
    } else {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
