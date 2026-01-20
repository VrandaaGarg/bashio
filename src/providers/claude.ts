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

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
  error?: { message: string };
}

export class ClaudeProvider implements AIProvider {
  name = 'Claude';
  private model: string;
  private apiKey: string;

  constructor(config: ProviderConfig) {
    this.model = config.model;
    if (config.credentials.type === 'api_key') {
      this.apiKey = config.credentials.apiKey;
    } else if (config.credentials.type === 'session') {
      this.apiKey = config.credentials.sessionToken;
    } else {
      throw new Error('Claude requires API key or session token');
    }
  }

  private async call(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    const messages: AnthropicMessage[] = [
      { role: 'user', content: userMessage },
    ];

    let response: Response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        }),
      });
    } catch (error) {
      if (isFetchError(error)) {
        throw createNetworkError(error, 'Claude');
      }
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw createHttpError({
        provider: 'Claude',
        model: this.model,
        status: response.status,
        errorText,
      });
    }

    const data = (await response.json()) as AnthropicResponse;

    if (data.error) {
      throw new Error(`Claude API error: ${data.error.message}`);
    }

    const textContent = data.content.find((c) => c.type === 'text');
    if (!textContent) {
      throw new Error('No text response from Claude');
    }

    return textContent.text.trim();
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
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'hi' }],
        }),
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
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          system: SYSTEM_PROMPT_CHAT,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
        }),
        signal,
      });
    } catch (error) {
      if (isFetchError(error)) {
        throw createNetworkError(error, 'Claude');
      }
      throw error;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw createHttpError({
        provider: 'Claude',
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
              type: string;
              delta?: { type: string; text?: string };
            };
            if (
              data.type === 'content_block_delta' &&
              data.delta?.type === 'text_delta' &&
              data.delta?.text
            ) {
              onChunk(data.delta.text);
            }
          } catch {
            // Ignore parse errors for incomplete JSON
          }
        }
      }
    }
  }
}

// Latest Claude models available via API key (as of Jan 2026)
export const CLAUDE_MODELS = [
  {
    value: 'claude-opus-4-5-20251101',
    label: 'Claude Opus 4.5 (most intelligent)',
  },
  {
    value: 'claude-sonnet-4-5-20250929',
    label: 'Claude Sonnet 4.5 (recommended)',
  },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (fast)' },
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
];
