# Product facts

- Name: MathInput. npm scope `@mathinput` (`core`, `element`, `react`,
  `presets-uk`). Licence: MIT.
- What it is: a web component that lets a learner enter one maths, chemistry
  or physics expression as it looks on paper, using a keypad or keyboard, and
  returns it as a tree plus LaTeX, linear text, spoken text and MathML.
- Audience: anyone entering maths, chemistry or physics notation on a phone,
  tablet or laptop, typically a learner answering a question; integrators are
  web developers embedding it in any framework.
- Host- and curriculum-agnostic: default keypads offer every key for the
  subject; hosts trim them with topic tags and patches. Curriculum presets
  are optional packages (`@mathinput/presets-uk` for GCSE/A-level in England).
  Notation coverage is benchmarked against GCSE and A-level content.
- No host application is named in this repository; integrations live in the
  host's own repository.
- Scope boundaries: one expression per instance (hosts own lists of steps); no
  evaluation or CAS; no network, storage or analytics; no handwriting input.
- Authoritative spec: `docs/dev/specs/mathinput-component.md`. Interactive
  mockup: `docs/dev/specs/prototype/mathinput-prototype.html`.
- Design principles: no input language for learners; keys show exactly what
  they insert; default skin provided, fully reskinnable by tokens and classes;
  accessible by keyboard and screen reader.
- Deferred (27 Sep 2026): npm publishing, GitHub remote and CI.
- Decision needed: hosting for the live demo.
