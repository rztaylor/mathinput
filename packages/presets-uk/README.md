# @mathinput/presets-uk

Optional keypads for [MathInput](https://mathinput.rztaylor.uk) trimmed to the
English curricula: GCSE Foundation, GCSE Higher and A-level. Built only on the
public keypad API of `@mathinput/core` (topic tags and patches).

## Install

```bash
npm install @mathinput/presets-uk
```

## Example

```js
import { ukKeypadPatch, ukKeypad } from "@mathinput/presets-uk";

const el = document.querySelector("math-input");
el.keypadLayout = ukKeypadPatch("gcse-higher");
// Combine with your own changes:
el.keypadLayout = { ...ukKeypadPatch("gcse-foundation"), removeTabs: ["letters"] };

// The full trimmed layout, e.g. to list its key ids:
ukKeypad("maths", "a-level");
```

Levels: `gcse-foundation`, `gcse-higher`, `a-level`. In React, pass the
patch as the `keypadLayout` prop. See the
[keypad configuration guide](https://mathinput.rztaylor.uk/docs/).

## Links

- Website, documentation and demo: https://mathinput.rztaylor.uk
- Source and issues: https://github.com/rztaylor/mathinput

MIT licence. Pre-1.0: minor versions may contain breaking changes, each listed
in the changelog.
