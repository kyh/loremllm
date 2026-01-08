# Agent Instructions

## Project Overview

LoremLLM - pnpm monorepo with Turbo. AI/LLM chat platform.

### Structure

- `apps/platform` - Next.js app (main product)
- `packages/api` - tRPC API with better-auth
- `packages/db` - Drizzle ORM + Turso/libSQL
- `packages/transport` - Published npm package (@loremllm/transport) for AI SDK chat transport
- `packages/ui` - Shared React components (shadcn-based)

### Tech Stack

- **Runtime**: Node, pnpm 10.27.0
- **Framework**: Next.js, React
- **API**: tRPC, Zod
- **Auth**: better-auth
- **DB**: Drizzle ORM, Turso/libSQL
- **AI**: Vercel AI SDK (ai package)
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest

## Commands

```bash
pnpm dev              # Start all (db, studio, app)
pnpm build            # Build all
pnpm lint             # ESLint
pnpm lint-fix         # ESLint --fix
pnpm format           # Prettier check
pnpm format-fix       # Prettier --write
pnpm typecheck        # TypeScript check
pnpm test             # Run tests
pnpm db-push          # Push DB schema locally
pnpm db-push-remote   # Push DB schema to production
```

### Package-specific

```bash
pnpm -F db studio     # Drizzle Studio
pnpm -F api seed      # Seed local DB
pnpm -F ui gen-ui     # Add shadcn components
```

## Issue Tracking

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

