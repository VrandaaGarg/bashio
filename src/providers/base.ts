import type { Credentials } from '../core/types.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  name: string;
  generateCommand(query: string, context?: string): Promise<string>;
  explainCommand(command: string): Promise<string>;
  validateCredentials(): Promise<boolean>;
  streamChat?(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal,
  ): Promise<void>;
}

export interface ProviderConfig {
  model: string;
  credentials: Credentials;
}

export const SYSTEM_PROMPT_GENERATE = `You are a shell command generator for macOS/Linux terminals.
Given a natural language description, return ONLY the shell command.
Rules:
- Return ONLY the raw command, nothing else
- No markdown formatting, no backticks, no explanation
- No "Here's the command:" or similar prefixes
- If multiple commands are needed, chain them with && or ;
- Use common Unix utilities (find, grep, awk, sed, curl, etc.)
- Prefer simple, portable commands over complex ones`;

export const SYSTEM_PROMPT_EXPLAIN = `You are a shell command expert.
Explain the given shell command in simple terms.
Break down each part of the command concisely.
Format as a simple list without markdown.`;

export const SYSTEM_PROMPT_CHAT = `You are a helpful AI assistant for terminal users.
You help with shell commands, programming, system administration, and general questions.
When providing code examples, use markdown code blocks with the appropriate language.
Be concise but thorough in your explanations.`;
