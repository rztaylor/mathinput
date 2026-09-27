# Release facts

- Maturity: pre-release. No compatibility promise before `1.0.0`, but the tree
  JSON `version` field is honoured from the first release (spec §14).
- Versioning: SemVer; the three packages release together at the same
  version. Tags `v<major>.<minor>.<patch>`.
- Changelog: `CHANGELOG.md` (Keep a Changelog). Release notes come from the
  matching changelog section. Changesets may be introduced in plan phase 9.
- Governance: `docs/dev/ops/release-governance.md`.
- Release validation: `npm run check`, `npm run test:katex`,
  `npm run test:browser`, bundle size check (core ≤ 25 kB, element ≤ 45 kB
  min+gzip), manual screen-reader and real-device pass.
- Artifacts: ESM + type declarations per package, plus
  `@mathinput/element/mathinput.css`. No signing or SBOM decided.
- Decision needed: npm publishing account and hosted workflow. Until then,
  releases are manual and nothing is published.
- Ordinary validation needs no credentials or network.
