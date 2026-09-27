/**
 * Linear plain-ASCII text (spec §6.2). Readable, calculator-like, and the
 * input syntax of `fromText`. Empty required slots are written as `?`.
 */
import type { MathDocument, Node, Row } from "../model/types.js";
import { GREEK, unitInfo } from "../model/vocabulary.js";
import { isOptionalSlot, slotsOf } from "../model/slots.js";
import { isAllDigits, isMixedFraction, isUnary } from "./common.js";
import { hasChemistry } from "./latex.js";

const CONST: Record<string, string> = { pi: "pi", e: "e", i: "i", infinity: "infinity" };
const OP: Record<string, string> = {
  plus: "+", minus: "-", times: "*", cdot: "*", div: "/", slash: "/", pm: "+/-", mp: "-/+",
};
const REL: Record<string, string> = {
  eq: "=", neq: "!=", lt: "<", gt: ">", le: "<=", ge: ">=", approx: "~=", equiv: "===", propto: "propto",
  to: "->", equilibrium: "<=>", implies: "=>", iff: "<=>", ratio: ":",
};
const FN: Record<string, string> = {
  sin: "sin", cos: "cos", tan: "tan", arcsin: "arcsin", arccos: "arccos", arctan: "arctan",
  sec: "sec", cosec: "cosec", cot: "cot", ln: "ln", log: "log", exp: "exp",
};
const SYM: Record<string, string> = {
  degree: " deg", factorial: "!", percent: "%", comma: ", ", prime: "'", ellipsis: "...",
  uparrow: " ^", downarrow: " v", delta: "Delta", therefore: "therefore ",
};

/** A single (optionally signed) number, a single name, or a placeholder. */
function isAtomic(s: string): boolean {
  return /^-?(\d+(\.\d*)?|\.\d+|[A-Za-z]+|\?)$/.test(s);
}

/** Wrap in brackets unless the text is atomic. */
function wrap(s: string): string {
  return isAtomic(s) ? s : `(${s})`;
}

const WORDLIKE = new Set(["root", "vector", "bigop", "over"]);
const FACTOR = new Set(["num", "var", "const", "fn", "root", "over"]);

class TextWriter {
  constructor(private readonly chem: boolean) {}

  slot(node: Node, k: number): string {
    const r = slotsOf(node)[k] ?? [];
    if (r.length) return this.row(r);
    return isOptionalSlot(node, k) ? "" : "?";
  }

  row(row: Row): string {
    let out = "";
    row.forEach((n, i) => {
      const piece = this.node(n, row, i);
      // Word-like forms such as sqrt(…) get a space after a number or letter: "3 sqrt(5)".
      if (WORDLIKE.has(n.t) && /[A-Za-z0-9)]$/.test(out)) out += " ";
      out += piece;
      // Scripts and fractions followed by a factor get a space: "x^2 y", "log_2 8", "1/2 mv^2".
      const next = row[i + 1];
      if ((n.t === "sup" || n.t === "sub" || n.t === "subsup" || n.t === "frac") && next && FACTOR.has(next.t) && !this.chem) out += " ";
    });
    return out.replace(/ {2,}/g, " ").trim();
  }

  node(node: Node, row: Row, i: number): string {
    const s = (k: number) => this.slot(node, k);
    switch (node.t) {
      case "num": return node.v;
      case "var": return GREEK[node.v] ? ` ${GREEK[node.v]} ` : node.v;
      case "const": return CONST[node.v] ?? node.v;
      case "op": {
        const o = OP[node.v] ?? node.v;
        if (this.chem && (node.v === "cdot" || node.v === "times")) return "*";
        return isUnary(row, i) || node.v === "slash" ? o : ` ${o} `;
      }
      case "rel": return ` ${REL[node.v] ?? node.v} `;
      case "fn": {
        const next = row[i + 1]?.t;
        return `${FN[node.v] ?? node.v}${next === "fence" || next === "sup" || next === "sub" ? "" : " "}`;
      }
      case "sym": return SYM[node.v] ?? node.v;
      case "text": return ` ${node.v} `;
      case "unit": {
        const prev = row[i - 1];
        return `${prev?.t === "op" && prev.v === "slash" ? "" : " "}${unitInfo(node.v)?.ascii ?? node.v}`;
      }
      case "element": return node.v;
      case "state": return `(${node.v})`;
      case "frac": {
        const n = s(0), d = s(1);
        const lead = isMixedFraction(row, i) ? " " : "";
        return isAtomic(n) && isAtomic(d) && !d.startsWith("-")
          ? `${lead}${n}/${d}`
          : `${lead}${wrap(n)} / ${wrap(d)}`;
      }
      case "deriv": return `d${s(0)}/d${s(1)}`;
      case "sup": return this.chem ? `^${s(0).replace(/ /g, "")}` : `^${wrap(s(0))}`;
      case "sub": return this.chem && isAllDigits(node.body) ? s(0) : `_${wrap(s(0))}`;
      case "subsup": return this.chem ? `^${s(1).replace(/ /g, "")}_${s(0)}` : `_${wrap(s(0))}^${wrap(s(1))}`;
      case "root": return node.index ? `root(${s(0)}, ${s(1)})` : `sqrt(${s(0)})`;
      case "fence": return `${node.open}${s(0)}${node.close}`;
      case "vector": {
        if (node.cols === 1) return `vector(${node.cells.map((_, k) => s(k)).join(", ")})`;
        const rows: string[] = [];
        for (let r = 0; r < node.rows; r++) {
          rows.push(`(${Array.from({ length: node.cols }, (_, c) => s(r * node.cols + c)).join(", ")})`);
        }
        return `matrix(${rows.join(", ")})`;
      }
      case "recurring": return `(${s(0)})`;
      case "bigop": {
        const name = node.op === "int" ? "integral" : "sum";
        const lower = s(0), upper = s(1);
        return lower || upper ? `${name}(${lower}, ${upper}, ${s(2)})` : `${name}(${s(2)})`;
      }
      case "over": return `${node.kind}(${s(0)})`;
    }
  }
}

/** Serialise a document as linear text. */
export function toText(document: MathDocument): string {
  const chem = document.subject === "chemistry" && hasChemistry(document.root);
  return new TextWriter(chem).row(document.root);
}

export function rowToText(row: Row, chemistry = false): string {
  return new TextWriter(chemistry).row(row);
}
