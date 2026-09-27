/**
 * Preset keypads (spec §8.2) for maths, chemistry and physics at GCSE
 * Foundation, GCSE Higher and A-level. Template keys are labelled with the
 * expression they insert, so a power key shows a base box with a raised box.
 */
import type { Node, OpName, RelName, Row, Subject, SymName } from "../model/types.js";
import {
  abs, colvec, cst, deriv, el, fence, fn, frac, integral, nroot, num, op, over, recurring, rel, sqrt, st, sub, sum,
  sup, sym, text, unit, v,
} from "../model/builders.js";
import { GREEK } from "../model/vocabulary.js";
import type { Key, KeyAction, KeypadLayout, KeypadTab, Level } from "./types.js";

const LEVEL_ORDER: Record<Level, number> = { "gcse-foundation": 0, "gcse-higher": 1, "a-level": 2 };

/** Keys can be restricted to a minimum level. */
type LeveledKey = Key & { minLevel?: Level };

const active = (...steps: [number, number][]) => ({ path: steps.map(([node, slot]) => ({ node, slot })), index: 0 });

function key(id: string, label: Key["label"], aria: string, action: KeyAction, extra: Partial<LeveledKey> = {}): LeveledKey {
  return { id, label, aria, action, ...extra };
}

const digit = (d: string): LeveledKey => key(`digit-${d === "." ? "point" : d}`, { text: d }, d === "." ? "point" : d, { type: d }, { kind: "digit" });
const OP_TEXT: Record<OpName, string> = { plus: "+", minus: "−", times: "×", cdot: "·", div: "÷", slash: "/", pm: "±", mp: "∓" };
const opKey = (name: OpName, aria: string, extra: Partial<LeveledKey> = {}) =>
  key(`op-${name}`, { text: OP_TEXT[name] }, aria, { insert: op(name) }, { kind: "operator", ...extra });
const REL_TEXT: Partial<Record<RelName, string>> = {
  eq: "=", neq: "≠", lt: "<", gt: ">", le: "≤", ge: "≥", approx: "≈", equiv: "≡", propto: "∝", to: "→", equilibrium: "⇌", ratio: ":",
};
const relKey = (name: RelName, aria: string, extra: Partial<LeveledKey> = {}) =>
  key(`rel-${name}`, { text: REL_TEXT[name] ?? name }, aria, { insert: rel(name) }, { kind: "operator", ...extra });
const symKey = (name: SymName, textLabel: string, aria: string, extra: Partial<LeveledKey> = {}) =>
  key(`sym-${name}`, { text: textLabel }, aria, { insert: sym(name) }, extra);
const letter = (ch: string, aria = ch) => key(`letter-${ch}`, { tree: [v(ch)] }, aria, { type: ch }, { kind: "letter" });
const greek = (ch: string) => key(`greek-${GREEK[ch]}`, { tree: [v(ch)] }, GREEK[ch] ?? ch, { insert: v(ch) }, { kind: "letter" });
const fnKey = (name: Parameters<typeof fn>[0], aria: string, extra: Partial<LeveledKey> = {}) =>
  key(`fn-${name}`, { tree: [fn(name)] }, aria, { insert: fn(name) }, { kind: "function", ...extra });
const unitKey = (symbol: string, aria: string) => key(`unit-${symbol}`, { text: symbol }, aria, { insert: unit(symbol) }, { kind: "word" });
const elementKey = (symbol: string) => key(`element-${symbol}`, { tree: [el(symbol)] }, symbol, { insert: el(symbol) });
const stateKey = (s: "s" | "l" | "g" | "aq", aria: string) => key(`state-${s}`, { tree: [st(s)] }, aria, { insert: st(s) }, { kind: "word" });

// ------------------------------------------------------------- templates

const tpl = (id: string, labelTree: Row, activeSlot: ReturnType<typeof active> | undefined, aria: string, action: KeyAction, extra: Partial<LeveledKey> = {}) =>
  key(id, activeSlot ? { tree: labelTree, active: activeSlot } : { tree: labelTree }, aria, action, { kind: "template", ...extra });

const square = tpl("square", [sup("2")], undefined, "squared", { template: sup("2") });
const cube = tpl("cube", [sup("3")], undefined, "cubed", { template: sup("3") });
const inverse = tpl("power-minus-one", [sup([op("minus"), num("1")])], undefined, "to the power minus one", { template: sup([op("minus"), num("1")]) });
const power = tpl("power", [sup([])], active([0, 0]), "power", { template: sup([]) }, { variants: [square, cube, inverse] });
const subscript = tpl("subscript", [sub([])], active([0, 0]), "subscript", { template: sub([]) });
const mixed = tpl("mixed-number", [num("1"), frac([], [])], active([1, 0]), "mixed number", { template: frac([], []) });
const fraction = tpl("fraction", [frac([], [])], active([0, 0]), "fraction", { template: frac([], []), absorb: true }, { variants: [mixed] });
const cubeRoot = tpl("cube-root", [nroot("3", [])], active([0, 1]), "cube root", { template: nroot("3", []) });
const nthRoot = tpl("nth-root", [nroot([], [])], active([0, 0]), "nth root", { template: nroot([], []) });
const squareRoot = tpl("square-root", [sqrt([])], active([0, 0]), "square root", { template: sqrt([]) }, { variants: [cubeRoot, nthRoot] });
const modulus = tpl("modulus", [abs()], active([0, 0]), "modulus", { bracket: "wrap", char: "|" });
const pair = tpl("brackets", [fence([])], active([0, 0]), "pair of brackets", { bracket: "wrap", char: "(" });
const openSquare = key("open-square", { text: "[" }, "open square bracket", { bracket: "open", char: "[" }, { kind: "operator" });
const closeSquare = key("close-square", { text: "]" }, "close square bracket", { bracket: "close", char: "]" }, { kind: "operator" });
const openBrace = key("open-brace", { text: "{" }, "open brace", { bracket: "open", char: "{" }, { kind: "operator" });
const closeBrace = key("close-brace", { text: "}" }, "close brace", { bracket: "close", char: "}" }, { kind: "operator" });
const openParen = key("open-bracket", { text: "(" }, "open bracket", { bracket: "open", char: "(" }, { kind: "operator", variants: [pair, openSquare, openBrace, modulus] });
const closeParen = key("close-bracket", { text: ")" }, "close bracket", { bracket: "close", char: ")" }, { kind: "operator", variants: [closeSquare, closeBrace] });
const vector = tpl("column-vector", [colvec([], [])], active([0, 0]), "column vector", { template: colvec([], []) });
const recurringKey = tpl("recurring", [num("0"), num("."), recurring("3")], undefined, "recurring decimal", { template: recurring([]) });
const sciKey = tpl("standard-form", [op("times"), num("1"), num("0"), sup([])], active([3, 0]), "times ten to the power", { template: sup([]), prefix: [op("times"), num("1"), num("0")]});
const eToX = tpl("e-power", [cst("e"), sup([])], active([1, 0]), "e to the power", { template: sup([]), prefix: [cst("e")]}, { minLevel: "a-level" });
const logBase = tpl("log-base", [fn("log"), sub([])], active([1, 0]), "log to a base", { template: sub([]), prefix: [fn("log")]}, { minLevel: "a-level" });
const dydx = tpl("dy-dx", [deriv("y", "x")], undefined, "d y by d x", { template: deriv("y", "x") });
const ddx = tpl("d-dx", [deriv(undefined, "x")], undefined, "d by d x", { template: deriv(undefined, "x") }, { minLevel: "a-level", variants: [dydx] });
const integralKey = tpl("integral", [integral(undefined, undefined, [])], undefined, "integral", { template: integral(undefined, undefined, []) }, { minLevel: "a-level" });
const sumKey = tpl("sum", [sum(undefined, undefined, [])], undefined, "sum", { template: sum(undefined, undefined, []) }, { minLevel: "a-level" });
const fOfX = tpl("function", [v("f"), fence([])], active([1, 0]), "function of", { template: fence([]), prefix: [v("f")]});
const barKey = tpl("mean", [over("bar", [])], active([0, 0]), "bar", { template: over("bar", []) });
const vecKey = tpl("vector-arrow", [over("vec", [])], active([0, 0]), "vector arrow", { template: over("vec", []) }, { minLevel: "a-level" });
const hatKey = tpl("hat", [over("hat", [])], active([0, 0]), "hat", { template: over("hat", []) }, { minLevel: "a-level" });
const charge = tpl("charge", [sup([])], active([0, 0]), "charge", { template: sup([]) });
const chargePlus = tpl("charge-plus", [sup([op("plus")])], undefined, "positive charge", { template: sup([op("plus")]) });
const chargeMinus = tpl("charge-minus", [sup([op("minus")])], undefined, "negative charge", { template: sup([op("minus")]) });
const chargeKey = { ...charge, variants: [chargePlus, chargeMinus] };
const electron = key("electron", { tree: [el("e"), sup([op("minus")])] }, "electron", { insert: [el("e"), sup([op("minus")])] });

// ---------------------------------------------------------------- shared

const equals = relKey("eq", "equals", { variants: [relKey("approx", "approximately equal to"), relKey("neq", "not equal to"), relKey("equiv", "identical to", { minLevel: "a-level" })] });
const minus = opKey("minus", "minus", { variants: [opKey("pm", "plus or minus")] });
const times = opKey("times", "times", { variants: [opKey("div", "divide"), opKey("cdot", "dot")] });
const toArrow = relKey("to", "reacts to give", { variants: [relKey("equilibrium", "reversible reaction")] });

function mathsNumberPad(): KeypadTab {
  return {
    id: "numbers", label: { text: "123" }, aria: "Numbers", columns: 5,
    keys: [
      digit("7"), digit("8"), digit("9"), openParen, closeParen,
      digit("4"), digit("5"), digit("6"), times, fraction,
      digit("1"), digit("2"), digit("3"), minus, power,
      digit("0"), digit("."), equals, opKey("plus", "plus"), squareRoot,
    ],
  };
}

function chemistryNumberPad(): KeypadTab {
  return {
    id: "numbers", label: { text: "123" }, aria: "Numbers", columns: 5,
    keys: [
      digit("7"), digit("8"), digit("9"), openParen, closeParen,
      digit("4"), digit("5"), digit("6"), opKey("plus", "plus"), subscript,
      digit("1"), digit("2"), digit("3"), minus, chargeKey,
      digit("0"), digit("."), toArrow, relKey("eq", "equals"), opKey("cdot", "dot, for hydrated salts"),
    ],
  };
}

const algebraTab = (): KeypadTab => ({
  id: "algebra", label: { tree: [v("x"), sup("2")] }, aria: "Algebra", columns: 6,
  keys: [
    letter("x"), letter("y"), letter("a"), letter("b"), letter("n"), letter("t"),
    square, power, subscript, squareRoot, modulus, { ...vector, minLevel: "gcse-higher" } as LeveledKey,
    relKey("lt", "less than"), relKey("gt", "greater than"), relKey("le", "less than or equal to"),
    relKey("ge", "greater than or equal to"), relKey("neq", "not equal to"), relKey("approx", "approximately equal to"),
    opKey("pm", "plus or minus"), key("const-pi", { tree: [cst("pi")] }, "pi", { insert: cst("pi") }), recurringKey,
    symKey("comma", ",", "comma", { variants: [relKey("ratio", "ratio")] }), key("text-or", { text: "or" }, "or", { insert: text("or") }, { kind: "word" }),
    key("text-and", { text: "and" }, "and", { insert: text("and") }, { kind: "word" }),
  ],
});

const functionsTab = (): KeypadTab => ({
  id: "functions", label: { tree: [v("f"), fence([v("x")])] }, aria: "Functions", columns: 6,
  keys: [
    fnKey("sin", "sine"), fnKey("cos", "cosine"), fnKey("tan", "tangent"),
    fnKey("arcsin", "inverse sine"), fnKey("arccos", "inverse cosine"), fnKey("arctan", "inverse tangent"),
    symKey("degree", "°", "degrees"), symKey("factorial", "!", "factorial"), fOfX,
    symKey("prime", "′", "prime"), barKey, symKey("percent", "%", "percent"),
    fnKey("ln", "natural log", { minLevel: "a-level" }), fnKey("log", "log", { minLevel: "a-level" }), logBase, eToX,
    key("const-e", { tree: [cst("e")] }, "e", { insert: cst("e") }, { minLevel: "a-level" }),
    key("const-infinity", { text: "∞" }, "infinity", { insert: cst("infinity") }, { minLevel: "a-level" }),
    ddx, integralKey, sumKey, vecKey, hatKey,
    fnKey("sec", "secant", { minLevel: "a-level", variants: [fnKey("cosec", "cosecant"), fnKey("cot", "cotangent")] }),
    symKey("therefore", "∴", "therefore", { minLevel: "a-level" }),
  ],
});

const greekTab = (): KeypadTab => ({
  id: "greek", label: { text: "αβγ" }, aria: "Greek letters", columns: 6,
  keys: [..."αβγδθλμσφωρεητΔΣΩ"].map(greek).concat([key("const-pi-greek", { tree: [cst("pi")] }, "pi", { insert: cst("pi") })]),
});

const lettersTab = (): KeypadTab => ({
  id: "letters", label: { text: "abc" }, aria: "Letters", columns: 10,
  keys: [
    ..."qwertyuiop", ..."asdfghjkl",
  ].map((c) => letter(c)).concat(
    [key("shift", { icon: "shift" }, "shift", { ui: "shift" }, { kind: "nav" })],
    [..."zxcvbnm"].map((c) => letter(c)),
    [symKey("comma", ",", "comma"), key("text-or", { text: "or" }, "or", { insert: text("or") }, { kind: "word" })],
  ),
});

const COMMON_ELEMENTS = "H C N O Na Mg Al Si P S Cl K Ca Fe Cu Zn Br Ag I Li He Pb Ba".split(" ");

const elementsTab = (): KeypadTab => ({
  id: "elements", label: { text: "Elements" }, columns: 6,
  keys: COMMON_ELEMENTS.map(elementKey).concat([key("periodic-table", { icon: "table" }, "open the periodic table", { ui: "periodic-table" }, { kind: "word" })]),
});

const chemSymbolsTab = (): KeypadTab => ({
  id: "symbols", label: { text: "Symbols" }, columns: 6,
  keys: [
    toArrow, relKey("equilibrium", "reversible reaction"), opKey("plus", "plus"),
    stateKey("s", "solid"), stateKey("l", "liquid"), stateKey("g", "gas"),
    stateKey("aq", "aqueous"), subscript, chargeKey, chargePlus, chargeMinus, electron,
    openParen, closeParen, openSquare, closeSquare, opKey("cdot", "dot, for hydrated salts"),
    symKey("uparrow", "↑", "gas given off"),
    symKey("downarrow", "↓", "precipitate"), symKey("delta", "Δ", "heat"), relKey("eq", "equals"), fraction,
    fnKey("log", "log"),
    key("space", { text: "space" }, "end formula", { type: " " }, { kind: "word" }),
  ],
});

const UNITS: [string, string][] = [
  ["m", "metres"], ["s", "seconds"], ["kg", "kilograms"], ["g", "grams"], ["N", "newtons"], ["J", "joules"],
  ["W", "watts"], ["V", "volts"], ["A", "amps"], ["Ω", "ohms"], ["C", "coulombs"], ["Hz", "hertz"],
  ["Pa", "pascals"], ["K", "kelvin"], ["°C", "degrees Celsius"], ["mol", "moles"], ["eV", "electronvolts"], ["T", "tesla"],
  ["km", "kilometres"], ["cm", "centimetres"], ["mm", "millimetres"], ["kJ", "kilojoules"], ["kW", "kilowatts"], ["mA", "milliamps"],
  ["MJ", "megajoules"], ["kPa", "kilopascals"], ["nm", "nanometres"], ["μm", "micrometres"], ["min", "minutes"], ["h", "hours"],
];

const unitsTab = (): KeypadTab => ({
  id: "units", label: { text: "Units" }, columns: 6,
  keys: [
    ...UNITS.map(([s, a]) => unitKey(s, a)),
    opKey("slash", "per"), inverse, { ...square, id: "unit-squared" }, { ...cube, id: "unit-cubed" }, sciKey, relKey("propto", "proportional to"),
  ],
});

const nav = (subjectKey: Key): Key[] => [
  subjectKey,
  key("left", { icon: "left" }, "move left", { command: "moveLeft" }, { kind: "nav" }),
  key("right", { icon: "right" }, "move right", { command: "moveRight" }, { kind: "nav" }),
  key("backspace", { icon: "backspace" }, "delete", { command: "deleteBackward" }, { kind: "nav" }),
  key("submit", { icon: "enter" }, "submit", { ui: "submit" }, { kind: "primary" }),
];

/** The key used in place of submit when the host has not enabled it. */
export const NEXT_BOX_KEY: Key = { id: "next-box", label: { text: "⇥" }, aria: "next box", action: { command: "moveToNextPlaceholder" }, kind: "nav" };

function filterLevel(keys: Key[], level: Level): Key[] {
  const ok = (k: Key) => LEVEL_ORDER[level] >= LEVEL_ORDER[(k as LeveledKey).minLevel ?? "gcse-foundation"];
  return keys.filter(ok).map((k) => (k.variants ? { ...k, variants: filterLevel(k.variants, level) } : k))
    .map((k) => { const { minLevel: _m, ...rest } = k as LeveledKey; return rest.variants?.length === 0 ? { ...rest, variants: undefined } : rest; });
}

function finish(layout: KeypadLayout, level: Level): KeypadLayout {
  const tab = (t: KeypadTab): KeypadTab => ({ ...t, keys: filterLevel(t.keys, level) });
  return {
    numberPad: tab(layout.numberPad),
    tabs: layout.tabs.map(tab).filter((t) => t.keys.length > 0),
    navigation: filterLevel(layout.navigation, level),
  };
}

/** The preset keypad for a subject and level. */
export function keypadPreset(subject: Subject, level: Level = "gcse-higher"): KeypadLayout {
  const variableKey = letter("x");
  const xKey: Key = { ...variableKey, id: "nav-variable", variants: ["y", "a", "b", "n", "t", "θ"].map((c) => (c === "θ" ? greek(c) : letter(c))) };
  switch (subject) {
    case "chemistry":
      return finish({
        numberPad: chemistryNumberPad(),
        tabs: [elementsTab(), chemSymbolsTab()],
        navigation: nav({ ...stateKey("aq", "aqueous"), id: "nav-state", variants: [stateKey("s", "solid"), stateKey("l", "liquid"), stateKey("g", "gas")] }),
      }, level);
    case "physics":
      return finish({
        numberPad: mathsNumberPad(),
        tabs: [unitsTab(), algebraTab(), greekTab(), functionsTab()],
        navigation: nav({ ...sciKey, id: "nav-standard-form" }),
      }, level);
    default:
      return finish({
        numberPad: mathsNumberPad(),
        tabs: [algebraTab(), functionsTab(), greekTab(), lettersTab()],
        navigation: nav(xKey),
      }, level);
  }
}

/** Apply a host patch to a layout (spec §8.4). */
export function applyKeypadPatch(layout: KeypadLayout, patch: import("./types.js").KeypadPatch): KeypadLayout {
  const removed = new Set(patch.removeKeys ?? []);
  const drop = (keys: Key[]): Key[] => keys.filter((k) => !removed.has(k.id)).map((k) => (k.variants ? { ...k, variants: drop(k.variants) } : k));
  const tabs = layout.tabs
    .filter((t) => !(patch.removeTabs ?? []).includes(t.id))
    .map((t) => ({ ...t, keys: [...drop(t.keys), ...(patch.addKeys?.[t.id] ?? [])] }));
  return {
    numberPad: { ...layout.numberPad, keys: [...drop(layout.numberPad.keys), ...(patch.addKeys?.[layout.numberPad.id] ?? [])] },
    tabs: [...tabs, ...(patch.addTabs ?? [])],
    navigation: patch.navigation ?? drop(layout.navigation),
  };
}

export type { Node };
