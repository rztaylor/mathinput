# Output formats

Every event (`input`, `change`, `submit`) carries a value with:

| Field | Example (`x = ½ or x = 3`) | Use |
|---|---|---|
| `doc` | `{ version: 1, subject: "maths", root: [...] }` | Store it; set it back with `el.value = doc`. The only lossless format. |
| `latex` | `x=\frac{1}{2}\text{ or }x=3` | Render with KaTeX or MathJax, put in documents, exchange with other tools. Chemistry: `\ce{…}` (mhchem). |
| `text` | `x = 1/2 or x = 3` | Plain storage, search, logs, input to tools that take linear syntax. |
| `spoken` | `x equals 1 over 2 or x equals 3` | Screen readers and voice output (already used by the element). |
| `mathml` | `<math …>…</math>` | Native browser rendering, assistive technology, office documents. |
| `isEmpty`, `hasPlaceholders`, `hasUnbalancedBrackets` | | Decide whether the expression is complete. |

Formats are computed when you first read them. Empty boxes appear as
`\square` in LaTeX and `?` in text, and brackets left open are closed in the
output but reported in `hasUnbalancedBrackets`.

## Recipes

**Store and restore.** Keep `doc`; it is the only lossless format.

```js
save(JSON.stringify(event.detail.doc));
el.value = JSON.parse(saved);
```

**Render somewhere else.** Wrap `latex` in your renderer's delimiters
(MathInput never adds them). KaTeX needs the `mhchem` extension for
chemistry.

```js
katex.render(event.detail.latex, target);
```

**Show it read-only.** A `readonly` field renders any stored expression and
reads it out to screen readers: `<math-input readonly latex="…">`.

**Search or index.** Use `text`, which is stable and readable:
`x = 1/2 or x = 3`.

**Accessibility.** Use `spoken` for a label or live region, or `mathml`
where assistive technology reads MathML.

**Language models.** Send LaTeX in `$…$`, optionally with the text as a
second reading:

```js
const v = event.detail;
const prompt = `Expression: $${v.latex}$ (read as: ${v.text})`;
```

## Reading formats back

`@mathinput/core` parses its own output and common variants:

```js
import { fromLatex, fromText } from "@mathinput/core";
el.value = fromLatex("\\frac{x+1}{2}", "maths");
el.value = fromText("Mg + 2HCl -> MgCl2 + H2", "chemistry");
```

The `latex` attribute does the same for an initial value. Unsupported LaTeX
raises `ParseError` (or a `parse-error` event from the element).

## Without the element

All formats are pure functions in `@mathinput/core`, usable on a server:
`toLatex(doc)`, `toText(doc)`, `toSpoken(doc)`, `toMathML(doc)`.
