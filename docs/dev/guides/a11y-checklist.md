# Accessibility checklist (manual)

Automated checks cover axe (light and dark, phone/tablet/desktop) and token
contrast (`packages/element/tests/contrast.test.ts`). This checklist covers
what automation cannot. Run it before each release on the demo
(`npm run dev`) and record the date, platform and result in the release notes.

## Screen readers

Run with VoiceOver on iOS (Safari), VoiceOver on macOS (Safari and Chrome)
and NVDA on Windows (Firefox and Chrome).

- [ ] Tabbing to a field announces its label, "maths input" and the spoken
      expression (for example "x equals 1 over 2").
- [ ] After typing, pausing announces the updated expression once, not per key.
- [ ] Empty boxes are announced as "blank"; a bracket with a missing side as
      "bracket not closed".
- [ ] Every keypad key announces a meaningful name ("fraction", "squared",
      "move left"), never a raw symbol or "button".
- [ ] Keys with more options announce that they have a menu; Alt+ArrowDown
      (or the platform's menu gesture) opens it and each option is announced.
- [ ] Tabs announce "tab, selected" and switch with arrow keys.
- [ ] The periodic table is announced as a dialog and Escape closes it.
- [ ] Read-only expressions (`readonly`) are read as their spoken form.

## Keyboard only

- [ ] Everything is reachable: field, keypad toggle, tabs, keys, variants,
      periodic table, and back to the field.
- [ ] One tab stop per key grid; arrows, Home and End move within it.
- [ ] Focus is always visible, in both themes.
- [ ] Tab moves between empty boxes, then leaves the component.

## Motion, zoom and colour

- [ ] With reduced motion on, the caret does not blink and nothing shakes.
- [ ] At 200% zoom and at 320 px width nothing overlaps; the field scrolls
      horizontally for long expressions.
- [ ] Windows High Contrast / forced colours: keys, boxes, caret and fraction
      bars remain visible.
- [ ] Hold-for-options keys are distinguishable without colour (the corner
      shape, not only its colour).
