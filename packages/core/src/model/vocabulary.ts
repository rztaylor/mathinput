/**
 * Closed vocabularies for atom values (spec §3.2, §9). Serialisers and rules
 * build on these tables; validation rejects anything outside them.
 */
import type { ConstName, FnName, OpName, RelName, StateName, SymName } from "./types.js";

export const CONSTS: readonly ConstName[] = ["pi", "e", "i", "infinity"];
export const OPS: readonly OpName[] = ["plus", "minus", "times", "cdot", "div", "slash", "pm", "mp"];
export const RELS: readonly RelName[] = [
  "eq", "neq", "lt", "gt", "le", "ge", "approx", "equiv", "propto",
  "to", "equilibrium", "implies", "iff", "ratio",
];
export const FNS: readonly FnName[] = [
  "sin", "cos", "tan", "arcsin", "arccos", "arctan", "sec", "cosec", "cot", "ln", "log", "exp",
];
export const SYMS: readonly SymName[] = [
  "degree", "factorial", "percent", "comma", "prime", "ellipsis", "uparrow", "downarrow", "delta", "therefore",
];
export const STATES: readonly StateName[] = ["s", "l", "g", "aq"];

/** Greek letters offered as variables, with their LaTeX / spoken names. */
export const GREEK: Readonly<Record<string, string>> = {
  α: "alpha", β: "beta", γ: "gamma", δ: "delta", ε: "epsilon", ζ: "zeta", η: "eta", θ: "theta",
  ι: "iota", κ: "kappa", λ: "lambda", μ: "mu", ν: "nu", ξ: "xi", π: "pi", ρ: "rho", σ: "sigma",
  τ: "tau", υ: "upsilon", φ: "phi", χ: "chi", ψ: "psi", ω: "omega",
  Γ: "Gamma", Δ: "Delta", Θ: "Theta", Λ: "Lambda", Ξ: "Xi", Π: "Pi", Σ: "Sigma", Φ: "Phi", Ψ: "Psi", Ω: "Omega",
};

export function isVariableLetter(v: string): boolean {
  return /^[A-Za-z]$/.test(v) || v in GREEK;
}

// ----------------------------------------------------------------- units

interface UnitDef { name: string; plural: string; prefixable: boolean; ascii?: string; latex?: string }

/** Base units (spec §9.3). Prefixed forms are derived from PREFIXES. */
export const BASE_UNITS: Readonly<Record<string, UnitDef>> = {
  m: { name: "metre", plural: "metres", prefixable: true },
  s: { name: "second", plural: "seconds", prefixable: true },
  g: { name: "gram", plural: "grams", prefixable: true },
  t: { name: "tonne", plural: "tonnes", prefixable: false },
  N: { name: "newton", plural: "newtons", prefixable: true },
  J: { name: "joule", plural: "joules", prefixable: true },
  W: { name: "watt", plural: "watts", prefixable: true },
  V: { name: "volt", plural: "volts", prefixable: true },
  A: { name: "amp", plural: "amps", prefixable: true },
  Ω: { name: "ohm", plural: "ohms", prefixable: true, ascii: "ohm", latex: "\\Omega" },
  C: { name: "coulomb", plural: "coulombs", prefixable: true },
  Hz: { name: "hertz", plural: "hertz", prefixable: true },
  Pa: { name: "pascal", plural: "pascals", prefixable: true },
  K: { name: "kelvin", plural: "kelvin", prefixable: false },
  "°C": { name: "degree Celsius", plural: "degrees Celsius", prefixable: false, ascii: "degC", latex: "{}^{\\circ}\\mathrm{C}" },
  mol: { name: "mole", plural: "moles", prefixable: true },
  eV: { name: "electronvolt", plural: "electronvolts", prefixable: true },
  T: { name: "tesla", plural: "tesla", prefixable: true },
  Wb: { name: "weber", plural: "webers", prefixable: false },
  Bq: { name: "becquerel", plural: "becquerels", prefixable: true },
  Gy: { name: "gray", plural: "grays", prefixable: false },
  Sv: { name: "sievert", plural: "sieverts", prefixable: true },
  F: { name: "farad", plural: "farads", prefixable: true },
  L: { name: "litre", plural: "litres", prefixable: true },
  l: { name: "litre", plural: "litres", prefixable: true },
  min: { name: "minute", plural: "minutes", prefixable: false },
  h: { name: "hour", plural: "hours", prefixable: false },
  day: { name: "day", plural: "days", prefixable: false },
  yr: { name: "year", plural: "years", prefixable: false },
  u: { name: "atomic mass unit", plural: "atomic mass units", prefixable: false },
};

export const PREFIXES: Readonly<Record<string, { name: string; ascii?: string; latex?: string }>> = {
  T: { name: "tera" }, G: { name: "giga" }, M: { name: "mega" }, k: { name: "kilo" },
  d: { name: "deci" }, c: { name: "centi" }, m: { name: "milli" }, μ: { name: "micro", ascii: "u", latex: "\\mu " },
  n: { name: "nano" }, p: { name: "pico" },
};

export interface UnitInfo { symbol: string; name: string; plural: string; ascii: string; latex: string }

const unitCache = new Map<string, UnitInfo | null>();

/** Resolve a unit symbol (with an optional prefix) or return null if unknown. */
export function unitInfo(symbol: string): UnitInfo | null {
  const cached = unitCache.get(symbol);
  if (cached !== undefined) return cached;
  let info: UnitInfo | null = null;
  const base = BASE_UNITS[symbol];
  if (base) {
    info = { symbol, name: base.name, plural: base.plural, ascii: base.ascii ?? symbol, latex: base.latex ?? `\\mathrm{${symbol}}` };
  } else {
    // Longest prefix first is unnecessary: all prefixes are one character.
    const [first = "", ...rest] = Array.from(symbol);
    const pre = PREFIXES[first];
    const b = BASE_UNITS[rest.join("")];
    if (pre && b && b.prefixable) {
      const restSym = rest.join("");
      info = {
        symbol,
        name: pre.name + b.name,
        plural: pre.name + b.plural,
        ascii: (pre.ascii ?? first) + (b.ascii ?? restSym),
        latex: `\\mathrm{${pre.latex ?? first}${b.latex ?? restSym}}`,
      };
    }
  }
  unitCache.set(symbol, info);
  return info;
}

// -------------------------------------------------------------- elements

/** All 118 element symbols in atomic-number order. */
export const ELEMENTS: readonly string[] = (
  "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr " +
  "Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu " +
  "Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr " +
  "Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og"
).split(" ");

export const ELEMENT_SET: ReadonlySet<string> = new Set(ELEMENTS);

/** The electron is written as an element-like atom `e` with a charge. */
export function isElementSymbol(v: string): boolean {
  return ELEMENT_SET.has(v) || v === "e";
}
