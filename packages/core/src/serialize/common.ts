/** Helpers shared by the serialisers. */
import type { Node, Row } from "../model/types.js";
import { isOptionalSlot } from "../model/slots.js";

/** Nodes after which a script has nothing to attach to. */
export function isBaseless(prev: Node | undefined): boolean {
  return prev === undefined || prev.t === "op" || prev.t === "rel" || prev.t === "text" || prev.t === "sym" && prev.v === "comma";
}

/** An operator is unary when nothing it could operate on precedes it. */
export function isUnary(row: Row, i: number): boolean {
  const prev = row[i - 1];
  return prev === undefined || prev.t === "op" || prev.t === "rel" || prev.t === "text" || (prev.t === "sym" && prev.v === "comma");
}

export function isAllDigits(row: Row): boolean {
  return row.length > 0 && row.every((n) => n.t === "num");
}

export function digits(row: Row): string {
  return row.map((n) => (n.t === "num" ? n.v : "")).join("");
}

/** A fraction whose numerator and denominator are plain whole numbers. */
export function isNumericFraction(node: Node | undefined): boolean {
  return node?.t === "frac" && isAllDigits(node.num) && isAllDigits(node.den);
}

/**
 * Mixed number (spec §6.1): the fraction at `i` directly follows a whole
 * number written as adjacent digits, as in 1½.
 */
export function isMixedFraction(row: Row, i: number): boolean {
  if (!isNumericFraction(row[i])) return false;
  let j = i - 1;
  while (j >= 0 && row[j]?.t === "num") {
    if ((row[j] as { v: string }).v === ".") return false;
    j--;
  }
  return j < i - 1;
}

/** Content that makes brackets grow in rendered LaTeX. */
export function isTall(row: Row): boolean {
  return row.some((n) => n.t === "frac" || n.t === "deriv" || n.t === "root" || n.t === "bigop" || n.t === "vector");
}

export { isOptionalSlot };

export type PlaceholderMode = "square" | "empty" | "throw";

export class PlaceholderError extends Error {
  constructor() {
    super("The expression has an empty box");
    this.name = "PlaceholderError";
  }
}
