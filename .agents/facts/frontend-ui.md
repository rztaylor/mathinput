# Frontend UI facts

- The product is a UI component, not an app. UI source lives in
  `packages/element/src`; there are no routes or pages. The demo playground
  (`packages/element/demo`) is a consumer, not an owner of UI patterns.
- Layers inside the element: `render/` (tree → DOM), `keypad/` (keys, tabs,
  variants, periodic table), `input/` (keyboard, pointer, IME, clipboard),
  `a11y/` (live region, roving focus), `styles/` (tokens and default CSS).
  `math-input.ts` composes them.
- Styling: plain CSS custom properties `--mi-*` own every colour, size, radius
  and font (spec §10.3). Default CSS is authored with Tailwind and shipped
  compiled inside `@layer mathinput`; consumers never need Tailwind.
- Class contract: `mi-*` names listed in spec §10.2 are public API.
- Light DOM only. All DOM is built with DOM APIs; `innerHTML` is allowed only
  for host-supplied `{ html }` key labels.
- Themes: light and dark token sets; `theme="auto"` follows
  `prefers-color-scheme`. Both themes are validated.
- Form factors: phone (< 600 px), tablet (600–1023 px or coarse pointer),
  desktop (≥ 1024 px and fine pointer), decided by container width.
- Accessibility: WCAG 2.2 AA; keyboard-complete; spoken form in a live region;
  targets ≥ 44 px on touch, ≥ 40 px desktop; reduced-motion respected.
- Design reference: the prototype in `docs/dev/specs/prototype/`.
