# Node / TypeScript facts

- Workspaces: `packages/core`, `packages/element`, `packages/react`,
  `packages/presets-uk`, `site`.
- Module format: ESM only (`"type": "module"`), `exports` maps with types.
- TypeScript: `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes` off, target ES2022, `moduleResolution: bundler`);
  each package extends it. `core` uses `lib: ["ES2022"]` only, so DOM types
  cannot leak into it.
- Builds: `tsc` emits declarations; Vite library mode bundles JS.
- Tests: Vitest; files `tests/**/*.test.ts` within each package.
- Lint: ESLint flat config at root with typescript-eslint.
- Dependency policy: no runtime dependencies in `core` or `element`. React is a
  peer dependency of `@mathinput/react`. Dev dependencies need a reason.
