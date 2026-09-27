# Theming MathInput

MathInput ships a default look that works in light and dark mode. Everything
visual can be changed without touching its source, in increasing depth:

1. **Tokens** — set `--mi-*` custom properties. Enough for most apps.
2. **Classes** — style the public `mi-*` classes in your own CSS.
3. **Keypad** — change keys, tabs and labels (see [keypad-config.md](keypad-config.md)).
4. **Replace the stylesheet** — skip `mathinput.css` and style the class
   contract from scratch.

## Loading the styles

```js
import "@mathinput/element/define";          // registers <math-input>
import "@mathinput/element/mathinput.css";   // default styles
```

All default rules are inside `@layer mathinput`, so any ordinary
(unlayered) rule of yours wins without `!important`.

### With Tailwind CSS v4

Import MathInput's Tailwind entry **before** Tailwind:

```css
@import "@mathinput/element/tailwind.css";
@import "tailwindcss";
```

This fixes the layer order (`theme, base, mathinput, components, utilities`)
so Tailwind utilities override the defaults, and exposes the tokens as theme
values: `bg-mi-key`, `text-mi-field-fg`, `bg-mi-key-template`,
`rounded-mi-key`, `font-mi-math` and so on. Consumers without Tailwind never
need it.

## Tokens

Set tokens on `math-input` (or any ancestor):

```css
math-input {
  --mi-field-border-focus: #7c3aed;
  --mi-key-template-bg: #f3e8ff;
  --mi-key-template-fg: #5b21b6;
  --mi-key-variant-indicator: #db2777;
  --mi-key-radius: 6px;
}
```

| Group | Tokens |
|---|---|
| Fonts | `--mi-font-ui`, `--mi-font-math` (or the `math-font` attribute) |
| Field | `--mi-field-bg`, `--mi-field-fg`, `--mi-field-border`, `--mi-field-border-focus`, `--mi-field-ring`, `--mi-field-radius`, `--mi-field-size`, `--mi-field-min-height`, `--mi-field-padding`, `--mi-muted` |
| Editing | `--mi-caret`, `--mi-row-active-bg`, `--mi-selection-bg`, `--mi-placeholder-border`, `--mi-placeholder-border-active`, `--mi-placeholder-bg-active`, `--mi-ghost-opacity`, `--mi-ghost-color`, `--mi-danger` |
| Keypad | `--mi-keypad-bg`, `--mi-keypad-border`, `--mi-keypad-gap`, `--mi-keypad-radius` |
| Keys | `--mi-key-bg`, `--mi-key-fg`, `--mi-key-shadow`, `--mi-key-radius`, `--mi-key-font-size`, `--mi-key-size-phone`, `--mi-key-size-tablet`, `--mi-key-size-desktop`, `--mi-key-operator-bg`, `--mi-key-template-bg`, `--mi-key-template-fg`, `--mi-key-primary-bg`, `--mi-key-primary-fg`, `--mi-key-pressed-bg` |
| Key labels | `--mi-key-placeholder` (boxes), `--mi-key-placeholder-active` (the box the caret lands in) |
| More options | `--mi-key-variant-indicator` |
| Tabs, sheets | `--mi-tab-fg`, `--mi-tab-selected-bg`, `--mi-tab-selected-fg`, `--mi-sheet-bg`, `--mi-sheet-shadow` |
| Motion | `--mi-motion` (reduced-motion is respected automatically) |

Keep text at 4.5:1 contrast and boxes and indicators at 3:1; the default
tokens are checked in CI.

## Light and dark

`theme="auto"` (default) follows the operating system; `theme="light"` or
`theme="dark"` forces one. To follow your app's own theme switch, set the
attribute from your theme state, or define your own token values under your
theme selector.

## The "more options" indicator

Keys with extra options (hold, right-click, or Alt+↓) show a filled corner in
`--mi-key-variant-indicator`. Change the shape with
`data-variant-indicator="dot"` or `"bar"` on the element.

## Classes

Structural classes are public API and are listed in the spec (§10.2); for
example `.mi-field`, `.mi-key[data-kind="template"]`, `.mi-frac__bar`,
`.mi-fence__side--ghost`. State is exposed as attributes on the element:
`data-focused`, `data-readonly`, `data-disabled`, `data-form`
(`phone|tablet|desktop`), `data-keypad` (`open|closed`), `data-subject`.
