# Output formats

Every event (`input`, `change`, `submit`) carries a value with:

| Field | Example (`x = ½ or x = 3`) | Use |
|---|---|---|
| `doc` | `{ version: 1, subject: "maths", root: [...] }` | Store it; set it back with `el.value = doc`. The only lossless format. |
| `latex` | `x=\frac{1}{2}\text{ or }x=3` | Render with KaTeX/MathJax; send to an LLM. Chemistry: `\ce{…}` (mhchem). |
| `text` | `x = 1/2 or x = 3` | Logs, search, a second reading for an LLM. |
| `spoken` | `x equals 1 over 2 or x equals 3` | Screen readers (already used by the element). |
| `mathml` | `<math …>…</math>` | Native rendering, assistive technology. |
| `isEmpty`, `hasPlaceholders`, `hasUnbalancedBrackets` | | Decide whether to accept the answer. |

Formats are computed when you first read them.

## Sending answers to an LLM

Wrap the LaTeX in `$…$` (the host adds delimiters; MathInput never does):

```js
const v = event.detail;
const prompt = `Student answer: $${v.latex}$ (read as: ${v.text})`;
```

Empty boxes appear as `\square` so the model can see something is missing,
and brackets the learner left open are closed in the output but reported in
`hasUnbalancedBrackets`.

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
