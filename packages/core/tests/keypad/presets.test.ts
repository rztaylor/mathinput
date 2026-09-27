import { describe, expect, it } from "vitest";
import { Editor } from "../../src/editor/editor.js";
import { applyKey, applyKeypadPatch, keypadPreset, type Key } from "../../src/index.js";
import { toLatex, toSpoken, toText, validateDocument } from "../../src/index.js";
import type { Subject } from "../../src/model/types.js";

const SUBJECTS: Subject[] = ["maths", "chemistry", "physics"];
/** The preset tags documented in spec §8.3. */
const PRESET_TAGS = [
  "column-vectors", "logarithms", "exponentials", "infinity", "calculus", "series", "vector-notation", "reciprocal-trig", "proof",
];

function allKeys(subject: Subject): Key[] {
  const l = keypadPreset(subject);
  const top = [...l.numberPad.keys, ...l.tabs.flatMap((t) => t.keys), ...l.navigation];
  return [...top, ...top.flatMap((k) => k.variants ?? [])];
}

describe("keypad presets", () => {
  it.each(SUBJECTS)("%s: ids unique within each tab", (s) => {
    const layout = keypadPreset(s);
    for (const tab of [layout.numberPad, ...layout.tabs, { id: "nav", keys: layout.navigation }]) {
      const ids = tab.keys.map((k) => k.id);
      expect(new Set(ids).size, `duplicate ids in ${tab.id}`).toBe(ids.length);
    }
  });

  it.each(SUBJECTS)("%s: every key applies cleanly", (s) => {
    for (const k of allKeys(s)) {
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

  it("offers every key by default and tags topic keys", () => {
    const keys = allKeys("maths");
    expect(keys.map((k) => k.id)).toEqual(expect.arrayContaining(["integral", "fn-ln", "column-vector", "rel-equiv"]));
    const used = new Set(SUBJECTS.flatMap((s) => allKeys(s).flatMap((k) => k.tags ?? [])));
    expect([...used].sort()).toEqual([...PRESET_TAGS].sort());
    expect(keys.find((k) => k.id === "integral")?.tags).toEqual(["calculus"]);
  });

  it("removes keys and variants by tag, and drops emptied tabs", () => {
    const patched = applyKeypadPatch(keypadPreset("maths"), { removeTags: ["calculus", "proof", "logarithms"] });
    const top = [...patched.numberPad.keys, ...patched.tabs.flatMap((t) => t.keys)];
    const ids = [...top, ...top.flatMap((k) => k.variants ?? [])].map((k) => k.id);
    expect(ids).not.toContain("integral");
    expect(ids).not.toContain("d-dx");
    expect(ids).not.toContain("dy-dx");
    expect(ids).not.toContain("fn-ln");
    expect(ids).not.toContain("rel-equiv");
    expect(ids).toContain("rel-approx");
    expect(ids).toContain("fn-arcsin");
    const onlyTagged = applyKeypadPatch(keypadPreset("maths"), { removeKeys: ["fn-sin"], removeTags: [] });
    expect(onlyTagged.tabs.map((t) => t.id)).toContain("functions");
    const emptied = applyKeypadPatch(keypadPreset("maths"), {
      addTabs: [], removeKeys: keypadPreset("maths").tabs.find((t) => t.id === "greek")?.keys.map((k) => k.id) ?? [],
    });
    expect(emptied.tabs.map((t) => t.id)).not.toContain("greek");
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
