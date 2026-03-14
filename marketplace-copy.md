# Marketplace Copy

Use this copy as a starting point for the Railway template listing.

## Title

Paperclip (Docker + Postgres + Persistent Volume)

## Short description

Deploy Paperclip in one click with production-safe defaults: managed Postgres, persistent volume storage, and authenticated access.

## Full description

This template deploys Paperclip with reliability-focused defaults for real users:

- Paperclip app service built via a Railway-compatible adapter Dockerfile
- Adapter image pulls and builds a pinned upstream Paperclip release
- Managed Railway Postgres for durable relational data
- Required Railway Volume mounted at `/paperclip` for persistent Paperclip state
- Authenticated/private deployment defaults with secure secret generation
- Public URL wiring for `PAPERCLIP_PUBLIC_URL`

Recommended for teams that want a quick start without sacrificing persistence and operational safety.

## What users need to provide

- Optional: `OPENAI_API_KEY`
- Optional: `ANTHROPIC_API_KEY`

All core infrastructure variables are preconfigured by the template.

## Post-deploy steps for users

1. Open the generated Paperclip public URL.
2. Complete initial auth/setup.
3. Add provider API keys if needed.
4. Confirm the app is reachable after one restart.

## Tags (suggested)

- ai
- orchestration
- agents
- docker
- postgres

## Notes for marketplace review

- Data persistence is intentionally first-class (`postgres` + mounted volume).
- Auth mode defaults are secure and compatible with first deploy.
- Optional provider API keys are not required for first boot.

## Useful links

- Paperclip repository: https://github.com/paperclipai/paperclip
- Railway templates docs: https://docs.railway.com/templates/create
- Railway publish/share docs: https://docs.railway.com/templates/publish-and-share
- Template repository: https://github.com/<ORG_OR_USER>/paperclip-railway-template
- Template support issues: https://github.com/<ORG_OR_USER>/paperclip-railway-template/issues

## Deploy button (fill after publish)

Template URL format:

- `https://railway.com/new/template/<TEMPLATE_CODE>`

Markdown button:

```md
[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template/<TEMPLATE_CODE>?utm_medium=integration&utm_source=button&utm_campaign=paperclip)
```

HTML button:

```html
<a href="https://railway.com/new/template/<TEMPLATE_CODE>?utm_medium=integration&utm_source=button&utm_campaign=paperclip"><img src="https://railway.com/button.svg" alt="Deploy on Railway" /></a>
```
