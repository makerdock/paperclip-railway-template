# Contributing

Thanks for helping improve the Paperclip Railway template.

## Scope

This repository is for Railway template packaging and operator experience:

- template service/variable defaults
- marketplace listing content
- validation and publish runbooks
- troubleshooting and update notes

Application-level feature requests for Paperclip itself should be filed in the upstream Paperclip repository.

## How to contribute

1. Open an issue describing the problem or change.
2. If approved, open a pull request with focused changes.
3. Update docs and checklists when behavior changes.
4. Add an entry to `TEMPLATE_CHANGELOG.md`.

## Change quality bar

- Keep defaults safe (`authenticated`, `private`, persistent volume).
- Keep variables and descriptions clear for non-expert users.
- Validate with `validation-runbook.md` before merge.
- Document any breaking change and migration steps.

## Pull request checklist

- [ ] Change is scoped to template behavior/docs
- [ ] `TEMPLATE_CHANGELOG.md` updated
- [ ] Validation runbook still passes
- [ ] Marketplace copy updated if needed
