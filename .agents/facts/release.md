# Release facts

- Maturity: 0.x. Latest release `0.1.0` (28 Sep 2026), on npm and as the
  GitHub release `v0.1.0`. No compatibility promise before `1.0.0`, but
  the tree JSON `version` field is honoured from the first release (spec §14).
- Versioning: SemVer; all four `@mathinput/*` packages release together at
  the same version, and internal dependencies use `^<version>`. Tags
  `v<major>.<minor>.<patch>` on `main`.
- Changelog: `CHANGELOG.md` (Keep a Changelog). Release notes come from the
  matching changelog section, including a "Known limitations" list for any
  checks not done.
- Governance: `docs/dev/ops/release-governance.md`.
- npm: scope `@mathinput` (organisation owned by the maintainer), public
  access (`publishConfig.access: public` in each package). Published
  packages: `@mathinput/core`, `@mathinput/presets-uk`, `@mathinput/element`,
  `@mathinput/react`. The website `@mathinput/site` is private.
- Publishing: manual, from the maintainer's machine. npm requires 2FA and
  confirms each `npm publish` in the browser, so the maintainer runs the
  publish commands; an agent cannot complete them. New packages can take a
  few minutes to appear in `npm view` (CDN caches the earlier 404). A hosted publish workflow with provenance is a later decision.
- Package contents: `dist/`, `README.md` and `LICENSE` only (`files:
  ["dist"]`; npm adds README and LICENSE). `prepack` copies the root
  `LICENSE` into each package (the copies are gitignored). tsc-built
  packages clear `dist/` before building. Consumers need no particular Node
  version (browser ESM), so packages declare no `engines`.
- Artifacts: ESM + type declarations per package, plus
  `@mathinput/element/mathinput.css`, `@mathinput/element/tailwind.css` and
  `@mathinput/element/define`. No signing or SBOM decided.
- Release check list:
  1. `npm run check`, `npm run test:katex`, `npm run test:browser`,
     `npm run size` (core ≤ 30 kB, element ≤ 20 kB, presets-uk ≤ 1 kB
     min+gzip), `npm run lint:packages` (publint), `npm run build:site`
     — all run by CI (`.github/workflows/ci.yml`), which must be green.
  2. `npm run check:pack`: each tarball holds only `dist/` (no tests),
     README, LICENSE and package.json, and every `exports` target.
     Review `npm pack --dry-run -w <pkg>` by eye before publishing.
  3. Consumer smoke test: install the `npm pack` tarballs into a fresh
     Vite + React + TypeScript app outside the repo; import
     `@mathinput/react`, `@mathinput/element/mathinput.css`,
     `@mathinput/presets-uk` and `@mathinput/core`; type-check and build.
  4. Manual screen-reader and real-device pass (not yet done for 0.1.0;
     listed under Known limitations).
- Publish steps: bump all four versions and internal ranges; cut the
  changelog section; merge to `main`; tag `v<version>` on up-to-date `main`;
  `npm whoami`; `npm publish -w <pkg> --access public` in dependency order
  core, presets-uk, element, react; push the tag; create the GitHub release
  from the changelog section; verify with `npm view @mathinput/<pkg>
  version` and a scratch `npm install`; push `release` for the site.
- Ordinary validation needs no credentials or network.
- Website: `site/` publishes to Cloudflare Pages (https://mathinput.rztaylor.uk)
  from the `release` branch via `.github/workflows/deploy-site.yml`; details in
  `.agents/facts/cloudflare-pages.md`. Promotion to production = pushing
  `release`.
