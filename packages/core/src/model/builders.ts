/**
 * Concise constructors for trees. Used by tests, keypad presets and hosts.
 *
 * `row("2x", op("plus"), "3")` flattens its parts: strings become digit and
 * letter atoms (Latin or Greek), nodes are kept, rows are spliced in.
 */
import type {
  BigOpNode, ConstAtom, ConstName, Digit, DerivNode, ElementAtom, FenceChar, FenceNode, FnAtom, FnName,
  FracNode, MathDocument, Node, NumAtom, OpAtom, OpName, OverNode, RecurringNode, RelAtom, RelName, RootNode, Row,
  StateAtom, StateName, Subject, SubNode, SubSupNode, SupNode, SymAtom, SymName, TextAtom, UnitAtom, VarAtom,
  VectorNode,
} from "./types.js";
import { isVariableLetter } from "./vocabulary.js";

export type Part = Node | Row | string;

export function row(...parts: Part[]): Row {
  const out: Row = [];
  for (const part of parts) {
    if (typeof part === "string") {
      for (const ch of Array.from(part)) {
        if (ch === " ") continue;
        if (/^[0-9.]$/.test(ch)) out.push(num(ch as Digit));
        else if (isVariableLetter(ch)) out.push(v(ch));
        else throw new Error(`row(): unsupported character ${JSON.stringify(ch)}; use an atom builder`);
      }
    } else if (Array.isArray(part)) {
      out.push(...part);
    } else {
      out.push(part);
    }
  }
  return out;
}

export function doc(subject: Subject, ...parts: Part[]): MathDocument {
  return { version: 1, subject, root: row(...parts) };
}

export const num = (d: Digit): NumAtom => ({ t: "num", v: d });
export const v = (letter: string): VarAtom => ({ t: "var", v: letter });
export const cst = (name: ConstName): ConstAtom => ({ t: "const", v: name });
export const op = (name: OpName): OpAtom => ({ t: "op", v: name });
export const rel = (name: RelName): RelAtom => ({ t: "rel", v: name });
export const fn = (name: FnName): FnAtom => ({ t: "fn", v: name });
export const sym = (name: SymName): SymAtom => ({ t: "sym", v: name });
export const text = (word: string): TextAtom => ({ t: "text", v: word });
export const unit = (symbol: string): UnitAtom => ({ t: "unit", v: symbol });
export const el = (symbol: string): ElementAtom => ({ t: "element", v: symbol });
export const st = (state: StateName): StateAtom => ({ t: "state", v: state });

const r = (p: Part | undefined): Row => (p === undefined ? [] : row(p));

export const frac = (n: Part, d: Part): FracNode => ({ t: "frac", num: r(n), den: r(d) });
export const sup = (body: Part): SupNode => ({ t: "sup", body: r(body) });
export const sub = (body: Part): SubNode => ({ t: "sub", body: r(body) });
export const subsup = (s: Part, p: Part): SubSupNode => ({ t: "subsup", sub: r(s), sup: r(p) });
export const sqrt = (body: Part): RootNode => ({ t: "root", body: r(body) });
export const nroot = (index: Part, body: Part): RootNode => ({ t: "root", index: r(index), body: r(body) });
export const fence = (body: Part, open: FenceChar = "(", close: FenceChar = ")"): FenceNode =>
  ({ t: "fence", open, close, body: r(body) });
export const paren = (...parts: Part[]): FenceNode => fence(row(...parts));
export const abs = (...parts: Part[]): FenceNode => fence(row(...parts), "|", "|");
export const colvec = (...cells: Part[]): VectorNode =>
  ({ t: "vector", rows: cells.length, cols: 1, cells: cells.map(r) });
export const matrix = (rows: Part[][]): VectorNode =>
  ({ t: "vector", rows: rows.length, cols: rows[0]?.length ?? 0, cells: rows.flat().map(r) });
export const recurring = (body: Part): RecurringNode => ({ t: "recurring", body: r(body) });
export const integral = (lower: Part | undefined, upper: Part | undefined, body: Part): BigOpNode =>
  ({ t: "bigop", op: "int", lower: r(lower), upper: r(upper), body: r(body) });
export const sum = (lower: Part | undefined, upper: Part | undefined, body: Part): BigOpNode =>
  ({ t: "bigop", op: "sum", lower: r(lower), upper: r(upper), body: r(body) });
export const deriv = (n: Part | undefined, d: Part): DerivNode => ({ t: "deriv", num: r(n), den: r(d) });
export const over = (kind: OverNode["kind"], body: Part): OverNode => ({ t: "over", kind, body: r(body) });
