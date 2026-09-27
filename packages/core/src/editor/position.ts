/**
 * Caret positions as paths from the root row (spec §7.1). Paths survive
 * cloning, so undo snapshots can store them directly.
 */
import type { Node, Row, Template } from "../model/types.js";
import { isTemplate, slotsOf } from "../model/slots.js";

/** One step down the tree: into slot `slot` of the node at `node` in the current row. */
export interface Step { node: number; slot: number }

export interface Position { path: Step[]; index: number }

export interface ParentInfo {
  /** The row containing the template. */
  row: Row;
  path: Step[];
  /** Index of the template in `row`. */
  nodeIndex: number;
  node: Template;
  /** Which slot of `node` the child row is. */
  slot: number;
}

export function rowAt(root: Row, path: readonly Step[]): Row {
  let row = root;
  for (const step of path) {
    const node = row[step.node];
    const next = node && slotsOf(node)[step.slot];
    if (!next) throw new Error(`Invalid path at step ${JSON.stringify(step)}`);
    row = next;
  }
  return row;
}

export function parentOf(root: Row, path: readonly Step[]): ParentInfo | null {
  const last = path[path.length - 1];
  if (!last) return null;
  const ppath = path.slice(0, -1);
  const row = rowAt(root, ppath);
  const node = row[last.node] as Node;
  if (!isTemplate(node)) throw new Error("Path step does not point at a template");
  return { row, path: ppath, nodeIndex: last.node, node, slot: last.slot };
}

export function samePath(a: readonly Step[], b: readonly Step[]): boolean {
  return a.length === b.length && a.every((s, i) => s.node === b[i]?.node && s.slot === b[i]?.slot);
}

export function samePosition(a: Position, b: Position): boolean {
  return a.index === b.index && samePath(a.path, b.path);
}

export function child(path: readonly Step[], node: number, slot: number): Step[] {
  return [...path, { node, slot }];
}

export function clonePosition(p: Position): Position {
  return { path: p.path.map((s) => ({ ...s })), index: p.index };
}

/** Is the position valid for this tree? */
export function isValidPosition(root: Row, p: Position): boolean {
  try {
    const row = rowAt(root, p.path);
    return p.index >= 0 && p.index <= row.length;
  } catch {
    return false;
  }
}

/** All caret positions at the start of empty slots, in document order. */
export function emptySlotPositions(root: Row): Position[] {
  const out: Position[] = [];
  const visit = (row: Row, path: Step[]) => {
    row.forEach((node, i) => {
      slotsOf(node).forEach((r, s) => {
        const p = child(path, i, s);
        if (r.length === 0) out.push({ path: p, index: 0 });
        visit(r, p);
      });
    });
  };
  visit(root, []);
  return out;
}

/**
 * Document order comparison: negative if a comes before b. Positions are
 * compared along their paths; a position inside a template sorts after the
 * position just before that template and before the position just after it.
 */
export function comparePositions(a: Position, b: Position): number {
  const n = Math.min(a.path.length, b.path.length);
  for (let k = 0; k < n; k++) {
    const sa = a.path[k] as Step, sb = b.path[k] as Step;
    if (sa.node !== sb.node) return sa.node - sb.node;
    if (sa.slot !== sb.slot) return sa.slot - sb.slot;
  }
  if (a.path.length === b.path.length) return a.index - b.index;
  // One is deeper. Compare the shallower index with the deeper one's node index.
  if (a.path.length < b.path.length) {
    const node = (b.path[n] as Step).node;
    return a.index <= node ? -1 : 1;
  }
  const node = (a.path[n] as Step).node;
  return b.index <= node ? 1 : -1;
}
