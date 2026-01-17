import type { Config } from '../core/types.js';
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
import { OLLAMA_RECOMMENDED_MODELS, OllamaProvider } from './ollama.js';
import { OPENAI_MODELS, OpenAIProvider } from './openai.js';
import { OPENROUTER_MODELS, OpenRouterProvider } from './openrouter.js';

export function createProvider(config: Config): AIProvider {
  const providerConfig: ProviderConfig = {
    model: config.model,
    credentials: config.credentials,
  };

  switch (config.provider) {
    case 'claude':
      return new ClaudeProvider(providerConfig);
    case 'claude-subscription':
      return new ClaudeSubscriptionProvider(providerConfig);
    case 'openai':
      return new OpenAIProvider(providerConfig);
    case 'chatgpt-subscription':
      return new ChatGPTSubscriptionProvider(providerConfig);
    case 'ollama':
      return new OllamaProvider(providerConfig);
    case 'openrouter':
      return new OpenRouterProvider(providerConfig);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

export {
  CLAUDE_MODELS,
  CLAUDE_SUBSCRIPTION_MODELS,
  OPENAI_MODELS,
  CHATGPT_SUBSCRIPTION_MODELS,
  OLLAMA_RECOMMENDED_MODELS,
  OPENROUTER_MODELS,
};
export type { AIProvider } from './base.js';
export { OllamaProvider } from './ollama.js';
