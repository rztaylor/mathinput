/**
 * Golden notation cases: the notation contract (spec §9). Each case pins the
 * LaTeX, linear text and spoken output for one tree. Review changes here like
 * API changes.
 */
import {
  abs, colvec, cst, deriv, doc, el, fence, fn, frac, integral, matrix, nroot, op, over, paren, recurring, rel,
  row, sqrt, st, sub, subsup, sum, sup, sym, text, unit,
} from "../../src/model/builders.js";
import type { MathDocument } from "../../src/model/types.js";

export interface GoldenCase {
  name: string;
  doc: MathDocument;
  latex: string;
  text: string;
  spoken: string;
}

const m = (...p: Parameters<typeof row>) => doc("maths", ...p);
const c = (...p: Parameters<typeof row>) => doc("chemistry", ...p);
const ph = (...p: Parameters<typeof row>) => doc("physics", ...p);
const plus = op("plus"), minus = op("minus"), eq = rel("eq");

export const MATHS: GoldenCase[] = [
  { name: "addition", doc: m("2", plus, "3", eq, "5"), latex: "2+3=5", text: "2 + 3 = 5", spoken: "2 plus 3 equals 5" },
  { name: "negative number", doc: m(minus, "4", plus, "7"), latex: "-4+7", text: "-4 + 7", spoken: "negative 4 plus 7" },
  { name: "times and divide", doc: m("6", op("times"), "3", op("div"), "2"), latex: "6\\times 3\\div 2", text: "6 * 3 / 2", spoken: "6 times 3 divided by 2" },
  { name: "decimal", doc: m("0.25"), latex: "0.25", text: "0.25", spoken: "0.25" },
  { name: "simple fraction", doc: m(frac("3", "4")), latex: "\\frac{3}{4}", text: "3/4", spoken: "3 over 4" },
  { name: "mixed number", doc: m("1", frac("1", "2")), latex: "1\\frac{1}{2}", text: "1 1/2", spoken: "1 and 1 over 2" },
  { name: "algebraic fraction", doc: m(frac(row("x", plus, "1"), "2")), latex: "\\frac{x+1}{2}", text: "(x + 1) / 2", spoken: "fraction, x plus 1, over, 2, end fraction" },
  { name: "recurring single", doc: m("0.", recurring("3")), latex: "0.\\dot{3}", text: "0.(3)", spoken: "0.3 recurring" },
  { name: "recurring block", doc: m("0.", recurring("142857")), latex: "0.\\dot{1}4285\\dot{7}", text: "0.(142857)", spoken: "0.142857 recurring" },
  { name: "percentage", doc: m("15", sym("percent")), latex: "15\\%", text: "15%", spoken: "15 percent" },
  { name: "ratio", doc: m("3", rel("ratio"), "2"), latex: "3:2", text: "3 : 2", spoken: "3 to 2" },
  { name: "square", doc: m("x", sup("2")), latex: "x^{2}", text: "x^2", spoken: "x squared" },
  { name: "cube", doc: m("x", sup("3")), latex: "x^{3}", text: "x^3", spoken: "x cubed" },
  { name: "power n", doc: m("a", sup("n")), latex: "a^{n}", text: "a^n", spoken: "a to the power n" },
  { name: "negative index", doc: m("x", sup(row(minus, "1"))), latex: "x^{-1}", text: "x^-1", spoken: "x to the power negative 1" },
  { name: "fractional index", doc: m("8", sup(frac("1", "3"))), latex: "8^{\\frac{1}{3}}", text: "8^(1/3)", spoken: "8 to the power 1 over 3, end power" },
  { name: "compound index", doc: m("2", sup(row("n", plus, "1"))), latex: "2^{n+1}", text: "2^(n + 1)", spoken: "2 to the power n plus 1, end power" },
  { name: "standard form", doc: m("3.2", op("times"), "10", sup(row(minus, "4"))), latex: "3.2\\times 10^{-4}", text: "3.2 * 10^-4", spoken: "3.2 times 10 to the power negative 4" },
  { name: "square root", doc: m(sqrt("2")), latex: "\\sqrt{2}", text: "sqrt(2)", spoken: "the square root of 2, end root" },
  { name: "surd", doc: m("3", sqrt("5")), latex: "3\\sqrt{5}", text: "3 sqrt(5)", spoken: "3 the square root of 5, end root" },
  { name: "cube root", doc: m(nroot("3", "27")), latex: "\\sqrt[3]{27}", text: "root(3, 27)", spoken: "the cube root of 27, end root" },
  { name: "nth root", doc: m(nroot("n", "x")), latex: "\\sqrt[n]{x}", text: "root(n, x)", spoken: "the root n of x, end root" },
  {
    name: "quadratic formula",
    doc: m("x", eq, frac(row(minus, "b", op("pm"), sqrt(row("b", sup("2"), minus, "4ac"))), "2a")),
    latex: "x=\\frac{-b\\pm\\sqrt{b^{2}-4ac}}{2a}",
    text: "x = (-b +/- sqrt(b^2 - 4ac)) / (2a)",
    spoken: "x equals fraction, negative b plus or minus the square root of b squared minus 4 a c, end root, over, 2 a, end fraction",
  },
  { name: "factorised", doc: m(paren("2x", minus, "1"), paren("x", minus, "3"), eq, "0"), latex: "(2x-1)(x-3)=0", text: "(2x - 1)(x - 3) = 0", spoken: "open bracket 2 x minus 1 close bracket open bracket x minus 3 close bracket equals 0" },
  { name: "bracket squared", doc: m(paren("x", plus, "1"), sup("2")), latex: "(x+1)^{2}", text: "(x + 1)^2", spoken: "open bracket x plus 1 close bracket squared" },
  { name: "tall bracket", doc: m(paren(frac("1", "2"), plus, "x")), latex: "\\left(\\frac{1}{2}+x\\right)", text: "(1/2 + x)", spoken: "open bracket 1 over 2 plus x close bracket" },
  { name: "square brackets", doc: m("2", fence(row("x", plus, "1"), "[", "]")), latex: "2[x+1]", text: "2[x + 1]", spoken: "2 open square bracket x plus 1 close square bracket" },
  { name: "modulus", doc: m(abs("x", minus, "3"), rel("lt"), "2"), latex: "|x-3|<2", text: "|x - 3| < 2", spoken: "the modulus of x minus 3 is less than 2" },
  { name: "compound inequality", doc: m(minus, "2", rel("lt"), "x", rel("le"), "3"), latex: "-2<x\\leq 3", text: "-2 < x <= 3", spoken: "negative 2 is less than x is less than or equal to 3" },
  { name: "not equal", doc: m("x", rel("neq"), "0"), latex: "x\\neq 0", text: "x != 0", spoken: "x is not equal to 0" },
  { name: "approximately", doc: m(cst("pi"), rel("approx"), "3.14"), latex: "\\pi\\approx 3.14", text: "pi ~= 3.14", spoken: "pi is approximately equal to 3.14" },
  { name: "identity", doc: m(paren("a", plus, "b"), sup("2"), rel("equiv"), "a", sup("2"), plus, "2ab", plus, "b", sup("2")), latex: "(a+b)^{2}\\equiv a^{2}+2ab+b^{2}", text: "(a + b)^2 === a^2 + 2ab + b^2", spoken: "open bracket a plus b close bracket squared is identical to a squared plus 2 a b plus b squared" },
  { name: "plus or minus", doc: m("x", eq, op("pm"), "3"), latex: "x=\\pm 3", text: "x = +/-3", spoken: "x equals plus or minus 3" },
  { name: "trig with degrees", doc: m(fn("sin"), "30", sym("degree"), eq, frac("1", "2")), latex: "\\sin 30^{\\circ}=\\frac{1}{2}", text: "sin 30 deg = 1/2", spoken: "sine 30 degrees equals 1 over 2" },
  { name: "trig of theta", doc: m(fn("cos"), "θ"), latex: "\\cos\\theta", text: "cos theta", spoken: "cosine theta" },
  { name: "trig with brackets", doc: m(fn("tan"), paren("2x")), latex: "\\tan(2x)", text: "tan(2x)", spoken: "tangent open bracket 2 x close bracket" },
  { name: "inverse trig", doc: m("x", eq, fn("arcsin"), paren("0.5")), latex: "x=\\sin^{-1}(0.5)", text: "x = arcsin(0.5)", spoken: "x equals inverse sine open bracket 0.5 close bracket" },
  { name: "sin squared", doc: m(fn("sin"), sup("2"), "x", plus, fn("cos"), sup("2"), "x", eq, "1"), latex: "\\sin^{2}x+\\cos^{2}x=1", text: "sin^2 x + cos^2 x = 1", spoken: "sine squared x plus cosine squared x equals 1" },
  { name: "log base", doc: m(fn("log"), sub("2"), "8", eq, "3"), latex: "\\log_{2}8=3", text: "log_2 8 = 3", spoken: "log sub 2 8 equals 3" },
  { name: "natural log", doc: m(fn("ln"), cst("e"), eq, "1"), latex: "\\ln e=1", text: "ln e = 1", spoken: "natural log e equals 1" },
  { name: "exponential", doc: m("y", eq, cst("e"), sup(row("2x"))), latex: "y=e^{2x}", text: "y = e^(2x)", spoken: "y equals e to the power 2 x, end power" },
  { name: "function notation", doc: m("f", paren("x"), eq, "3x", plus, "1"), latex: "f(x)=3x+1", text: "f(x) = 3x + 1", spoken: "f open bracket x close bracket equals 3 x plus 1" },
  { name: "inverse function", doc: m("f", sup(row(minus, "1")), paren("x")), latex: "f^{-1}(x)", text: "f^-1(x)", spoken: "f to the power negative 1 open bracket x close bracket" },
  { name: "sequence term", doc: m("u", sub("n"), eq, "2n", plus, "3"), latex: "u_{n}=2n+3", text: "u_n = 2n + 3", spoken: "u sub n equals 2 n plus 3" },
  { name: "subscript and power", doc: m("x", subsup("1", "2")), latex: "x_{1}^{2}", text: "x_1^2", spoken: "x sub 1, squared" },
  { name: "column vector", doc: m(colvec("3", row(minus, "4"))), latex: "\\begin{pmatrix}3 \\\\ -4\\end{pmatrix}", text: "vector(3, -4)", spoken: "column vector 3, negative 4, end vector" },
  { name: "matrix", doc: m(matrix([["1", "2"], ["3", "4"]])), latex: "\\begin{pmatrix}1 & 2 \\\\ 3 & 4\\end{pmatrix}", text: "matrix((1, 2), (3, 4))", spoken: "matrix, row 1: 1, 2; row 2: 3, 4, end matrix" },
  { name: "coordinates", doc: m(paren("3", sym("comma"), minus, "2")), latex: "(3,-2)", text: "(3, -2)", spoken: "open bracket 3, negative 2 close bracket" },
  { name: "mean", doc: m(over("bar", "x"), eq, "12"), latex: "\\bar{x}=12", text: "bar(x) = 12", spoken: "x bar equals 12" },
  { name: "factorial", doc: m("5", sym("factorial"), eq, "120"), latex: "5!=120", text: "5! = 120", spoken: "5 factorial equals 120" },
  { name: "derivative", doc: m(deriv("y", "x"), eq, "2x"), latex: "\\frac{dy}{dx}=2x", text: "dy/dx = 2x", spoken: "d y by d x equals 2 x" },
  { name: "derivative operator", doc: m(deriv(undefined, "x"), paren("x", sup("2"))), latex: "\\frac{d}{dx}(x^{2})", text: "d/dx(x^2)", spoken: "d by d x open bracket x squared close bracket" },
  { name: "f prime", doc: m("f", sym("prime"), paren("x")), latex: "f'(x)", text: "f'(x)", spoken: "f prime open bracket x close bracket" },
  { name: "definite integral", doc: m(integral("0", "1", row("x", sup("2"), "dx"))), latex: "\\int_{0}^{1} x^{2}dx", text: "integral(0, 1, x^2 dx)", spoken: "the integral from 0 to 1 of x squared d x" },
  { name: "indefinite integral", doc: m(integral(undefined, undefined, row("2x", "dx"))), latex: "\\int 2xdx", text: "integral(2xdx)", spoken: "the integral of 2 x d x" },
  { name: "sigma", doc: m(sum(row("r", eq, "1"), "n", row("r", sup("2")))), latex: "\\sum_{r=1}^{n} r^{2}", text: "sum(r = 1, n, r^2)", spoken: "the sum from r equals 1 to n of r squared" },
  { name: "infinity", doc: m("n", rel("to"), cst("infinity")), latex: "n\\to\\infty", text: "n -> infinity", spoken: "n tends to infinity" },
  { name: "therefore", doc: m(sym("therefore"), "x", eq, "2"), latex: "\\therefore x=2", text: "therefore x = 2", spoken: "therefore x equals 2" },
  { name: "or between answers", doc: m("x", eq, "2", text("or"), "x", eq, minus, "3"), latex: "x=2\\text{ or }x=-3", text: "x = 2 or x = -3", spoken: "x equals 2 or x equals negative 3" },
  { name: "placeholder", doc: m(frac("1", row())), latex: "\\frac{1}{\\square}", text: "1/?", spoken: "1 over blank" },
  { name: "power without base", doc: m(sup("2")), latex: "{}^{2}", text: "^2", spoken: "squared" },
];

export const CHEMISTRY: GoldenCase[] = [
  { name: "water", doc: c(el("H"), sub("2"), el("O")), latex: "\\ce{H2O}", text: "H2O", spoken: "H 2 O" },
  {
    name: "balanced equation with states",
    doc: c(el("Mg"), st("s"), plus, "2", el("H"), el("Cl"), st("aq"), rel("to"), el("Mg"), el("Cl"), sub("2"), st("aq"), plus, el("H"), sub("2"), st("g")),
    latex: "\\ce{Mg(s) + 2HCl(aq) -> MgCl2(aq) + H2(g)}",
    text: "Mg(s) + 2HCl(aq) -> MgCl2(aq) + H2(g)",
    spoken: "M g solid plus 2 H C l aqueous reacts to give M g C l 2 aqueous plus H 2 gas",
  },
  { name: "brackets in formula", doc: c(el("Ca"), paren(el("O"), el("H")), sub("2")), latex: "\\ce{Ca(OH)2}", text: "Ca(OH)2", spoken: "C a open bracket O H close bracket 2" },
  { name: "ion with charge", doc: c(el("S"), el("O"), sub("4"), sup(row("2", minus))), latex: "\\ce{SO4^{2-}}", text: "SO4^2-", spoken: "S O 4 with charge 2 minus" },
  { name: "cation", doc: c(el("Fe"), sup(row("3", plus))), latex: "\\ce{Fe^{3+}}", text: "Fe^3+", spoken: "F e with charge 3 plus" },
  { name: "half equation", doc: c(el("Cu"), sup(row("2", plus)), plus, "2", el("e"), sup(minus), rel("to"), el("Cu")), latex: "\\ce{Cu^{2+} + 2e^{-} -> Cu}", text: "Cu^2+ + 2e^- -> Cu", spoken: "C u with charge 2 plus plus 2 e with charge minus reacts to give C u" },
  { name: "equilibrium", doc: c(el("N"), sub("2"), plus, "3", el("H"), sub("2"), rel("equilibrium"), "2", el("N"), el("H"), sub("3")), latex: "\\ce{N2 + 3H2 <=> 2NH3}", text: "N2 + 3H2 <=> 2NH3", spoken: "N 2 plus 3 H 2 is in equilibrium with 2 N H 3" },
  { name: "hydrated salt", doc: c(el("Cu"), el("S"), el("O"), sub("4"), op("cdot"), "5", el("H"), sub("2"), el("O")), latex: "\\ce{CuSO4*5H2O}", text: "CuSO4*5H2O", spoken: "C u S O 4 dot 5 H 2 O" },
  { name: "isotope", doc: c(subsup("6", "14"), el("C")), latex: "\\ce{^{14}_{6}C}", text: "^14_6C", spoken: "with mass number 14 and atomic number 6 C" },
  { name: "gas evolved", doc: c(el("Zn"), plus, "2", el("H"), el("Cl"), rel("to"), el("Zn"), el("Cl"), sub("2"), plus, el("H"), sub("2"), sym("uparrow")), latex: "\\ce{Zn + 2HCl -> ZnCl2 + H2 ^}", text: "Zn + 2HCl -> ZnCl2 + H2 ^", spoken: "Z n plus 2 H C l reacts to give Z n C l 2 plus H 2 gas given off" },
  { name: "concentration bracket", doc: c("p", "H", eq, minus, fn("log"), fence(row(el("H"), sup(plus)), "[", "]")), latex: "\\ce{pH = -$\\log$[H^{+}]}", text: "pH = -log[H^+]", spoken: "p H equals minus log open square bracket H with charge plus close square bracket" },
  { name: "enthalpy without chemistry", doc: c("Δ", "H", eq, minus, "57", unit("kJ"), unit("mol"), sup(row(minus, "1"))), latex: "\\Delta H=-57\\,\\mathrm{kJ}\\,\\mathrm{mol}^{-1}", text: "Delta H = -57 kJ mol^-1", spoken: "capital delta H equals negative 57 kilojoules per mole" },
  { name: "complex ion", doc: c(fence(row(el("Cu"), paren(el("H"), sub("2"), el("O")), sub("6")), "[", "]"), sup(row("2", plus))), latex: "\\ce{[Cu(H2O)6]^{2+}}", text: "[Cu(H2O)6]^2+", spoken: "open square bracket C u open bracket H 2 O close bracket 6 close square bracket with charge 2 plus" },
];

export const PHYSICS: GoldenCase[] = [
  { name: "acceleration with units", doc: ph("a", eq, "3.0", unit("m"), unit("s"), sup(row(minus, "2"))), latex: "a=3.0\\,\\mathrm{m}\\,\\mathrm{s}^{-2}", text: "a = 3.0 m s^-2", spoken: "a equals 3.0 metres per second squared" },
  { name: "equation of motion", doc: ph("v", sup("2"), eq, "u", sup("2"), plus, "2as"), latex: "v^{2}=u^{2}+2as", text: "v^2 = u^2 + 2as", spoken: "v squared equals u squared plus 2 a s" },
  { name: "speed with slash unit", doc: ph("24", unit("m"), op("slash"), unit("s")), latex: "24\\,\\mathrm{m}/\\mathrm{s}", text: "24 m/s", spoken: "24 metres per second" },
  { name: "resistance", doc: ph("R", eq, "12", unit("Ω")), latex: "R=12\\,\\Omega", text: "R = 12 ohm", spoken: "R equals 12 ohms" },
  { name: "micrometres", doc: ph("5", unit("μm")), latex: "5\\,\\mathrm{\\mu m}", text: "5 um", spoken: "5 micrometres" },
  { name: "celsius", doc: ph("T", eq, "20", unit("°C")), latex: "T=20\\,{}^{\\circ}\\mathrm{C}", text: "T = 20 degC", spoken: "T equals 20 degrees Celsius" },
  { name: "proportional", doc: ph("F", rel("propto"), "x"), latex: "F\\propto x", text: "F propto x", spoken: "F is proportional to x" },
  { name: "change in velocity", doc: ph("a", eq, frac(row("Δ", "v"), row("Δ", "t"))), latex: "a=\\frac{\\Delta v}{\\Delta t}", text: "a = (Delta v) / (Delta t)", spoken: "a equals fraction, capital delta v, over, capital delta t, end fraction" },
  { name: "wave equation", doc: ph("v", eq, "f", "λ"), latex: "v=f\\lambda", text: "v = f lambda", spoken: "v equals f lambda" },
  { name: "subscripted variable", doc: ph("E", sub("k"), eq, frac("1", "2"), "m", "v", sup("2")), latex: "E_{k}=\\frac{1}{2}mv^{2}", text: "E_k = 1/2 mv^2", spoken: "E sub k equals 1 over 2 m v squared" },
  { name: "uncertainty", doc: ph("2.5", op("pm"), "0.1", unit("s")), latex: "2.5\\pm 0.1\\,\\mathrm{s}", text: "2.5 +/- 0.1 s", spoken: "2.5 plus or minus 0.1 seconds" },
  { name: "vector arrow", doc: ph(over("vec", "F"), eq, "m", over("vec", "a")), latex: "\\vec{F}=m\\vec{a}", text: "vec(F) = m vec(a)", spoken: "vector F equals m vector a" },
];

export const ALL: GoldenCase[] = [...MATHS, ...CHEMISTRY, ...PHYSICS];
