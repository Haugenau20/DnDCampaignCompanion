# Handoffs

One markdown per PR, written for Claude Code to execute without further
context. Each is self-contained: read the file, do the work, open the PR.

Handoffs are written **as a phase starts**, not up front — the same reason
`00-transition-plan.md` deferred the 2a/3a choice. A handoff written three
phases early is a guess with a checklist attached.

Currently written: Phase 6 (`06-0` … `06-4`, merged) and Phase 12
(`12-1`, `12-2`, `12-3a`, `12-3b`, `12-5`, `12-6`).

Phase 12 is the colour schema — planned in `../06-colour-schema-rollout.md`,
specified in `../../design/colour-schema.md`. Its handoffs carry one extra
rule on top of the contract below: **a generated value is never hand-edited.**
If a colour is wrong, the contract in the schema is wrong.

## Read-only documents

Design sources of truth are **never edited by an implementation PR or by an
agent executing one**: `../../design/colour-schema.md`,
`../../design/colour-schema.json`, `../../design/design-language.md`,
`../01-token-model.md`, the phase plans, and the handoffs themselves.

`../03-drift-log.md` is append-only and is where findings go.

A handoff that is wrong is **reported, not rewritten**. When a document does
not answer something, stop and raise it rather than extending the document —
for the colour schema specifically, the gate is "generated output equals the
fixture", and a fixture edited by the agent being checked passes by
construction. See `../../design/colour-schema.md` §9.

This has happened twice already and worked both times. An implementation agent
found that schema v1 defined 49 primitives while the token tree ships 101
leaves; the schema gained §5.5 at the source. A second agent found that
`status.*` had 22 consumers rather than six, and that sixteen of them were the
application talking about itself with no scale to take — the schema gained the
`feedback` and `disposition` scales, and the migration was split into
`12-3a` and `12-3b`. In both cases the finding was reported, not patched
around.

## Contract every handoff follows

- **Scope** — the files it may touch. Anything else is out of scope; log it in
  `../03-drift-log.md` rather than doing it.
- **Do** — the change, concretely.
- **Do not** — the adjacent temptations, named.
- **Gates** — what must be green, plus the phase's own checks.
- **Design language references** — the section that decides any judgement call
  the handoff did not anticipate.
- **Read-only** — for any handoff that names a source of truth, that document
  is out of bounds for the PR. Finding it wrong is a drift-log entry.

Read `../../design/design-language.md` and `../01-token-model.md` before the
first one. When a handoff and the design language disagree, the design
language wins and the handoff is wrong.
