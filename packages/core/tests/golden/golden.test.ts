import { describe, expect, it } from "vitest";
import { toLatex, toMathML, toSpoken, toText, validateDocument } from "../../src/index.js";
import { ALL } from "./cases.js";

describe("golden notation cases", () => {
  describe.each(ALL.map((c) => [`${c.doc.subject}: ${c.name}`, c] as const))("%s", (_, c) => {
    it("is a valid document", () => {
      expect(validateDocument(JSON.parse(JSON.stringify(c.doc)))).toEqual(c.doc);
    });
    it("LaTeX", () => expect(toLatex(c.doc)).toBe(c.latex));
    it("text", () => expect(toText(c.doc)).toBe(c.text));
    it("spoken", () => expect(toSpoken(c.doc)).toBe(c.spoken));
    it("MathML is well-formed", () => {
      const ml = toMathML(c.doc);
      expect(ml.startsWith("<math")).toBe(true);
      // Every opening tag has a matching close.
      const opens = [...ml.matchAll(/<([a-z]+)[\s>]/g)].map((m) => m[1]);
      const closes = [...ml.matchAll(/<\/([a-z]+)>/g)].map((m) => m[1]);
      expect(closes.sort()).toEqual(opens.sort());
    });
  });
});
