import {
  createHttpError,
  createNetworkError,
  isFetchError,
} from '../core/errors.js';
import type { AIProvider, ChatMessage, ProviderConfig } from './base.js';
import {
  SYSTEM_PROMPT_CHAT,
  SYSTEM_PROMPT_EXPLAIN,
  SYSTEM_PROMPT_GENERATE,
} from './base.js';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  choices: Array<{ message: { content: string } }>;
  error?: { message: string };
}

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI';
  private model: string;
  private apiKey: string;

  constructor(config: ProviderConfig) {
    this.model = config.model;
    if (config.credentials.type === 'api_key') {
      this.apiKey = config.credentials.apiKey;
    } else {
      throw new Error('OpenAI requires API key');
    }
  }

  private async call(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    const messages: OpenAIMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          messages,
        }),
      });
    } catch (error) {
      if (isFetchError(error)) {
        throw createNetworkError(error, 'OpenAI');
      }
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw createHttpError({
        provider: 'OpenAI',
        model: this.model,
        status: response.status,
        errorText,
      });
    }

    const data = (await response.json()) as OpenAIResponse;

    if (data.error) {
      throw new Error(`OpenAI API error: ${data.error.message}`);
    }

    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
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
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async streamChat(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    let response: Response;
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT_CHAT },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
          stream: true,
        }),
        signal,
      });
    } catch (error) {
      if (isFetchError(error)) {
        throw createNetworkError(error, 'OpenAI');
      }
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw createHttpError({
        provider: 'OpenAI',
        model: this.model,
        status: response.status,
        errorText,
      });
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
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6);
          if (jsonStr === '[DONE]') continue;

          try {
            const data = JSON.parse(jsonStr) as {
              choices?: Array<{ delta?: { content?: string } }>;
            };
            const content = data.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }
}

// Latest OpenAI models available via API key (as of Jan 2026)
export const OPENAI_MODELS = [
  { value: 'gpt-5.2', label: 'GPT-5.2 (most intelligent)' },
  { value: 'gpt-5.1', label: 'GPT-5.1 (recommended)' },
  { value: 'gpt-5-mini', label: 'GPT-5 Mini (fast)' },
  { value: 'gpt-5-nano', label: 'GPT-5 Nano (fastest)' },
  { value: 'gpt-4.1', label: 'GPT-4.1' },
  { value: 'gpt-4o', label: 'GPT-4o (legacy)' },
];
