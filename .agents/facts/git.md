# Git facts

- Default branch: `main`. The initial foundation commit was made directly on
  `main`; all later work uses short-lived feature branches.
- Commit each coherent increment (one behaviour, refactor or docs change),
  with the spec, facts, boundary docs and changelog updates it needs.
- Conventional commit subjects (`feat(core): …`, `docs: …`, `chore: …`).
- Remote: `origin` = https://github.com/rztaylor/mathinput (public). Push
  and pull requests happen only when the user asks. Never approve or merge
  on the user's behalf.
- CI (`.github/workflows/ci.yml`) runs on pull requests and `main`. `main`
  is protected: the `check` job must pass (admins included), no force
  pushes or deletion. Changes reach `main` only through green pull requests.
- `release` is the website production branch (Cloudflare Pages deploys on
  push). Update it only from reviewed `main`.
- `.agents/skills` is a local symlink and is gitignored.
