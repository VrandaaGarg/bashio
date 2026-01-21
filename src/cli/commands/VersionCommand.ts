import { Command } from 'clipanion';
import pc from 'picocolors';
import { PACKAGE_NAME, PACKAGE_VERSION } from '../../core/constants.js';
import { accent } from '../../utils/colors.js';

interface NpmRegistryResponse {
  version: string;
}

async function fetchLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(
      `https://registry.npmjs.org/${PACKAGE_NAME}/latest`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as NpmRegistryResponse;
    return data.version ?? null;
  } catch {
    return null;
  }
}

function compareVersions(current: string, latest: string): number {
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const c = currentParts[i] ?? 0;
    const l = latestParts[i] ?? 0;
    if (c < l) return -1;
    if (c > l) return 1;
  }
  return 0;
}

function renderUpdateBanner(current: string, latest: string): void {
  const width = 44;

  const ansiRegex = new RegExp(
    `${String.fromCharCode(27)}\\[[0-9;]*[a-zA-Z]`,
    'g',
  );
  const stripAnsi = (str: string): string => str.replace(ansiRegex, '');
  const visibleLength = (str: string): number => stripAnsi(str).length;
  const pad = (text: string, len: number): string => {
    const padding = len - visibleLength(text);
    return text + ' '.repeat(Math.max(0, padding));
  };
  const line = (content: string): string =>
    accent('  │') + pad(content, width) + accent('│');

  console.log();
  console.log(accent(`  ┌${'─'.repeat(width)}┐`));
  console.log(line(''));
  console.log(line(pc.bold('        Update Available!')));
  console.log(line(''));
  console.log(line(`   ${pc.dim(current)} → ${accent(pc.bold(latest))}`));
  console.log(line(''));
  console.log(line(`   Run: ${accent('npm i -g bashio@latest')}`));
  console.log(line(''));
  console.log(accent(`  └${'─'.repeat(width)}┘`));
  console.log();
}

export class VersionCommand extends Command {
  static paths = [['--version'], ['-v']];

  static usage = Command.Usage({
    description: 'Show version and check for updates',
    examples: [['Show version', '$0 --version']],
  });

  async execute(): Promise<number> {
    console.log(`${pc.bold('Bashio')} v${PACKAGE_VERSION}`);

    const latestVersion = await fetchLatestVersion();

    if (latestVersion && compareVersions(PACKAGE_VERSION, latestVersion) < 0) {
      renderUpdateBanner(PACKAGE_VERSION, latestVersion);
    } else if (latestVersion) {
      console.log(pc.green('✓ You are on the latest version'));
    } else {
      console.log(pc.dim('Could not check for updates'));
    }

    return 0;
  }
}
