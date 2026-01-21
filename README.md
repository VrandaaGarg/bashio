<!-- SEO / Social sharing meta tags for GitHub -->
<!-- Title: Bashio - AI-Powered CLI Tool | Natural Language to Shell Commands -->
<!-- Description: Transform plain English into shell commands instantly. Stop Googling syntax, start doing. Supports Claude, OpenAI, GitHub Copilot, Ollama, and more. -->
<!-- Keywords: CLI tool, AI terminal, natural language shell, command line AI, bash assistant, shell commands, terminal productivity, developer tools -->

<p align="center">
  <a href="https://github.com/VrandaaGarg/bashio">
    <img src="https://res.cloudinary.com/dyetf2h9n/image/upload/v1769016810/Natural_language_to_shell_commands._Stop_Googling_start_doing._1_u8e0qd.png" alt="Bashio - Natural language to shell commands. Stop Googling, start doing." width="100%" />
  </a>
</p>

<h1 align="center">Bashio</h1>

<p align="center">
  <strong>Natural language to shell commands. Stop Googling, start doing.</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/bashio"><img src="https://img.shields.io/npm/v/bashio.svg" alt="npm version" /></a>
  <a href="https://github.com/VrandaaGarg/bashio/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License: Apache 2.0" /></a>
  <a href="https://github.com/VrandaaGarg/bashio"><img src="https://img.shields.io/github/stars/VrandaaGarg/bashio?style=social" alt="GitHub stars" /></a>
</p>

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

Choose from multiple providers:
- **Claude** (Anthropic) - API Key or Pro/Max subscription
- **OpenAI** (ChatGPT) - API Key or Plus/Pro subscription
- **GitHub Copilot** - Free with Copilot subscription
- **Ollama** - Free, runs locally
- **OpenRouter** - Pay-per-use, multiple models

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

## Interactive Chat Mode

Start an interactive AI chat session for more complex conversations:

```bash
b --chat
```

**Chat Features:**
- Full-screen TUI with streaming responses
- Session management (save, load, switch sessions)
- Slash commands for quick actions
- Theme customization
- Model switching mid-conversation

**Keyboard Shortcuts (in chat):**
| Shortcut | Action |
|----------|--------|
| `Ctrl+M` or `Ctrl+P` | Switch model |
| `Ctrl+O` | Open session picker |
| `Ctrl+T` | Change theme |
| `Ctrl+C` | Exit chat |

**Slash Commands:**
| Command | Action |
|---------|--------|
| `/models` | Switch AI model |
| `/sessions` | Browse chat sessions |
| `/theme` | Change color theme |
| `/new` | Start new chat session |
| `/clear` | Clear current chat |
| `/exit` | Exit chat |

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

| Provider | Auth Method | Cost |
|----------|-------------|------|
| **Claude** (Anthropic) | API Key | Paid |
| **Claude** (Subscription) | OAuth (Pro/Max) | Subscription |
| **OpenAI** (ChatGPT) | API Key | Paid |
| **ChatGPT** (Subscription) | OAuth (Plus/Pro) | Subscription |
| **GitHub Copilot** | OAuth | Free with subscription |
| **Ollama** | None (local) | Free |
| **OpenRouter** | API Key | Pay per use |

Switch models anytime:

```bash
b --model
```

---

## Themes

Customize the color theme:

```bash
b --theme
```

Themes apply to both the CLI and interactive chat mode.

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
| `b --chat` | Start interactive chat mode |
| `b --auth` | Setup AI provider |
| `b --model` | Change AI model |
| `b --config` | View current config |
| `b --theme` | Change color theme |
| `b --shortcuts` | List shortcuts |
| `b --add-shortcut` | Create shortcut |
| `b --remove-shortcut <name>` | Delete shortcut |
| `b --edit-shortcuts` | Edit shortcuts file |
| `b --history` | View command history |
| `b --stats` | Usage statistics |
| `b --suggest-shortcuts` | Get shortcut suggestions |
| `b --clear-history` | Clear history |
| `b --help` | Show help |
| `b --version` | Show version (with update check) |

---

## Configuration

All data is stored locally at `~/.bashio/`:

```
~/.bashio/
├── config.json      # Settings and API keys
├── shortcuts.json   # Your shortcuts
├── sessions/        # Chat sessions
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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request on [GitHub](https://github.com/VrandaaGarg/bashio).

---

## License

Copyright 2025 Vranda Garg

### Additional Terms

If you use, modify, or distribute this project or any part of it, you MUST:

1. **Attribution:** Give clear and visible credit to **Vranda Garg** as the original author.
2. **Link Back:** Include a link to the original repository: [https://github.com/VrandaaGarg/bashio](https://github.com/VrandaaGarg/bashio)

Licensed under the Apache License, Version 2.0. See the [LICENSE](https://github.com/VrandaaGarg/bashio/blob/main/LICENSE) file for details.

---

<p align="center">
  <a href="https://github.com/VrandaaGarg/bashio">GitHub</a> ·
  <a href="https://www.npmjs.com/package/bashio">npm</a>
</p>

<p align="center">
  <sub>Built with AI for developers who prefer doing over searching.</sub>
</p>
