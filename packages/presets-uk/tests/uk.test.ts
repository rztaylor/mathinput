import { describe, expect, it } from "vitest";
import { keypadPreset, type Key, type KeypadLayout, type Subject } from "@mathinput/core";
import { UK_LEVELS, ukKeypad, ukKeypadPatch } from "../src/index.js";

const SUBJECTS: Subject[] = ["maths", "chemistry", "physics"];

function ids(layout: KeypadLayout): string[] {
  const top: Key[] = [...layout.numberPad.keys, ...layout.tabs.flatMap((t) => t.keys), ...layout.navigation];
  return [...top, ...top.flatMap((k) => k.variants ?? [])].map((k) => k.id);
}

describe("UK curriculum keypads", () => {
  it("hides A-level keys below A-level", () => {
    const maths = (l: (typeof UK_LEVELS)[number]) => ids(ukKeypad("maths", l));
    expect(maths("gcse-higher")).not.toContain("integral");
    expect(maths("gcse-higher")).not.toContain("fn-ln");
    expect(maths("gcse-higher")).not.toContain("rel-equiv");
    expect(maths("a-level")).toContain("integral");
    expect(maths("gcse-foundation")).not.toContain("column-vector");
    expect(maths("gcse-higher")).toContain("column-vector");
    expect(maths("gcse-foundation")).toContain("fn-arcsin");
  });

  it("A-level is the full preset", () => {
    for (const s of SUBJECTS) expect(ids(ukKeypad(s, "a-level"))).toEqual(ids(keypadPreset(s)));
  });

  it("keeps the chemistry log key for pH at every level", () => {
    for (const l of UK_LEVELS) expect(ids(ukKeypad("chemistry", l))).toContain("fn-log");
  });

  it("returns a fresh patch each time", () => {
    const p = ukKeypadPatch("gcse-higher");
    p.removeTags?.push("x");
    expect(ukKeypadPatch("gcse-higher").removeTags).not.toContain("x");
  });
});
