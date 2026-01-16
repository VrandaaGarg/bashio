# AGENTS.md - Rules for AI Agents

This file contains rules and guidelines for AI agents working on this codebase.

## Type Safety

- **No `any` type usage** - All types must be properly defined
- Use explicit TypeScript types for all variables, parameters, and return values
- Prefer `unknown` over `any` when the type is truly unknown, then narrow it down
- Use Zod schemas for runtime validation (already set up in `src/core/types.ts`)

## Security & Sensitive Data

- **No hardcoded API keys, tokens, or secrets in code** - Ever
- All sensitive data must come from:
  - Environment variables (`.env` files)
  - User config files (`~/.shellio/config.json`)
- **Never use fallback values for secrets** - If a secret is missing, throw an error
- Config files containing secrets are stored in user's home directory, not in the repo
- Ensure `.gitignore` excludes all sensitive files before any changes

## File Organization

- **All documentation `.md` files must be in `docs/` folder**
- Exception: `README.md` and `AGENTS.md` stay in root directory
- Keep the source code structure organized:
  - `src/cli/` - CLI commands and setup
  - `src/core/` - Core business logic and types
  - `src/providers/` - AI provider implementations
  - `src/utils/` - Utility functions

## Before Completing Work

- Run `pnpm lint:check` - Ensure no linting errors
- Run `pnpm typecheck` - Ensure no TypeScript errors
- Run `pnpm build` - Ensure the project builds successfully
- Check that no sensitive data is exposed in any files

## Git Safety

- Never commit `.env` files or any file containing secrets
- Never commit `~/.shellio/` config files
- Review changes before suggesting commits
