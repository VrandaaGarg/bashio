# Bashio

> **Natural language to shell commands. Stop Googling, start doing.**

Bashio is an AI-powered CLI tool that translates your everyday language into precise shell commands. Just describe what you want to do, and let AI handle the syntax.

```bash
$ b find all files larger than 100mb and delete them
```
```
  > find . -size +100M -type f -delete

  ? Execute? (y/n/e/c/edit) 
```

---

## Features

- **Natural Language Commands** - Describe tasks in plain English, get executable shell commands
- **Multiple AI Providers** - Choose from Claude, OpenAI, Ollama (local/free), or OpenRouter
- **Custom Shortcuts** - Create reusable command templates with dynamic placeholders
- **Safe Execution** - Review and confirm every command before it runs
- **Dangerous Command Detection** - Extra warnings for potentially destructive operations
- **Explain Mode** - Understand what any command does before executing
- **Command History** - Track all generated commands with usage statistics
- **Smart Suggestions** - Get shortcut recommendations based on your usage patterns
- **Privacy First** - All data stored locally in `~/.bashio/`, never sent to external servers

---

## Installation

### Prerequisites

- Node.js 22.0.0 or higher
- pnpm (recommended) or npm

### Setup

```bash
# Clone the repository
git clone https://github.com/VrandaaGarg/bashio.git
cd bashio

# Install dependencies
pnpm install

# Build the project
pnpm build

# Link globally to use 'b' command anywhere
pnpm link --global
```

### Quick Start

```bash
# 1. Configure your AI provider
b --auth

# 2. Start using natural language commands
b find all png files in current directory
```

---

## Usage

### Natural Language Commands

Simply prefix your request with `b` and describe what you want:

```bash
# File operations
b find all javascript files modified today
b delete all node_modules folders recursively
b count lines of code in all typescript files
b compress all images in this folder

# Git operations
b undo the last commit but keep changes
b show commits from last week by author john
b create a new branch called feature/auth

# System operations
b show disk usage sorted by size
b what is my public ip address
b kill whatever is running on port 3000
b list all running docker containers

# Network operations
b download this file and save as data.json
b check if google.com is reachable
```

### Confirmation Options

When a command is generated, you have several options:

| Input | Action |
|-------|--------|
| `y` or `Enter` | Execute the command |
| `n` | Cancel and exit |
| `e` | Explain what the command does (AI-powered) |
| `c` | Copy command to clipboard |
| `edit` | Edit the command before executing |

---

## Shortcuts

Create reusable command templates for frequently used operations.

### Creating Shortcuts

```bash
# Interactive mode
b --add-shortcut

# One-liner with placeholders
b --add-shortcut killport "lsof -ti:{{port}} | xargs kill -9" port

# Multi-argument shortcut
b --add-shortcut deploy "git push {{remote}} {{branch}}" remote branch
```

### Using Shortcuts

```bash
# Single argument - all remaining text becomes the argument
b killport 3000

# Output:
#   [shortcut: killport]
#   > lsof -ti:3000 | xargs kill -9
#   ? Execute? (y/n/e/c/edit)

# Multi-word single argument (great for commit messages)
b commit "Add user authentication feature"
```

### Managing Shortcuts

```bash
b --shortcuts           # List all shortcuts
b --edit-shortcuts      # Edit shortcuts in your default editor
b --remove-shortcut killport  # Remove a specific shortcut
```

### Placeholder Syntax

Use `{{name}}` for dynamic arguments:

```bash
# Template: "docker exec -it {{container}} {{cmd}}"
# Args: container, cmd

b dockerrun myapp bash
# Expands to: docker exec -it myapp bash
```

---

## AI Providers

Bashio supports multiple AI providers. Configure with `b --auth`:

| Provider | Auth Method | Cost | Best For |
|----------|-------------|------|----------|
| **Claude** (Anthropic) | API Key | Paid | Best accuracy, complex commands |
| **OpenAI** (ChatGPT) | API Key | Paid | Great all-rounder |
| **Ollama** | Local | Free | Privacy, offline usage |
| **OpenRouter** | API Key | Pay-per-use | Access to multiple models |

### Available Models

#### Claude (Anthropic)
- `claude-sonnet-4-20250514` - Claude Sonnet 4 (recommended)
- `claude-3-5-sonnet-20241022` - Claude 3.5 Sonnet
- `claude-3-5-haiku-20241022` - Claude 3.5 Haiku (fast)

#### OpenAI
- `gpt-4o` - GPT-4o (recommended)
- `gpt-4o-mini` - GPT-4o Mini (fast)
- `gpt-4-turbo` - GPT-4 Turbo

#### OpenRouter
- `anthropic/claude-sonnet-4` - Claude Sonnet 4
- `anthropic/claude-3.5-sonnet` - Claude 3.5 Sonnet
- `openai/gpt-4o` - GPT-4o
- `google/gemini-pro-1.5` - Gemini Pro 1.5
- `meta-llama/llama-3.1-70b-instruct` - Llama 3.1 70B

#### Ollama (Local)
Any model installed on your machine:
- `llama3.2`, `llama3.1`, `codellama`, `mistral`, `gemma2`, etc.

### Switching Models

```bash
b --model    # Interactive model selection
```

---

## History & Statistics

Bashio tracks your command history for insights and suggestions.

### View History

```bash
b --history              # Show recent command history
b --history --search git # Search history for specific terms
```

### Usage Statistics

```bash
b --stats
```

```
  Bashio Usage Statistics

  Overview
  ┌──────────────────────┬───────────────┐
  │ Metric               │         Value │
  ├──────────────────────┼───────────────┤
  │ Commands Generated   │           156 │
  │ Executed             │     142 (91%) │
  │ Today                │            12 │
  │ This Week            │            45 │
  └──────────────────────┴───────────────┘

  Most Used Commands
  ┌───┬─────────────────────────────────┬──────┬──────────┐
  │ # │ Command                         │ Uses │   Source │
  ├───┼─────────────────────────────────┼──────┼──────────┤
  │ 1 │ lsof -ti:3000 | xargs kill -9   │   23 │ shortcut │
  │ 2 │ git status                      │   18 │       ai │
  │ 3 │ docker ps -a                    │   15 │       ai │
  └───┴─────────────────────────────────┴──────┴──────────┘
```

### Smart Shortcut Suggestions

Based on your usage patterns, Bashio suggests commands to save as shortcuts:

```bash
b --suggest-shortcuts
```

### Clear History

```bash
b --clear-history        # Clear all history
```

---

## Configuration

All configuration is stored locally at `~/.bashio/`:

```
~/.bashio/
├── config.json      # Provider settings and preferences
├── shortcuts.json   # Custom shortcuts
└── history.db       # Command history (SQLite)
```

### Settings

The `config.json` file contains customizable settings:

```json
{
  "version": 1,
  "provider": "claude",
  "model": "claude-sonnet-4-20250514",
  "credentials": {
    "type": "api_key",
    "apiKey": "sk-ant-..."
  },
  "settings": {
    "confirmBeforeExecute": true,
    "historyEnabled": true,
    "historyRetentionDays": 30,
    "historyMaxEntries": 2000,
    "autoConfirmShortcuts": false
  }
}
```

#### Available Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `confirmBeforeExecute` | boolean | `true` | Require confirmation before running commands |
| `historyEnabled` | boolean | `true` | Track command history |
| `historyRetentionDays` | number | `30` | Days to keep history before auto-cleanup |
| `historyMaxEntries` | number | `2000` | Maximum history entries to retain |
| `autoConfirmShortcuts` | boolean | `false` | Skip confirmation for shortcut commands |

### View Current Configuration

```bash
b --config
```

---

## CLI Reference

### Core Commands

| Command | Description |
|---------|-------------|
| `b <query>` | Convert natural language to shell command |
| `b <shortcut> [args]` | Execute a saved shortcut |

### Configuration

| Command | Description |
|---------|-------------|
| `b --auth` | Configure AI provider and credentials |
| `b --config` | View current configuration |
| `b --model` | Change the AI model |

### Shortcuts Management

| Command | Description |
|---------|-------------|
| `b --shortcuts` | List all saved shortcuts |
| `b --add-shortcut` | Create a new shortcut (interactive) |
| `b --add-shortcut <name> <template> [args...]` | Create shortcut (one-liner) |
| `b --edit-shortcuts` | Edit shortcuts in default editor |
| `b --remove-shortcut <name>` | Delete a shortcut |

### History & Analytics

| Command | Description |
|---------|-------------|
| `b --history` | View command history |
| `b --stats` | View usage statistics |
| `b --clear-history` | Clear command history |
| `b --suggest-shortcuts` | Get shortcut suggestions based on usage |

### Help

| Command | Description |
|---------|-------------|
| `b --help` | Show help information |
| `b --version` | Show version number |

---

## Safety Features

### Dangerous Command Detection

Bashio automatically detects potentially dangerous operations and requires explicit confirmation:

- Recursive deletions (`rm -rf`)
- System-wide operations (`sudo`, root access)
- Force operations (`--force`, `-f` flags)
- Disk operations (formatting, partitioning)

```bash
$ b delete everything in the home directory

  > rm -rf ~/*

  WARNING: This command may cause irreversible changes.

  Reasons:
  - Uses recursive force delete (rm -rf)
  - Targets home directory

  ? Proceed with this command? (y/N)
```

### Confirmation by Default

Every command requires confirmation before execution. You always see exactly what will run.

---

## Development

```bash
# Install dependencies
pnpm install

# Development mode (watch for changes)
pnpm dev

# Build for production
pnpm build

# Run linter
pnpm lint:check

# Fix lint issues
pnpm lint

# Type check
pnpm typecheck
```

### Tech Stack

- **Runtime**: Node.js 22+, TypeScript 5.9
- **CLI Framework**: Clipanion
- **Database**: better-sqlite3 (SQLite)
- **Validation**: Zod
- **UI**: picocolors, ora, @inquirer/prompts
- **Build**: tsup, Biome

---

## Privacy & Security

- **Local Storage**: All data (config, history, shortcuts) stays on your machine
- **No Telemetry**: No usage data is collected or sent anywhere
- **Secure Credentials**: API keys stored with restricted file permissions (0600)
- **Your Queries**: Only sent to your chosen AI provider for command generation

---

## License

MIT

---

<p align="center">
  <sub>Built with frustration from Googling the same commands over and over.</sub>
</p>
