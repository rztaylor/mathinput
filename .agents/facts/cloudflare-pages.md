# Cloudflare Pages facts

- Site: the MathInput homepage, docs and demo, source in `site/` (Vite
  multi-page; docs rendered at build time from `docs/user/*.md`).
- Mode: Pages **Direct Upload**, deployed by GitHub Actions
  (`.github/workflows/deploy-site.yml`). No Cloudflare Git integration.
- Pages project: `mathinput`. Production branch: `release`.
- Custom hostname: `mathinput.rztaylor.uk` (zone `rztaylor.uk`, Cloudflare DNS).
- GitHub environment: `Live`, restricted to the `release` branch. Secret
  `CLOUDFLARE_API_TOKEN` (account-level Cloudflare Pages Edit only); variable
  `CLOUDFLARE_ACCOUNT_ID`. Never commit either value.
- Commands: install `npm ci`; checks `npm run check`; build
  `npm run build:site`; output `site/dist`. `site/public/_headers` sets
  security headers and a strict CSP (no third-party hosts).
- Local preview: `npx vite preview --config site/vite.config.ts` (or the
  `site` entry in `.claude/launch.json`).
- Repository: `rztaylor/mathinput` (public). Account: the single account of
  the wrangler login; its ID lives only in the `CLOUDFLARE_ACCOUNT_ID` variable.
- Created with `wrangler pages project create --force`: wrangler 4.142 tries
  to route new Pages projects to Workers and fails in this monorepo. `--force`
  was needed only for creation; `pages deploy` works without it.
- Status (28 Sep 2026): live at https://mathinput.rztaylor.uk, the canonical
  address used in the README, package manifests and site. The custom domain
  is attached (added in the dashboard, which created the DNS record).
  https://mathinput.pages.dev still serves the same site. The first CI
  deployment was run 36329759079 (commit bcda047 on `release`); the `Live`
  environment has the `CLOUDFLARE_API_TOKEN` secret and the
  `CLOUDFLARE_ACCOUNT_ID` variable. The `Live` environment accepts
  deployments from the `release` branch only (custom branch policy, set
  28 Sep 2026).
