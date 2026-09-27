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
