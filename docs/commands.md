# Bashio CLI Reference

Complete reference for all Bashio CLI commands.

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `b <query>` | Convert natural language to shell command |
| `b <shortcut> [args]` | Execute a saved shortcut |
| `b --auth` | Configure AI provider |
| `b --config` | View current configuration |
| `b --model` | Change AI model |
| `b --shortcuts` | List all shortcuts |
| `b --add-shortcut` | Add a new shortcut |
| `b --remove-shortcut <name>` | Remove a shortcut |
| `b --edit-shortcuts` | Edit shortcuts in editor |
| `b --history` | View command history |
| `b --stats` | View usage statistics |
| `b --clear-history` | Clear command history |
| `b --suggest-shortcuts` | Get shortcut suggestions |
| `b --help` | Show help |
| `b --version` | Show version |

---

## Core Commands

### `b <query>` - Natural Language to Command

Convert natural language queries into shell commands.

```bash
b find all files larger than 100mb
b kill whatever is running on port 3000
b show disk usage sorted by size
b undo the last git commit
```

**Output:**
```
  > find . -size +100M -type f

  ? Execute? (y/n/e/c/edit)
```

### Confirmation Options

When prompted `Execute? (y/n/e/c/edit)`:

| Input | Action |
|-------|--------|
| `y` or `Enter` | Execute the command |
| `n` | Cancel and exit |
| `e` | Explain what the command does (AI-powered) |
| `c` | Copy command to clipboard |
| `edit` | Open in editor to modify before executing |

### `b <shortcut> [args]` - Run Shortcuts

Execute saved shortcuts with optional arguments.

```bash
b killport 3000
b commit "my commit message"
b dev myproject
```

**Output:**
```
  [shortcut: killport]
  > lsof -ti:3000 | xargs kill -9

  ? Execute? (y/n/e/c/edit)
```

---

## Configuration Commands

### `b --auth`

Configure AI provider and credentials. Interactive setup wizard.

```bash
b --auth
```

**Supported Providers:**

| Provider | Auth Method | Models |
|----------|-------------|--------|
| Claude (Anthropic) | API Key | claude-sonnet-4, claude-3-5-sonnet, claude-3-5-haiku |
| OpenAI | API Key | gpt-4o, gpt-4o-mini, gpt-4-turbo |
| Ollama | Local (no auth) | Any installed model |
| OpenRouter | API Key | claude-sonnet-4, gpt-4o, gemini-pro, llama-3.1 |

**Flow:**
1. Select provider
2. Enter API key (or configure local host for Ollama)
3. Select model
4. Credentials validated automatically
5. Configuration saved to `~/.bashio/config.json`

### `b --config`

View current configuration.

```bash
b --config
```

**Output:**
```
  Bashio Configuration

  Provider:  claude
  Model:     claude-sonnet-4-20250514

  Config: ~/.bashio/config.json
```

### `b --model`

Change AI model within current provider.

```bash
b --model
```

Opens interactive model selector showing available models for your configured provider.

---

## Shortcuts Commands

### `b --shortcuts`

List all configured shortcuts in a table format.

```bash
b --shortcuts
```

**Output:**
```
  Your Shortcuts

  ┌──────────┬─────────────────────────────────────────┬──────────────┐
  │ Name     │ Template                                │ Arguments    │
  ├──────────┼─────────────────────────────────────────┼──────────────┤
  │ killport │ lsof -ti:{{port}} | xargs kill -9       │ port         │
  │ commit   │ git add . && git commit -m "{{message}}"│ message      │
  │ dev      │ cd ~/projects/{{project}} && npm run dev│ project      │
  └──────────┴─────────────────────────────────────────┴──────────────┘

  Total: 3 shortcuts
```

### `b --add-shortcut`

Add a new shortcut.

**Interactive mode:**
```bash
b --add-shortcut
```

Prompts for:
1. Shortcut name
2. Command template (use `{{arg}}` for placeholders)
3. Argument names (comma-separated)
4. Description (optional)

**One-liner mode:**
```bash
b --add-shortcut <name> "<template>" [args...]
```

**Examples:**
```bash
# No arguments
b --add-shortcut disk "df -h"

# Single argument
b --add-shortcut killport "lsof -ti:{{port}} | xargs kill -9" port

# Multiple arguments
b --add-shortcut deploy "cd ~/projects/{{project}} && git push {{remote}}" project remote
```

### `b --remove-shortcut <name>`

Remove a shortcut by name.

```bash
b --remove-shortcut killport
```

Asks for confirmation before removing.

### `b --edit-shortcuts`

Open shortcuts file in your default editor.

```bash
b --edit-shortcuts
```

Opens `~/.bashio/shortcuts.json` in `$EDITOR` (falls back to nano/notepad).

---

## History & Statistics Commands

### `b --history`

View command history in a table format.

```bash
b --history                    # View recent 20 entries
b --history --limit 50         # View more entries
b --history -l 10              # Short form
b --history --search git       # Search history
b --history -s commit          # Short form search
```

**Options:**

| Option | Short | Description |
|--------|-------|-------------|
| `--limit` | `-l` | Number of entries to show (default: 20) |
| `--search` | `-s` | Search term to filter by query or command |

**Output:**
```
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

**Status Indicators:**
- `✓` - Command executed successfully (exit code 0)
- `✗ exit:N` - Command failed with exit code N
- `○` - Command was not executed (skipped)

### `b --stats`

View usage statistics.

```bash
b --stats
```

**Output:**
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

  Source Breakdown
  ┌───────────────┬───────┬────────────┐
  │ Source        │ Count │ Percentage │
  ├───────────────┼───────┼────────────┤
  │ AI Generated  │   120 │        77% │
  │ Shortcuts     │    36 │        23% │
  └───────────────┴───────┴────────────┘

  Most Used Commands
  ┌───┬─────────────────────────────────┬──────┬──────────┐
  │ # │ Command                         │ Uses │   Source │
  ├───┼─────────────────────────────────┼──────┼──────────┤
  │ 1 │ lsof -ti:3000 | xargs kill -9   │   23 │ shortcut │
  │ 2 │ git status                      │   18 │       ai │
  │ 3 │ docker ps -a                    │   15 │       ai │
  └───┴─────────────────────────────────┴──────┴──────────┘
```

### `b --clear-history`

Clear command history.

```bash
b --clear-history --all           # Clear all history (with confirmation)
b --clear-history -a              # Short form
b --clear-history --older-than 7  # Clear entries older than 7 days
b --clear-history -o 30           # Short form
```

**Options:**

| Option | Short | Description |
|--------|-------|-------------|
| `--all` | `-a` | Clear all history entries |
| `--older-than` | `-o` | Clear entries older than N days |

### `b --suggest-shortcuts`

Get personalized shortcut suggestions based on frequently used commands.

```bash
b --suggest-shortcuts              # Default threshold: 3+ uses
b --suggest-shortcuts --threshold 5  # Higher threshold
b --suggest-shortcuts -t 2         # Lower threshold
```

**Options:**

| Option | Short | Description |
|--------|-------|-------------|
| `--threshold` | `-t` | Minimum use count to suggest (default: 3) |

**Output:**
```
  Suggested Shortcuts

  Based on your usage patterns:

  Command: lsof -ti:3000 | xargs kill -9
  Used: 8 times
  Suggested name: killport

  ? Create shortcut "killport"? (y/n/e)
```

**Confirmation options:**
- `y` - Create the shortcut
- `n` - Skip this suggestion
- `e` - Exit suggestions

---

## Utility Commands

### `b --help`

Show help with all available commands.

```bash
b --help
```

### `b --version`

Show Bashio version.

```bash
b --version
```

---

## Configuration Files

All configuration stored in `~/.bashio/`:

| File | Purpose |
|------|---------|
| `config.json` | AI provider settings, credentials, preferences |
| `shortcuts.json` | User-defined shortcuts |
| `history.db` | Command history and usage stats (SQLite) |

### Settings in config.json

Customizable settings in `~/.bashio/config.json`:

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

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `confirmBeforeExecute` | boolean | `true` | Require confirmation before running commands |
| `historyEnabled` | boolean | `true` | Track command history |
| `historyRetentionDays` | number | `30` | Days to keep history before auto-cleanup |
| `historyMaxEntries` | number | `2000` | Maximum history entries to retain |
| `autoConfirmShortcuts` | boolean | `false` | Skip confirmation for shortcuts (dangerous commands still prompt) |

---

## Shortcut File Format

Example `~/.bashio/shortcuts.json`:

```json
{
  "version": 1,
  "shortcuts": {
    "killport": {
      "template": "lsof -ti:{{port}} | xargs kill -9",
      "args": ["port"],
      "description": "Kill process on port"
    },
    "commit": {
      "template": "git add . && git commit -m \"{{message}}\"",
      "args": ["message"],
      "description": "Stage all and commit"
    },
    "dev": {
      "template": "cd ~/projects/{{project}} && npm run dev",
      "args": ["project"],
      "description": "Start dev server"
    }
  }
}
```

### Placeholder Syntax

Use `{{name}}` for dynamic arguments in templates.

**Single argument shortcut:**
```bash
b killport 3000
# Expands to: lsof -ti:3000 | xargs kill -9
```

**Multi-word single argument:**
```bash
b commit "fixed the navbar bug"
# Expands to: git add . && git commit -m "fixed the navbar bug"
```

**Missing arguments:**
If required arguments aren't provided, Bashio prompts for them interactively.
