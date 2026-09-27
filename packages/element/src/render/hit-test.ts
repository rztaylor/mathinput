/**
 * Pointer position → caret position (spec §7.1): the nearest boundary in the
 * innermost row under the pointer.
 */
import type { Position } from "@mathinput/core";
import { parsePathKey } from "./renderer.js";

/** Children of a row element that stand for tree nodes, in order. */
function nodeChildren(row: HTMLElement): HTMLElement[] {
  return [...row.children].filter((c): c is HTMLElement => c instanceof HTMLElement && c.dataset.miIndex !== undefined);
}

/** Index in `row` nearest to the horizontal coordinate `x`. */
export function indexAt(row: HTMLElement, x: number): number {
  let index = 0;
  for (const child of nodeChildren(row)) {
    const r = child.getBoundingClientRect();
    if (x > r.left + r.width / 2) index = Number(child.dataset.miIndex) + 1;
  }
  return index;
}

/**
 * Position for a pointer event target and x coordinate inside `field`.
 * Falls back to the end of the root row.
 */
export function positionAt(field: HTMLElement, target: EventTarget | null, x: number): Position {
  const start = target instanceof Element ? target : null;
  const row = start?.closest<HTMLElement>("[data-mi-path]");
  if (row && field.contains(row)) {
    return { path: parsePathKey(row.dataset.miPath ?? ""), index: indexAt(row, x) };
  }
  const root = field.querySelector<HTMLElement>(".mi-row--root");
  if (!root) return { path: [], index: 0 };
  return { path: [], index: indexAt(root, x) };
}

/** Range of the token under the pointer for double-tap selection: a whole number, word or template. */
export function tokenRange(field: HTMLElement, target: EventTarget | null): { path: Position["path"]; start: number; end: number } | null {
  const el = target instanceof Element ? target.closest<HTMLElement>("[data-mi-index]") : null;
  const row = el?.parentElement?.closest<HTMLElement>("[data-mi-path]");
  if (!el || !row || !field.contains(row) || el.parentElement !== row) return null;
  const kids = nodeChildren(row);
  let start = kids.indexOf(el);
  let end = start + 1;
  const kind = el.dataset.kind;
  if (kind === "num" || kind === "var") {
    while (start > 0 && kids[start - 1]?.dataset.kind === kind) start--;
    while (end < kids.length && kids[end]?.dataset.kind === kind) end++;
  }
  const idx = (k: number) => Number(kids[k]?.dataset.miIndex ?? k);
  return { path: parsePathKey(row.dataset.miPath ?? ""), start: idx(start), end: idx(end - 1) + 1 };
}
