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
- `packages/contract` - oRPC contract: zod inputs and output types, shared by server and clients
- `packages/service` - oRPC implementation of the contract + better-auth
- `packages/db` - Drizzle ORM + Turso/libSQL
- `packages/transport` - Published npm package (@loremllm/transport) for AI SDK chat transport
- `packages/ui` - Shared React components (shadcn-based)

### Contract-first API

`@repo/contract` is the single source of truth: each feature has `<f>-schema.ts` (zod inputs) and `<f>-contract.ts` (built on `publicBase` / `protectedBase` / `organizationBase` from `base.ts`), registered in `src/index.ts`. Outputs are `type<T>()`: compile-time types (built from `@repo/db` row types where a handler returns rows), never validated at runtime. `@repo/service` implements it with `os = implement(contract)` — org-scoped: `const scoped = os.<f>.use(requireSession).use(requireActiveOrganization); export const <f>Router = { <proc>: scoped.<proc>.handler(...) }`; session-only: `os.<f>.use(requireSession)` (see `organization-router.ts`); public procedures implement `os.<f>.<proc>` directly (`interaction.query`, `waitlist.join`). Mount in `root-router.ts`; `os.router` fails to compile if a procedure is missing or mistyped. Implementer-level `.use` runs before input validation (anonymous → UNAUTHORIZED, no organization → FORBIDDEN); procedure-level `.use` runs after. `requireActiveOrganization` takes the organization from the session, never from input. Feature routers stay plain objects — `os.<f>.router()` re-applies implementer middleware, so it would run twice. Clients type against `ContractClient` / `RouterInputs` / `RouterOutputs` from `@repo/contract`; only server code (route handlers, RSC, scripts) imports `@repo/service`. Layout follows oRPC's Hybrid monorepo recipe.

### Tech Stack

- **Runtime**: Node 24.x, pnpm 12.3.4
- **Framework**: Next.js, React
- **API**: oRPC, Zod
- **Auth**: better-auth
- **DB**: Drizzle ORM, Turso/libSQL
- **AI**: Vercel AI SDK (ai package)
- **Styling**: Tailwind CSS v4
- **Testing**: node:test (`node --import tsx --test`)

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
pnpm test             # Run tests (packages/transport, packages/service, apps/web)
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

Mutations go through oRPC or the better-auth client — never Next Server Actions. There is
no global `MutationCache`, so every `useMutation` must invalidate the query filters it
actually affects in its own `onSuccess`. See AGENTS.md → Rules that matter.
