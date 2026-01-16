# Shellio

> **Natural language to shell commands. Stop Googling, start doing.**

Shellio is an AI-powered CLI tool that translates your everyday language into precise shell commands. Just describe what you want to do, and let AI handle the syntax.

```bash
$ s find all files larger than 100mb and delete them
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
- **Privacy First** - All data stored locally in `~/.shellio/`, never sent to external servers

---

## Installation

### Prerequisites

- Node.js 22.0.0 or higher
- pnpm (recommended) or npm

### Setup

```bash
# Clone the repository
git clone https://github.com/VrandaaGarg/shellio.git
cd shellio

# Install dependencies
pnpm install

# Build the project
pnpm build

# Link globally to use 's' command anywhere
pnpm link --global
```

### Quick Start

```bash
# 1. Configure your AI provider
s --auth

# 2. Start using natural language commands
s find all png files in current directory
```

---

## Usage

### Natural Language Commands

Simply prefix your request with `s` and describe what you want:

```bash
# File operations
s find all javascript files modified today
s delete all node_modules folders recursively
s count lines of code in all typescript files
s compress all images in this folder

# Git operations
s undo the last commit but keep changes
s show commits from last week by author john
s create a new branch called feature/auth

# System operations
s show disk usage sorted by size
s what is my public ip address
s kill whatever is running on port 3000
s list all running docker containers

# Network operations
s download this file and save as data.json
s check if google.com is reachable
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
s --add-shortcut

# One-liner with placeholders
s --add-shortcut killport "lsof -ti:{{port}} | xargs kill -9" port

# Multi-argument shortcut
s --add-shortcut deploy "git push {{remote}} {{branch}}" remote branch
```

### Using Shortcuts

```bash
# Single argument - all remaining text becomes the argument
s killport 3000

# Output:
#   [shortcut: killport]
#   > lsof -ti:3000 | xargs kill -9
#   ? Execute? (y/n/e/c/edit)

# Multi-word single argument (great for commit messages)
s commit "Add user authentication feature"
```

### Managing Shortcuts

```bash
s --shortcuts           # List all shortcuts
s --edit-shortcuts      # Edit shortcuts in your default editor
s --remove-shortcut killport  # Remove a specific shortcut
```

### Placeholder Syntax

Use `{{name}}` for dynamic arguments:

```bash
# Template: "docker exec -it {{container}} {{cmd}}"
# Args: container, cmd

s dockerrun myapp bash
# Expands to: docker exec -it myapp bash
```

---

## AI Providers

Shellio supports multiple AI providers. Configure with `s --auth`:

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
s --model    # Interactive model selection
```

---

## History & Statistics

Shellio tracks your command history for insights and suggestions.

### View History

```bash
s --history              # Show recent command history
s --history --search git # Search history for specific terms
```

### Usage Statistics

```bash
s --stats
```

```
  Shellio Usage Statistics

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

Based on your usage patterns, Shellio suggests commands to save as shortcuts:

```bash
s --suggest-shortcuts
```

### Clear History

```bash
s --clear-history        # Clear all history
```

---

## Configuration

All configuration is stored locally at `~/.shellio/`:

```
~/.shellio/
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
s --config
```

---

## CLI Reference

### Core Commands

| Command | Description |
|---------|-------------|
| `s <query>` | Convert natural language to shell command |
| `s <shortcut> [args]` | Execute a saved shortcut |

### Configuration

| Command | Description |
|---------|-------------|
| `s --auth` | Configure AI provider and credentials |
| `s --config` | View current configuration |
| `s --model` | Change the AI model |

### Shortcuts Management

| Command | Description |
|---------|-------------|
| `s --shortcuts` | List all saved shortcuts |
| `s --add-shortcut` | Create a new shortcut (interactive) |
| `s --add-shortcut <name> <template> [args...]` | Create shortcut (one-liner) |
| `s --edit-shortcuts` | Edit shortcuts in default editor |
| `s --remove-shortcut <name>` | Delete a shortcut |

### History & Analytics

| Command | Description |
|---------|-------------|
| `s --history` | View command history |
| `s --stats` | View usage statistics |
| `s --clear-history` | Clear command history |
| `s --suggest-shortcuts` | Get shortcut suggestions based on usage |

### Help

| Command | Description |
|---------|-------------|
| `s --help` | Show help information |
| `s --version` | Show version number |

---

## Safety Features

### Dangerous Command Detection

Shellio automatically detects potentially dangerous operations and requires explicit confirmation:

- Recursive deletions (`rm -rf`)
- System-wide operations (`sudo`, root access)
- Force operations (`--force`, `-f` flags)
- Disk operations (formatting, partitioning)

```bash
$ s delete everything in the home directory

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
