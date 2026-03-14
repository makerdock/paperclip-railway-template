# Marketplace Overview Copy

Use this content in Railway's Overview field, following Railway template best-practice structure.

## Deploy and Host Paperclip with Railway

Paperclip is an orchestration platform for running teams of AI agents with budgets, governance, and task coordination. This template deploys Paperclip with durable storage and secure defaults so users can launch quickly without compromising reliability.

## About Hosting Paperclip

Hosting Paperclip requires a web app, relational database, and persistent app storage so data survives restarts and redeploys. This template includes a managed Postgres service, a mounted volume at `/paperclip`, and generated auth secrets to reduce setup errors. The app service uses a Railway-compatible adapter Docker build that pulls and builds a pinned upstream Paperclip release.

## Common Use Cases

- Run a multi-agent company dashboard with persistent state
- Coordinate AI workstreams with budgets and governance controls
- Self-host Paperclip for private team operations
- Launch a production-like environment in one click

## Dependencies for Paperclip Hosting

- Railway managed Postgres
- Railway volume mounted at `/paperclip`
- Public HTTP endpoint for Paperclip UI/API
- Optional LLM provider API keys (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`)

### Deployment Dependencies

- Paperclip repository: https://github.com/paperclipai/paperclip
- Railway template creation: https://docs.railway.com/templates/create
- Railway template publishing: https://docs.railway.com/templates/publish-and-share
- Railway template best practices: https://docs.railway.com/templates/best-practices

### Implementation Details

- `DATABASE_URL` is provided through Railway service reference variables
- `BETTER_AUTH_SECRET` is generated using Railway template functions
- `PAPERCLIP_HOME` is set to `/paperclip` for persistent app files
- `PAPERCLIP_PUBLIC_URL` points to the generated Railway public domain

### Why Deploy Paperclip on Railway?

Railway lets you host the complete Paperclip stack with managed infrastructure, private networking between services, and simple one-click onboarding for users. This makes it easier to operate a durable Paperclip deployment without hand-rolling infrastructure.
