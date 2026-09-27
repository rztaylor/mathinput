# Architecture facts

- Monorepo with npm workspaces under `packages/`:
  - `packages/core` — `@mathinput/core`: tree model, headless editor, rules,
    serialisers, parsers, keypad definitions. Pure TypeScript; no DOM types in
    `src/`, no runtime dependencies.
  - `packages/element` — `@mathinput/element`: `<math-input>` custom element,
    DOM renderer, input handling, keypad UI, default stylesheet.
  - `packages/react` — `@mathinput/react`: thin React wrapper over the element.
  - `packages/presets-uk` — `@mathinput/presets-uk`: optional UK curriculum
    keypads as `KeypadPatch`es over the core presets. Depends on core only.
- Dependency direction: `react → element → core`. Nothing imports upward.
  Within core: `keypad → editor → rules → model`, `serialize → model`,
  `parse → model`; `model` imports nothing.
- Architectural units (each has a `BOUNDARY.md`): each package root and each
  top-level folder under a package's `src/` (for example
  `packages/core/src/editor`). Leaf files are not units.
- Boundary documents: `BOUNDARY.md`, ≤ 2 KiB, current behaviour only.
- Generated output: `packages/*/dist/` (gitignored). No generated sources are
  committed.
- Golden notation cases live in `packages/core/tests/golden/` and are the
  notation contract (spec §9).
- DOM strategy: light DOM with `mi-*` classes and `--mi-*` tokens; default CSS
  in `@layer mathinput` (spec §10).
