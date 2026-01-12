import { spawn } from 'node:child_process';
import { Command } from 'clipanion';
import pc from 'picocolors';
import {
  getShortcutsFilePath,
  saveShortcuts,
  shortcutsFileExists,
} from '../../core/shortcuts.js';
import { logger } from '../../utils/logger.js';

export class EditShortcutsCommand extends Command {
  static paths = [['edit-shortcuts'], ['--edit-shortcuts']];

  static usage = Command.Usage({
    description: 'Open shortcuts file in your default editor',
    examples: [['Edit shortcuts', '$0 --edit-shortcuts']],
  });

  async execute(): Promise<number> {
    const filePath = getShortcutsFilePath();

    // Create file with empty shortcuts if it doesn't exist
    if (!shortcutsFileExists()) {
      saveShortcuts({ version: 1, shortcuts: {} });
      logger.info('Created new shortcuts file.');
    }

    // Get editor from environment
    const editor =
      process.env.EDITOR || process.env.VISUAL || this.getDefaultEditor();

    if (!editor) {
      logger.error('No editor found. Set $EDITOR environment variable.');
      console.log(pc.gray(`\n  Example: export EDITOR=vim`));
      console.log(pc.gray(`  Or: export EDITOR="code --wait"`));
      console.log(pc.gray(`\n  File location: ${filePath}\n`));
      return 1;
    }

    console.log(pc.gray(`\n  Opening ${filePath} in ${editor}...\n`));

    return new Promise((resolve) => {
      // Parse editor command (handle "code --wait" style)
      const parts = editor.split(' ');
      const editorCmd = parts[0];
      const editorArgs = [...parts.slice(1), filePath];

      const child = spawn(editorCmd, editorArgs, {
        stdio: 'inherit',
        shell: true,
      });

      child.on('close', (code) => {
        if (code === 0) {
          logger.success('Shortcuts file saved.');
        } else {
          logger.warn('Editor closed with non-zero exit code.');
        }
        console.log();
        resolve(code ?? 0);
      });

      child.on('error', (err) => {
        logger.error(`Failed to open editor: ${err.message}`);
        console.log(pc.gray(`\n  File location: ${filePath}\n`));
        resolve(1);
      });
    });
  }

  private getDefaultEditor(): string | null {
    const platform = process.platform;

    if (platform === 'darwin') {
      return 'nano';
    }
    if (platform === 'win32') {
      return 'notepad';
    }
    // Linux
    return 'nano';
  }
}
