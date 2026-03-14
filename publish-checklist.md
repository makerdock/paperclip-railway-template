# Publish Checklist

Use this checklist before making the Paperclip template public.

Use `railway-template-spec.md` as the canonical values reference while checking each item.

## Template quality gates

- [ ] Deploy works from a clean account/workspace.
- [ ] `paperclip` and `postgres` services are both included.
- [ ] Railway Volume is attached and mounted at `/paperclip`.
- [ ] Required variables are present and populated.
- [ ] Sensitive variables are hidden/generated.
- [ ] Public networking is enabled for `paperclip`.
- [ ] Healthcheck passes.
- [ ] `PAPERCLIP_PUBLIC_URL` points to deployed public domain.
- [ ] Template Dockerfile does not include `VOLUME` directive.
- [ ] Build logs confirm adapter pulled and built upstream Paperclip.

## Persistence gate (must pass)

- [ ] Create test data in Paperclip.
- [ ] Restart `paperclip` service.
- [ ] Confirm test data remains.
- [ ] Trigger redeploy.
- [ ] Confirm test data remains after redeploy.

## Security and UX gate

- [ ] Deployment mode defaults to authenticated.
- [ ] Exposure defaults to private.
- [ ] Template description clearly states optional provider API keys.
- [ ] First-run instructions are clear for non-technical users.

## Marketplace metadata gate

- [ ] Title is clear and searchable.
- [ ] Description explains what is deployed and why.
- [ ] Category/tags are accurate.
- [ ] Template includes concise setup notes.
- [ ] Link to Paperclip docs/repo is included.
- [ ] Dedicated template repository link is included.
- [ ] Template issue tracker link is included.
- [ ] Overview content follows Railway best-practice structure.
- [ ] Template/service icons are 1:1 with transparent backgrounds.
- [ ] Service and template naming follows Paperclip brand spelling.
- [ ] Workspace author name accurately represents maintainer identity.

## Final sign-off

- [ ] One-click template URL tested end-to-end.
- [ ] Deploy button URL generated and tested.
- [ ] Optional live demo project attached (recommended).
- [ ] `TEMPLATE_CHANGELOG.md` updated with this release notes.
- [ ] Final URL recorded in this project docs.
- [ ] Publish approved.
