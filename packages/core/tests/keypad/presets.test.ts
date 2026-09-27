import { describe, expect, it } from "vitest";
import { Editor } from "../../src/editor/editor.js";
import { applyKey, applyKeypadPatch, keypadPreset, type Key, type Level } from "../../src/index.js";
import { toLatex, toSpoken, toText, validateDocument } from "../../src/index.js";
import type { Subject } from "../../src/model/types.js";

const SUBJECTS: Subject[] = ["maths", "chemistry", "physics"];
const LEVELS: Level[] = ["gcse-foundation", "gcse-higher", "a-level"];

function allKeys(subject: Subject, level: Level): Key[] {
  const l = keypadPreset(subject, level);
  const top = [...l.numberPad.keys, ...l.tabs.flatMap((t) => t.keys), ...l.navigation];
  return [...top, ...top.flatMap((k) => k.variants ?? [])];
}

describe("keypad presets", () => {
  it.each(SUBJECTS.flatMap((s) => LEVELS.map((l) => [s, l] as const)))("%s / %s: ids unique within each tab", (s, l) => {
    const layout = keypadPreset(s, l);
    for (const tab of [layout.numberPad, ...layout.tabs, { id: "nav", keys: layout.navigation }]) {
      const ids = tab.keys.map((k) => k.id);
      expect(new Set(ids).size, `duplicate ids in ${tab.id}`).toBe(ids.length);
    }
  });

  it.each(SUBJECTS.flatMap((s) => LEVELS.map((l) => [s, l] as const)))("%s / %s: every key applies cleanly", (s, l) => {
    for (const k of allKeys(s, l)) {
      for (const start of ["", "x"]) {
        const e = new Editor({ version: 1, subject: s, root: [] });
        for (const ch of start) e.type(ch);
        applyKey(e, k);
        const d = validateDocument(JSON.parse(JSON.stringify(e.getDocument())));
        toLatex(d); toText(d); toSpoken(d);
      }
      expect(k.aria.length, k.id).toBeGreaterThan(0);
      if ("tree" in k.label) validateDocument({ version: 1, subject: s, root: k.label.tree });
    }
  });

  it("hides A-level keys below A-level", () => {
    const ids = (l: Level) => allKeys("maths", l).map((k) => k.id);
    expect(ids("gcse-higher")).not.toContain("integral");
    expect(ids("gcse-higher")).not.toContain("fn-ln");
    expect(ids("a-level")).toContain("integral");
    expect(ids("gcse-foundation")).not.toContain("column-vector");
    expect(ids("gcse-higher")).toContain("column-vector");
    expect(ids("gcse-foundation")).toContain("fn-arcsin");
  });

  it("offers separate open and close brackets with variants", () => {
    const pad = keypadPreset("maths").numberPad.keys.map((k) => k.id);
    expect(pad).toContain("open-bracket");
    expect(pad).toContain("close-bracket");
    const open = keypadPreset("maths").numberPad.keys.find((k) => k.id === "open-bracket");
    expect(open?.variants?.map((k) => k.id)).toEqual(["brackets", "open-square", "open-brace", "modulus"]);
  });

  it("brackets existing work with the keys (spec §7.4)", () => {
    const e = new Editor({ version: 1, subject: "maths", root: [] });
    for (const ch of "2x+3") e.type(ch);
    const keys = keypadPreset("maths").numberPad.keys;
    const k = (id: string) => keys.find((x) => x.id === id) as Key;
    e.moveHome();
    applyKey(e, k("open-bracket"));
    e.moveEnd();
    applyKey(e, k("close-bracket"));
    applyKey(e, k("power").variants?.find((x) => x.id === "square") as Key);
    expect(toLatex(e.getDocument())).toBe("(2x+3)^{2}");
  });

  it("inserts a prefixed template as one undo step", () => {
    const e = new Editor({ version: 1, subject: "physics", root: [] });
    e.type("3");
    const sci = keypadPreset("physics").navigation[0] as Key;
    applyKey(e, sci);
    e.type("8");
    expect(toLatex(e.getDocument())).toBe("3\\times 10^{8}");
    e.undo();
    e.undo();
    expect(toLatex(e.getDocument())).toBe("3");
  });

  it("uses the fraction key's mixed-number variant without absorbing", () => {
    const e = new Editor({ version: 1, subject: "maths", root: [] });
    e.type("1");
    const frac = keypadPreset("maths").numberPad.keys.find((k) => k.id === "fraction") as Key;
    applyKey(e, frac.variants?.[0] as Key);
    e.type("1"); e.moveDown(); e.type("2");
    expect(toLatex(e.getDocument())).toBe("1\\frac{1}{2}");
  });

  it("applies host patches", () => {
    const base = keypadPreset("maths");
    const patched = applyKeypadPatch(base, {
      removeKeys: ["letter-t"],
      removeTabs: ["letters"],
      addKeys: { algebra: [{ id: "k", label: { text: "k" }, aria: "k", action: { type: "k" } }] },
    });
    expect(patched.tabs.map((t) => t.id)).not.toContain("letters");
    const algebra = patched.tabs.find((t) => t.id === "algebra");
    expect(algebra?.keys.map((k) => k.id)).not.toContain("letter-t");
    expect(algebra?.keys.at(-1)?.id).toBe("k");
  });
});
