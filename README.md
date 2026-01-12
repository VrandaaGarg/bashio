# Shell Agent

> Natural language to shell commands. Stop Googling, start doing.

```bash
$ s find all files larger than 100mb and delete them
> Will run: find . -size +100M -type f -delete
> Execute? (y/n)
```

## Features

- **Natural Language Commands** - Describe what you want, get the shell command
- **Multiple AI Providers** - Claude, OpenAI, Ollama (local), OpenRouter
- **Safe Execution** - Always confirms before running any command
- **Explain Mode** - Understand what a command does before executing
- **Zero Config Storage** - Your API keys stay local in `~/.shell-agent/`

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/shell-agent.git
cd shell-agent

# Install dependencies
pnpm install

# Build
pnpm build

# Link globally
pnpm link --global
```

## Quick Start

```bash
# 1. Configure your AI provider
s --auth

# 2. Start using natural language commands
s find all png files in current directory
```

## Usage

### Basic Commands

```bash
s <natural language query>    # Convert to shell command
s --auth                      # Configure AI provider
s --config                    # View current configuration
s --help                      # Show help
s --version                   # Show version
```

### Examples

```bash
# File operations
s find all javascript files
s delete all node_modules folders recursively
s count lines of code in typescript files

# Git operations
s undo the last commit
s show git log in one line format

# System info
s show disk usage by folder
s what is my ip address
s kill whatever is running on port 3000
```

### Confirmation Options

When a command is generated, you can respond with:

| Input | Action |
|-------|--------|
| `y` or Enter | Execute the command |
| `n` | Cancel |
| `e` | Explain what the command does |

## Supported AI Providers

| Provider | Auth Method | Cost |
|----------|-------------|------|
| Claude (Anthropic) | API Key | Paid |
| OpenAI (ChatGPT) | API Key | Paid |
| Ollama | None (local) | Free |
| OpenRouter | API Key | Pay per use |

## Configuration

Configuration is stored locally at `~/.shell-agent/config.json`. This file contains your AI provider settings and credentials - it never leaves your machine.

## Documentation

Detailed documentation is available in the `docs/` folder:

- [Project Overview](docs/Project.md)
- [Features & CLI Reference](docs/shell-agent.md)
- [Database & Auth Design](docs/db&auth.md)
- [Tech Stack](docs/tech.md)
- [V1 Implementation](docs/implementation-v1.md)

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run in dev mode (watch)
pnpm dev

# Lint
pnpm lint:check

# Type check
pnpm typecheck
```

## License

MIT
