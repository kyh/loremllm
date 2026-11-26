---
name: release
description: Bump, build, publish, tag, and changelog the published `@loremllm/*` npm packages (`@loremllm/ai-sdk`, `@loremllm/eve`, deprecated `@loremllm/transport`). Skips packages with no changes since their last release. Args optional: package and bump type, e.g. "release ai-sdk minor", "release eve patch".
allowed-tools: Bash(*), Read, Edit, Write
---

# Release

Cut a new npm version of one or more publishable packages. Replaces the old changesets flow (`publish:packages`).

| Package               | Dir                  | Notes                                                         |
| --------------------- | -------------------- | ------------------------------------------------------------- |
| `@loremllm/ai-sdk`    | `packages/ai-sdk`    | AI SDK `StaticChatTransport`. Release first.                  |
| `@loremllm/eve`       | `packages/eve`       | Depends on `@loremllm/ai-sdk` (`workspace:^`). Release after. |
| `@loremllm/transport` | `packages/transport` | Deprecated re-export shim of both. See "Deprecation" below.   |

Below, `<pkg>` is the npm name and `<dir>` its directory. Run steps 1–7 once per package, in table order. When `eve` changes depend on unreleased `ai-sdk` changes, release `ai-sdk` too. `pnpm publish` rewrites `workspace:^` to the local version, so the dependency must be published first.

## Context

- Repo root: `/Users/kyh/Documents/Projects/loremllm`
- Publishable packages: the table above (everything else — `@repo/contract`, `@repo/db`, `@repo/service`, `@repo/ui`, `@repo/web` — is private).
- Public (`publishConfig.access: "public"`). Built by `tsc` to `dist/`. Tag scheme: `<pkg>@<version>`.
- Change detection path: `<dir>`.
- Current branch: !`git -C /Users/kyh/Documents/Projects/loremllm rev-parse --abbrev-ref HEAD`
- Working tree: !`git -C /Users/kyh/Documents/Projects/loremllm status --short`

## Arguments

Parse from the user message:

- Package(s): `ai-sdk`, `eve`, `transport`, or `all`. Default: every package with changes since its last tag.
- Bump type: `patch`, `minor`, `major`. Default `patch`.
- `--force` to release even with no changes since the last tag.

If ambiguous, ask in one short sentence before proceeding.

## Process

### 1. Preflight

Run in parallel:

- `npm whoami` — must be `kaiyuhsu`. If not, stop and tell the user to `npm login`.
- `git status --porcelain` — if dirty in unrelated files, surface and ask whether to proceed.
- `npm view <pkg> version` — current published.
- Last tag + changes:
  ```
  LAST=$(git tag --list '<pkg>@*' --sort=-v:refname | head -1)
  git log --oneline ${LAST:+$LAST..}HEAD -- <dir>
  ```
  If empty and `--force` was not passed, skip that package and say so.
  First publish (`npm view` 404s, no tag): publish the version already in `package.json` without bumping.

### 2. Bump

Edit `version` in `<dir>/package.json`. Keep semver. If the published `latest` is ahead of the local file, use it as the floor and bump from there.

### 3. Changelog

Prepend an entry to `<dir>/CHANGELOG.md` (create if missing). Source bullets from `git log --pretty='- %s' ${LAST:+$LAST..}HEAD -- <dir>`, dropping merge commits, prior `release:` commits, and pure dep bumps. Format:

```markdown
# Changelog

## <new-version> — <YYYY-MM-DD>

- <commit subject>
```

Terse bullets — sacrifice grammar for concision. If unsure, show the proposed entry before writing.

### 4. Install + build

- `pnpm install` from repo root — defensive; deps may be unlinked after a pull.
- Build via turbo so any workspace deps build first:
  ```
  turbo run build --filter=<pkg>
  ```
- Verify `<dir>/dist/` exists and is non-empty.

### 5. Publish

From `<dir>`:

```
pnpm publish --access public --no-git-checks
```

`--no-git-checks` because we commit + tag _after_ publish.

### 6. Verify

`npm view <pkg> dist-tags` — confirm `latest` matches the new version. Registry can lag; retry once after `sleep 5` before flagging.

### 7. Commit, tag, push

```
git add <dir>/package.json <dir>/CHANGELOG.md
git commit -m "release: <pkg>@<version>"
git tag -a '<pkg>@<version>' -m '<pkg>@<version>'
git push --follow-tags origin <current-branch>
```

git accepts `@` in tag names.

### 8. Report

```
Released: <pkg>@X.Y.Z (tag: <pkg>@X.Y.Z)   # one line per package
Commit: <sha> (pushed to origin/<branch>)
```

If anything failed, lead with the failure and the exact state (published? committed? tagged? pushed?).

## Deprecation (`@loremllm/transport`)

The last `@loremllm/transport` release is a `minor` (0.8.0) that re-exports `@loremllm/ai-sdk` and `@loremllm/eve`, published after both. Then, once, and only with the user's go-ahead (it shows on every install):

```
npm deprecate @loremllm/transport "Split into @loremllm/ai-sdk and @loremllm/eve. Same API, new import paths."
```

Don't release `transport` again unless the user asks.

## Rules

- Tag is created **after** successful publish + verify, never before.
- If `npm publish` fails with `EPUBLISHCONFLICT`, bump again rather than overwrite.
- Never `--force` push or amend prior release commits.
- Skip-if-unchanged is the default; pass `--force` to override.
- Bootstrap: if no prior tag exists, treat all history as the changes, capping changelog bullets at the last 20 commits.
