# Database & Authentication Design

## Overview

Shell Agent is a **fully local CLI tool**. There is no cloud, no server, no user accounts. Everything lives on the user's machine.

```
┌─────────────────────────────────────────────────────────────┐
│                    USER'S MACHINE                            │
│                                                              │
│   ~/.shell-agent/                                            │
│   ├── config.json        ← Settings + AI provider auth       │
│   ├── shortcuts.json     ← Custom shortcuts                  │
│   └── history.db         ← SQLite database                   │
│                                                              │
│   Nothing leaves the machine except AI API calls             │
└─────────────────────────────────────────────────────────────┘
```

---

## Authentication

### What Auth Means Here

There is **no Shell Agent account**. The only "auth" is connecting to an AI provider so the tool can generate commands.

### Supported Providers

| Provider | Auth Method | Cost |
|----------|-------------|------|
| Claude (Anthropic) | API Key | Paid |
| OpenAI | API Key | Paid |
| Ollama | None (local) | Free |
| OpenRouter | API Key | Pay per use |

### Auth Flow

```
User runs: s --auth
                │
                ▼
┌─────────────────────────────────────┐
│  Select provider:                   │
│  > Claude (Anthropic)               │
│    ChatGPT (OpenAI)                 │
│    Ollama (Local)                   │
│    OpenRouter                       │
└─────────────────────────────────────┘
                │
                ▼ (User selects Claude)
┌─────────────────────────────────────┐
│  Enter API key:                     │
│  > ****************************     │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Validate key with test API call    │
│  If valid → Select model            │
│  If invalid → Show error, retry     │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Select model:                      │
│  > Claude Sonnet 4 (recommended)    │
│    Claude 3.5 Sonnet                │
│    Claude 3.5 Haiku (fast)          │
└─────────────────────────────────────┘
                │
                ▼
        Save to config.json
                │
                ▼
        ✓ Ready to use!
```

### Where Credentials Are Stored

```
~/.shell-agent/config.json
```

Credentials never leave the user's machine. We never see them. We have no server.

### Invalid Credentials Handling

When an API call fails due to invalid credentials:

```
User runs: s find large files
                │
                ▼
        API call fails (401 unauthorized)
                │
                ▼
┌─────────────────────────────────────┐
│  ✗ Failed to generate command       │
│  Claude API error: 401 - ...        │
│                                     │
│  Run 's --auth' to reconfigure.     │
└─────────────────────────────────────┘
```

---

## Storage Overview

### Why Two Storage Types?

| Data | Storage | Reason |
|------|---------|--------|
| Config | JSON file | User might edit manually |
| Shortcuts | JSON file | User might edit, share, or version control |
| History | SQLite | Needs fast queries, indexing, aggregations |

### File Locations

```
~/.shell-agent/
│
├── config.json           JSON     ~1 KB      Settings + credentials
├── shortcuts.json        JSON     ~5 KB      Custom shortcuts
└── history.db            SQLite   ~500 KB    Command history + stats
```

### File Permissions

All files created with `0o600` permissions (owner read/write only) for security.

---

## JSON Schemas

### config.json

Stores settings and AI provider credentials.

**Structure:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| version | integer | yes | Schema version for migrations |
| provider | string | yes | "claude" / "openai" / "ollama" / "openrouter" |
| model | string | yes | Model identifier |
| credentials | object | yes | Provider-specific auth data |
| settings | object | no | User preferences |

**Credentials by Provider:**

| Provider | Credentials Object |
|----------|-------------------|
| Claude | `{ "type": "api_key", "apiKey": "sk-ant-..." }` |
| OpenAI | `{ "type": "api_key", "apiKey": "sk-..." }` |
| Ollama | `{ "type": "local", "host": "http://localhost:11434" }` |
| OpenRouter | `{ "type": "api_key", "apiKey": "sk-or-..." }` |

**Settings Object:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| confirmBeforeExecute | boolean | true | Ask before running commands |
| historyEnabled | boolean | true | Track command history |
| historyRetentionDays | integer | 30 | Days to keep history |
| historyMaxEntries | integer | 2000 | Max entries to keep |
| autoConfirmShortcuts | boolean | false | Skip confirmation for shortcuts |

**Example:**

```json
{
  "version": 1,
  "provider": "claude",
  "model": "claude-sonnet-4-20250514",
  "credentials": {
    "type": "api_key",
    "apiKey": "sk-ant-api03-xxxxxxxxxxxxx"
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

---

### shortcuts.json

Stores user-defined command shortcuts.

**Structure:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| version | integer | yes | Schema version |
| shortcuts | object | yes | Map of name → shortcut definition |

**Shortcut Definition:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| template | string | yes | Command with `{{arg}}` placeholders |
| args | array | no | Argument names in order |
| description | string | no | Human-readable description |

**Example:**

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

**Shortcut Usage Examples:**

| User Types | Shortcut Found | Args Extracted | Final Command |
|------------|---------------|----------------|---------------|
| `s commit "fixed bug"` | commit | message="fixed bug" | `git add . && git commit -m "fixed bug"` |
| `s killport 3000` | killport | port=3000 | `lsof -ti:3000 \| xargs kill -9` |
| `s dev myapp` | dev | project=myapp | `cd ~/projects/myapp && npm run dev` |

---

## SQLite Database

### Why SQLite?

| Need | JSON | SQLite |
|------|------|--------|
| Fast queries on 1000+ rows | Slow | Fast |
| Search with LIKE/patterns | Manual | Built-in |
| Aggregations (COUNT, GROUP BY) | Manual | Built-in |
| Indexing | None | Supported |
| Single file, no server | Yes | Yes |

SQLite gives us database power with file simplicity.

### Database Location

```
~/.shell-agent/history.db
```

File permissions: `0o600` (owner read/write only)

---

## Table: history

Stores recent command history. **Auto-cleaned** based on retention settings.

### Schema

```sql
CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  command TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('ai', 'shortcut')),
  working_directory TEXT NOT NULL,
  executed INTEGER DEFAULT 0,
  exit_code INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| query | TEXT | User's natural language input |
| command | TEXT | Generated shell command |
| source | TEXT | "ai" or "shortcut" |
| working_directory | TEXT | CWD when command was generated |
| executed | INTEGER | 0=not run, 1=user executed it |
| exit_code | INTEGER | Command exit code (NULL if not executed) |
| created_at | TEXT | ISO timestamp |

### Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_history_created ON history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_query ON history(query);
CREATE INDEX IF NOT EXISTS idx_history_working_dir ON history(working_directory);
```

### Retention Policy

- Default: Delete entries older than 30 days
- Cap at max 2000 entries
- Cleanup runs on app start (once per day)

### Example Data

| id | query | command | source | executed | exit_code | created_at |
|----|-------|---------|--------|----------|-----------|------------|
| 1 | find large files | find . -size +100M -type f | ai | 1 | 0 | 2025-01-08 10:30:00 |
| 2 | killport 3000 | lsof -ti:3000 \| xargs kill -9 | shortcut | 1 | 0 | 2025-01-08 11:45:00 |
| 3 | show disk space | df -h | ai | 0 | NULL | 2025-01-08 15:00:00 |

**Notes:**
- Entry 3: `executed=0` means user saw the command but chose not to run it

---

## Table: query_stats

Stores aggregated usage statistics. **Never deleted** — stays tiny because it only holds unique commands.

### Schema

```sql
CREATE TABLE IF NOT EXISTS query_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command TEXT UNIQUE NOT NULL,
  source TEXT NOT NULL CHECK(source IN ('ai', 'shortcut')),
  use_count INTEGER DEFAULT 1,
  success_count INTEGER DEFAULT 0,
  suggested INTEGER DEFAULT 0,
  first_used TEXT NOT NULL,
  last_used TEXT NOT NULL
);
```

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| command | TEXT | Unique shell command (UNIQUE KEY) |
| source | TEXT | "ai" or "shortcut" |
| use_count | INTEGER | Total times this command was used |
| success_count | INTEGER | Times it succeeded (exit_code=0) |
| suggested | INTEGER | 0=not suggested, 1=already suggested as shortcut |
| first_used | TEXT | First time command was used |
| last_used | TEXT | Most recent use |

### Why Keyed by Command (Not Query)?

Users phrase the same thing differently:
- "find large files"
- "find larg files" (typo)
- "show large files" (synonym)

All might generate the same command: `find . -size +100M -type f`

By keying stats by **command**, we correctly count usage regardless of phrasing!

### Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_stats_use_count ON query_stats(use_count DESC);
```

### Retention Policy

**Never deleted.** Only grows by unique commands. Even a power user will have 200-500 unique commands ever — table stays under 100KB.

### Example Data

| id | command | source | use_count | success_count | suggested | first_used | last_used |
|----|---------|--------|-----------|---------------|-----------|------------|-----------|
| 1 | find . -size +100M -type f | ai | 15 | 15 | 0 | 2025-01-01 | 2025-01-08 |
| 2 | lsof -ti:3000 \| xargs kill -9 | ai | 23 | 20 | 1 | 2025-01-02 | 2025-01-08 |
| 3 | df -h | ai | 8 | 7 | 0 | 2025-01-03 | 2025-01-07 |

---

## Table: metadata

Key-value store for database settings.

```sql
CREATE TABLE IF NOT EXISTS metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

| key | value |
|-----|-------|
| db_version | "1" |
| last_cleanup | "2025-01-08T10:00:00.000Z" |

---

## Data Flow

### On Every Command

```
User runs: s find large files
                │
                ▼
┌─────────────────────────────────────┐
│ 1. Load shortcuts.json              │
│    Check if "find" is a shortcut    │
│    → Not found                      │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ 2. Load config.json                 │
│    Get provider + credentials       │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ 3. Call AI provider                 │
│    Input: "find large files"        │
│    Output: "find . -size +100M"     │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ 4. Save to database                 │
│                                     │
│    history table:                   │
│    INSERT new row                   │
│                                     │
│    query_stats table:               │
│    INSERT or UPDATE                 │
│    (increment use_count if exists)  │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ 5. Show command, ask confirmation   │
│    > Will run: find . -size +100M   │
│    > Execute? (y/n/e/c/edit)        │
└─────────────────────────────────────┘
                │
                ▼ (User confirms)
┌─────────────────────────────────────┐
│ 6. Execute command                  │
│    Capture exit code                │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│ 7. Update database                  │
│                                     │
│    history table:                   │
│    SET executed=1, exit_code=0      │
│                                     │
│    query_stats table:               │
│    INCREMENT success_count          │
└─────────────────────────────────────┘
```

### On App Start

```
App starts
    │
    ▼
┌─────────────────────────────────────┐
│ 1. Initialize database              │
│    Create tables if not exist       │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 2. Check if cleanup needed          │
│    (once per day)                   │
└─────────────────────────────────────┘
    │
    ▼ (if > 24 hours since last cleanup)
┌─────────────────────────────────────┐
│ 3. Run history cleanup              │
│                                     │
│    DELETE FROM history              │
│    WHERE created_at < (now - 30d)   │
│                                     │
│    DELETE oldest entries            │
│    IF count > maxEntries            │
│                                     │
│    Update metadata.last_cleanup     │
└─────────────────────────────────────┘
    │
    ▼
    Ready to accept commands
```

---

## Query Patterns

### Get Recent History

```sql
SELECT * FROM history 
ORDER BY created_at DESC 
LIMIT 20
```

### Search History

```sql
SELECT * FROM history 
WHERE query LIKE '%git%' OR command LIKE '%git%'
ORDER BY created_at DESC 
LIMIT 20
```

### Get Stats

```sql
-- Total commands
SELECT COUNT(*) FROM history

-- Today's commands
SELECT COUNT(*) FROM history 
WHERE date(created_at) = date('now')

-- Top commands
SELECT command, use_count, source FROM query_stats 
ORDER BY use_count DESC 
LIMIT 5
```

### Get Shortcut Suggestions

```sql
SELECT * FROM query_stats 
WHERE source = 'ai' 
  AND use_count >= 3 
  AND suggested = 0
ORDER BY use_count DESC
LIMIT 10
```

---

## Size Estimates

### history table

| Usage | Entries | Approximate Size |
|-------|---------|------------------|
| Light (10/day x 30 days) | 300 | ~60 KB |
| Medium (30/day x 30 days) | 900 | ~180 KB |
| Heavy (50/day x 30 days) | 1,500 | ~300 KB |

**With retention, never exceeds ~500 KB.**

### query_stats table

| User Type | Unique Commands | Approximate Size |
|-----------|-----------------|------------------|
| Casual | 50-100 | ~15 KB |
| Regular | 100-300 | ~45 KB |
| Power User | 300-500 | ~75 KB |

**Grows very slowly, stays under 100 KB forever.**

### Total Database Size

**Maximum realistic size: ~500 KB**

This is tiny. No performance concerns.

---

## Security Considerations

### Credentials Storage

| Concern | Mitigation |
|---------|------------|
| API keys stored in plain text | Standard practice for CLI tools (like AWS CLI, gh CLI) |
| Other users on machine could read | File permissions: 0o600 (owner read/write only) |

### History Privacy

| Concern | Mitigation |
|---------|------------|
| Sensitive commands in history | User can disable history in settings |
| Commands visible to others | Database file permissions: 0o600 |
| Clear history | `s --clear-history` command |

---

## Summary

| Component | Storage | Size | Cleanup |
|-----------|---------|------|---------|
| Settings + Auth | config.json | ~1 KB | Never |
| Shortcuts | shortcuts.json | ~5 KB | Never (user manages) |
| Recent History | history table | ~300 KB | Auto (30 days) |
| Usage Stats | query_stats table | ~75 KB | Never |

**Total footprint: Under 500 KB, always.**

No server. No cloud. No accounts. Just local files doing their job.
