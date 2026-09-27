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
- Element tests: Vitest + jsdom for behaviour; Playwright (Chromium, WebKit,
  Firefox; phone, tablet and desktop projects) for rendering, touch and axe
  checks — `npm run test:browser`. Playwright starts its own server on a free
  port; never hard-code ports.
- Visible UI changes require screenshots at phone, tablet and desktop widths
  in light and dark themes, and axe with no violations.
- No test may require network access or credentials.
