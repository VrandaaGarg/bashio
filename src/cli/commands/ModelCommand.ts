import * as readline from 'node:readline';
import { select } from '@inquirer/prompts';
import { Command } from 'clipanion';
import pc from 'picocolors';
import { PROVIDER_DISPLAY_NAMES } from '../../core/auth.js';
import { configExists, loadConfig, saveConfig } from '../../core/config.js';
import type { ConfigV2, ProviderName } from '../../core/types.js';
import {
  CHATGPT_SUBSCRIPTION_MODELS,
  CLAUDE_MODELS,
  CLAUDE_SUBSCRIPTION_MODELS,
  COPILOT_MODELS,
  OllamaProvider,
  OPENAI_MODELS,
  OPENROUTER_MODELS,
} from '../../providers/index.js';
import { bashioTheme } from '../../utils/inquirerTheme.js';
import { logger } from '../../utils/logger.js';
import { createSpinner } from '../../utils/spinner.js';

type SelectConfig<Value> = Parameters<typeof select<Value>>[0];
type KeypressHandler = (input: string, key: readline.Key) => void;
type KeypressInput = NodeJS.ReadStream & {
  on(event: 'keypress', listener: KeypressHandler): void;
  off(event: 'keypress', listener: KeypressHandler): void;
  setRawMode?: (mode: boolean) => void;
  isTTY?: boolean;
  isRaw?: boolean;
};

const selectWithEsc = async <Value>(
  config: SelectConfig<Value>,
): Promise<Value> => {
  const controller = new AbortController();
  const input = process.stdin as KeypressInput;
  const previousRawMode: boolean | null =
    input.isTTY && typeof input.isRaw === 'boolean' ? input.isRaw : null;

  const onKeypress: KeypressHandler = (_input, key) => {
    if (key.name === 'escape') {
      controller.abort();
    }
  };

  readline.emitKeypressEvents(input);

  if (input.isTTY && typeof input.setRawMode === 'function') {
    input.setRawMode(true);
  }

  input.on('keypress', onKeypress);

  try {
    return await select<Value>(config, { signal: controller.signal });
  } finally {
    input.off('keypress', onKeypress);
    if (
      input.isTTY &&
      typeof input.setRawMode === 'function' &&
      previousRawMode !== null
    ) {
      input.setRawMode(previousRawMode);
    }
  }
};

const isPromptExit = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  return (
    error.name === 'ExitPromptError' ||
    error.name === 'AbortPromptError' ||
    error.name === 'CancelPromptError' ||
    error.message.includes('SIGINT') ||
    error.message.includes('force closed')
  );
};

function getModelsForProvider(
  provider: ProviderName,
): Array<{ value: string; label: string }> {
  switch (provider) {
    case 'claude':
      return CLAUDE_MODELS;
    case 'claude-subscription':
      return CLAUDE_SUBSCRIPTION_MODELS;
    case 'openai':
      return OPENAI_MODELS;
    case 'chatgpt-subscription':
      return CHATGPT_SUBSCRIPTION_MODELS;
    case 'copilot':
      return COPILOT_MODELS;
    case 'openrouter':
      return OPENROUTER_MODELS;
    case 'ollama':
      return []; // Handled separately
    default:
      return [];
  }
}

export class ModelCommand extends Command {
  static paths = [['model'], ['--model']];

  static usage = Command.Usage({
    description: 'Change the AI provider and model',
    examples: [['Change provider/model', '$0 --model']],
  });

  async execute(): Promise<number> {
    if (!configExists()) {
      logger.warn('Bashio is not configured yet.');
      console.log(
        pc.gray("Run 'b --auth' to set up your AI provider first.\n"),
      );
      return 1;
    }

    const config = loadConfig();
    if (!config) {
      logger.error('Failed to load configuration.');
      return 1;
    }

    const configuredProviders = Object.keys(config.providers) as ProviderName[];

    if (configuredProviders.length === 0) {
      logger.warn('No providers configured.');
      console.log(pc.gray("Run 'b --auth' to set up a provider.\n"));
      return 1;
    }

    const activeSettings = config.providers[config.activeProvider];
    console.log(pc.bold('\n  Change Provider & Model\n'));
    console.log(
      pc.gray(
        `  Current: ${PROVIDER_DISPLAY_NAMES[config.activeProvider]} / ${activeSettings?.model}`,
      ),
    );
    console.log(pc.dim('  Press Esc to cancel\n'));

    try {
      // Step 1: Select provider (show configured providers with their models)
      const providerChoices = configuredProviders.map((p) => {
        const settings = config.providers[p];
        const isActive = p === config.activeProvider;
        const marker = isActive ? pc.green('●') : pc.dim('○');
        const name = `${marker} ${PROVIDER_DISPLAY_NAMES[p]}`;
        const description = settings?.model || 'Not configured';
        return { value: p, name, description };
      });

      // Add option to configure new provider
      providerChoices.push({
        value: '__add_new__' as ProviderName,
        name: pc.yellow('+ Add new provider...'),
        description: 'Configure a new AI provider',
      });

      const selectedProvider = await selectWithEsc<
        ProviderName | '__add_new__'
      >({
        message: 'Select provider:',
        choices: providerChoices,
        theme: bashioTheme,
      });

      if (selectedProvider === '__add_new__') {
        console.log(pc.dim("\n  Run 'b --auth' to add a new provider.\n"));
        return 0;
      }

      // Step 2: Select model for the chosen provider
      const currentModel = config.providers[selectedProvider]?.model;
      let newModel: string;

      if (selectedProvider === 'ollama') {
        const host =
          config.providers.ollama?.credentials.type === 'local'
            ? config.providers.ollama.credentials.host
            : 'http://localhost:11434';

        const spinner = createSpinner('Fetching available models...').start();
        const availableModels = await OllamaProvider.getAvailableModels(host);
        spinner.stop();

        if (availableModels.length === 0) {
          logger.warn('No models found. Make sure Ollama is running.');
          console.log(pc.gray('\n  Install a model: ollama pull llama3.2\n'));
          return 1;
        }

        newModel = await selectWithEsc<string>({
          message: 'Select model:',
          choices: availableModels.map((m) => ({ value: m, name: m })),
          default: currentModel,
          theme: bashioTheme,
        });
      } else {
        const models = getModelsForProvider(selectedProvider);
        newModel = await selectWithEsc<string>({
          message: 'Select model:',
          choices: models.map((m) => ({ value: m.value, name: m.label })),
          default: currentModel,
          theme: bashioTheme,
        });
      }

      // Update config
      const providerSettings = config.providers[selectedProvider];
      if (!providerSettings) {
        logger.error('Provider not configured.');
        return 1;
      }

      const updatedConfig: ConfigV2 = {
        ...config,
        activeProvider: selectedProvider,
        providers: {
          ...config.providers,
          [selectedProvider]: {
            ...providerSettings,
            model: newModel,
          },
        },
      };

      saveConfig(updatedConfig);

      const changed =
        selectedProvider !== config.activeProvider || newModel !== currentModel;

      if (changed) {
        console.log();
        logger.success(
          `Switched to: ${PROVIDER_DISPLAY_NAMES[selectedProvider]} / ${newModel}`,
        );
      } else {
        logger.info('No changes made.');
      }
      console.log();

      return 0;
    } catch (error) {
      if (isPromptExit(error)) {
        console.log(pc.dim('\n  Cancelled.\n'));
        return 0;
      }
      throw error;
    }
  }
}
