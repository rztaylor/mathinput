/**
 * Uniform access to a template's child rows ("slots"), in navigation order.
 * Everything that walks the tree generically goes through here.
 */
import type { Node, Row, Template } from "./types.js";

export function isTemplate(node: Node): node is Template {
  switch (node.t) {
    case "frac": case "sup": case "sub": case "subsup": case "root": case "fence":
    case "vector": case "recurring": case "bigop": case "deriv": case "over":
      return true;
    default:
      return false;
  }
}

/** Child rows of a node in the order the caret visits them. Atoms have none. */
export function slotsOf(node: Node): Row[] {
  switch (node.t) {
    case "frac": return [node.num, node.den];
    case "deriv": return [node.num, node.den];
    case "sup": case "sub": case "fence": case "recurring": case "over": return [node.body];
    case "subsup": return [node.sub, node.sup];
    case "root": return node.index ? [node.index, node.body] : [node.body];
    case "vector": return node.cells;
    case "bigop": return [node.lower, node.upper, node.body];
    default: return [];
  }
}

/** Replace the row at `slot` (same indexing as `slotsOf`). Used by the editor. */
export function setSlot(node: Template, slot: number, row: Row): void {
  switch (node.t) {
    case "frac": case "deriv": if (slot === 0) node.num = row; else node.den = row; return;
    case "sup": case "sub": case "fence": case "recurring": case "over": node.body = row; return;
    case "subsup": if (slot === 0) node.sub = row; else node.sup = row; return;
    case "root":
      if (node.index && slot === 0) node.index = row; else node.body = row;
      return;
    case "vector": node.cells[slot] = row; return;
    case "bigop": if (slot === 0) node.lower = row; else if (slot === 1) node.upper = row; else node.body = row; return;
  }
}

/**
 * Slots that may legitimately stay empty: they are not placeholders and are
 * omitted from output (integral limits, the numerator of d/dx).
 */
export function isOptionalSlot(node: Node, slot: number): boolean {
  if (node.t === "bigop") return slot < 2;
  if (node.t === "deriv") return slot === 0;
  return false;
}

/** Visit every node depth-first. Return false from `fn` to skip a subtree. */
export function walk(row: Row, fn: (node: Node, parent: Row, index: number) => boolean | void): void {
  row.forEach((node, index) => {
    if (fn(node, row, index) === false) return;
    for (const child of slotsOf(node)) walk(child, fn);
  });
}

/** True if any required slot anywhere in the row is empty. */
export function hasPlaceholders(row: Row): boolean {
  let found = false;
  walk(row, (node) => {
    slotsOf(node).forEach((r, i) => {
      if (r.length === 0 && !isOptionalSlot(node, i)) found = true;
    });
    return !found;
  });
  return found;
}

/** True if any fence still has a ghost side (spec §7.4). */
export function hasUnbalancedBrackets(row: Row): boolean {
  let found = false;
  walk(row, (node) => {
    if (node.t === "fence" && (node.openGhost || node.closeGhost)) found = true;
    return !found;
  });
  return found;
}
