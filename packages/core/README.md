# @mathinput/core

The engine behind [MathInput](https://mathinput.rztaylor.uk): the expression
tree, a headless editor, serialisers (LaTeX with mhchem, linear text, spoken
English, MathML), LaTeX and text parsers, and keypad definitions. No DOM and
no runtime dependencies, so it runs in browsers, Node and workers.

Most apps want [`@mathinput/element`](https://www.npmjs.com/package/@mathinput/element)
(the `<math-input>` field) and use core for storage and conversion.

## Install

```bash
npm install @mathinput/core
```

## Example

```js
import { fromLatex, toLatex, toText, toSpoken, toMathML } from "@mathinput/core";

const doc = fromLatex("\\frac{x+1}{2}", "maths"); // a MathDocument tree
toLatex(doc);  // \frac{x+1}{2}
toText(doc);   // linear text
toSpoken(doc); // spoken English
toMathML(doc); // MathML
```

Store the tree (`MathDocument`, plain JSON) as the source of truth; every
other format is derived from it. See the
[output formats guide](https://mathinput.rztaylor.uk/docs/).

## Links

- Website, documentation and demo: https://mathinput.rztaylor.uk
- Source and issues: https://github.com/rztaylor/mathinput

MIT licence. Pre-1.0: minor versions may contain breaking changes, each listed
in the changelog.
