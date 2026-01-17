import { input, password, select } from '@inquirer/prompts';
import pc from 'picocolors';
import {
  CHATGPT_SUBSCRIPTION_MODELS,
  CLAUDE_MODELS,
  CLAUDE_SUBSCRIPTION_MODELS,
  createProvider,
  OllamaProvider,
  OPENAI_MODELS,
  OPENROUTER_MODELS,
} from '../providers/index.js';
import { logger } from '../utils/logger.js';
import { createSpinner } from '../utils/spinner.js';
import { saveConfig } from './config.js';
import {
  buildChatGPTAuthUrl,
  buildClaudeAuthUrl,
  CHATGPT_OAUTH_CONFIG,
  CLAUDE_OAUTH_CONFIG,
  exchangeChatGPTCode,
  exchangeClaudeCode,
  generatePKCE,
  startCallbackServer,
} from './oauth.js';
import type { Config, Credentials, ProviderName } from './types.js';

async function openBrowser(url: string): Promise<boolean> {
  try {
    const { exec } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execAsync = promisify(exec);

    const platform = process.platform;
    const command =
      platform === 'darwin'
        ? `open "${url}"`
        : platform === 'win32'
          ? `start "" "${url}"`
          : `xdg-open "${url}"`;

    await execAsync(command);
    return true;
  } catch {
    return false;
  }
}

function showWelcomeBanner(): void {
  const cyan = pc.cyan;
  const dim = pc.dim;
  const width = 58;

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
    cyan('  │') + pad(content, width) + cyan('│');

  console.log();
  console.log(cyan(`  ┌${'─'.repeat(width)}┐`));
  console.log(line(''));
  console.log(
    line(
      `   ${pc.bold(pc.white('██████╗  █████╗ ███████╗██╗  ██╗██╗ ██████╗'))}`,
    ),
  );
  console.log(
    line(
      `   ${pc.bold(pc.white('██╔══██╗██╔══██╗██╔════╝██║  ██║██║██╔═══██╗'))}`,
    ),
  );
  console.log(
    line(
      `   ${pc.bold(pc.white('██████╔╝███████║███████╗███████║██║██║   ██║'))}`,
    ),
  );
  console.log(
    line(
      `   ${pc.bold(pc.white('██╔══██╗██╔══██║╚════██║██╔══██║██║██║   ██║'))}`,
    ),
  );
  console.log(
    line(
      `   ${pc.bold(pc.white('██████╔╝██║  ██║███████║██║  ██║██║╚██████╔╝'))}`,
    ),
  );
  console.log(
    line(
      `   ${pc.bold(pc.white('╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝ ╚═════╝'))}`,
    ),
  );
  console.log(line(''));
  console.log(line(dim('   Natural language to shell commands.')));
  console.log(line(dim('   Stop Googling, start doing.')));
  console.log(line(''));
  console.log(cyan(`  └${'─'.repeat(width)}┘`));
  console.log();
}

export async function runAuthSetup(showBanner = true): Promise<boolean> {
  if (showBanner) {
    showWelcomeBanner();
  }
  console.log(pc.bold('  Bashio Setup\n'));

  const provider = await select<ProviderName>({
    message: 'Select your AI provider:',
    choices: [
      {
        value: 'claude-subscription' as const,
        name: 'Claude Pro/Max (Subscription)',
        description: 'Use your existing Claude subscription',
      },
      {
        value: 'chatgpt-subscription' as const,
        name: 'ChatGPT Plus/Pro (Subscription)',
        description: 'Use your existing ChatGPT subscription',
      },
      {
        value: 'claude' as const,
        name: 'Claude (API Key)',
        description: 'Use Anthropic API key',
      },
      {
        value: 'openai' as const,
        name: 'ChatGPT (API Key)',
        description: 'Use OpenAI API key',
      },
      {
        value: 'ollama' as const,
        name: 'Ollama (Local)',
        description: 'Free, runs on your machine',
      },
      {
        value: 'openrouter' as const,
        name: 'OpenRouter',
        description: 'Pay per use, multiple models',
      },
    ],
  });

  let credentials: Credentials;
  let model: string;

  switch (provider) {
    case 'claude-subscription': {
      console.log();
      console.log(
        pc.yellow(
          '  Note: This uses your Claude Pro/Max subscription via OAuth.',
        ),
      );
      console.log(
        pc.dim(
          '  Your credentials are stored locally and refreshed automatically.',
        ),
      );
      console.log();

      const tokens = await performClaudeOAuth();
      if (!tokens) {
        return false;
      }

      credentials = {
        type: 'claude_subscription',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        email: tokens.email,
      };

      model = await select({
        message: 'Select model:',
        choices: CLAUDE_SUBSCRIPTION_MODELS.map((m) => ({
          value: m.value,
          name: m.label,
        })),
      });
      break;
    }

    case 'chatgpt-subscription': {
      console.log();
      console.log(
        pc.yellow(
          '  Note: This uses your ChatGPT Plus/Pro subscription via OAuth.',
        ),
      );
      console.log(
        pc.red('  WARNING: This is EXPERIMENTAL and uses an unofficial API.'),
      );
      console.log(
        pc.dim('  The API may change or stop working without notice.'),
      );
      console.log(
        pc.dim('  For stable usage, consider using an API key instead.'),
      );
      console.log();

      const tokens = await performChatGPTOAuth();
      if (!tokens) {
        return false;
      }

      credentials = {
        type: 'chatgpt_subscription',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || undefined,
        expiresAt: tokens.expiresAt || undefined,
        accountId: tokens.accountId,
      };

      model = await select({
        message: 'Select model:',
        choices: CHATGPT_SUBSCRIPTION_MODELS.map((m) => ({
          value: m.value,
          name: m.label,
        })),
      });
      break;
    }

    case 'claude': {
      const apiKey = await password({
        message: 'Enter your Anthropic API key:',
        mask: '*',
      });
      credentials = { type: 'api_key', apiKey };

      model = await select({
        message: 'Select model:',
        choices: CLAUDE_MODELS.map((m) => ({
          value: m.value,
          name: m.label,
        })),
      });
      break;
    }

    case 'openai': {
      const apiKey = await password({
        message: 'Enter your OpenAI API key:',
        mask: '*',
      });
      credentials = { type: 'api_key', apiKey };

      model = await select({
        message: 'Select model:',
        choices: OPENAI_MODELS.map((m) => ({
          value: m.value,
          name: m.label,
        })),
      });
      break;
    }

    case 'ollama': {
      const host = await input({
        message: 'Ollama host:',
        default: 'http://localhost:11434',
      });
      credentials = { type: 'local', host };

      const spinner = createSpinner('Checking Ollama connection...').start();
      const availableModels = await OllamaProvider.getAvailableModels(host);

      if (availableModels.length === 0) {
        spinner.fail('Could not connect to Ollama or no models installed');
        console.log(pc.yellow('\nMake sure Ollama is running: ollama serve'));
        console.log(pc.yellow('Install a model: ollama pull llama3.2\n'));
        return false;
      }

      spinner.succeed(`Found ${availableModels.length} models`);

      const modelChoices = availableModels.map((m) => ({
        value: m,
        name: m,
      }));

      model = await select({
        message: 'Select model:',
        choices: modelChoices,
      });
      break;
    }

    case 'openrouter': {
      const apiKey = await password({
        message: 'Enter your OpenRouter API key:',
        mask: '*',
      });
      credentials = { type: 'api_key', apiKey };

      model = await select({
        message: 'Select model:',
        choices: OPENROUTER_MODELS.map((m) => ({
          value: m.value,
          name: m.label,
        })),
      });
      break;
    }

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  const config: Config = {
    version: 1,
    provider,
    model,
    credentials,
    settings: {
      confirmBeforeExecute: true,
      historyEnabled: true,
      historyRetentionDays: 30,
      historyMaxEntries: 2000,
      autoConfirmShortcuts: false,
    },
  };

  const spinner = createSpinner('Validating credentials...').start();

  try {
    const providerInstance = createProvider(config);
    const valid = await providerInstance.validateCredentials();

    if (!valid) {
      spinner.fail('Invalid credentials');
      return false;
    }

    spinner.succeed('Credentials valid');
  } catch (err) {
    spinner.fail(
      `Validation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
    return false;
  }

  saveConfig(config);

  console.log();
  logger.success('Configuration saved!');
  console.log(pc.gray(`  Provider: ${provider}`));
  console.log(pc.gray(`  Model: ${model}`));
  console.log();

  return true;
}

interface OAuthResult {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email?: string;
  accountId?: string; // ChatGPT account ID
}

async function performClaudeOAuth(): Promise<OAuthResult | null> {
  const authMethod = await select({
    message: 'How would you like to authenticate?',
    choices: [
      {
        value: 'browser' as const,
        name: 'Open browser automatically',
        description: 'Recommended - opens browser and waits for callback',
      },
      {
        value: 'manual' as const,
        name: 'Manual URL copy/paste',
        description: 'Copy URL to browser, then paste the callback URL',
      },
    ],
  });

  const pkce = generatePKCE();
  const authUrl = buildClaudeAuthUrl(pkce);

  if (authMethod === 'browser') {
    return performBrowserOAuth(
      'Claude',
      authUrl,
      pkce,
      CLAUDE_OAUTH_CONFIG.callbackPort,
      async (code: string) =>
        exchangeClaudeCode(code, pkce.codeVerifier, pkce.state),
    );
  }
  return performManualOAuth('Claude', authUrl, pkce, async (code: string) =>
    exchangeClaudeCode(code, pkce.codeVerifier, pkce.state),
  );
}

async function performChatGPTOAuth(): Promise<OAuthResult | null> {
  const authMethod = await select({
    message: 'How would you like to authenticate?',
    choices: [
      {
        value: 'browser' as const,
        name: 'Open browser automatically',
        description: 'Recommended - opens browser and waits for callback',
      },
      {
        value: 'manual' as const,
        name: 'Manual URL copy/paste',
        description: 'Copy URL to browser, then paste the callback URL',
      },
    ],
  });

  const pkce = generatePKCE();
  const authUrl = buildChatGPTAuthUrl(pkce);

  if (authMethod === 'browser') {
    return performBrowserOAuth(
      'ChatGPT',
      authUrl,
      pkce,
      CHATGPT_OAUTH_CONFIG.callbackPort,
      async (code: string) => exchangeChatGPTCode(code, pkce.codeVerifier),
    );
  }
  return performManualOAuth('ChatGPT', authUrl, pkce, async (code: string) =>
    exchangeChatGPTCode(code, pkce.codeVerifier),
  );
}

async function performBrowserOAuth(
  providerName: string,
  authUrl: string,
  pkce: { state: string },
  port: number,
  exchangeCode: (code: string) => Promise<OAuthResult>,
): Promise<OAuthResult | null> {
  console.log();
  console.log(pc.dim('  Starting local callback server...'));

  const serverPromise = startCallbackServer(port, pkce.state);

  const browserOpened = await openBrowser(authUrl);

  if (browserOpened) {
    console.log(
      pc.green(`  Browser opened. Please log in to ${providerName}.`),
    );
  } else {
    console.log(pc.yellow('  Could not open browser automatically.'));
    console.log(pc.dim('  Please open this URL manually:'));
    console.log();
    console.log(`  ${pc.cyan(authUrl)}`);
  }

  console.log();
  console.log(pc.dim('  Waiting for authentication (5 minute timeout)...'));

  try {
    const { code } = await serverPromise;

    const spinner = createSpinner('Exchanging authorization code...').start();

    try {
      const tokens = await exchangeCode(code);
      spinner.succeed('Authentication successful!');
      return tokens;
    } catch (error) {
      spinner.fail(
        `Token exchange failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  } catch (error) {
    logger.error(
      `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    return null;
  }
}

async function performManualOAuth(
  providerName: string,
  authUrl: string,
  pkce: { codeVerifier: string; state: string },
  exchangeCode: (code: string) => Promise<OAuthResult>,
): Promise<OAuthResult | null> {
  console.log();
  console.log(
    pc.dim(
      `  Open this URL in your browser to authenticate with ${providerName}:`,
    ),
  );
  console.log();
  console.log(`  ${pc.cyan(authUrl)}`);
  console.log();
  console.log(
    pc.dim('  After logging in, you will be redirected to a localhost URL.'),
  );
  console.log(pc.dim('  Copy the full redirect URL and paste it below.'));
  console.log();

  const callbackUrl = await input({
    message: 'Paste the callback URL here:',
  });

  try {
    const url = new URL(callbackUrl);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    if (error) {
      logger.error(`OAuth error: ${error}`);
      return null;
    }

    if (!code) {
      logger.error('No authorization code found in URL');
      return null;
    }

    if (state !== pkce.state) {
      logger.error('State mismatch - possible security issue');
      return null;
    }

    const spinner = createSpinner('Exchanging authorization code...').start();

    try {
      const tokens = await exchangeCode(code);
      spinner.succeed('Authentication successful!');
      return tokens;
    } catch (err) {
      spinner.fail(
        `Token exchange failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      return null;
    }
  } catch {
    logger.error('Invalid URL format');
    return null;
  }
}
