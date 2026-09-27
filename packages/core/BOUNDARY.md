# @mathinput/core

Owns the expression tree and everything that can be done with it without a
DOM: the model and validation, serialisers (LaTeX, text, spoken, MathML),
parsers, the headless editor, and keypad definitions (as data).

Does not own rendering, input events, focus, styling or any browser API —
those belong to `@mathinput/element`. Has no runtime dependencies and must
stay usable in Node.

Dependency direction inside: `model` ← `serialize`, `parse`, `rules`, `editor`
← `keypad`. `model` imports nothing else.
