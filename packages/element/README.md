# @mathinput/element

The `<math-input>` custom element: a keypad-first field for maths, chemistry
and physics expressions, with no input language to learn. It works in any
framework, or none, on phones, tablets and desktops. Each expression is
available as a lossless tree plus LaTeX, linear text, spoken text and MathML.

## Install

```bash
npm install @mathinput/element
```

## Example

```html
<script type="module">
  import "@mathinput/element/define";        // registers <math-input>
  import "@mathinput/element/mathinput.css"; // default styles
</script>

<math-input subject="maths" label="Expression" submit-on-enter></math-input>

<script type="module">
  const input = document.querySelector("math-input");
  input.addEventListener("submit", (e) => console.log(e.detail.latex, e.detail.text));
</script>
```

Tailwind v4 hosts can import `@mathinput/element/tailwind.css` instead. React
apps can use [`@mathinput/react`](https://www.npmjs.com/package/@mathinput/react).
Guides for the API, theming and keypad configuration are on the
[website](https://mathinput.rztaylor.uk/docs/).

## Links

- Website, documentation and demo: https://mathinput.rztaylor.uk
- Source and issues: https://github.com/rztaylor/mathinput

MIT licence. Pre-1.0: minor versions may contain breaking changes, each listed
in the changelog.
