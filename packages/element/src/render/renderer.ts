/**
 * Tree → DOM (spec §10.5). Builds light-DOM elements with the public `mi-*`
 * classes. Used for the editable field, read-only display, and key labels.
 * All DOM is created with DOM APIs; no data ever reaches innerHTML.
 */
import type { FenceChar, Node, Position, Row, Selection, Step } from "@mathinput/core";
import { GREEK, isOptionalSlot, slotsOf } from "@mathinput/core";
import { fenceGlyph, radicalGlyph } from "./glyphs.js";

export interface RenderOptions {
  /** Caret to draw; omit for read-only rendering. */
  caret?: Position | null;
  selection?: Selection | null;
  /** Add path/index data attributes for hit-testing. */
  interactive?: boolean;
  /** Slot that a key label marks as "the caret lands here". */
  activeSlot?: Position | null;
}

const CONST: Record<string, string> = { pi: "π", e: "e", i: "i", infinity: "∞" };
const OP: Record<string, string> = { plus: "+", minus: "−", times: "×", cdot: "·", div: "÷", slash: "/", pm: "±", mp: "∓" };
const REL: Record<string, string> = {
  eq: "=", neq: "≠", lt: "<", gt: ">", le: "≤", ge: "≥", approx: "≈", equiv: "≡", propto: "∝",
  to: "→", equilibrium: "⇌", implies: "⇒", iff: "⇔", ratio: ":",
};
const SYM: Record<string, string> = {
  degree: "°", factorial: "!", percent: "%", comma: ",", prime: "′", ellipsis: "…",
  uparrow: "↑", downarrow: "↓", delta: "Δ", therefore: "∴",
};
const STATE: Record<string, string> = { s: "(s)", l: "(l)", g: "(g)", aq: "(aq)" };

export function pathKey(path: readonly Step[]): string {
  return path.map((s) => `${s.node}.${s.slot}`).join("/");
}

export function parsePathKey(key: string): Step[] {
  if (!key) return [];
  return key.split("/").map((part) => {
    const [node, slot] = part.split(".").map(Number);
    return { node: node as number, slot: slot as number };
  });
}

function span(className: string, text?: string): HTMLSpanElement {
  const s = document.createElement("span");
  s.className = className;
  if (text !== undefined) s.textContent = text;
  return s;
}

class Renderer {
  private readonly caretKey: string | null;
  private readonly selKey: string | null;
  private readonly activeKey: string | null;

  constructor(private readonly opts: RenderOptions) {
    this.caretKey = opts.caret ? pathKey(opts.caret.path) : null;
    this.selKey = opts.selection ? pathKey(opts.selection.path) : null;
    this.activeKey = opts.activeSlot ? pathKey(opts.activeSlot.path) : null;
  }

  row(row: Row, path: Step[], extraClass = "", optional = false): HTMLSpanElement {
    const key = pathKey(path);
    const el = span(`mi-row${extraClass ? ` ${extraClass}` : ""}`);
    if (this.opts.interactive) el.dataset.miPath = key;
    const hasCaret = this.caretKey === key && !this.opts.selection;
    if (path.length > 0 && (this.caretKey === key || this.activeKey === key)) el.classList.add("mi-row--active");
    if (row.length === 0) {
      const ph = span("mi-placeholder");
      if (hasCaret || this.activeKey === key) ph.classList.add("mi-placeholder--active");
      else if (optional) ph.classList.add("mi-placeholder--optional");
      if (hasCaret) ph.append(span("mi-caret"));
      el.append(ph);
      return el;
    }
    const sel = this.selKey === key ? this.opts.selection : null;
    row.forEach((node, i) => {
      if (hasCaret && this.opts.caret?.index === i) el.append(span("mi-caret"));
      const nodeEl = this.node(node, row, i, path, el);
      if (this.opts.interactive) nodeEl.dataset.miIndex = String(i);
      if (sel && i >= sel.start && i < sel.end) nodeEl.classList.add("mi-selection");
      el.append(nodeEl);
    });
    if (hasCaret && this.opts.caret?.index === row.length) el.append(span("mi-caret"));
    return el;
  }

  private slot(node: Node, k: number, path: Step[], i: number, extraClass = ""): HTMLSpanElement {
    return this.row(slotsOf(node)[k] ?? [], [...path, { node: i, slot: k }], extraClass, isOptionalSlot(node, k));
  }

  private atom(kind: string, text: string, extra: Record<string, string> = {}): HTMLSpanElement {
    const el = span("mi-atom", text);
    el.dataset.kind = kind;
    for (const [k, v] of Object.entries(extra)) el.dataset[k] = v;
    return el;
  }

  private node(node: Node, row: Row, i: number, path: Step[], parent: HTMLElement): HTMLSpanElement {
    const prev = row[i - 1];
    switch (node.t) {
      case "num": return this.atom("num", node.v);
      case "var": {
        const upright = /^[ΓΔΘΛΞΠΣΦΨΩ]$/.test(node.v);
        const el = this.atom("var", node.v);
        if (upright) el.dataset.upright = "";
        if (GREEK[node.v]) el.dataset.greek = "";
        return el;
      }
      case "const": return this.atom("const", CONST[node.v] ?? node.v, { name: node.v });
      case "op": {
        const unary = (node.v === "minus" || node.v === "plus" || node.v === "pm") &&
          (!prev || prev.t === "op" || prev.t === "rel" || prev.t === "text" || (prev.t === "sym" && prev.v === "comma"));
        const el = this.atom("op", OP[node.v] ?? node.v, { name: node.v });
        if (unary) el.dataset.unary = "";
        return el;
      }
      case "rel": return this.atom("rel", REL[node.v] ?? node.v, { name: node.v });
      case "fn": {
        const inv = /^arc(sin|cos|tan)$/.exec(node.v);
        const el = this.atom("fn", inv ? (inv[1] as string) : node.v, { name: node.v });
        if (inv) el.append(span("mi-fn__inverse", "−1"));
        return el;
      }
      case "sym": return this.atom("sym", SYM[node.v] ?? node.v, { name: node.v });
      case "text": return this.atom("text", node.v);
      case "unit": return this.atom("unit", node.v);
      case "element": return this.atom("element", node.v);
      case "state": return this.atom("state", STATE[node.v] ?? node.v);
      case "frac": case "deriv": {
        const el = span("mi-frac");
        if (node.t === "deriv") el.dataset.kind = "deriv";
        const num = this.slot(node, 0, path, i, "mi-frac__num");
        const den = this.slot(node, 1, path, i, "mi-frac__den");
        if (node.t === "deriv") {
          num.prepend(span("mi-atom mi-deriv__d", "d"));
          den.prepend(span("mi-atom mi-deriv__d", "d"));
        }
        el.append(num, span("mi-frac__bar"), den);
        return el;
      }
      case "sup": case "sub": {
        if (!prev || prev.t === "op" || prev.t === "rel" || prev.t === "text") {
          parent.append(span("mi-placeholder mi-placeholder--ghost"));
        }
        const el = span(`mi-${node.t}`);
        el.append(this.slot(node, 0, path, i));
        return el;
      }
      case "subsup": {
        if (!prev || prev.t === "op" || prev.t === "rel" || prev.t === "text") {
          parent.append(span("mi-placeholder mi-placeholder--ghost"));
        }
        const el = span("mi-subsup");
        const sup = span("mi-sup");
        sup.append(this.slot(node, 1, path, i));
        const sub = span("mi-sub");
        sub.append(this.slot(node, 0, path, i));
        el.append(sup, sub);
        return el;
      }
      case "root": {
        const el = span("mi-radical");
        if (node.index) el.append(this.slot(node, 0, path, i, "mi-radical__index"));
        el.append(radicalGlyph(), this.slot(node, node.index ? 1 : 0, path, i, "mi-radical__body"));
        return el;
      }
      case "fence": {
        const el = span("mi-fence");
        el.dataset.open = node.open;
        el.append(
          this.side("open", node.open, !!node.openGhost),
          this.slot(node, 0, path, i, "mi-fence__body"),
          this.side("close", node.close, !!node.closeGhost),
        );
        return el;
      }
      case "vector": {
        const el = span("mi-fence mi-vector");
        const grid = span("mi-vector__cells");
        grid.style.setProperty("--mi-cols", String(node.cols));
        node.cells.forEach((_, k) => grid.append(this.slot(node, k, path, i, "mi-vector__cell")));
        el.append(this.side("open", "(", false), grid, this.side("close", ")", false));
        return el;
      }
      case "recurring": {
        const el = span("mi-recurring");
        const body = this.slot(node, 0, path, i);
        const atoms = [...body.children].filter((c) => c.classList.contains("mi-atom"));
        atoms[0]?.classList.add("mi-recurring__dot");
        atoms[atoms.length - 1]?.classList.add("mi-recurring__dot");
        el.append(body);
        return el;
      }
      case "bigop": {
        const el = span("mi-bigop");
        el.dataset.op = node.op;
        const limits = span("mi-bigop__limits");
        limits.append(
          this.slot(node, 1, path, i, "mi-bigop__upper"),
          span("mi-bigop__sign", node.op === "int" ? "∫" : "∑"),
          this.slot(node, 0, path, i, "mi-bigop__lower"),
        );
        el.append(limits, this.slot(node, 2, path, i, "mi-bigop__body"));
        return el;
      }
      case "over": {
        const el = span("mi-over");
        el.dataset.kind = node.kind;
        el.append(this.slot(node, 0, path, i));
        return el;
      }
    }
  }

  private side(which: "open" | "close", ch: FenceChar, ghost: boolean): HTMLSpanElement {
    const el = span(`mi-fence__side mi-fence__side--${which}${ghost ? " mi-fence__side--ghost" : ""}`);
    el.append(fenceGlyph(ch));
    return el;
  }
}

/** Render a row. The root row gets `mi-row--root`. */
export function renderRow(row: Row, opts: RenderOptions = {}): HTMLSpanElement {
  return new Renderer(opts).row(row, [], "mi-row--root");
}
