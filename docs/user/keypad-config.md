# Configuring the keypad

## Attributes

| Attribute | Values | Effect |
|---|---|---|
| `subject` | `maths` · `chemistry` · `physics` | Picks the preset and the typing rules. |
| `keypad` | `auto` (default) · `always` · `never` · `collapsed` | `auto` opens on touch devices and sits behind a toggle with a mouse. |
| `keypad-container` | element id | Renders the keypad inside your own element, for a bottom sheet or side panel. |
| `submit-on-enter` | boolean | Enter and the ↵ key fire `submit`. Without it the ↵ key becomes "next box". |

`el.keypadOpen = true` opens it from code; the `keypad-toggle` event reports
changes.

Each subject's keypad offers every key it has. To fit it to a course, remove
keys by topic or by id.

## Changing keys

Patch the preset:

```js
el.keypadLayout = {
  removeTabs: ["letters"],
  removeKeys: ["letter-t", "const-pi"],
  addKeys: {
    algebra: [{ id: "k", label: { text: "k" }, aria: "k", action: { type: "k" } }],
  },
};
```

A patch always starts from the preset for the field's subject. Removed keys
also disappear from long-press menus, and a tab left empty is dropped.

Or replace it entirely with a full `KeypadLayout` (`{ numberPad, tabs,
navigation }`); start from `keypadPreset(subject)` in `@mathinput/core`.

Key ids are stable. List them with:

```js
import { keypadPreset } from "@mathinput/core";
const l = keypadPreset("maths");
console.log([l.numberPad, ...l.tabs].flatMap((t) => t.keys.map((k) => k.id)));
```

## Removing topics

Keys for more advanced topics carry tags. Remove a whole topic with
`removeTags`:

```js
el.keypadLayout = { removeTags: ["calculus", "logarithms"] };
```

| Tag | Keys |
|---|---|
| `column-vectors` | column vector |
| `logarithms` | `ln`, `log`, log to a base (the chemistry `log` key for pH is untagged) |
| `exponentials` | `e`, eˣ |
| `infinity` | ∞ |
| `calculus` | d/dx (with dy/dx), ∫ |
| `series` | Σ |
| `vector-notation` | vector arrow, hat |
| `reciprocal-trig` | `sec`, `cosec`, `cot` |
| `proof` | `∴`, `≡` |

Your own keys can carry tags too (`tags: ["my-topic"]`).

## Curriculum presets

Ready-made key sets for a curriculum are optional packages built on the
same patches. `@mathinput/presets-uk` covers GCSE Foundation, GCSE Higher
and A-level in England:

```bash
npm install @mathinput/presets-uk
```

```js
import { ukKeypadPatch } from "@mathinput/presets-uk";

el.keypadLayout = ukKeypadPatch("gcse-higher");
// Combine with your own changes:
el.keypadLayout = { ...ukKeypadPatch("gcse-foundation"), removeTabs: ["letters"] };
```

| Level | Hides |
|---|---|
| `gcse-foundation` | everything `gcse-higher` hides, plus column vectors |
| `gcse-higher` | logarithms, `e` and eˣ, ∞, calculus, Σ, vector arrows and hats, `sec cosec cot`, `∴`, `≡` |
| `a-level` | nothing |

`ukKeypad(subject, level)` returns the full trimmed layout, for example to
list its key ids. In React, pass the patch as `keypadLayout`.

## Key definitions

```ts
interface Key {
  id: string;
  aria: string;                      // accessible name, e.g. "fraction"
  label: { text: string }            // plain text
       | { tree: Row, active?: Position }  // a mini expression, drawn like the field
       | { icon: "left" | "right" | "backspace" | "enter" | "shift" | "keypad" | "table" }
       | { html: string };           // your own markup (you are responsible for it)
  action: { type: string }           // as if typed on a keyboard (subject rules apply)
        | { insert: Node | Node[] }
        | { template: Template, absorb?: boolean, prefix?: Node[] }
        | { command: CommandName }   // e.g. "moveLeft", "undo"
        | { bracket: "open" | "close" | "wrap", char: "(" | "[" | "{" | "|" }
        | { ui: "submit" | "shift" | "periodic-table" | "keypad-toggle" };
  variants?: Key[];                  // shown on long press; the key gets the indicator
  kind?: "digit" | "operator" | "template" | "letter" | "function" | "nav" | "primary" | "word";
}
```

Use `tree` labels for template keys so the key shows exactly what it
inserts, with `active` marking the box the caret will land in. The tree
builders in `@mathinput/core` (`sup`, `frac`, `sqrt`, …) make this short:

```js
import { frac, sup } from "@mathinput/core";
const cubed = { id: "cubed", aria: "cubed", label: { tree: [sup("3")] }, action: { template: sup("3") } };
```
