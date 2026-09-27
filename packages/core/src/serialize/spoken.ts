/**
 * Spoken English (spec §6.3), a simplified ClearSpeak style. Numbers are left
 * as numerals so screen readers read them in the user's locale.
 */
import type { MathDocument, Node, Row } from "../model/types.js";
import { GREEK, unitInfo } from "../model/vocabulary.js";
import { isOptionalSlot, slotsOf } from "../model/slots.js";
import { digits, isAllDigits, isMixedFraction, isUnary } from "./common.js";
import { hasChemistry } from "./latex.js";

const CONST: Record<string, string> = { pi: "pi", e: "e", i: "i", infinity: "infinity" };
const OP: Record<string, string> = {
  plus: "plus", minus: "minus", times: "times", cdot: "times", div: "divided by", slash: "divided by",
  pm: "plus or minus", mp: "minus or plus",
};
const REL: Record<string, string> = {
  eq: "equals", neq: "is not equal to", lt: "is less than", gt: "is greater than",
  le: "is less than or equal to", ge: "is greater than or equal to", approx: "is approximately equal to",
  equiv: "is identical to", propto: "is proportional to", to: "tends to", equilibrium: "is in equilibrium with",
  implies: "implies", iff: "if and only if", ratio: "to",
};
const FN: Record<string, string> = {
  sin: "sine", cos: "cosine", tan: "tangent", arcsin: "inverse sine", arccos: "inverse cosine",
  arctan: "inverse tangent", sec: "secant", cosec: "cosecant", cot: "cotangent", ln: "natural log",
  log: "log", exp: "exp",
};
const SYM: Record<string, string> = {
  degree: "degrees", factorial: "factorial", percent: "percent", comma: ",", prime: "prime",
  ellipsis: "dot dot dot", uparrow: "gas given off", downarrow: "precipitate", delta: "heat", therefore: "therefore",
};
const STATE: Record<string, string> = { s: "solid", l: "liquid", g: "gas", aq: "aqueous" };
const OPEN: Record<string, string> = { "(": "open bracket", "[": "open square bracket", "{": "open brace", "|": "open bar" };
const CLOSE: Record<string, string> = { ")": "close bracket", "]": "close square bracket", "}": "close brace", "|": "close bar" };

function greekName(letter: string): string {
  const name = GREEK[letter];
  if (!name) return letter;
  return name[0] === name[0]?.toUpperCase() ? `capital ${name.toLowerCase()}` : name;
}

/** One spoken token for a row that is a single number or letter, else null. */
function simple(row: Row): string | null {
  if (row.length === 0) return "blank";
  if (isAllDigits(row)) return digits(row);
  if (row.length === 1 && row[0]?.t === "var") return greekName(row[0].v);
  if (row.length === 2 && row[0]?.t === "op" && row[0].v === "minus" && row[1]?.t === "num") return `negative ${row[1].v}`;
  if (row[0]?.t === "op" && row[0].v === "minus" && isAllDigits(row.slice(1))) return `negative ${digits(row.slice(1))}`;
  return null;
}

function powerWords(body: Row, spoken: string): string {
  const d = isAllDigits(body) ? digits(body) : null;
  if (d === "2") return "squared";
  if (d === "3") return "cubed";
  return simple(body) !== null ? `to the power ${spoken}` : `to the power ${spoken}, end power`;
}

const next0 = (row: Row, i: number): Node | undefined => row[i + 1];

class SpokenWriter {
  constructor(private readonly chem: boolean) {}

  slot(node: Node, k: number): string {
    const r = slotsOf(node)[k] ?? [];
    if (r.length) return this.row(r);
    return isOptionalSlot(node, k) ? "" : "blank";
  }

  row(row: Row): string {
    const words: string[] = [];
    for (let i = 0; i < row.length; i++) {
      const node = row[i] as Node;
      // Merge digit runs into one number, including recurring digits: "0.3 recurring".
      if (node.t === "num") {
        let j = i;
        while (row[j + 1]?.t === "num") j++;
        let n = digits(row.slice(i, j + 1));
        const after = row[j + 1];
        if (after?.t === "recurring" && isAllDigits(after.body) && n.endsWith(".")) {
          n += `${digits(after.body)} recurring`;
          j++;
        }
        words.push(n);
        i = j;
        continue;
      }
      // "m / s" reads "metres per second".
      if (node.t === "op" && node.v === "slash" && row[i - 1]?.t === "unit" && next0(row, i)?.t === "unit") {
        const u = next0(row, i) as { v: string };
        words.push(`per ${unitInfo(u.v)?.name ?? u.v}`);
        i++;
        continue;
      }
      // Unit with a negative power: "per second squared".
      const next = row[i + 1];
      if (node.t === "unit" && next?.t === "sup" && next.body[0]?.t === "op" && next.body[0].v === "minus" && isAllDigits(next.body.slice(1))) {
        const info = unitInfo(node.v);
        const n = digits(next.body.slice(1));
        const tail = n === "1" ? "" : n === "2" ? " squared" : n === "3" ? " cubed" : ` to the power ${n}`;
        words.push(`per ${info?.name ?? node.v}${tail}`);
        i++;
        continue;
      }
      words.push(this.node(node, row, i));
    }
    return words.filter(Boolean).join(" ").replace(/ ,/g, ",").replace(/\s+/g, " ").trim();
  }

  node(node: Node, row: Row, i: number): string {
    const s = (k: number) => this.slot(node, k);
    switch (node.t) {
      case "num": return node.v;
      case "var": return greekName(node.v);
      case "const": return CONST[node.v] ?? node.v;
      case "op":
        if (node.v === "minus" && this.chem) return "minus";
        if (node.v === "minus" && isUnary(row, i)) return "negative";
        if (node.v === "slash" && (row[i - 1]?.t === "unit" || row[i + 1]?.t === "unit")) return "per";
        if (this.chem && node.v === "cdot") return "dot";
        return OP[node.v] ?? node.v;
      case "rel":
        if (this.chem && node.v === "to") return "reacts to give";
        return REL[node.v] ?? node.v;
      case "fn": return FN[node.v] ?? node.v;
      case "sym": return SYM[node.v] ?? node.v;
      case "text": return node.v;
      case "unit": return unitInfo(node.v)?.plural ?? node.v;
      case "element": return Array.from(node.v).join(" ");
      case "state": return STATE[node.v] ?? node.v;
      case "frac": {
        const n = simple(node.num), d = simple(node.den);
        const lead = isMixedFraction(row, i) ? "and " : "";
        return n !== null && d !== null ? `${lead}${n} over ${d}` : `${lead}fraction, ${s(0)}, over, ${s(1)}, end fraction`;
      }
      case "deriv": return `d ${s(0)} by d ${s(1)}`.replace(/\s+/g, " ");
      case "sup": {
        const prev = row[i - 1];
        if (this.chem && (prev?.t === "element" || prev?.t === "fence" || prev?.t === "sub")) return `with charge ${s(0)}`;
        return powerWords(node.body, s(0));
      }
      case "sub": return this.chem && isAllDigits(node.body) ? s(0) : `sub ${s(0)}`;
      case "subsup":
        return this.chem ? `with mass number ${s(1)} and atomic number ${s(0)}` : `sub ${s(0)}, ${powerWords(node.sup, s(1))}`;
      case "root": {
        if (!node.index) return `the square root of ${s(0)}, end root`;
        const idx = simple(node.index);
        const name = idx === "3" ? "the cube root" : `the root ${s(0)}`;
        return `${name} of ${s(1)}, end root`;
      }
      case "fence": {
        if (node.open === "|" && node.close === "|" && !node.openGhost && !node.closeGhost) return `the modulus of ${s(0)}`;
        const open = node.openGhost ? "" : OPEN[node.open] ?? node.open;
        const close = node.closeGhost ? ", bracket not closed" : ` ${CLOSE[node.close] ?? node.close}`;
        const lead = node.openGhost ? "bracket not opened, " : `${open} `;
        return `${lead}${s(0)}${close}`;
      }
      case "vector": {
        if (node.cols === 1) return `column vector ${node.cells.map((_, k) => s(k)).join(", ")}, end vector`;
        const rows: string[] = [];
        for (let r = 0; r < node.rows; r++) {
          rows.push(`row ${r + 1}: ${Array.from({ length: node.cols }, (_, c) => s(r * node.cols + c)).join(", ")}`);
        }
        return `matrix, ${rows.join("; ")}, end matrix`;
      }
      case "recurring": return `${s(0)} recurring`;
      case "bigop": {
        const name = node.op === "int" ? "the integral" : "the sum";
        const lower = s(0), upper = s(1);
        const limits = lower || upper ? ` from ${lower || "blank"} to ${upper || "blank"}` : "";
        return `${name}${limits} of ${s(2)}`;
      }
      case "over":
        return node.kind === "bar" ? `${s(0)} bar` : node.kind === "hat" ? `${s(0)} hat` : `vector ${s(0)}`;
    }
  }
}

/** Serialise a document as spoken English. An empty document is "empty". */
export function toSpoken(document: MathDocument): string {
  if (document.root.length === 0) return "empty";
  const chem = document.subject === "chemistry" && hasChemistry(document.root);
  return new SpokenWriter(chem).row(document.root);
}
