# Shell Agent Commands

Complete reference for all Shell Agent CLI commands.

---

## Main Usage

```bash
s <natural language query>    # Convert natural language to shell command
s <shortcut> [arguments]      # Run a saved shortcut
```

---

## Commands

### `s` (default)

Convert natural language to shell commands or run shortcuts.

```bash
s find all files larger than 100mb
s kill whatever is running on port 3000
s commit "my message"          # runs shortcut if exists
```

**Confirmation options:**

| Input | Action |
|-------|--------|
| `y` or Enter | Execute the command |
| `n` | Cancel |
| `e` | Explain what the command does |
| `c` | Copy to clipboard and exit |
| `edit` | Edit command before executing |

---

### `s --auth`

Configure AI provider for Shell Agent.

```bash
s --auth
```

**Supported providers:**
- Claude (Anthropic) - API key
- OpenAI (ChatGPT) - API key
- Ollama - Local, free
- OpenRouter - API key

---

### `s --config`

View current configuration.

```bash
s --config
```

Shows:
- Current provider
- Current model
- Config file location

---

### `s --model`

Change AI model within current provider.

```bash
s --model
```

Displays available models for your configured provider and lets you select a new one.

---

### `s --shortcuts`

List all configured shortcuts.

```bash
s --shortcuts
```

Shows a table with:
- Shortcut name
- Command template
- Required arguments

---

### `s --add-shortcut`

Add a new shortcut.

**Interactive mode:**
```bash
s --add-shortcut
```

**One-liner mode:**
```bash
s --add-shortcut <name> "<template>" <args>
```

**Examples:**
```bash
# Interactive
s --add-shortcut

# One-liner
s --add-shortcut killport "lsof -ti:{{port}} | xargs kill -9" port
s --add-shortcut commit "git add . && git commit -m \"{{message}}\"" message
s --add-shortcut dev "cd ~/projects/{{project}} && npm run dev" project
```

**Template placeholders:** Use `{{name}}` for arguments.

---

### `s --remove-shortcut <name>`

Remove a shortcut.

```bash
s --remove-shortcut killport
```

Asks for confirmation before removing.

---

### `s --edit-shortcuts`

Open shortcuts file in your default editor.

```bash
s --edit-shortcuts
```

Opens `~/.shell-agent/shortcuts.json` in `$EDITOR` (or nano/notepad if not set).

---

### `s --history`

View command history in a table format.

```bash
s --history                    # View recent 20 entries
s --history --limit 50         # View more entries
s --history -l 10              # Short form
s --history --search git       # Search history
s --history -s commit          # Short form search
```

**Options:**

| Option | Description |
|--------|-------------|
| `--limit, -l` | Number of entries to show (default: 20) |
| `--search, -s` | Search term to filter history |

**Output columns:**
- `#` - Entry number
- `Command` - The shell command
- `Query` - Original natural language query (if AI-generated)
- `Source` - `ai` or `shortcut`
- `Status` - `✓ success`, `✗ exit:N`, or `○ skipped`
- `Time` - How long ago

---

### `s --stats`

View usage statistics with overview, source breakdown, and most used commands.

```bash
s --stats
```

**Shows three tables:**
1. **Overview** - Total commands, execution rate, today/this week counts
2. **Source Breakdown** - AI vs shortcuts usage percentages
3. **Most Used Commands** - Top commands ranked by usage

---

### `s --clear-history`

Clear command history.

```bash
s --clear-history --all           # Clear all history (with confirmation)
s --clear-history -a              # Short form
s --clear-history --older-than 7  # Clear entries older than 7 days
s --clear-history -o 30           # Short form
```

**Options:**

| Option | Description |
|--------|-------------|
| `--all, -a` | Clear all history entries |
| `--older-than, -o` | Clear entries older than N days |

---

### `s --suggest-shortcuts`

Get personalized shortcut suggestions based on your frequently used commands.

```bash
s --suggest-shortcuts              # Default threshold: 3+ uses
s --suggest-shortcuts --threshold 5  # Higher threshold
s --suggest-shortcuts -t 2         # Lower threshold
```

**Options:**

| Option | Description |
|--------|-------------|
| `--threshold, -t` | Minimum use count to suggest (default: 3) |

**Interactive prompts:**

| Input | Action |
|-------|--------|
| `y` | Create the shortcut |
| `n` | Skip this suggestion |
| `e` | Exit suggestions |

When creating a shortcut, you can:
- Edit the suggested name
- Parameterize numbers (e.g., port 3000 → `{{arg1}}`)

---

### `s --help`

Show help with all available commands.

```bash
s --help
```

---

### `s --version`

Show Shell Agent version.

```bash
s --version
```

---

## Configuration Files

All configuration is stored in `~/.shell-agent/`:

| File | Purpose |
|------|---------|
| `config.json` | AI provider settings and credentials |
| `shortcuts.json` | User-defined shortcuts |
| `history.db` | Command history and usage stats (SQLite) |

### Settings in config.json

You can edit `~/.shell-agent/config.json` to customize these settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `historyEnabled` | `true` | Track command history |
| `historyRetentionDays` | `30` | Days to keep history |
| `historyMaxEntries` | `2000` | Maximum history entries |
| `autoConfirmShortcuts` | `false` | Auto-execute shortcuts without confirmation (dangerous commands still prompt) |

**Example:** To enable auto-confirm for shortcuts, edit your config:

```json
{
  "settings": {
    "autoConfirmShortcuts": true
  }
}
```

---

## Example Shortcuts

```json
{
  "version": 1,
  "shortcuts": {
    "commit": {
      "template": "git add . && git commit -m \"{{message}}\"",
      "args": ["message"],
      "description": "Stage all and commit"
    },
    "killport": {
      "template": "lsof -ti:{{port}} | xargs kill -9",
      "args": ["port"],
      "description": "Kill process on port"
    },
    "dev": {
      "template": "cd ~/projects/{{project}} && npm run dev",
      "args": ["project"],
      "description": "Start dev server"
    }
  }
}
```

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `s <query>` | Natural language to command |
| `s <shortcut> [args]` | Run a shortcut |
| `s --auth` | Configure AI provider |
| `s --config` | View configuration |
| `s --model` | Change AI model |
| `s --shortcuts` | List shortcuts |
| `s --add-shortcut` | Add shortcut |
| `s --remove-shortcut <name>` | Remove shortcut |
| `s --edit-shortcuts` | Edit shortcuts file |
| `s --history` | View command history |
| `s --stats` | View usage statistics |
| `s --clear-history` | Clear history |
| `s --suggest-shortcuts` | Get shortcut suggestions |
| `s --help` | Show help |
| `s --version` | Show version |
