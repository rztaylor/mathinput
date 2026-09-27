/**
 * Operand absorption (spec §7.3): which nodes to the left of the caret a
 * fraction takes as its numerator.
 */
import type { Node, Row } from "../model/types.js";

function isOperandPart(node: Node): boolean {
  switch (node.t) {
    case "num": case "var": case "const": case "element":
    case "fence": case "root": case "recurring": case "over": case "vector":
    case "sup": case "sub": case "subsup":
      return true;
    case "sym": return node.v === "factorial" || node.v === "prime" || node.v === "degree" || node.v === "percent";
    default: return false;
  }
}

/** Index where the operand ending at `index` starts; equals `index` when there is none. */
export function operandStart(row: Row, index: number): number {
  let j = index;
  while (j > 0 && isOperandPart(row[j - 1] as Node)) j--;
  return j;
}

/** True when a run of nodes is a single operand that a script can attach to without brackets. */
export function isSingleOperand(nodes: Row): boolean {
  if (nodes.length === 1) return true;
  // A run of digits is one number.
  return nodes.every((n) => n.t === "num");
}
