import { spawn } from 'node:child_process';

export interface ExecutionResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function executeCommand(command: string): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const shell = process.platform === 'win32' ? 'cmd' : '/bin/sh';
    const shellArg = process.platform === 'win32' ? '/c' : '-c';

    // Use 'inherit' for all stdio to allow TUI apps (like opencode)
    // direct TTY access for proper terminal size detection and rendering
    const child = spawn(shell, [shellArg, command], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env,
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout: '',
        stderr: '',
      });
    });

    child.on('error', (err) => {
      resolve({
        exitCode: 1,
        stdout: '',
        stderr: err.message,
      });
    });
  });
}
