# Template Config

This file defines baseline settings for the Paperclip Railway template.

For the full step-by-step implementation, use `railway-template-spec.md`.

## Services

- `paperclip` (from this template repository)
- `postgres` (Railway managed Postgres)

## Build and runtime

- Build strategy: Docker (from this repository `Dockerfile`)
- App source strategy: Dockerfile clones and builds pinned upstream `paperclipai/paperclip` release
- Public networking: enabled (HTTP)
- Container port: `3100`
- Healthcheck path: `/` (replace with dedicated endpoint later if Paperclip adds one)

## Storage and persistence (required)

- Attach Railway Volume to `paperclip`
- Mount path: `/paperclip`
- Set `PAPERCLIP_HOME=/paperclip`
- Do not publish template without this volume requirement

## Variables for `paperclip`

Required:

- `DATABASE_URL=${{postgres.DATABASE_URL}}`
- `BETTER_AUTH_SECRET=${{secret(64, "abcdef0123456789")}}`
- `HOST=0.0.0.0`
- `PORT=3100`
- `SERVE_UI=true`
- `PAPERCLIP_HOME=/paperclip`
- `PAPERCLIP_DEPLOYMENT_MODE=authenticated`
- `PAPERCLIP_DEPLOYMENT_EXPOSURE=private`
- `PAPERCLIP_PUBLIC_URL=https://${{paperclip.RAILWAY_PUBLIC_DOMAIN}}`
- `RAILWAY_RUN_UID=0`

Provider keys (optional user-provided):

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

## Why `BETTER_AUTH_SECRET` is required

Paperclip's deployment config expects a `BETTER_AUTH_SECRET` when running in authenticated mode. Keep this value stable and secret so auth/session behavior remains reliable across restarts and redeploys.

## User prompts in template

Expose user prompts for:

- `OPENAI_API_KEY` (optional)
- `ANTHROPIC_API_KEY` (optional)
- Any additional provider keys you want supported in your default experience

Hide/generated:

- `BETTER_AUTH_SECRET`
- `DATABASE_URL` (reference variable)

## Notes

- Use Railway's reference variable picker for `DATABASE_URL` to avoid service-name casing mistakes.
- `PAPERCLIP_PUBLIC_URL` should point to the generated public domain with `https://`.
- Use private-network references for service-to-service connectivity whenever a hostname is required.
- `RAILWAY_RUN_UID=0` is recommended for volume compatibility when the image defaults to a non-root user.
- Keep volume + Postgres as non-negotiable defaults for data safety.
