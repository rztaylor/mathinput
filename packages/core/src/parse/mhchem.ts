/**
 * Parser for the mhchem subset MathInput emits (spec §6.1, §7.7): formulas,
 * coefficients, charges, isotopes, states, arrows, hydrates, gas and
 * precipitate marks, and `$…$` maths fragments. Also parses chemistry in
 * linear text, which uses the same syntax without the `\ce{}` wrapper.
 */
import type { FenceChar, FnName, Node, Row } from "../model/types.js";
import { el, fence, fn, num, op, rel, st, sym, unit, v } from "../model/builders.js";
import { ELEMENT_SET, unitInfo } from "../model/vocabulary.js";
import { ParseError, finishRow } from "./common.js";
import { parseLatexRow } from "./latex.js";

const FUNCTIONS = new Set(["sin", "cos", "tan", "ln", "log", "exp"]);
const CLOSE: Record<string, FenceChar> = { "(": ")", "[": "]", "{": "}" };

class ChemParser {
  private i = 0;
  /** True at the start of a formula: digits here are coefficients, not subscripts. */
  private formulaStart = true;

  constructor(private readonly s: string, private readonly inScript = false) {}

  parse(stopAt?: string): Row {
    const row: Row = [];
    const s = this.s;
    while (this.i < s.length) {
      const c = s[this.i] as string;
      if (stopAt && c === stopAt) return row;
      if (/\s/.test(c)) {
        this.i++;
        this.formulaStart = true;
        // " ^" at the end of a formula is gas given off; " v" a precipitate.
        const rest = s.slice(this.i);
        if (/^\^(\s|$)/.test(rest)) { row.push(sym("uparrow")); this.i++; }
        else if (/^v(\s|$)/.test(rest)) { row.push(sym("downarrow")); this.i++; }
        continue;
      }
      if (s.startsWith("->", this.i)) { row.push(rel("to")); this.i += 2; this.formulaStart = true; continue; }
      if (s.startsWith("<=>", this.i)) { row.push(rel("equilibrium")); this.i += 3; this.formulaStart = true; continue; }
      if (c === "$") { this.mathFragment(row); continue; }
      if (c === "\\" && (s[this.i + 1] === "{" || s[this.i + 1] === "}")) {
        const ch = s[this.i + 1] as string;
        this.i += 2;
        if (ch === "{") this.bracket("{", row);
        else if (stopAt === "}") return row;
        else throw new ParseError("Unmatched brace", this.i - 2, "\\}");
        continue;
      }
      // mhchem charge shorthand: Na+ and Cl- (sign straight after a formula, then a space or the end).
      if ((c === "+" || c === "-") && !this.inScript && this.i > 0 && !/\s/.test(s[this.i - 1] as string)) {
        const prev = row[row.length - 1];
        const after = s[this.i + 1];
        if ((prev?.t === "element" || prev?.t === "sub" || prev?.t === "fence") && (after === undefined || /[\s)\]]/.test(after))) {
          row.push({ t: "sup", body: [op(c === "+" ? "plus" : "minus")] });
          this.i++;
          continue;
        }
      }
      switch (c) {
        case "=": row.push(rel("eq")); this.i++; this.formulaStart = true; continue;
        case "+": row.push(op("plus")); this.i++; this.formulaStart = !this.inScript; continue;
        case "-": row.push(op("minus")); this.i++; this.formulaStart = !this.inScript; continue;
        case "*": row.push(op("cdot")); this.i++; this.formulaStart = true; continue;
        case "^": this.script("sup", row); continue;
        case "_": this.script("sub", row); continue;
        case "(": case "[": case "{": this.i++; this.bracket(c, row); continue;
        case ")": case "]": case "}":
          if (stopAt && (c === ")" || c === "]")) return row;
          throw new ParseError("Unmatched bracket", this.i, c);
      }
      if (/[0-9.]/.test(c)) { this.digits(row); continue; }
      if (/[A-Z]/.test(c)) { this.element(row); continue; }
      if (/[a-z]/.test(c)) { this.lower(row); continue; }
      throw new ParseError("Unsupported character in chemistry", this.i, c);
    }
    if (stopAt) throw new ParseError(`Missing "${stopAt}"`, this.i, stopAt);
    return row;
  }

  private digits(row: Row): void {
    const m = /^[0-9.]+/.exec(this.s.slice(this.i)) as RegExpExecArray;
    this.i += m[0].length;
    const ds = Array.from(m[0]).map((d) => num(d as "0"));
    const prev = row[row.length - 1];
    const attach = !this.inScript && !this.formulaStart && prev &&
      (prev.t === "element" || prev.t === "fence" || prev.t === "var");
    if (attach) row.push({ t: "sub", body: ds });
    else row.push(...ds);
    this.formulaStart = false;
  }

  private element(row: Row): void {
    const two = this.s.slice(this.i, this.i + 2);
    const one = this.s[this.i] as string;
    if (two.length === 2 && /[a-z]/.test(two[1] as string) && ELEMENT_SET.has(two)) { row.push(el(two)); this.i += 2; }
    else if (ELEMENT_SET.has(one)) { row.push(el(one)); this.i++; }
    else { row.push(v(one)); this.i++; }
    this.formulaStart = false;
  }

  private lower(row: Row): void {
    const m = /^[a-z]+/.exec(this.s.slice(this.i)) as RegExpExecArray;
    const word = m[0];
    if (FUNCTIONS.has(word)) { row.push(fn(word as FnName)); this.i += word.length; return; }
    // Units written in chemistry text, such as "mol" or "kJ".
    const unitMatch = /^[A-Za-zμ]+/.exec(this.s.slice(this.i))?.[0];
    if (unitMatch && unitMatch.length > 1 && unitInfo(unitMatch) && this.formulaStart) {
      row.push(unit(unitMatch));
      this.i += unitMatch.length;
      return;
    }
    const c = word[0] as string;
    this.i++;
    row.push(c === "e" ? el("e") : v(c));
    this.formulaStart = false;
  }

  private bracket(open: "(" | "[" | "{", row: Row): void {
    // State symbols.
    const m = /^(s|l|g|aq)\)/.exec(this.s.slice(this.i));
    if (open === "(" && m) {
      row.push(st(m[1] as "s"));
      this.i += m[0].length;
      return;
    }
    const inner = new ChemParser(this.s, this.inScript);
    inner.i = this.i;
    const stop = CLOSE[open] as string;
    const body = inner.parse(open === "{" ? "}" : stop);
    this.i = inner.i;
    const close = this.s[this.i] === "\\" ? "}" : (this.s[this.i] as string);
    this.i += this.s[this.i] === "\\" ? 2 : 1;
    row.push(fence(body, open, (close === ")" || close === "]" || close === "}" ? close : stop) as FenceChar));
    this.formulaStart = false;
  }

  private group(): Row {
    if (this.s[this.i] === "{") {
      this.i++;
      const inner = new ChemParser(this.s, true);
      inner.i = this.i;
      const body = inner.parse("}");
      this.i = inner.i + 1;
      return body;
    }
    // Unbraced charge such as ^2+ or ^-.
    const m = /^[0-9]*[+-]?/.exec(this.s.slice(this.i)) as RegExpExecArray;
    if (!m[0]) throw new ParseError("Expected a script", this.i, this.s[this.i]);
    this.i += m[0].length;
    return new ChemParser(m[0], true).parse();
  }

  private script(kind: "sup" | "sub", row: Row): void {
    this.i++;
    const body = this.group();
    const last = row[row.length - 1];
    // Isotope: ^{14}_{6}C.
    if (kind === "sub" && last?.t === "sup" && this.formulaStartBefore(row)) {
      row[row.length - 1] = { t: "subsup", sub: body, sup: last.body };
      return;
    }
    if (kind === "sup" && last?.t === "sub" && !row.slice(0, -1).length) {
      row.push({ t: "sup", body });
      return;
    }
    row.push({ t: kind, body });
    this.formulaStart = false;
  }

  /** The script at the end of `row` started a formula (nothing formula-like before it). */
  private formulaStartBefore(row: Row): boolean {
    const before = row[row.length - 2];
    return !before || before.t === "op" || before.t === "rel";
  }

  private mathFragment(row: Row): void {
    const end = this.s.indexOf("$", this.i + 1);
    if (end < 0) throw new ParseError("Unclosed $", this.i, "$");
    const latex = this.s.slice(this.i + 1, end);
    this.i = end + 1;
    row.push(...(parseLatexRow(latex, "chemistry") as Node[]));
    this.formulaStart = true;
  }
}

/** Parse the content of `\ce{…}` (or chemistry linear text) into a row. */
export function parseMhchem(src: string): Row {
  return finishRow(new ChemParser(src).parse());
}
