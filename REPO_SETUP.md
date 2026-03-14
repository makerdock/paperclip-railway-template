# GitHub Repository Setup (Template Home)

Use this checklist before publishing the Railway marketplace template so users have a support destination.
This same repository should be both the template home and the template service source.

## 1) Create repository

Create a public repository, recommended name:

- `paperclip-railway-template`

Suggested repository description:

- `Railway one-click template for Paperclip with Postgres, persistent volume, and secure defaults.`

## 2) Push this package

Ensure this repository contains:

- `README.md`
- `railway-template-spec.md`
- `template-config.md`
- `validation-runbook.md`
- `publish-checklist.md`
- `marketplace-copy.md`
- `marketplace-overview.md`
- `TEMPLATE_CHANGELOG.md`
- `.env.example`
- `CONTRIBUTING.md`
- `SUPPORT.md`
- `.github/ISSUE_TEMPLATE/*`
- `.github/pull_request_template.md`

## 3) Configure GitHub metadata

- Enable issues
- Enable discussions (optional)
- Add repository topics:
  - `paperclip`
  - `railway-template`
  - `postgres`
  - `docker`
  - `ai-agents`

## 4) Wire support links

After repo exists, update placeholders in docs:

- `README.md` support section
- `marketplace-copy.md` useful links
- Railway template Overview links

## 5) Publish template from Railway

In Railway template publish form:

- Add GitHub template repo link
- Add deploy URL
- Add support/docs link

## 6) Post-publish maintenance

- Keep `TEMPLATE_CHANGELOG.md` updated for every template revision
- Re-run `validation-runbook.md` before each release
- Tag releases in GitHub if you want change history snapshots
