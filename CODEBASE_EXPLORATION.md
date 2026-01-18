# Bashio Codebase Exploration

## Overview
Bashio is a CLI tool that converts natural language to shell commands using AI providers. It uses **Clipanion** (v4.0.0-rc.4) for CLI command management and supports multiple AI providers (Claude, OpenAI, Copilot, Ollama, etc.).

---

## 1. CLI Structure & Clipanion Setup

### Entry Point
**File**: `/Users/ayush/Coding/WebSite/bashio/src/index.ts`
```typescript
import { cli } from './cli/index.js';

const args = process.argv.slice(2);
cli.runExit(args);
```

### CLI Initialization
**File**: `/Users/ayush/Coding/WebSite/bashio/src/cli/index.ts`

Key setup:
```typescript
import { Builtins, Cli } from 'clipanion';

const cli = new Cli({
  binaryLabel: 'Bashio',
  binaryName: 'b',
  binaryVersion: pkg.version,
});

// Register all commands
cli.register(DefaultCommand);
cli.register(AuthCommand);
cli.register(ConfigCommand);
cli.register(ModelCommand);
cli.register(ShortcutsCommand);
cli.register(AddShortcutCommand);
cli.register(RemoveShortcutCommand);
cli.register(EditShortcutsCommand);
cli.register(HistoryCommand);
cli.register(StatsCommand);
cli.register(ClearHistoryCommand);
cli.register(SuggestShortcutsCommand);
cli.register(Builtins.HelpCommand);
cli.register(Builtins.VersionCommand);

export { cli };
```

**Features**:
- Update notifier checks for new versions (cached 1 day)
- Database initialization on startup
- History cleanup runs once per day
- All commands registered before export

---

## 2. Command Registration & Execution Pattern

### Command Structure (Clipanion)

All commands extend `Command` from clipanion and follow this pattern:

```typescript
import { Command, Option } from 'clipanion';

export class MyCommand extends Command {
  // Define command paths (aliases)
  static paths = [['command-name'], ['--command-name']];

  // Define usage/help
  static usage = Command.Usage({
    description: 'What this command does',
    examples: [
      ['Example 1', '$0 example'],
      ['Example 2', '$0 --example'],
    ],
  });

  // Define options/arguments
  myOption = Option.String({ required: false });
  myFlag = Option.Flag('--flag');
  restArgs = Option.Rest({ required: 0 });

  // Main execution
  async execute(): Promise<number> {
    // Implementation
    return 0; // Exit code
  }
}
```

### Example: DefaultCommand (Main Command)
**File**: `/Users/ayush/Coding/WebSite/bashio/src/cli/commands/DefaultCommand.ts`

```typescript
export class DefaultCommand extends Command {
  static paths = [Command.Default]; // Catches all unmatched input

  query = Option.Rest({ required: 0 }); // Captures all remaining args

  async execute(): Promise<number> {
    if (this.query.length === 0) {
      this.showHelp();
      return 0;
    }

    // Step 1: Check if it's a shortcut
    const shortcut = await tryResolveShortcut(this.query);
    if (shortcut) {
      return this.executeWithConfirmation(shortcut.command, 'shortcut', context);
    }

    // Step 2: Use AI provider
    const provider = createProvider(currentConfig);
    const generatedCommand = await provider.generateCommand(queryText);
    
    return this.executeWithConfirmation(generatedCommand, 'ai', context);
  }
}
```

### Example: AuthCommand
**File**: `/Users/ayush/Coding/WebSite/bashio/src/cli/commands/AuthCommand.ts`

```typescript
export class AuthCommand extends Command {
  static paths = [['auth'], ['--auth']];

  static usage = Command.Usage({
    description: 'Configure AI provider for Bashio',
    examples: [['Configure AI provider', '$0 --auth']],
  });

  async execute(): Promise<number> {
    const success = await runAuthSetup();
    return success ? 0 : 1;
  }
}
```

### Example: AddShortcutCommand (With Options)
**File**: `/Users/ayush/Coding/WebSite/bashio/src/cli/commands/AddShortcutCommand.ts`

```typescript
export class AddShortcutCommand extends Command {
  static paths = [['add-shortcut'], ['--add-shortcut']];

  // Optional positional arguments
  name = Option.String({ required: false });
  template = Option.String({ required: false });
  args = Option.String({ required: false });

  async execute(): Promise<number> {
    // One-liner mode: b --add-shortcut "name" "template" "args"
    if (this.name && this.template) {
      // Use provided args
    } else {
      // Interactive mode with prompts
    }
    return 0;
  }
}
```

---

## 3. Provider Integration Pattern

### Base Provider Interface
**File**: `/Users/ayush/Coding/WebSite/bashio/src/providers/base.ts`

```typescript
export interface AIProvider {
  name: string;
  generateCommand(query: string, context?: string): Promise<string>;
  explainCommand(command: string): Promise<string>;
  validateCredentials(): Promise<boolean>;
}

export interface ProviderConfig {
  model: string;
  credentials: Credentials;
}

export const SYSTEM_PROMPT_GENERATE = `You are a shell command generator...`;
export const SYSTEM_PROMPT_EXPLAIN = `You are a shell command expert...`;
```

### Provider Factory
**File**: `/Users/ayush/Coding/WebSite/bashio/src/providers/index.ts`

```typescript
export function createProvider(config: ConfigV2): AIProvider {
  const activeProvider = config.activeProvider;
  const settings = config.providers[activeProvider];

  const providerConfig: ProviderConfig = {
    model: settings.model,
    credentials: settings.credentials,
  };

  return createProviderFromType(activeProvider, providerConfig);
}

function createProviderFromType(
  provider: ProviderName,
  config: ProviderConfig,
): AIProvider {
  switch (provider) {
    case 'claude':
      return new ClaudeProvider(config);
    case 'openai':
      return new OpenAIProvider(config);
    case 'copilot':
      return new CopilotProvider(config);
    case 'ollama':
      return new OllamaProvider(config);
    // ... other providers
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
```

### Example Provider: Claude
**File**: `/Users/ayush/Coding/WebSite/bashio/src/providers/claude.ts`

```typescript
export class ClaudeProvider implements AIProvider {
  name = 'Claude';
  private model: string;
  private apiKey: string;

  constructor(config: ProviderConfig) {
    this.model = config.model;
    if (config.credentials.type === 'api_key') {
      this.apiKey = config.credentials.apiKey;
    } else if (config.credentials.type === 'session') {
      this.apiKey = config.credentials.sessionToken;
    } else {
      throw new Error('Claude requires API key or session token');
    }
  }

  private async call(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
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
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    const data = (await response.json()) as AnthropicResponse;
    const textContent = data.content.find((c) => c.type === 'text');
    return textContent?.text.trim() || '';
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
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'hi' }],
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
```

### Supported Providers
- `claude` - Anthropic Claude (API key)
- `claude-subscription` - Claude via web subscription
- `openai` - OpenAI GPT models
- `chatgpt-subscription` - ChatGPT via web subscription
- `copilot` - GitHub Copilot
- `ollama` - Local Ollama models
- `openrouter` - OpenRouter API

---

## 4. Streaming Response Handling

**Current Status**: No streaming implemented yet.

The current implementation uses simple fetch-based API calls with `max_tokens` limits:
- Claude: `max_tokens: 1024`
- OpenAI: Similar pattern

**For future streaming implementation**, you would:
1. Use `stream: true` in API request
2. Handle `ReadableStream` response
3. Parse SSE (Server-Sent Events) format
4. Update UI in real-time with spinner updates

---

## 5. Entry Points & Main Files

### Project Structure
```
bashio/
├── src/
│   ├── index.ts                          # Main entry point
│   ├── cli/
│   │   ├── index.ts                      # CLI setup & command registration
│   │   └── commands/
│   │       ├── DefaultCommand.ts         # Main command (natural language)
│   │       ├── AuthCommand.ts            # Setup AI provider
│   │       ├── ConfigCommand.ts          # View configuration
│   │       ├── ModelCommand.ts           # Change provider/model
│   │       ├── ShortcutsCommand.ts       # List shortcuts
│   │       ├── AddShortcutCommand.ts     # Add new shortcut
│   │       ├── RemoveShortcutCommand.ts  # Remove shortcut
│   │       ├── EditShortcutsCommand.ts   # Edit shortcuts in editor
│   │       ├── HistoryCommand.ts         # View command history
│   │       ├── StatsCommand.ts           # View usage statistics
│   │       ├── ClearHistoryCommand.ts    # Clear history
│   │       └── SuggestShortcutsCommand.ts # Suggest new shortcuts
│   ├── core/
│   │   ├── types.ts                      # Zod schemas & TypeScript types
│   │   ├── config.ts                     # Config file management
│   │   ├── auth.ts                       # Authentication setup
│   │   ├── executor.ts                   # Command execution
│   │   ├── history.ts                    # Command history tracking
│   │   ├── shortcuts.ts                  # Shortcut management
│   │   ├── database.ts                   # SQLite database
│   │   ├── learning.ts                   # Learning/suggestions
│   │   └── oauth.ts                      # OAuth flows
│   ├── providers/
│   │   ├── base.ts                       # AIProvider interface
│   │   ├── index.ts                      # Provider factory
│   │   ├── claude.ts                     # Claude provider
│   │   ├── claude-subscription.ts        # Claude subscription
│   │   ├── openai.ts                     # OpenAI provider
│   │   ├── chatgpt-subscription.ts       # ChatGPT subscription
│   │   ├── copilot.ts                    # GitHub Copilot
│   │   ├── ollama.ts                     # Local Ollama
│   │   └── openrouter.ts                 # OpenRouter
│   └── utils/
│       ├── logger.ts                     # Logging utilities
│       ├── spinner.ts                    # Loading spinner
│       ├── clipboard.ts                  # Clipboard operations
│       ├── table.ts                      # Table rendering
│       ├── danger.ts                     # Dangerous command detection
│       └── danger-ui.ts                  # Danger warning UI
├── package.json
└── tsconfig.json
```

### Key Files for Adding a New Command

**File**: `/Users/ayush/Coding/WebSite/bashio/src/cli/index.ts` (Register command)
**File**: `/Users/ayush/Coding/WebSite/bashio/src/cli/commands/YourCommand.ts` (Create command)

---

## 6. How to Add a New Command

### Step 1: Create Command File
**File**: `/Users/ayush/Coding/WebSite/bashio/src/cli/commands/MyNewCommand.ts`

```typescript
import { Command, Option } from 'clipanion';
import pc from 'picocolors';

export class MyNewCommand extends Command {
  // Define command paths (how users invoke it)
  static paths = [['my-command'], ['--my-command']];

  // Define help text
  static usage = Command.Usage({
    description: 'What this command does',
    examples: [
      ['Example 1', '$0 --my-command'],
      ['Example 2', '$0 my-command arg1 arg2'],
    ],
  });

  // Define options/arguments
  myOption = Option.String({ required: false });
  myFlag = Option.Flag('--flag');
  restArgs = Option.Rest({ required: 0 });

  // Main execution
  async execute(): Promise<number> {
    console.log(pc.bold('\n  My New Command\n'));
    
    // Your logic here
    if (this.myFlag) {
      console.log(pc.green('Flag is set!'));
    }

    if (this.myOption) {
      console.log(pc.cyan(`Option value: ${this.myOption}`));
    }

    console.log();
    return 0; // Success
  }
}
```

### Step 2: Register Command
**File**: `/Users/ayush/Coding/WebSite/bashio/src/cli/index.ts`

Add import and registration:
```typescript
import { MyNewCommand } from './commands/MyNewCommand.js';

// ... existing code ...

cli.register(MyNewCommand); // Add this line
```

### Step 3: Build & Test
```bash
pnpm build
./dist/index.js --my-command
```

---

## 7. Command Execution Flow

### DefaultCommand Flow (Main)
```
User Input: "b find large files"
    ↓
DefaultCommand.execute()
    ↓
1. Check if shortcut exists
   └─ tryResolveShortcut(query)
   └─ If found: executeWithConfirmation(shortcut.command, 'shortcut')
    ↓
2. If not shortcut, use AI provider
   └─ createProvider(config)
   └─ provider.generateCommand(queryText)
   └─ Clean response (remove markdown)
    ↓
3. Record in history (if enabled)
   └─ recordCommand({ query, command, source })
    ↓
4. Prompt user for confirmation
   └─ promptConfirmation() → 'yes' | 'no' | 'explain' | 'copy' | 'edit'
    ↓
5. If dangerous command detected
   └─ promptDangerConfirmation()
    ↓
6. Execute command
   └─ executeCommand(command)
   └─ spawn shell with stdio: 'inherit' (for TUI apps)
    ↓
7. Update history with result
   └─ markExecuted(historyId, exitCode)
    ↓
Return exit code
```

### Executor Implementation
**File**: `/Users/ayush/Coding/WebSite/bashio/src/core/executor.ts`

```typescript
export function executeCommand(command: string): Promise<ExecutionResult> {
  return new Promise((resolve) => {
    const shell = process.platform === 'win32' ? 'cmd' : '/bin/sh';
    const shellArg = process.platform === 'win32' ? '/c' : '-c';

    // Use 'inherit' for all stdio to allow TUI apps direct TTY access
    const child = spawn(shell, [shellArg, command], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env,
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout: '',
        stderr: '',
      });
    });

    child.on('error', (err) => {
      resolve({
        exitCode: 1,
        stdout: '',
        stderr: err.message,
      });
    });
  });
}
```

---

## 8. Configuration Management

### Config Structure
**File**: `/Users/ayush/Coding/WebSite/bashio/src/core/types.ts`

```typescript
// V2 Config (multi-provider support)
export const ConfigV2 = z.object({
  version: z.literal(2),
  activeProvider: ProviderName,
  providers: z.record(z.string(), ProviderSettings),
  settings: Settings.optional(),
});

export const ProviderSettings = z.object({
  model: z.string(),
  credentials: Credentials,
});

export const Settings = z.object({
  confirmBeforeExecute: z.boolean().default(true),
  historyEnabled: z.boolean().default(true),
  historyRetentionDays: z.number().default(30),
  historyMaxEntries: z.number().default(2000),
  autoConfirmShortcuts: z.boolean().default(false),
});
```

### Config File Location
- **Path**: `~/.bashio/config.json`
- **Permissions**: `0o600` (read/write for owner only)
- **Auto-migration**: V1 configs automatically migrate to V2

### Config Loading
**File**: `/Users/ayush/Coding/WebSite/bashio/src/core/config.ts`

```typescript
export function loadConfig(): ConfigV2 | null {
  if (!configExists()) {
    return null;
  }

  try {
    const raw = readFileSync(CONFIG_FILE, 'utf-8');
    const data = JSON.parse(raw);

    // Try V2 first
    const v2Result = ConfigV2.safeParse(data);
    if (v2Result.success) {
      return v2Result.data;
    }

    // Try V1 and migrate
    const v1Result = ConfigV1.safeParse(data);
    if (v1Result.success) {
      const migrated = migrateV1toV2(v1Result.data);
      saveConfig(migrated); // Auto-save migrated config
      return migrated;
    }

    return null;
  } catch {
    return null;
  }
}

export function saveConfig(config: ConfigV2): void {
  ensureConfigDir();
  const data = JSON.stringify(config, null, 2);
  writeFileSync(CONFIG_FILE, data, { encoding: 'utf-8', mode: 0o600 });
  chmodSync(CONFIG_FILE, 0o600);
}
```

---

## 9. Type Safety & Validation

All types use **Zod** for runtime validation:

```typescript
import { z } from 'zod';

// Define schema
export const ProviderName = z.enum([
  'claude',
  'openai',
  'copilot',
  'ollama',
  'openrouter',
]);

// Infer TypeScript type
export type ProviderName = z.infer<typeof ProviderName>;

// Validate at runtime
const result = ProviderName.safeParse(userInput);
if (result.success) {
  const provider: ProviderName = result.data;
}
```

---

## 10. Key Utilities

### Logger
**File**: `/Users/ayush/Coding/WebSite/bashio/src/utils/logger.ts`
```typescript
logger.success('Success message');
logger.error('Error message');
logger.warn('Warning message');
logger.info('Info message');
logger.command('$ command to execute');
logger.exitCode(1);
```

### Spinner
**File**: `/Users/ayush/Coding/WebSite/bashio/src/utils/spinner.ts`
```typescript
const spinner = createSpinner('Loading...').start();
// ... do work ...
spinner.stop();
spinner.fail('Failed');
spinner.succeed('Success');
```

### Clipboard
**File**: `/Users/ayush/Coding/WebSite/bashio/src/utils/clipboard.ts`
```typescript
const success = await copyToClipboard(text);
```

### Danger Detection
**File**: `/Users/ayush/Coding/WebSite/bashio/src/utils/danger.ts`
```typescript
const danger = detectDangerousShellCommand(command);
if (danger) {
  console.log(danger.reasons); // Array of reasons why it's dangerous
}
```

---

## Summary

### Quick Reference for Adding a Command

1. **Create file**: `src/cli/commands/YourCommand.ts`
2. **Extend Command**: `export class YourCommand extends Command`
3. **Define paths**: `static paths = [['your-command'], ['--your-command']]`
4. **Define options**: `myOption = Option.String({ required: false })`
5. **Implement execute**: `async execute(): Promise<number>`
6. **Register in CLI**: Add to `src/cli/index.ts` with `cli.register(YourCommand)`
7. **Build**: `pnpm build`
8. **Test**: `./dist/index.js --your-command`

### Key Patterns

- **Commands**: Extend `Command`, define `paths`, implement `execute()`
- **Providers**: Implement `AIProvider` interface with `generateCommand()`, `explainCommand()`, `validateCredentials()`
- **Config**: Use Zod schemas, store in `~/.bashio/config.json`
- **Execution**: Use `spawn()` with `stdio: 'inherit'` for TUI apps
- **UI**: Use `picocolors` for colors, `@inquirer/prompts` for interactive input
- **Validation**: Always use Zod for runtime type checking

