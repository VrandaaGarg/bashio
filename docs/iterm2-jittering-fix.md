# iTerm2 Jittering/Flickering Fix

## The Problem

The Bashio chat UI experienced severe jittering/flickering in iTerm2 when:
- Typing in the input box
- Navigating dropdown menus (model selector, slash commands)
- Any state change that triggered a re-render

The same UI worked perfectly in macOS Terminal and Ghostty.

## Root Cause: Terminal Tearing

The issue was **screen tearing** - when the terminal renders partial updates while Ink (our React-based terminal UI library) is still writing output.

### What Was Happening

Ink renders by writing multiple escape sequences and content chunks to stdout:

```
Ink writes: "\x1b[2J"      → Terminal renders (partial clear)
Ink writes: "Hello"        → Terminal renders (shows "Hello")
Ink writes: " World"       → Terminal renders (shows "Hello World")
Ink writes: "\x1b[H"       → Terminal renders (cursor moves)
```

Each `write()` call triggered an **immediate screen redraw** in iTerm2. With Ink making dozens of writes per render cycle, this caused visible flicker between each micro-update.

## The Solution: Synchronized Output Protocol

Modern terminals support a **synchronized output protocol** that allows batching updates:

- **Begin sync**: `\x1b[?2026h` (CSI ? 2026 h)
- **End sync**: `\x1b[?2026l` (CSI ? 2026 l)

When a terminal receives the "begin" sequence, it buffers all subsequent output without rendering. When it receives the "end" sequence, it renders everything atomically in a single frame.

### Implementation

We created a custom stdout wrapper (`src/chat/utils/syncOutput.ts`) that:

1. **Buffers writes** - Collects all stdout writes for a short window (4ms)
2. **Wraps with sync sequences** - Adds begin/end markers around the buffered content
3. **Flushes atomically** - Sends everything to the real stdout in one operation

```typescript
// Before flush:
buffer = "\x1b[2J" + "Hello" + " World" + "\x1b[H"

// After flush (what gets written to terminal):
"\x1b[?2026h" + buffer + "\x1b[?2026l"
```

### Result

**Before**: 50 small writes → 50 screen redraws → visible flicker

**After**: 50 small writes → 1 batched write with sync markers → 1 atomic render → smooth

## Additional Optimizations

Along with synchronized output, we also applied:

1. **Removed MouseProvider** - The `@ink-tools/ink-mouse` wrapper was causing extra renders
2. **Removed useInput from MessageList** - Was processing every keystroke unnecessarily
3. **Enabled incremental rendering** - Ink only updates changed lines instead of full redraw
4. **Lowered maxFps to 20** - Reduced render frequency from default 30

## Terminal Support

The synchronized output protocol is supported by:
- iTerm2
- kitty
- Contour
- Windows Terminal
- WezTerm
- And others

Terminals that don't support it simply ignore the escape sequences, so this is backward compatible.

## Files Changed

| File | Changes |
|------|---------|
| `src/chat/utils/syncOutput.ts` | NEW - Synchronized output stream wrapper |
| `src/chat/App.tsx` | Uses sync stream, updated render options |
| `src/chat/components/MessageList.tsx` | Removed useInput and useOnWheel hooks |

## References

- [iTerm2 Synchronized Updates Spec](https://gitlab.com/gnachman/iterm2/-/wikis/synchronized-updates-spec)
- [Contour Terminal - Synchronized Output](https://contour-terminal.org/vt-extensions/synchronized-output/)
- [Windows Terminal Issue #8331](https://github.com/microsoft/terminal/issues/8331)
