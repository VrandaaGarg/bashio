## Overview

Shell Agent is a **fully local CLI tool**. There is no cloud, no server, no user accounts on our side. Everything lives on the user's machine.

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

| Provider | Auth Method | Cost to User |
| --- | --- | --- |
| Claude | Session token from claude.ai | Free (uses Pro subscription) |
| ChatGPT | Session token from chat.openai.com | Free (uses Plus subscription) |
| Ollama | None (runs locally) | Free (local models) |
| OpenRouter | API key | Pay per use |

### Auth Flow

```
User runs: s --auth
                │
                ▼
┌─────────────────────────────────────┐
│  Select provider:                   │
│  > Claude                           │
│    ChatGPT                          │
│    Ollama                           │
│    OpenRouter                       │
└─────────────────────────────────────┘
                │
                ▼ (User selects Claude)
┌─────────────────────────────────────┐
│  Get session token:                 │
│  1. Open claude.ai                  │
│  2. DevTools → Cookies              │
│  3. Copy "sessionKey" value         │
│  4. Paste here: __________          │
└─────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  Validate token with test API call  │
│  If valid → Save to config.json     │
│  If invalid → Show error, retry     │
└─────────────────────────────────────┘
                │
                ▼
        ✓ Ready to use!

```

### Where Credentials Are Stored

```
~/.shell-agent/config.json

```

Credentials never leave the user's machine. We never see them. We have no server.

### Token Expiry

Session tokens expire. When a token fails:

```
User runs: s find large files
                │
                ▼
        API call fails (401 unauthorized)
                │
                ▼
┌─────────────────────────────────────┐
│  ⚠️ Session expired.                │
│  Run 's --auth' to re-authenticate. │
└─────────────────────────────────────┘

```

---

## Storage Overview

### Why Two Storage Types?

| Data | Storage | Reason |
| --- | --- | --- |
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

---

## JSON Schemas

### config.json

Stores settings and AI provider credentials.

**Structure:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| version | integer | yes | Schema version for migrations |
| provider | string | yes | "claude" / "chatgpt" / "ollama" / "openrouter" |
| model | string | yes | Model identifier |
| credentials | object | yes | Provider-specific auth data |
| settings | object | no | User preferences |

**Credentials by Provider:**

| Provider | Credentials Object |
| --- | --- |
| Claude | `{ "type": "session", "sessionToken": "sk-ant-..." }` |
| ChatGPT | `{ "type": "session", "accessToken": "..." }` |
| Ollama | `{ "type": "local", "host": "http://localhost:11434" }` |
| OpenRouter | `{ "type": "api_key", "apiKey": "sk-or-..." }` |

**Settings Object:**

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| confirmBeforeExecute | boolean | true | Ask before running commands |
| historyEnabled | boolean | true | Track command history |
| historyRetentionDays | integer | 30 | Days to keep history |
| historyMaxEntries | integer | 2000 | Max entries to keep |

**Example:**

```json
{
  "version": 1,
  "provider": "claude",
  "model": "claude-sonnet-4",
  "credentials": {
    "type": "session",
    "sessionToken": "sk-ant-sid01-xxxxxxxxxxxxx"
  },
  "settings": {
    "confirmBeforeExecute": true,
    "historyEnabled": true,
    "historyRetentionDays": 30,
    "historyMaxEntries": 2000
  }
}

```

---

### shortcuts.json

Stores user-defined command shortcuts.

**Structure:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| version | integer | yes | Schema version |
| shortcuts | object | yes | Map of name → shortcut definition |

**Shortcut Definition:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| template | string | yes | Command with `{{arg}}` placeholders |
| args | array of strings | no | Argument names in order |
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
    "kakiyo": {
      "template": "cd ~/projects/kakiyo && code .",
      "args": [],
      "description": "Open Kakiyo project"
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
    },
    "logs": {
      "template": "tail -f ~/projects/{{project}}/logs/{{env}}.log",
      "args": ["project", "env"],
      "description": "Tail project logs"
    }
  }
}

```

**Shortcut Usage Examples:**

| User Types | Shortcut Found | Args Extracted | Final Command |
| --- | --- | --- | --- |
| `s kakiyo` | kakiyo | (none) | `cd ~/projects/kakiyo && code .` |
| `s commit "fixed bug"` | commit | message="fixed bug" | `git add . && git commit -m "fixed bug"` |
| `s killport 3000` | killport | port=3000 | `lsof -ti:3000 | xargs kill -9` |
| `s dev kakiyo` | dev | project=kakiyo | `cd ~/projects/kakiyo && npm run dev` |
| `s logs kakiyo prod` | logs | project=kakiyo, env=prod | `tail -f ~/projects/kakiyo/logs/prod.log` |

---

## SQLite Database

### Why SQLite?

| Need | JSON | SQLite |
| --- | --- | --- |
| Fast queries on 1000+ rows | ❌ Slow | ✅ Fast |
| Search with LIKE/patterns | ❌ Manual | ✅ Built-in |
| Aggregations (COUNT, GROUP BY) | ❌ Manual | ✅ Built-in |
| Indexing | ❌ None | ✅ Supported |
| Single file, no server | ✅ Yes | ✅ Yes |

SQLite gives us database power with file simplicity.

---

## Table: history

Stores recent command history. **Auto-cleaned** based on retention settings.

### Schema

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY, AUTO INCREMENT | Unique identifier |
| query | TEXT | NOT NULL | User's natural language input |
| command | TEXT | NOT NULL | Generated shell command |
| source | TEXT | NOT NULL | "ai" or "shortcut" |
| executed | INTEGER | DEFAULT 0 | 0=not run, 1=user executed it |
| exit_code | INTEGER | NULLABLE | Command exit code (0=success) |
| created_at | TEXT | DEFAULT current timestamp | When entry was created |

### Indexes

| Index Name | Column(s) | Purpose |
| --- | --- | --- |
| idx_history_created | created_at | Fast cleanup, sorting by date |
| idx_history_query | query | Fast text search |

### Retention Policy

- Default: Delete entries older than 30 days
- Also cap at max 2000 entries
- Cleanup runs on app start

### Example Data

| id | query | command | source | executed | exit_code | created_at |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | find large files | find . -size +100M -type f | ai | 1 | 0 | 2025-01-08 10:30:00 |
| 2 | kill port 3000 | lsof -ti:3000 | xargs kill -9 | ai | 1 | 0 | 2025-01-08 11:45:00 |
| 3 | commit "fixed bug" | git add . && git commit -m "fixed bug" | shortcut | 1 | 0 | 2025-01-08 12:00:00 |
| 4 | kakiyo | cd ~/projects/kakiyo && code . | shortcut | 1 | 0 | 2025-01-08 14:20:00 |
| 5 | show disk space | df -h | ai | 0 | NULL | 2025-01-08 15:00:00 |
| 6 | kill port 3000 | lsof -ti:3000 | xargs kill -9 | ai | 1 | 0 | 2025-01-08 16:30:00 |

**Notes:**

- Entry 5: `executed=0` means user saw the command but chose not to run it
- Entry 6: Same query as entry 2, but stored separately (history tracks every invocation)

---

## Table: query_stats

Stores aggregated usage statistics. **Never deleted** — stays tiny because it only holds unique queries.

### Schema

| Column | Type | Constraints | Description |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY, AUTO INCREMENT | Unique identifier |
| query | TEXT | UNIQUE, NOT NULL | Unique natural language query |
| command | TEXT | NOT NULL | Most recent command for this query |
| source | TEXT | NOT NULL | "ai" or "shortcut" |
| use_count | INTEGER | DEFAULT 1 | Total times this query was used |
| success_count | INTEGER | DEFAULT 0 | Times it succeeded (exit_code=0) |
| first_used | TEXT | NOT NULL | First time query was used |
| last_used | TEXT | NOT NULL | Most recent use |

### Indexes

| Index Name | Column(s) | Purpose |
| --- | --- | --- |
| (automatic) | query | UNIQUE constraint creates index |
| idx_stats_use_count | use_count | Fast "most used" queries |

### Retention Policy

**Never deleted.** This table only grows by unique queries, not by usage. Even a power user will have maybe 200-500 unique queries ever.

### Example Data

| id | query | command | source | use_count | success_count | first_used | last_used |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | find large files | find . -size +100M -type f | ai | 15 | 15 | 2025-01-01 | 2025-01-08 |
| 2 | kill port 3000 | lsof -ti:3000 | xargs kill -9 | ai | 23 | 20 | 2025-01-02 | 2025-01-08 |
| 3 | kakiyo | cd ~/projects/kakiyo && code . | shortcut | 45 | 45 | 2025-01-01 | 2025-01-08 |
| 4 | show disk space | df -h | ai | 8 | 7 | 2025-01-03 | 2025-01-07 |
| 5 | commit "fixed bug" | git add . && git commit -m "fixed bug" | shortcut | 12 | 12 | 2025-01-02 | 2025-01-08 |

**Notes:**

- "kill port 3000" was used 23 times, succeeded 20 times (3 times nothing was on that port)
- This data powers "suggest shortcuts" feature — query 2 is a great shortcut candidate!

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
│    > Execute? (y/n)                 │
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
│ 1. Check config.json exists         │
│    If not → prompt for setup        │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ 2. Run history cleanup              │
│                                     │
│    DELETE FROM history              │
│    WHERE created_at < (now - 30d)   │
│                                     │
│    DELETE oldest entries            │
│    IF count > maxEntries            │
└─────────────────────────────────────┘
    │
    ▼
    Ready to accept commands

```

---

## Query Patterns

### Get Recent History

**Purpose:** Show user their recent commands (`s --history`)

**Logic:**

- Select from history table
- Order by created_at descending
- Limit to 20 (or user-specified)

**Result:**

| # | Query | Command | When |
| --- | --- | --- | --- |
| 1 | find large files | find . -size +100M -type f | 2 hours ago |
| 2 | kill port 3000 | lsof -ti:3000 | xargs kill -9 | 3 hours ago |
| 3 | commit "fixed bug" | git add . && git commit -m "..." | 5 hours ago |

---

### Search History

**Purpose:** Find commands matching a search term (`s --history --search "git"`)

**Logic:**

- Select from history table
- Where query LIKE %term% OR command LIKE %term%
- Order by created_at descending

**Result for "git":**

| # | Query | Command | When |
| --- | --- | --- | --- |
| 3 | commit "fixed bug" | git add . && git commit -m "..." | 5 hours ago |
| 8 | undo last commit | git reset --soft HEAD~1 | 2 days ago |

---

### Re-run Command

**Purpose:** Execute a command from history (`s --run 3`)

**Logic:**

- Select from history where id = 3
- Show command, ask confirmation
- If confirmed, execute
- Create new history entry (or update existing)

---

### Get Frequent Queries (Suggest Shortcuts)

**Purpose:** Find queries user should make into shortcuts (`s --suggest-shortcuts`)

**Logic:**

- Select from query_stats
- Where use_count >= 3 AND source = 'ai'
- Order by use_count descending

**Result:**

| Query | Times Used | Suggested Shortcut |
| --- | --- | --- |
| kill port 3000 | 23 | `killport {{port}}` |
| find large files | 15 | `largefiles` |
| show disk space | 8 | `disk` |

**Note:** Only suggest for AI queries, not existing shortcuts.

---

### Get Stats

**Purpose:** Show usage statistics (`s --stats`)

**Logic:**

- Count total from history
- Count today from history (where date = today)
- Count this week from history (where date >= 7 days ago)
- Get top 5 from query_stats by use_count

**Result:**

```
Total commands: 247
Today: 12
This week: 58

Most used:
1. kakiyo (45 times)
2. kill port 3000 (23 times)
3. find large files (15 times)
4. commit (12 times)
5. show disk space (8 times)

```

---

## Size Estimates

### history table

| Usage | Entries | Approximate Size |
| --- | --- | --- |
| Light (10/day × 30 days) | 300 | ~60 KB |
| Medium (30/day × 30 days) | 900 | ~180 KB |
| Heavy (50/day × 30 days) | 1,500 | ~300 KB |

**With retention, never exceeds ~500 KB.**

### query_stats table

| User Type | Unique Queries | Approximate Size |
| --- | --- | --- |
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
| --- | --- |
| Tokens stored in plain text | Standard practice for CLI tools (like AWS CLI, gh CLI) |
| Other users on machine could read | File permissions: 600 (owner read/write only) |
| Malware could steal tokens | Out of scope — same risk as any CLI tool |

### History Privacy

| Concern | Mitigation |
| --- | --- |
| Sensitive commands in history | User can disable history in settings |
| Commands visible to others | Database file permissions: 600 |
| Clear history | `s --clear-history` command |

---

## Migration Strategy

### Why Version Numbers?

If we change the schema later, we need to migrate existing data.

**config.json version 1 → version 2:**

- Read file
- Check version
- Apply transformations
- Update version number
- Write file

**SQLite migrations:**

- Check if table exists
- Check if columns exist
- ALTER TABLE to add new columns
- Create new tables if needed

### Example Future Migration

Version 1 → Version 2: Add "tags" to shortcuts

```
Before:
{
  "version": 1,
  "shortcuts": {
    "commit": { "template": "...", "args": [...] }
  }
}

After:
{
  "version": 2,
  "shortcuts": {
    "commit": { "template": "...", "args": [...], "tags": [] }
  }
}

```

Migration logic:

1. Read file
2. If version < 2, add empty "tags" array to each shortcut
3. Set version = 2
4. Write file

---

## Summary

| Component | Storage | Size | Cleanup |
| --- | --- | --- | --- |
| Settings + Auth | config.json | ~1 KB | Never |
| Shortcuts | shortcuts.json | ~5 KB | Never (user manages) |
| Recent History | history table | ~300 KB | Auto (30 days) |
| Usage Stats | query_stats table | ~75 KB | Never |

**Total footprint: Under 500 KB, always.**

No server. No cloud. No accounts. Just local files doing their job.