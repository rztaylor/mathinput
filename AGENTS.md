# MathInput repository guide

MathInput is a reusable, keypad-first web component for entering maths,
chemistry and physics expressions without an input language. The contract is
`docs/dev/specs/mathinput-component.md`; the active build plan is
`docs/dev/plans/001-mathinput-v0-1.md`. Where code and spec disagree, fix one
of them in the same change — never leave them diverging.

## Working agreements

- The component is host- and curriculum-agnostic. Never add behaviour,
  naming or dependencies specific to one host. Curriculum knowledge (levels,
  exam boards) belongs in optional preset packages such as
  `@mathinput/presets-uk`, built only on the public keypad API.
- The expression tree is the single source of truth. Every output format is a
  pure function of the tree; never parse rendered DOM or LaTeX back as state.
- Public contracts (tree JSON, attributes, events, methods, `mi-*` classes,
  `--mi-*` tokens, preset key ids and tags) are versioned API. Change the spec first.
- `@mathinput/core` has no DOM and no runtime dependencies. The element and
  React packages depend on core, never the reverse.
- Use npm workspaces. Run the validation recorded in `.agents/facts/testing.md`
  before handing off changes.
- Work on feature branches; commit each coherent increment. Push and open pull
  requests only when the user asks.
- Give every hand-written architectural unit a concise `BOUNDARY.md`
  (purpose, responsibilities, non-responsibilities, neighbours, dependency
  direction).

Read the relevant `.agents/facts/*.md` before changing product scope,
architecture, UI, testing, release, documentation or Git policy.
