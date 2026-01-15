# Shell Agent - Project Overview

## One-Liner

**Natural language to shell commands. Stop Googling, start doing.**

---

## The Problem

Every developer faces these pain points daily:

1. **Forgetting commands** - "What's the tar syntax again?" "How do I kill a port?"
2. **Googling basics** - Context switch, copy-paste, hope it works
3. **Repetitive typing** - Same long commands over and over
4. **Syntax variations** - Different tools, different syntax, hard to remember

**Time wasted:**
- Average developer Googles terminal commands 5-10 times per day
- Each search breaks focus for 2-5 minutes
- That's 30-50 minutes of lost flow daily

---

## The Solution

A CLI tool that:

1. Takes natural language input
2. Returns the exact shell command
3. Asks for confirmation
4. Executes it

```bash
$ s find all files larger than 100mb
```
```
  > find . -size +100M -type f

  ? Execute? (y/n/e/c/edit)
```

**Plus:** Custom shortcuts for commands you use repeatedly, history tracking, and smart suggestions.

---

## Core Features

### 1. Natural Language to Command

The foundation. User describes what they want, AI returns the command.

**Examples:**

| Query | Generated Command |
|-------|-------------------|
| find large files | `find . -size +100M -type f` |
| kill port 3000 | `lsof -ti:3000 \| xargs kill -9` |
| undo last git commit | `git reset --soft HEAD~1` |
| compress all jpgs | `find . -name "*.jpg" -exec convert {} -quality 80 {} \;` |
| what's my ip | `curl -s ifconfig.me` |
| show disk usage by folder | `du -sh */ \| sort -hr` |

**Confirmation options:**
- `y` - Execute
- `n` - Cancel
- `e` - Explain what this command does
- `c` - Copy to clipboard
- `edit` - Modify before executing

### 2. Custom Shortcuts

User-defined command templates with argument placeholders.

**Definition:**

| Shortcut | Template | Args |
|----------|----------|------|
| commit | `git add . && git commit -m "{{message}}"` | message |
| killport | `lsof -ti:{{port}} \| xargs kill -9` | port |
| dev | `cd ~/projects/{{project}} && npm run dev` | project |

**Usage:**

| User Types | Result |
|------------|--------|
| `s commit "fixed bug"` | `git add . && git commit -m "fixed bug"` |
| `s killport 3000` | `lsof -ti:3000 \| xargs kill -9` |
| `s dev myapp` | `cd ~/projects/myapp && npm run dev` |

**Management:**
- `s --shortcuts` - List all
- `s --add-shortcut` - Add new (interactive or one-liner)
- `s --remove-shortcut <name>` - Remove
- `s --edit-shortcuts` - Open in editor

### 3. Multi-Provider Support

Use your preferred AI provider.

| Provider | Auth Method | Cost |
|----------|-------------|------|
| Claude (Anthropic) | API Key | Paid |
| OpenAI (ChatGPT) | API Key | Paid |
| Ollama | None (local) | Free |
| OpenRouter | API Key | Pay per use |

**Setup:**
- `s --auth` - One-time provider setup
- `s --model` - Change model within provider

### 4. History & Learning

Track what commands you use. Enable pattern detection and suggestions.

**Capabilities:**

| Command | Purpose |
|---------|---------|
| `s --history` | Show recent commands |
| `s --history --search "git"` | Search history |
| `s --stats` | Usage statistics |
| `s --suggest-shortcuts` | Get shortcut suggestions based on usage |
| `s --clear-history` | Clear history |

**Smart suggestions:**
- System tracks frequently used commands
- Suggests creating shortcuts for commands used 3+ times
- Handles typos and synonyms (keyed by command, not query)

### 5. Safety Features

**Dangerous command detection:**
- Detects `rm -rf`, `sudo`, force operations
- Extra confirmation required
- Clear warning with reasons

**Confirmation by default:**
- Every command requires confirmation
- See exactly what will run before execution

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER INPUT                                     │
│                    s "kill whatever is on port 3000"                    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLI (Clipanion)                                  │
│                   src/cli/index.ts → DefaultCommand.ts                  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                               │
        ▼                                               ▼
┌──────────────────┐                    ┌──────────────────────────────┐
│  Is it a         │                    │   AI Provider                │
│  SHORTCUT?       │                    │  (Claude/OpenAI/Ollama/etc)  │
│  src/core/       │                    │   src/providers/             │
│  shortcuts.ts    │                    └───────────────┬──────────────┘
└────────┬─────────┘                                    │
         │                                              │
         └──────────────────────┬───────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    CONFIRMATION PROMPT                                   │
│              > Will run: lsof -ti:3000 | xargs kill -9                 │
│              > Execute? (y/n/e/c/edit)                                  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    HISTORY TRACKING                                      │
│                 src/core/history.ts + database.ts                       │
│                    (SQLite via better-sqlite3)                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Storage

All user data stored locally in `~/.shell-agent/`:

| File | Format | Purpose |
|------|--------|---------|
| `config.json` | JSON | Provider credentials & settings |
| `shortcuts.json` | JSON | User-defined shortcuts |
| `history.db` | SQLite | Command history & stats |

**Privacy:** Nothing leaves the machine except AI API calls.

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Runtime | Node.js 22+, TypeScript 5.9 |
| CLI Framework | Clipanion |
| Database | better-sqlite3 (SQLite) |
| Validation | Zod |
| UI | picocolors, ora, @inquirer/prompts |
| Build | tsup, Biome |

---

## Competitive Advantage

| Feature | Others | Shell Agent |
|---------|--------|-------------|
| Custom shortcuts | None | First-class feature |
| Multi-provider | Some | Claude, OpenAI, Ollama, OpenRouter |
| History & suggestions | None | Built-in learning |
| Local-first | Varies | All data local |
| Lightweight | Varies | Just `s` + query |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Personal daily usage | 5+ commands |
| Time to first command | < 2 minutes (after install) |
| Successful command rate | > 90% |
| Shortcuts created from suggestions | 3+ |

---

## Summary

**Shell Agent** is a local CLI tool that converts natural language to shell commands.

**Key differentiators:**
- Custom shortcuts with placeholders
- Multi-provider AI support
- History tracking and smart suggestions
- Dangerous command detection
- Privacy-first (all data local)

**Success = using it 5+ times daily instead of Googling.**
