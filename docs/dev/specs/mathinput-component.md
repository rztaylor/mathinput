# MathInput — Component Specification

Status: draft for review · Version 0.2 · 27 September 2026

MathInput is a reusable web component for entering a single mathematical,
chemical or physical expression the way it appears on paper, using a keypad
and ordinary keyboard rather than an input language. It returns the expression
in several machine-readable formats so a host application can render it, store
it, or send it to an LLM.

This document is the contract. Anything not in here is an implementation
detail that may change; anything in here changes only with a version bump.

---

## 1. Goals and non-goals

### Goals

1. **No input language.** A learner never types or sees LaTeX, `^`, `sqrt()`
   or similar. Structure is created with keys that insert templates with
   empty boxes, and filled in by tapping into the boxes.
2. **Looks like the textbook.** The field renders the expression as it would
   be printed: stacked fractions, raised powers, radical signs, subscripts in
   chemical formulas, upright units.
3. **Machine-readable.** Every expression is held as a tree and serialised on
   demand to LaTeX, linear text, spoken text, MathML and JSON.
4. **Works on phone, tablet and desktop.** Touch first; hardware keyboard
   fully supported; the on-screen keypad adapts to the space available.
5. **Framework-agnostic and reskinnable.** A standard custom element with a
   default stylesheet, a documented theming surface and thin framework
   wrappers (React first).
6. **Accessible.** Operable by keyboard alone and by screen reader, with
   spoken descriptions of the expression.

### Non-goals (v1)

- Multi-line documents or prose mixed with maths. The host owns lists of
  steps; MathInput holds exactly one expression.
- Evaluating, simplifying or checking expressions (no CAS).
- Graph plotting, geometry, structural chemistry diagrams.
- Handwriting recognition.
- Full LaTeX round-trip. A documented subset is parsed (§7.7).

### Target audience

GCSE (Foundation and Higher) and A-level learners in Maths, Chemistry and
Physics, on school-issued tablets, personal phones and laptops. The notation
covered is the union of the DfE GCSE and A-level subject content for those
three subjects (§9).

---

## 2. Packages

| Package | Contents | Depends on |
|---|---|---|
| `@mathinput/core` | Expression tree, commands, cursor model, serialisers, parsers, keypad definitions. Pure TypeScript, no DOM. | nothing |
| `@mathinput/element` | The `<math-input>` custom element, renderer, keypad UI, default stylesheet. | core |
| `@mathinput/react` | `<MathInput>` React component wrapping the element with typed props and events. | element |

`core` is usable on its own on a server or in tests, for example to convert a
stored tree to LaTeX or spoken text.

Bundle targets (min+gzip): core ≤ 25 kB, element ≤ 45 kB excluding fonts.
No runtime dependencies.

Browser support: last two versions of Chrome, Safari (macOS and iOS), Firefox,
Edge; iPadOS 16+; Android Chrome 110+.

---

## 3. Data model

The tree is the single source of truth. All other formats are derived from
it and are never parsed back except through the documented parsers.

### 3.1 Document envelope

```ts
interface MathDocument {
  version: 1;
  subject: "maths" | "chemistry" | "physics";
  root: Row;
}
type Row = Node[];
```

`subject` changes how some input is interpreted (§7.6) and how some output is
serialised (§6). It is stored so the document is self-describing.

### 3.2 Nodes

Two kinds of node exist: **atoms** (no children) and **templates** (one or
more child rows). Every node has a `t` discriminator.

#### Atoms

| `t` | `v` | Meaning |
|---|---|---|
| `num` | one of `0–9` or `.` | A digit or decimal point. Numbers are sequences of adjacent `num` atoms; serialisers merge them. |
| `var` | a single letter, Latin or Greek | A variable. Rendered italic (upright for capital Greek). |
| `const` | `pi` `e` `i` `infinity` | Named constants. |
| `op` | `plus` `minus` `times` `cdot` `div` `slash` `pm` `mp` | Binary or unary operators. |
| `rel` | `eq` `neq` `lt` `gt` `le` `ge` `approx` `equiv` `propto` `to` `equilibrium` `implies` `iff` `ratio` | Relations. Arrows for chemistry are relations; `ratio` is the colon in `3 : 2`. |
| `fn` | `sin` `cos` `tan` `arcsin` `arccos` `arctan` `sec` `cosec` `cot` `ln` `log` `exp` | Named functions, rendered upright. |
| `sym` | `degree` `factorial` `percent` `comma` `prime` `ellipsis` `uparrow` `downarrow` `delta` `therefore` | Standalone symbols. |
| `text` | any short string | Upright words between expressions: `or`, `and`, `where`. |
| `unit` | SI or accepted unit symbol from the unit table (§9.3) | A unit. Rendered upright with a thin space before it. |
| `element` | a chemical element symbol | Rendered upright. |
| `state` | `s` `l` `g` `aq` | State symbol, rendered `(aq)`. |
| `ph` | — | Placeholder for an unfilled slot. Only ever exists as the sole content of an empty row at serialisation time; never stored. |

Single-glyph atoms (rather than merged tokens) keep cursor movement, deletion
and hit-testing uniform. Merging into numbers, words and multi-letter units
happens in the serialisers.

#### Templates

| `t` | Child rows | Extra fields | Renders as |
|---|---|---|---|
| `frac` | `num`, `den` | | stacked fraction |
| `sup` | `body` | | superscript attached to the preceding node |
| `sub` | `body` | | subscript attached to the preceding node |
| `subsup` | `sub`, `sup` | | both, aligned (used for `x_1^2`, isotopes) |
| `root` | `index?`, `body` | | radical; `index` omitted for square root |
| `fence` | `body` | `open`, `close` ∈ `( ) [ ] { } \|`; `openGhost?`, `closeGhost?` (boolean) | brackets that grow with content. A ghost side is one the learner has not typed yet (§7.4) |
| `vector` | `cells[]` | `rows`, `cols` | column vector / small matrix, always in round brackets |
| `recurring` | `body` | | dot over the digits |
| `bigop` | `lower`, `upper`, `body` | `op` ∈ `int` `sum` | ∫ or Σ with limits |
| `deriv` | `num`, `den` | | shorthand fraction template `d▢/d▢`, serialised as `frac` |
| `over` | `body` | `kind` ∈ `bar` `vec` `hat` | accents: mean, vector, unit vector |

A template's row is empty when it has no children; the renderer shows a
placeholder box.

### 3.3 Invariants

- The tree is always well-formed: rows contain only nodes, template rows
  exist even when empty.
- `sup`/`sub`/`subsup` may appear at the start of a row (rendered on a ghost
  base); the serialisers emit `{}^{…}`.
- No `ph` atoms are stored.
- A `fence` never has both sides ghosted. A ghost close always sits at the end
  of the fence's parent row and a ghost open at its start (§7.4).
- JSON is the storage format. It must be stable across versions; new node
  types may be added, existing ones are never renamed.

### 3.4 Tree JSON example

`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`:

```json
{ "version": 1, "subject": "maths", "root": [
  { "t": "var", "v": "x" }, { "t": "rel", "v": "eq" },
  { "t": "frac",
    "num": [ { "t": "op", "v": "minus" }, { "t": "var", "v": "b" }, { "t": "op", "v": "pm" },
             { "t": "root", "body": [ { "t": "var", "v": "b" }, { "t": "sup", "body": [ { "t": "num", "v": "2" } ] },
               { "t": "op", "v": "minus" }, { "t": "num", "v": "4" }, { "t": "var", "v": "a" }, { "t": "var", "v": "c" } ] } ],
    "den": [ { "t": "num", "v": "2" }, { "t": "var", "v": "a" } ] }
] }
```

---

## 4. Public interface: `<math-input>`

### 4.1 Attributes and properties

| Attribute / property | Type | Default | Notes |
|---|---|---|---|
| `subject` | `"maths" \| "chemistry" \| "physics"` | `"maths"` | Selects interpretation rules and default keypad. |
| `level` | `"gcse-foundation" \| "gcse-higher" \| "a-level"` | `"gcse-higher"` | Selects which keys appear in the default keypad. |
| `value` (property only) | `MathDocument` | empty | Get/set the tree. Setting replaces the content and resets undo history. |
| `latex` | `string` | `""` | Initial content as LaTeX. Parsed with the subset parser (§7.7); unsupported input raises `parse-error` and leaves the field empty. Reflects the current LaTeX when read. |
| `keypad` | `"auto" \| "always" \| "never" \| "collapsed"` | `"auto"` | `auto`: shown on coarse pointers, collapsed behind a toggle on fine pointers. |
| `keypad-layout` (property `keypadLayout`) | `KeypadLayout` | preset for subject and level | Replace or extend the keypad (§8.4). |
| `keypad-container` | element id or `HTMLElement` | inside the component | Render the keypad in another element, for a host-owned bottom sheet. |
| `placeholder` | `string` | `"Enter your answer"` | Hint shown when empty. |
| `label` / `aria-label` | `string` | — | Accessible name. One of `label`, `aria-label` or `aria-labelledby` is required. |
| `readonly` | boolean | `false` | Renders the expression without a caret or keypad. Use for display. |
| `disabled` | boolean | `false` | |
| `submit-on-enter` | boolean | `false` | Enter and the ↵ key fire `submit`. Off by default so host forms keep control of Enter; the ↵ key is hidden when off unless the keypad layout includes it. |
| `autoreplace` | boolean | `true` | Hardware keyboard shortcuts such as `sqrt` → √ (§7.5). |
| `variables` | `string` (comma list) | `"x,y,n,t"` (maths) | Letters offered on the primary key of the navigation row. |
| `theme` | `"light" \| "dark" \| "auto"` | `"auto"` | Selects the built-in token set. Ignored if the host supplies its own tokens. |
| `keypadOpen` (property) | boolean | per `keypad` | Open or close the keypad from the host. |
| `math-font` | `string` | `"STIX Two Text"` | Family name for the rendered expression; the host loads the font. |

### 4.2 Events

All events are `CustomEvent` with `bubbles: true, composed: true`.

| Event | `detail` | When |
|---|---|---|
| `input` | `MathInputValue` | After every edit. |
| `change` | `MathInputValue` | On blur, or when the host calls `commit()`. |
| `submit` | `MathInputValue` | Enter key or ↵ keypad key, only when `submit-on-enter` is set. Not fired when empty; the field shakes instead. |
| `keypad-toggle` | `{ open: boolean }` | The learner opened or closed the keypad. |
| `parse-error` | `{ source: "latex" \| "paste", input: string, message: string }` | Input could not be parsed. |

```ts
interface MathInputValue {
  doc: MathDocument;        // the tree
  latex: string;            // §6.1
  text: string;             // §6.2
  spoken: string;           // §6.3
  mathml: string;           // §6.4
  isEmpty: boolean;
  hasPlaceholders: boolean; // true if any template row is empty
  hasUnbalancedBrackets: boolean; // true if any fence side is still a ghost (§7.4)
}
```

Formats are computed lazily (getters) so `input` remains cheap.

### 4.3 Methods

```ts
focus(): void;
blur(): void;
clear(): void;
commit(): void;                        // fires change
undo(): void; redo(): void;
insert(node: Node | Node[]): void;     // at the caret
execute(command: CommandName, arg?: unknown): void;  // §7.2
getValue(): MathInputValue;
setValue(doc: MathDocument): void;
selectAll(): void;
```

### 4.4 Slots and parts

Light DOM is used (see §10.1), so there are no shadow parts. Stable element
hooks are class names prefixed `mi-` and data attributes; see §10.2.

### 4.5 React wrapper

```tsx
<MathInput
  subject="chemistry"
  level="gcse-higher"
  value={doc}                 // controlled, optional
  defaultLatex="…"            // uncontrolled
  onInput={(v) => …}
  onChange={(v) => …}
  onSubmit={(v) => …}
  keypad="auto"
  keypadLayout={layout}
  className="…"
  label="Step 3"
/>
```

The wrapper forwards a `ref` to the element and exposes the same methods.

---

## 5. Core API (`@mathinput/core`)

```ts
// Serialise
toLatex(doc, opts?: { placeholder?: "square" | "empty" | "throw"; chemistry?: "mhchem" | "plain" }): string;
toText(doc): string;
toSpoken(doc, opts?: { locale?: "en-GB" }): string;
toMathML(doc): string;

// Parse
fromLatex(latex: string, subject: Subject): MathDocument;   // throws ParseError
fromText(text: string, subject: Subject): MathDocument;     // linear syntax, §6.2

// Edit (headless)
createEditor(doc?: MathDocument): Editor;   // cursor, selection, commands, undo — no DOM

// Keypads
keypadPreset(subject, level, form: "phone" | "tablet" | "desktop"): KeypadLayout;

// Validation
validateDocument(json: unknown): MathDocument;  // zod-free structural check
```

The headless `Editor` is what the element drives; it is the unit under test
for all editing behaviour.

---

## 6. Output formats

All serialisers are pure functions of the tree and are covered by golden
tests (`packages/core/tests/golden/cases.ts`, trees written with the
builders), one entry per notation in §9. Every golden LaTeX string is also
rendered with KaTeX + mhchem in strict mode.

### 6.1 LaTeX

Target: KaTeX 0.16+ with the `mhchem` extension. The output must render in
KaTeX without warnings and be readable by an LLM.

Rules:

- Numbers are merged: `["1","2",".","5"]` → `12.5`.
- Operators: `plus` `+`, `minus` `-`, `times` `\times`, `cdot` `\cdot`,
  `div` `\div`, `slash` `/`, `pm` `\pm`.
- Relations: `\le \ge \ne \approx \equiv \propto \to \rightleftharpoons
  \Rightarrow \Leftrightarrow`.
- Functions: `\sin` … ; inverse trig as `\sin^{-1}` (matches UK exam papers).
- Fractions: `\frac{…}{…}`. Fences containing a fraction, root or bigop use
  `\left( … \right)`, otherwise plain brackets.
- Ghost bracket sides are emitted as real brackets (the expression is
  auto-balanced), and `MathInputValue.hasUnbalancedBrackets` is `true` so the
  host can warn or accept.
- Mixed numbers are adjacent atoms: `1` followed by `frac(1,2)` emits
  `1\frac{1}{2}` in LaTeX and `1 1/2` in text (space-separated so it is not
  read as `11/2`). Spoken: "one and one half" when a whole number is
  immediately followed by a numeric fraction.
- Powers and indices: `x^{2}`, `x_{n}`, `x_{n}^{2}`. Braces always present.
- Roots: `\sqrt{…}`, `\sqrt[3]{…}`.
- Units: each unit is `\,\mathrm{…}` with its own script: `3.0\,\mathrm{m}\,\mathrm{s}^{-2}`.
  Ohms `\Omega`, micro `\mathrm{\mu m}`, degrees Celsius `{}^{\circ}\mathrm{C}`.
- Spacing: a space follows a control word only before a letter or digit
  (`\times 3`, `\pm\sqrt{…}`).
- Text words: `\text{ or }` with surrounding spaces.
- Recurring: `0.\dot{3}`, `0.\dot{1}\dot{2}` (dot on first and last digit of
  the recurring block).
- Vectors: `\begin{pmatrix} 3 \\ -4 \end{pmatrix}`.
- Accents: `\bar{x}`, `\vec{a}`, `\hat{i}`.
- Big operators: `\int_{0}^{1} … \,dx` (the `dx` is content typed by the
  learner, not generated), `\sum_{r=1}^{n}`.
- Empty rows: `\square` by default; `{}` with `placeholder: "empty"`; throws
  with `"throw"`.
- **Chemistry**: when the document contains chemistry (an element, state
  symbol or reaction arrow), the whole expression is wrapped `\ce{…}` using mhchem
  syntax: `2H2 + O2 -> 2H2O`, `Mg(s) + 2HCl(aq) -> MgCl2(aq) + H2(g)`,
  `SO4^{2-}`, `^{14}_{6}C`, `CuSO4*5H2O`, `<=>` for equilibrium, `^` for
  gas evolved. Maths parts inside a chemistry expression (functions,
  fractions, Greek letters) are emitted as `$…$` inside `\ce`, e.g.
  `\ce{pH = -$\log$[H^{+}]}`. A chemistry document with no chemistry in it
  (such as `ΔH = −57 kJ mol⁻¹`) is written as ordinary maths LaTeX.
- Output never contains a bare `$`; the host adds delimiters.

### 6.2 Linear text

A plain-ASCII form for logs, search, prompts and pasting into a calculator.
It is also the input syntax of `fromText`.

- `x = (-b +/- sqrt(b^2 - 4ac)) / (2a)`
- `sin 30 deg = 1/2`, `log_2 8 = 3`, `3.0 m s^-2`, `0.(3)` recurring,
  `vector(3, -4)`, `integral(0, 1, x^2 dx)`, `sum(r=1, n, r^2)`
- Implicit multiplication is preserved as adjacency: `2ab`. Explicit `*`
  only where the learner used ×. Hosts that need unambiguous input for a CAS
  should use the tree.
- Greek letters are written by name (`theta`), constants `pi`, `infinity`,
  units in ASCII (`ohm`, `um`, `degC`).
- A space separates a script or fraction from a following factor
  (`x^2 y`, `log_2 8`, `1/2 mv^2`) and a number from a following word form
  (`3 sqrt(5)`), so the text is never ambiguous.
- Chemistry uses mhchem syntax without the `\ce{}` wrapper.
- Placeholders are `?`.

### 6.3 Spoken

English text for screen readers, following ClearSpeak conventions in
simplified form. Numbers stay as numerals so screen readers read them in the
user's locale.

- Simple fractions: "1 over 2"; complex: "fraction, x plus 1, over, 2,
  end fraction"; mixed numbers "1 and 1 over 2"; recurring "0.3 recurring".
- Powers: "squared", "cubed", "to the power n"; complex exponents end with
  "end power".
- Roots: "the square root of … end root".
- Fences: "open bracket … close bracket"; modulus: "the modulus of …".
- Relations and operators spoken in words; unary minus "negative".
- Units by name: "3.0 metres per second squared"; `m/s` is "metres per second".
- Chemistry: element symbols letter by letter, subscripts as plain numbers
  ("H 2 O", "M g C l 2"), charges "with charge 2 plus", state symbols
  "aqueous", arrow "reacts to give", minus always "minus".
- Placeholders: "blank".
- Ghost brackets: spoken as the bracket followed by "not closed" (or "not
  opened"), so screen-reader users know a side is missing.

Spoken text is also exposed live through an `aria-describedby` region so the
current expression is announced on request.

### 6.4 MathML

Presentation MathML (Core), emitted for hosts that want native rendering or
accessibility tooling. Not intended for LLM prompts.

### 6.5 Recommendation to hosts sending to an LLM

Send LaTeX in `$…$` (or `$\ce{…}$` for chemistry) as the primary form. For
grading prompts, add the linear text in brackets as a second reading. Both
are available on every event so the host can choose.

---

## 7. Editing model

### 7.1 Cursor and selection

- The caret is a position `(row, index)` in the tree. Exactly one caret exists
  when focused.
- A selection is a contiguous range within one row. Selecting across rows
  (out of a fraction, say) extends to whole templates.
- The row containing the caret is highlighted so the learner sees which slot
  they are typing into. Empty rows show a placeholder box; the caret sits
  inside it.
- Tap or click places the caret at the nearest boundary of the nearest row.
  Double-tap selects the adjacent token (a whole number, word or template).
  Drag selects within a row. Shift+arrow extends the selection.

### 7.2 Commands

Every edit is a command on the headless editor. Keys, keyboard shortcuts and
the host `execute()` method all go through the same list.

| Command | Effect |
|---|---|
| `insertAtom(node)` | Insert at caret, replacing a selection. |
| `insertTemplate(type, opts)` | Insert a template. A selection goes into the template's content slot (numerator, radicand, bracket body, integrand); for `sup`/`sub`/`subsup` the selection becomes the *base* instead, bracketed if it is more than one operand (`x+1` selected, then power → `(x+1)^▢`). With `absorb` (the fraction key and `/`) and no selection, the preceding operand becomes the numerator (§7.3). The caret moves to the first empty required slot; a fresh template with only optional slots (an integral) starts in its first slot; otherwise the caret goes after the template. |
| `moveLeft` / `moveRight` | Step through the tree, entering templates. |
| `moveUp` / `moveDown` | Between numerator and denominator, or limits of a bigop; otherwise no-op. |
| `moveToNextPlaceholder` / `moveToPreviousPlaceholder` | Tab / Shift+Tab. Wraps within the document. |
| `exitTemplate` | Move to just after the innermost template containing the caret. Bound to the ▶ key when at the end of a row. |
| `openBracket(kind)` | Single opening bracket, §7.4. |
| `closeBracket(kind)` | Single closing bracket, §7.4. |
| `wrapInBrackets(kind)` | Put the selection (or, with none, the preceding operand) inside a matched pair. |
| `deleteBackward` | Removes the atom before the caret. If it is a template with all rows empty, removes it. If it has content, the caret moves into its last row instead (second press deletes content). At the start of a template row, the template is unwrapped: its rows are spliced into the parent and the caret stays with the text. |
| `deleteForward` | Mirror of the above. |
| `selectAll`, `clear` | |
| `undo`, `redo` | Command-grouped: a run of atom inserts is one undo step; every template insert or delete is its own step. |
| `copy`, `cut`, `paste` | §7.8 |
| `toggleShift` (keypad) | |
| `type(ch)` | Interpret one keyboard character with the subject rules (§7.5, §7.6). The element maps key events to it. |

### 7.3 Operand absorption

When a fraction or root key is pressed without a selection, the preceding
operand becomes the numerator (radicand for roots only if the key is the
"wrap" variant). An operand is the longest run to the left of the caret
consisting of digits, variables, constants, fences and their attached
super/subscripts, ending at an operator, relation or start of row. This
matches calculator behaviour: `3` then fraction → `3/▢`.

Examples: `2x` ⏐ → `2x / ▢`; `2 + 3` ⏐ → `2 + 3/▢`; `(x+1)²` ⏐ → whole
bracket with its power becomes the numerator. A preceding fraction is never
absorbed.

Mixed numbers conflict with absorption (`1` then fraction gives `1/▢`), so
the fraction key has a non-absorbing variant, "mixed number", that inserts an
empty fraction after the whole number.

### 7.4 Single brackets

Learners often write an expression first and then decide part of it belongs
in brackets, for example turning `2x + 3` into `(2x + 3)²` or `5(x − 1)` into
`5(x − 1) + 2`. Brackets can therefore be typed one side at a time, as on
paper, as well as inserted as a pair.

The tree always stays well-formed: a single bracket creates a `fence` whose
missing side is a **ghost**. A ghost is rendered faded (`--mi-ghost-opacity`)
at the far end of the row, showing where the bracket currently closes. When
the learner types the matching bracket, the ghost becomes solid at that
position.

**Opening bracket `(`** at caret position *i* in row *R*:

1. If there is a selection, wrap it in a matched pair (no ghosts).
2. Else if the caret is inside a fence in *R*'s ancestry whose open side is a
   ghost, and *i* is inside that fence's body, solidify its open side at *i*:
   atoms before *i* move out of the fence to precede it.
3. Else create a fence containing everything from *i* to the end of *R*,
   with a ghost close. The caret goes to the start of the body. Typing into
   an empty row therefore gives `(▢)` with a ghost `)` exactly like a pair.

**Closing bracket `)`** at caret position *i* in row *R*:

1. If the caret is in the body of a fence with a ghost close, solidify the
   close at *i*: atoms after *i* move out of the fence to follow it. The
   caret goes after the fence.
2. Else if the caret is at the end of the body of a fence with a solid close
   of the same kind, move out of it (the old `exitTemplate` behaviour, so
   typing `(x+1)` in one go still works).
3. Else create a fence containing everything from the start of *R* to *i*,
   with a ghost open. The caret goes after the fence.

**Examples** (⏐ is the caret, faded brackets are ghosts):

| Starting with | Learner does | Result |
|---|---|---|
| `2x + 3⏐` | moves to before `2`, types `(` | `(⏐2x + 3`**`)`** (faded close) |
| … then moves to end, types `)` | | `(2x + 3)⏐` |
| … then taps x² | | `(2x + 3)²` |
| `5x − 1⏐` | moves between `5` and `x`, types `(`, then `)` at end | `5(x − 1)⏐` |
| `x − 1⏐` | types `)` | **`(`**`x − 1)⏐` (faded open); moves to start and types `(` to confirm |
| `a + b⏐` selected | types `(` | `(a + b)⏐` |

**Deleting** a solid side of a fence turns it back into a ghost (the content
stays where it is). Deleting a side that faces a ghost removes the fence
entirely and splices its body into the parent row. This makes brackets as
easy to take away as to add.

**Tall content.** Ghost and solid fences grow with their content like any
fence.

**Edge rule.** A ghost side only exists at the edge of its row. If an edit
moves a fence away from that edge (wrapping it in a template, selecting and
moving it, unwrapping around it), the ghost side becomes a real bracket.
The caret never rests just after a ghost close or just before a ghost open;
those positions map into the fence body.

**Leaving ghosts in place.** An expression with ghosts is valid. Serialisers
treat ghost sides as real brackets (auto-balance) and the value reports
`hasUnbalancedBrackets: true`. Hosts decide whether to accept it or prompt
the learner.

**Modulus** `| |` is always inserted as a pair, because a single `|` cannot
tell an opening bar from a closing one.

**Chemistry** uses the same behaviour for `( )` and `[ ]`, so `Ca(OH)2` and
`[Cu(H2O)6]2+` can be written left to right.

### 7.5 Hardware keyboard

| Key(s) | Action |
|---|---|
| digits, `.`, letters | insert atom (letters follow subject rules, §7.6) |
| `/` | fraction (with absorption) |
| `^` | superscript; `_` subscript |
| `(` `[` `{` | single opening bracket (§7.4) |
| `)` `]` `}` | single closing bracket (§7.4) |
| `\|` | modulus pair |
| `*` | × ; `-` → −; `+`; `=` `<` `>` |
| `<` then `=` | ≤ (likewise `>=` ≥, `!=` ≠, `->` →, `=>` ⇒, `~` or `~=` ≈; `<=>` is ⇔ in maths and ⇌ in chemistry) |
| `!` `,` `%` `'` `:` | factorial, comma, percent, prime, ratio |
| space | chemistry only: ends a formula so the next digit is a coefficient |
| `Tab` / `Shift+Tab` | next / previous placeholder (leaves the component when there are none) |
| arrows, `Backspace`, `Delete`, `Home`, `End` | as in §7.2 |
| `Enter` | submit when `submit-on-enter` is set, otherwise nothing; `Shift+Enter` reserved for hosts |
| `Ctrl/Cmd+Z`, `Shift+Ctrl/Cmd+Z`, `Ctrl/Cmd+A/C/X/V` | undo/redo/select/clipboard |
| `Escape` | close a variants menu, else blur |

**Auto-replace** (on by default): after each letter, if the letters to the
left spell a known word, replace it. Longest match wins. Table: `sqrt`,
`cbrt`, `sin cos tan sec cosec cot arcsin arccos arctan ln log exp`, `pi
theta alpha beta gamma delta lambda mu sigma phi omega rho epsilon eta tau
Delta Sigma Omega`, `inf`, `deg`, `or and`. In chemistry, auto-replace is
off; element recognition applies instead. Hosts can extend or disable the
table.

The component sets `inputmode="none"` on touch devices so the OS keyboard
stays hidden and the component's keypad is used; on devices with a hardware
keyboard attached the keyboard still works. A hidden, focusable
`contenteditable` receives IME and dictation input so that Android composing
keyboards work when the host chooses `keypad="never"`.

### 7.6 Subject rules

**Maths / physics**

- Letters are single-letter variables; `xy` is `x` times `y`.
- Multi-letter names come only from function, unit and text atoms.
- Physics keypad adds units and ×10ⁿ; units are atoms, never variables.

**Chemistry**

- Letters are matched against the element table. A capital followed by a
  lower-case letter that forms an element merges (`C`+`l` → `Cl`). A capital
  that is not an element inserts a `var`.
- A digit typed directly after an element, a closing bracket or an existing
  numeric subscript becomes or extends a subscript. A digit at the start of a
  row or after `+`, an arrow or a space stays full size (coefficient).
- `e` followed by the charge key gives an electron `e⁻`.
- Charge is a superscript on the ion: `Mg²⁺`, `SO₄²⁻`. The charge key inserts
  `sup` and the serialiser emits mhchem `^{2+}`.
- The "space" key on the chemistry keypad ends a formula so that a following
  digit is a coefficient.

### 7.7 LaTeX subset parser

`fromLatex` accepts what `toLatex` emits, plus common variants: `\dfrac`,
`\tfrac`, `\cdot`, `\times`, `\left \right`, `^x` and `_x` without braces,
`\sqrt[n]`, `\text{}` and `\mathrm{}`, `\ce{}` with the mhchem subset above,
Greek letters, `\infty`, `\degree`, `^\circ`. Anything else raises
`ParseError` with the offending token and position. The parser exists for
initial values and paste, not for arbitrary LaTeX.

Also accepted: `\lvert…\rvert`, `\begin{bmatrix}`, compound units in one
`\mathrm{m\,s^{-2}}`, `\left.`/`\right.` (read as a ghost side), and in
`\ce{}` the charge shorthand `Na+`, `Cl-`. An unmatched bracket becomes a
ghost side, as if typed.

**Round-trip guarantee.** For every golden case, parsing its LaTeX or text
and serialising again gives the identical string, and parsing its LaTeX
gives the same spoken form. Trees may differ in equivalent ways (for example
`e` as a variable or a constant; a separate `sub` and `sup` become one
`subsup`).

**Linear text specifics.** `fromText` reads units only in physics and
chemistry documents, and only after a number, another unit or `unit/`. In a
chemistry document the text is read with the mhchem rules when it looks like
chemistry (arrows, state symbols, a digit after an element symbol, charges,
isotopes, or only element symbols); otherwise it is read as maths. A spaced
` / ` between single operands is division (÷); an unspaced `/`, or a spaced
one next to a bracketed group, is a fraction.

### 7.8 Clipboard

- Copy places three flavours: `application/x-mathinput+json` (tree),
  `text/plain` (linear text), and the LaTeX in a custom `text/x-latex`.
- Paste tries the tree, then LaTeX (if the text contains `\` or `^{`), then
  linear text via `fromText`. On failure it inserts nothing and fires
  `parse-error`.

---

## 8. Keypad

### 8.1 Layouts by form factor

Chosen by container width and pointer type, re-evaluated on resize.

| Form | Trigger | Layout |
|---|---|---|
| Phone | width < 600 px | Tab bar; one 5- or 6-column panel of 4 rows; fixed navigation row (variable, ◀, ▶, ⌫, ↵). Docked below the field. |
| Tablet | 600–1023 px or coarse pointer | Number pad and navigation row on the left, tabbed panel on the right. Docked below the field. |
| Desktop | ≥ 1024 px and fine pointer | Same split layout rendered compactly inside the component, collapsed by default behind a Keypad toggle; keyboard hints shown under the field. |

Hosts can place the keypad in their own container (`keypad-container`) to
implement a bottom sheet or a side panel.

Touch targets are at least 44×44 CSS px on phone and tablet, 40 px on
desktop. Keys use `touch-action: manipulation`, show the pressed state on
`pointerdown` and act on `pointerup` over the key (sliding off cancels), with
no click delay. Pointer interaction never moves focus out of the field.
Form factor is decided from the component's own width (never the page's):
the keypad is `contain: inline-size`, so it cannot widen its container.

### 8.2 Tabs

| Tab | Maths | Chemistry | Physics |
|---|---|---|---|
| `123` | digits, `(` `)` as separate keys (pair, `[`, `{`, modulus as variants), × (÷, · as variants), fraction (mixed number as variant), − (±), power (², ³, ⁻¹), =, (≈, ≠, ≡), +, √ (∛, ⁿ√) | digits, fraction, subscript, charge, arrow | as maths |
| Algebra `x²` | variables, powers, roots, modulus, vector, relations, ±, π, recurring, comma, or, and | — | as maths |
| Functions `f(x)` | trig, inverse trig, ln, log, log base, e^x, °, !, d/dx, ∫, Σ, f(x), ∞ | — | trig, °, ×10ⁿ |
| Greek `αβγ` | common Greek | — | common Greek |
| `abc` | full QWERTY with shift | — | as maths |
| Elements | — | 24 common elements + periodic table sheet | — |
| Symbols | — | arrows, +, state symbols, charges, e⁻, `(` `)` `[` `]` as single keys, ·, ↑, Δ, = | — |
| Units | — | — | SI and accepted units, `/`, ⁻¹, ×10ⁿ |

`level` trims the set: Foundation hides column vectors; Foundation and Higher
hide logarithms, `e`, eˣ, ∞, d/dx, ∫, Σ, vector arrows, hats, `sec cosec
cot`, `∴` and `≡` (GCSE has no logarithms or calculus); A-level shows all.
Inverse trig is available at every level (GCSE Foundation uses it).

The navigation row is: a subject key (maths: `x` with other letters as
variants; chemistry: `(aq)` with other states; physics: ×10ⁿ), ◀, ▶, ⌫, and
↵ — replaced by a "next box" key (⇥) when `submit-on-enter` is not set.

`keypadPreset(subject, level)` returns the layout; the element decides
placement per form factor.

### 8.3 Keys

```ts
interface Key {
  id: string;
  label: KeyLabel;             // see below
  aria: string;                // accessible name, e.g. "fraction"
  action: KeyAction;           // { insert: Node } | { template: TemplateType, opts } | { command: CommandName } | { tab: string } | { custom: (editor) => void }
  variants?: Key[];            // long-press / right-click alternatives
  width?: 1 | 2;               // column span
  kind?: "digit" | "operator" | "template" | "letter" | "function" | "nav" | "primary";
}

type KeyLabel =
  | { text: string }           // plain text, e.g. "7"
  | { tree: Row }              // a mini expression rendered by the same engine
  | { icon: "left" | "right" | "backspace" | "enter" | "shift" | "keypad" }
  | { html: string };          // escape hatch
```

**Key labels are rendered expressions.** A key whose label is `{ tree }` is
drawn with the same renderer as the field, at key size, with placeholder
boxes where rows are empty. The power key therefore shows a base box with a
smaller box raised to the top right, the fraction key shows two boxes
stacked around a bar, the root key shows a real radical over a box, the
subscript key shows the small box low and to the right. This fixes the
ambiguity of glyph-only labels and guarantees that what the key shows is
exactly what it inserts.

Placeholder boxes in labels are drawn with a dashed border in
`--mi-key-placeholder`; the "active" slot (where the caret will land) is
drawn with a solid border in `--mi-key-placeholder-active` so the learner can
predict where typing continues.

**Variants (hold for options).** A key with `variants` shows a visible
indicator: a filled corner triangle in `--mi-key-variant-indicator` (default
orange, distinct from the blue template keys) plus a "Hold for more options"
tooltip. Long press (≥ 400 ms, then slide to a variant and release),
right-click, or from the keyboard Alt+ArrowDown, Shift+F10 or the context-menu
key opens a menu above the key with the key itself and its variants; tapping
outside or Escape closes it. The menu is `role="menu"` with arrow-key
navigation. The indicator shape is set with `data-variant-indicator="dot"` or
`"bar"` on the element (default triangle); its colour is the token.

**Keyboard in the keypad.** Keys use roving focus: one tab stop per grid,
arrow keys and Home/End move between keys, Enter/Space activate. Tabs are a
`tablist` with arrow-key switching.

### 8.4 Custom layouts

`keypadLayout` accepts a full `KeypadLayout` or a patch:

```ts
interface KeypadLayout {
  tabs: Array<{ id: string; label: KeyLabel; aria?: string; columns: number; keys: Key[] }>;
  navigation: Key[];           // the fixed bottom row
  numberPad?: Key[];           // the left block on tablet/desktop; defaults to the `123` tab
}
type KeypadPatch = {
  extend?: string;             // preset name to start from, e.g. "maths/gcse-higher"
  addKeys?: Record<string /* tab id */, Key[]>;
  removeKeys?: string[];       // key ids
  addTabs?: KeypadLayout["tabs"];
  removeTabs?: string[];
  navigation?: Key[];
};
```

All preset key ids are stable and documented so hosts can remove or reorder
them.

### 8.5 Periodic table sheet

Opened from the Elements tab. A scrollable 18-column grid, non-metals tinted,
each cell a button that inserts the element and closes the sheet. Rendered in
the component's keypad container so hosts can style or reposition it.

---

## 9. Notation coverage

The keypad presets and serialisers must cover every item below. Each has a
golden test.

### 9.1 Maths (GCSE and A-level)

Arithmetic and BIDMAS; negative numbers; fractions, mixed numbers (`1 ½`),
decimals, recurring decimals; percentages; powers and roots including
fractional and negative indices; standard form; surds; ratio (`3 : 2`);
inequalities including compound (`−2 < x ≤ 3`); equations and identities;
brackets and modulus; π, e, ∞; trig and inverse trig with degrees; exact trig
values; logarithms with base; functions `f(x)`, `f⁻¹(x)`, `fg(x)`; sequences
`uₙ`; column vectors and their magnitude; coordinates `(3, −2)`; σ and x̄
(statistics); sigma notation; differentiation `dy/dx`, `f′(x)`; integration
with limits; small matrices (A-level); binomial `ⁿCᵣ`; `≡`, `∴` (A-level).

### 9.2 Chemistry (GCSE and A-level)

Formulas with subscripts; coefficients; ions with charges; state symbols;
reaction arrows and equilibrium; ionic and half equations with `e⁻`;
hydrated salts `CuSO₄·5H₂O`; isotopes `¹⁴₆C` and mass/atomic numbers;
gas evolved ↑ and precipitate ↓; heat Δ over the arrow (A-level: conditions
above/below the arrow); moles and concentration units (`mol dm⁻³`);
`Kc` expressions with square-bracket concentrations `[H⁺]`; pH = −log[H⁺];
enthalpy `ΔH = −57 kJ mol⁻¹`.

### 9.3 Physics (GCSE and A-level)

Everything in maths plus: units and prefixes (`m s⁻²`, `kg`, `N`, `J`, `W`,
`V`, `A`, `Ω`, `C`, `Hz`, `Pa`, `K`, `°C`, `mol`, `eV`, `T`, `Wb`, `Bq`,
with `k M G T m μ n p`), compound units via `/` or negative index; standard
form; Greek symbols in common use (`λ ρ ω Δ θ μ ε₀`); subscripted variables
(`v₀`, `Eₖ`); `∝`; `Δ` as a prefix (`Δv`); vectors with arrows (A-level);
uncertainties `±`; percentages.

Unit table: the SI base and derived units above plus `min h day L ml cm mm km
g mg t° eV`; the serialiser never italicises a unit.

---

## 10. Rendering, styling and theming

### 10.1 DOM strategy

The element renders into **light DOM** with a stable class vocabulary, not
shadow DOM. Reasons: hosts style it with their own Tailwind utilities and
tokens; the field inherits the host's font and colour scheme; assistive
technology sees one tree. The default stylesheet is scoped under
`.mi-root` and wrapped in `@layer mathinput` so that host styles win without
`!important`. Hosts that need isolation can wrap the element in their own
shadow root.

### 10.2 Class and data hooks

All classes are prefixed `mi-`. The structural ones are part of the contract:

`mi-root` (the host element, with `data-subject`, `data-focused`,
`data-readonly`, `data-disabled`, `data-mi-theme`, `data-form="phone|tablet|desktop"`,
`data-keypad="open|closed"`), `mi-field`, `mi-field__content`,
`mi-field--shake`, `mi-receiver` (the hidden focus/IME/clipboard textarea
inside the field), `mi-live`, `mi-empty`, `mi-row`, `mi-row--root`,
`mi-row--active`, `mi-caret`, `mi-placeholder`, `mi-placeholder--active`,
`mi-placeholder--optional`, `mi-placeholder--ghost`, `mi-selection`,
`mi-frac` (`data-kind="deriv"` for derivatives), `mi-frac__num`,
`mi-frac__bar`, `mi-frac__den`, `mi-sup`, `mi-sub`, `mi-subsup`,
`mi-radical`, `mi-radical__index`, `mi-radical__sign`, `mi-radical__body`,
`mi-fence` (`data-open`), `mi-fence__side`, `mi-fence__side--open`,
`mi-fence__side--close`, `mi-fence__side--ghost`, `mi-fence__body`,
`mi-vector`, `mi-vector__cells`, `mi-vector__cell`, `mi-recurring`,
`mi-recurring__dot`, `mi-bigop` (`data-op`), `mi-bigop__limits`,
`mi-bigop__sign`, `mi-over` (`data-kind`), `mi-atom` (with `data-kind` and,
for operators, relations, functions, symbols and constants, `data-name`;
`data-unary`, `data-upright`, `data-greek`), `mi-fn__inverse`, `mi-keypad`,
`mi-tabs`, `mi-tab`, `mi-tab--selected`, `mi-panel`, `mi-key` (with
`data-kind`, `data-has-variants`), `mi-key--pressed`, `mi-variants`,
`mi-sheet`, `mi-hint`, `mi-keypad-toggle`, `mi-keypad` (`data-form`),
`mi-keypad__side`, `mi-keypad__main`, `mi-keypad__numbers`, `mi-keypad__nav`,
`mi-grid`, `mi-panel`, `mi-tabs`, `mi-tab`, `mi-tab--selected`, `mi-key`
(`data-key-id`, `data-kind`, `data-has-variants`, `data-wide`),
`mi-key--pressed`, `mi-key__label`, `mi-key__expr`, `mi-key__more`,
`mi-variants`, `mi-icon`, `mi-sheet__head`, `mi-sheet__title`,
`mi-sheet__close`, `mi-sheet__scroll`, `mi-periodic`, `mi-periodic__cell`
(`data-nonmetal`).

### 10.3 Tokens

Every colour, radius, size and font is a CSS custom property on `.mi-root`,
with light and dark defaults. Hosts override any subset on the element or an
ancestor.

```
--mi-font-ui, --mi-font-math
--mi-field-bg, --mi-field-fg, --mi-field-border, --mi-field-border-focus, --mi-field-ring, --mi-field-radius, --mi-field-size (font-size)
--mi-caret, --mi-row-active-bg, --mi-selection-bg, --mi-ghost-opacity (default 0.35), --mi-ghost-color
--mi-placeholder-border, --mi-placeholder-border-active, --mi-placeholder-bg-active
--mi-keypad-bg, --mi-keypad-border, --mi-keypad-gap, --mi-keypad-radius
--mi-key-bg, --mi-key-fg, --mi-key-shadow, --mi-key-radius, --mi-key-size, --mi-key-font-size
--mi-key-operator-bg, --mi-key-template-bg, --mi-key-template-fg, --mi-key-primary-bg, --mi-key-primary-fg, --mi-key-pressed-bg
--mi-key-placeholder, --mi-key-placeholder-active
--mi-key-variant-indicator, --mi-key-variant-indicator-shape ("triangle" | "dot" | "bar" via a class), 
--mi-tab-fg, --mi-tab-selected-bg, --mi-tab-selected-fg
--mi-sheet-bg, --mi-sheet-shadow
--mi-danger (shake / error)
--mi-motion (0 to disable animation; also follows prefers-reduced-motion)
```

### 10.4 Reskinning levels

1. **Tokens only** — set custom properties. Covers colour, radius, size,
   fonts. This is the expected path for most hosts.
2. **Class overrides** — target `mi-*` classes in the host's own CSS or via
   Tailwind `@apply`. The default stylesheet's `@layer` guarantees precedence.
3. **Keypad configuration** — change keys, tabs, labels and variants (§8.4).
4. **Custom key rendering** — supply `renderKeyLabel(key) => Node` to draw
   keys with the host's icons.
5. **Replace the stylesheet** — import the element without
   `mathinput.css` and provide a complete one against the class contract.

The default stylesheet is plain CSS over the token map (no build step for
consumers). For Tailwind v4 hosts, `@mathinput/element/tailwind.css`
declares the layer order `theme, base, mathinput, components, utilities`
(so utilities override defaults), imports the stylesheet and exposes the
tokens as theme values (`bg-mi-key`, `rounded-mi-key`, `font-mi-math`, …).
It is imported before `tailwindcss`. A CI test compiles it with Tailwind v4.
Integrator guide: `docs/user/theming.md`.

### 10.5 Math rendering

The field is rendered with the component's own DOM renderer (flex layout,
inline SVG for radicals and growing brackets), not KaTeX, because editing
needs a caret, hit-testing and per-row highlighting. Rendering must match
KaTeX closely enough that the learner's expression looks the same in the
field and in the host's rendered step list. Metrics: fraction bar 0.065em,
superscript 68 % raised 0.82em, subscript lowered 0.42em, growing fences
scale to content height.

The math font is the host's choice; default `STIX Two Text` with fallbacks
`STIX Two Math, Cambria Math, Times New Roman, serif`. The package documents
how to load STIX from Google Fonts or self-host.

---

## 11. Accessibility

- The field is `role="textbox"` with `aria-multiline="false"`, an accessible
  name, and `aria-describedby` pointing at a live region containing the
  spoken form, updated with a 300 ms debounce.
- Every key is a `<button>` with an `aria-label` naming its function
  ("fraction", "x squared", "move right"). Tabs are `role="tab"` in a
  `tablist`. Variants menus are `role="menu"`.
- Full keyboard operation: Tab moves between field, keypad tabs and keys;
  arrow keys move within the keypad grid; Enter/Space activates.
- Focus is visible on every interactive element (uses `:focus-visible`).
- Colour is never the only signal: the active row has a background *and* a
  caret; ghost brackets are faded *and* spoken as "bracket not closed"; variant indicators have shape as well as colour; the pressed key
  state changes shadow as well as colour.
- Contrast ≥ 4.5:1 for text, ≥ 3:1 for placeholders and indicators in both
  default themes.
- `prefers-reduced-motion` disables the caret blink, key press animation
  and shake.
- Verified with axe-core in CI and manual VoiceOver (iOS, macOS) and NVDA
  passes before release.

---

## 12. Performance

- Re-render only the row that changed; full re-render on structural changes.
  (v0.1 re-renders the whole field on each change; measure before optimising
  in plan phase 9.)
  Target < 8 ms per edit on a 2020 mid-range Android phone.
- No layout thrash: caret scrolling uses one measured rect per edit.
- Keypad DOM is built once per layout and reused; tab switches swap panels.
- Fonts are not bundled; no network requests are made by the component.

---

## 13. Security and privacy

- No network access, no storage, no analytics.
- `{ html }` key labels are the only place raw HTML is accepted; they are
  host-supplied and documented as such. Everything else is built with DOM
  APIs, never `innerHTML` from data.
- Pasted content is parsed, never inserted as markup.

---

## 14. Versioning and compatibility

- Semantic versioning across the three packages, released together.
- `MathDocument.version` is bumped only when the tree changes incompatibly;
  a migration function ships with each bump.
- Preset key ids, class hooks and tokens are part of the public API.

---

## 15. Decisions log

| Decision | Choice | Alternatives considered |
|---|---|---|
| Build vs adopt | Build our own core | MathLive (rejected on UX and desktop-only fit), MathQuill (unmaintained, no chemistry) |
| DOM | Light DOM with class contract | Shadow DOM with `::part` — blocks Tailwind and host fonts |
| Atom granularity | One glyph per atom | Token atoms — simpler serialisation, harder cursor and deletion |
| Editing renderer | Own DOM/SVG renderer | KaTeX — no caret or hit-testing; MathML — inconsistent across browsers |
| LLM format | LaTeX (+ text as a hint) | MathJSON — less familiar to models |
| Chemistry output | mhchem `\ce{}` | Hand-built `\mathrm` — verbose and worse for models |
| Key labels | Rendered mini-trees | Unicode glyphs — ambiguous for power/index |
| Keypad ownership | Component renders, host may re-parent | Host builds keypad — too much for every consumer |
| Stylesheet authoring | Plain CSS tokens + a Tailwind v4 theme entry | Authoring in Tailwind `@apply` — build complexity for consumers and maintainers with no gain once tokens exist |
| Brackets | Single sides with ghost partners, plus pair insert | Pair-only templates — cannot bracket existing work (found in prototype review) |
| Enter | Opt-in `submit-on-enter` | Always submit — conflicts with host forms |
| Mixed numbers | Adjacent atoms, serialiser spacing | Dedicated template |
| Packages | `@mathinput/*`, MIT | — |

---

## 16. Open questions

Resolved 27 September 2026: package names and licence (`@mathinput/*`, MIT),
Enter behaviour (opt-in), mixed numbers (adjacent atoms), light DOM and
single-glyph atoms (confirmed). See §15.

Remaining:

1. Matrices larger than 2×2 for A-level Further Maths: in scope for v1.1.
2. Conditions above/below reaction arrows (A-level chemistry): template
   `arrow{above, below}` in v1.1.
3. Locale: decimal comma and `×` vs `·` preferences are parameters of the
   serialiser, but the keypad is English-only in v1.
