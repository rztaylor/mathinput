# Changelog

All notable changes to MathInput are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

## Unreleased

### Added

- Component specification, implementation plan and interactive prototype.
- `@mathinput/core`: expression tree model, builders and JSON validation.
- `@mathinput/core`: LaTeX (with mhchem for chemistry), linear text, spoken
  English and MathML serialisers, pinned by golden notation tests that also
  render every LaTeX string in KaTeX.
- `@mathinput/core`: headless `Editor` — caret and selection, insertion with
  calculator-style operand absorption, single brackets with ghost partners,
  movement, deletion, keyboard input with auto-replace and chemistry rules,
  undo/redo, change events — and the lazy `MathInputValue` bundle.
- `@mathinput/core`: `fromLatex` (LaTeX subset and mhchem), `fromText`, and a
  clipboard codec with tree, LaTeX and text flavours.
- `@mathinput/element`: the `<math-input>` custom element with its own
  renderer (stretchy brackets and radicals, ghost bracket sides, caret,
  selection), pointer and keyboard editing, IME/dictation and clipboard via a
  hidden receiver, typed events, a debounced spoken live region, and a
  default stylesheet of `--mi-*` tokens with light and dark themes.
- Demo playground with a MathInput-versus-KaTeX gallery of every golden case.
- Keypad: presets for maths, chemistry and physics; keys labelled with the expression they insert; an
  orange corner marks keys with more options (long press, right-click or
  Alt+ArrowDown); phone, tablet and desktop layouts; periodic table;
  host patches and `keypad-container` placement.
- Keypad topic tags (`calculus`, `logarithms`, `proof`, …) and
  `removeTags` in keypad patches, to trim a keypad to a course.
- `@mathinput/presets-uk`: optional keypads for GCSE Foundation, GCSE Higher
  and A-level (`ukKeypadPatch`, `ukKeypad`). The demo's "Keys" control uses it.
- Theming: `@mathinput/element/tailwind.css` for Tailwind v4 hosts (layer
  order and `--mi-*` tokens as theme utilities); integrator guides for
  theming, keypad configuration and output formats in `docs/user/`; demo
  skins built from tokens only.
- `@mathinput/react`: `<MathInput>` with typed props, controlled and
  uncontrolled values, event callbacks and a ref to the element.
- The `autoreplace` attribute now takes effect (`autoreplace="false"`).
- Website (`site/`): homepage, documentation (from `docs/user/`) and demo with
  live skin switching and copyable skin CSS; Cloudflare Pages workflow for
  mathinput.rztaylor.uk from the `release` branch.
- Guides: getting started and API reference.

### Removed

- The `level` attribute and React prop, the `Level` type and the `level`
  argument of `keypadPreset`. Keypads now offer every key by default; use
  `el.keypadLayout = ukKeypadPatch("gcse-higher")` from
  `@mathinput/presets-uk` for the previous default.

### Fixed

- The keypad toggle stayed visible with `keypad="never"`.
