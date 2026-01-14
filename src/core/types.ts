import { z } from 'zod';

export const ProviderName = z.enum([
  'claude',
  'openai',
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

export const Credentials = z.discriminatedUnion('type', [
  SessionCredentials,
  ApiKeyCredentials,
  LocalCredentials,
]);
export type Credentials = z.infer<typeof Credentials>;

export const Settings = z.object({
  confirmBeforeExecute: z.boolean().default(true),
  historyEnabled: z.boolean().default(true),
  historyRetentionDays: z.number().default(30),
  historyMaxEntries: z.number().default(2000),
});
export type Settings = z.infer<typeof Settings>;

export const Config = z.object({
  version: z.number().default(1),
  provider: ProviderName,
  model: z.string(),
  credentials: Credentials,
  settings: Settings.optional(),
});
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
