/** Side-effect entry: `import "@mathinput/element/define"` registers <math-input>. */
import type { MathInputElement } from "./math-input.js";
import { defineMathInput } from "./register.js";

defineMathInput();

declare global {
  interface HTMLElementTagNameMap {
    "math-input": MathInputElement;
  }
}
