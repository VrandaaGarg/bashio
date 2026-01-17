import type { ConfigV2, ProviderName } from '../core/types.js';
import type { AIProvider, ProviderConfig } from './base.js';
import {
  CHATGPT_SUBSCRIPTION_MODELS,
  ChatGPTSubscriptionProvider,
} from './chatgpt-subscription.js';
import { CLAUDE_MODELS, ClaudeProvider } from './claude.js';
import {
  CLAUDE_SUBSCRIPTION_MODELS,
  ClaudeSubscriptionProvider,
} from './claude-subscription.js';
import { COPILOT_MODELS, CopilotProvider } from './copilot.js';
import { OLLAMA_RECOMMENDED_MODELS, OllamaProvider } from './ollama.js';
import { OPENAI_MODELS, OpenAIProvider } from './openai.js';
import { OPENROUTER_MODELS, OpenRouterProvider } from './openrouter.js';

export function createProvider(config: ConfigV2): AIProvider {
  const activeProvider = config.activeProvider;
  const settings = config.providers[activeProvider];

  if (!settings) {
    throw new Error(`Provider ${activeProvider} not configured`);
  }

  const providerConfig: ProviderConfig = {
    model: settings.model,
    credentials: settings.credentials,
  };

  return createProviderFromType(activeProvider, providerConfig);
}

function createProviderFromType(
  provider: ProviderName,
  config: ProviderConfig,
): AIProvider {
  switch (provider) {
    case 'claude':
      return new ClaudeProvider(config);
    case 'claude-subscription':
      return new ClaudeSubscriptionProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'chatgpt-subscription':
      return new ChatGPTSubscriptionProvider(config);
    case 'copilot':
      return new CopilotProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    case 'openrouter':
      return new OpenRouterProvider(config);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

export {
  CLAUDE_MODELS,
  CLAUDE_SUBSCRIPTION_MODELS,
  OPENAI_MODELS,
  CHATGPT_SUBSCRIPTION_MODELS,
  COPILOT_MODELS,
  OLLAMA_RECOMMENDED_MODELS,
  OPENROUTER_MODELS,
};
export type { AIProvider } from './base.js';
export { OllamaProvider } from './ollama.js';
