/**
 * Test notation for editor state. Atoms print compactly; templates print as
 * name{slot;slot}; `|` is the caret; « » mark a selection; a ghost fence
 * side prints as `.`; elements print as ‹Mg›, units as ⟨m⟩.
 */
import { Editor, type EditorOptions } from "../../src/editor/editor.js";
import type { Position } from "../../src/editor/position.js";
import type { MathDocument, Node, Row, Subject } from "../../src/model/types.js";
import { slotsOf } from "../../src/model/slots.js";

const ATOM: Record<string, Record<string, string>> = {
  const: { pi: "π", e: "e", i: "i", infinity: "∞" },
  op: { plus: "+", minus: "-", times: "*", cdot: "·", div: "÷", slash: "/", pm: "±", mp: "∓" },
  rel: { eq: "=", neq: "≠", lt: "<", gt: ">", le: "≤", ge: "≥", approx: "≈", equiv: "≡", propto: "∝", to: "→", equilibrium: "⇌", implies: "⇒", iff: "⇔", ratio: ":" },
  sym: { degree: "°", factorial: "!", percent: "%", comma: ",", prime: "'", ellipsis: "…", uparrow: "↑", downarrow: "↓", delta: "Δ", therefore: "∴" },
};

export function dump(editor: Editor): string {
  const doc = editor.document;
  const caret = editor.caret;
  const sel = editor.selection();
  const pathKey = (p: { node: number; slot: number }[]) => p.map((s) => `${s.node}.${s.slot}`).join("/");
  const caretKey = pathKey(caret.path);
  const selKey = sel ? pathKey(sel.path) : null;

  const row = (r: Row, key: string): string => {
    let out = "";
    const marks = (i: number) => {
      let m = "";
      if (sel && selKey === key && sel.end === i) m += "»";
      if (key === caretKey && caret.index === i && !(sel && selKey === key)) m += "|";
      if (sel && selKey === key && sel.start === i) m += "«";
      return m;
    };
    r.forEach((n, i) => {
      out += marks(i);
      out += node(n, key, i);
    });
    out += marks(r.length);
    return out;
  };

  const node = (n: Node, key: string, i: number): string => {
    const slots = slotsOf(n).map((r, s) => row(r, key ? `${key}/${i}.${s}` : `${i}.${s}`));
    switch (n.t) {
      case "num": case "var": return n.v;
      case "fn": return n.v;
      case "text": return ` ${n.v} `;
      case "unit": return `⟨${n.v}⟩`;
      case "element": return `‹${n.v}›`;
      case "state": return `(${n.v})`;
      case "const": case "op": case "rel": case "sym": return ATOM[n.t]?.[n.v] ?? n.v;
      case "fence": return `${n.openGhost ? "." : n.open}${slots[0]}${n.closeGhost ? "." : n.close}`;
      case "sup": return `^{${slots[0]}}`;
      case "sub": return `_{${slots[0]}}`;
      case "subsup": return `_^{${slots.join(";")}}`;
      case "root": return n.index ? `root{${slots.join(";")}}` : `sqrt{${slots[0]}}`;
      case "frac": return `frac{${slots.join(";")}}`;
      case "deriv": return `d{${slots.join(";")}}`;
      case "vector": return `vec{${slots.join(";")}}`;
      case "recurring": return `rec{${slots[0]}}`;
      case "bigop": return `${n.op}{${slots.join(";")}}`;
      case "over": return `${n.kind}{${slots[0]}}`;
    }
  };

  return row(doc.root, "");
}

export function editor(subject: Subject = "maths", options: EditorOptions = {}): Editor {
  const doc: MathDocument = { version: 1, subject, root: [] };
  return new Editor(doc, options);
}

/** Type characters as from a keyboard. `←` `→` `↑` `↓` move, `⌫` deletes back, `⌦` forward. */
export function type(e: Editor, keys: string): Editor {
  for (const ch of Array.from(keys)) {
    switch (ch) {
      case "←": e.moveLeft(); break;
      case "→": e.moveRight(); break;
      case "↑": e.moveUp(); break;
      case "↓": e.moveDown(); break;
      case "⌫": e.deleteBackward(); break;
      case "⌦": e.deleteForward(); break;
      case "⇤": e.moveHome(); break;
      case "⇥": e.moveEnd(); break;
      default:
        if (!e.type(ch)) throw new Error(`type() did not handle ${JSON.stringify(ch)}`);
    }
  }
  return e;
}

export function typed(keys: string, subject: Subject = "maths", options: EditorOptions = {}): Editor {
  return type(editor(subject, options), keys);
}

export const at = (index: number, ...path: [number, number][]): Position =>
  ({ path: path.map(([node, slot]) => ({ node, slot })), index });
