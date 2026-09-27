# Product facts

- Name: MathInput. npm scope `@mathinput` (`core`, `element`, `react`,
  `presets-uk`). Licence: MIT.
- What it is: a web component that lets anyone enter one maths, chemistry
  or physics expression as it looks on paper, using a keypad or keyboard, and
  returns it as a tree plus LaTeX, linear text, spoken text and MathML.
- Audience: anyone entering maths, chemistry or physics notation in a web app
  (learning and assessment, calculators, scientific forms, notebooks, chat)
  on a phone, tablet or laptop; integrators are web developers embedding it
  in any framework. Call the person typing the "user" and what they type an
  "expression"; education is one use case, not the product's identity.
- Outputs are equals: the tree is the lossless source of truth; LaTeX, text,
  spoken and MathML each serve different hosts. LLMs are one consumer.
- Origin (for About sections): built out of the need for such a field in a
  study app for GCSE students in England. Do not name that app.
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
- Design principles: no input language for users; keys show exactly what
  they insert; default skin provided, fully reskinnable by tokens and classes;
  accessible by keyboard and screen reader.
- Deferred (27 Sep 2026): npm publishing, GitHub remote and CI.
- Decision needed: hosting for the live demo.
