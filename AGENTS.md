# AGENTS.md

**LoremLLM** mocks LLM responses: you store input/output pairs in a collection, and the hosted endpoints replay the best semantic match instead of calling a real model. This is the tool-agnostic guide for coding agents — it's meant to be run, not just read. Claude also reads `CLAUDE.md`; both point back here.

One pnpm/Turbo monorepo: `apps/web` (Next.js App Router) on `packages/contract` (the oRPC contract) and `packages/service` (its implementation + better-auth), `packages/db` (Drizzle + Turso/libSQL), `packages/ui` (shadcn/Base UI), and the published npm packages: `packages/ai-sdk` (`@loremllm/ai-sdk`, the AI SDK chat transport), `packages/eve` (`@loremllm/eve`, the eve mock server, built on ai-sdk's `mockResponse` types and its `./internal` helpers) and `packages/transport` (deprecated `@loremllm/transport`, a re-export shim of both).

## Quickstart (headless)

```sh
pnpm install && pnpm bootstrap --yes   # .env (.env.example, fresh BETTER_AUTH_SECRET), local Turso on :8080 if none answers, schema, seed
pnpm dev:web                           # http://localhost:3000
pnpm smoke                             # health → seeded sign-in → collection lifecycle over oRPC → dashboard render
```

You need the `turso` CLI on PATH, and it is not a package dependency. Install it first (`brew install tursodatabase/tap/turso`, or `curl -sSfL https://get.tur.so/install.sh | bash`); bootstrap stops and says so without it. Given that binary, `turso dev` just writes a SQLite file, so the data and auth layer come up anywhere Node runs — including a cloud sandbox. Bootstrap is idempotent and starts `turso dev` detached (log in `packages/db/turso-dev.log`, PID printed); `pnpm db:start` runs it in the foreground instead. By hand, the steps are `cp .env.example .env` (set `BETTER_AUTH_SECRET`), `pnpm db:start`, `pnpm db:push`, `pnpm db:seed`. `pnpm bootstrap --dry-run` prints them; `SMOKE_URL` points `pnpm smoke` at a deployment.

`.env.example` copies cleanly as-is. Three notes on it:

- **`BETTER_AUTH_SECRET`** — any random string. Auth misbehaves without one.
- **`AI_GATEWAY_API_KEY`** — needed for any **embedding** through the Vercel AI Gateway (which needs the key _and_ a network): both **writing** an interaction (its input is embedded — `packages/service/src/interaction/embedding-service.ts`) and **semantically querying** one (`interaction.query` embeds the query text). So the `/api/chat` `type:"chat"` and `/api/eve` recipes below 500 without it. Without a key you can still sign in, browse, delete, make output-only edits, and use the `lorem`/`markdown` chat types — `pnpm db:seed` detects the missing key, seeds the account and an empty Demo collection, and tells you to re-run once you have one.
- Leave **`TURSO_AUTH_TOKEN`** commented out locally. `drizzle-kit` rejects an empty-string token, so `TURSO_AUTH_TOKEN=""` breaks `pnpm db:push`.

Resetting the database is manual, because the schema is pushed _through_ the running server: stop `pnpm -F db db`, `rm -f packages/db/local.db*`, start it again, then `pnpm db:push && pnpm db:seed`.

## Seeded login

```
dev@loremllm.local  (no password: sign in with an emailed code)
```

Created by `pnpm db:seed` (`packages/service/scripts/seed.ts`) with a personal organization and a public `demo` collection of 11 interactions. It signs in through better-auth's email-code API (`auth.api.signInEmailOTP`), not a raw insert, so the organization is provisioned by the same hook production uses. Idempotent — re-run any time.

Sign-in is an emailed six-digit code (better-auth's `emailOTP`, five minutes, three tries); there are no passwords. `pnpm sign-in-code [email]` mints a code straight into the database (`auth.api.createVerificationOTP`), so nothing needs an inbox. Headless auth — exchange one for a session cookie and hand it to curl or agent-browser:

```sh
curl -s -i -X POST localhost:3000/api/auth/sign-in/email-otp \
  -H 'content-type: application/json' \
  -d "{\"email\":\"dev@loremllm.local\",\"otp\":\"$(pnpm sign-in-code)\"}" | grep -i set-cookie
```

`/api/auth/*` is rate-limited (`packages/service/src/auth/auth.ts` sets `window: 60, max: 10`), but better-auth applies a stricter built-in rule to the sign-in paths: **3 requests per 10s per IP** on any `/sign-in*`, `/sign-up*`, `/change-password*` or `/change-email*`, which overrides the configured value. A loop that signs in repeatedly gets 429s almost immediately — sign in once and reuse the cookie.

## Verify a change end-to-end

Static gate (mirrors `.github/workflows/ci.yml`, which also runs `pnpm build` — run before every commit):

```sh
pnpm verify     # typecheck · lint · format · test
```

CI's `smoke` job is the runtime gate: it starts libSQL, runs `pnpm db:push` and `pnpm db:seed` on a fresh database, builds, starts `next start` and runs `pnpm smoke` against it, so it signs in with a code `pnpm sign-in-code` mints in that database and needs no secret.

`pnpm test` runs Node's built-in test runner (`node --import tsx --test`) over `packages/ai-sdk`, `packages/eve`, `apps/web`'s `lib` helpers, `/api/orpc` Origin check and query-client serializer, and a few `packages/service` guards (auth schema, session cookie, `sendEmail`'s modes, `slugify`, which middleware runs before input validation, the active-organization fallback, and who may query a private collection) — nothing else has tests. A green `verify` says nothing about the rest of `apps/web` or `packages/service` behaviour; exercise those at runtime.

**Lint is a clean gate.** `oxlint.config.ts` extends the ultracite presets (`ultracite/oxlint/core`, `react`, `anti-slop`, `landmines`, with `next` scoped to `apps/web`); every rule is an error and `lint` fails on the first one. Landmines means:

- **No prose comments.** What survives is directives (`oxlint-disable…`), a single-line `// WARNING:` on a dangerous recurring footgun, and TSDoc on exported API (the published `@loremllm/*` packages keep their own). Rationale goes in the commit, or here when it is a decision.
- **No explicit return types.** Pin a contract with `satisfies` or a typed const (`const handler: StaticEveHandler = …; return handler;`). In the published packages, check that `pnpm -F @loremllm/ai-sdk -F @loremllm/eve build` emits the same `dist/*.d.ts` signatures: an inferred type can silently change the published API.
- **Tests use real implementations**: no module mocks, `mock.fn(impl)`, stubbed globals or fake responses; spies only observe (`mock.method(console, "info")`, `mock.fn()`). No fixed sleeps: await the operation. Test files are `<subject>.test.ts` beside their subject, and a package declares explicit `exports`, never a `./*` → `./src/*` wildcard.

No rule is turned off, and lint is type-aware (`options.typeAware`, run by the `oxlint-tsgolint` devDependency), so every file it reads must sit in a tsconfig: the published packages' tests and `packages/db/drizzle.config.ts` are typechecked for that reason. Sequential awaits are a recursive function or `for await`, never an `await` in a loop (`eachInOrder` in `packages/ai-sdk/src/shared.ts` streams chunks in order). Fix the code rather than adding an `oxlint-disable` comment; when a rule is genuinely wrong for a line, disable that line with a `-- reason`.

Runtime — drive the real web UI with [agent-browser](https://github.com/vercel-labs/agent-browser):

```sh
agent-browser open http://localhost:3000/auth/login
agent-browser wait '[data-test="email-input"]' # the form streams in under <Suspense>
agent-browser snapshot                        # accessibility tree with @eN refs
agent-browser fill @e8 dev@loremllm.local     # email  (also has data-test="email-input")
agent-browser click @e9                       # Continue with email: the code lands in pnpm dev:web's log
agent-browser snapshot
agent-browser fill @e8 <code>                 # data-test="code-input"; or a fresh one: pnpm sign-in-code
agent-browser click @e9                       # Sign in
agent-browser snapshot                        # assert the Demo collection renders in the sidebar
```

Refs are assigned per snapshot — read them from your own snapshot rather than trusting the numbers above.

Each session gets its own browser: the SessionStart hook sets `AGENT_BROWSER_SESSION` to the session's id, and the SessionEnd hook closes every browser named after it. The SubagentStart hook tells each subagent a `--session` of its own, named after the session's, so SessionEnd closes those too. Locate by `snapshot -i` refs or `find role … --name`, never `find text`, which can match a hidden duplicate label. A background tab gets no animation frames, so menus won't open: `agent-browser tab keep live` fixes it.

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

Email codes need no external service: without `RESEND_API_KEY` they land in the server log. To exercise the **Github** button offline, use [emulate](https://github.com/vercel-labs/emulate), a local OAuth provider (fixtures in `emulate.config.yaml`). Uncomment `NEXT_PUBLIC_GITHUB_EMULATOR_URL` in `.env`, then:

```sh
pnpm emulate     # GitHub emulator on :4000
pnpm dev:web     # must be on :3000 — the registered redirect_uri is hardcoded there
```

With the var set, the shipped "Continue with Github" button routes through a dev-only `genericOAuth` provider aimed at the emulator — same button, no diverging prod path (unset ⇒ the real provider; see `packages/service/src/auth/auth.ts`). Open `/auth/login`, click it, and the emulator's user picker (`octocat`) completes sign-in.

Pure HTTP: `POST /api/auth/sign-in/social {"provider":"github"}` returns the authorize URL directly — the same flow the button triggers.

If you run the app on a non-default port, set `PORT` to match (`PORT=3011 next dev -p 3011`). `baseUrl` is derived from it, and it feeds better-auth's trusted origins — a mismatch breaks sign-in and every other `/api/auth/*` call.

## Platform matrix

| Surface                       | Command                         | Agent-verifiable at runtime?                                   |
| ----------------------------- | ------------------------------- | -------------------------------------------------------------- |
| Web (Next.js)                 | `pnpm dev:web`                  | **Yes** — headless via agent-browser                           |
| `@loremllm/ai-sdk` (npm)      | `pnpm -F @loremllm/ai-sdk test` | **Yes** — node:test, no network                                |
| `@loremllm/eve` (npm)         | `pnpm -F @loremllm/eve test`    | **Yes** — node:test; the eve client one uses a loopback server |
| Public API (`/api/chat`, eve) | `pnpm dev:web` + curl           | **Yes** — plain HTTP, no auth needed                           |

There is no mobile, desktop, or extension target. Everything this repo ships can be checked headlessly.

## Rules that matter

- **Mutations go through oRPC or the better-auth client — never Next Server Actions.** There are none in `apps/web/src`; keep it that way.
- **Every `useMutation` declares its own `onSuccess` invalidation.** There is no global `MutationCache` net (`apps/web/src/orpc/query-client.ts`), so a mutation added without one leaves stale UI. Invalidate the router key you affected (`orpc.collection.key()` — a partial-match prefix covering every `collection.*` query) unless you can name the single procedure that moved; an interaction write also bumps its collection's `updatedAt`, and the sidebar is ordered by it.
- **No `any`, no non-null `!`, no `as` casts.** Kebab-case filenames. Make illegal states unrepresentable.
- **Org scoping lives in `requireActiveOrganization`** (the session's active organization), not in input schemas — don't re-declare it as procedure input.
- **`cacheComponents` and `partialPrefetching` are on** (`apps/web/next.config.ts`): a `<Link>` prefetches its route's static App Shell. Request data (the session, `searchParams`, `connection()`) is read only inside `<Suspense>` — `(app)/layout.tsx` checks the session there (the real gate); `src/proxy.ts` first 307s a `/dashboard` request with no session cookie to `/auth/login?next=…` (optimistic, cookie presence only). No route segment config (`dynamic`, `revalidate`); cache static output with `"use cache"`.
- **The legal pages are claims about the code.** `/privacy` and `/terms` (`apps/web/src/lib/agent/site-pages.ts`) follow General Legal's templates (GDPR-enhanced privacy policy, website terms of use, JAMS arbitration) with each clause resolved to what this product does: a change to what the code collects, stores or sends changes the copy in the same commit.
- Config degrades gracefully: a missing key disables its feature rather than crashing boot (`packages/service/src/env.ts`). Without `RESEND_API_KEY`, mail is logged, sign-in codes included, outside production only; a production deployment sends and logs nothing, warns once at boot, and refuses sign-in by email code up front, leaving GitHub (`packages/service/src/email/send-email.ts`): a live code in production logs would hand the account to anyone who reads them. Anything added there must also be listed in `turbo.json` `globalEnv` — turbo runs in strict env mode and strips unlisted vars.

## Map

- `apps/web` · `packages/{contract,service,db,transport,ui}`
- `CLAUDE.md` — conventions + command list (Claude-specific)
- `packages/service/src/auth/auth.ts` — auth config, org provisioning hook, rate limit (stored in the database, `rate_limit`, because in-memory counters multiply across serverless instances and reset on deploy); the session cookie's `SameSite=Lax` is only `/api/orpc`'s cross-**site** defense
- `apps/web/src/app/api/orpc/[[...rest]]/route.ts` — the other half: an `Origin` check, because `SameSite` keys on site, so a sibling subdomain's form POST rides the session cookie in
- `packages/contract/src` — the API contract: inputs, output types, procedure bases · `packages/service/src/orpc.ts` — its implementer, session and org-resolution middleware
- `packages/db/src/drizzle-schema.ts` — app tables (collections, interactions, vectors) · `drizzle-relations.ts` — the `db.query` graph over the app and auth schemas
- `packages/service/scripts/seed.ts` — the seed · `packages/service/scripts/interactions/` — its markdown fixtures
- `apps/web/scripts/og-video.ts` — records the home page's og:video from `scripts/og-video/scene.html` (the ASCII wordmark scrambling into place: a built scene, not the running app) into `apps/web/public/og/`; run by hand with `pnpm -F @repo/web og:video`, never by `verify` or the build
- `docs/` — design notes · `.github/workflows/ci.yml` — the gate `pnpm verify` mirrors, plus `pnpm build`
