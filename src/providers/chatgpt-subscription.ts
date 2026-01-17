import { loadConfig, saveConfig } from '../core/config.js';
import {
  CHATGPT_OAUTH_CONFIG,
  extractAccountIdFromToken,
  refreshChatGPTToken,
} from '../core/oauth.js';
import type { AIProvider, ProviderConfig } from './base.js';
import { SYSTEM_PROMPT_EXPLAIN, SYSTEM_PROMPT_GENERATE } from './base.js';

// Codex backend API message format (input must be array of messages)
interface CodexInputMessage {
  type: 'message';
  role: 'user' | 'assistant';
  content: Array<{ type: 'input_text'; text: string }>;
}

// Codex backend API request format
interface CodexRequest {
  model: string;
  instructions: string;
  input: CodexInputMessage[];
  store: boolean;
  stream: boolean;
}

// Codex streaming chunk format
interface StreamChunk {
  type?: string;
  delta?: string;
  item?: {
    content?: Array<{
      type: string;
      text?: string;
    }>;
  };
  choices?: Array<{
    delta: {
      content?: string;
    };
  }>;
}

export class ChatGPTSubscriptionProvider implements AIProvider {
  name = 'ChatGPT (Subscription)';
  private model: string;
  private accessToken: string;
  private refreshToken: string | undefined;
  private expiresAt: number | undefined;
  private accountId: string | undefined;

  constructor(config: ProviderConfig) {
    this.model = config.model;
    if (config.credentials.type === 'chatgpt_subscription') {
      this.accessToken = config.credentials.accessToken;
      this.refreshToken = config.credentials.refreshToken;
      this.expiresAt = config.credentials.expiresAt;
      this.accountId = config.credentials.accountId;

      // Try to extract account ID if not stored
      if (!this.accountId) {
        this.accountId = extractAccountIdFromToken(this.accessToken);
      }
    } else {
      throw new Error('ChatGPT Subscription requires subscription credentials');
    }
  }

  private isTokenExpired(): boolean {
    if (!this.expiresAt) return false;
    const bufferMs = 5 * 60 * 1000; // 5 minutes buffer
    return Date.now() >= this.expiresAt - bufferMs;
  }

  private async ensureValidToken(): Promise<string> {
    if (this.isTokenExpired() && this.refreshToken) {
      try {
        const newTokens = await refreshChatGPTToken(this.refreshToken);
        this.accessToken = newTokens.accessToken;
        this.refreshToken = newTokens.refreshToken || this.refreshToken;
        this.expiresAt = newTokens.expiresAt || this.expiresAt;

        // Update account ID from new token
        if (newTokens.accountId) {
          this.accountId = newTokens.accountId;
        } else if (!this.accountId) {
          this.accountId = extractAccountIdFromToken(this.accessToken);
        }

        // Update stored config with new tokens
        const currentConfig = loadConfig();
        const providerSettings =
          currentConfig?.providers['chatgpt-subscription'];
        if (
          currentConfig &&
          providerSettings?.credentials.type === 'chatgpt_subscription'
        ) {
          providerSettings.credentials.accessToken = newTokens.accessToken;
          if (newTokens.refreshToken) {
            providerSettings.credentials.refreshToken = newTokens.refreshToken;
          }
          if (newTokens.expiresAt) {
            providerSettings.credentials.expiresAt = newTokens.expiresAt;
          }
          if (this.accountId) {
            providerSettings.credentials.accountId = this.accountId;
          }
          saveConfig(currentConfig);
        }
      } catch (error) {
        throw new Error(
          `Token refresh failed. Please re-authenticate with: b --auth\n` +
            `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
    return this.accessToken;
  }

  private async call(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    const token = await this.ensureValidToken();

    // Build request for Codex backend API
    // Input must be an array of message objects with content as array
    // Codex API REQUIRES stream: true
    const requestBody: CodexRequest = {
      model: this.model,
      instructions: systemPrompt,
      input: [
        {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: userMessage }],
        },
      ],
      store: false,
      stream: true,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'OpenAI-Beta': 'responses=experimental',
      originator: 'bashio',
    };

    // Add account ID if available (ChatGPT-Account-Id header for organization subscriptions)
    if (this.accountId) {
      headers['ChatGPT-Account-Id'] = this.accountId;
    }

    const response = await fetch(CHATGPT_OAUTH_CONFIG.apiEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 401) {
        throw new Error(
          'Authentication failed. Please re-authenticate with: b --auth',
        );
      }
      if (response.status === 403) {
        throw new Error(
          'Access forbidden. Your ChatGPT subscription may not have access to this model.\n' +
            `Error: ${errorText}`,
        );
      }
      throw new Error(`ChatGPT API error: ${response.status} - ${errorText}`);
    }

    // Parse SSE streaming response
    return this.parseStreamingResponse(response);
  }

  private async parseStreamingResponse(response: Response): Promise<string> {
    if (!response.body) {
      throw new Error('No response body from ChatGPT');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data:')) continue;

          const data = line.substring(5).trim();

          // Check for end signal
          if (data === '[DONE]') {
            return fullText.trim();
          }

          try {
            const chunk = JSON.parse(data) as StreamChunk;

            // Handle text delta events only (avoid double-counting from .done events)
            if (chunk.type === 'response.output_text.delta' && chunk.delta) {
              fullText += chunk.delta;
            } else if (chunk.choices?.[0]?.delta?.content) {
              // Standard OpenAI streaming format fallback
              fullText += chunk.choices[0].delta.content;
            }
          } catch {
            // Skip malformed JSON chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!fullText) {
      throw new Error('No response content from ChatGPT');
    }

    return fullText.trim();
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
    // Skip heavy API validation for Codex - just verify we have a token
    // The Codex backend API doesn't have a lightweight validation endpoint
    // Real validation happens on first actual API call
    try {
      const token = await this.ensureValidToken();
      // Basic check: token exists and is not empty
      return !!token && token.length > 0;
    } catch {
      return false;
    }
  }
}

// Models available with ChatGPT Plus/Pro subscription via Codex OAuth (as of Jan 2026)
// Note: Only specific models are allowed with Codex OAuth - see opencode plugin
export const CHATGPT_SUBSCRIPTION_MODELS = [
  { value: 'gpt-5.2-codex', label: 'GPT-5.2-Codex (recommended for coding)' },
  { value: 'gpt-5.2', label: 'GPT-5.2 (most intelligent)' },
  { value: 'gpt-5.1-codex-max', label: 'GPT-5.1-Codex-Max (long tasks)' },
  { value: 'gpt-5.1-codex-mini', label: 'GPT-5.1-Codex-Mini (fast)' },
  { value: 'o4-mini', label: 'o4-mini (reasoning)' },
  { value: 'gpt-4o', label: 'GPT-4o (legacy)' },
];
