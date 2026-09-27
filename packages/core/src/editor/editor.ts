/**
 * The headless editor (spec §7): a document, a caret, an optional selection,
 * and the commands that change them. No DOM. The element drives it; tests
 * exercise it directly.
 */
import type { FenceChar, MathDocument, Node, Row, Subject, Template, TemplateType } from "../model/types.js";
import { el, fence, frac, num, op, rel, st, sub, sym, v } from "../model/builders.js";
import { isOptionalSlot, isTemplate, setSlot, slotsOf } from "../model/slots.js";
import { cloneDocument, cloneRow } from "../model/validate.js";
import { isVariableLetter } from "../model/vocabulary.js";
import { isSingleOperand, operandStart } from "../rules/absorb.js";
import { isWordPrefix, longestSuffixWord, lookupWord, type Replacement } from "../rules/autoreplace.js";
import { digitBecomesSubscript, isElementLetter, mergedElement } from "../rules/chemistry.js";
import { History, type Snapshot } from "./history.js";
import {
  child, clonePosition, comparePositions, emptySlotPositions, isValidPosition, parentOf, rowAt, samePath,
  type Position, type Step,
} from "./position.js";

export interface EditorOptions {
  /** Hardware-keyboard auto-replace (spec §7.5). Default true; never applies to chemistry. */
  autoreplace?: boolean;
}

export interface Selection { path: Step[]; start: number; end: number }

export interface ChangeEvent {
  /** True when the document changed, false for caret or selection moves only. */
  docChanged: boolean;
}

export type CommandName =
  | "moveLeft" | "moveRight" | "moveUp" | "moveDown" | "moveHome" | "moveEnd"
  | "moveToNextPlaceholder" | "moveToPreviousPlaceholder" | "exitTemplate"
  | "extendLeft" | "extendRight" | "extendHome" | "extendEnd"
  | "deleteBackward" | "deleteForward" | "selectAll" | "clear" | "undo" | "redo";

const CLOSE_FOR: Record<string, FenceChar> = { "(": ")", "[": "]", "{": "}", "|": "|" };
const OPEN_FOR: Record<string, FenceChar> = { ")": "(", "]": "[", "}": "{", "|": "|" };

/** Which slot a selection or absorbed operand goes into when a template wraps it. */
function wrapSlot(node: Template): number {
  switch (node.t) {
    case "root": return node.index ? 1 : 0;
    case "bigop": return 2;
    default: return 0;
  }
}

export class Editor {
  private doc: MathDocument;
  private _caret: Position = { path: [], index: 0 };
  private _anchor: Position | null = null;
  private readonly history = new History();
  private readonly listeners = new Set<(e: ChangeEvent) => void>();
  private readonly options: Required<EditorOptions>;
  /** The last auto-replaced word, so it can grow into a longer one (cos → cosec). */
  private lastWord: { word: string; path: Step[]; index: number } | null = null;
  /** Chemistry: a space was typed, so the next digit is a coefficient. */
  private chemBreak = false;
  /** Group consecutive typing into one undo step. */
  private typingRun = false;

  constructor(document?: MathDocument, options: EditorOptions = {}) {
    this.doc = document ? cloneDocument(document) : { version: 1, subject: "maths", root: [] };
    this._caret = { path: [], index: this.doc.root.length };
    this.options = { autoreplace: options.autoreplace ?? true };
  }

  // ------------------------------------------------------------ state

  /** The live document. Do not mutate; use `getDocument()` for a copy. */
  get document(): Readonly<MathDocument> { return this.doc; }
  get subject(): Subject { return this.doc.subject; }
  get caret(): Position { return clonePosition(this._caret); }
  get anchor(): Position | null { return this._anchor ? clonePosition(this._anchor) : null; }

  getDocument(): MathDocument { return cloneDocument(this.doc); }

  /** Replace the content. Resets undo history. The caret goes to the end. */
  setDocument(document: MathDocument): void {
    this.doc = cloneDocument(document);
    this._caret = { path: [], index: this.doc.root.length };
    this._anchor = null;
    this.history.clear();
    this.resetTransient();
    this.emit(true);
  }

  setSubject(subject: Subject): void {
    this.doc.subject = subject;
    this.emit(true);
  }

  /** The selected range, or null when the selection is collapsed. */
  selection(): Selection | null {
    const a = this._anchor, c = this._caret;
    if (!a || !samePath(a.path, c.path) || a.index === c.index) return null;
    return { path: c.path.map((s) => ({ ...s })), start: Math.min(a.index, c.index), end: Math.max(a.index, c.index) };
  }

  onChange(listener: (e: ChangeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Place the caret, collapsing any selection. Invalid positions are ignored. */
  setCaret(position: Position, anchor: Position | null = null): void {
    if (!isValidPosition(this.doc.root, position)) return;
    this._caret = clonePosition(position);
    this._anchor = anchor && isValidPosition(this.doc.root, anchor) && samePath(anchor.path, position.path) ? clonePosition(anchor) : null;
    this.normaliseCaret();
    this.resetTransient();
    this.emit(false);
  }

  canUndo(): boolean { return this.history.canUndo(); }
  canRedo(): boolean { return this.history.canRedo(); }

  execute(command: CommandName): boolean {
    return (this[command] as () => boolean).call(this);
  }

  // ---------------------------------------------------------- helpers

  private row(): Row { return rowAt(this.doc.root, this._caret.path); }

  private emit(docChanged: boolean): void {
    for (const l of this.listeners) l({ docChanged });
  }

  private snapshot(): Snapshot {
    return { doc: JSON.stringify(this.doc), caret: clonePosition(this._caret), anchor: this._anchor ? clonePosition(this._anchor) : null };
  }

  private restore(s: Snapshot): void {
    this.doc = JSON.parse(s.doc) as MathDocument;
    this._caret = clonePosition(s.caret);
    this._anchor = s.anchor ? clonePosition(s.anchor) : null;
  }

  private resetTransient(): void {
    this.lastWord = null;
    this.chemBreak = false;
    this.typingRun = false;
  }

  /**
   * Run an editing command: snapshot, mutate, record history if the
   * document changed, keep the caret valid, notify.
   */
  private edit(fn: () => void, opts: { typing?: boolean; keepWord?: boolean } = {}): boolean {
    const before = this.snapshot();
    fn();
    // An edit always consumes the selection.
    this._anchor = null;
    repairGhosts(this.doc.root);
    this.normaliseCaret();
    const changed = JSON.stringify(this.doc) !== before.doc;
    if (changed) {
      const merge = !!opts.typing && this.typingRun;
      this.history.push(before, merge);
      this.typingRun = !!opts.typing;
    }
    if (!opts.keepWord) this.lastWord = null;
    if (changed || !samePositionOrNull(before, this)) this.emit(changed);
    return changed;
  }

  /** Run a movement: never changes the document. */
  private move(fn: () => boolean): boolean {
    const beforeCaret = clonePosition(this._caret);
    const beforeAnchor = this._anchor;
    const moved = fn();
    if (this._anchor && !samePath(this._anchor.path, this._caret.path)) this._anchor = null;
    this.normaliseCaret();
    this.resetTransient();
    const changed = comparePositions(beforeCaret, this._caret) !== 0 || !samePath(beforeCaret.path, this._caret.path) || beforeAnchor !== this._anchor;
    if (changed) this.emit(false);
    return moved;
  }

  /**
   * Keep the caret out of places that cannot hold content: never after a
   * fence whose close is a ghost, never before a fence whose open is a ghost
   * (spec §3.3). Such positions move into the fence body.
   */
  private normaliseCaret(): void {
    for (let guard = 0; guard < 64; guard++) {
      const row = this.row();
      const i = this._caret.index;
      const before = row[i - 1];
      if (before?.t === "fence" && before.closeGhost && i === row.length) {
        this._caret = { path: child(this._caret.path, i - 1, 0), index: before.body.length };
        this._anchor = null;
        continue;
      }
      const after = row[i];
      if (after?.t === "fence" && after.openGhost && i === 0) {
        this._caret = { path: child(this._caret.path, 0, 0), index: 0 };
        this._anchor = null;
        continue;
      }
      break;
    }
  }

  /** Remove the selected nodes, leaving the caret where they were. Returns them. */
  private takeSelection(): Row | null {
    const sel = this.selection();
    this._anchor = null;
    if (!sel) return null;
    const row = rowAt(this.doc.root, sel.path);
    const taken = row.splice(sel.start, sel.end - sel.start);
    this._caret = { path: sel.path, index: sel.start };
    return taken;
  }

  private insertNodes(nodes: Row): void {
    const row = this.row();
    row.splice(this._caret.index, 0, ...nodes);
    this._caret.index += nodes.length;
  }

  /** Put the caret in the first empty required slot of the template at `index`, else after it. */
  private caretIntoTemplate(index: number): void {
    const node = this.row()[index] as Template;
    const slots = slotsOf(node);
    const allEmpty = slots.every((r) => r.length === 0);
    for (let s = 0; s < slots.length; s++) {
      const r = slots[s] as Row;
      if (r.length === 0 && (allEmpty || !isOptionalSlot(node, s))) {
        this._caret = { path: child(this._caret.path, index, s), index: 0 };
        return;
      }
    }
    this._caret = { path: this._caret.path, index: index + 1 };
  }

  // --------------------------------------------------------- insertion

  /** Insert one or more nodes at the caret, replacing the selection. */
  insert(nodes: Node | Row): boolean {
    const list = Array.isArray(nodes) ? cloneRow(nodes) : cloneRow([nodes]);
    if (list.length === 1 && isTemplate(list[0] as Node)) return this.insertTemplate(list[0] as Template);
    return this.edit(() => {
      this.takeSelection();
      this.insertNodes(list);
    });
  }

  insertAtom(node: Node): boolean {
    return this.edit(() => {
      this.takeSelection();
      this.insertNodes([JSON.parse(JSON.stringify(node)) as Node]);
    });
  }

  /**
   * Insert a template (spec §7.2). A selection is wrapped by it. With
   * `absorb`, the operand before the caret is wrapped instead (§7.3).
   * Scripts treat the wrapped nodes as their base rather than their body.
   */
  insertTemplate(template: Template, opts: { absorb?: boolean; prefix?: Row } = {}): boolean {
    const node = JSON.parse(JSON.stringify(template)) as Template;
    return this.edit(() => {
      let wrapped = this.takeSelection();
      if (opts.prefix?.length) {
        this.insertNodes(cloneRow(opts.prefix));
        wrapped = null;
      }
      if (!wrapped && opts.absorb) {
        const row = this.row();
        const j = operandStart(row, this._caret.index);
        if (j < this._caret.index) {
          wrapped = row.splice(j, this._caret.index - j);
          this._caret.index = j;
        }
      }
      if (wrapped && wrapped.length && (node.t === "sup" || node.t === "sub" || node.t === "subsup")) {
        const base = isSingleOperand(wrapped) ? wrapped : [fence(wrapped)];
        this.insertNodes(base);
        wrapped = null;
      }
      if (wrapped && wrapped.length) {
        const s = wrapSlot(node);
        setSlot(node, s, [...wrapped, ...(slotsOf(node)[s] ?? [])]);
      }
      const index = this._caret.index;
      this.insertNodes([node]);
      this._caret.index = index;
      this.caretIntoTemplate(index);
    });
  }

  // ----------------------------------------------------------- typing

  /**
   * Type one character as from a hardware keyboard (spec §7.5), applying the
   * subject rules. Returns false for characters it does not handle.
   */
  type(ch: string): boolean {
    const chem = this.doc.subject === "chemistry";
    if (/^[0-9.]$/.test(ch)) return this.typeDigit(ch);
    if (/^[A-Za-z]$/.test(ch) || (isVariableLetter(ch) && ch.length === 1)) return this.typeLetter(ch);
    const prev = this.row()[this._caret.index - 1];
    const prevRel = prev?.t === "rel" && !this.selection() ? prev : null;
    const replacePrev = (node: Node) => this.edit(() => {
      this.row().splice(this._caret.index - 1, 1, node);
    });
    switch (ch) {
      case " ":
        if (chem) { this.chemBreak = true; return true; }
        return false;
      case "+": return this.insertAtom(op("plus"));
      case "-": return this.insertAtom(op("minus"));
      case "*": return this.insertAtom(op("times"));
      case "/": return this.insertTemplate(frac([], []), { absorb: true });
      case "^": return this.insertTemplate({ t: "sup", body: [] });
      case "_": return this.insertTemplate(sub([]));
      case "(": case "[": case "{": return this.openBracket(ch);
      case ")": case "]": case "}": return this.closeBracket(ch);
      case "|": return this.wrapInBrackets("|");
      case "<": return this.insertAtom(rel("lt"));
      case ">":
        if (prev?.t === "op" && prev.v === "minus") return replacePrev(rel("to"));
        if (prevRel?.v === "le") return replacePrev(rel(chem ? "equilibrium" : "iff"));
        if (prevRel?.v === "eq") return replacePrev(rel("implies"));
        return this.insertAtom(rel("gt"));
      case "=":
        if (prevRel?.v === "lt") return replacePrev(rel("le"));
        if (prevRel?.v === "gt") return replacePrev(rel("ge"));
        if (prevRel?.v === "approx") return true;
        if (prev?.t === "sym" && prev.v === "factorial") return replacePrev(rel("neq"));
        return this.insertAtom(rel("eq"));
      case "~": return this.insertAtom(rel("approx"));
      case "!": return this.insertAtom(sym("factorial"));
      case ",": return this.insertAtom(sym("comma"));
      case "%": return this.insertAtom(sym("percent"));
      case "'": return this.insertAtom(sym("prime"));
      case ":": return this.insertAtom(rel("ratio"));
      default: return false;
    }
  }

  private typeDigit(d: string): boolean {
    const chem = this.doc.subject === "chemistry";
    const breakHere = this.chemBreak;
    this.chemBreak = false;
    return this.edit(() => {
      this.takeSelection();
      const row = this.row();
      const prev = row[this._caret.index - 1];
      const mode = chem && d !== "." && !breakHere ? digitBecomesSubscript(prev) : false;
      if (mode === "extend" && prev?.t === "sub") {
        prev.body.push(num(d as "0"));
      } else if (mode === "new") {
        this.insertNodes([sub(d)]);
      } else {
        this.insertNodes([num(d as "0")]);
      }
    }, { typing: true });
  }

  private typeLetter(ch: string): boolean {
    const chem = this.doc.subject === "chemistry";
    this.chemBreak = false;
    if (chem) {
      return this.edit(() => {
        this.takeSelection();
        const row = this.row();
        const prev = row[this._caret.index - 1];
        const merged = mergedElement(prev, ch);
        if (merged && prev?.t === "element") prev.v = merged;
        else if (/^[A-Z]$/.test(ch) && isElementLetter(ch)) this.insertNodes([el(ch)]);
        else if (ch === "e") this.insertNodes([el("e")]);
        else this.insertNodes([v(ch)]);
      }, { typing: true });
    }
    return this.edit(() => {
      this.takeSelection();
      this.insertNodes([v(ch)]);
      if (this.options.autoreplace) this.autoReplace();
    }, { typing: true, keepWord: true });
  }

  /** Apply auto-replace after a letter was inserted (spec §7.5). */
  private autoReplace(): void {
    const row = this.row();
    const end = this._caret.index;
    let letters = "";
    let j = end;
    while (j > 0) {
      const n = row[j - 1] as Node;
      if (n.t !== "var" || !/^[A-Za-z]$/.test(n.v)) break;
      letters = n.v + letters;
      j--;
    }
    // Growing the previous replacement: cos + ec → cosec, inf + inity → infinity.
    const lw = this.lastWord;
    if (lw && samePath(lw.path, this._caret.path) && lw.index === j - 1 && letters) {
      const grown = lw.word + letters;
      const r = lookupWord(grown);
      if (r) {
        this.applyReplacement(lw.index, end, r, grown);
        return;
      }
      if (!isWordPrefix(grown)) this.lastWord = null;
    } else {
      this.lastWord = null;
    }
    const match = longestSuffixWord(letters);
    if (match) this.applyReplacement(end - match.word.length, end, match.replacement, match.word);
  }

  private applyReplacement(from: number, to: number, r: Replacement, word: string): void {
    const row = this.row();
    row.splice(from, to - from);
    this._caret.index = from;
    if ("atom" in r) {
      this.insertNodes([r.atom]);
      this.lastWord = { word, path: this._caret.path.map((s) => ({ ...s })), index: from };
    } else {
      this.insertNodes([r.template]);
      this._caret.index = from;
      this.caretIntoTemplate(from);
      this.lastWord = null;
    }
  }

  /** Chemistry state symbol, e.g. from a keypad key. */
  insertState(state: "s" | "l" | "g" | "aq"): boolean {
    return this.insertAtom(st(state));
  }

  // ---------------------------------------------------------- brackets

  /** Single opening bracket (spec §7.4). */
  openBracket(open: FenceChar = "("): boolean {
    if (open === "|") return this.wrapInBrackets("|");
    if (this.selection()) return this.wrapInBrackets(open);
    return this.edit(() => {
      const p = parentOf(this.doc.root, this._caret.path);
      // Rule 2: solidify a ghost opening side of the fence we are directly inside.
      if (p && p.node.t === "fence" && p.node.openGhost) {
        const f = p.node;
        const moved = f.body.splice(0, this._caret.index);
        p.row.splice(p.nodeIndex, 0, ...moved);
        delete f.openGhost;
        f.open = open;
        this._caret = { path: child(p.path, p.nodeIndex + moved.length, 0), index: 0 };
        return;
      }
      // Rule 3: new fence from the caret to the end of the row, with a ghost close.
      const row = this.row();
      const i = this._caret.index;
      const body = row.splice(i, row.length - i);
      const f = fence(body, open, CLOSE_FOR[open] ?? ")");
      f.closeGhost = true;
      row.splice(i, 0, f);
      this._caret = { path: child(this._caret.path, i, 0), index: 0 };
    });
  }

  /** Single closing bracket (spec §7.4). */
  closeBracket(close: FenceChar = ")"): boolean {
    this._anchor = null;
    const p = parentOf(this.doc.root, this._caret.path);
    // Rule 2: at the end of a fence with a solid close of the same kind, step out.
    if (p && p.node.t === "fence" && !p.node.closeGhost && p.node.close === close && this._caret.index === this.row().length) {
      return this.move(() => {
        this._caret = { path: p.path, index: p.nodeIndex + 1 };
        return true;
      });
    }
    return this.edit(() => {
      // Rule 1: solidify a ghost closing side of the fence we are directly inside.
      if (p && p.node.t === "fence" && p.node.closeGhost) {
        const f = p.node;
        const moved = f.body.splice(this._caret.index);
        p.row.splice(p.nodeIndex + 1, 0, ...moved);
        delete f.closeGhost;
        f.close = close;
        this._caret = { path: p.path, index: p.nodeIndex + 1 };
        return;
      }
      // Rule 3: new fence from the start of the row to the caret, with a ghost open.
      const row = this.row();
      const i = this._caret.index;
      const body = row.splice(0, i);
      const f = fence(body, OPEN_FOR[close] ?? "(", close);
      f.openGhost = true;
      row.splice(0, 0, f);
      this._caret = { path: this._caret.path, index: 1 };
    });
  }

  /** Put the selection, or the operand before the caret, inside a matched pair. */
  wrapInBrackets(open: FenceChar = "("): boolean {
    const close = CLOSE_FOR[open] ?? ")";
    return this.edit(() => {
      const taken = this.takeSelection();
      const f = fence(taken ?? [], open, close);
      const index = this._caret.index;
      this.insertNodes([f]);
      this._caret = taken && taken.length
        ? { path: this._caret.path, index: index + 1 }
        : { path: child(this._caret.path, index, 0), index: 0 };
    });
  }

  // ---------------------------------------------------------- movement

  moveRight(): boolean {
    const sel = this.selection();
    if (sel) return this.move(() => { this._caret = { path: sel.path, index: sel.end }; this._anchor = null; return true; });
    this._anchor = null;
    return this.move(() => this.stepRight());
  }

  moveLeft(): boolean {
    const sel = this.selection();
    if (sel) return this.move(() => { this._caret = { path: sel.path, index: sel.start }; this._anchor = null; return true; });
    this._anchor = null;
    return this.move(() => this.stepLeft());
  }

  private stepRight(): boolean {
    const row = this.row();
    const i = this._caret.index;
    if (i < row.length) {
      const node = row[i] as Node;
      if (isTemplate(node) && slotsOf(node).length) this._caret = { path: child(this._caret.path, i, 0), index: 0 };
      else this._caret.index = i + 1;
      return true;
    }
    const p = parentOf(this.doc.root, this._caret.path);
    if (!p) return false;
    const slots = slotsOf(p.node);
    if (p.slot < slots.length - 1) this._caret = { path: child(p.path, p.nodeIndex, p.slot + 1), index: 0 };
    else if (p.node.t === "fence" && p.node.closeGhost) return this.exitGhostRight(p.path, p.nodeIndex);
    else this._caret = { path: p.path, index: p.nodeIndex + 1 };
    return true;
  }

  /** Leaving a ghost-closed fence to the right: continue from its parent's end. */
  private exitGhostRight(path: Step[], nodeIndex: number): boolean {
    const saved = this._caret;
    this._caret = { path, index: nodeIndex + 1 };
    // The position after the fence is not allowed; keep climbing.
    const ok = this.stepRight();
    if (!ok) this._caret = saved;
    return ok;
  }

  private stepLeft(): boolean {
    const row = this.row();
    const i = this._caret.index;
    if (i > 0) {
      const node = row[i - 1] as Node;
      const slots = slotsOf(node);
      if (isTemplate(node) && slots.length) {
        const last = slots.length - 1;
        this._caret = { path: child(this._caret.path, i - 1, last), index: (slots[last] as Row).length };
      } else this._caret.index = i - 1;
      return true;
    }
    const p = parentOf(this.doc.root, this._caret.path);
    if (!p) return false;
    if (p.slot > 0) {
      const r = slotsOf(p.node)[p.slot - 1] as Row;
      this._caret = { path: child(p.path, p.nodeIndex, p.slot - 1), index: r.length };
    } else if (p.node.t === "fence" && p.node.openGhost) {
      const saved = this._caret;
      this._caret = { path: p.path, index: p.nodeIndex };
      const ok = this.stepLeft();
      if (!ok) { this._caret = saved; return false; }
    } else this._caret = { path: p.path, index: p.nodeIndex };
    return true;
  }

  moveUp(): boolean { this._anchor = null; return this.move(() => this.vertical(-1)); }
  moveDown(): boolean { this._anchor = null; return this.move(() => this.vertical(1)); }

  private vertical(dir: -1 | 1): boolean {
    const row = this.row();
    const next = row[this._caret.index];
    if (next?.t === "frac" || next?.t === "deriv" || (next?.t === "vector" && next.rows > 1)) {
      const slot = dir < 0 ? 0 : slotsOf(next).length - (next.t === "vector" ? next.cols : 1);
      this._caret = { path: child(this._caret.path, this._caret.index, slot), index: 0 };
      return true;
    }
    let path = this._caret.path;
    let index = this._caret.index;
    for (let p = parentOf(this.doc.root, path); p; p = parentOf(this.doc.root, path)) {
      const t = p.node.t;
      let target = -1;
      if ((t === "frac" || t === "deriv") && ((dir < 0 && p.slot === 1) || (dir > 0 && p.slot === 0))) target = 1 - p.slot;
      if (t === "bigop" && p.slot < 2 && ((dir < 0 && p.slot === 0) || (dir > 0 && p.slot === 1))) target = 1 - p.slot;
      if (t === "subsup" && ((dir < 0 && p.slot === 0) || (dir > 0 && p.slot === 1))) target = 1 - p.slot;
      if (t === "vector") {
        const cand = p.slot + dir * p.node.cols;
        if (cand >= 0 && cand < p.node.cells.length) target = cand;
      }
      if (target >= 0) {
        const r = slotsOf(p.node)[target] as Row;
        this._caret = { path: child(p.path, p.nodeIndex, target), index: Math.min(index, r.length) };
        return true;
      }
      index = p.nodeIndex;
      path = p.path;
    }
    return false;
  }

  moveHome(): boolean { this._anchor = null; return this.move(() => { this._caret.index = 0; return true; }); }
  moveEnd(): boolean { this._anchor = null; return this.move(() => { this._caret.index = this.row().length; return true; }); }

  /** Tab: next empty slot in document order, wrapping. False if there are none. */
  moveToNextPlaceholder(): boolean { return this.placeholderStep(1); }
  moveToPreviousPlaceholder(): boolean { return this.placeholderStep(-1); }

  private placeholderStep(dir: 1 | -1): boolean {
    const all = emptySlotPositions(this.doc.root);
    if (!all.length) return false;
    this._anchor = null;
    const here = this._caret;
    const pick = dir > 0
      ? all.find((p) => comparePositions(p, here) > 0 && !samePath(p.path, here.path)) ?? all[0]
      : [...all].reverse().find((p) => comparePositions(p, here) < 0 && !samePath(p.path, here.path)) ?? all[all.length - 1];
    if (!pick) return false;
    if (all.length === 1 && samePath(pick.path, here.path)) return false;
    return this.move(() => { this._caret = clonePosition(pick); return true; });
  }

  /** Move to just after the innermost template containing the caret. */
  exitTemplate(): boolean {
    this._anchor = null;
    const p = parentOf(this.doc.root, this._caret.path);
    if (!p) return false;
    if (p.node.t === "fence" && p.node.closeGhost) return this.move(() => this.exitGhostRight(p.path, p.nodeIndex));
    return this.move(() => { this._caret = { path: p.path, index: p.nodeIndex + 1 }; return true; });
  }

  // --------------------------------------------------------- selection

  extendRight(): boolean { return this.extend(1); }
  extendLeft(): boolean { return this.extend(-1); }
  extendHome(): boolean {
    return this.move(() => { this._anchor ??= clonePosition(this._caret); this._caret.index = 0; return true; });
  }
  extendEnd(): boolean {
    return this.move(() => { this._anchor ??= clonePosition(this._caret); this._caret.index = this.row().length; return true; });
  }

  /** Shift+arrow: grow within the row; at a row edge, lift to whole templates. */
  private extend(dir: 1 | -1): boolean {
    return this.move(() => {
      this._anchor ??= clonePosition(this._caret);
      const row = this.row();
      const i = this._caret.index;
      if (dir > 0 && i < row.length) { this._caret.index = i + 1; return true; }
      if (dir < 0 && i > 0) { this._caret.index = i - 1; return true; }
      const p = parentOf(this.doc.root, this._caret.path);
      if (!p) return false;
      // Select the whole template in the parent row.
      this._anchor = { path: p.path, index: dir > 0 ? p.nodeIndex : p.nodeIndex + 1 };
      this._caret = { path: p.path, index: dir > 0 ? p.nodeIndex + 1 : p.nodeIndex };
      return true;
    });
  }

  selectAll(): boolean {
    return this.move(() => {
      this._anchor = { path: [], index: 0 };
      this._caret = { path: [], index: this.doc.root.length };
      return true;
    });
  }

  // ----------------------------------------------------------- deletion

  deleteBackward(): boolean {
    if (this.selection()) return this.edit(() => { this.takeSelection(); });
    this._anchor = null;
    const row = this.row();
    const i = this._caret.index;
    if (i > 0) {
      const prev = row[i - 1] as Node;
      if (prev.t === "fence") return this.edit(() => this.deleteFenceSide(this._caret.path, i - 1, "close", "backward"));
      if (!isTemplate(prev) || slotsOf(prev).every((r) => r.length === 0)) {
        return this.edit(() => { row.splice(i - 1, 1); this._caret.index = i - 1; });
      }
      return this.move(() => {
        const slots = slotsOf(prev);
        const last = slots.length - 1;
        this._caret = { path: child(this._caret.path, i - 1, last), index: (slots[last] as Row).length };
        return true;
      });
    }
    const p = parentOf(this.doc.root, this._caret.path);
    if (!p) return false;
    if (p.node.t === "fence") return this.edit(() => this.deleteFenceSide(p.path, p.nodeIndex, "open", "backward"));
    return this.edit(() => this.unwrap(p.path, p.nodeIndex, p.slot, "start"));
  }

  deleteForward(): boolean {
    if (this.selection()) return this.edit(() => { this.takeSelection(); });
    this._anchor = null;
    const row = this.row();
    const i = this._caret.index;
    if (i < row.length) {
      const next = row[i] as Node;
      if (next.t === "fence") return this.edit(() => this.deleteFenceSide(this._caret.path, i, "open", "forward"));
      if (!isTemplate(next) || slotsOf(next).every((r) => r.length === 0)) {
        return this.edit(() => { row.splice(i, 1); });
      }
      return this.move(() => { this._caret = { path: child(this._caret.path, i, 0), index: 0 }; return true; });
    }
    const p = parentOf(this.doc.root, this._caret.path);
    if (!p) return false;
    if (p.node.t === "fence") return this.edit(() => this.deleteFenceSide(p.path, p.nodeIndex, "close", "forward"));
    return this.edit(() => this.unwrap(p.path, p.nodeIndex, p.slot, "end"));
  }

  /** Splice a template's slot contents into its parent row (spec §7.2). */
  private unwrap(path: Step[], nodeIndex: number, slot: number, at: "start" | "end"): void {
    const row = rowAt(this.doc.root, path);
    const node = row[nodeIndex] as Template;
    const slots = slotsOf(node);
    let offset = 0;
    for (let k = 0; k < slot; k++) offset += (slots[k] as Row).length;
    if (at === "end") offset += (slots[slot] as Row).length;
    row.splice(nodeIndex, 1, ...slots.flat());
    this._caret = { path, index: nodeIndex + offset };
  }

  /**
   * Delete one side of a fence (spec §7.4). A solid side facing a solid side
   * becomes a ghost; a side facing a ghost removes the fence.
   */
  private deleteFenceSide(path: Step[], index: number, side: "open" | "close", dir: "backward" | "forward"): void {
    const row = rowAt(this.doc.root, path);
    const f = row[index];
    if (f?.t !== "fence") return;
    const otherGhost = side === "open" ? f.closeGhost : f.openGhost;
    const empty = f.body.length === 0;
    if (otherGhost || empty || (f.open === "|" && f.close === "|")) {
      const body = f.body;
      row.splice(index, 1, ...body);
      // Caret stays at the same visual place.
      const caretAtClose = side === "close";
      this._caret = { path, index: caretAtClose ? index + body.length : index };
      return;
    }
    if (side === "close") {
      const moved = row.splice(index + 1);
      const at = f.body.length;
      f.body.push(...moved);
      f.closeGhost = true;
      this._caret = { path: child(path, index, 0), index: at };
    } else {
      const moved = row.splice(0, index);
      f.body.unshift(...moved);
      f.openGhost = true;
      this._caret = { path: child(path, 0, 0), index: moved.length };
    }
    void dir;
  }

  clear(): boolean {
    return this.edit(() => {
      this.doc.root = [];
      this._caret = { path: [], index: 0 };
      this._anchor = null;
    });
  }

  // -------------------------------------------------------------- history

  undo(): boolean {
    const prev = this.history.undo(this.snapshot());
    if (!prev) return false;
    this.restore(prev);
    this.resetTransient();
    this.emit(true);
    return true;
  }

  redo(): boolean {
    const next = this.history.redo(this.snapshot());
    if (!next) return false;
    this.restore(next);
    this.resetTransient();
    this.emit(true);
    return true;
  }
}

/**
 * A ghost side is only meaningful at the edge of its row (spec §3.3). When an
 * edit moves a fence away from that edge (wrapping, unwrapping, selection
 * moves), the ghost side becomes a real bracket.
 */
function repairGhosts(row: Row): void {
  row.forEach((n, i) => {
    if (n.t === "fence") {
      if (n.closeGhost && i !== row.length - 1) delete n.closeGhost;
      if (n.openGhost && i !== 0) delete n.openGhost;
    }
    for (const r of slotsOf(n)) repairGhosts(r);
  });
}

function samePositionOrNull(before: Snapshot, editor: Editor): boolean {
  const c = editor.caret;
  return c.index === before.caret.index && samePath(c.path, before.caret.path);
}

export type { TemplateType };
