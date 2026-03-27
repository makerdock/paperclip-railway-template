# Fork Changes — makerdock/paperclip

This document tracks all custom changes made to the `makerdock/paperclip` fork (staging branch) and the `makerdock/paperclip-railway-template` deployment repo, beyond what's in upstream `paperclipai/paperclip`.

## Why This Fork Exists

We run Paperclip for the Bhimte-Taley household ("gharana") as a personal agent orchestration layer. The fork contains bug fixes and patches needed to make our deployment work, most of which should eventually be upstreamed.

---

## makerdock/paperclip (staging branch)

### 1. Wake Context Injection for Resumed Sessions
- **Commit:** `e3c4ab6b` (Mar 22, 2026)
- **Re-applied:** `0621640` (Mar 23, 2026) — upstream merge overwrote the original
- **Problem:** When an agent resumes a session via `--resume`, the bootstrap prompt is skipped (by design — `!sessionId` check). But this meant the agent received no context about WHY it was woken. It just got `-` as the message and had no idea a comment was posted or a task was assigned.
- **Fix:** Added `buildWakeContextNote()` to `packages/adapter-utils/src/server-utils.ts`. This function reads the execution context (wake reason, task ID, comment ID, approval status) and builds a human-readable `[Paperclip Wake Context]` block. All 6 local adapters (claude, codex, cursor, gemini, opencode, pi) inject this into the prompt when resuming a session.
- **Files changed:**
  - `packages/adapter-utils/src/server-utils.ts` — added `buildWakeContextNote()`
  - `packages/adapters/*/src/server/execute.ts` — import + inject into `joinPromptSections()`
- **Upstream issue:** paperclipai/paperclip#1583

### 2. Upstream Master Merge
- **Commit:** `61b982e8` (Mar 22, 2026)
- **What:** Merged upstream master into staging to pick up plugin system, PR workflow consolidation, and other upstream changes.
- **Side effect:** Overwrote the wake context fix (#1 above), which required re-application (#1 re-applied commit).

---

## makerdock/paperclip-railway-template (main branch)

### 1. Point to makerdock Fork
- **Commit:** `5a21b02` (Mar 22, 2026)
- **What:** Changed `PAPERCLIP_REPO` in Dockerfile from `paperclipai/paperclip` to `makerdock/paperclip` and `PAPERCLIP_REF` to `staging`, so Railway builds from our fork with the wake context fix.

### 2. Use Staging Branch
- **Commit:** `3191dc2` (Mar 22, 2026)
- **What:** Changed from PR branch ref to `staging` for cleaner deployment.

### 3. Trigger Rebuild After Rebase
- **Commit:** `755c453` (Mar 22, 2026)
- **What:** Empty commit to trigger Railway rebuild after staging was rebased on v0.3.1.

### 4. Persist Claude Subscription Auth
- **Commit:** `07def19` (Mar 22, 2026)
- **What:** Ensures Claude CLI subscription authentication persists across container redeployments (avoids re-login on every deploy).

### 5. Build Plugin-SDK Before Server
- **Commit:** `72c2f7e` (Mar 23, 2026)
- **Problem:** Upstream merge brought in `@paperclipai/plugin-sdk` as a server dependency, but the Dockerfile didn't build it. Server build failed with `TS2307: Cannot find module '@paperclipai/plugin-sdk'`.
- **Fix:** Added two lines to Dockerfile before the server build step:
  ```dockerfile
  RUN pnpm --filter @paperclipai/shared build
  RUN pnpm --filter @paperclipai/plugin-sdk build
  ```
- **Also submitted:** PR #2 to upstream `makerdock/paperclip` Dockerfile.

---

## Environment Variables Required

These are custom env vars needed for our deployment (set in Railway):

| Variable | Purpose |
|----------|---------|
| `PAPERCLIP_LOCAL_AGENT_JWT_SECRET` | Signs JWT tokens for agent API auth. Generate with `openssl rand -hex 32` |
| `AUTH_PUBLIC_BASE_URL` / `BETTER_AUTH_BASE_URL` | BetterAuth needs the public URL. Uses `$RAILWAY_PUBLIC_DOMAIN` — requires generating a public domain in Railway settings |
| `DATABASE_URL` | PostgreSQL connection string |

---

## Maintenance Notes

- **When merging upstream:** Always check if the merge overwrites `packages/adapter-utils/src/server-utils.ts` or any adapter `execute.ts` files. If so, re-apply the wake context fix.
- **Dockerfile changes:** If upstream adds new workspace packages that the server imports, the Railway template Dockerfile needs updated build order.
- **PR upstream:** The wake context fix should be PR'd to `paperclipai/paperclip` so we don't have to maintain the fork long-term.
### 3. Fix External Directory Permissions in OpenCode Execute Path
- **Commit:** `020f96f2` (Mar 27, 2026)
- **PR:** makerdock/paperclip#3
- **Problem:** The OpenCode adapter's `testEnvironment()` called `prepareOpenCodeRuntimeConfig()` which grants `permission.external_directory=allow`, but the actual `execute()` path skipped this entirely. Agents failed with `adapter_failed` when reading AGENT_HOME files (HEARTBEAT.md, SOUL.md, TOOLS.md) that sit outside the working directory — OpenCode auto-rejected the `external_directory` permission requests.
- **Fix:** Added `prepareOpenCodeRuntimeConfig()` call to `execute.ts`, threaded prepared env through command resolution, model validation, and child process execution, with `finally` cleanup.
- **Files changed:**
  - `packages/adapters/opencode-local/src/server/execute.ts`

# Trigger rebuild: external_directory permissions fix merged to staging 2026-03-27
