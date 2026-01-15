# Shell Agent - Features & Architecture

> Transform natural language into shell commands. Stop googling, start doing.

```bash
$ s find all files larger than 100mb and delete them
```
```
  > find . -size +100M -type f -delete

  ? Execute? (y/n/e/c/edit)
```

---

## Table of Contents

1. [Core Concept](#core-concept)
2. [Features](#features)
   - [Natural Language to Command](#1-natural-language-to-command)
   - [Custom Shortcuts](#2-custom-shortcuts)
   - [AI Provider Setup](#3-ai-provider-setup)
   - [History & Learning](#4-history--learning)
   - [Safety Features](#5-safety-features)
3. [CLI Reference](#cli-reference)
4. [Configuration](#configuration)
5. [Architecture](#architecture)

---

## Core Concept

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   HUMAN LANGUAGE          →        SHELL COMMAND                │
│                                                                  │
│   "kill whatever is                 lsof -ti:3000 |             │
│    running on port 3000"            xargs kill -9               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### The Flow

```
$ s <natural language>
       │
       ▼
┌──────────────────┐     ┌──────────────────┐
│ Check Shortcuts  │ ──▶ │  Query AI        │
│ (if match, use)  │     │  (if no match)   │
└──────────────────┘     └──────────────────┘
       │                          │
       └──────────┬───────────────┘
                  ▼
         ┌──────────────────┐
         │ Record to History│
         │ Show Command     │
         │ Ask Confirmation │
         └──────────────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Execute & Show   │
         │ Output           │
         │ Update Stats     │
         └──────────────────┘
```

---

## Features

## 1. Natural Language to Command

The core feature. Describe what you want, get the command.

### Examples

```bash
# Finding files
$ s find all javascript files in this project
> find . -name "*.js" -type f

$ s find files modified in the last 24 hours
> find . -type f -mtime -1

$ s find all files larger than 50mb
> find . -size +50M -type f
```

### Confirmation Options

When prompted `Execute? (y/n/e/c/edit)`:

| Input | Action |
|-------|--------|
| `y` or `Enter` | Execute the command |
| `n` | Cancel |
| `e` | Explain what the command does (AI-powered) |
| `c` | Copy command to clipboard |
| `edit` | Edit the command in your editor before executing |

### Explain Mode

```bash
$ s find files modified in last hour
> find . -type f -mmin -60

? Execute? (y/n/e/c/edit) e

  Explanation:
  find .       - Search in current directory
  -type f      - Only find files (not directories)
  -mmin -60    - Modified within last 60 minutes

? Execute? (y/n/e/c/edit)
```

### Edit Mode

```bash
$ s find large log files
> find . -name "*.log" -size +10M

? Execute? (y/n/e/c/edit) edit

# Opens in editor, you modify to:
# find /var/log -name "*.log" -size +10M

> find /var/log -name "*.log" -size +10M

? Execute? (y/n/e/c/edit)
```

### Execution Output

```bash
$ s show disk usage by folder
> du -sh */ | sort -hr | head -20

? Execute? (y/n/e/c/edit) y

  Executing...

  ──────────────────────────────────────────────────
  4.2G    node_modules/
  1.1G    .git/
  245M    dist/
  89M     src/
  ──────────────────────────────────────────────────
  Exit code: 0
```

---

## 2. Custom Shortcuts

Define your own shortcuts for frequently used commands.

### Using Shortcuts

```bash
# Simple shortcut (no arguments)
$ s disk
> df -h

# Shortcut with arguments
$ s commit "fixed the navbar bug"
> git add . && git commit -m "fixed the navbar bug"

# Shortcut with multiple arguments
$ s logs myapp production
> tail -f ~/projects/myapp/logs/production.log

$ s killport 3000
> lsof -ti:3000 | xargs kill -9
```

### Managing Shortcuts

#### List All Shortcuts

```bash
$ s --shortcuts

  Your Shortcuts

  ┌──────────┬────────────────────────────────────────────────┬─────────────┐
  │ Name     │ Template                                       │ Arguments   │
  ├──────────┼────────────────────────────────────────────────┼─────────────┤
  │ commit   │ git add . && git commit -m "{{message}}"       │ message     │
  │ killport │ lsof -ti:{{port}} | xargs kill -9              │ port        │
  │ dev      │ cd ~/projects/{{project}} && npm run dev       │ project     │
  │ logs     │ tail -f ~/projects/{{project}}/logs/{{env}}.log│ project,env │
  └──────────┴────────────────────────────────────────────────┴─────────────┘

  Total: 4 shortcuts
```

#### Add New Shortcut (Interactive)

```bash
$ s --add-shortcut

? Shortcut name: backup
? Command template: tar -czvf ~/backups/{{name}}.tar.gz ~/projects/{{name}}
? Arguments (comma-separated): name
? Description (optional): Backup a project folder

✓ Shortcut "backup" added!

# Now you can use it:
$ s backup myproject
> tar -czvf ~/backups/myproject.tar.gz ~/projects/myproject
```

#### Add Shortcut (One-liner)

```bash
$ s --add-shortcut killport "lsof -ti:{{port}} | xargs kill -9" port

✓ Shortcut "killport" added!
```

#### Remove Shortcut

```bash
$ s --remove-shortcut backup

? Remove shortcut "backup"? Yes

✓ Shortcut "backup" removed
```

#### Edit Shortcuts (Opens in Editor)

```bash
$ s --edit-shortcuts
# Opens ~/.shell-agent/shortcuts.json in $EDITOR
```

### Shortcut File Format

```json
{
  "version": 1,
  "shortcuts": {
    "commit": {
      "template": "git add . && git commit -m \"{{message}}\"",
      "args": ["message"],
      "description": "Stage all changes and commit"
    },
    "killport": {
      "template": "lsof -ti:{{port}} | xargs kill -9",
      "args": ["port"],
      "description": "Kill process running on specified port"
    },
    "dev": {
      "template": "cd ~/projects/{{project}} && npm run dev",
      "args": ["project"],
      "description": "Start dev server for a project"
    }
  }
}
```

### Shortcut Argument Handling

```bash
# If shortcut needs 1 arg and user provides it:
$ s commit "my message"
> git add . && git commit -m "my message"

# If shortcut needs 1 arg and user doesn't provide it:
$ s commit
? Enter message: my message
> git add . && git commit -m "my message"

# Single-arg shortcuts join all remaining words:
$ s commit fixed the navbar bug
> git add . && git commit -m "fixed the navbar bug"
```

### Shortcut vs AI Priority

```
User Input: "commit fixed the bug"
            │
            ▼
     ┌──────────────────────────────┐
     │ Is "commit" a shortcut name? │
     │                              │
     │    shortcuts.json:           │
     │    - commit ✓                │
     │    - killport                │
     │    - dev                     │
     └──────────────────────────────┘
            │
            ▼ YES
     ┌──────────────────────────────┐
     │ Use shortcut template        │
     │ Replace {{message}} with     │
     │ "fixed the bug"              │
     └──────────────────────────────┘
            │
            ▼
     git add . && git commit -m "fixed the bug"
```

If the first word is NOT a shortcut name, it goes to AI.

---

## 3. AI Provider Setup

One-time setup to configure which AI powers your shell agent.

### Initial Setup

```bash
$ s --auth

  Shell Agent Setup

? Select your AI provider:
  > Claude (Anthropic)     - Use Anthropic API key
    ChatGPT (OpenAI)       - Use OpenAI API key
    Ollama (Local)         - Free, runs on your machine
    OpenRouter             - Pay per use, multiple models
```

### Claude Setup

```bash
? You selected: Claude

? Enter your Anthropic API key: ****************************

  Validating credentials... ✓

? Select model:
  > Claude Sonnet 4 (recommended)
    Claude 3.5 Sonnet
    Claude 3.5 Haiku (fast)

✓ Configuration saved!
  Provider: Claude
  Model: claude-sonnet-4-20250514

You're all set! Try: s find all png files
```

### OpenAI Setup

```bash
? You selected: ChatGPT (OpenAI)

? Enter your OpenAI API key: ****************************

  Validating credentials... ✓

? Select model:
  > GPT-4o (recommended)
    GPT-4o Mini (fast)
    GPT-4 Turbo

✓ Configuration saved!
```

### Ollama Setup (Local, Free)

```bash
? You selected: Ollama

? Ollama host: http://localhost:11434

  Checking Ollama connection... ✓
  Found 3 models

? Select model:
  > llama3.2
    codellama
    mistral

✓ Configuration saved!
  Provider: Ollama (Local)
  Model: llama3.2
```

### OpenRouter Setup

```bash
? You selected: OpenRouter

? Enter your OpenRouter API key: ****************************

  Validating credentials... ✓

? Select model:
  > Claude Sonnet 4
    Claude 3.5 Sonnet
    GPT-4o
    Gemini Pro 1.5
    Llama 3.1 70B

✓ Configuration saved!
```

### Change Model

```bash
$ s --model

  Current: Claude / claude-sonnet-4-20250514

? Select new model:
    Claude Sonnet 4 (current)
  > Claude 3.5 Sonnet
    Claude 3.5 Haiku (fast)

✓ Model changed to claude-3-5-sonnet-20241022
```

### View Current Config

```bash
$ s --config

  Shell Agent Configuration

  Provider:  claude
  Model:     claude-sonnet-4-20250514

  Config: ~/.shell-agent/config.json
```

---

## 4. History & Learning

Track your command history and learn from patterns.

### View History

```bash
$ s --history

  Command History

  ┌───┬─────────────────────────────────────┬──────────┬────────────┐
  │ # │ Command                             │ Source   │ Time       │
  ├───┼─────────────────────────────────────┼──────────┼────────────┤
  │ 1 │ find . -size +100M -type f          │ ai       │ 2h ago     │
  │ 2 │ lsof -ti:3000 | xargs kill -9       │ shortcut │ 3h ago     │
  │ 3 │ git add . && git commit -m "..."    │ shortcut │ 5h ago     │
  └───┴─────────────────────────────────────┴──────────┴────────────┘

  Showing 3 of 47 entries
```

### Search History

```bash
$ s --history --search "git"

  Command History (filtered: "git")

  ┌───┬─────────────────────────────────────┬──────────┬────────────┐
  │ # │ Command                             │ Source   │ Time       │
  ├───┼─────────────────────────────────────┼──────────┼────────────┤
  │ 3 │ git add . && git commit -m "..."    │ shortcut │ 5h ago     │
  │ 9 │ git reset --soft HEAD~1             │ ai       │ 4d ago     │
  └───┴─────────────────────────────────────┴──────────┴────────────┘
```

### Smart Shortcut Suggestions

```bash
$ s --suggest-shortcuts

  Suggested Shortcuts

  Based on your usage patterns:

  Command: lsof -ti:3000 | xargs kill -9
  Used: 12 times
  Suggested name: killport

? Create shortcut "killport"? (y/n/e)
```

The system learns which commands you use frequently and suggests creating shortcuts for them. **Key feature:** It keys suggestions by COMMAND, not query - so typos and synonyms all count together.

### Stats

```bash
$ s --stats

  Shell Agent Usage Statistics

  Overview
  ┌──────────────────────┬───────────────┐
  │ Metric               │         Value │
  ├──────────────────────┼───────────────┤
  │ Commands Generated   │           147 │
  │ Executed             │     132 (90%) │
  │ Today                │             5 │
  │ This Week            │            23 │
  └──────────────────────┴───────────────┘

  Most Used Commands
  ┌───┬─────────────────────────────────┬──────┬──────────┐
  │ # │ Command                         │ Uses │   Source │
  ├───┼─────────────────────────────────┼──────┼──────────┤
  │ 1 │ lsof -ti:3000 | xargs kill -9   │   23 │ shortcut │
  │ 2 │ find . -size +100M -type f      │   15 │       ai │
  │ 3 │ df -h                           │    8 │       ai │
  └───┴─────────────────────────────────┴──────┴──────────┘
```

---

## 5. Safety Features

### Dangerous Command Detection

Shell Agent automatically detects potentially dangerous operations:

```bash
$ s delete everything in the home directory

  > rm -rf ~/*

  WARNING: This command may cause irreversible changes.

  Reasons:
  - Uses recursive force delete (rm -rf)
  - Targets home directory

? Proceed with this command? (y/N)
```

**Detected patterns:**
- `rm -rf` - Recursive force delete
- `sudo` - Root operations
- `--force`, `-f` - Force flags
- Operations on system directories

### Confirmation by Default

Every command requires confirmation before execution. You always see exactly what will run.

---

## CLI Reference

### Core Commands

```bash
s <natural language>              # Convert to command and execute
s <shortcut> [args]               # Run a shortcut
```

### Configuration

```bash
s --auth                          # Setup/change provider
s --model                         # Change model
s --config                        # View current configuration
```

### Shortcuts

```bash
s --shortcuts                     # List all shortcuts
s --add-shortcut                  # Add new shortcut (interactive)
s --add-shortcut "name" "cmd" args  # Add shortcut (one-liner)
s --remove-shortcut <name>        # Remove a shortcut
s --edit-shortcuts                # Edit shortcuts in $EDITOR
```

### History & Stats

```bash
s --history                       # View command history
s --history --limit N             # Limit to N entries
s --history --search "query"      # Search history
s --stats                         # View usage statistics
s --clear-history --all           # Clear all history
s --clear-history --older-than N  # Clear entries older than N days
s --suggest-shortcuts             # Get shortcut suggestions
```

### Help

```bash
s --help                          # Show help
s --version                       # Show version
```

---

## Configuration

### File Locations

```
~/.shell-agent/
├── config.json           # Main configuration
├── shortcuts.json        # Custom shortcuts
└── history.db            # Command history (SQLite)
```

### config.json

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

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `confirmBeforeExecute` | boolean | `true` | Require confirmation before running commands |
| `historyEnabled` | boolean | `true` | Track command history |
| `historyRetentionDays` | number | `30` | Days to keep history |
| `historyMaxEntries` | number | `2000` | Maximum history entries |
| `autoConfirmShortcuts` | boolean | `false` | Auto-execute shortcuts (dangerous commands still prompt) |

---

## Architecture

### System Overview

```
┌───────────────────────────────────────────────────────────────────────────────┐
│                                USER INPUT                                     │
│                              $ s find large files                             │
└───────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                                  CLI PARSER                                   │
│                                                                               │
│   - Parse arguments and flags                                                 │
│   - Route to appropriate handler                                              │
│     - Flags (--shortcuts, --auth, etc.) → Settings handlers                   │
│     - Natural language → Query handler                                        │
└───────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              SHORTCUT RESOLVER                                │
│                                                                               │
│   - Check if first word matches a shortcut                                    │
│   - If yes: expand template with arguments                                    │
│   - If no: continue to AI provider                                            │
└───────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                               AI PROVIDER                                     │
│                                                                               │
│   - Send query to configured AI (Claude/OpenAI/Ollama/OpenRouter)             │
│   - Receive shell command                                                     │
│   - Clean up response (remove markdown, etc.)                                 │
└───────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              HISTORY TRACKER                                  │
│                                                                               │
│   - Record command in history table                                           │
│   - Update query_stats table (use_count++)                                    │
└───────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                            CONFIRMATION PROMPT                                │
│                                                                               │
│   - Display command                                                           │
│   - Wait for user input (y/n/e/c/edit)                                        │
│   - Handle explain/edit/copy actions                                          │
└───────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              DANGER CHECK                                     │
│                                                                               │
│   - Scan command for dangerous patterns                                       │
│   - If dangerous: require explicit confirmation                               │
└───────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                               EXECUTOR                                        │
│                                                                               │
│   - Spawn shell process                                                       │
│   - Stream stdout/stderr                                                      │
│   - Capture exit code                                                         │
│   - Update history (executed=1, exit_code)                                    │
└───────────────────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
shell-agent/
├── src/
│   ├── index.ts              # Entry point
│   ├── cli/
│   │   ├── index.ts          # Clipanion CLI setup
│   │   └── commands/         # All CLI commands
│   ├── core/
│   │   ├── config.ts         # Config file management
│   │   ├── database.ts       # SQLite database
│   │   ├── history.ts        # History CRUD
│   │   ├── learning.ts       # Shortcut suggestions
│   │   ├── shortcuts.ts      # Shortcut management
│   │   ├── executor.ts       # Shell command executor
│   │   └── types.ts          # Zod schemas & types
│   ├── providers/
│   │   ├── base.ts           # AIProvider interface
│   │   ├── claude.ts         # Anthropic Claude
│   │   ├── openai.ts         # OpenAI GPT
│   │   ├── ollama.ts         # Local Ollama
│   │   └── openrouter.ts     # OpenRouter
│   └── utils/
│       ├── logger.ts         # Colored output
│       ├── spinner.ts        # Loading spinner
│       ├── clipboard.ts      # Copy to clipboard
│       ├── danger.ts         # Danger detection
│       ├── danger-ui.ts      # Danger warnings
│       └── table.ts          # Table rendering
├── docs/                     # Documentation
├── dist/                     # Compiled output
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── biome.json
```
