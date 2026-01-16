# Shellio - Implementation Guide

## Overview

Shellio is a CLI tool that converts natural language to shell commands. This document explains the implementation architecture and core components.

---

## Project Structure

```
shellio/
├── src/
│   ├── index.ts              # Entry point (runs CLI)
│   ├── cli/
│   │   ├── index.ts          # Clipanion CLI setup & command registration
│   │   └── commands/
│   │       ├── DefaultCommand.ts     # Main command (s <query>)
│   │       ├── AuthCommand.ts        # s --auth
│   │       ├── ConfigCommand.ts      # s --config
│   │       ├── ModelCommand.ts       # s --model
│   │       ├── ShortcutsCommand.ts   # s --shortcuts
│   │       ├── AddShortcutCommand.ts # s --add-shortcut
│   │       ├── RemoveShortcutCommand.ts  # s --remove-shortcut
│   │       ├── EditShortcutsCommand.ts   # s --edit-shortcuts
│   │       ├── HistoryCommand.ts     # s --history
│   │       ├── StatsCommand.ts       # s --stats
│   │       ├── ClearHistoryCommand.ts    # s --clear-history
│   │       └── SuggestShortcutsCommand.ts # s --suggest-shortcuts
│   ├── core/
│   │   ├── config.ts         # Config file management
│   │   ├── database.ts       # SQLite database setup
│   │   ├── history.ts        # History CRUD operations
│   │   ├── learning.ts       # Shortcut suggestions
│   │   ├── shortcuts.ts      # Shortcut management
│   │   ├── executor.ts       # Shell command executor
│   │   └── types.ts          # Zod schemas and TypeScript types
│   ├── providers/
│   │   ├── index.ts          # Provider factory
│   │   ├── base.ts           # Base interface and system prompts
│   │   ├── claude.ts         # Anthropic Claude provider
│   │   ├── openai.ts         # OpenAI GPT provider
│   │   ├── ollama.ts         # Local Ollama provider
│   │   └── openrouter.ts     # OpenRouter multi-model provider
│   └── utils/
│       ├── logger.ts         # Colored console output
│       ├── spinner.ts        # Loading spinner
│       ├── clipboard.ts      # Copy to clipboard
│       ├── table.ts          # Table rendering
│       ├── danger.ts         # Dangerous command detection
│       └── danger-ui.ts      # Danger warning UI
├── dist/                     # Compiled output
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── biome.json
```

---

## Core Components

### 1. Entry Point (`src/index.ts`)

Minimal entry that imports and runs the CLI:

```typescript
#!/usr/bin/env node
import { cli } from './cli/index.js';

cli.runExit(process.argv.slice(2));
```

### 2. CLI Setup (`src/cli/index.ts`)

Initializes Clipanion CLI and registers all commands:

```typescript
import { Builtins, Cli } from 'clipanion';
import { initDatabase } from '../core/database.js';
import { cleanupHistory, shouldRunCleanup } from '../core/history.js';

// Initialize database on startup
initDatabase();

// Run cleanup if needed (once per day)
if (shouldRunCleanup()) {
  cleanupHistory({ retentionDays: 30, maxEntries: 2000 });
}

const cli = new Cli({
  binaryLabel: 'Shellio',
  binaryName: 's',
  binaryVersion: '0.4.0',
});

cli.register(DefaultCommand);
cli.register(AuthCommand);
// ... register all commands
cli.register(Builtins.HelpCommand);
cli.register(Builtins.VersionCommand);

export { cli };
```

### 3. Config Management (`src/core/config.ts`)

Manages `~/.shellio/config.json`:

```typescript
const CONFIG_DIR = join(homedir(), '.shellio');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  }
}

export function loadConfig(): Config | null {
  if (!configExists()) return null;
  const raw = readFileSync(CONFIG_FILE, 'utf-8');
  const data = JSON.parse(raw);
  return Config.parse(data);  // Zod validation
}

export function saveConfig(config: Config): void {
  ensureConfigDir();
  const data = JSON.stringify(config, null, 2);
  writeFileSync(CONFIG_FILE, data, { encoding: 'utf-8', mode: 0o600 });
}
```

### 4. AI Providers (`src/providers/`)

All providers implement the `AIProvider` interface:

```typescript
// src/providers/base.ts
export interface AIProvider {
  name: string;
  generateCommand(query: string, context?: string): Promise<string>;
  explainCommand(command: string): Promise<string>;
  validateCredentials(): Promise<boolean>;
}

export const SYSTEM_PROMPT_GENERATE = `You are a shell command generator...
Given a natural language description, return ONLY the shell command.
Rules:
- Return ONLY the raw command, nothing else
- No markdown formatting, no backticks, no explanation
...`;
```

**Provider Factory:**

```typescript
// src/providers/index.ts
export function createProvider(config: Config): AIProvider {
  switch (config.provider) {
    case 'claude':
      return new ClaudeProvider({ model: config.model, credentials: config.credentials });
    case 'openai':
      return new OpenAIProvider({ model: config.model, credentials: config.credentials });
    case 'ollama':
      return new OllamaProvider({ model: config.model, credentials: config.credentials });
    case 'openrouter':
      return new OpenRouterProvider({ model: config.model, credentials: config.credentials });
  }
}
```

**Example Provider (Claude):**

```typescript
// src/providers/claude.ts
export class ClaudeProvider implements AIProvider {
  name = 'Claude';
  
  async generateCommand(query: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT_GENERATE,
        messages: [{ role: 'user', content: query }],
      }),
    });
    // ... parse response
  }
}
```

### 5. Command Executor (`src/core/executor.ts`)

Executes shell commands using `child_process.spawn`:

```typescript
import { spawn } from 'node:child_process';

export function executeCommand(command: string): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const shell = process.platform === 'win32' ? 'cmd' : '/bin/sh';
    const shellArg = process.platform === 'win32' ? '/c' : '-c';

    const child = spawn(shell, [shellArg, command], {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: process.cwd(),
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    // Stream output to terminal
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}
```

### 6. Default Command (`src/cli/commands/DefaultCommand.ts`)

Main command handling natural language → shell command flow:

```typescript
export class DefaultCommand extends Command {
  static paths = [Command.Default];
  query = Option.Rest({ required: 0 });

  async execute(): Promise<number> {
    // 1. Check if it's a shortcut
    const shortcut = await tryResolveShortcut(this.query);
    if (shortcut) {
      return this.executeWithConfirmation(shortcut.command, 'shortcut', context);
    }

    // 2. Not a shortcut, use AI provider
    const config = loadConfig();
    const provider = createProvider(config);
    const spinner = createSpinner('Generating command...').start();
    
    const generatedCommand = await provider.generateCommand(queryText);
    spinner.stop();

    // 3. Record to history
    const historyId = recordCommand({ query, command, source: 'ai' });

    // 4. Show and confirm
    return this.executeWithConfirmation(generatedCommand, 'ai', context);
  }

  private async executeWithConfirmation(command: string, source: string, context: ExecutionContext) {
    logger.command(command);
    
    const action = await this.promptConfirmation();  // y/n/e/c/edit
    
    if (action === 'explain') {
      const explanation = await provider.explainCommand(command);
      console.log(explanation);
    }
    
    if (action === 'edit') {
      command = await editor({ default: command });
    }
    
    if (action === 'copy') {
      await copyToClipboard(command);
      return 0;
    }
    
    if (action === 'yes') {
      // Check for dangerous commands
      const danger = detectDangerousShellCommand(command);
      if (danger) {
        const confirmed = await this.promptDangerConfirmation(command, danger.reasons);
        if (!confirmed) return 0;
      }
      
      // Execute
      const result = await executeCommand(command);
      markExecuted(context.historyId, result.exitCode);
      return result.exitCode;
    }
    
    return 0;
  }
}
```

### 7. Shortcuts (`src/core/shortcuts.ts`)

```typescript
export async function tryResolveShortcut(queryParts: string[]): Promise<ResolvedShortcut | null> {
  const shortcutName = queryParts[0];
  const shortcut = getShortcut(shortcutName);
  
  if (!shortcut) return null;
  
  // Parse arguments
  const requiredArgs = shortcut.args || [];
  const providedArgs = queryParts.slice(1);
  
  // Prompt for missing args
  if (providedArgs.length < requiredArgs.length) {
    for (let i = providedArgs.length; i < requiredArgs.length; i++) {
      const value = await input({ message: `Enter ${requiredArgs[i]}:` });
      providedArgs.push(value);
    }
  }
  
  // Fill template
  let command = shortcut.template;
  for (let i = 0; i < requiredArgs.length; i++) {
    command = command.replace(`{{${requiredArgs[i]}}}`, providedArgs[i]);
  }
  
  return { name: shortcutName, command, source: 'shortcut' };
}
```

### 8. History Tracking (`src/core/history.ts`)

```typescript
export function recordCommand(data: {
  query: string;
  command: string;
  source: 'ai' | 'shortcut';
}): number {
  const db = getDatabase();
  
  // Insert into history table
  const result = db.prepare(
    `INSERT INTO history (query, command, source, working_directory, executed, created_at) 
     VALUES (?, ?, ?, ?, 0, ?)`
  ).run(data.query, data.command, data.source, process.cwd(), new Date().toISOString());

  // Update query_stats (keyed by COMMAND)
  const existing = db.prepare('SELECT id FROM query_stats WHERE command = ?').get(data.command);
  
  if (existing) {
    db.prepare('UPDATE query_stats SET use_count = use_count + 1, last_used = ? WHERE command = ?')
      .run(new Date().toISOString(), data.command);
  } else {
    db.prepare('INSERT INTO query_stats (command, source, use_count, first_used, last_used) VALUES (?, ?, 1, ?, ?)')
      .run(data.command, data.source, new Date().toISOString(), new Date().toISOString());
  }

  return result.lastInsertRowid as number;
}

export function markExecuted(historyId: number, exitCode: number): void {
  const db = getDatabase();
  db.prepare('UPDATE history SET executed = 1, exit_code = ? WHERE id = ?').run(exitCode, historyId);
  
  if (exitCode === 0) {
    const row = db.prepare('SELECT command FROM history WHERE id = ?').get(historyId);
    if (row) {
      db.prepare('UPDATE query_stats SET success_count = success_count + 1 WHERE command = ?')
        .run(row.command);
    }
  }
}
```

### 9. Danger Detection (`src/utils/danger.ts`)

```typescript
const DANGEROUS_PATTERNS = [
  { pattern: /rm\s+(-[rf]+\s+)*\//, reasons: ['Deletes from root directory'] },
  { pattern: /rm\s+-rf/, reasons: ['Recursive force delete'] },
  { pattern: /sudo/, reasons: ['Runs with root privileges'] },
  { pattern: />\s*\/dev\/(sda|hd|nvme)/, reasons: ['Writes to disk device'] },
  // ... more patterns
];

export function detectDangerousShellCommand(command: string): DangerResult | null {
  const reasons: string[] = [];
  
  for (const { pattern, reasons: patternReasons } of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      reasons.push(...patternReasons);
    }
  }
  
  return reasons.length > 0 ? { isDangerous: true, reasons } : null;
}
```

---

## User Flow

```
$ s find large files

1. Parse query via Clipanion
2. Check shortcuts.json for "find" shortcut
   → Not found, continue to AI
3. Load config from ~/.shellio/config.json
4. Create AI provider instance (Claude/OpenAI/etc)
5. Show spinner "Generating command..."
6. Call AI API with query
7. Clean response (remove markdown, backticks)
8. Record to history.db
9. Display: "> find . -size +100M -type f"
10. Prompt: "Execute? (y/n/e/c/edit)"
    - y: Execute command
    - n: Cancel
    - e: Get explanation from AI
    - c: Copy to clipboard
    - edit: Open in $EDITOR
11. If dangerous command detected, require explicit confirmation
12. Execute via child_process.spawn
13. Stream stdout/stderr to terminal
14. Update history with exit code
15. Show exit code and return
```

---

## Building & Running

```bash
# Install dependencies
pnpm install

# Development (watch mode)
pnpm dev

# Build for production
pnpm build

# Run locally
node dist/index.js find large files

# Link globally
pnpm link --global

# Now use anywhere
s find all png files
```

---

## Key Design Decisions

### 1. Shortcut Priority Over AI

First word is checked against shortcuts before querying AI. This ensures:
- Instant response for shortcuts (no API call)
- Predictable behavior
- User can "override" AI with custom shortcuts

### 2. History Keyed by Command

The `query_stats` table uses `command` as unique key, not `query`. This means:
- Typos don't create separate entries
- Synonyms are counted together
- Accurate usage tracking for shortcut suggestions

### 3. Synchronous SQLite

Using `better-sqlite3` with synchronous API because:
- CLI tools are inherently synchronous
- Simpler code (no async/await for DB)
- Faster for small operations
- No race conditions

### 4. Confirmation by Default

Every command requires confirmation to:
- Prevent accidental execution
- Allow review before running
- Enable explain/edit/copy options
- Extra safety for dangerous commands

### 5. Local-First

All data stored locally:
- Privacy (no telemetry)
- Works offline (with Ollama)
- User owns their data
- No accounts needed
