import type { AIProvider, ProviderConfig } from './base.js';
import { SYSTEM_PROMPT_EXPLAIN, SYSTEM_PROMPT_GENERATE } from './base.js';

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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
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
}

export const OPENAI_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o (recommended)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (fast)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
];
