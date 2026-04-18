<p align="center">
  <a href="https://github.com/VrandaaGarg/bashio">
    <img src="https://res.cloudinary.com/dyetf2h9n/image/upload/v1769023957/Natural_language_to_shell_commands._Stop_Googling_start_doing._1_u8e0qd.png" alt="Bashio" width="100%" />
  </a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/bashio"><img src="https://img.shields.io/npm/v/bashio.svg" alt="npm" /></a>
  <a href="https://github.com/VrandaaGarg/bashio/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="License" /></a>
  <a href="https://github.com/VrandaaGarg/bashio"><img src="https://img.shields.io/github/stars/VrandaaGarg/bashio?style=social" alt="Stars" /></a>
</p>

---

## Quick Start

```bash
npm i -g bashio        # Install globally
b --auth               # Setup your AI provider
b show disk usage      # Start using!
```

Requires Node.js 20.12.0+

---

## What is Bashio?

Bashio converts plain English into shell commands. Describe what you want, review the command, then execute.

```bash
$ b find all files larger than 100mb and delete them
```
```
  > find . -size +100M -type f -delete

  ? Execute? (y/n/e/c/edit)
```

**Options:** `y` execute · `n` cancel · `e` explain · `c` copy · `edit` modify

---

## Examples

```bash
# Files
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
```

---

## Chat Mode

Full-screen AI chat with streaming responses:

```bash
b --chat
```

**Features:** Session history · Slash commands · Themes · Model switching

| Shortcut | Action |
|----------|--------|
| `Ctrl+P` | Switch model |
| `Ctrl+O` | Open sessions |
| `Ctrl+T` | Change theme |
| `Ctrl+C` | Exit |

---

## Shortcuts

Save frequently used commands with placeholders:

```bash
b --add-shortcut killport "lsof -ti:{{port}} | xargs kill -9" port
b killport 3000    # Uses the shortcut
```

---

## AI Providers

Configure with `b --auth`:

| Provider | Type |
|----------|------|
| **Claude** (Anthropic) | API Key or Pro/Max subscription |
| **OpenAI** (ChatGPT) | API Key or Plus/Pro subscription |
| **GitHub Copilot** | Free with Copilot subscription |
| **Ollama** | Free, runs locally |
| **OpenRouter** | Pay-per-use, multiple models |

Switch anytime: `b --model`

---

## All Commands

### Core
| Command | Description |
|---------|-------------|
| `b <query>` | Convert natural language to shell command |
| `b --chat` | Start interactive AI chat session |

### Configuration
| Command | Description |
|---------|-------------|
| `b --auth` | Configure AI provider |
| `b --config` | View current configuration |
| `b --model` | Change AI provider/model |
| `b --theme` | Change color theme |

### Shortcuts
| Command | Description |
|---------|-------------|
| `b --shortcuts` | List all shortcuts |
| `b --add-shortcut` | Add a new shortcut |
| `b --remove-shortcut <name>` | Remove a shortcut |
| `b --edit-shortcuts` | Edit shortcuts in editor |

### History & Stats
| Command | Description |
|---------|-------------|
| `b --history` | View command history |
| `b --history --search <term>` | Search history |
| `b --stats` | View usage statistics |
| `b --suggest-shortcuts` | Suggest shortcuts from history |
| `b --clear-history` | Clear command history |

### Help
| Command | Description |
|---------|-------------|
| `b --help` | Show help message |
| `b --version` | Show version (with update check) |

---

## Safety

Bashio warns you about dangerous commands:

```
  > rm -rf ~/*

  WARNING: This command may cause irreversible changes.
  - Uses recursive force delete (rm -rf)
  - Targets home directory

  ? Proceed? (y/N)
```

Every command requires confirmation before execution.

---

## Privacy

- All data stored locally at `~/.bashio/`
- No telemetry or tracking
- Queries only sent to your chosen AI provider

---

## License

Copyright 2025 [Vranda Garg](https://vrandagarg.in)

**If you use, modify, or distribute this project, you must:**
1. Give credit to **Vranda Garg** as the original author
2. Link to [github.com/VrandaaGarg/bashio](https://github.com/VrandaaGarg/bashio)

Licensed under Apache 2.0 · [View LICENSE](https://github.com/VrandaaGarg/bashio/blob/main/LICENSE)

---

<p align="center">
  <a href="https://github.com/VrandaaGarg/bashio">GitHub</a> · <a href="https://www.npmjs.com/package/bashio">npm</a> · <a href="https://vrandagarg.in">Author</a>
</p>
