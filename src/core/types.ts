import { z } from 'zod';

export const ProviderName = z.enum([
  'claude',
  'claude-subscription',
  'openai',
  'chatgpt-subscription',
  'copilot',
  'ollama',
  'openrouter',
]);
export type ProviderName = z.infer<typeof ProviderName>;

export const SessionCredentials = z.object({
  type: z.literal('session'),
  sessionToken: z.string(),
});

export const ApiKeyCredentials = z.object({
  type: z.literal('api_key'),
  apiKey: z.string(),
});

export const LocalCredentials = z.object({
  type: z.literal('local'),
  host: z.string().default('http://localhost:11434'),
});

export const ClaudeSubscriptionCredentials = z.object({
  type: z.literal('claude_subscription'),
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(), // Unix timestamp in ms
  email: z.string().optional(),
});

export const ChatGPTSubscriptionCredentials = z.object({
  type: z.literal('chatgpt_subscription'),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number().optional(), // Unix timestamp in ms
  accountId: z.string().optional(), // ChatGPT account ID for API requests
});

export const CopilotCredentials = z.object({
  type: z.literal('copilot'),
  githubToken: z.string(), // GitHub OAuth access token (gho_xxx)
  copilotToken: z.string(), // Copilot API token (short-lived)
  copilotTokenExpiresAt: z.number(), // Unix timestamp in ms
  apiEndpoint: z.string().optional(), // Derived from token (api.individual/business.githubcopilot.com)
});

export const Credentials = z.discriminatedUnion('type', [
  SessionCredentials,
  ApiKeyCredentials,
  LocalCredentials,
  ClaudeSubscriptionCredentials,
  ChatGPTSubscriptionCredentials,
  CopilotCredentials,
]);
export type Credentials = z.infer<typeof Credentials>;

export const Settings = z.object({
  confirmBeforeExecute: z.boolean().default(true),
  historyEnabled: z.boolean().default(true),
  historyRetentionDays: z.number().default(30),
  historyMaxEntries: z.number().default(2000),
  autoConfirmShortcuts: z.boolean().default(false),
});
export type Settings = z.infer<typeof Settings>;

// V1 Config (legacy, for migration)
export const ConfigV1 = z.object({
  version: z.literal(1).default(1),
  provider: ProviderName,
  model: z.string(),
  credentials: Credentials,
  settings: Settings.optional(),
});
export type ConfigV1 = z.infer<typeof ConfigV1>;

// Provider-specific config stored in providers object
export const ProviderSettings = z.object({
  model: z.string(),
  credentials: Credentials,
});
export type ProviderSettings = z.infer<typeof ProviderSettings>;

// V2 Config (multi-provider support)
export const ConfigV2 = z.object({
  version: z.literal(2),
  activeProvider: ProviderName,
  providers: z.record(z.string(), ProviderSettings),
  settings: Settings.optional(),
});
export type ConfigV2 = Omit<z.infer<typeof ConfigV2>, 'providers'> & {
  providers: Partial<Record<ProviderName, ProviderSettings>>;
};

// Union type for loading
export const Config = z.union([ConfigV2, ConfigV1]);
export type Config = z.infer<typeof Config>;

export interface CommandResult {
  command: string;
  success: boolean;
}

export interface ExplanationResult {
  explanation: string;
}

// Shortcuts types
export const ShortcutDefinition = z.object({
  template: z.string(),
  args: z.array(z.string()).default([]),
  description: z.string().optional(),
});
export type ShortcutDefinition = z.infer<typeof ShortcutDefinition>;

export const ShortcutsFile = z.object({
  version: z.number().default(1),
  shortcuts: z.record(z.string(), ShortcutDefinition),
});
export type ShortcutsFile = z.infer<typeof ShortcutsFile>;

export interface ResolvedShortcut {
  name: string;
  command: string;
  source: 'shortcut';
}

// History types
export const CommandSource = z.enum(['ai', 'shortcut']);
export type CommandSource = z.infer<typeof CommandSource>;

export const HistoryEntry = z.object({
  id: z.number(),
  query: z.string(),
  command: z.string(),
  source: CommandSource,
  workingDirectory: z.string(),
  executed: z.number(),
  exitCode: z.number().nullable(),
  createdAt: z.string(),
});
export type HistoryEntry = z.infer<typeof HistoryEntry>;

export const QueryStats = z.object({
  id: z.number(),
  query: z.string(),
  command: z.string(),
  source: CommandSource,
  useCount: z.number(),
  successCount: z.number(),
  suggested: z.number(),
  firstUsed: z.string(),
  lastUsed: z.string(),
});
export type QueryStats = z.infer<typeof QueryStats>;

export interface HistoryStats {
  totalCommands: number;
  todayCommands: number;
  thisWeekCommands: number;
  totalExecuted: number;
  executionRate: number;
  aiCount: number;
  shortcutCount: number;
  topQueries: Array<{ query: string; useCount: number; source: string }>;
}

export interface ShortcutSuggestion {
  query: string;
  command: string;
  useCount: number;
  suggestedName: string;
}
