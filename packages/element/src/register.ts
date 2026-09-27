import { MathInputElement } from "./math-input.js";

/** Register <math-input> (or a custom tag name) once. Safe to call repeatedly. */
export function defineMathInput(tagName = "math-input"): void {
  if (typeof customElements !== "undefined" && !customElements.get(tagName)) {
    customElements.define(tagName, class extends MathInputElement {});
  }
}
