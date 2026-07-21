# AGENTS.md

**LoremLLM** mocks LLM responses: you store input/output pairs in a collection, and the hosted endpoints replay the best semantic match instead of calling a real model. This is the tool-agnostic guide for coding agents — it's meant to be run, not just read. Claude also reads `CLAUDE.md`; both point back here.

One pnpm/Turbo monorepo: `apps/web` (Next.js App Router) on `packages/api` (tRPC + better-auth), `packages/db` (Drizzle + Turso/libSQL), `packages/ui` (shadcn/Base UI), and `packages/transport` — the published `@loremllm/transport` npm package.

## Quickstart (headless)

```sh
pnpm install
cp .env.example .env            # then set BETTER_AUTH_SECRET (`openssl rand -base64 32`)
pnpm -F db db &                 # local Turso server on :8080, file-backed at packages/db/local.db
pnpm db:push                    # apply the Drizzle schema
pnpm db:seed                    # dev account + a Demo collection
pnpm dev:web                    # http://localhost:3000
```

**No Docker** — but you do need the `turso` CLI on PATH, and it is not a package dependency. Install it first (`brew install tursodatabase/tap/turso`, or `curl -sSfL https://get.tur.so/install.sh | bash`); without it step 2 fails with `command not found: turso`. Given that binary, `turso dev` just writes a SQLite file, so the data and auth layer come up anywhere Node runs — including a cloud sandbox. There is no bootstrap script; the five commands above _are_ the provisioning.

`.env.example` copies cleanly as-is. Three notes on it:

- **`BETTER_AUTH_SECRET`** — any random string. Auth misbehaves without one.
- **`AI_GATEWAY_API_KEY`** — needed for any **embedding** through the Vercel AI Gateway (which needs the key _and_ a network): both **writing** an interaction (its input is embedded — `packages/api/src/interaction/embedding-service.ts`) and **semantically querying** one (`interaction.query` embeds the query text). So the `/api/chat` `type:"chat"` and `/api/eve` recipes below 500 without it. Without a key you can still sign in, browse, delete, make output-only edits, and use the `lorem`/`markdown` chat types — `pnpm db:seed` detects the missing key, seeds the account and an empty Demo collection, and tells you to re-run once you have one.
- Leave **`TURSO_AUTH_TOKEN`** commented out locally. `drizzle-kit` rejects an empty-string token, so `TURSO_AUTH_TOKEN=""` breaks `pnpm db:push`.

Resetting the database is manual, because the schema is pushed _through_ the running server: stop `pnpm -F db db`, `rm -f packages/db/local.db*`, start it again, then `pnpm db:push && pnpm db:seed`.

## Seeded login

```
dev@loremllm.local / password
```

Created by `pnpm db:seed` (`packages/api/scripts/seed.ts`) with a personal organization and a public `demo` collection of 11 interactions. It signs up through `auth.api.signUpEmail`, not a raw insert, so the organization is provisioned by the same hook production uses. Idempotent — re-run any time.

Headless auth (no browser) — exchange the login for a session cookie and hand it to curl or agent-browser:

```sh
curl -s -i -X POST localhost:3000/api/auth/sign-in/email \
  -H 'content-type: application/json' \
  -d '{"email":"dev@loremllm.local","password":"password"}' | grep -i set-cookie
```

`/api/auth/*` is rate-limited (`packages/api/src/auth/auth.ts` sets `window: 60, max: 10`), but better-auth applies a stricter built-in rule to the sign-in paths: **3 requests per 10s per IP** on any `/sign-in*`, `/sign-up*`, `/change-password*` or `/change-email*`, which overrides the configured value. A loop that signs in repeatedly gets 429s almost immediately — sign in once and reuse the cookie.

## Verify a change end-to-end

Static gate (mirrors `.github/workflows/ci.yml` — run before every commit):

```sh
pnpm verify     # typecheck · lint · format · test
```

`pnpm test` currently runs **only** `packages/transport`'s vitest suite — it is the only package with tests. A green `verify` says nothing about `apps/web` or `packages/api` behaviour; exercise those at runtime.

Runtime — drive the real web UI with [agent-browser](https://github.com/vercel-labs/agent-browser):

```sh
agent-browser open http://localhost:3000/auth/login
agent-browser snapshot                        # accessibility tree with @eN refs
agent-browser fill @e8 dev@loremllm.local     # email  (also has data-test="email-input")
agent-browser fill @e9 password               # password
agent-browser click @e5                       # Login
agent-browser snapshot                        # assert the Demo collection renders in the sidebar
```

Refs are assigned per snapshot — read them from your own snapshot rather than trusting the numbers above.

The public API is curl-able without auth against a public collection:

```sh
# semantic match against the seeded collection (streams SSE)
curl -N -X POST localhost:3000/api/chat -H 'content-type: application/json' \
  -d '{"type":"chat","collectionId":"demo","messages":[{"role":"user","parts":[{"type":"text","text":"What is LoremLLM?"}]}]}'

# no collection needed: "markdown" replays a string, "lorem" generates filler
curl -N -X POST localhost:3000/api/chat -H 'content-type: application/json' \
  -d '{"type":"lorem","units":"words","count":1}'

# eve-protocol endpoint for the same collection
curl -X POST localhost:3000/api/eve/demo/eve/v1/session -H 'content-type: application/json' \
  -d '{"message":"What is LoremLLM?"}'
```

Don't stop at typecheck and tests — exercise the actual flow and observe the result.

## OAuth without the internet

Email/password needs no external service. To exercise the **Github** button offline, use [emulate](https://github.com/vercel-labs/emulate), a local OAuth provider (fixtures in `emulate.config.yaml`). Uncomment `NEXT_PUBLIC_GITHUB_EMULATOR_URL` in `.env`, then:

```sh
pnpm emulate     # GitHub emulator on :4000
pnpm dev:web     # must be on :3000 — the registered redirect_uri is hardcoded there
```

With the var set, the shipped "Continue with Github" button routes through a dev-only `genericOAuth` provider aimed at the emulator — same button, no diverging prod path (unset ⇒ the real provider; see `packages/api/src/auth/auth.ts`). Open `/auth/login`, click it, and the emulator's user picker (`octocat`) completes sign-in.

Pure HTTP: `POST /api/auth/sign-in/oauth2 {"providerId":"github"}` returns the authorize URL directly — the same flow the button triggers.

If you run the app on a non-default port, set `PORT` to match (`PORT=3011 next dev -p 3011`). `baseUrl` is derived from it, and it feeds both better-auth's trusted origins and the tRPC mutation origin guard — a mismatch turns every mutation into a 403.

## Platform matrix

| Surface                       | Command                            | Agent-verifiable at runtime?         |
| ----------------------------- | ---------------------------------- | ------------------------------------ |
| Web (Next.js)                 | `pnpm dev:web`                     | **Yes** — headless via agent-browser |
| `@loremllm/transport` (npm)   | `pnpm -F @loremllm/transport test` | **Yes** — 84 vitest cases, no I/O    |
| Public API (`/api/chat`, eve) | `pnpm dev:web` + curl              | **Yes** — plain HTTP, no auth needed |

There is no mobile, desktop, or extension target. Everything this repo ships can be checked headlessly.

## Rules that matter

- **Mutations go through tRPC or the better-auth client — never Next Server Actions.** There are none in `apps/web/src`; keep it that way.
- **Every `useMutation` declares its own `onSuccess` invalidation.** There is no global `MutationCache` net (`apps/web/src/trpc/query-client.ts`), so a mutation added without one leaves stale UI. Note that editing an interaction also touches its collection's `updatedAt`, and the sidebar is ordered by it — such a mutation must invalidate `collection.list` as well as `collection.byId`.
- **No `any`, no non-null `!`, no `as` casts.** Kebab-case filenames. Make illegal states unrepresentable.
- **Org scoping lives in `organizationProcedure`**, not in input schemas — don't re-declare it as procedure input.
- Config degrades gracefully: a missing key disables its feature rather than crashing boot (`packages/api/src/env.ts`). Anything added there must also be listed in `turbo.json` `globalEnv` — turbo runs in strict env mode and strips unlisted vars.

## Map

- `apps/web` · `packages/{api,db,transport,ui}`
- `CLAUDE.md` — conventions + command list (Claude-specific)
- `packages/api/src/auth/auth.ts` — auth config, org provisioning hook, rate limit
- `packages/api/src/trpc.ts` — procedures, CSRF origin guard, org resolution
- `packages/db/src/drizzle-schema.ts` — app tables (collections, interactions, vectors)
- `packages/api/scripts/seed.ts` — the seed · `packages/api/scripts/interactions/` — its markdown fixtures
- `docs/` — design notes · `.github/workflows/ci.yml` — the gate `pnpm verify` mirrors
