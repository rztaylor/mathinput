/**
 * Property test (plan phase 2): random command sequences never produce an
 * invalid document or caret, keep the ghost-bracket invariants, never break a
 * serialiser, and undo always returns to the start.
 */
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { Editor } from "../../src/editor/editor.js";
import { isValidPosition, rowAt, samePath } from "../../src/editor/position.js";
import { colvec, frac, integral, nroot, sqrt, sup } from "../../src/model/builders.js";
import { slotsOf } from "../../src/model/slots.js";
import type { Row, Subject } from "../../src/model/types.js";
import { validateDocument } from "../../src/model/validate.js";
import { toLatex, toMathML, toSpoken, toText } from "../../src/index.js";

type Cmd = ((e: Editor) => void) & { toString(): string };

/** Commands print their label in counterexamples. */
const label = (name: string, fn: (e: Editor) => void): Cmd => Object.assign(fn, { toString: () => name });

const CHARS = "0123456789.xyabHOClNa+-*/^_()[]|=<>!,: ";
const commands: fc.Arbitrary<Cmd>[] = [
  fc.constantFrom(...Array.from(CHARS)).map((ch) => label(`type ${JSON.stringify(ch)}`, (e) => void e.type(ch))),
  fc.constantFrom<keyof Editor>(
    "moveLeft", "moveRight", "moveUp", "moveDown", "moveHome", "moveEnd", "moveToNextPlaceholder",
    "moveToPreviousPlaceholder", "exitTemplate", "extendLeft", "extendRight", "deleteBackward", "deleteForward",
    "selectAll", "undo", "redo",
  ).map((name) => label(String(name), (e) => void (e[name] as () => boolean).call(e))),
  fc.constantFrom(frac([], []), sup([]), sup("2"), sqrt([]), nroot([], []), colvec([], []), integral(undefined, undefined, []))
    .map((t) => label(`insert ${t.t}`, (e) => void e.insertTemplate(t))),
  fc.constantFrom<"(" | "[" | ")" | "]">("(", "[", ")", "]").map((b) => label(`bracket ${b}`, (e) =>
    void (b === "(" || b === "[" ? e.openBracket(b) : e.closeBracket(b)))),
  fc.constantFrom<"(" | "|">("(", "|").map((b) => label(`wrap ${b}`, (e) => void e.wrapInBrackets(b))),
];

function checkInvariants(e: Editor): void {
  const d = e.getDocument();
  validateDocument(JSON.parse(JSON.stringify(d)));
  expect(isValidPosition(d.root, e.caret)).toBe(true);
  const a = e.anchor;
  if (a) {
    expect(isValidPosition(d.root, a)).toBe(true);
    expect(samePath(a.path, e.caret.path)).toBe(true);
  }
  const visit = (row: Row) => {
    row.forEach((n, i) => {
      if (n.t === "fence") {
        expect(n.openGhost && n.closeGhost).toBeFalsy();
        if (n.closeGhost) expect(i).toBe(row.length - 1);
        if (n.openGhost) expect(i).toBe(0);
      }
      slotsOf(n).forEach(visit);
    });
  };
  visit(d.root);
  // The caret never sits after a ghost close or before a ghost open.
  const row = rowAt(d.root, e.caret.path);
  const before = row[e.caret.index - 1];
  const after = row[e.caret.index];
  expect(!!(before?.t === "fence" && before.closeGhost && e.caret.index === row.length)).toBe(false);
  expect(!!(after?.t === "fence" && after.openGhost && e.caret.index === 0)).toBe(false);
  toLatex(d); toText(d); toSpoken(d); toMathML(d);
}

describe("editor fuzz", () => {
  it.each<Subject>(["maths", "chemistry"])("keeps invariants (%s)", (subject) => {
    fc.assert(
      fc.property(fc.array(fc.oneof(...commands), { maxLength: 60 }), (cmds) => {
        const e = new Editor({ version: 1, subject, root: [] });
        for (const cmd of cmds) {
          cmd(e);
          checkInvariants(e);
        }
        // Undo all the way back to the empty start.
        const end = JSON.stringify(e.document);
        let undone = 0;
        while (undone < 500 && e.undo()) { undone++; checkInvariants(e); }
        expect(e.document.root).toEqual([]);
        // Redo exactly as far forward again.
        for (let k = 0; k < undone; k++) { expect(e.redo()).toBe(true); checkInvariants(e); }
        expect(JSON.stringify(e.document)).toBe(end);
      }),
      { numRuns: 2500 },
    );
  });
});
