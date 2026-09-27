# MathInput — Implementation Plan

Companion to the spec [mathinput-component.md](../specs/mathinput-component.md). Status: active · 27 September 2026

The plan is ordered so that every phase ends with something testable and
the risky parts (editing engine, touch behaviour) are proved early. Phases 1
to 3 are headless and fast to iterate; the DOM arrives in phase 4.

---

## Repository layout

```
MathInput/
├── package.json                 # npm workspaces, shared scripts
├── tsconfig.base.json
├── eslint.config.js · .prettierrc · .editorconfig
├── vitest.workspace.ts · playwright.config.ts
├── .changeset/                  # changesets for versioning
├── AGENTS.md · README.md · CHANGELOG.md
├── .agents/facts/               # repo facts for agents
├── docs/
│   ├── dev/specs/               # mathinput-component.md (the contract), prototype/
│   ├── dev/plans/               # this plan
│   ├── dev/roadmap.md · dev/decisions.md · dev/ops/release-governance.md
│   └── user/                    # theming.md · keypad-config.md · formats.md (phase 7)
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── model/           # types.ts, builders.ts, validate.ts, migrate.ts
│   │   │   ├── editor/          # cursor.ts, selection.ts, commands.ts, history.ts, editor.ts
│   │   │   ├── rules/           # absorb.ts, autoreplace.ts, chemistry.ts, elements.ts, units.ts
│   │   │   ├── serialize/       # latex.ts, text.ts, spoken.ts, mathml.ts
│   │   │   ├── parse/           # latex/ (tokenizer, parser), text.ts, clipboard.ts
│   │   │   └── keypad/          # types.ts, keys.ts, presets/{maths,chemistry,physics}.ts, patch.ts
│   │   └── tests/               # unit + golden
│   ├── element/
│   │   ├── src/
│   │   │   ├── math-input.ts    # the custom element
│   │   │   ├── render/          # renderer.ts, layout.ts, glyphs.ts, hit-test.ts
│   │   │   ├── input/           # keyboard.ts, pointer.ts, ime.ts, clipboard.ts
│   │   │   ├── keypad/          # keypad.ts, key.ts, variants.ts, periodic-table.ts, form-factor.ts
│   │   │   ├── a11y/            # live-region.ts, roving-focus.ts
│   │   │   └── styles/          # tokens.css, mathinput.css (Tailwind source), tailwind-preset.ts
│   │   ├── demo/                # Vite playground with subject/device switches
│   │   └── tests/               # component (vitest + jsdom) and browser (Playwright)
│   └── react/
│       ├── src/MathInput.tsx
│       └── tests/
└── tests/
    ├── golden/                  # notation coverage: tree ⇄ latex/text/spoken
    └── browser/                 # cross-device Playwright suites
```

Tooling: TypeScript 5.x strict, Vite for the demo and library builds
(`vite build --lib`, ESM + types), Vitest for unit and jsdom tests,
Playwright for browser tests (Chromium, WebKit, Firefox; iPhone 13, iPad,
desktop projects), axe-core, changesets, GitHub Actions CI.

---

## Phase 0 — Scaffold (½ day)

- npm workspaces with the three packages, shared tsconfig and ESLint.
- Vite library build for each package; `exports` map with types.
- Vitest and Playwright wired with one passing test each.
- CI: typecheck, lint, unit, browser, size-limit.
- Prototype kept in `docs/dev/specs/prototype/`; `AGENTS.md` and
  `.agents/facts/` point at the spec, plan and conventions.

**Done when** `npm run check` passes green on CI with empty packages.

---

## Phase 1 — Model and serialisers (2 days)

`packages/core/src/model`, `serialize`

1. Types for `MathDocument`, atoms and templates exactly as SPEC §3.
2. Builders: `num("12.5")` → atoms, `frac(numRow, denRow)`, etc. Used by
   tests and by keypad presets.
3. `validateDocument` (structural, no external schema library) and
   `migrateDocument` (identity for v1, with the hook in place).
4. `toLatex` with options; `toText`; `toSpoken`; `toMathML`.
5. Golden test harness: `tests/golden/cases.ts` entries of the form
   `{ name, doc, latex, text, spoken }`, trees written with the builders.
   One test per format asserts equality.
6. Check every golden LaTeX string renders in KaTeX + mhchem without
   warnings (a Vitest test using `renderToString` in `strict` mode).

**Status (27 Sep 2026): done.** 86 golden cases across maths, chemistry and
physics; MathML checked for well-formedness only. Remaining §9 items to add
as golden cases when their keys land: binomial ⁿCᵣ, `fg(x)`, 2×2 matrix
determinants, reaction-arrow conditions (v1.1).

**Done when** golden tests pass for all §9 items and the KaTeX check is
clean.

---

## Phase 2 — Headless editor (3 days)

`packages/core/src/editor`, `rules`

1. Cursor and selection types; tree navigation helpers (parent map built
   per edit, or parent pointers — decide by benchmark on a 200-node tree).
2. Commands from SPEC §7.2 with the semantics written out as tests first:
   - insert atom / template, with selection wrapping;
   - operand absorption (§7.3), including bracketed operands with powers;
   - move left/right entering and leaving templates; up/down in fractions
     and bigops; next/previous placeholder with wrap-around; exitTemplate;
   - deleteBackward/Forward including unwrap-at-row-start;
   - single brackets (SPEC §7.4): open/close with ghost partners, solidifying
     a ghost, deleting a side back to a ghost, wrapping a selection, and the
     examples table in the spec as literal test cases;
   - selectAll, clear.
3. History with command grouping and a 200-step cap.
4. Rules: auto-replace with longest match; chemistry element merging and
   auto-subscript; digit-after-arrow stays a coefficient; `e` + charge.
5. Editor emits change notifications with a `dirtyRows` hint for the
   renderer.
6. Property-based test: random command sequences never produce an invalid
   document and undo always restores the previous state.

**Done when** the command test suite (~150 cases) passes and the fuzz test
runs 10 000 sequences clean.

**Status (27 Sep 2026): done.** 101 behaviour tests; the property test runs
2 × 2,500 sequences (maths and chemistry) per `npm test` and found two bugs,
now fixed with regression tests. Single-bracket ghosts, the edge rule and
selection-as-base for scripts were added to the spec while implementing.

---

## Phase 3 — Parsers and clipboard (2 days)

`packages/core/src/parse`

1. LaTeX tokenizer and recursive-descent parser for the subset in SPEC §7.6,
   including `\ce{}`. Errors carry position and token.
2. `fromText` for the linear syntax (§6.2).
3. Round-trip tests: for every golden case, `fromLatex(toLatex(tree))`
   equals `tree`, and likewise for text.
4. Clipboard codec: encode to the three flavours; decode with the fallback
   order.

**Done when** round-trips pass for all golden cases and a corpus of 30
hand-written "messy" LaTeX inputs either parses correctly or fails with a
clear error.

**Status (27 Sep 2026): done.** Round trips are checked as re-serialisation
identity (spec §7.7). 29 LaTeX variants, 7 mhchem variants, 7 clear-error
cases, text and clipboard tests, and LaTeX and text parser fuzzing
(3,000 runs each) pass.

---

## Phase 4 — Renderer and field (4 days)

`packages/element/src/render`, `math-input.ts`, `input`

1. DOM renderer from tree to `mi-*` elements: rows, atoms with `data-kind`,
   fractions, scripts, radicals and fences with SVG glyphs, vectors,
   bigops, accents, recurring dots, ghost bracket sides (faded, still
   growing with content). Metrics per SPEC §10.5.
2. Caret rendering, active-row highlight, placeholder boxes, selection
   highlight.
3. Incremental update: re-render only rows in `dirtyRows`; full re-render on
   structural change.
4. Hit testing: pointer position → `(row, index)` by measuring atom rects in
   the nearest row; double-tap token selection; drag selection within a row.
5. The custom element: attributes and properties (§4.1), events (§4.2),
   methods (§4.3), `readonly` and `disabled`, placeholder text, auto-scroll
   to keep the caret visible, shake on empty submit.
6. Hardware keyboard handling (§7.4) and the hidden `contenteditable`
   receiver for IME/dictation; `inputmode="none"` on coarse pointers.
7. Visual comparison test: render each golden case in the field and in
   KaTeX side by side in the demo page; a Playwright screenshot suite guards
   against regressions (not pixel-identical to KaTeX, but stable).

**Done when** every golden case renders, keyboard editing works end to end
in the demo, and screenshot tests are recorded on Chromium, WebKit and
Firefox.

**Status (27 Sep 2026): done except** WebKit/Firefox (not installed locally),
incremental row rendering (deferred to phase 9 measurement) and pixel
screenshot baselines (screenshots are saved and reviewed, not diffed yet).
Focus, IME, dictation and clipboard go through a hidden textarea inside the
field. The gallery was reviewed against KaTeX; fixes made for stacked
scripts, optional-slot placeholders, the mean bar, italic d and unary minus
after a comma.

---

## Phase 5 — Keypad (4 days)

`packages/element/src/keypad`, `core/src/keypad`

1. Key, tab and layout types; presets for maths/chemistry/physics ×
   foundation/higher/a-level; `applyPatch` for host customisation with
   tests that every preset key id is unique and stable.
2. Key label rendering through the field renderer at key scale
   (`{ tree }` labels), including active-placeholder emphasis.
3. Form-factor detection with `ResizeObserver` and pointer media queries;
   phone / tablet / desktop layouts; `keypad="auto|always|never|collapsed"`;
   `keypad-container` re-parenting.
4. Pointer handling: pressed state on `pointerdown`, activation without
   waiting for `click`, no focus theft from the field, `preventDefault` on
   touch to stop the OS keyboard.
5. Variants: indicator element, long-press timer with cancel on move,
   right-click and `ArrowUp` opening, menu positioning inside the
   container, `role="menu"` keyboard navigation, dismissal.
6. Tabs with `tablist` semantics and roving focus across the key grid.
7. Periodic table sheet.
8. Browser tests on the iPhone and iPad Playwright projects: tapping keys
   builds the expected tree; bracketing existing work with separate `(` and
   `)` keys (SPEC §7.4 examples) works by touch alone; long press opens variants; the OS keyboard does
   not appear (asserted via `inputmode` and focus target).

**Done when** all presets render on all three form factors, the device test
suite passes, and a manual pass on a real iPad and Android phone confirms
tap latency and no OS keyboard.

**Status (27 Sep 2026): done except the manual real-device pass** (needs a
person with an iPad and an Android phone). Presets and patches are tested in
core (24 tests); the UI has 14 jsdom tests and 6 Playwright tests × 3 form
factors, including long-press slide-to-pick, bracketing existing work by
keys, the periodic table and axe. Found and fixed a circular sizing loop
(the keypad could widen its own container).

---

## Phase 6 — Subject behaviour and accessibility (2 days)

1. Chemistry and physics rules wired to the keypad and keyboard (already
   tested headlessly in phase 2); the chemistry "space" key; units tab.
2. Live region with debounced spoken text; `aria-describedby`; key and tab
   labels; focus order; `Escape` handling.
3. Reduced-motion and high-contrast checks; token contrast audit script.
4. axe-core in the Playwright suite for every layout and subject.
5. Manual screen-reader pass (VoiceOver iOS and macOS, NVDA) with a written
   checklist in `docs/dev/guides/a11y-checklist.md`.

**Done when** axe reports no violations and the manual checklist is signed
off.

**Status (27 Sep 2026): automated part done.** Axe passes in light and dark
on all three form factors; a token contrast audit (33 checks) runs in
`npm test` and led to darker placeholder borders and variant indicator. The
manual checklist (`docs/dev/guides/a11y-checklist.md`) still needs a person
with VoiceOver and NVDA. Forced-colours styling is not yet done.

---

## Phase 7 — Theming and default stylesheet (2 days)

1. `tokens.css` with light and dark sets and `theme="auto|light|dark"`.
2. `mathinput.css` authored in Tailwind with `@apply`, compiled to plain CSS
   in `@layer mathinput`, shipped in the package; the Tailwind preset export.
3. Demo page "Skins" tab: default, a high-contrast skin, and an NG+-styled
   skin built only with token overrides, to prove level-1 reskinning covers
   a real design system. Variant indicator shown as triangle, dot and bar.
4. `docs/user/theming.md`, `docs/user/keypad-config.md`, `docs/user/formats.md`.

**Done when** the three skins render correctly in light and dark and the
docs cover every token and hook in SPEC §10.

**Status (27 Sep 2026): done, with one change.** The stylesheet stays plain
CSS; Tailwind support is `tailwind.css` (layer order + token theme),
verified by compiling with Tailwind v4 in CI. The demo has four skins
(default, high contrast, NG+ style, paper) built from tokens only, indicator
shape and level switches. Docs: `docs/user/theming.md`,
`keypad-config.md`, `formats.md`.

---

## Phase 8 — React wrapper and host integration (1½ days)

1. `@mathinput/react`: props to attributes, event props, controlled and
   uncontrolled value, forwarded ref, React 18 and 19 tested.
2. Storybook-free examples in the demo: a "show your working" host that
   keeps a list of steps and sends them to a fake tutor as Markdown with
   `$…$` and `$\ce{…}$`.
3. Integration spike in NG+ (in a branch of `~/src/ngplus`): replace
   `ui/MathEditor` and the maths parts of `ui/SymbolBar` in the Practise
   answer box; confirm the emitted LaTeX renders through `ui/Markdown`
   unchanged. Findings feed back into the spec before release.

**Done when** the NG+ spike works on phone and desktop layouts and any
required API changes are recorded as spec amendments.

---

## Phase 9 — Hardening and release 0.1 (2 days)

1. Performance pass on a mid-range Android device: edit latency, keypad
   build time, memory. Fix anything over the SPEC §12 targets.
2. Bundle size check against the targets; tree-shaking of unused presets.
3. Fuzz the parsers with random LaTeX from the golden vocabulary.
4. README with quick start for vanilla, React and Vite; changelog; MIT
   licence; publish `0.1.0` of the three packages.

**Done when** the release is published and the demo is deployed (GitHub
Pages) for stakeholder review.

---

## Timeline and effort

| Phase | Effort | Cumulative |
|---|---|---|
| 0 Scaffold | 0.5 d | 0.5 d |
| 1 Model and serialisers | 2 d | 2.5 d |
| 2 Headless editor | 3 d | 5.5 d |
| 3 Parsers | 2 d | 7.5 d |
| 4 Renderer and field | 4 d | 11.5 d |
| 5 Keypad | 4 d | 15.5 d |
| 6 Subject rules and a11y | 2 d | 17.5 d |
| 7 Theming | 2 d | 19.5 d |
| 8 React and NG+ spike | 1.5 d | 21 d |
| 9 Hardening and release | 2 d | 23 d |

About five working weeks of focused work for one developer (or a pair of
agents working phases 1–3 and the demo/styling in parallel). The estimate
excludes stakeholder review cycles.

---

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Touch behaviour differs between iOS Safari and Android Chrome (focus, OS keyboard, long press) | Keypad unusable on one platform | Phase 5 device tests in Playwright plus manual checks on real hardware before moving on; hidden `contenteditable` isolates the OS keyboard problem to one file |
| Own renderer drifts from KaTeX so the field and the rendered answer look different | Learner confusion | Side-by-side visual test page in phase 4; metrics pinned in the spec |
| Ghost brackets confuse learners who expect pairs | Hesitation or unbalanced answers | Faded ghost shows where the bracket will close; pair insert stays available as a variant; include in the phase 5 usability check |
| Operand absorption surprises learners (`2+3` then fraction) | Wrong expressions submitted | Rules written as tests from calculator behaviour; usability check with two or three learners after phase 5 |
| Chemistry auto-subscript wrong for edge cases (`Co` vs `CO`, coefficients after `+`) | Wrong formulas | Element table with tests; explicit "space" key; learners can always tap the subscript key |
| Light DOM style leakage from hosts | Broken layout in some hosts | `@layer`, scoped selectors, a documented reset for the field; shadow wrapper recipe in docs |
| LaTeX parser scope creep | Time | Subset frozen in SPEC §7.6; anything else errors clearly |
| Accessibility of a custom editor | Excluded users | Live region and full keyboard operation are in the plan from phase 4, not an afterthought; manual SR pass gates release |

---

## Working agreements

- Tests before behaviour for the editor and serialisers; golden files are
  the notation contract and are reviewed like code.
- Every spec change updates `docs/dev/specs/mathinput-component.md` first.
- No feature lands without phone, tablet and desktop screenshots in the
  demo.
- Conventional commits; changesets on every user-visible change.
