# API reference

## Attributes

| Attribute | Values | Default | Meaning |
|---|---|---|---|
| `subject` | `maths`, `chemistry`, `physics` | `maths` | Typing rules, keypad and output style. |
| `latex` | LaTeX | | Initial content. Unsupported LaTeX fires `parse-error`. |
| `label` | text | | Accessible name (or use `aria-label` / `aria-labelledby`). |
| `placeholder` | text | `Enter an expression` | Shown when empty. |
| `keypad` | `auto`, `always`, `never`, `collapsed` | `auto` | `auto`: open on touch devices, behind a toggle with a mouse. |
| `keypad-container` | element id | | Render the keypad inside another element. |
| `submit-on-enter` | boolean | off | Enter and the ↵ key fire `submit`. |
| `readonly` | boolean | off | Display only. |
| `disabled` | boolean | off | |
| `autoreplace` | `false` to turn off | on | Keyboard shortcuts such as typing `sqrt` or `pi`. |
| `theme` | `auto`, `light`, `dark` | `auto` | Built-in colour scheme. |
| `math-font` | font family | STIX Two Text | Font for the expression. |

## Properties

| Property | Type | |
|---|---|---|
| `value` | `MathDocument` | The expression tree. Setting it replaces the content and clears undo. |
| `latex` | `string` | Current LaTeX; setting it parses LaTeX. |
| `subject`, `readOnly`, `disabled` | | Mirror the attributes. |
| `keypadLayout` | `KeypadLayout \| KeypadPatch` | Replace or trim the keypad; see [Keypad configuration](keypad-config.md). |
| `keypadOpen` | `boolean` | Open or close the keypad. |
| `editor` | `Editor` | The headless editor, for advanced use. |

## Methods

`focus()`, `blur()`, `clear()`, `undo()`, `redo()`, `selectAll()`,
`commit()` (fires `change`), `getValue()`, `setValue(doc)`,
`insert(nodeOrNodes)`, `execute(command)` where `command` is one of
`moveLeft`, `moveRight`, `moveUp`, `moveDown`, `moveHome`, `moveEnd`,
`moveToNextPlaceholder`, `moveToPreviousPlaceholder`, `exitTemplate`,
`deleteBackward`, `deleteForward`, `selectAll`, `clear`, `undo`, `redo`.

## Events

All events bubble and cross shadow roots.

| Event | `detail` | When |
|---|---|---|
| `input` | value | Every edit. |
| `change` | value | On leaving the field after edits, or `commit()`. |
| `submit` | value | Enter or ↵, with `submit-on-enter`. Not fired when empty. |
| `parse-error` | `{ source, input, message }` | Pasted text or the `latex` attribute could not be read. |
| `keypad-toggle` | `{ open }` | The keypad was opened or closed. |

The value is described in [Output formats](formats.md).

## Keyboard

| Keys | Action |
|---|---|
| `/` | Fraction (the number or term before the caret becomes the top) |
| `^` `_` | Power, subscript |
| `(` `)` `[` `]` | Brackets, one side at a time: type `(` before existing work and `)` after it |
| `\|` | Modulus |
| `<=` `>=` `!=` `->` `~` | ≤ ≥ ≠ → ≈ |
| `sqrt` `pi` `theta` `sin` … | Replaced as you type (turn off with `autoreplace="false"`) |
| Arrows, Home, End | Move; with Shift, select |
| Tab | Next empty box, then leave the field |
| Ctrl/⌘ + Z, Y, A, C, X, V | Undo, redo, select all, copy, cut, paste |

In chemistry, digits after an element become subscripts (`H2O`), and a
two-letter element is recognised as you type (`Cl`).

## Packages

| Package | Contents |
|---|---|
| `@mathinput/core` | Tree, headless editor, serialisers, parsers, keypad presets. No DOM; usable on a server. |
| `@mathinput/element` | `<math-input>`, keypad, `mathinput.css`, `tailwind.css`. |
| `@mathinput/react` | `<MathInput>` for React 18 and 19. |
| `@mathinput/presets-uk` | Optional keypads for UK GCSE Foundation, GCSE Higher and A-level. |
