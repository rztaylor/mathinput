# Documentation facts

- `README.md`: orientation, install, quick start, workspace scripts.
- `CHANGELOG.md`: curated, Keep a Changelog headings, `Unreleased` section.
- `docs/dev/specs/mathinput-component.md`: the authoritative component
  contract. Section numbers are cited in code comments and tests; do not
  renumber casually.
- `docs/dev/specs/prototype/`: the reviewed HTML mockup, reference only.
- `docs/dev/plans/`: active numbered ExecPlans (`NNN-kebab-title.md`); delete
  when complete after moving durable outcomes to spec, decisions or changelog.
- `docs/dev/roadmap.md`: lean execution index with statuses.
- `docs/dev/decisions.md`: durable decisions; the spec's §15 log is the
  component-level record and is linked, not duplicated.
- `docs/dev/guides/`: contributor guides (a11y checklist, testing on devices).
- `docs/dev/ops/release-governance.md`: versioning and release policy.
- `docs/user/`: integrator documentation (getting started, API, theming,
  keypad configuration, output formats). It is also the source of the
  website's Docs page (`site/docs/`), so edits appear on the site on the next
  release.
- Document current behaviour as implemented; mark planned behaviour as such.
