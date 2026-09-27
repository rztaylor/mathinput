# Git facts

- Default branch: `main`. The initial foundation commit was made directly on
  `main`; all later work uses short-lived feature branches.
- Commit each coherent increment (one behaviour, refactor or docs change),
  with the spec, facts, boundary docs and changelog updates it needs.
- Conventional commit subjects (`feat(core): …`, `docs: …`, `chore: …`).
- No remote is configured yet. Push, remote creation and pull requests happen
  only when the user asks. Never approve or merge on the user's behalf.
- `.agents/skills` is a local symlink and is gitignored.
