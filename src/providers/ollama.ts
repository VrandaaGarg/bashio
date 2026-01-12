import type { AIProvider, ProviderConfig } from './base.js';
import { SYSTEM_PROMPT_EXPLAIN, SYSTEM_PROMPT_GENERATE } from './base.js';

interface OllamaResponse {
  response?: string;
  message?: { content: string };
  error?: string;
}

interface OllamaTagsResponse {
  models: Array<{ name: string }>;
}

export class OllamaProvider implements AIProvider {
  name = 'Ollama';
  private model: string;
  private host: string;

  constructor(config: ProviderConfig) {
    this.model = config.model;
    if (config.credentials.type === 'local') {
      this.host = config.credentials.host;
    } else {
      this.host = 'http://localhost:11434';
    }
  }

  private async call(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    const response = await fetch(`${this.host}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as OllamaResponse;

    if (data.error) {
      throw new Error(`Ollama error: ${data.error}`);
    }

    const content = data.message?.content || data.response;
    if (!content) {
      throw new Error('No response from Ollama');
    }

    return content.trim();
  }

  async generateCommand(query: string, context?: string): Promise<string> {
    const userMessage = context
      ? `Context: ${context}\n\nTask: ${query}`
      : query;
    return this.call(SYSTEM_PROMPT_GENERATE, userMessage);
  }

  async explainCommand(command: string): Promise<string> {
    return this.call(SYSTEM_PROMPT_EXPLAIN, `Explain this command: ${command}`);
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const response = await fetch(`${this.host}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  static async getAvailableModels(
    host = 'http://localhost:11434',
  ): Promise<string[]> {
    try {
      const response = await fetch(`${host}/api/tags`);
      if (!response.ok) return [];
      const data = (await response.json()) as OllamaTagsResponse;
      return data.models.map((m) => m.name);
    } catch {
      return [];
    }
  }
}

export const OLLAMA_RECOMMENDED_MODELS = [
  'llama3.2',
  'llama3.1',
  'codellama',
  'mistral',
  'gemma2',
];
