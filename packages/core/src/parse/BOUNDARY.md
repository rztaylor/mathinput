# parse

Owns string → tree conversion: the LaTeX subset (`latex.ts`, spec §7.7), the
mhchem subset used inside `\ce{}` and in chemistry text (`mhchem.ts`), linear
text (`text.ts`, §6.2), and the clipboard codec (`clipboard.ts`, §7.8).
Every failure is a `ParseError` with a position.

Does not serialise (`serialize`), edit (`editor`) or read the DOM clipboard
(`@mathinput/element` does that and hands the flavours here). Depends on
`model`, `rules` (operand absorption for `a/b`) and `serialize` (clipboard
encoding only).
