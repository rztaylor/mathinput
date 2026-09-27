/**
 * Plan phase 3: every golden case survives a round trip through its own
 * serialisations. Trees may differ in equivalent ways (for example `e` as a
 * variable or a constant), so the check is that re-serialising the parsed
 * tree gives exactly the same strings.
 */
import { describe, expect, it } from "vitest";
import { fromLatex, fromText, toLatex, toSpoken, toText } from "../../src/index.js";
import { ALL } from "../golden/cases.js";

describe("round trips", () => {
  describe.each(ALL.map((c) => [`${c.doc.subject}: ${c.name}`, c] as const))("%s", (_, c) => {
    it("LaTeX → tree → LaTeX", () => {
      const back = fromLatex(c.latex, c.doc.subject);
      expect(toLatex(back)).toBe(c.latex);
    });
    it("LaTeX → tree keeps the spoken form", () => {
      expect(toSpoken(fromLatex(c.latex, c.doc.subject))).toBe(c.spoken);
    });
    it("text → tree → text", () => {
      const back = fromText(c.text, c.doc.subject);
      expect(toText(back)).toBe(c.text);
    });
  });
});
