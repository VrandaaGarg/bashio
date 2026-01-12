import { select } from '@inquirer/prompts';
import { Command } from 'clipanion';
import pc from 'picocolors';
import { configExists, loadConfig, saveConfig } from '../../core/config.js';
import {
  CLAUDE_MODELS,
  OllamaProvider,
  OPENAI_MODELS,
  OPENROUTER_MODELS,
} from '../../providers/index.js';
import { logger } from '../../utils/logger.js';
import { createSpinner } from '../../utils/spinner.js';

export class ModelCommand extends Command {
  static paths = [['model'], ['--model']];

  static usage = Command.Usage({
    description: 'Change the AI model for current provider',
    examples: [['Change model', '$0 --model']],
  });

  async execute(): Promise<number> {
    if (!configExists()) {
      logger.warn('Shell Agent is not configured yet.');
      console.log(
        pc.gray("Run 's --auth' to set up your AI provider first.\n"),
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
    console.log(pc.gray(`  Current model: ${config.model}\n`));

    let newModel: string;

    switch (config.provider) {
      case 'claude': {
        newModel = await select({
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
        newModel = await select({
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

        newModel = await select({
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
        newModel = await select({
          message: 'Select new model:',
          choices: OPENROUTER_MODELS.map((m) => ({
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
