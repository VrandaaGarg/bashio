import { createNetworkError, createOllamaError } from '../core/errors.js';
import type { AIProvider, ChatMessage, ProviderConfig } from './base.js';
import {
  SYSTEM_PROMPT_CHAT,
  SYSTEM_PROMPT_EXPLAIN,
  SYSTEM_PROMPT_GENERATE,
} from './base.js';

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
    let response: Response;
    try {
      response = await fetch(`${this.host}/api/chat`, {
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
    } catch (error) {
      throw createNetworkError(error, 'Ollama', this.host);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw createOllamaError(errorText, this.model, response.status);
    }

    const data = (await response.json()) as OllamaResponse;

    if (data.error) {
      throw createOllamaError(data.error, this.model);
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

  async streamChat(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    let response: Response;
    try {
      response = await fetch(`${this.host}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT_CHAT },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          stream: true,
        }),
        signal,
      });
    } catch (error) {
      throw createNetworkError(error, 'Ollama', this.host);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw createOllamaError(errorText, this.model, response.status);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const data = JSON.parse(line) as {
            message?: { content?: string };
            done?: boolean;
          };
          if (data.message?.content) {
            onChunk(data.message.content);
          }
        } catch {
          // Ignore parse errors
        }
      }
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
