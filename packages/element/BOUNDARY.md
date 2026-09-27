# @mathinput/element

Owns the `<math-input>` custom element: light-DOM structure, rendering the
tree with `mi-*` classes, pointer/keyboard/IME/clipboard input, the live
region, events and the public attribute/property/method API (spec §4), the
default stylesheet and tokens (§10), and (from plan phase 5) the keypad UI.

Does not own editing behaviour, notation rules, serialisation or parsing —
it drives `@mathinput/core` for all of those. Framework wrappers live in
their own packages. Depends only on `@mathinput/core`.
