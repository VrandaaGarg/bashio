import { loadConfig, saveConfig } from '../core/config.js';
import {
  COPILOT_OAUTH_CONFIG,
  exchangeGitHubTokenForCopilot,
  isCopilotTokenExpired,
  parseCopilotToken,
} from '../core/oauth.js';
import type { AIProvider, ProviderConfig } from './base.js';
import { SYSTEM_PROMPT_EXPLAIN, SYSTEM_PROMPT_GENERATE } from './base.js';

// Streaming chunk format from Copilot API
interface StreamChunk {
  choices?: Array<{
    delta: {
      content?: string;
    };
    finish_reason?: string;
  }>;
}

export class CopilotProvider implements AIProvider {
  name = 'GitHub Copilot';
  private model: string;
  private githubToken: string;
  private copilotToken: string;
  private copilotTokenExpiresAt: number;
  private apiEndpoint: string;

  constructor(config: ProviderConfig) {
    this.model = config.model;
    if (config.credentials.type === 'copilot') {
      this.githubToken = config.credentials.githubToken;
      this.copilotToken = config.credentials.copilotToken;
      this.copilotTokenExpiresAt = config.credentials.copilotTokenExpiresAt;
      this.apiEndpoint = this.normalizeEndpoint(
        config.credentials.apiEndpoint || COPILOT_OAUTH_CONFIG.apiEndpoint,
      );
    } else {
      throw new Error('Copilot requires copilot credentials');
    }
  }

  private normalizeEndpoint(endpoint: string): string {
    let url = endpoint;
    // Add https:// if missing
    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }
    // Convert proxy subdomain to api subdomain
    url = url.replace(/\/\/proxy\./i, '//api.');
    // Append /chat/completions if not present
    if (!url.includes('/chat/completions')) {
      url = `${url}/chat/completions`;
    }
    return url;
  }

  private async ensureValidToken(): Promise<string> {
    if (isCopilotTokenExpired(this.copilotTokenExpiresAt)) {
      try {
        const newTokenData = await exchangeGitHubTokenForCopilot(
          this.githubToken,
        );
        this.copilotToken = newTokenData.token;

        const parsed = parseCopilotToken(newTokenData.token);
        this.copilotTokenExpiresAt = parsed.expiresAt;
        this.apiEndpoint = parsed.apiEndpoint;

        // Update stored config with new Copilot token
        const currentConfig = loadConfig();
        const providerSettings = currentConfig?.providers.copilot;
        if (currentConfig && providerSettings?.credentials.type === 'copilot') {
          providerSettings.credentials.copilotToken = newTokenData.token;
          providerSettings.credentials.copilotTokenExpiresAt = parsed.expiresAt;
          providerSettings.credentials.apiEndpoint = parsed.apiEndpoint;
          saveConfig(currentConfig);
        }
      } catch (error) {
        throw new Error(
          `Copilot token refresh failed. Please re-authenticate with: b --auth\n` +
            `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
    return this.copilotToken;
  }

  private async call(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    const token = await this.ensureValidToken();

    const requestBody = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.1,
      top_p: 1,
      n: 1,
      stream: true,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'GitHubCopilotChat/0.35.0',
      'Editor-Version': 'vscode/1.107.0',
      'Editor-Plugin-Version': 'copilot-chat/0.35.0',
      'Copilot-Integration-Id': 'vscode-chat',
    };

    const response = await fetch(this.apiEndpoint, {
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
          'Access forbidden. Please ensure you have an active GitHub Copilot subscription.',
        );
      }
      throw new Error(`Copilot API error: ${response.status} - ${errorText}`);
    }

    return this.parseStreamingResponse(response);
  }

  private async parseStreamingResponse(response: Response): Promise<string> {
    if (!response.body) {
      throw new Error('No response body from Copilot');
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

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data:')) continue;

          const data = line.substring(5).trim();

          if (data === '[DONE]') {
            return fullText.trim();
          }

          try {
            const chunk = JSON.parse(data) as StreamChunk;
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
            }
          } catch {
            // Skip malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (!fullText) {
      throw new Error('No response content from Copilot');
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
    try {
      const token = await this.ensureValidToken();
      return !!token && token.length > 0;
    } catch {
      return false;
    }
  }
}

// Models available with GitHub Copilot (as of Jan 2026)
// Based on GitHub's supported models documentation
export const COPILOT_MODELS = [
  { value: 'gpt-4.1', label: 'GPT-4.1 (default)' },
  { value: 'gpt-5.1', label: 'GPT-5.1 (latest)' },
  { value: 'gpt-5-mini', label: 'GPT-5 Mini (fast)' },
  { value: 'claude-sonnet-4', label: 'Claude Sonnet 4' },
  { value: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5 (latest)' },
  { value: 'gpt-4o', label: 'GPT-4o' },
];
