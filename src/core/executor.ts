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

    const child = spawn(shell, [shellArg, command], {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: process.cwd(),
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(text);
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr,
      });
    });

    child.on('error', (err) => {
      resolve({
        exitCode: 1,
        stdout,
        stderr: err.message,
      });
    });
  });
}
