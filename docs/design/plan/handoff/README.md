# Handoffs

One markdown per PR, written for Claude Code to execute without further
context. Each is self-contained: read the file, do the work, open the PR.

Handoffs are written **as a phase starts**, not up front — the same reason
`00-transition-plan.md` deferred the 2a/3a choice. A handoff written three
phases early is a guess with a checklist attached.

Currently written: Phase 6 (`06-0` … `06-3`, done); Phase 7 (`07-0` … `07-2`
done, then `07-2-5` -- a redo of the NPC page against a design mock, which
absorbed `07-3`. Phase 7 is complete; `07-3` is kept for the record with a note
saying where its work went, R18); Phase 8 (`08-0` … `08-3`, done); and Phase 9
(`09-0` done; `09-1` … `09-3` unstarted).

`09-0` settled Q10 as D82/D83 and answered its own "where do rendered notes
appear" as D84: **nowhere**. That narrows what follows — `09-1` renders two
surfaces rather than three, and `09-2` still moves `NoteEditor` onto `Input`
for the label association but gives it **no toolbar**, so its item 6 (the
markdown hint) applies to the chapter and saga forms alone. Amend `09-2` when
it starts rather than reading it as written.

Phase 8 is worth reading in order. `08-0` builds the `Select` that does not
exist, `08-1` adopts it and fixes 17 unassociated labels, `08-2` unifies nine
hand-rolled chips, and `08-3` handles rhythm and actions. Nothing after `08-0`
can start without it, and `08-1` is the one carrying the accessibility fix that
turned out to be the real point of the phase (R19).

Phase 9 is three PRs in a chain plus one that is independent. `09-0` decides and
builds markdown (Q10) and blocks `09-1` (the two reading surfaces adopt it) and
`09-2` (the authoring toolbar). `09-3` depends on none of them and can be taken
first or last: it is the loose ends left by `413259e`, which built most of what
Phase 9 was scoped to build, before Phase 9 started (R29).

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
