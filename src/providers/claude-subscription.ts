import { loadConfig, saveConfig } from '../core/config.js';
import { isClaudeTokenExpired, refreshClaudeToken } from '../core/oauth.js';
import type { AIProvider, ProviderConfig } from './base.js';
import { SYSTEM_PROMPT_EXPLAIN, SYSTEM_PROMPT_GENERATE } from './base.js';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
  error?: { message: string };
}

// Required prefix for Claude Code API (enforced by Anthropic)
const CLAUDE_CODE_PREFIX =
  "You are Claude Code, Anthropic's official CLI for Claude.";

// Claude Code beta features for OAuth authentication
const CLAUDE_CODE_BETAS = [
  'oauth-2025-04-20',
  'claude-code-20250219',
  'interleaved-thinking-2025-05-14',
  'fine-grained-tool-streaming-2025-05-14',
].join(',');

export class ClaudeSubscriptionProvider implements AIProvider {
  name = 'Claude (Subscription)';
  private model: string;
  private accessToken: string;
  private refreshToken: string;
  private expiresAt: number;

  constructor(config: ProviderConfig) {
    this.model = config.model;
    if (config.credentials.type === 'claude_subscription') {
      this.accessToken = config.credentials.accessToken;
      this.refreshToken = config.credentials.refreshToken;
      this.expiresAt = config.credentials.expiresAt;
    } else {
      throw new Error('Claude Subscription requires subscription credentials');
    }
  }

  private async ensureValidToken(): Promise<string> {
    if (isClaudeTokenExpired(this.expiresAt)) {
      try {
        const newTokens = await refreshClaudeToken(this.refreshToken);
        this.accessToken = newTokens.accessToken;
        this.refreshToken = newTokens.refreshToken;
        this.expiresAt = newTokens.expiresAt;

        // Update stored config with new tokens
        const currentConfig = loadConfig();
        const providerSettings =
          currentConfig?.providers['claude-subscription'];
        if (
          currentConfig &&
          providerSettings?.credentials.type === 'claude_subscription'
        ) {
          providerSettings.credentials.accessToken = newTokens.accessToken;
          providerSettings.credentials.refreshToken = newTokens.refreshToken;
          providerSettings.credentials.expiresAt = newTokens.expiresAt;
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
    const messages: AnthropicMessage[] = [
      { role: 'user', content: userMessage },
    ];

    // System prompt MUST be an array of content blocks for OAuth tokens
    // First block must be the Claude Code identity prefix
    const systemBlocks = [
      { type: 'text', text: CLAUDE_CODE_PREFIX },
      { type: 'text', text: systemPrompt },
    ];

    // Build headers exactly like Claude Code CLI
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-beta': CLAUDE_CODE_BETAS,
      'anthropic-dangerous-direct-browser-access': 'true',
      'user-agent': 'claude-cli/1.0.119 (external, cli)',
      'x-app': 'cli',
      accept: 'application/json',
    };

    const response = await fetch(
      'https://api.anthropic.com/v1/messages?beta=true',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1024,
          system: systemBlocks,
          messages,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 401) {
        throw new Error(
          'Authentication failed. Please re-authenticate with: b --auth',
        );
      }
      throw new Error(`Claude API error: ${response.status} - ${error}`);
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
      const token = await this.ensureValidToken();

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': CLAUDE_CODE_BETAS,
        'anthropic-dangerous-direct-browser-access': 'true',
        'user-agent': 'claude-cli/1.0.119 (external, cli)',
        'x-app': 'cli',
        accept: 'application/json',
      };

      const response = await fetch(
        'https://api.anthropic.com/v1/messages?beta=true',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: this.model,
            max_tokens: 10,
            system: [{ type: 'text', text: CLAUDE_CODE_PREFIX }],
            messages: [{ role: 'user', content: 'hi' }],
          }),
        },
      );
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Latest Claude models available with Pro/Max subscription (as of Jan 2026)
export const CLAUDE_SUBSCRIPTION_MODELS = [
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
  { value: 'claude-opus-4-20250514', label: 'Claude Opus 4 (Max plan only)' },
];
