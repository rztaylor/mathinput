# Getting started

MathInput is a web component. It works in any framework, or none.

## Install

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

<math-input subject="maths" level="gcse-higher" label="Your answer" submit-on-enter></math-input>

<script type="module">
  const input = document.querySelector("math-input");
  input.addEventListener("submit", (e) => {
    const answer = e.detail;          // see Output formats
    console.log(answer.latex);        // x=\frac{1}{2}
    console.log(answer.text);         // x = 1/2
  });
</script>
```

Give every field an accessible name with `label`, `aria-label` or
`aria-labelledby`.

## Use it in React

```tsx
import { MathInput } from "@mathinput/react";
import "@mathinput/element/mathinput.css";

export function Answer() {
  return (
    <MathInput
      subject="chemistry"
      label="Balanced equation"
      submitOnEnter
      onSubmit={(v) => sendToTutor(`$${v.latex}$`)}
    />
  );
}
```

Pass `value` and `onInput` for a controlled field; it never resets the caret
while the learner types.

## Show a stored answer

```html
<math-input readonly latex="\frac{-b\pm\sqrt{b^{2}-4ac}}{2a}"></math-input>
```

Read-only fields have no caret or keypad and are read out by screen readers.

## One answer at a time

Each field holds one expression. To let learners show their working, keep
the list of steps in your app: on `submit`, store `e.detail`, show it
read-only, and call `input.clear()`.

## Fonts

The expression uses `STIX Two Text` if it is available, then Cambria Math
and Times. Load STIX Two from your own assets (for example the
`@fontsource/stix-two-text` package) or set another font with the
`math-font` attribute or `--mi-font-math`.
