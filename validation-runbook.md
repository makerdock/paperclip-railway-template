# Validation Runbook

Follow this runbook before publishing the template.

Canonical configuration source: `railway-template-spec.md`

## 1) Baseline deployment check

1. Deploy the template into a clean Railway project/workspace.
2. Wait for both `paperclip` and `postgres` to become healthy.
3. Open the app URL and confirm the main UI loads.
4. Confirm build logs show upstream Paperclip checkout/build from adapter Dockerfile.

Pass criteria:

- `paperclip` is reachable over public URL
- no startup crash loops
- DB connection succeeds

## 2) Auth/config check

1. Confirm `BETTER_AUTH_SECRET` exists and is hidden/generated.
2. Confirm `PAPERCLIP_DEPLOYMENT_MODE=authenticated`.
3. Confirm `PAPERCLIP_DEPLOYMENT_EXPOSURE=private`.
4. Confirm `PAPERCLIP_PUBLIC_URL` matches the deployed public domain.

Pass criteria:

- auth flow initializes correctly
- no auth/session errors in logs

## 3) Persistence check (critical)

1. Confirm a Railway Volume is attached to `paperclip` at `/paperclip`.
2. Confirm `PAPERCLIP_HOME=/paperclip`.
3. Create observable state in the app (for example: a sample company or task).
4. Restart `paperclip`.
5. Re-open app and verify state is unchanged.
6. Trigger a redeploy of `paperclip`.
7. Re-open app and verify state is still unchanged.

Pass criteria:

- state survives restart
- state survives redeploy

If this fails, do not publish.

## 4) Template user experience check

1. Confirm optional API keys are clearly labeled optional.
2. Confirm defaults allow app startup without extra hidden steps.
3. Confirm docs explain where data is persisted.
4. Confirm template deploy screen is understandable without Paperclip internals.

Pass criteria:

- non-expert user can complete setup without guessing

## 5) Final publish gate

1. Publish template from Railway templates page.
2. Copy generated template URL.
3. Generate deploy button link and validate it opens the template deploy flow.
4. Record template URL and deploy button URL in project docs.

Publish only when all sections above pass in one clean deployment.
