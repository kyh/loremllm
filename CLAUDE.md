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
