/**
 * The value bundle carried by every event (spec §4.2). Formats are computed
 * lazily and cached, so building a value on every keystroke is cheap.
 */
import type { MathDocument } from "./model/types.js";
import { hasPlaceholders, hasUnbalancedBrackets } from "./model/slots.js";
import { cloneDocument } from "./model/validate.js";
import { toLatex } from "./serialize/latex.js";
import { toMathML } from "./serialize/mathml.js";
import { toSpoken } from "./serialize/spoken.js";
import { toText } from "./serialize/text.js";

export interface MathInputValue {
  readonly doc: MathDocument;
  readonly latex: string;
  readonly text: string;
  readonly spoken: string;
  readonly mathml: string;
  readonly isEmpty: boolean;
  readonly hasPlaceholders: boolean;
  readonly hasUnbalancedBrackets: boolean;
}

export function createValue(document: MathDocument): MathInputValue {
  const doc = cloneDocument(document);
  const cache = new Map<string, string>();
  const lazy = (key: string, make: () => string) => {
    let v = cache.get(key);
    if (v === undefined) { v = make(); cache.set(key, v); }
    return v;
  };
  return {
    doc,
    get latex() { return lazy("latex", () => toLatex(doc)); },
    get text() { return lazy("text", () => toText(doc)); },
    get spoken() { return lazy("spoken", () => toSpoken(doc)); },
    get mathml() { return lazy("mathml", () => toMathML(doc)); },
    isEmpty: doc.root.length === 0,
    hasPlaceholders: hasPlaceholders(doc.root),
    hasUnbalancedBrackets: hasUnbalancedBrackets(doc.root),
  };
}
