# Product facts

- Name: MathInput. npm scope `@mathinput` (`core`, `element`, `react`). Licence: MIT.
- What it is: a web component that lets a learner enter one maths, chemistry
  or physics expression as it looks on paper, using a keypad or keyboard, and
  returns it as a tree plus LaTeX, linear text, spoken text and MathML.
- Audience: GCSE and A-level learners (England) on phones, tablets and
  laptops; integrators are web developers embedding it in any framework.
- First consumer: the NG+ study app (`~/src/ngplus`), which sends answers to an
  LLM for judging. NG+ needs must not leak into the component.
- Scope boundaries: one expression per instance (hosts own lists of steps); no
  evaluation or CAS; no network, storage or analytics; no handwriting input.
- Authoritative spec: `docs/dev/specs/mathinput-component.md`. Interactive
  mockup: `docs/dev/specs/prototype/mathinput-prototype.html`.
- Design principles: no input language for learners; keys show exactly what
  they insert; default skin provided, fully reskinnable by tokens and classes;
  accessible by keyboard and screen reader.
- Decision needed: public npm publishing and a hosted demo URL (planned for
  plan phase 9).
