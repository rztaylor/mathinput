/**
 * Chemistry input rules (spec §7.6): element merging, automatic subscripts,
 * electrons.
 */
import type { Node } from "../model/types.js";
import { ELEMENT_SET } from "../model/vocabulary.js";

/** A digit typed after this node becomes (or extends) a subscript. */
export function digitBecomesSubscript(prev: Node | undefined): "new" | "extend" | false {
  if (!prev) return false;
  if (prev.t === "sub" && prev.body.length > 0 && prev.body.every((n) => n.t === "num")) return "extend";
  if (prev.t === "element" && prev.v !== "e") return "new";
  if (prev.t === "fence" && !prev.closeGhost) return "new";
  return false;
}

/** A lower-case letter typed after a one-letter element that forms a real element. */
export function mergedElement(prev: Node | undefined, letter: string): string | null {
  if (prev?.t !== "element" || prev.v.length !== 1 || !/^[a-z]$/.test(letter)) return null;
  const candidate = prev.v + letter;
  return ELEMENT_SET.has(candidate) ? candidate : null;
}

export function isElementLetter(letter: string): boolean {
  return ELEMENT_SET.has(letter);
}
