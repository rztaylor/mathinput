# serialize

Owns the pure tree → string conversions: LaTeX with the mhchem path
(`latex.ts`), linear text (`text.ts`), spoken English (`spoken.ts`) and
MathML (`mathml.ts`), per spec §6. Output is pinned by the golden cases in
`tests/golden/`.

Does not parse strings back into trees (`parse`) and never inspects editor or
DOM state. Depends only on `model`.
