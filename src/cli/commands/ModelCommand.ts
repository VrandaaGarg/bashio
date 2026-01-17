import * as readline from 'node:readline';
import { select } from '@inquirer/prompts';
import { Command } from 'clipanion';
import pc from 'picocolors';
import { configExists, loadConfig, saveConfig } from '../../core/config.js';
import {
  CHATGPT_SUBSCRIPTION_MODELS,
  CLAUDE_MODELS,
  CLAUDE_SUBSCRIPTION_MODELS,
  COPILOT_MODELS,
  OllamaProvider,
  OPENAI_MODELS,
  OPENROUTER_MODELS,
} from '../../providers/index.js';
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
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === 'ExitPromptError' ||
    error.name === 'AbortPromptError' ||
    error.name === 'CancelPromptError'
  );
};

export class ModelCommand extends Command {
  static paths = [['model'], ['--model']];

  static usage = Command.Usage({
    description: 'Change the AI model for current provider',
    examples: [['Change model', '$0 --model']],
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

    console.log(pc.bold('\n  Change AI Model\n'));
    console.log(pc.gray(`  Current provider: ${config.provider}`));
    console.log(pc.gray(`  Current model: ${config.model}`));
    console.log(pc.dim('  Press Esc to cancel\n'));

    let newModel: string;

    try {
      switch (config.provider) {
        case 'claude': {
          newModel = await selectWithEsc<string>({
            message: 'Select new model:',
            choices: CLAUDE_MODELS.map((m) => ({
              value: m.value,
              name: m.label,
            })),
            default: config.model,
          });
          break;
        }

        case 'openai': {
          newModel = await selectWithEsc<string>({
            message: 'Select new model:',
            choices: OPENAI_MODELS.map((m) => ({
              value: m.value,
              name: m.label,
            })),
            default: config.model,
          });
          break;
        }

        case 'ollama': {
          const host =
            config.credentials.type === 'local'
              ? config.credentials.host
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
            message: 'Select new model:',
            choices: availableModels.map((m) => ({
              value: m,
              name: m,
            })),
            default: config.model,
          });
          break;
        }

        case 'openrouter': {
          newModel = await selectWithEsc<string>({
            message: 'Select new model:',
            choices: OPENROUTER_MODELS.map((m) => ({
              value: m.value,
              name: m.label,
            })),
            default: config.model,
          });
          break;
        }

        case 'claude-subscription': {
          newModel = await selectWithEsc<string>({
            message: 'Select new model:',
            choices: CLAUDE_SUBSCRIPTION_MODELS.map((m) => ({
              value: m.value,
              name: m.label,
            })),
            default: config.model,
          });
          break;
        }

        case 'chatgpt-subscription': {
          newModel = await selectWithEsc<string>({
            message: 'Select new model:',
            choices: CHATGPT_SUBSCRIPTION_MODELS.map((m) => ({
              value: m.value,
              name: m.label,
            })),
            default: config.model,
          });
          break;
        }

        case 'copilot': {
          newModel = await selectWithEsc<string>({
            message: 'Select new model:',
            choices: COPILOT_MODELS.map((m) => ({
              value: m.value,
              name: m.label,
            })),
            default: config.model,
          });
          break;
        }

        default:
          logger.error(`Unknown provider: ${config.provider}`);
          return 1;
      }
    } catch (error) {
      if (isPromptExit(error)) {
        console.log(pc.dim('\n  Cancelled.\n'));
        return 0;
      }
      throw error;
    }

    if (newModel === config.model) {
      logger.info('Model unchanged.');
      return 0;
    }

    config.model = newModel;
    saveConfig(config);

    console.log();
    logger.success(`Model changed to: ${newModel}`);
    console.log();

    return 0;
  }
}
