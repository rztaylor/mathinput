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
- Publishing: hosted, by `.github/workflows/publish.yml` on a pushed
  `v<version>` tag (from 0.1.1; 0.1.0 was published by hand). It checks the
  tag is on `main`, runs `node scripts/release-check.mjs <tag>` (every
  package at the tag's version, internal ranges `^<version>`, a changelog
  section), `check`, `lint:packages`, `check:pack` and `size`, publishes in
  dependency order with provenance through npm trusted publishing (OIDC, no
  npm token; npm ≥ 11.5.1), skipping versions already on npm so a failed run
  can be re-run, then creates the GitHub release from the changelog
  section. Versions with a pre-release suffix (`1.2.0-rc.1`) go to the npm
  `next` dist-tag and a GitHub pre-release. Browser tests are not repeated:
  the tagged commit already passed CI on `main`.
- One-time setup (maintainer, not doable by an agent): on npmjs.com, for
  each of the four packages, Settings → Trusted publishing → GitHub Actions,
  owner `rztaylor`, repository `mathinput`, workflow `publish.yml`,
  environment `npm`; then set "Publishing access" to require 2FA and
  disallow tokens. In GitHub, create the `npm` environment (optionally with
  a required reviewer and a `v*` tag rule).
- Fallback: manual `npm publish -w <pkg> --access public` from the
  maintainer's machine (npm 2FA confirms each publish in the browser, so an
  agent cannot complete it). New packages can take a few minutes to appear
  in `npm view` (CDN caches the earlier 404).
- Package contents: `dist/`, `README.md` and `LICENSE` only (`files:
  ["dist"]`; npm adds README and LICENSE). `prepack` copies the root
  `LICENSE` into each package (the copies are gitignored). tsc-built
  packages clear `dist/` before building. Consumers need no particular Node
  version (browser ESM), so packages declare no `engines`.
- Artifacts: ESM + type declarations per package, plus
  `@mathinput/element/mathinput.css`, `@mathinput/element/tailwind.css` and
  `@mathinput/element/define`. npm provenance attestations from 0.1.1 (the
  Publish workflow); no other signing or SBOM decided.
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
  changelog section; `npm run check:release -- v<version>`; merge to
  `main` with CI green; tag `v<version>` on up-to-date `main` and push the
  tag (the Publish workflow does the rest); verify with `npm view
  @mathinput/<pkg> version`, the provenance badge on npmjs.com and a scratch
  `npm install`; push `release` for the site.
- Ordinary validation needs no credentials or network.
- Website: `site/` publishes to Cloudflare Pages (https://mathinput.rztaylor.uk)
  from the `release` branch via `.github/workflows/deploy-site.yml`; details in
  `.agents/facts/cloudflare-pages.md`. Promotion to production = pushing
  `release`.
