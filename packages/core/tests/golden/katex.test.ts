/**
 * Every golden LaTeX string must render in KaTeX with mhchem, in strict mode,
 * without errors or warnings (spec §6.1).
 */
import { describe, expect, it } from "vitest";
import katex from "katex";
import "katex/contrib/mhchem";
import { ALL } from "./cases.js";

describe("KaTeX renders golden LaTeX", () => {
  it.each(ALL.map((c) => [`${c.doc.subject}: ${c.name}`, c.latex] as const))("%s", (_, latex) => {
    const warnings: string[] = [];
    const html = katex.renderToString(latex, {
      throwOnError: true,
      strict: (code: string, msg: string) => {
        warnings.push(`${code}: ${msg}`);
        return "ignore";
      },
    });
    expect(html).toContain("katex");
    expect(warnings).toEqual([]);
  });
});
