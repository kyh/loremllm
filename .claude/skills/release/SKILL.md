---
name: release
description: Bump, build, publish, tag, and changelog the `@loremllm/transport` npm package. Skips if there are no changes since the last release. Use when the user wants to ship a new transport version. Args optional: bump type, e.g. "release patch", "release minor".
allowed-tools: Bash(*), Read, Edit, Write
---

# Release

Cut a new npm version of `@loremllm/transport`, the one publishable package in this repo. Replaces the old changesets flow (`publish:packages`).

## Context

- Repo root: `/Users/kyh/Documents/Projects/loremllm`
- Only publishable package: `@loremllm/transport` at `packages/transport` (everything else — `@repo/api`, `@repo/db`, `@repo/ui`, `@loremllm/web` — is private).
- Public (`publishConfig.access: "public"`). Built by `pkgroll`. Tag scheme: `@loremllm/transport@<version>`.
- Change detection path: `packages/transport`.
- Current branch: !`git -C /Users/kyh/Documents/Projects/loremllm rev-parse --abbrev-ref HEAD`
- Working tree: !`git -C /Users/kyh/Documents/Projects/loremllm status --short`

## Arguments

Parse from the user message:

- Bump type: `patch`, `minor`, `major`. Default `patch`.
- `--force` to release even with no changes since the last tag.

If ambiguous, ask in one short sentence before proceeding.

## Process

### 1. Preflight

Run in parallel:

- `npm whoami` — must be `kaiyuhsu`. If not, stop and tell the user to `npm login`.
- `git status --porcelain` — if dirty in unrelated files, surface and ask whether to proceed.
- `npm view @loremllm/transport version` — current published.
- Last tag + changes:
  ```
  LAST=$(git tag --list '@loremllm/transport@*' --sort=-v:refname | head -1)
  git log --oneline ${LAST:+$LAST..}HEAD -- packages/transport
  ```
  If empty and `--force` was not passed, tell the user there's nothing to ship and stop.

### 2. Bump

Edit `version` in `packages/transport/package.json`. Keep semver. If the published `latest` is ahead of the local file, use it as the floor and bump from there.

### 3. Changelog

Prepend an entry to `packages/transport/CHANGELOG.md` (create if missing). Source bullets from `git log --pretty='- %s' ${LAST:+$LAST..}HEAD -- packages/transport`, dropping merge commits, prior `release:` commits, and pure dep bumps. Format:

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
  turbo run build --filter=@loremllm/transport
  ```
- Verify `packages/transport/dist/` exists and is non-empty.

### 5. Publish

From `packages/transport`:

```
pnpm publish --access public --no-git-checks
```

`--no-git-checks` because we commit + tag _after_ publish.

### 6. Verify

`npm view @loremllm/transport dist-tags` — confirm `latest` matches the new version. Registry can lag; retry once after `sleep 5` before flagging.

### 7. Commit, tag, push

```
git add packages/transport/package.json packages/transport/CHANGELOG.md
git commit -m "release: @loremllm/transport@<version>"
git tag -a '@loremllm/transport@<version>' -m '@loremllm/transport@<version>'
git push --follow-tags origin <current-branch>
```

git accepts `@` in tag names.

### 8. Report

```
Released: @loremllm/transport@X.Y.Z (tag: @loremllm/transport@X.Y.Z)
Commit: <sha> (pushed to origin/<branch>)
```

If anything failed, lead with the failure and the exact state (published? committed? tagged? pushed?).

## Rules

- Tag is created **after** successful publish + verify, never before.
- If `npm publish` fails with `EPUBLISHCONFLICT`, bump again rather than overwrite.
- Never `--force` push or amend prior release commits.
- Skip-if-unchanged is the default; pass `--force` to override.
- Bootstrap: if no prior tag exists, treat all history as the changes, capping changelog bullets at the last 20 commits.
