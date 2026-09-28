# Testing facts

- Toolchain: Node ≥ 22 (developed on 26), npm workspaces, TypeScript strict,
  ESLint (flat config), Vitest, Playwright (added with the element package).
- Baseline validation, run before every commit that touches code:
  `npm run check` = `lint` + `typecheck` + `test` + `build`.
- Core tests: unit tests next to the code they cover
  (`packages/core/tests/**/*.test.ts`), golden notation cases in
  `packages/core/tests/golden/cases.ts` (TypeScript, built with the tree
  builders), property/fuzz tests (fast-check) for editor invariants.
  Core tests run in Node with no DOM.
- KaTeX render check: `packages/core/tests/golden/katex.test.ts` renders
  every golden LaTeX string with KaTeX + mhchem in strict mode as part of
  `npm test` (`npm run test:katex` runs it alone). KaTeX is a dev dependency
  only.
- Element tests: Vitest + jsdom for behaviour
  (`packages/element/tests/*.test.ts`); Playwright for rendering, clicks and
  axe — `npm run test:browser` (`packages/element/tests/browser/`, projects
  `desktop`, `tablet`, `phone` on Chromium; `desktop-firefox`;
  `desktop-webkit`, `tablet-webkit` (iPad), `phone-webkit` (iPhone 13)).
  Tests branch on the form-factor prefix of the project name, never on the
  engine. Install the engines once with
  `npx playwright install chromium firefox webkit`; `--project=<name>` runs
  one project. The config picks a free port once and shares it with workers through
  `MI_PLAYWRIGHT_PORT`; set `PLAYWRIGHT_PORT` to reuse a running server.
- Demo playground: `npm run dev` (Vite, `packages/element/demo/`), including a
  gallery of every golden case rendered by MathInput next to KaTeX. Browser
  tests save screenshots to `packages/element/test-results/` (gitignored).
- Visible UI changes require screenshots at phone, tablet and desktop widths
  in light and dark themes, and axe with no violations.
- CI: `.github/workflows/ci.yml` runs on every pull request and push to
  `main` (ubuntu, Node 22): `npm run check`, `lint:packages` (publint),
  `check:pack` (tarball contents), `size`, `build:site`, then
  `test:browser` with Chromium, Firefox and WebKit installed by Playwright. Failed runs upload
  `packages/element/test-results/`. Merge only when it is green.
- No test may require network access or credentials.
