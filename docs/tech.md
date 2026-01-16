# Bashio - Tech Stack

Complete breakdown of technologies used in Bashio.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SHELL AGENT TECH STACK                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  RUNTIME            │  FRAMEWORK          │  DATA                       │
│  ─────────          │  ──────────         │  ────                       │
│  Node.js 22+        │  Clipanion (CLI)    │  better-sqlite3 (DB)       │
│  TypeScript 5.9     │  @inquirer/prompts  │  Zod (validation)          │
│  ESM Modules        │  (interactive UI)   │  JSON files (config)       │
│                     │                     │                             │
├─────────────────────┼─────────────────────┼─────────────────────────────┤
│                                                                         │
│  UI/OUTPUT          │  BUILD TOOLS        │  CODE QUALITY               │
│  ──────────         │  ────────────       │  ────────────               │
│  picocolors         │  tsup (bundler)     │  Biome (lint+format)       │
│  ora (spinners)     │  TypeScript (types) │  TypeScript (type-check)   │
│                     │  pnpm (pkg manager) │                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Core Runtime & Language

### Node.js (>=22.0.0)

**Purpose:** JavaScript runtime for executing the CLI

**Why Node.js 22+?**
- Native ESM support without hacks
- Better performance
- Modern JavaScript features built-in
- `fetch` API built-in (no axios/node-fetch needed)

### TypeScript (^5.9.3)

**Purpose:** Static typing, better developer experience

**Why TypeScript?**
- Type safety prevents runtime errors
- Better IDE autocomplete
- Self-documenting code
- Catches bugs at compile time
- Zod integration for runtime validation

### ESM Modules (`"type": "module"`)

**Purpose:** Modern ES Modules (import/export) instead of CommonJS (require)

**Why ESM?**
- Standard JavaScript module system
- Better tree-shaking
- Top-level await support
- Better compatibility with modern packages

---

## Production Dependencies

### Clipanion (4.0.0-rc.4)

**Purpose:** CLI framework for building command-line applications

```typescript
import { Cli, Command, Option } from 'clipanion';

const cli = new Cli({
  binaryLabel: 'Bashio',
  binaryName: 's',
  binaryVersion: '0.4.0',
});

export class DefaultCommand extends Command {
  static paths = [Command.Default];
  query = Option.Rest({ required: 0 });
  
  async execute() {
    // ...
  }
}

cli.register(DefaultCommand);
```

**Why Clipanion?**
- Type-safe command definitions
- Built-in help generation
- Support for subcommands, options, and positional arguments
- Created by Yarn team
- Clean API with `Option.Rest()`, `Option.Boolean()`, etc.

### @inquirer/prompts (^8.2.0)

**Purpose:** Interactive terminal prompts

```typescript
import { confirm, editor, input, password, select } from '@inquirer/prompts';

const answer = await input({
  message: 'Execute? (y/n/e/c/edit)',
  default: 'y',
});

const provider = await select({
  message: 'Select your AI provider:',
  choices: [
    { value: 'claude', name: 'Claude (Anthropic)' },
    { value: 'openai', name: 'ChatGPT (OpenAI)' },
  ],
});
```

**Why @inquirer/prompts?**
- Modern, ESM-native version of Inquirer.js
- Beautiful terminal UI
- Handles edge cases (Ctrl+C, arrow keys, etc.)
- Multiple prompt types: input, confirm, select, password, editor

### better-sqlite3 (^12.6.0)

**Purpose:** SQLite database driver (synchronous, fast)

```typescript
import Database from 'better-sqlite3';

const db = new Database('~/.bashio/history.db');
db.pragma('journal_mode = WAL');

// Queries are synchronous (no await needed)
const row = db.prepare('SELECT * FROM history WHERE id = ?').get(historyId);
db.prepare('INSERT INTO history (query, command) VALUES (?, ?)').run(query, cmd);
```

**Why better-sqlite3?**
- **Synchronous API** - No callbacks/promises, simpler code
- **Fastest SQLite binding** for Node.js
- **WAL mode** - Better concurrent read/write performance
- **Embedded** - No separate database server needed
- Perfect for local CLI tools storing user data

### Zod (^4.3.5)

**Purpose:** Runtime schema validation and TypeScript type inference

```typescript
import { z } from 'zod';

export const Config = z.object({
  version: z.number().default(1),
  provider: ProviderName,
  model: z.string(),
  credentials: Credentials,
  settings: Settings.optional(),
});

// TypeScript type inferred from schema!
export type Config = z.infer<typeof Config>;

// Usage - validates at runtime
const data = JSON.parse(raw);
return Config.parse(data); // Throws if invalid
```

**Why Zod?**
- **Single source of truth** - Schema defines both validation AND TypeScript types
- **Fail-fast** - Invalid config files throw immediately with clear errors
- **Composable** - Build complex schemas from simple ones
- **Type inference** - `z.infer<>` extracts TypeScript type from schema

### picocolors (^1.1.1)

**Purpose:** Terminal color/styling (tiny, fast)

```typescript
import pc from 'picocolors';

console.log(pc.green('✓ Success!'));
console.log(pc.red('✗ Error'));
console.log(pc.cyan(`  ${command}`));
console.log(pc.gray('─'.repeat(50)));
console.log(pc.bold(pc.yellow('WARNING')));
```

**Why picocolors?**
- **Tiny** - 2.5KB vs chalk's 50KB+
- **Fast** - No dependencies, minimal overhead
- **Simple API** - `pc.red()`, `pc.bold()`, etc.
- Respects `NO_COLOR` environment variable

### ora (^9.0.0)

**Purpose:** Elegant terminal spinners

```typescript
import ora from 'ora';

const spinner = ora('Generating command...').start();

try {
  const result = await aiProvider.generateCommand(query);
  spinner.stop();
} catch (err) {
  spinner.fail('Failed to generate command');
}
```

**Why ora?**
- Beautiful animated spinners
- Works in all terminals
- Success/fail/warn states
- Auto-clears on completion

### dotenv (^17.2.3)

**Purpose:** Load environment variables from `.env` files

```typescript
import 'dotenv/config';
// Now process.env.SOME_VAR is available
```

**Why dotenv?**
- Standard way to handle environment variables
- Development convenience
- Keep secrets out of code

---

## Development Dependencies

### tsup (^8.5.1)

**Purpose:** TypeScript bundler (fast, zero-config)

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  minify: false,
});
```

**Why tsup?**
- **Fast** - Uses esbuild under the hood
- **Zero config** - Works out of the box
- **Tree shaking** - Removes unused code
- **Watch mode** - `pnpm dev` for development

### Biome (@biomejs/biome ^2.3.11)

**Purpose:** Linter + Formatter (replaces ESLint + Prettier)

```json
// biome.json
{
  "linter": { "enabled": true },
  "formatter": { "enabled": true }
}
```

```bash
pnpm lint:check  # Check for issues
pnpm lint        # Fix issues
```

**Why Biome?**
- **Fast** - Written in Rust, 10-100x faster than ESLint
- **All-in-one** - Linting AND formatting in one tool
- **Zero config** - Sensible defaults
- **TypeScript native** - No plugins needed

### TypeScript (^5.9.3)

**Purpose:** Type checking (compile-time)

```bash
pnpm typecheck  # Runs: tsc --noEmit
```

**Why separate typecheck?**
- tsup bundles but doesn't type-check thoroughly
- `tsc --noEmit` does full type analysis without emitting files
- Catches type errors that bundler might miss

### @types/better-sqlite3 (^7.6.13)

**Purpose:** TypeScript type definitions for better-sqlite3

### @types/node (^25.0.6)

**Purpose:** TypeScript type definitions for Node.js APIs

---

## Package Manager

### pnpm (^10.17.1)

**Why pnpm?**
- **Fast** - Faster than npm and yarn
- **Disk efficient** - Hard links, no duplication
- **Strict** - Prevents phantom dependencies
- **Monorepo ready** - Built-in workspace support

---

## Build & Development Scripts

```json
{
  "scripts": {
    "dev": "tsup --watch",      // Development with hot reload
    "build": "tsup",            // Production build
    "lint": "biome check --write .",  // Lint and fix
    "lint:check": "biome check .",    // Lint only (CI)
    "typecheck": "tsc --noEmit"       // Type check
  }
}
```

---

## Why These Choices?

| Goal | Solution |
|------|----------|
| **Fast startup** | Minimal dependencies, native ESM, tsup bundling |
| **Type safety** | TypeScript + Zod (compile-time + runtime) |
| **Beautiful UX** | picocolors + ora + @inquirer/prompts |
| **Local-first** | SQLite + JSON files in ~/.bashio/ |
| **Developer experience** | Biome (fast linting), tsup watch mode |
| **Portability** | No external services required (except AI APIs) |

---

## Dependency Graph

```
bashio
├── Runtime
│   ├── node (>=22.0.0)
│   └── typescript (^5.9.3)
│
├── CLI Framework
│   ├── clipanion (4.0.0-rc.4)
│   └── @inquirer/prompts (^8.2.0)
│
├── Data Layer
│   ├── better-sqlite3 (^12.6.0)
│   └── zod (^4.3.5)
│
├── UI
│   ├── picocolors (^1.1.1)
│   └── ora (^9.0.0)
│
├── Build Tools
│   ├── tsup (^8.5.1)
│   └── @biomejs/biome (^2.3.11)
│
└── Other
    └── dotenv (^17.2.3)
```

---

## Alternatives Considered

| Category | Chosen | Alternatives | Why Chosen |
|----------|--------|--------------|------------|
| CLI Framework | Clipanion | Commander.js, Yargs | Type-safe, cleaner API |
| Database | better-sqlite3 | Prisma, Drizzle | Direct, fast, no abstraction needed |
| Linter | Biome | ESLint + Prettier | Faster, single tool |
| Colors | picocolors | chalk | Smaller, faster |
| Prompts | @inquirer/prompts | prompts | Better maintained, ESM native |
| Bundler | tsup | esbuild, webpack | Zero-config, TypeScript native |
