import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ProviderName } from '../../core/types.js';
import type { ChatMessage } from '../../providers/base.js';

export interface SessionMeta {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  model: string;
  provider: ProviderName;
}

export interface Session extends SessionMeta {
  messages: ChatMessage[];
}

const MAX_SESSIONS = 50;

function getSessionsDir(): string {
  const dir = join(homedir(), '.bashio', 'sessions');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getSessionPath(id: string): string {
  return join(getSessionsDir(), `${id}.json`);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function generateTitle(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find((m) => m.role === 'user');
  if (!firstUserMsg) return 'New Chat';

  const content = firstUserMsg.content.trim();
  if (content.length <= 50) return content;
  return `${content.slice(0, 47)}...`;
}

export function listSessions(): SessionMeta[] {
  const dir = getSessionsDir();
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));

  const sessions: SessionMeta[] = [];

  for (const file of files) {
    try {
      const content = readFileSync(join(dir, file), 'utf-8');
      const session = JSON.parse(content) as Session;
      sessions.push({
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session.messages.length,
        model: session.model,
        provider: session.provider,
      });
    } catch {
      // Skip corrupted files
    }
  }

  // Sort by updatedAt descending (most recent first)
  return sessions.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function loadSession(id: string): Session | null {
  const path = getSessionPath(id);
  if (!existsSync(path)) return null;

  try {
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  const path = getSessionPath(session.id);

  // Update title if we have messages and title is default
  if (session.messages.length > 0 && session.title === 'New Chat') {
    session.title = generateTitle(session.messages);
  }

  session.updatedAt = new Date().toISOString();
  session.messageCount = session.messages.length;

  writeFileSync(path, JSON.stringify(session, null, 2));

  // Cleanup old sessions
  cleanupOldSessions();
}

export function createSession(model: string, provider: ProviderName): Session {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: 'New Chat',
    createdAt: now,
    updatedAt: now,
    messageCount: 0,
    model,
    provider,
    messages: [],
  };
}

export function deleteSession(id: string): boolean {
  const path = getSessionPath(id);
  if (!existsSync(path)) return false;

  try {
    unlinkSync(path);
    return true;
  } catch {
    return false;
  }
}

function cleanupOldSessions(): void {
  const sessions = listSessions();

  if (sessions.length <= MAX_SESSIONS) return;

  // Delete oldest sessions beyond limit
  const toDelete = sessions.slice(MAX_SESSIONS);
  for (const session of toDelete) {
    deleteSession(session.id);
  }
}
