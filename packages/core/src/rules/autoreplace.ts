/**
 * Keyboard auto-replace (spec §7.5): letters that spell a known word become
 * the matching atom or template. Longest match wins.
 */
import type { Node, Template } from "../model/types.js";
import { cst, fn, nroot, sqrt, sym, text, v } from "../model/builders.js";
import { GREEK } from "../model/vocabulary.js";

export type Replacement = { atom: Node } | { template: Template };

const table = new Map<string, () => Replacement>();
const atom = (make: () => Node) => () => ({ atom: make() });

for (const name of ["sin", "cos", "tan", "arcsin", "arccos", "arctan", "sec", "cosec", "cot", "ln", "log", "exp"] as const) {
  table.set(name, atom(() => fn(name)));
}
table.set("sqrt", () => ({ template: sqrt([]) }));
table.set("cbrt", () => ({ template: nroot("3", []) }));
table.set("pi", atom(() => cst("pi")));
table.set("inf", atom(() => cst("infinity")));
table.set("infinity", atom(() => cst("infinity")));
table.set("deg", atom(() => sym("degree")));
table.set("or", atom(() => text("or")));
table.set("and", atom(() => text("and")));
for (const [letter, name] of Object.entries(GREEK)) {
  if (name !== "pi") table.set(name, atom(() => v(letter)));
}

export const AUTOREPLACE_WORDS: readonly string[] = [...table.keys()];

export function lookupWord(word: string): Replacement | null {
  const make = table.get(word);
  return make ? make() : null;
}

/** Could `prefix` still grow into a longer word? */
export function isWordPrefix(prefix: string): boolean {
  for (const w of table.keys()) if (w.length > prefix.length && w.startsWith(prefix)) return true;
  return false;
}

/**
 * Longest word that is a suffix of `letters`, with its length, or null.
 * Words shorter than two letters never match.
 */
export function longestSuffixWord(letters: string): { word: string; replacement: Replacement } | null {
  for (let len = letters.length; len >= 2; len--) {
    const word = letters.slice(-len);
    const r = lookupWord(word);
    if (r) return { word, replacement: r };
  }
  return null;
}
