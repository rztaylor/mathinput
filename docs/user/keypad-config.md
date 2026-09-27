# Configuring the keypad

## Attributes

| Attribute | Values | Effect |
|---|---|---|
| `subject` | `maths` · `chemistry` · `physics` | Picks the preset and the typing rules. |
| `level` | `gcse-foundation` · `gcse-higher` (default) · `a-level` | Hides keys beyond the level (no logs or calculus at GCSE). |
| `keypad` | `auto` (default) · `always` · `never` · `collapsed` | `auto` opens on touch devices and sits behind a toggle with a mouse. |
| `keypad-container` | element id | Renders the keypad inside your own element, for a bottom sheet or side panel. |
| `submit-on-enter` | boolean | Enter and the ↵ key fire `submit`. Without it the ↵ key becomes "next box". |

`el.keypadOpen = true` opens it from code; the `keypad-toggle` event reports
changes.

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

Or replace it entirely with a full `KeypadLayout` (`{ numberPad, tabs,
navigation }`); start from `keypadPreset(subject, level)` in
`@mathinput/core`.

Key ids are stable. List them with:

```js
import { keypadPreset } from "@mathinput/core";
const l = keypadPreset("maths", "a-level");
console.log([l.numberPad, ...l.tabs].flatMap((t) => t.keys.map((k) => k.id)));
```

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
