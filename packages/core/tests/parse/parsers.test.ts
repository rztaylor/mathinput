import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  MIME_LATEX, MIME_TEXT, MIME_TREE, ParseError, decodeClipboard, encodeClipboard, fromLatex, fromText, toLatex, toText,
} from "../../src/index.js";
import { doc, frac, row } from "../../src/model/builders.js";
import { ALL } from "../golden/cases.js";

const latex = (src: string, subject: "maths" | "chemistry" | "physics" = "maths") => toLatex(fromLatex(src, subject));
const text = (src: string, subject: "maths" | "chemistry" | "physics" = "maths") => toText(fromText(src, subject));

describe("LaTeX variants people actually paste", () => {
  it.each([
    ["x^2", "x^{2}"],
    ["x_n^2", "x_{n}^{2}"],
    ["x^{2}_{n}", "x_{n}^{2}"],
    ["\\dfrac{1}{2}", "\\frac{1}{2}"],
    ["\\tfrac12", "\\frac{1}{2}"],
    ["\\frac 3 4", "\\frac{3}{4}"],
    ["2 \\cdot 3", "2\\cdot 3"],
    ["a \\times b", "a\\times b"],
    ["\\left( x+1 \\right)^2", "(x+1)^{2}"],
    ["\\left[\\frac{1}{2}\\right]", "\\left[\\frac{1}{2}\\right]"],
    ["\\sqrt[3]{x}", "\\sqrt[3]{x}"],
    ["\\sin(x)", "\\sin(x)"],
    ["\\sin^{-1} x", "\\sin^{-1}x"],
    ["\\arcsin x", "\\sin^{-1}x"],
    ["\\csc x", "\\operatorname{cosec}x"],
    ["30^\\circ", "30^{\\circ}"],
    ["x \\ne 0", "x\\neq 0"],
    ["x \\le 3", "x\\leq 3"],
    ["\\mathrm{d}y", "dy"],
    ["\\text{or}", "\\text{ or }"],
    ["\\overline{x}", "\\bar{x}"],
    ["\\{1, 2\\}", "\\{1,2\\}"],
    ["\\lvert x \\rvert", "|x|"],
    ["\\begin{bmatrix}1\\\\2\\end{bmatrix}", "\\begin{pmatrix}1 \\\\ 2\\end{pmatrix}"],
    ["\\int_0^1 x\\,dx", "\\int_{0}^{1} xdx"],
    ["\\sum_{r=1}^{n} r = \\frac{n(n+1)}{2}", "\\sum_{r=1}^{n} r=\\frac{n(n+1)}{2}"],
    ["0.\\dot{3}", "0.\\dot{3}"],
    ["3.0\\,\\mathrm{m\\,s^{-2}}", "3.0\\,\\mathrm{m}\\,\\mathrm{s}^{-2}"],
    ["\\frac{d}{dx}x^2", "\\frac{d}{dx}x^{2}"],
  ])("%s", (input, out) => {
    expect(latex(input)).toBe(out);
  });

  it("reads units after a thin space", () => {
    expect(fromLatex("5\\,\\mathrm{kg}", "physics").root.map((n) => n.t)).toEqual(["num", "unit"]);
  });

  it("reads state symbols in maths LaTeX", () => {
    const d = fromLatex("\\mathrm{Mg}(\\mathrm{s})", "chemistry");
    expect(d.root.map((n) => n.t)).toEqual(["element", "state"]);
  });

  it("keeps an unmatched bracket as a ghost", () => {
    const d = fromLatex("(x+1");
    expect(d.root[0]).toMatchObject({ t: "fence", closeGhost: true });
    expect(fromLatex("x+1)").root[0]).toMatchObject({ t: "fence", openGhost: true });
  });
});

describe("mhchem variants", () => {
  it.each([
    ["\\ce{H2O}", "\\ce{H2O}"],
    ["\\ce{2H2 + O2 -> 2H2O}", "\\ce{2H2 + O2 -> 2H2O}"],
    ["\\ce{Fe^3+}", "\\ce{Fe^{3+}}"],
    ["\\ce{SO4^2-}", "\\ce{SO4^{2-}}"],
    ["\\ce{Na+ + Cl- -> NaCl}", "\\ce{Na^{+} + Cl^{-} -> NaCl}"],
    ["\\ce{CaCO3 -> CaO + CO2 ^}", "\\ce{CaCO3 -> CaO + CO2 ^}"],
    ["\\ce{Ag+ + Cl- -> AgCl v}", "\\ce{Ag^{+} + Cl^{-} -> AgCl v}"],
  ])("%s", (input, out) => {
    expect(latex(input, "chemistry")).toBe(out);
  });
});

describe("parse errors are clear", () => {
  it.each([
    ["\\frac{1}", "Missing argument"],
    ["\\foo{x}", "Unsupported command \\foo"],
    ["x^", "Missing argument"],
    ["\\left( x", "Missing \\right"],
    ["{x", "Expected \"}\""],
    ["\\begin{cases}x\\end{cases}", "Unsupported environment cases"],
    ["x # y", "Unsupported character"],
  ])("%s", (input, message) => {
    expect(() => fromLatex(input)).toThrow(ParseError);
    expect(() => fromLatex(input)).toThrow(message);
  });

  it("reports the position", () => {
    try {
      fromLatex("x+\\foo");
      expect.unreachable();
    } catch (e) {
      expect((e as ParseError).position).toBe(2);
    }
  });
});

describe("linear text", () => {
  it.each([
    ["x^2 + 2x + 1", "x^2 + 2x + 1"],
    ["(a+b)/(c+d)", "(a + b) / (c + d)"],
    ["1/2x", "1/2 x"],
    ["sqrt(x+1)", "sqrt(x + 1)"],
    ["sin(30 deg)", "sin(30 deg)"],
    ["x <= 3", "x <= 3"],
    ["theta", "theta"],
    ["2 1/2", "2 1/2"],
    ["dy/dx = 3x^2", "dy/dx = 3x^2"],
  ])("%s", (input, out) => {
    expect(text(input)).toBe(out);
  });

  it("reads physics units only after numbers or units", () => {
    expect(fromText("m = 5 kg", "physics").root.map((n) => n.t)).toEqual(["var", "rel", "num", "unit"]);
  });

  it("never reads units in maths", () => {
    expect(fromText("5 kg", "maths").root.map((n) => n.t)).toEqual(["num", "var", "var"]);
  });

  it("parses chemistry text", () => {
    expect(toLatex(fromText("2Na + Cl2 -> 2NaCl", "chemistry"))).toBe("\\ce{2Na + Cl2 -> 2NaCl}");
    expect(toLatex(fromText("NaCl", "chemistry"))).toBe("\\ce{NaCl}");
  });

  it("treats ? as an empty box", () => {
    expect(fromText("1/?").root).toEqual([frac("1", [])]);
  });
});

describe("clipboard", () => {
  const d = doc("maths", frac(row("x", { t: "op", v: "plus" }, "1"), "2"));

  it("encodes three flavours", () => {
    const data = encodeClipboard(d.root, "maths");
    expect(data[MIME_LATEX]).toBe("\\frac{x+1}{2}");
    expect(data[MIME_TEXT]).toBe("(x + 1) / 2");
    expect(JSON.parse(data[MIME_TREE] as string).root).toEqual(d.root);
  });

  it("prefers the tree", () => {
    expect(decodeClipboard(encodeClipboard(d.root, "maths"), "maths")).toEqual(d.root);
  });

  it("falls back to LaTeX, then text", () => {
    expect(decodeClipboard({ [MIME_LATEX]: "$\\frac{x+1}{2}$" }, "maths")).toEqual(d.root);
    expect(decodeClipboard({ [MIME_TEXT]: "\\frac{x+1}{2}" }, "maths")).toEqual(d.root);
    expect(decodeClipboard({ [MIME_TEXT]: "(x+1)/2" }, "maths")).toEqual(d.root);
  });

  it("ignores a corrupt tree and uses text", () => {
    expect(decodeClipboard({ [MIME_TREE]: "{nope", [MIME_TEXT]: "(x+1)/2" }, "maths")).toEqual(d.root);
  });

  it("returns nothing for empty data and throws on nonsense", () => {
    expect(decodeClipboard({}, "maths")).toEqual([]);
    expect(() => decodeClipboard({ [MIME_TEXT]: "x # y" }, "maths")).toThrow(ParseError);
  });
});

describe("parser fuzz", () => {
  const vocabulary = [...new Set(ALL.flatMap((c) => c.latex.match(/\\[A-Za-z]+|\\.|[^\\]/g) ?? []))];
  it("either parses or throws ParseError, never anything else", () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...vocabulary), { maxLength: 30 }), fc.constantFrom("maths", "chemistry", "physics"), (parts, subject) => {
        const src = parts.join("");
        try {
          const d = fromLatex(src, subject as "maths");
          toLatex(d); toText(d);
        } catch (e) {
          if (!(e instanceof ParseError)) throw e;
        }
      }),
      { numRuns: 3000 },
    );
  });

  it("text parser either parses or throws ParseError", () => {
    const vocab = [...new Set(ALL.flatMap((c) => c.text.match(/[A-Za-z]+|\d+|\s+|[^\sA-Za-z\d]/g) ?? []))];
    fc.assert(
      fc.property(fc.array(fc.constantFrom(...vocab), { maxLength: 30 }), fc.constantFrom("maths", "chemistry", "physics"), (parts, subject) => {
        try {
          toText(fromText(parts.join(""), subject as "maths"));
        } catch (e) {
          if (!(e instanceof ParseError)) throw e;
        }
      }),
      { numRuns: 3000 },
    );
  });
});
