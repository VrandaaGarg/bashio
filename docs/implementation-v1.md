# Shell Agent V1 Implementation

## Overview

Shell Agent V1 is a CLI tool that converts natural language to shell commands. This document explains how the V1 MVP was implemented.

## Project Structure

```
shell-agent/
├── src/
│   ├── index.ts              # Entry point
│   ├── cli/
│   │   ├── index.ts          # Clipanion CLI setup
│   │   └── commands/
│   │       ├── DefaultCommand.ts  # Main command (s <query>)
│   │       ├── AuthCommand.ts     # s --auth for provider setup
│   │       └── ConfigCommand.ts   # s --config to view config
│   ├── core/
│   │   ├── config.ts         # Config file management
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
│       └── spinner.ts        # Loading spinner
├── dist/                     # Compiled output
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── biome.json
```

## Tech Stack

- **Runtime**: Node.js 22+
- **Language**: TypeScript 5.9
- **CLI Framework**: Clipanion 4.x
- **Build Tool**: tsup
- **Linting**: Biome
- **Dependencies**:
  - `@inquirer/prompts` - Interactive prompts
  - `picocolors` - Terminal colors
  - `ora` - Loading spinners
  - `zod` - Schema validation
  - `dotenv` - Environment variables

## Core Components

### 1. Config Management (`src/core/config.ts`)

Manages `~/.shell-agent/config.json`:
- `ensureConfigDir()` - Creates config directory
- `loadConfig()` - Loads and validates config with Zod
- `saveConfig()` - Saves config with secure file permissions (0o600)
- `configExists()` - Checks if configured

### 2. AI Providers (`src/providers/`)

All providers implement the `AIProvider` interface:
```typescript
interface AIProvider {
  name: string;
  generateCommand(query: string, context?: string): Promise<string>;
  explainCommand(command: string): Promise<string>;
  validateCredentials(): Promise<boolean>;
}
```

**Supported Providers**:
- **Claude** - Anthropic API with API key auth
- **OpenAI** - GPT models with API key auth
- **Ollama** - Local models, no auth needed
- **OpenRouter** - Multi-model provider with API key auth

### 3. Command Executor (`src/core/executor.ts`)

Executes shell commands using `child_process.spawn`:
- Real-time stdout/stderr streaming
- Captures exit code
- Cross-platform (Unix/Windows)

### 4. CLI Commands (`src/cli/commands/`)

**DefaultCommand** (`s <query>`):
1. Checks if configured
2. Calls AI provider to generate command
3. Shows command and prompts for confirmation
4. Handles y/n/e (explain) responses
5. Executes command if confirmed

**AuthCommand** (`s --auth`):
1. Prompts for provider selection
2. Collects credentials (API key or local config)
3. Validates credentials with test API call
4. Saves to config file

**ConfigCommand** (`s --config`):
- Displays current configuration

## User Flow

```
$ s find large files

1. Parse query
2. Load config from ~/.shell-agent/config.json
3. Create AI provider instance
4. Generate command via AI API
5. Display: "Will run: find . -size +100M -type f"
6. Prompt: "Execute? (y/n/e)"
   - y: Execute command
   - n: Cancel
   - e: Get explanation, then re-prompt
7. Execute and show output
8. Show exit code
```

## Building & Running

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run locally
node dist/index.js

# Link globally
pnpm link --global

# Now use anywhere
s find all png files
```

## What's NOT in V1

- Custom shortcuts
- Command history (SQLite)
- Context awareness (project detection)
- Workflows
- Edit mode before execution
- Copy to clipboard

These are planned for V2.
