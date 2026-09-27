/** Undo/redo stacks of document snapshots (spec §7.2). */
import type { Position } from "./position.js";

export interface Snapshot {
  /** Serialised document. */
  doc: string;
  caret: Position;
  anchor: Position | null;
}

const LIMIT = 200;

export class History {
  private past: Snapshot[] = [];
  private future: Snapshot[] = [];

  /** Record the state before a change. `merge` folds it into the previous step (typing runs). */
  push(before: Snapshot, merge: boolean): void {
    this.future = [];
    if (merge && this.past.length) return;
    this.past.push(before);
    if (this.past.length > LIMIT) this.past.shift();
  }

  undo(current: Snapshot): Snapshot | null {
    const prev = this.past.pop();
    if (!prev) return null;
    this.future.push(current);
    return prev;
  }

  redo(current: Snapshot): Snapshot | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(current);
    return next;
  }

  canUndo(): boolean { return this.past.length > 0; }
  canRedo(): boolean { return this.future.length > 0; }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
