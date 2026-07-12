# React Doctor triage

Baseline: React Doctor 0.7.6, full scope, 103 files.

- Score: 42/100
- Findings: 46
- Errors: 4
- Warnings: 42

Final full scan:

- Findings: 21
- Errors: 0
- Warnings: 21
- Cleared: 25

## Decisions

| Rule | Count | Decision | Reason |
| --- | ---: | --- | --- |
| `require-reduced-motion` | 2 | Fix | Real accessibility gap in web and UI packages. |
| `no-ref-current-in-render` | 2 | Fix | Render mutates cleanup refs. Move sync to effects. |
| `url-prefilled-privileged-action` | 1 | Fix | Raw `next` query reaches `router.replace`. Parse internal paths at boundary. |
| `no-reset-all-state-on-prop-change` | 1 | Fix | Key settings by collection identity. Remove effect reset. |
| `no-array-index-as-key` | 8 | Fix 1; accept 7 | Field errors have stable unique messages. Streamed AI parts do not have stable IDs; content keys would remount while streaming. |
| `exhaustive-deps` | 4 | Fix 1; accept 3 | Memoize message children. Prompt input already depends on selected stable aliases; Doctor traces through the conditional aliases incorrectly. |
| `jsx-no-constructed-context-values` | 2 | Fix | Memoize code and reasoning provider values. |
| `rerender-state-only-in-handlers` | 1 | Fix | IME composition state belongs in a ref. |
| `prefer-module-scope-pure-function` | 3 | Fix | Hoist pure helpers without behavior changes. |
| `unused-dependency` | 1 | Fix | `zod` is unused by `@repo/db`. |
| `unused-export` | 4 | Fix 3; accept 1 | Two embedding helpers and `useTRPCClient` are unused. `TRPCProvider` is consumed in the same module. |
| `only-export-components` | 6 | Fix 4; accept 2 | Internal helpers/variants need no export. `alertDialog` and `toast` are intentional imperative APIs. |
| `use-lazy-motion` | 2 | Fix | Real bundle cost. Lazy features preserve panel and shimmer behavior. |
| `dangerous-html-sink` | 2 | Accept | Shiki emits escaped, controlled highlight markup. Sanitizing again can corrupt output. |
| `prefer-use-effect-event` | 2 | Accept | Upstream callbacks are stable. Current dependencies are correct and explicit. |
| `nextjs-no-img-element` | 1 | Accept | Shared UI renders blob/data/dynamic attachment URLs. `next/image` would add framework coupling without useful optimization. |
| `js-combine-iterations` | 3 | Accept | Arrays are small. Current transformations are clearer; loop fusion is immaterial. |
| `no-giant-component` | 1 | Backlog | Prompt input lifecycle is coupled and untested. Add characterization tests before splitting. |

## Verification

Each fix commit must pass focused typechecks and React Doctor changed scope. Final gate:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- React Doctor 0.7.6 full verbose scan
- Browser QA for changed interactions

Browser QA confirmed normal and reduced-motion panel behavior, keyboard navigation, and local-only handling for malicious auth redirect inputs. Dashboard checks require a session. A pre-existing Dialog/portal bug dismisses the demo panel on pointer interaction, so Code-tab and attachment flows remain blocked from manual QA.
