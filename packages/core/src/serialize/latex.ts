/**
 * LaTeX output (spec §6.1). Targets KaTeX with mhchem; chemistry documents
 * are wrapped in \ce{…}. Output never contains a bare `$` except inside \ce,
 * where maths fragments are embedded as `$…$` as mhchem requires.
 */
import type { FenceChar, MathDocument, Node, Row } from "../model/types.js";
import { GREEK, unitInfo } from "../model/vocabulary.js";
import { isOptionalSlot, slotsOf } from "../model/slots.js";
import { PlaceholderError, isAllDigits, isBaseless, isTall, isUnary, type PlaceholderMode } from "./common.js";

export interface LatexOptions {
  /** How empty required slots are written. Default `"square"` (`\square`). */
  placeholder?: PlaceholderMode;
  /** Chemistry output style. Default `"mhchem"`; `"plain"` writes ordinary maths LaTeX. */
  chemistry?: "mhchem" | "plain";
}

const CONST: Record<string, string> = { pi: "\\pi", e: "e", i: "i", infinity: "\\infty" };
const OP: Record<string, string> = {
  plus: "+", minus: "-", times: "\\times", cdot: "\\cdot", div: "\\div", slash: "/", pm: "\\pm", mp: "\\mp",
};
const REL: Record<string, string> = {
  eq: "=", neq: "\\neq", lt: "<", gt: ">", le: "\\leq", ge: "\\geq", approx: "\\approx", equiv: "\\equiv",
  propto: "\\propto", to: "\\to", equilibrium: "\\rightleftharpoons", implies: "\\Rightarrow", iff: "\\Leftrightarrow",
  ratio: ":",
};
const FN: Record<string, string> = {
  sin: "\\sin", cos: "\\cos", tan: "\\tan", arcsin: "\\sin^{-1}", arccos: "\\cos^{-1}", arctan: "\\tan^{-1}",
  sec: "\\sec", cosec: "\\operatorname{cosec}", cot: "\\cot", ln: "\\ln", log: "\\log", exp: "\\exp",
};
const SYM: Record<string, string> = {
  degree: "^{\\circ}", factorial: "!", percent: "\\%", comma: ",", prime: "'", ellipsis: "\\ldots",
  uparrow: "\\uparrow", downarrow: "\\downarrow", delta: "\\Delta", therefore: "\\therefore",
};
const FENCE: Record<FenceChar, string> = { "(": "(", ")": ")", "[": "[", "]": "]", "{": "\\{", "}": "\\}", "|": "|" };
const OVER: Record<string, string> = { bar: "\\bar", vec: "\\vec", hat: "\\hat" };

/** Join LaTeX fragments, inserting a space after a control word that is followed by a letter or digit. */
export function joinTex(parts: string[]): string {
  let out = "";
  for (const p of parts) {
    if (!p) continue;
    if (/\\[A-Za-z]+$/.test(out) && /^[A-Za-z0-9]/.test(p)) out += " ";
    out += p;
  }
  return out;
}

class MathWriter {
  constructor(private readonly placeholder: PlaceholderMode) {}

  slot(node: Node, index: number, row: Row): string {
    if (row.length) return this.row(row);
    if (isOptionalSlot(node, index)) return "";
    if (this.placeholder === "throw") throw new PlaceholderError();
    return this.placeholder === "square" ? "\\square" : "";
  }

  row(row: Row): string {
    return joinTex(row.map((n, i) => this.node(n, row, i)));
  }

  atom(node: Node, prev: Node | undefined): string {
    switch (node.t) {
      case "num": return node.v;
      case "var": return GREEK[node.v] ? `\\${GREEK[node.v]}` : node.v;
      case "const": return CONST[node.v] ?? node.v;
      case "op": return OP[node.v] ?? node.v;
      case "rel": return REL[node.v] ?? node.v;
      case "fn": return FN[node.v] ?? node.v;
      case "sym": return SYM[node.v] ?? node.v;
      case "text": return `\\text{ ${node.v} }`;
      case "unit": {
        const space = prev && prev.t !== "op" && prev.t !== "rel" ? "\\," : "";
        return space + (unitInfo(node.v)?.latex ?? `\\mathrm{${node.v}}`);
      }
      case "element": return `\\mathrm{${node.v}}`;
      case "state": return `(\\mathrm{${node.v}})`;
      default: return "";
    }
  }

  node(node: Node, row: Row, i: number): string {
    const prev = row[i - 1];
    const s = (k: number) => this.slot(node, k, slotsOf(node)[k] ?? []);
    switch (node.t) {
      case "frac": return `\\frac{${s(0)}}{${s(1)}}`;
      case "deriv": return `\\frac{${joinTex(["d", s(0)])}}{${joinTex(["d", s(1)])}}`;
      case "sup": {
        const needsBase = isBaseless(prev) || prev?.t === "sup" || prev?.t === "subsup";
        return `${needsBase ? "{}" : ""}^{${s(0)}}`;
      }
      case "sub": {
        const needsBase = isBaseless(prev) || prev?.t === "sub" || prev?.t === "subsup" || prev?.t === "sup";
        return `${needsBase ? "{}" : ""}_{${s(0)}}`;
      }
      case "subsup": {
        const needsBase = isBaseless(prev) || prev?.t === "sub" || prev?.t === "sup" || prev?.t === "subsup";
        return `${needsBase ? "{}" : ""}_{${s(0)}}^{${s(1)}}`;
      }
      case "root": return node.index ? `\\sqrt[${s(0)}]{${s(1)}}` : `\\sqrt{${s(0)}}`;
      case "fence": {
        const body = s(0);
        return isTall(node.body)
          ? `\\left${FENCE[node.open]}${body}\\right${FENCE[node.close]}`
          : `${FENCE[node.open]}${body}${FENCE[node.close]}`;
      }
      case "vector": {
        const lines: string[] = [];
        for (let r = 0; r < node.rows; r++) {
          const cells: string[] = [];
          for (let c = 0; c < node.cols; c++) cells.push(s(r * node.cols + c));
          lines.push(cells.join(" & "));
        }
        return `\\begin{pmatrix}${lines.join(" \\\\ ")}\\end{pmatrix}`;
      }
      case "recurring": {
        const body = node.body;
        if (!isAllDigits(body)) return `\\dot{${s(0)}}`;
        const d = body.map((n) => (n as { v: string }).v);
        if (d.length === 1) return `\\dot{${d[0]}}`;
        return `\\dot{${d[0]}}${d.slice(1, -1).join("")}\\dot{${d[d.length - 1]}}`;
      }
      case "bigop": {
        const lower = s(0), upper = s(1);
        const op = node.op === "int" ? "\\int" : "\\sum";
        const limits = (lower ? `_{${lower}}` : "") + (upper ? `^{${upper}}` : "");
        return joinTex([op + limits, " ", s(2)]).replace(/ $/, "");
      }
      case "over": return `${OVER[node.kind]}{${s(0)}}`;
      default: return this.atom(node, prev);
    }
  }
}

// ---------------------------------------------------------------- mhchem

const CE_REL: Record<string, string> = { to: " -> ", equilibrium: " <=> ", eq: " = " };

/** True when a chemistry document actually contains chemistry. */
export function hasChemistry(row: Row): boolean {
  const found = (r: Row): boolean =>
    r.some((n) => n.t === "element" || n.t === "state" || (n.t === "rel" && (n.v === "to" || n.v === "equilibrium")) ||
      slotsOf(n).some(found));
  return found(row);
}

class ChemWriter {
  constructor(private readonly math: MathWriter) {}

  /** Embed a maths fragment inside \ce as `$…$`. */
  private m(latex: string): string {
    return latex ? `$${latex}$` : "";
  }

  row(row: Row, inScript = false): string {
    return row.map((n, i) => this.node(n, row, i, inScript)).join("");
  }

  private body(node: Node, k: number, inScript: boolean): string {
    const r = slotsOf(node)[k] ?? [];
    return r.length ? this.row(r, inScript) : this.m(this.math.slot(node, k, r));
  }

  node(node: Node, row: Row, i: number, inScript: boolean): string {
    switch (node.t) {
      case "element": case "num": return node.v;
      case "var": return GREEK[node.v] ? this.m(`\\${GREEK[node.v]}`) : node.v;
      case "state": return `(${node.v})`;
      case "op":
        if (node.v === "plus") return inScript ? "+" : " + ";
        if (node.v === "minus") return inScript || isUnary(row, i) ? "-" : " - ";
        if (node.v === "cdot" || node.v === "times") return "*";
        return ` ${this.m(this.math.atom(node, row[i - 1]))} `;
      case "rel": return CE_REL[node.v] ?? ` ${this.m(this.math.atom(node, row[i - 1]))} `;
      case "sym":
        if (node.v === "uparrow") return " ^";
        if (node.v === "downarrow") return " v";
        return this.m(this.math.atom(node, row[i - 1]));
      case "unit": {
        const info = unitInfo(node.v);
        return /^[A-Za-z]+$/.test(node.v) ? ` ${node.v}` : ` ${this.m(info?.latex ?? node.v)}`;
      }
      case "sub":
        return isAllDigits(node.body) && !inScript ? this.row(node.body, true) : `_{${this.body(node, 0, true)}}`;
      case "sup": return `^{${this.body(node, 0, true)}}`;
      case "subsup": return `^{${this.body(node, 1, true)}}_{${this.body(node, 0, true)}}`;
      case "fence": {
        const open = node.open === "{" ? "\\{" : node.open;
        const close = node.close === "}" ? "\\}" : node.close;
        return `${open}${this.body(node, 0, inScript)}${close}`;
      }
      default: return this.m(this.math.node(node, row, i));
    }
  }
}

/** Serialise a document to LaTeX. An empty document gives an empty string. */
export function toLatex(document: MathDocument, options: LatexOptions = {}): string {
  const math = new MathWriter(options.placeholder ?? "square");
  if (document.root.length === 0) return "";
  if (document.subject === "chemistry" && options.chemistry !== "plain" && hasChemistry(document.root)) {
    const body = new ChemWriter(math).row(document.root).replace(/\s+/g, " ").trim();
    return `\\ce{${body}}`;
  }
  return math.row(document.root);
}

/** Serialise a bare row as maths LaTeX (no chemistry wrapping). */
export function rowToLatex(row: Row, options: LatexOptions = {}): string {
  return new MathWriter(options.placeholder ?? "square").row(row);
}
