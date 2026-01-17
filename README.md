# Bashio

> Natural language to shell commands. Stop Googling, start doing.

```bash
npm i -g bashio
```

---

## What is Bashio?

Bashio is an AI-powered CLI tool that converts plain English into shell commands. Instead of searching for the right syntax, just describe what you want to do.

```bash
$ b find all files larger than 100mb and delete them
```
```
  > find . -size +100M -type f -delete

  ? Execute? (y/n/e/c/edit)
```

You review the command, then choose to execute, edit, or cancel. Simple.

---

## Getting Started

### 1. Install

```bash
npm i -g bashio
```

Requires Node.js 20.12.0 or higher.

### 2. Setup your AI provider

```bash
b --auth
```

Choose from Claude, OpenAI, Ollama (free/local), or OpenRouter.

### 3. Start using it

```bash
b show disk usage sorted by size
```

That's it. You're ready to go.

---

## Examples

```bash
# File operations
b find all javascript files modified today
b delete all node_modules folders recursively
b compress all png images in this folder

# Git
b undo last commit but keep changes
b show commits from last week by john

# System
b kill whatever is running on port 3000
b what is my public ip address
b list all running docker containers

# Network
b download this url and save as data.json
```

---

## Confirmation Options

When a command is generated, you can:

| Key | Action |
|-----|--------|
| `y` or Enter | Execute the command |
| `n` | Cancel |
| `e` | Explain what the command does |
| `c` | Copy to clipboard |
| `edit` | Edit the command before running |

---

## Shortcuts

Save commands you use frequently as shortcuts with placeholders.

### Create a shortcut

```bash
# Interactive
b --add-shortcut

# One-liner
b --add-shortcut killport "lsof -ti:{{port}} | xargs kill -9" port
```

### Use it

```bash
b killport 3000
```
```
  [shortcut: killport]
  > lsof -ti:3000 | xargs kill -9

  ? Execute? (y/n/e/c/edit)
```

### Manage shortcuts

```bash
b --shortcuts              # List all
b --edit-shortcuts         # Edit in your editor
b --remove-shortcut name   # Delete one
```

---

## AI Providers

Configure with `b --auth`. Supported providers:

| Provider | Cost | Notes |
|----------|------|-------|
| **Claude** (Anthropic) | Paid | Best accuracy |
| **OpenAI** (ChatGPT) | Paid | Great all-rounder |
| **Ollama** | Free | Runs locally, offline |
| **OpenRouter** | Pay-per-use | Access to multiple models |

Switch models anytime:

```bash
b --model
```

---

## History & Stats

Bashio tracks your command history locally.

```bash
b --history              # View recent commands
b --history --search git # Search history
b --stats                # Usage statistics
b --suggest-shortcuts    # Get shortcut suggestions based on usage
b --clear-history        # Clear history
```

---

## Safety

Bashio detects dangerous commands (like `rm -rf`) and shows extra warnings:

```
  > rm -rf ~/*

  WARNING: This command may cause irreversible changes.
  Reasons:
  - Uses recursive force delete (rm -rf)
  - Targets home directory

  ? Proceed? (y/N)
```

Every command requires confirmation before execution.

---

## All Commands

| Command | Description |
|---------|-------------|
| `b <query>` | Convert natural language to command |
| `b <shortcut> [args]` | Run a saved shortcut |
| `b --auth` | Setup AI provider |
| `b --model` | Change AI model |
| `b --config` | View current config |
| `b --shortcuts` | List shortcuts |
| `b --add-shortcut` | Create shortcut |
| `b --remove-shortcut <name>` | Delete shortcut |
| `b --edit-shortcuts` | Edit shortcuts file |
| `b --history` | View command history |
| `b --stats` | Usage statistics |
| `b --suggest-shortcuts` | Get shortcut suggestions |
| `b --clear-history` | Clear history |
| `b --help` | Show help |
| `b --version` | Show version |

---

## Configuration

All data is stored locally at `~/.bashio/`:

```
~/.bashio/
├── config.json      # Settings and API keys
├── shortcuts.json   # Your shortcuts
└── history.db       # Command history
```

View your config:

```bash
b --config
```

---

## Privacy

- All data stays on your machine
- No telemetry or tracking
- Queries only sent to your chosen AI provider

---

## License

MIT
