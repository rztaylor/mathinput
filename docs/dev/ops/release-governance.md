# Release governance

- Versions follow SemVer; all `@mathinput/*` packages are released together at one
  version. Before `1.0.0`, minor versions may break APIs, but every break is
  listed under **Changed** or **Removed** in the changelog with migration
  notes.
- The tree JSON `version` is independent of package versions. A breaking tree
  change bumps it and ships a migration in `@mathinput/core`.
- A release candidate passes: `npm run check`, `npm run test:katex`,
  `npm run test:browser` (all projects), bundle size limits, axe with no
  violations, and the manual screen-reader and real-device checklist.
- Release blockers: failing validation, an undocumented breaking change, a
  public contract (spec §4, §10.2, §10.3) that differs from the spec, or any
  network access by the packages.
- Skipped checks are listed in the release notes with the reason and the risk.
- Publishing runs in GitHub Actions (`.github/workflows/publish.yml`) when a
  `v<version>` tag on `main` is pushed, under the `@mathinput` npm scope,
  with npm trusted publishing and provenance (steps in
  `.agents/facts/release.md`). Only the maintainer pushes release tags.
  Manual publishing from the maintainer's machine is the fallback.
