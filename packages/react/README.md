# @mathinput/react

React wrapper for the [MathInput](https://mathinput.rztaylor.uk)
`<math-input>` element: typed props, controlled or uncontrolled values,
event callbacks and a ref to the element. Works with React 18 and 19.

## Install

```bash
npm install @mathinput/react @mathinput/element
```

## Example

```tsx
import { MathInput } from "@mathinput/react";
import "@mathinput/element/mathinput.css";

export function EquationField() {
  return (
    <MathInput
      subject="chemistry"
      label="Balanced equation"
      submitOnEnter
      onSubmit={(v) => console.log(v.latex, v.doc)}
    />
  );
}
```

Pass `value` and `onInput` for a controlled field. See the
[getting started guide](https://mathinput.rztaylor.uk/docs/).

## Links

- Website, documentation and demo: https://mathinput.rztaylor.uk
- Source and issues: https://github.com/rztaylor/mathinput

MIT licence. Pre-1.0: minor versions may contain breaking changes, each listed
in the changelog.
