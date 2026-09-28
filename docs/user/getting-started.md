# Getting started

MathInput is a web component. It works in any framework, or none.

## Install

The packages are published on npm under the `@mathinput` scope
([`@mathinput/element`](https://www.npmjs.com/package/@mathinput/element),
[`@mathinput/react`](https://www.npmjs.com/package/@mathinput/react),
[`@mathinput/core`](https://www.npmjs.com/package/@mathinput/core),
[`@mathinput/presets-uk`](https://www.npmjs.com/package/@mathinput/presets-uk)).
They are released together at one version. Before 1.0 a minor version may
change the API; npm's default range (`^0.1.0`) already stays within 0.1.x,
and the changelog lists every change.

```bash
npm install @mathinput/element
# React apps also:
npm install @mathinput/react
```

## Use it in plain HTML or any framework

```html
<script type="module">
  import "@mathinput/element/define";        // registers <math-input>
  import "@mathinput/element/mathinput.css"; // default styles
</script>

<math-input subject="maths" label="Expression" submit-on-enter></math-input>

<script type="module">
  const input = document.querySelector("math-input");
  input.addEventListener("submit", (e) => {
    const value = e.detail;           // see Output formats
    console.log(value.latex);         // x=\frac{1}{2}
    console.log(value.text);          // x = 1/2
  });
</script>
```

Give every field an accessible name with `label`, `aria-label` or
`aria-labelledby`.

## Use it in React

```tsx
import { MathInput } from "@mathinput/react";
import "@mathinput/element/mathinput.css";

export function EquationField() {
  return (
    <MathInput
      subject="chemistry"
      label="Balanced equation"
      submitOnEnter
      onSubmit={(v) => save(v.doc)}
    />
  );
}
```

Pass `value` and `onInput` for a controlled field; it never resets the caret
while the user types.

## Show a stored expression

```html
<math-input readonly latex="\frac{-b\pm\sqrt{b^{2}-4ac}}{2a}"></math-input>
```

Read-only fields have no caret or keypad and are read out by screen readers.

## One expression at a time

Each field holds one expression. For multi-line work, such as the steps of
a calculation, keep the list in your app: on `submit`, store `e.detail`, show it
read-only, and call `input.clear()`.

## Fonts

The expression uses `STIX Two Text` if it is available, then Cambria Math
and Times. Load STIX Two from your own assets (for example the
`@fontsource/stix-two-text` package) or set another font with the
`math-font` attribute or `--mi-font-math`.
