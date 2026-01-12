# Shell Agent — Project Overview

## One-Liner

**Natural language to shell commands. Stop Googling, start doing.**

---

## The Problem

Every developer faces these pain points daily:

1. **Forgetting commands** — "What's the tar syntax again?" "How do I kill a port?"
2. **Googling basics** — Context switch, copy-paste, hope it works
3. **Repetitive typing** — Same long commands over and over
4. **Tool fragmentation** — Different syntax for different tools

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

```
$ s find all files larger than 100mb
> Will run: find . -size +100M -type f
> Execute? (y/n)

```

**Plus:** Custom shortcuts for commands you use repeatedly.

---

## Why This? Why Now?

### Our Differentiation

| Feature | Others | Shell Agent |
| --- | --- | --- |
| Uses existing subscriptions | ❌ | ✅ Claude Pro, ChatGPT Plus |
| Custom shortcuts | ❌ | ✅ First-class feature |
| Multi-provider | Some | ✅ Claude, ChatGPT, Ollama |
| Lightweight | Varies | ✅ Just `s` + query |
| Local-first | Varies | ✅ No cloud, no accounts |

---

## Core Features (V1 — MVP)

### 1. Natural Language → Command

The foundation. User describes what they want, AI returns the command.

**Input:** Natural language query
**Output:** Shell command + confirmation prompt

**Examples:**

| Query | Command |
| --- | --- |
| find large files | `find . -size +100M -type f` |
| kill port 3000 | `lsof -ti:3000 | xargs kill -9` |
| undo last git commit | `git reset --soft HEAD~1` |
| compress all jpgs in this folder | `find . -name "*.jpg" -exec convert {} -quality 80 {} \;` |
| what's my ip | `curl -s ifconfig.me` |
| show disk usage by folder | `du -sh */ | sort -hr` |

**Confirmation options:**

- `y` — Execute
- `n` — Cancel
- `e` — Explain what this command does
- `c` — Copy to clipboard
- `edit` — Modify before executing

---

### 2. Custom Shortcuts

User-defined command templates with argument placeholders.

**Definition:**

| Shortcut | Template | Args |
| --- | --- | --- |
| commit | `git add . && git commit -m "{{message}}"` | message |
| kakiyo | `cd ~/projects/kakiyo && code .` | (none) |
| killport | `lsof -ti:{{port}} | xargs kill -9` | port |
| dev | `cd ~/projects/{{project}} && npm run dev` | project |

**Usage:**

| User Types | Result |
| --- | --- |
| `s commit "fixed bug"` | `git add . && git commit -m "fixed bug"` |
| `s kakiyo` | `cd ~/projects/kakiyo && code .` |
| `s killport 3000` | `lsof -ti:3000 | xargs kill -9` |
| `s dev kakiyo` | `cd ~/projects/kakiyo && npm run dev` |

**Management:**

- `s --shortcuts` — List all
- `s --add-shortcut` — Add new (interactive)
- `s --remove-shortcut <name>` — Remove
- `s --edit-shortcuts` — Open in editor

---

### 3. Multi-Provider Support

Use existing AI subscriptions. No extra cost.

**Supported:**

| Provider | Auth Method | Cost |
| --- | --- | --- |
| Claude | Session token from claude.ai | Free (Pro sub) |
| ChatGPT | Session token from chat.openai.com | Free (Plus sub) |
| Ollama | None (local) | Free |
| OpenRouter | API key | Pay per use |

**Setup:**

- `s --auth` — One-time provider setup
- `s --model` — Change model within provider

**Provider is invisible during daily use.** User just types `s <query>`.

---

## Future Features (V2+)

### 4. History & Learning

Track what user runs. Enable re-running and pattern detection.

**Capabilities:**

| Command | Purpose |
| --- | --- |
| `s --history` | Show recent commands |
| `s --history 50` | Show last 50 |
| `s --history --search "git"` | Search history |
| `s --run 5` | Re-run command #5 |
| `s --stats` | Usage statistics |

**Auto-suggest shortcuts:**

```
$ s --suggest-shortcuts

Based on your usage:

  "kill port XXXX" — used 23 times
  → Create shortcut "killport"? (y/n)

  "find large files" — used 15 times
  → Create shortcut "largefiles"? (y/n)

```

**Storage:**

- Recent history: SQLite, auto-cleaned after 30 days
- Usage stats: SQLite, permanent (only unique queries)

---

### 5. Context Awareness

Detect project type and adjust commands accordingly.

**How it works:**

```
$ pwd
/home/user/projects/kakiyo

$ s start dev server
        │
        ▼
    Detect: package.json exists
    Framework: Next.js
    Package manager: npm
        │
        ▼
> Will run: npm run dev

```

**Supported detections:**

| File Found | Project Type | Example Adaptation |
| --- | --- | --- |
| package.json | Node.js | `npm run dev` vs `yarn dev` |
| Cargo.toml | Rust | `cargo build --release` |
| pyproject.toml | Python | `python -m pytest` |
| go.mod | Go | `go test ./...` |
| docker-compose.yml | Docker | `docker-compose up` |
| Makefile | Make | `make build` |

---

### 6. Workflows (Chained Commands)

Multi-step command sequences.

**Definition:**

```
Workflow: deploy-kakiyo
Steps:
  1. npm test
  2. npm run build
  3. git push origin main
  4. vercel --prod

```

**Usage:**

```
$ s deploy-kakiyo

┌─────────────────────────────────────┐
│  Workflow: deploy-kakiyo            │
│                                     │
│  1. npm test                        │
│  2. npm run build                   │
│  3. git push origin main            │
│  4. vercel --prod                   │
│                                     │
│  Run all? (y/n/step-by-step)        │
└─────────────────────────────────────┘

```

**Options:**

- Run all at once
- Step-by-step with confirmation
- Stop on failure or continue

---

### 7. Explain Mode

Learn what commands do.

**Before executing:**

```
$ s find files modified today
> Will run: find . -type f -mtime 0
> Execute? (y/n/explain) e

Explanation:
┌─────────────────────────────────────┐
│ find .       Search current dir     │
│ -type f      Only files (not dirs)  │
│ -mtime 0     Modified within 24hrs  │
└─────────────────────────────────────┘

> Execute? (y/n)

```

**Standalone:**

```
$ s --explain "tar -xzf archive.tar.gz -C /output"

Explanation:
┌─────────────────────────────────────┐
│ tar          Archive tool           │
│ -x           Extract                │
│ -z           Decompress gzip        │
│ -f           Specify file           │
│ archive...   Input file             │
│ -C /output   Extract to this dir    │
└─────────────────────────────────────┘

```

---

## Technical Decisions

### Language: TypeScript

```
$ s commit "fixed the bug"
> Will run: git add . && git commit -m "fixed the bug"
> Execute? (y/n)

```

**Why:**

- NPM ecosystem for easy distribution
- Type safety catches bugs early
- Async/await for API calls
- Rich CLI libraries available

### Distribution: NPM

**Why:**

- Global install: `npm install -g shell-agent`
- Cross-platform (macOS, Linux, Windows)
- Easy updates: `npm update -g shell-agent`
- Developers already have Node.js

### Storage: Local Files

**Why:**

- No server needed
- No accounts needed
- User owns their data
- Works offline (with Ollama)

| Data | Format |
| --- | --- |
| Config | JSON |
| Shortcuts | JSON |
| History | SQLite |

### AI Integration: Direct API Calls

**Why:**

- Session tokens for free usage
- No wrapper libraries needed
- Full control over prompts
- Easy to add new providers

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- |
| Session tokens expire frequently | High | Medium | Clear error message, easy re-auth |
| AI generates wrong command | High | Low | Confirmation before execute, explain mode |
| Provider changes API | Medium | Low | Abstract provider layer, easy to update |
| User runs dangerous command | High | Low | Confirm by default, warn on destructive ops |
| Competitors add shortcuts | Medium | Medium | Move fast, build community |

---

## Success Metrics

### For MVP

| Metric | Target |
| --- | --- |
| Personal daily usage | 5+ commands |
| Time to first command | < 2 minutes (after install) |
| Successful command rate | > 90% |

### For V2+

| Metric | Target |
| --- | --- |
| Shortcuts created from suggestions | 3+ |
| Commands re-run from history | 10%+ |
| Weekly active usage | 5+ days |

---

## Competitive Landscape

### Direct Competitors

| Tool | Approach | Weakness We Exploit |
| --- | --- | --- |
| AI Shell | OpenAI API only | Costs money, single provider |
| Copilot CLI | GitHub subscription | Costs $10+/month |
| Warp | Full terminal replacement | Heavy, not for everyone |
| Shell Genie | Free tier unreliable | Inconsistent experience |

### Indirect Competitors

| Tool | Approach | Why We're Different |
| --- | --- | --- |
| ChatGPT (browser) | Copy-paste workflow | We're in-terminal, instant |
| tldr pages | Static examples | We're dynamic, contextual |
| man pages | Comprehensive but dense | We're natural language |
| Stack Overflow | Search and read | We're instant answers |

### Our Moat

1. **Shortcuts** — Nobody else has this. Builds habit.
2. **Multi-provider** — Use what you already pay for.
3. **Simplicity** — Just `s` + what you want.
4. **Local-first** — No accounts, no cloud dependency.

---

## Open Questions

### Technical

1. **Session token reliability** — How often do Claude/ChatGPT tokens expire? Need to test.
2. **Ollama model quality** — Are local models good enough for command generation?
3. **Windows support** — PowerShell commands differ from bash. Handle both?

### Product

1. **Shortcut sharing** — Should users be able to share/import shortcuts?
2. **Team features** — Shared shortcuts for organizations?
3. **Monetization** — Stay free? Premium features? Sponsorware?

### Growth

1. **Discovery** — How do developers find CLI tools?
2. **Virality** — What makes someone share this?
3. **Community** — Discord? GitHub discussions?

---

## Summary

**Shell Agent** is a local CLI tool that converts natural language to shell commands.

**Key differentiators:**

- Uses existing AI subscriptions (free)
- Custom shortcuts (nobody else has this)
- Multi-provider support
- Dead simple (`s` + query)

**MVP scope:**

- Natural language → command → confirm → execute
- Custom shortcuts
- Claude, ChatGPT, Ollama support

**Success = using it 5+ times daily instead of Googling.**