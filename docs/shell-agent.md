> Transform natural language into shell commands. Stop googling, start doing.
> 

```bash
$ s find all files larger than 100mb and delete them
> Will run: find . -size +100M -type f -delete
> Execute? (y/n)

```

---

## Table of Contents

1. [Vision](https://claude.ai/chat/d3f8228f-4f9b-4335-8666-6353d8e5d058#vision)
2. [Core Concept](https://claude.ai/chat/d3f8228f-4f9b-4335-8666-6353d8e5d058#core-concept)
3. [Features](https://claude.ai/chat/d3f8228f-4f9b-4335-8666-6353d8e5d058#features)
    - [V1 (MVP)](https://claude.ai/chat/d3f8228f-4f9b-4335-8666-6353d8e5d058#v1-mvp)
        - [Natural Language → Command](https://claude.ai/chat/d3f8228f-4f9b-4335-8666-6353d8e5d058#1-natural-language--command-execution)
        - [Custom Shortcuts](https://claude.ai/chat/d3f8228f-4f9b-4335-8666-6353d8e5d058#2-custom-shortcuts)
        - [AI Provider Setup](https://claude.ai/chat/d3f8228f-4f9b-4335-8666-6353d8e5d058#3-ai-provider-setup)
    - [V2 (Future)](https://claude.ai/chat/d3f8228f-4f9b-4335-8666-6353d8e5d058#v2-future-implementation)
        - [History & Learning](https://claude.ai/chat/d3f8228f-4f9b-4335-8666-6353d8e5d058#4-history--learning)
        - [Context Awareness](https://claude.ai/chat/d3f8228f-4f9b-4335-8666-6353d8e5d058#5-context-awareness)
        - [Workflows](https://claude.ai/chat/d3f8228f-4f9b-4335-8666-6353d8e5d058#6-chained-commands--workflows)
4. [CLI Reference](https://claude.ai/chat/d3f8228f-4f9b-4335-8666-6353d8e5d058#cli-reference)
5. [Configuration](https://claude.ai/chat/d3f8228f-4f9b-4335-8666-6353d8e5d058#configuration)
6. [Architecture](https://claude.ai/chat/d3f8228f-4f9b-4335-8666-6353d8e5d058#architecture)
7. [Tech Stack](https://claude.ai/chat/d3f8228f-4f9b-4335-8666-6353d8e5d058#tech-stack)
8. [Installation](https://claude.ai/chat/d3f8228f-4f9b-4335-8666-6353d8e5d058#installation)

---

## Vision

Every developer wastes time:

- Googling basic shell commands
- Forgetting syntax for tools they rarely use
- Typing the same long commands repeatedly

**Shell Agent** solves this by letting you describe what you want in plain English, and it figures out the command for you.

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
         │ Show Command     │
         │ Ask Confirmation │
         └──────────────────┘
                  │
                  ▼
         ┌──────────────────┐
         │ Execute & Show   │
         │ Output           │
         └──────────────────┘

```

---

## Features

---

## 1. Natural Language → Command Execution

The core feature. Describe what you want, get the command.

### Basic Examples

```bash
# Finding files
$ s find all javascript files in this project
> Will run: find . -name "*.js" -type f
> Execute? (y/n)

$ s find files modified in the last 24 hours
> Will run: find . -type f -mtime -1
> Execute? (y/n)

$ s find all files larger than 50mb
> Will run: find . -size +50M -type f
> Execute? (y/n)

```

### Confirmation Options

When prompted `Execute? (y/n)`, user can respond:

| Input | Action |
| --- | --- |
| `y` or `yes` or `Enter` | Execute the command |
| `n` or `no` | Cancel |
| `e` or `explain` | Explain what the command does before deciding |
| `c` or `copy` | Copy command to clipboard without executing |
| `edit` | Edit the command before executing |

### Example: Explain Mode

```bash
$ s find files modified in last hour
> Will run: find . -type f -mmin -60
> Execute? (y/n/explain) e

> Explanation:
> ┌─────────────────────────────────────────────────────────────┐
> │ find .           Search in current directory                │
> │ -type f          Only find files (not directories)          │
> │ -mmin -60        Modified within last 60 minutes            │
> └─────────────────────────────────────────────────────────────┘
>
> Execute? (y/n)

```

### Example: Edit Mode

```bash
$ s find large log files
> Will run: find . -name "*.log" -size +10M
> Execute? (y/n/edit) edit

> Edit command (press Enter when done):
> find /var/log -name "*.log" -size +10M   # user edited path
>
> Execute edited command? (y/n) y

[Executes the edited version]

```

### Execution Output

```bash
$ s show disk usage by folder
> Will run: du -sh */ | sort -hr | head -20
> Execute? (y/n) y

> Executing...
> ─────────────────────────────────────────
> 4.2G    node_modules/
> 1.1G    .git/
> 245M    dist/
> 89M     src/
> ─────────────────────────────────────────
> ✓ Done (exit code: 0)

```

### Error Handling

```bash
$ s delete the important system files
> ⚠️  This looks dangerous. Are you sure?
> Will run: rm -rf /important/system/files
> Type "yes I'm sure" to confirm:

$ s do something impossible
> ❌ I couldn't figure out a command for that.
> Could you rephrase or be more specific?

```

---

## 2. Custom Shortcuts

Define your own shortcuts for frequently used commands or complex workflows.

### Using Shortcuts

```bash
# Simple shortcut (no arguments)
$ s kakiyo
> Will run: cd ~/projects/kakiyo && code .
> Execute? (y/n)

# Shortcut with arguments
$ s commit "fixed the navbar bug"
> Will run: git add . && git commit -m "fixed the navbar bug"
> Execute? (y/n)

# Shortcut with multiple arguments
$ s deploy kakiyo prod
> Will run: cd ~/projects/kakiyo && git push origin main && vercel --prod
> Execute? (y/n)

# Another example
$ s killport 3000
> Will run: lsof -ti:3000 | xargs kill -9
> Execute? (y/n)

```

### Managing Shortcuts

### List All Shortcuts

```bash
$ s --shortcuts

┌─────────────────────────────────────────────────────────────────────────────┐
│                              YOUR SHORTCUTS                                  │
├──────────┬────────────────────────────────────────────────────┬─────────────┤
│ Name     │ Command Template                                   │ Arguments   │
├──────────┼────────────────────────────────────────────────────┼─────────────┤
│ commit   │ git add . && git commit -m "{{message}}"           │ message     │
│ kakiyo   │ cd ~/projects/kakiyo && code .                     │ -           │
│ deploy   │ cd ~/projects/{{project}} && git push && vercel    │ project     │
│ killport │ lsof -ti:{{port}} | xargs kill -9                  │ port        │
│ dev      │ cd ~/projects/{{project}} && npm run dev           │ project     │
│ logs     │ tail -f ~/projects/{{project}}/logs/{{env}}.log    │ project,env │
│ dbpush   │ cd ~/projects/{{project}} && npx prisma db push    │ project     │
│ studio   │ cd ~/projects/{{project}} && npx prisma studio     │ project     │
└──────────┴────────────────────────────────────────────────────┴─────────────┘

Total: 8 shortcuts

```

### Add New Shortcut (Interactive)

```bash
$ s --add-shortcut

> Shortcut name: backup
> Command template: tar -czvf ~/backups/{{name}}-$(date +%Y%m%d).tar.gz ~/projects/{{name}}
> Arguments (comma-separated, or leave empty): name
> Description (optional): Backup a project folder with timestamp

✓ Shortcut "backup" added!

# Now you can use it:
$ s backup kakiyo
> Will run: tar -czvf ~/backups/kakiyo-20250103.tar.gz ~/projects/kakiyo
> Execute? (y/n)

```

### Add Shortcut (One-liner)

```bash
$ s --add-shortcut "test" "cd ~/projects/{{project}} && npm test" "project"
✓ Shortcut "test" added!

```

### Remove Shortcut

```bash
$ s --remove-shortcut backup
> Remove shortcut "backup"? (y/n) y
✓ Shortcut "backup" removed

```

### Edit Shortcuts (Opens in Editor)

```bash
$ s --edit-shortcuts
# Opens ~/.shell-agent/shortcuts.json in $EDITOR (vim, code, nano, etc.)

```

### Shortcut File Format

```json
// ~/.shell-agent/shortcuts.json
{
  "commit": {
    "template": "git add . && git commit -m \"{{message}}\"",
    "args": ["message"],
    "description": "Stage all changes and commit"
  },
  "kakiyo": {
    "template": "cd ~/projects/kakiyo && code .",
    "args": [],
    "description": "Open Kakiyo project in VS Code"
  },
  "deploy": {
    "template": "cd ~/projects/{{project}} && git push origin main && vercel --prod",
    "args": ["project"],
    "description": "Deploy project to Vercel"
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
  },
  "logs": {
    "template": "tail -f ~/projects/{{project}}/logs/{{env}}.log",
    "args": ["project", "env"],
    "description": "Tail logs for a project environment"
  },
  "pr": {
    "template": "gh pr create --title \"{{title}}\" --body \"{{body}}\"",
    "args": ["title", "body"],
    "description": "Create GitHub PR"
  },
  "branch": {
    "template": "git checkout -b {{name}} && git push -u origin {{name}}",
    "args": ["name"],
    "description": "Create and push new branch"
  }
}

```

### Shortcut Argument Handling

```bash
# If shortcut needs 1 arg and user provides it:
$ s commit "my message"
> Will run: git add . && git commit -m "my message"

# If shortcut needs 1 arg and user doesn't provide it:
$ s commit
> Shortcut "commit" requires: message
> Enter message: my message
> Will run: git add . && git commit -m "my message"

# If shortcut needs 2 args:
$ s logs kakiyo production
> Will run: tail -f ~/projects/kakiyo/logs/production.log

# If user provides partial args:
$ s logs kakiyo
> Shortcut "logs" requires: project, env
> project: kakiyo ✓
> Enter env: staging
> Will run: tail -f ~/projects/kakiyo/logs/staging.log

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
     │    - kakiyo                  │
     │    - deploy                  │
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

If the first word is NOT a shortcut name, it goes to AI:

```
User Input: "find all large files"
            │
            ▼
     ┌──────────────────────────────┐
     │ Is "find" a shortcut name?   │
     │                              │
     │    shortcuts.json:           │
     │    - commit                  │
     │    - kakiyo                  │
     │    - deploy                  │
     │                              │
     │    "find" not found          │
     └──────────────────────────────┘
            │
            ▼ NO
     ┌──────────────────────────────┐
     │ Send to AI provider          │
     │ "Convert to shell command:   │
     │  find all large files"       │
     └──────────────────────────────┘
            │
            ▼
     find . -size +100M -type f

```

---

## 3. AI Provider Setup

One-time setup to configure which AI powers your shell agent.

### Initial Setup

```bash
$ s --auth

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   🤖 Shell Agent Setup                                          │
│                                                                  │
│   Select your AI provider:                                       │
│                                                                  │
│   ● Claude (Anthropic)     ← Use your Claude Pro subscription   │
│   ○ ChatGPT (OpenAI)       ← Use your ChatGPT Plus subscription │
│   ○ Ollama (Local)         ← Free, runs on your machine         │
│   ○ OpenRouter             ← Pay per use, multiple models       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

```

### Claude Setup

```bash
> You selected: Claude

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Claude Authentication                                          │
│                                                                  │
│   Choose authentication method:                                  │
│                                                                  │
│   ● Session Token (recommended)                                  │
│   ○ API Key (requires paid API credits)                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

> You selected: Session Token

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   To get your session token:                                     │
│                                                                  │
│   1. Open claude.ai in your browser                              │
│   2. Open DevTools (F12 or Cmd+Option+I)                         │
│   3. Go to: Application → Cookies → claude.ai                   │
│   4. Find "sessionKey" and copy its value                        │
│                                                                  │
│   Paste your session token:                                      │
│   > ___________________________________________________________  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

> Validating token... ✓

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Select Model:                                                  │
│                                                                  │
│   ● claude-sonnet-4 (recommended - fast & capable)             │
│   ○ claude-opus-4 (most capable, slower)                       │
│   ○ claude-haiku (fastest, basic tasks)                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

✓ Configuration saved!
✓ Provider: Claude
✓ Model: claude-sonnet-4

You're all set! Try: s find all png files

```

### ChatGPT Setup

```bash
> You selected: ChatGPT

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   ChatGPT Authentication                                         │
│                                                                  │
│   Choose authentication method:                                  │
│                                                                  │
│   ● Access Token (use your Plus subscription)                    │
│   ○ API Key (requires paid API credits)                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

> You selected: Access Token

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   To get your access token:                                      │
│                                                                  │
│   1. Open chat.openai.com in your browser                        │
│   2. Open DevTools (F12 or Cmd+Option+I)                         │
│   3. Go to: Application → Cookies → chat.openai.com             │
│   4. Find "__Secure-next-auth.session-token"                     │
│      and copy its value                                          │
│                                                                  │
│   Paste your access token:                                       │
│   > ___________________________________________________________  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

> Validating token... ✓

✓ Configuration saved!
✓ Provider: ChatGPT
✓ Model: gpt-4o

```

### Ollama Setup (Local, Free)

```bash
> You selected: Ollama

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Ollama Setup                                                   │
│                                                                  │
│   Ollama runs AI models locally on your machine.                 │
│   No API keys needed, completely free.                           │
│                                                                  │
│   Checking Ollama installation...                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

> Ollama is installed ✓
> Available models:
>   - llama3.2 (8B)
>   - codellama (7B)
>   - mistral (7B)

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Select Model:                                                  │
│                                                                  │
│   ● llama3.2 (recommended for general use)                       │
│   ○ codellama (optimized for code)                               │
│   ○ mistral (fast, good quality)                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

✓ Configuration saved!
✓ Provider: Ollama (Local)
✓ Model: llama3.2

You're all set! Try: s find all png files

```

### Change Model (Without Full Re-auth)

```bash
$ s --model

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Current: Claude / claude-sonnet-4                             │
│                                                                  │
│   Select new model:                                              │
│                                                                  │
│   ○ claude-sonnet-4 (current)                                   │
│   ● claude-opus-4                                                │
│   ○ claude-haiku                                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

✓ Model changed to claude-opus-4

```

### View Current Config

```bash
$ s --config

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Shell Agent Configuration                                      │
│                                                                  │
│   Provider:    Claude                                            │
│   Model:       claude-sonnet-4                                  │
│   Auth:        Session Token (valid)                             │
│                                                                  │
│   Settings:                                                      │
│   - Confirm before execute: Yes                                  │
│   - Shortcuts count: 8                                           │
│                                                                  │
│   Config location: ~/.shell-agent/                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

```

---

## 4. History & Learning

Track your command history and learn from patterns.

### View History

```bash
$ s --history

┌───────────────────────────────────────────────────────────────────────────────┐
│                                COMMAND HISTORY                                │
├─────┬────────────────────────────────┬─────────────────────────────────┬──────┤
│ #   │ Query                          │ Command                         │ When │
├─────┼────────────────────────────────┼─────────────────────────────────┼──────┤
│ 1   │ find large files               │ find . -size +100M -type f      │ 2h ag│
│ 2   │ kill port 3000                 │ lsof -ti:3000 | xargs kill -9   │ 3h ag│
│ 3   │ commit "fixed bug"             │ git add . && git commit -m ...  │ 5h ag│
│ 4   │ show disk usage                │ df -h                           │ 1d ag│
│ 5   │ find all png files             │ find . -name "*.png"            │ 1d ag│
│ 6   │ count lines of js code         │ find . -name "*.js" | xargs ... │ 2d ag│
│ 7   │ compress images in photos      │ find /photos -name "*.jpg" ...  │ 3d ag│
│ 8   │ delete node_modules            │ find . -name "node_modules" ... │ 3d ag│
│ 9   │ undo last commit               │ git reset --soft HEAD~1         │ 4d ag│
│ 10  │ what's my ip                   │ curl -s ifconfig.me             │ 5d ag│
└─────┴────────────────────────────────┴─────────────────────────────────┴──────┘

Showing 10 of 47 entries. Use --history 20 to see more.

```

### Re-run from History

```bash
$ s --run 1
> Will run: find . -size +100M -type f
> Execute? (y/n)

```

### Search History

```bash
$ s --history --search "git"

┌───────────────────────────────────────────────────────────────────────────────┐
│                          HISTORY (filtered: "git")                            │
├─────┬────────────────────────────────┬─────────────────────────────────┬──────┤
│ 3   │ commit "fixed bug"             │ git add . && git commit -m ...  │ 5h ag│
│ 9   │ undo last commit               │ git reset --soft HEAD~1         │ 4d ag│
│ 15  │ show git log pretty            │ git log --oneline --graph       │ 1w ag│
└─────┴────────────────────────────────┴─────────────────────────────────┴─────────┘

```

### Auto-Suggest Shortcuts

```bash
$ s --suggest-shortcuts

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           SUGGESTED SHORTCUTS                                    │
│                                                                                  │
│   Based on your usage patterns:                                                  │
│                                                                                  │
│   1. "kill port XXXX" - used 12 times                                           │
│      → Suggested shortcut: killport {{port}}                                     │
│      → Create? (y/n)                                                             │
│                                                                                  │
│   2. "find large files" - used 8 times                                          │
│      → Suggested shortcut: largefiles                                            │
│      → Create? (y/n)                                                             │
│                                                                                  │
│   3. "show disk usage" - used 6 times                                           │
│      → Suggested shortcut: disk                                                  │
│      → Create? (y/n)                                                             │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

```

### Stats

```bash
$ s --stats

┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USAGE STATISTICS                                    │
│                                                                                  │
│   Total commands: 147                                                            │
│   This week: 23                                                                  │
│   Today: 5                                                                       │
│                                                                                  │
│   Top categories:                                                                │
│   ████████████████░░░░ Git (34%)                                                │
│   ██████████░░░░░░░░░░ File operations (22%)                                    │
│   ████████░░░░░░░░░░░░ Process management (18%)                                 │
│   ██████░░░░░░░░░░░░░░ System info (12%)                                        │
│   ████░░░░░░░░░░░░░░░░ Network (8%)                                             │
│   ██░░░░░░░░░░░░░░░░░░ Other (6%)                                               │
│                                                                                  │
│   Most used shortcuts:                                                           │
│   1. commit (45 uses)                                                            │
│   2. killport (23 uses)                                                          │
│   3. dev (18 uses)                                                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

```

---

## 5. Context Awareness

Shell Agent detects your current project type and adjusts commands accordingly.

### How It Works

```
$ pwd
/home/vranda/projects/kakiyo

$ s start dev server

     ┌─────────────────────────────────────┐
     │ Detecting project type...           │
     │                                     │
     │ Found: package.json                 │
     │ Framework: Next.js                  │
     │ Package manager: npm                │
     └─────────────────────────────────────┘

> Will run: npm run dev
> Execute? (y/n)

```

### Context-Aware Examples

```bash
# In a Next.js project
$ s start dev server
> Will run: npm run dev

# In a Python/Flask project
$ s start dev server
> Will run: python -m flask run

# In a Rust project
$ s build for production
> Will run: cargo build --release

# In a Go project
$ s run tests
> Will run: go test ./...

# In a Docker project (has docker-compose.yml)
$ s start everything
> Will run: docker-compose up -d

# In a project with Makefile
$ s build
> Will run: make build

```

### Detection Priority

```
Shell Agent checks for (in order):

1. package.json → Node.js project
   - Checks "scripts" for available commands
   - Detects framework (Next.js, React, Vue, etc.)
   - Detects package manager (npm, yarn, pnpm, bun)

2. Cargo.toml → Rust project

3. pyproject.toml / requirements.txt → Python project
   - Detects framework (Flask, Django, FastAPI)

4. go.mod → Go project

5. Makefile → Uses make commands

6. docker-compose.yml → Docker project

7. .git → Git repository (for git-related commands)

```

### Context Info Command

```bash
$ s --context

┌───────────────────────────────────────────────────────────────────────────────┐
│                              PROJECT CONTEXT                                  │
│                                                                               │
│   Directory: /home/vranda/projects/kakiyo                                     │
│                                                                               │
│   Detected:                                                                   │
│   ├── package.json (Next.js 14.0.0)                                           │
│   ├── Package manager: pnpm                                                   │
│   ├── .git (branch: main)                                                     │
│   └── docker-compose.yml                                                      │
│                                                                               │
│   Available scripts:                                                          │
│   - dev: next dev                                                             │
│   - build: next build                                                         │
│   - start: next start                                                         │
│   - lint: eslint .                                                            │
│   - db:push: prisma db push                                                   │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘

```

---

## 6. Chained Commands / Workflows

Define multi-step workflows that execute in sequence.

### Creating a Workflow

```bash
$ s --create-workflow

> Workflow name: deploy-kakiyo
> Description: Deploy Kakiyo to production

> Step 1: Run tests first
> Command: npm test
> Continue on failure? (y/n): n

> Step 2 (or 'done'): Build the project
> Command: npm run build
> Continue on failure? (y/n): n

> Step 3 (or 'done'): Push to git
> Command: git push origin main
> Continue on failure? (y/n): y

> Step 4 (or 'done'): Deploy to Vercel
> Command: vercel --prod
> Continue on failure? (y/n): n

> Step 5 (or 'done'): done

✓ Workflow "deploy-kakiyo" created with 4 steps!

```

### Running a Workflow

```bash
$ s deploy-kakiyo

┌───────────────────────────────────────────────────────────────────────────────┐
│                        WORKFLOW: deploy-kakiyo                                │
│                        Deploy Kakiyo to production                            │
│                                                                               │
│   Steps:                                                                      │
│   1. npm test                                                                 │
│   2. npm run build                                                            │
│   3. git push origin main                                                     │
│   4. vercel --prod                                                            │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘

> Run all 4 steps? (y/n/step-by-step): y

> [1/4] Running: npm test
> ✓ Tests passed (exit code: 0)

> [2/4] Running: npm run build
> ✓ Build complete (exit code: 0)

> [3/4] Running: git push origin main
> ✓ Pushed to origin/main (exit code: 0)

> [4/4] Running: vercel --prod
> ✓ Deployed to https://kakiyo.vercel.app (exit code: 0)

✓ Workflow "deploy-kakiyo" completed successfully!

```

### Step-by-Step Mode

```bash
$ s deploy-kakiyo

> Run all 4 steps? (y/n/step-by-step): step-by-step

> [1/4] npm test
> Execute? (y/n/skip): y
> ✓ Tests passed

> [2/4] npm run build
> Execute? (y/n/skip): y
> ✓ Build complete

> [3/4] git push origin main
> Execute? (y/n/skip): skip
> ⊘ Skipped

> [4/4] vercel --prod
> Execute? (y/n/skip): y
> ✓ Deployed

✓ Workflow completed (3 executed, 1 skipped)

```

### Workflow with Arguments

```bash
# Workflow definition with {{variables}}
{
  "name": "release",
  "description": "Create a new release",
  "args": ["version"],
  "steps": [
    { "command": "npm version {{version}}", "stopOnFail": true },
    { "command": "npm run build", "stopOnFail": true },
    { "command": "git push origin main --tags", "stopOnFail": false },
    { "command": "gh release create v{{version}}", "stopOnFail": true }
  ]
}

# Usage
$ s release 1.2.0
> Creating release 1.2.0...

```

### List Workflows

```bash
$ s --workflows

┌───────────────────────────────────────────────────────────────────────────────┐
│                              YOUR WORKFLOWS                                   │
├────────────────┬──────────────────────────────────────┬─────────┬─────────────┤
│ Name           │ Description                          │ Steps   │ Last Run    │
├────────────────┼──────────────────────────────────────┼─────────┼─────────────┤
│ deploy-kakiyo  │ Deploy Kakiyo to production          │ 4       │ 2 hours ago │
│ morning        │ Morning setup routine                │ 3       │ 1 day ago   │
│ release        │ Create a new release                 │ 4       │ 1 week ago  │
│ cleanup        │ Clean all build artifacts            │ 2       │ 3 days ago  │
└────────────────┴──────────────────────────────────────┴─────────┴─────────────┘

```

### Pre-built Workflow Templates

```bash
$ s --workflow-templates

┌───────────────────────────────────────────────────────────────────────────────┐
│                           WORKFLOW TEMPLATES                                  │
│                                                                               │
│   1. git-feature                                                              │
│      Create feature branch, work, PR                                          │
│                                                                               │
│   2. npm-publish                                                              │
│      Test, build, version bump, publish to npm                                │
│                                                                               │
│   3. docker-deploy                                                            │
│      Build image, push to registry, deploy                                    │
│                                                                               │
│   4. db-migrate                                                               │
│      Backup, migrate, verify                                                  │
│                                                                               │
│   Install a template? (1-4 or n): 1                                           │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘

> Installing "git-feature" workflow...
✓ Workflow installed! Use: s git-feature <branch-name>

```

```bash
$ s --workflow-templates

┌───────────────────────────────────────────────────────────────────────────────┐
│                           WORKFLOW TEMPLATES                                  │
│                                                                               │
│   1. git-feature                                                              │
│      Create feature branch, work, PR                                          │
│                                                                               │
│   2. npm-publish                                                              │
│      Test, build, version bump, publish to npm                                │
│                                                                               │
│   3. docker-deploy                                                            │
│      Build image, push to registry, deploy                                    │
│                                                                               │
│   4. db-migrate                                                               │
│      Backup, migrate, verify                                                  │
│                                                                               │
│   Install a template? (1-4 or n): 1                                           │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘

> Installing "git-feature" workflow...
✓ Workflow installed! Use: s git-feature <branch-name>

```

---

## CLI Reference

### Daily Usage

```bash
s <natural language>              # Convert to command and execute
s <shortcut> [args]               # Run a shortcut

```

### Shortcuts

```bash
s --shortcuts                     # List all shortcuts
s --add-shortcut                  # Add new shortcut (interactive)
s --add-shortcut "name" "cmd" "args"  # Add shortcut (one-liner)
s --remove-shortcut <name>        # Remove a shortcut
s --edit-shortcuts                # Edit shortcuts in $EDITOR

```

### Provider & Model

```bash
s --auth                          # Setup/change provider
s --model                         # Change model
s --config                        # View current configuration

```

### History (V2)

```bash
s --history                       # View command history
s --history <n>                   # View last n commands
s --history --search "query"      # Search history
s --run <n>                       # Re-run command #n from history
s --stats                         # View usage statistics
s --suggest-shortcuts             # Get shortcut suggestions

```

### Workflows (V2)

```bash
s --workflows                     # List workflows
s --create-workflow               # Create new workflow
s --edit-workflow <name>          # Edit workflow
s --delete-workflow <name>        # Delete workflow
s --workflow-templates            # Browse templates

```

### Other

```bash
s --help                          # Show help
s --version                       # Show version
s --context                       # Show project context (V2)

```

---

## Configuration

### File Locations

```
~/.shell-agent/
├── config.json           # Main configuration
├── shortcuts.json        # Custom shortcuts
├── workflows.json        # Workflows (V2)
└── history.db            # Command history SQLite (V2)

```

### config.json

```json
{
  "provider": "claude",
  "model": "claude-sonnet-4",
  "credentials": {
    "type": "session",
    "token": "sk-ant-..."
  },
  "settings": {
    "confirmBeforeExecute": true,
    "saveHistory": true,
    "contextAwareness": true,
    "theme": "dark"
  }
}

```

### shortcuts.json

```json
{
  "shortcut-name": {
    "template": "command with {{arg1}} and {{arg2}}",
    "args": ["arg1", "arg2"],
    "description": "What this shortcut does"
  }
}

```

### workflows.json (V2)

```json
{
  "workflow-name": {
    "description": "What this workflow does",
    "args": ["optional", "arguments"],
    "steps": [
      {
        "name": "Step description",
        "command": "actual command",
        "stopOnFail": true
      }
    ]
  }
}

```

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
│   • Parse arguments and flags                                                 │
│   • Route to appropriate handler                                              │
│     - Flags (--shortcuts, --auth, etc.) → Settings handlers                   │
│     - Natural language → Query handler                                        │
└───────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              CONFIG LOADER                                    │
│                                                                               │
│   • Load ~/.shell-agent/config.json                                           │
│   • Load ~/.shell-agent/shortcuts.json                                        │
│   • Validate credentials                                                      │
└───────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                             QUERY PROCESSOR                                   │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────────┐ │
│   │                        SHORTCUT CHECK                                   │ │
│   │   Is first word a shortcut? → Yes → Expand template                     │ │
│   │                             → No  → Continue to AI                      │ │
│   └─────────────────────────────────────────────────────────────────────────┘ │
│                                       │                                       │
│                                       ▼                                       │
│   ┌─────────────────────────────────────────────────────────────────────────┐ │
│   │                         AI PROVIDER                                     │ │
│   │                                                                         │ │
│   │   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                │ │
│   │   │  Claude  │  │ ChatGPT  │  │  Ollama  │  │OpenRouter│                │ │
│   │   └──────────┘  └──────────┘  └──────────┘  └──────────┘                │ │
│   │                                                                         │ │
│   │   Prompt: "Convert to shell command for macOS/Linux:                    │ │
│   │            {{user_query}}                                               | │
│   │            Respond with ONLY the command, no explanation."              │ │
│   └─────────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              COMMAND OUTPUT                                   │
│                                                                               │
│   > Will run: find . -size +100M -type f                                      │
│   > Execute? (y/n/explain/copy/edit)                                          │
└───────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                               EXECUTOR                                        │
│                                                                               │
│   • Spawn child process                                                       │
│   • Stream stdout/stderr to terminal                                          │
│   • Capture exit code                                                         │
│   • Save to history (V2)                                                      │
└───────────────────────────────────────────────────────────────────────────────┘

```

### File Structure

```
shell-agent/
├── src/
│   ├── index.ts                 # Entry point
│   ├── cli.ts                   # CLI argument parsing
│   │
│   ├── core/
│   │   ├── agent.ts             # Main agent logic
│   │   ├── parser.ts            # Input parsing
│   │   └── executor.ts          # Command execution
│   │
│   ├── shortcuts/
│   │   ├── manager.ts           # CRUD operations
│   │   ├── expander.ts          # Template expansion
│   │   └── types.ts             # TypeScript types
│   │
│   ├── providers/
│   │   ├── index.ts             # Provider factory
│   │   ├── base.ts              # Base provider interface
│   │   ├── claude.ts            # Claude implementation
│   │   ├── chatgpt.ts           # ChatGPT implementation
│   │   └── ollama.ts            # Ollama implementation
│   │
│   ├── ui/
│   │   ├── output.ts            # Colored output
│   │   ├── spinner.ts           # Loading spinner
│   │   ├── prompt.ts            # User prompts
│   │   └── highlight.ts         # Syntax highlighting
│   │
│   ├── config/
│   │   ├── loader.ts            # Config file handling
│   │   ├── defaults.ts          # Default values
│   │   └── types.ts             # Config types
│   │
│   ├── history/                 # V2
│   │   ├── store.ts             # SQLite operations
│   │   └── suggestions.ts       # Auto-suggestions
│   │
│   ├── context/                 # V2
│   │   ├── detector.ts          # Project detection
│   │   └── adapters.ts          # Framework adapters
│   │
│   └── workflows/               # V2
│       ├── manager.ts           # Workflow CRUD
│       ├── runner.ts            # Workflow execution
│       └── templates.ts         # Built-in templates
│
├── package.json
├── tsconfig.json
├── README.md
└── IDEA.md                      # This file

```

---

## Tech Stack

| Component | Library | Purpose |
| --- | --- | --- |
| Language | TypeScript | Type safety |
| CLI Framework | commander | Argument parsing |
| Terminal UI | picocolors | Colors |
| Terminal UI | ora | Spinners |
| Terminal UI | cli-highlight | Syntax highlighting |
| Prompts | @inquirer/prompts | Interactive prompts |
| Shell | child_process | Command execution |
| AI (Official) | ai (Vercel SDK) | Ollama integration |
| AI (Unofficial) | claude-api | Claude session auth |
| AI (Unofficial) | chatgpt-api | ChatGPT session auth |
| Storage | better-sqlite3 | History database (V2) |
| Config | JSON files | Settings storage |

---

## Installation

```bash
# Install globally
npm install -g shell-agent

# First-time setup
s --auth

# Start using
s find all javascript files

```

---

## Roadmap

### V1.0 (MVP)

- [x]  Natural language → command
- [x]  Confirmation before execute
- [x]  Custom shortcuts with arguments
- [x]  Multi-provider support (Claude, ChatGPT, Ollama)
- [x]  Basic error handling

### V1.1

- [ ]  Explain mode
- [ ]  Edit mode
- [ ]  Copy to clipboard
- [ ]  Dry run for dangerous commands

### V2.0

- [ ]  Command history (SQLite)
- [ ]  Re-run from history
- [ ]  Auto-suggest shortcuts
- [ ]  Usage statistics

### V2.1

- [ ]  Context awareness (project detection)
- [ ]  Framework-specific commands
- [ ]  Smart defaults

### V3.0

- [ ]  Workflows (multi-step commands)
- [ ]  Workflow templates
- [ ]  Step-by-step execution

---

## Contributing

[To be added]

## License

MIT