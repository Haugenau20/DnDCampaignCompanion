# Handoffs

One markdown per PR, written for Claude Code to execute without further
context. Each is self-contained: read the file, do the work, open the PR.

Handoffs are written **as a phase starts**, not up front — the same reason
`00-transition-plan.md` deferred the 2a/3a choice. A handoff written three
phases early is a guess with a checklist attached.

Currently written: Phase 6 (`06-0` … `06-3`, done) and Phase 7
(`07-0` … `07-2` done, `07-3` remaining).

Phase 7's optional fourth PR — the image **upload** path — is deliberately not
written. D6 keeps bitmaps out of this project entirely, so it is a handoff for
work that may never be scheduled, and writing it now would be the guess this
section warns about.

## Contract every handoff follows

- **Scope** — the files it may touch. Anything else is out of scope; log it in
  `../03-drift-log.md` rather than doing it.
- **Do** — the change, concretely.
- **Do not** — the adjacent temptations, named.
- **Gates** — what must be green, plus the phase's own checks.
- **Design language references** — the section that decides any judgement call
  the handoff did not anticipate.

Read `../../design/design-language.md` and `../01-token-model.md` before the
first one. When a handoff and the design language disagree, the design
language wins and the handoff is wrong.
