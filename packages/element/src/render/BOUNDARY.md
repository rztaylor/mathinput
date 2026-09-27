# render

Owns tree → DOM (`renderer.ts`), stretchy SVG glyphs (`glyphs.ts`) and
pointer hit-testing back to caret positions (`hit-test.ts`). Rendering is a
pure function of a row plus optional caret/selection; it never mutates state.

Does not handle events, focus or editing; `math-input.ts` wires those.
