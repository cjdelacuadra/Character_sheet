# codex → claude handoff log

Protocol: one entry per ambiguity, blocker, or design decision, appended by
codex while executing `implementation/plan.txt`. Format:

`<ISO timestamp> · DELIVERABLE <A-G> · <file/symbol> · <precise description>`

Claude reads this file after the run to verify, resolve, and commit.

---
