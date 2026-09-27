/**
 * Presentation MathML Core (spec §6.4). For native rendering and assistive
 * technology; not intended for LLM prompts.
 */
import type { FenceChar, MathDocument, Node, Row } from "../model/types.js";
import { unitInfo } from "../model/vocabulary.js";
import { isOptionalSlot, slotsOf } from "../model/slots.js";
import { isAllDigits, isBaseless } from "./common.js";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const mi = (s: string, upright = false) => `<mi${upright ? ' mathvariant="normal"' : ""}>${esc(s)}</mi>`;
const mo = (s: string, attrs = "") => `<mo${attrs}>${esc(s)}</mo>`;
const mrow = (parts: string[]) => (parts.length === 1 ? (parts[0] as string) : `<mrow>${parts.join("")}</mrow>`);

const CONST: Record<string, string> = { pi: "π", e: "e", i: "i", infinity: "∞" };
const OP: Record<string, string> = { plus: "+", minus: "−", times: "×", cdot: "·", div: "÷", slash: "/", pm: "±", mp: "∓" };
const REL: Record<string, string> = {
  eq: "=", neq: "≠", lt: "<", gt: ">", le: "≤", ge: "≥", approx: "≈", equiv: "≡", propto: "∝",
  to: "→", equilibrium: "⇌", implies: "⇒", iff: "⇔", ratio: ":",
};
const FN: Record<string, string> = {
  sin: "sin", cos: "cos", tan: "tan", sec: "sec", cosec: "cosec", cot: "cot", ln: "ln", log: "log", exp: "exp",
};
const SYM: Record<string, string> = {
  degree: "°", factorial: "!", percent: "%", comma: ",", prime: "′", ellipsis: "…",
  uparrow: "↑", downarrow: "↓", delta: "Δ", therefore: "∴",
};
const OVER: Record<string, string> = { bar: "¯", vec: "→", hat: "^" };

class MathMLWriter {
  slot(node: Node, k: number): string {
    const r = slotsOf(node)[k] ?? [];
    if (r.length) return this.row(r);
    return isOptionalSlot(node, k) ? "<mrow></mrow>" : mo("□");
  }

  row(row: Row): string {
    const out: string[] = [];
    for (let i = 0; i < row.length; i++) {
      const node = row[i] as Node;
      if (node.t === "num") {
        let j = i;
        while (row[j + 1]?.t === "num") j++;
        out.push(`<mn>${row.slice(i, j + 1).map((n) => (n as { v: string }).v).join("")}</mn>`);
        i = j;
        continue;
      }
      if (node.t === "sup" || node.t === "sub" || node.t === "subsup") {
        const base = isBaseless(row[i - 1]) || out.length === 0 ? "<mrow></mrow>" : (out.pop() as string);
        if (node.t === "sup") out.push(`<msup>${base}${this.slot(node, 0)}</msup>`);
        else if (node.t === "sub") out.push(`<msub>${base}${this.slot(node, 0)}</msub>`);
        else out.push(`<msubsup>${base}${this.slot(node, 0)}${this.slot(node, 1)}</msubsup>`);
        continue;
      }
      out.push(this.node(node, row, i));
    }
    return mrow(out.length ? out : ["<mrow></mrow>"]);
  }

  node(node: Node, row: Row, i: number): string {
    const s = (k: number) => this.slot(node, k);
    switch (node.t) {
      case "var": return mi(node.v, /^[ΓΔΘΛΞΠΣΦΨΩ]$/.test(node.v));
      case "const": return mi(CONST[node.v] ?? node.v);
      case "op": return mo(OP[node.v] ?? node.v);
      case "rel": return mo(REL[node.v] ?? node.v);
      case "fn": {
        const inv = /^arc(sin|cos|tan)$/.exec(node.v);
        if (inv) return `<msup>${mi(inv[1] as string)}<mrow>${mo("−")}<mn>1</mn></mrow></msup>`;
        return mi(FN[node.v] ?? node.v);
      }
      case "sym": return node.v === "degree" ? mo("°") : mo(SYM[node.v] ?? node.v);
      case "text": return `<mtext>&#xA0;${esc(node.v)}&#xA0;</mtext>`;
      case "unit": {
        const prev = row[i - 1];
        const space = prev && prev.t !== "op" && prev.t !== "rel" ? '<mspace width="0.167em"></mspace>' : "";
        return space + mi(unitInfo(node.v)?.symbol ?? node.v, true);
      }
      case "element": return mi(node.v, true);
      case "state": return `${mo("(")}${mi(node.v, true)}${mo(")")}`;
      case "frac": return `<mfrac>${s(0)}${s(1)}</mfrac>`;
      case "deriv": return `<mfrac><mrow>${mi("d")}${node.num.length ? s(0) : ""}</mrow><mrow>${mi("d")}${s(1)}</mrow></mfrac>`;
      case "root": return node.index ? `<mroot>${s(1)}${s(0)}</mroot>` : `<msqrt>${s(0)}</msqrt>`;
      case "fence": {
        const f = (c: FenceChar) => mo(c, ' fence="true" stretchy="true"');
        return `<mrow>${f(node.open)}${s(0)}${f(node.close)}</mrow>`;
      }
      case "vector": {
        const rows: string[] = [];
        for (let r = 0; r < node.rows; r++) {
          const cells = Array.from({ length: node.cols }, (_, c) => `<mtd>${s(r * node.cols + c)}</mtd>`);
          rows.push(`<mtr>${cells.join("")}</mtr>`);
        }
        return `<mrow>${mo("(")}<mtable>${rows.join("")}</mtable>${mo(")")}</mrow>`;
      }
      case "recurring": {
        if (!isAllDigits(node.body)) return `<mover>${s(0)}${mo("˙")}</mover>`;
        const d = node.body.map((n) => (n as { v: string }).v);
        return `<mrow>${d.map((x, k) => (k === 0 || k === d.length - 1 ? `<mover><mn>${x}</mn>${mo("˙")}</mover>` : `<mn>${x}</mn>`)).join("")}</mrow>`;
      }
      case "bigop": {
        const sign = mo(node.op === "int" ? "∫" : "∑");
        const op = node.lower.length || node.upper.length ? `<munderover>${sign}${s(0)}${s(1)}</munderover>` : sign;
        return `<mrow>${op}${s(2)}</mrow>`;
      }
      case "over": return `<mover accent="true">${s(0)}${mo(OVER[node.kind] ?? "")}</mover>`;
      default: return "";
    }
  }
}

/** Serialise a document to a `<math>` element string. */
export function toMathML(document: MathDocument): string {
  const body = document.root.length ? new MathMLWriter().row(document.root) : "";
  return `<math xmlns="http://www.w3.org/1998/Math/MathML">${body}</math>`;
}
