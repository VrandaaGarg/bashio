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
