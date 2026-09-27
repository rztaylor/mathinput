# rules

Owns the small, pure decisions the editor consults: operand absorption for
fractions (§7.3), the auto-replace word table (§7.5), and chemistry input
rules (§7.6: element merging, automatic subscripts).

Does not mutate trees or hold state; the `editor` applies the decisions.
Depends only on `model`.
