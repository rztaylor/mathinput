# Decisions

Component-level decisions (build vs adopt, light DOM, atom granularity,
renderer, output formats, brackets, Enter behaviour, mixed numbers, package
names and licence) are logged in
[spec §15](specs/mathinput-component.md#15-decisions-log).

| Date | Decision | Why |
|---|---|---|
| 2026-09-27 | npm workspaces monorepo with `core`, `element`, `react` | Core must stay DOM-free and reusable on servers; wrappers stay thin. |
| 2026-09-27 | Tailwind used only at build time for the default stylesheet | Consumers must not need Tailwind; tokens are plain CSS custom properties. |
