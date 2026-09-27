# MathInput

A keypad-first web component for entering maths, chemistry and physics
expressions the way they look on paper — no LaTeX, `^` or `sqrt()` for the
learner to learn. It returns each expression as a tree plus LaTeX, linear
text, spoken text and MathML, ready to render, store, or send to an LLM.

Built for GCSE and A-level learners on phones, tablets and desktops.
Framework-agnostic (`<math-input>` custom element) with a React wrapper.

> Status: in development (pre-release). See the
> [component spec](docs/dev/specs/mathinput-component.md) and the
> [implementation plan](docs/dev/plans/001-mathinput-v0-1.md).
> A clickable [prototype](docs/dev/specs/prototype/mathinput-prototype.html)
> shows the intended interaction.

## Packages

| Package | Purpose |
|---|---|
| `@mathinput/core` | Expression tree, headless editor, serialisers and parsers. No DOM. |
| `@mathinput/element` | The `<math-input>` custom element, keypad and default styles. |
| `@mathinput/react` | React wrapper. |

## Development

Requires Node 22 or later.

```bash
npm install
npm run check      # lint, typecheck, test, build
```

Repository conventions for contributors and agents are in
[AGENTS.md](AGENTS.md) and `.agents/facts/`.

## Licence

MIT
