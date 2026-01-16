import { input, password, select } from '@inquirer/prompts';
import { Command } from 'clipanion';
import pc from 'picocolors';
import { saveConfig } from '../../core/config.js';
import type { Config, Credentials, ProviderName } from '../../core/types.js';
import {
  CLAUDE_MODELS,
  createProvider,
  OllamaProvider,
  OPENAI_MODELS,
  OPENROUTER_MODELS,
} from '../../providers/index.js';
import { logger } from '../../utils/logger.js';
import { createSpinner } from '../../utils/spinner.js';

export class AuthCommand extends Command {
  static paths = [['auth'], ['--auth']];

  static usage = Command.Usage({
    description: 'Configure AI provider for Bashio',
    examples: [['Configure AI provider', '$0 --auth']],
  });

  async execute(): Promise<number> {
    console.log(pc.bold('\n  Bashio Setup\n'));

    const provider = await select<ProviderName>({
      message: 'Select your AI provider:',
      choices: [
        {
          value: 'claude' as const,
          name: 'Claude (Anthropic)',
          description: 'Use Anthropic API key',
        },
        {
          value: 'openai' as const,
          name: 'ChatGPT (OpenAI)',
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
          return 1;
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
        return 1;
      }

      spinner.succeed('Credentials valid');
    } catch (err) {
      spinner.fail(
        `Validation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      return 1;
    }

    saveConfig(config);

    console.log();
    logger.success('Configuration saved!');
    console.log(pc.gray(`  Provider: ${provider}`));
    console.log(pc.gray(`  Model: ${model}`));
    console.log();
    console.log(
      pc.green("You're all set! Try:"),
      pc.cyan('b find all png files'),
    );
    console.log();

    return 0;
  }
}
