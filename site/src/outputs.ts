import type { MathInputValue } from "@mathinput/core";
import type { MathInputElement } from "@mathinput/element";

/** Keep a LaTeX / Text / Spoken list in sync with a field. */
export function bindOutputs(input: MathInputElement, dds: HTMLElement[]): void {
  const show = (v: MathInputValue) => {
    const [latex, text, spoken] = dds;
    if (latex) latex.textContent = v.latex || "—";
    if (text) text.textContent = v.text || "—";
    if (spoken) spoken.textContent = v.spoken;
  };
  input.addEventListener("input", (e) => show(e.detail));
  show(input.getValue());
}
