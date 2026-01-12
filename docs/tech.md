Core language/runtime
├─ TypeScript ^5.7.x (or latest stable)
├─ Node.js ^22.x (or Bun if you like speed + native sqlite)

CLI framework
├─ clipanion ^3.x or ^4.x (depending on latest)   ← great choice!

Build & dev experience
├─ esbuild (raw) or tsup (recommended wrapper)
├─ tsx / @esbuild-kit/esm-loader  (for fast tsx watch/dev)

UI / Interactivity
├─ @inquirer/prompts ^latest
├─ picocolors
├─ ora
├─ @inquirer/table   (for nice shortcut/history tables)

Database (history + stats)
├─ drizzle-orm
├─ better-sqlite3
├─ drizzle-kit  (dev dep – migrations & studio)

HTTP / AI calls
├─ native fetch  (preferred in 2026)   ← or ofetch / axios if you prefer

Validation & safety
├─ zod

Lint + Format
├─ @biomejs/biome

Optional nice additions (add later)
├─ execa          (better child_process.spawn)
├─ dotenv         (config/env handling)
├─ chalk-animation / gradient-string   (fancy output if you want polish)