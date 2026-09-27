/**
 * Linear text parser (spec §6.2): the inverse of `toText`. Chemistry text
 * (arrows, states, subscripted elements, charges) goes through the mhchem
 * parser; everything else through this one. Units are recognised only in
 * physics and chemistry documents, after a number or another unit.
 */
import type { FnName, MathDocument, Node, Row, Subject } from "../model/types.js";
import { cst, deriv, fence, fn, num, op, over, rel, sym, text, unit, v } from "../model/builders.js";
import { ELEMENT_SET, GREEK, unitInfo } from "../model/vocabulary.js";
import { operandStart } from "../rules/absorb.js";
import { ParseError, finishRow } from "./common.js";
import { parseMhchem } from "./mhchem.js";

type Tok = { k: "num" | "word" | "op"; v: string; pos: number; space: boolean } | { k: "eof"; pos: number; space: boolean };

const MULTI = ["+/-", "-/+", "<=>", "===", "<=", ">=", "!=", "~=", "->", "=>", "..."];
const FNS = new Set(["sin", "cos", "tan", "arcsin", "arccos", "arctan", "sec", "cosec", "cot", "ln", "log", "exp"]);
const GREEK_BY_NAME: Record<string, string> = Object.fromEntries(Object.entries(GREEK).map(([ch, name]) => [name, ch]));
const ASCII_UNITS: Record<string, string> = { ohm: "Ω", degC: "°C" };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    let space = false;
    while (i < src.length && /\s/.test(src[i] as string)) { i++; space = true; }
    if (i >= src.length) { out.push({ k: "eof", pos: i, space }); return out; }
    const rest = src.slice(i);
    const n = /^(\d+\.?\d*|\.\d+)/.exec(rest);
    if (n) { out.push({ k: "num", v: n[0], pos: i, space }); i += n[0].length; continue; }
    const w = /^[A-Za-zΑ-Ωα-ωμ]+/.exec(rest);
    if (w) { out.push({ k: "word", v: w[0], pos: i, space }); i += w[0].length; continue; }
    const m = MULTI.find((s) => rest.startsWith(s));
    const o = m ?? (rest[0] as string);
    if (!m && !"+-*/^_()[]{}|=<>!,:'?%~".includes(o)) throw new ParseError("Unsupported character", i, o);
    out.push({ k: "op", v: o, pos: i, space });
    i += o.length;
  }
  out.push({ k: "eof", pos: i, space: false });
  return out;
}

class TextParser {
  private k = 0;
  /** Per row: index after which a spaced token started, so "1 1/2" keeps the whole number. */
  private readonly boundary = new WeakMap<Row, number>();
  constructor(private readonly toks: Tok[], private readonly subject: Subject) {}

  private peek(offset = 0): Tok { return this.toks[Math.min(this.k + offset, this.toks.length - 1)] as Tok; }
  private next(): Tok { return this.toks[this.k++] as Tok; }
  private isOp(t: Tok, ...vals: string[]): boolean { return t.k === "op" && vals.includes(t.v); }

  parseAll(): Row {
    const row = this.row(() => false);
    const t = this.peek();
    if (t.k !== "eof") throw new ParseError("Unexpected token", t.pos, "v" in t ? t.v : "");
    return finishRow(row);
  }

  private row(stop: (t: Tok) => boolean): Row {
    const row: Row = [];
    for (;;) {
      const t = this.peek();
      if (t.k === "eof" || stop(t)) return row;
      if (t.space) this.boundary.set(row, row.length);
      this.item(row, stop);
    }
  }

  private item(row: Row, stop: (t: Tok) => boolean): void {
    const t = this.next();
    if (t.k === "eof") return;
    if (t.k === "num") {
      // 0.(3): a bracketed digit run straight after a decimal point is recurring.
      row.push(...Array.from(t.v).map((d) => num(d as "0")));
      const nx = this.peek();
      if (t.v.endsWith(".") && this.isOp(nx, "(") && !nx.space) {
        const save = this.k;
        this.next();
        const d = this.peek();
        if (d.k === "num" && /^\d+$/.test(d.v) && this.isOp(this.peek(1), ")")) {
          this.next(); this.next();
          row.push({ t: "recurring", body: Array.from(d.v).map((x) => num(x as "0")) });
        } else this.k = save;
      }
      return;
    }
    if (t.k === "word") return this.word(t, row);
    this.operator(t, row, stop);
  }

  private unitContext(row: Row, t: Tok): boolean {
    if (this.subject === "maths") return false;
    const prev = row[row.length - 1];
    if (!prev) return false;
    if (prev.t === "op" && prev.v === "slash") return row[row.length - 2]?.t === "unit";
    if (!t.space) return false;
    return prev.t === "num" || prev.t === "unit" || (prev.t === "sup" && row[row.length - 2]?.t === "unit");
  }

  private word(t: Tok & { v: string }, row: Row): void {
    const w = t.v;
    const call = this.isOp(this.peek(), "(") && !this.peek().space;
    if (this.unitContext(row, t)) {
      const sym = ASCII_UNITS[w] ?? (w.startsWith("u") && unitInfo(`μ${w.slice(1)}`) ? `μ${w.slice(1)}` : w);
      if (unitInfo(sym)) { row.push(unit(sym)); return; }
    }
    if (FNS.has(w)) { row.push(fn(w as FnName)); return; }
    if (call && (w === "sqrt" || w === "root" || w === "vector" || w === "matrix" || w === "integral" || w === "sum" || w === "bar" || w === "vec" || w === "hat")) {
      return this.call(w, row);
    }
    if (w === "pi") { row.push(cst("pi")); return; }
    if (w === "infinity") { row.push(cst("infinity")); return; }
    if (w === "deg") { row.push(sym("degree")); return; }
    if (w === "therefore") { row.push(sym("therefore")); return; }
    if (w === "propto") { row.push(rel("propto")); return; }
    if (w === "or" || w === "and") { row.push(text(w)); return; }
    if (w in GREEK_BY_NAME) { row.push(v(GREEK_BY_NAME[w] as string)); return; }
    // Derivatives: dy/dx and d/dx.
    if (/^d[A-Za-z]?$/.test(w) && this.isOp(this.peek(), "/") && !this.peek().space) {
      const after = this.peek(1);
      if (after.k === "word" && /^d[A-Za-z]$/.test(after.v)) {
        this.next(); this.next();
        row.push(deriv(w.length > 1 ? v(w[1] as string) : [], v(after.v[1] as string)));
        return;
      }
    }
    for (const ch of Array.from(w)) row.push(v(ch));
  }

  /** Comma-separated arguments of name(…), each a row. */
  private args(): Row[] {
    this.next(); // (
    const out: Row[] = [];
    for (;;) {
      out.push(this.row((x) => this.isOp(x, ",", ")")));
      const t = this.next();
      if (this.isOp(t, ")")) return out;
      if (!this.isOp(t, ",")) throw new ParseError("Expected , or )", t.pos);
    }
  }

  private call(name: string, row: Row): void {
    if (name === "matrix") {
      this.next(); // (
      const rows: Row[][] = [];
      for (;;) {
        if (!this.isOp(this.peek(), "(")) throw new ParseError("Expected a matrix row", this.peek().pos);
        rows.push(this.args());
        const t = this.next();
        if (this.isOp(t, ")")) break;
        if (!this.isOp(t, ",")) throw new ParseError("Expected , or )", t.pos);
      }
      const cols = rows[0]?.length ?? 0;
      if (!rows.every((r) => r.length === cols)) throw new ParseError("Ragged matrix", this.peek().pos);
      row.push({ t: "vector", rows: rows.length, cols, cells: rows.flat() });
      return;
    }
    const a = this.args();
    const arg = (i: number) => a[i] ?? [];
    switch (name) {
      case "sqrt": row.push({ t: "root", body: arg(0) }); return;
      case "root": row.push({ t: "root", index: arg(0), body: arg(1) }); return;
      case "vector": row.push({ t: "vector", rows: a.length, cols: 1, cells: a }); return;
      case "integral": case "sum": {
        const opName = name === "integral" ? "int" : "sum";
        row.push(a.length >= 3
          ? { t: "bigop", op: opName, lower: arg(0), upper: arg(1), body: arg(2) }
          : { t: "bigop", op: opName, lower: [], upper: [], body: arg(0) });
        return;
      }
      default: row.push(over(name as "bar", arg(0)));
    }
  }

  /** The operand after ^, _ or /: a bracket group (unwrapped), signed number, word, or `?`. */
  private operand(): Row {
    const t = this.peek();
    if (this.isOp(t, "(")) {
      this.next();
      const body = this.row((x) => this.isOp(x, ")"));
      if (!this.isOp(this.next(), ")")) throw new ParseError("Unclosed bracket", t.pos, "(");
      return body;
    }
    if (this.isOp(t, "?")) { this.next(); return []; }
    if (this.isOp(t, "-", "+")) {
      this.next();
      const n = this.next();
      if (n.k !== "num") throw new ParseError("Expected a number", n.pos);
      return [op(t.k === "op" && t.v === "-" ? "minus" : "plus"), ...Array.from(n.v).map((d) => num(d as "0"))];
    }
    if (t.k === "num") { this.next(); return Array.from(t.v).map((d) => num(d as "0")); }
    if (t.k === "word") {
      this.next();
      const r: Row = [];
      this.word(t, r);
      return r;
    }
    throw new ParseError("Expected an operand", t.pos);
  }

  private operator(t: Tok & { v: string }, row: Row, stop: (t: Tok) => boolean): void {
    switch (t.v) {
      case "+": row.push(op("plus")); return;
      case "-": row.push(op("minus")); return;
      case "*": row.push(op("times")); return;
      case "+/-": row.push(op("pm")); return;
      case "-/+": row.push(op("mp")); return;
      case "=": row.push(rel("eq")); return;
      case "!=": row.push(rel("neq")); return;
      case "<": row.push(rel("lt")); return;
      case ">": row.push(rel("gt")); return;
      case "<=": row.push(rel("le")); return;
      case ">=": row.push(rel("ge")); return;
      case "~=": case "~": row.push(rel("approx")); return;
      case "===": row.push(rel("equiv")); return;
      case "->": row.push(rel("to")); return;
      case "<=>": row.push(rel(this.subject === "chemistry" ? "equilibrium" : "iff")); return;
      case "=>": row.push(rel("implies")); return;
      case ":": row.push(rel("ratio")); return;
      case ",": row.push(sym("comma")); return;
      case "!": row.push(sym("factorial")); return;
      case "'": row.push(sym("prime")); return;
      case "%": row.push(sym("percent")); return;
      case "...": row.push(sym("ellipsis")); return;
      case "?": return;
      case "^": case "_": {
        const body = this.operand();
        const last = row[row.length - 1];
        if (t.v === "^" && last?.t === "sub") row[row.length - 1] = { t: "subsup", sub: last.body, sup: body };
        else row.push({ t: t.v === "^" ? "sup" : "sub", body });
        return;
      }
      case "/": return this.slash(t, row);
      case "(": case "[": case "{": {
        const closers = t.v === "{" ? ["}"] : [")", "]"];
        const body = this.row((x) => this.isOp(x, ...closers) || stop(x));
        const c = this.peek();
        if (this.isOp(c, ...closers)) {
          this.next();
          row.push(fence(body, t.v as "(", (c as { v: string }).v as ")"));
        } else {
          const f = fence(body, t.v as "(", t.v === "(" ? ")" : t.v === "[" ? "]" : "}");
          f.closeGhost = true;
          row.push(f);
        }
        return;
      }
      case ")": case "]": case "}": {
        const body = row.splice(0);
        const f = fence(body, t.v === ")" ? "(" : t.v === "]" ? "[" : "{", t.v as ")");
        f.openGhost = true;
        row.push(f);
        return;
      }
      case "|": {
        const body = this.row((x) => this.isOp(x, "|") || stop(x));
        if (!this.isOp(this.next(), "|")) throw new ParseError("Unclosed modulus", t.pos, "|");
        row.push(fence(body, "|", "|"));
        return;
      }
      default: throw new ParseError("Unsupported operator", t.pos, t.v);
    }
  }

  private slash(t: Tok & { v: string }, row: Row): void {
    const prev = row[row.length - 1];
    if (prev?.t === "unit") { row.push(op("slash")); return; }
    const after = this.peek();
    const spaced = t.space && after.space;
    const leftIsGroup = prev?.t === "fence" && prev.open === "(" && !prev.openGhost && !prev.closeGhost;
    const rightIsGroup = this.isOp(after, "(");
    if (spaced && !leftIsGroup && !rightIsGroup) { row.push(op("div")); return; }
    // A fraction: numerator from the operand before, denominator from the one after.
    let numr: Row;
    if (leftIsGroup && spaced) {
      numr = (row.pop() as { body: Row }).body;
    } else {
      const j = Math.max(operandStart(row, row.length), t.space ? row.length : this.boundary.get(row) ?? 0);
      numr = row.splice(j);
      if (numr.length === 1 && numr[0]?.t === "fence" && numr[0].open === "(") numr = numr[0].body;
    }
    const den = this.operand();
    const node: Node = { t: "frac", num: numr, den };
    row.push(node);
  }
}

/** Heuristic: does linear text look like a chemical formula or equation? */
export function looksLikeChemistry(src: string): boolean {
  if (/->|<=>|\((s|l|g|aq)\)|[A-Z][a-z]?\d|[A-Z][a-z]?\d*\^\d*[+-]|[A-Z][a-z]?\)\d|\^\d+_\d+[A-Z]/.test(src)) return true;
  // A run of element symbols only, such as NaCl or CO.
  const symbols = src.trim().match(/[A-Z][a-z]?/g);
  return !!symbols && symbols.join("") === src.trim() && symbols.every((s) => ELEMENT_SET.has(s));
}

/** Parse linear text (spec §6.2) into a document. Throws ParseError. */
export function fromText(src: string, subject: Subject = "maths"): MathDocument {
  const root = subject === "chemistry" && looksLikeChemistry(src)
    ? parseMhchem(src.trim())
    : new TextParser(tokenize(src), subject).parseAll();
  return { version: 1, subject, root };
}
