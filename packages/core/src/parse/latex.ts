/**
 * LaTeX subset parser (spec §7.7). Accepts what `toLatex` emits plus common
 * variants; anything else raises a ParseError with the offending position.
 * Exists for initial values and paste, not arbitrary LaTeX.
 */
import type { FenceChar, FnName, MathDocument, Node, OpName, RelName, Row, Subject, SymName } from "../model/types.js";
import { cst, deriv, el, fence, fn, frac, num, op, over, rel, st, sym, text, unit, v } from "../model/builders.js";
import { GREEK, isElementSymbol, unitInfo } from "../model/vocabulary.js";
import { ParseError, finishRow } from "./common.js";
import { parseMhchem } from "./mhchem.js";

const GREEK_BY_NAME: Record<string, string> = Object.fromEntries(Object.entries(GREEK).map(([ch, name]) => [name, ch]));
GREEK_BY_NAME.varepsilon = "ε";
GREEK_BY_NAME.varphi = "φ";
GREEK_BY_NAME.vartheta = "θ";

const OPS: Record<string, OpName> = { times: "times", cdot: "cdot", div: "div", pm: "pm", mp: "mp" };
const RELS: Record<string, RelName> = {
  neq: "neq", ne: "neq", leq: "le", le: "le", geq: "ge", ge: "ge", leqslant: "le", geqslant: "ge",
  approx: "approx", equiv: "equiv", propto: "propto", to: "to", rightarrow: "to", longrightarrow: "to",
  rightleftharpoons: "equilibrium", Rightarrow: "implies", implies: "implies", Leftrightarrow: "iff", iff: "iff",
};
const FNS: Record<string, FnName> = {
  sin: "sin", cos: "cos", tan: "tan", arcsin: "arcsin", arccos: "arccos", arctan: "arctan",
  sec: "sec", csc: "cosec", cot: "cot", ln: "ln", log: "log", exp: "exp",
};
const SYMS: Record<string, SymName> = {
  circ: "degree", degree: "degree", "%": "percent", ldots: "ellipsis", dots: "ellipsis", cdots: "ellipsis",
  uparrow: "uparrow", downarrow: "downarrow", therefore: "therefore", prime: "prime",
};
const SKIP = new Set([",", ";", ":", " ", "!", "quad", "qquad", "displaystyle", "textstyle"]);
const STATES = new Set(["s", "l", "g", "aq"]);

/** Temporary node for `\mathrm{aq}` that becomes a state symbol inside brackets. */
interface StateMarker { t: "__state"; v: "s" | "l" | "g" | "aq" }
/** Temporary node for `\dot{…}`, combined into recurring decimals afterwards. */
interface DotMarker { t: "__dot"; body: Row }
type Item = Node | StateMarker | DotMarker;

type Tok =
  | { k: "cmd"; v: string; pos: number }
  | { k: "char"; v: string; pos: number }
  | { k: "eof"; pos: number };

class LatexParser {
  private pos = 0;
  private thinSpace = false;

  constructor(private readonly src: string, private readonly subject: Subject) {}

  // ------------------------------------------------------------ lexing

  private skipWs(): void {
    while (this.pos < this.src.length && /\s/.test(this.src[this.pos] as string)) this.pos++;
  }

  private peek(): Tok {
    const save = this.pos;
    const t = this.next();
    this.pos = save;
    return t;
  }

  private next(): Tok {
    this.skipWs();
    const pos = this.pos;
    const c = this.src[pos];
    if (c === undefined) return { k: "eof", pos };
    if (c === "\\") {
      const m = /^\\([A-Za-z]+|.)/.exec(this.src.slice(pos));
      if (!m) throw new ParseError("Lone backslash", pos, "\\");
      this.pos = pos + m[0].length;
      return { k: "cmd", v: m[1] as string, pos };
    }
    this.pos = pos + 1;
    return { k: "char", v: c, pos };
  }

  private expectChar(ch: string): void {
    const t = this.next();
    if (t.k !== "char" || t.v !== ch) throw new ParseError(`Expected "${ch}"`, t.pos, tokText(t));
  }

  /** Raw text of a balanced `{…}` group, without parsing. */
  private rawGroup(): string {
    this.skipWs();
    if (this.src[this.pos] !== "{") throw new ParseError('Expected "{"', this.pos, this.src[this.pos]);
    let depth = 0;
    const start = this.pos + 1;
    for (let i = this.pos; i < this.src.length; i++) {
      const c = this.src[i];
      if (c === "\\") { i++; continue; }
      if (c === "{") depth++;
      else if (c === "}" && --depth === 0) {
        this.pos = i + 1;
        return this.src.slice(start, i);
      }
    }
    throw new ParseError("Unclosed group", start - 1, "{");
  }

  // ----------------------------------------------------------- parsing

  parseAll(): Row {
    const row = this.row(() => false);
    const t = this.peek();
    if (t.k !== "eof") throw new ParseError("Unexpected token", t.pos, tokText(t));
    return finishRow(resolveMarkers(row));
  }

  /** Parse items until `stop` says so (the stop token is not consumed). */
  private row(stop: (t: Tok) => boolean): Item[] {
    const row: Item[] = [];
    for (;;) {
      const t = this.peek();
      if (t.k === "eof" || stop(t)) return row;
      this.item(row, stop);
    }
  }

  /** A required argument: `{…}` or a single token. */
  private arg(): Item[] {
    const t = this.peek();
    if (t.k === "char" && t.v === "{") {
      this.next();
      const inner = this.row(isChar("}"));
      this.expectChar("}");
      return inner;
    }
    const row: Item[] = [];
    if (t.k === "eof") throw new ParseError("Missing argument", t.pos);
    // A single character or command, as TeX does for x^2.
    if (t.k === "char" && /[0-9]/.test(t.v)) { this.next(); row.push(num(t.v as "0")); return row; }
    this.item(row, () => false, true);
    return row;
  }

  private item(row: Item[], stop: (t: Tok) => boolean, single = false): void {
    const t = this.next();
    const wasThin = this.thinSpace;
    this.thinSpace = false;
    if (t.k === "eof") return;
    if (t.k === "char") return this.charItem(t, row, stop, single);
    return this.cmdItem(t, row, wasThin);
  }

  private charItem(t: Tok & { k: "char" }, row: Item[], stop: (t: Tok) => boolean, single: boolean): void {
    const c = t.v;
    if (/[0-9.]/.test(c)) { row.push(num(c as "0")); return; }
    if (/[A-Za-z]/.test(c)) { row.push(v(c)); return; }
    switch (c) {
      case "+": row.push(op("plus")); return;
      case "-": row.push(op("minus")); return;
      case "*": row.push(op("times")); return;
      case "/": row.push(op("slash")); return;
      case "=": row.push(rel("eq")); return;
      case "<": row.push(rel("lt")); return;
      case ">": row.push(rel("gt")); return;
      case ":": row.push(rel("ratio")); return;
      case ",": row.push(sym("comma")); return;
      case "!": row.push(sym("factorial")); return;
      case "'": row.push(sym("prime")); return;
      case "~": return;
      case "^": case "_": return this.script(c === "^" ? "sup" : "sub", row);
      case "{": {
        const inner = this.row(isChar("}"));
        this.expectChar("}");
        row.push(...inner);
        return;
      }
      case "(": case "[": return this.bracket(c, row);
      case ")": case "]": {
        if (single) throw new ParseError("Unexpected bracket", t.pos, c);
        const body = row.splice(0);
        const f = fence(body as Row, c === ")" ? "(" : "[", c);
        f.openGhost = true;
        row.push(f);
        return;
      }
      case "|": return this.modulus(t.pos, row, stop);
      default:
        throw new ParseError("Unsupported character", t.pos, c);
    }
  }

  private modulus(pos: number, row: Item[], stop: (t: Tok) => boolean): void {
    const isBar = (x: Tok) => (x.k === "char" && x.v === "|") || (x.k === "cmd" && (x.v === "rvert" || x.v === "vert"));
    const body = this.row((x) => isBar(x) || stop(x));
    if (!isBar(this.next())) throw new ParseError("Unclosed modulus", pos, "|");
    row.push(fence(finishRow(resolveMarkers(body)), "|", "|"));
  }

  private bracket(open: "(" | "[" | "{", row: Item[]): void {
    const closers = new Set([")", "]"]);
    const body = this.row((x) => (x.k === "char" && closers.has(x.v)) || (x.k === "cmd" && (x.v === "}" || x.v === "right")) || (x.k === "char" && x.v === "}"));
    const t = this.peek();
    const only = body.length === 1 ? body[0] : undefined;
    const items = resolveMarkers(body);
    if (t.k === "char" && closers.has(t.v)) {
      this.next();
      if (only?.t === "__state" && open === "(" && t.v === ")") {
        row.push(st(only.v));
        return;
      }
      row.push(fence(finishRow(items), open, t.v as FenceChar));
      return;
    }
    if (t.k === "cmd" && t.v === "}") {
      this.next();
      row.push(fence(finishRow(items), open, "}"));
      return;
    }
    const f = fence(finishRow(items), open, open === "(" ? ")" : open === "[" ? "]" : "}");
    f.closeGhost = true;
    row.push(f);
  }

  private script(kind: "sup" | "sub", row: Item[]): void {
    const body = finishRow(resolveMarkers(this.arg()));
    const last = row[row.length - 1];
    if (kind === "sup" && body.length === 1 && body[0]?.t === "sym" && body[0].v === "degree") {
      row.push(sym("degree"));
      return;
    }
    if (kind === "sup" && last?.t === "fn" && ["sin", "cos", "tan"].includes(last.v) && isMinusOne(body)) {
      last.v = `arc${last.v}` as FnName;
      return;
    }
    if (kind === "sup" && last?.t === "sub") { row[row.length - 1] = { t: "subsup", sub: last.body, sup: body }; return; }
    if (kind === "sub" && last?.t === "sup") { row[row.length - 1] = { t: "subsup", sub: body, sup: last.body }; return; }
    row.push({ t: kind, body });
  }

  private cmdItem(t: Tok & { k: "cmd" }, row: Item[], wasThin: boolean): void {
    const name = t.v;
    if (SKIP.has(name)) { if (name === ",") this.thinSpace = true; return; }
    if (name === "frac" || name === "dfrac" || name === "tfrac") {
      const n = finishRow(resolveMarkers(this.arg()));
      const d = finishRow(resolveMarkers(this.arg()));
      const isD = (r: Row) => r[0]?.t === "var" && r[0].v === "d";
      if (isD(n) && isD(d) && d.length >= 2) row.push(deriv(n.slice(1), d.slice(1)));
      else row.push(frac(n, d));
      return;
    }
    if (name === "sqrt") {
      let index: Row | undefined;
      const p = this.peek();
      if (p.k === "char" && p.v === "[") {
        this.next();
        index = finishRow(resolveMarkers(this.row(isChar("]"))));
        this.expectChar("]");
      }
      const body = finishRow(resolveMarkers(this.arg()));
      row.push(index ? { t: "root", index, body } : { t: "root", body });
      return;
    }
    if (name === "left") return this.leftRight(row);
    if (name === "lvert" || name === "vert") return this.modulus(t.pos, row, () => false);
    if (name === "right") throw new ParseError("Unmatched \\right", t.pos, "\\right");
    if (name === "{") return this.bracket("{", row);
    if (name === "}") {
      const body = row.splice(0);
      const f = fence(body as Row, "{", "}");
      f.openGhost = true;
      row.push(f);
      return;
    }
    if (name === "Omega" && wasThin) { row.push(unit("Ω")); return; }
    if (name === "pi") { row.push(cst("pi")); return; }
    if (name === "infty") { row.push(cst("infinity")); return; }
    if (name in GREEK_BY_NAME) { row.push(v(GREEK_BY_NAME[name] as string)); return; }
    if (name in OPS) { row.push(op(OPS[name] as OpName)); return; }
    if (name in RELS) { row.push(rel(RELS[name] as RelName)); return; }
    if (name in FNS) { row.push(fn(FNS[name] as FnName)); return; }
    if (name in SYMS) { row.push(sym(SYMS[name] as SymName)); return; }
    if (name === "square" || name === "Box") return;
    if (name === "text" || name === "textrm" || name === "mbox") {
      const words = this.rawGroup().trim();
      if (words) row.push(text(words));
      return;
    }
    if (name === "operatorname") {
      const word = this.rawGroup().trim();
      if (word === "cosec" || word === "csc") { row.push(fn("cosec")); return; }
      if (word in FNS) { row.push(fn(FNS[word] as FnName)); return; }
      throw new ParseError("Unsupported operator name", t.pos, word);
    }
    if (name === "mathrm" || name === "rm") return this.mathrm(row, wasThin);
    if (name === "dot") { row.push({ t: "__dot", body: finishRow(resolveMarkers(this.arg())) }); return; }
    if (name === "bar" || name === "overline") { row.push(over("bar", finishRow(resolveMarkers(this.arg())))); return; }
    if (name === "vec" || name === "overrightarrow") { row.push(over("vec", finishRow(resolveMarkers(this.arg())))); return; }
    if (name === "hat") { row.push(over("hat", finishRow(resolveMarkers(this.arg())))); return; }
    if (name === "int" || name === "sum") return this.bigop(name, row);
    if (name === "begin") return this.matrix(row);
    if (name === "ce") {
      row.push(...parseMhchem(this.rawGroup()));
      return;
    }
    throw new ParseError(`Unsupported command \\${name}`, t.pos, `\\${name}`);
  }

  private leftRight(row: Item[]): void {
    const open = this.delimiter();
    const body = this.row((x) => x.k === "cmd" && x.v === "right");
    const r = this.next();
    if (r.k !== "cmd" || r.v !== "right") throw new ParseError("Missing \\right", r.pos, tokText(r));
    const close = this.delimiter();
    const f = fence(finishRow(resolveMarkers(body)), (open ?? "(") as FenceChar, (close ?? ")") as FenceChar);
    if (open === null) f.openGhost = true;
    if (close === null) f.closeGhost = true;
    if (open === null && close === null) throw new ParseError("\\left. with \\right. is not supported", r.pos, "\\right.");
    row.push(f);
  }

  /** Delimiter after \left or \right; null for the invisible `.`. */
  private delimiter(): string | null {
    const t = this.next();
    if (t.k === "char" && "()[]|".includes(t.v)) return t.v;
    if (t.k === "char" && t.v === ".") return null;
    if (t.k === "cmd" && (t.v === "{" || t.v === "}")) return t.v;
    if (t.k === "cmd" && (t.v === "lvert" || t.v === "rvert" || t.v === "vert")) return "|";
    throw new ParseError("Unsupported delimiter", t.pos, tokText(t));
  }

  private mathrm(row: Item[], wasThin: boolean): void {
    const group = this.rawGroup();
    // Compound units in one group: \mathrm{m\,s^{-2}}.
    if (/\\,|\s|\^/.test(group.replace(/\\mu\s*/g, "μ").trim())) {
      const units = this.compoundUnits(group);
      if (units) { row.push(...units); return; }
    }
    const raw = group.replace(/\\mu\s*/g, "μ").replace(/\\Omega/g, "Ω").replace(/\\,/g, "").replace(/\s+/g, "");
    if (wasThin && unitInfo(raw)) { row.push(unit(raw)); return; }
    if (STATES.has(raw)) { row.push({ t: "__state", v: raw as StateMarker["v"] }); return; }
    const preferElement = this.subject === "chemistry" && !wasThin;
    if (preferElement && isElementSymbol(raw)) { row.push(el(raw)); return; }
    if (unitInfo(raw)) { row.push(unit(raw)); return; }
    if (isElementSymbol(raw)) { row.push(el(raw)); return; }
    if (raw === "d" || raw === "e") { row.push(v(raw)); return; }
    for (const ch of Array.from(raw)) row.push(/[0-9.]/.test(ch) ? num(ch as "0") : v(ch));
  }

  /** Units separated by thin spaces, each with an optional power; null if any piece is not a unit. */
  private compoundUnits(group: string): Row | null {
    const pieces = group.replace(/\\mu\s*/g, "μ").replace(/\\Omega/g, "Ω").split(/\\,|\s+/).filter(Boolean);
    const out: Row = [];
    for (const piece of pieces) {
      const m = /^([^^]+)(?:\^(\{[^}]*\}|.))?$/.exec(piece);
      if (!m || !unitInfo(m[1] as string)) return null;
      out.push(unit(m[1] as string));
      if (m[2]) {
        const body = m[2].startsWith("{") ? m[2].slice(1, -1) : m[2];
        out.push({ t: "sup", body: parseLatexRow(body, this.subject) });
      }
    }
    return out.length ? out : null;
  }

  private bigop(name: "int" | "sum", row: Item[]): void {
    let lower: Row = [], upper: Row = [];
    for (let k = 0; k < 2; k++) {
      const p = this.peek();
      if (p.k === "char" && p.v === "_") { this.next(); lower = finishRow(resolveMarkers(this.arg())); }
      else if (p.k === "char" && p.v === "^") { this.next(); upper = finishRow(resolveMarkers(this.arg())); }
    }
    // The body runs to the next relation or the end of the enclosing group.
    const body: Item[] = [];
    for (;;) {
      const p = this.peek();
      if (p.k === "eof" || isStopper(p)) break;
      const before = body.length;
      this.item(body, isStopper);
      if (body.length > before && (body[body.length - 1] as Item).t === "rel") {
        const r = body.pop() as Item;
        row.push({ t: "bigop", op: name, lower, upper, body: finishRow(resolveMarkers(body)) });
        row.push(r);
        return;
      }
    }
    row.push({ t: "bigop", op: name, lower, upper, body: finishRow(resolveMarkers(body)) });
  }

  private matrix(row: Item[]): void {
    const env = this.rawGroup().trim();
    if (!["pmatrix", "bmatrix", "matrix"].includes(env)) throw new ParseError(`Unsupported environment ${env}`, this.pos, env);
    const rows: Row[][] = [[]];
    let cell: Item[] = [];
    for (;;) {
      const p = this.peek();
      if (p.k === "eof") throw new ParseError(`Missing \\end{${env}}`, p.pos);
      if (p.k === "cmd" && p.v === "end") {
        this.next();
        this.rawGroup();
        break;
      }
      if (p.k === "char" && p.v === "&") { this.next(); (rows[rows.length - 1] as Row[]).push(finishRow(resolveMarkers(cell))); cell = []; continue; }
      if (p.k === "cmd" && p.v === "\\") { this.next(); (rows[rows.length - 1] as Row[]).push(finishRow(resolveMarkers(cell))); cell = []; rows.push([]); continue; }
      this.item(cell, (x) => (x.k === "char" && x.v === "&") || (x.k === "cmd" && (x.v === "\\" || x.v === "end")));
    }
    (rows[rows.length - 1] as Row[]).push(finishRow(resolveMarkers(cell)));
    const cols = Math.max(...rows.map((r) => r.length));
    if (!rows.every((r) => r.length === cols)) throw new ParseError("Ragged matrix", this.pos);
    row.push({ t: "vector", rows: rows.length, cols, cells: rows.flat() });
  }
}

function isChar(ch: string): (t: Tok) => boolean {
  return (t) => t.k === "char" && t.v === ch;
}

function isStopper(t: Tok): boolean {
  return (t.k === "char" && (t.v === "}" || t.v === "&" || t.v === ")" || t.v === "]")) || (t.k === "cmd" && (t.v === "right" || t.v === "\\" || t.v === "end"));
}

function tokText(t: Tok): string {
  return t.k === "eof" ? "end of input" : t.k === "cmd" ? `\\${t.v}` : t.v;
}

function isMinusOne(r: Row): boolean {
  return r.length === 2 && r[0]?.t === "op" && r[0].v === "minus" && r[1]?.t === "num" && r[1].v === "1";
}

/** Turn temporary markers into real nodes: recurring dots, stray states, °C. */
function resolveMarkers(items: Item[]): Row {
  const out: Row = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i] as Item;
    if (it.t === "__state") {
      // Outside brackets, s/l/g are units (second, litre, gram) or letters.
      if (unitInfo(it.v)) out.push(unit(it.v));
      else out.push(v("a"), v("q"));
      continue;
    }
    if (it.t === "__dot") {
      // \dot{1}4285\dot{7} → one recurring block.
      const digits: Row = [...it.body];
      let j = i + 1;
      while ((items[j] as Item | undefined)?.t === "num") j++;
      const closing = items[j] as Item | undefined;
      if (closing?.t === "__dot" && j > i) {
        digits.push(...(items.slice(i + 1, j) as Row), ...closing.body);
        i = j;
      }
      out.push({ t: "recurring", body: digits });
      continue;
    }
    // Degrees Celsius written as °, then C.
    if (it.t === "sym" && it.v === "degree") {
      const nxt = items[i + 1] as Item | undefined;
      if ((nxt?.t === "unit" || nxt?.t === "element") && nxt.v === "C") { out.push(unit("°C")); i++; continue; }
    }
    out.push(it as Node);
  }
  return out;
}

/** Parse LaTeX (the subset in spec §7.7) into a document. Throws ParseError. */
export function fromLatex(latex: string, subject: Subject = "maths"): MathDocument {
  const root = new LatexParser(latex, subject).parseAll();
  return { version: 1, subject, root };
}

/** Parse a maths LaTeX fragment into a row (used by the mhchem parser for `$…$`). */
export function parseLatexRow(latex: string, subject: Subject): Row {
  return new LatexParser(latex, subject).parseAll();
}
