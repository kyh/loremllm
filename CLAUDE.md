# Agent Instructions

## Agent-driven development

**Read [`AGENTS.md`](./AGENTS.md) first.** It is the runnable guide: provisioning from a
fresh clone (no Docker), the seeded login and its headless cookie exchange, `pnpm verify`,
an agent-browser recipe, offline GitHub OAuth, and which surfaces can be verified
headlessly. This file only adds Claude-specific conventions on top.

## Project Overview

LoremLLM - pnpm monorepo with Turbo. AI/LLM chat platform.

### Structure

- `apps/web` - Next.js app (main product)
- `packages/api` - tRPC API with better-auth
- `packages/db` - Drizzle ORM + Turso/libSQL
- `packages/transport` - Published npm package (@loremllm/transport) for AI SDK chat transport
- `packages/ui` - Shared React components (shadcn-based)

### Tech Stack

- **Runtime**: Node >=24, pnpm 10.33.0
- **Framework**: Next.js, React
- **API**: tRPC, Zod
- **Auth**: better-auth
- **DB**: Drizzle ORM, Turso/libSQL
- **AI**: Vercel AI SDK (ai package)
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest

## Commands

```bash
pnpm verify           # typecheck + lint + format + test — the gate CI runs
pnpm dev              # Start all (db, studio, app)
pnpm dev:web          # Web app only -> http://localhost:3000
pnpm build            # Build all
pnpm lint             # oxlint
pnpm lint:fix         # oxlint --fix
pnpm format           # oxfmt --check
pnpm format:fix       # oxfmt --write
pnpm typecheck        # TypeScript check
pnpm test             # Run tests (packages/transport only)
pnpm db:push          # Push DB schema locally
pnpm db:seed          # Seed local DB -> dev@loremllm.local / password
pnpm db:push-remote   # Push DB schema to production
pnpm emulate          # Local GitHub OAuth emulator on :4000
```

### Package-specific

```bash
pnpm -F db db         # Local Turso server on :8080 (packages/db/local.db)
pnpm -F db studio     # Drizzle Studio
```

## Mutation path

Mutations go through tRPC or the better-auth client — never Next Server Actions. There is
no global `MutationCache`, so every `useMutation` must invalidate the query filters it
actually affects in its own `onSuccess`. See AGENTS.md → Rules that matter.
