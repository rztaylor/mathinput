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

## Quick start

```html
<script type="module">
  import "@mathinput/element/define";
  import "@mathinput/element/mathinput.css";
</script>

<math-input subject="maths" level="gcse-higher" label="Your answer" submit-on-enter></math-input>

<script type="module">
  const el = document.querySelector("math-input");
  el.addEventListener("submit", (e) => console.log(e.detail.latex, e.detail.text));
</script>
```

React:

```tsx
import { MathInput } from "@mathinput/react";
import "@mathinput/element/mathinput.css";

<MathInput subject="chemistry" label="Equation" submitOnEnter onSubmit={(v) => send(`$${v.latex}$`)} />
```

Guides: [theming](docs/user/theming.md) · [keypad configuration](docs/user/keypad-config.md) · [output formats](docs/user/formats.md).

## Development

Requires Node 22 or later.

```bash
npm install
npm run check         # lint, typecheck, unit tests, build
npm run test:browser  # Playwright: rendering, keypad, axe (Chromium)
npm run dev           # demo playground
```

Repository conventions for contributors and agents are in
[AGENTS.md](AGENTS.md) and `.agents/facts/`.

## Licence

MIT
