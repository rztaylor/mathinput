# Cloudflare Pages facts

- Site: the MathInput homepage, docs and demo, source in `site/` (Vite
  multi-page; docs rendered at build time from `docs/user/*.md`).
- Mode: Pages **Direct Upload**, deployed by GitHub Actions
  (`.github/workflows/deploy-site.yml`). No Cloudflare Git integration.
- Pages project: `mathinput`. Production branch: `release`.
- Custom hostname: `mathinput.rztaylor.uk` (zone `rztaylor.uk`, Cloudflare DNS).
- GitHub environment: `Live` (restrict to the `release` branch). Secret
  `CLOUDFLARE_API_TOKEN` (account-level Cloudflare Pages Edit only); variable
  `CLOUDFLARE_ACCOUNT_ID`. Never commit either value.
- Commands: install `npm ci`; checks `npm run check`; build
  `npm run build:site`; output `site/dist`. `site/public/_headers` sets
  security headers and a strict CSP (no third-party hosts).
- Local preview: `npx vite preview --config site/vite.config.ts` (or the
  `site` entry in `.claude/launch.json`).
- Status (27 Sep 2026): site and workflow prepared. Not yet live — waiting
  for: Cloudflare account access, Pages project and custom domain, a GitHub
  remote with the `Live` environment and secret, and a first push to `release`.
- Decision needed: Cloudflare account ID and the GitHub repository
  (`owner/name`).
