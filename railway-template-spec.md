# Railway Template Spec (Paperclip)

This file is the implementation spec for creating the Paperclip one-click Railway template in the template composer.

Use it as the source of truth while configuring services, variables, storage, and listing metadata.

## Template identity

- Template name: `Paperclip`
- Service stack:
  - `paperclip` (GitHub source: this template repository)
  - `postgres` (Railway managed Postgres plugin)
- Goal: one-click deploy from Railway Marketplace with durable persistence and secure auth defaults
- Workspace author name: use an identity you are authorized to represent

## Service configuration

### Service: `paperclip`

- Source: GitHub repository `https://github.com/<ORG_OR_USER>/paperclip-railway-template`
- Branch: `main` (or your root branch)
- Build strategy: Docker (this repository `Dockerfile`)
- Public networking: enabled (HTTP)
- Container port: `3100`
- Healthcheck path: `/`
- Start command: use image default

Adapter image behavior:

- The Dockerfile clones and builds a pinned upstream Paperclip release from `paperclipai/paperclip`.
- Upstream version is controlled by `ARG PAPERCLIP_REF` in this repository Dockerfile.
- No Docker `VOLUME` instruction is used (Railway-compatible).
- Persistence is handled only by Railway's attached volume at `/paperclip`.

### Service: `postgres`

- Source: Railway managed Postgres
- Public networking: disabled
- Keep plugin defaults unless required by Railway UI version

Private networking requirement:

- App-to-database communication must stay on private network via `DATABASE_URL` reference.

## Storage configuration (required)

Attach one Railway Volume to `paperclip`:

- Volume mount path: `/paperclip`
- Required variable on `paperclip`: `PAPERCLIP_HOME=/paperclip`

Do not publish without this volume mount. It is required for durable Paperclip state and config.

## Variables for `paperclip`

Set these in the template composer variables tab.

Required:

- `DATABASE_URL=${{postgres.DATABASE_URL}}` (reference variable)
- `BETTER_AUTH_SECRET=${{secret(64, "abcdef0123456789")}}` (generated and hidden)
- `HOST=0.0.0.0`
- `PORT=3100`
- `SERVE_UI=true`
- `PAPERCLIP_HOME=/paperclip`
- `PAPERCLIP_DEPLOYMENT_MODE=authenticated`
- `PAPERCLIP_DEPLOYMENT_EXPOSURE=private`
- `PAPERCLIP_PUBLIC_URL=https://${{paperclip.RAILWAY_PUBLIC_DOMAIN}}`
- `RAILWAY_RUN_UID=0`

Optional user prompts:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

## Template variable handling

- Mark `BETTER_AUTH_SECRET` as hidden/generated.
- Keep `DATABASE_URL` as a service reference variable (not user input).
- Mark provider keys as optional with clear labels.
- Add variable descriptions for required and optional values in template composer.

## Validation sequence before publish

1. Deploy into a clean workspace project using the template URL.
2. Confirm `paperclip` and `postgres` become healthy.
3. Open `paperclip` public URL and complete initial auth/setup.
4. Create sample data (company/task) in app.
5. Restart `paperclip`; verify data persists.
6. Redeploy `paperclip`; verify data persists.
7. Confirm build logs show upstream Paperclip checkout and successful server/ui build.

If either persistence check fails, do not publish.

## Publish settings

Use copy from `marketplace-copy.md` and `marketplace-overview.md`, then:

1. Set category/tags to AI/agents/orchestration/postgres/docker.
2. Confirm links:
   - `https://github.com/paperclipai/paperclip`
   - `https://docs.railway.com/templates/create`
3. Publish template to marketplace.
4. Copy template URL after publish.
5. Add a demo project if available (optional but recommended).

## Share settings

After publish:

1. Generate a deploy button link:
   - `https://railway.com/new/template/<TEMPLATE_CODE>?utm_medium=integration&utm_source=button&utm_campaign=paperclip`
2. Use button image URL:
   - `https://railway.com/button.svg`
3. Add button and template link to repo docs and announcement posts.

## Template updates strategy

Railway template updates are detected from changes merged into the root branch of the GitHub source repository.

- Keep template services GitHub-based so users receive update notifications.
- Keep `TEMPLATE_CHANGELOG.md` updated with release notes and breaking changes.
- For each template revision, re-run `validation-runbook.md` before announcing updates.

## Final output to record

After publish, update `README.md` with:

- Marketplace template URL
- Date validated
- Railway workspace used for validation
- Deploy button URL
