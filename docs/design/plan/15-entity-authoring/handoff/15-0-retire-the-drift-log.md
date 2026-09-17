# PR 15.0 — The drift log is retired; stop pointing at it

Phase 15 · first PR · depends on nothing

`plan/03-drift-log.md` has been retired by the maintainer and its open
findings moved to `TODO.md` in the repository root. Two handoff READMEs still
instruct an implementing agent to append findings to it, which means the next
agent to find something wrong will write it where nobody reads.

This is a documentation-only PR. It ships no code.

## Scope

- `docs/design/plan/handoff/README.md`
- `docs/design/plan/README.md` — the phase-14 README
- `docs/design/plan/03-drift-log.md` — header note only, see below

Nothing else. In particular **not** `colour-schema.md`; see *Do not*.

## Do

1. **`handoff/README.md`** — replace the line reading
   "`../03-drift-log.md` is append-only and is where findings go" and the two
   later references to logging in it. Findings go to `TODO.md`. Keep the
   read-only list otherwise intact, and keep the three worked examples of
   findings being reported rather than patched — those are the most useful
   paragraphs in the file and none of them depends on where the log lived.
2. **`plan/README.md`** (phase 14's) — same correction to its
   "append the finding to `../03-drift-log.md` and stop".
3. **`03-drift-log.md`** — add a short note directly under the title stating
   that the log is closed, the date it closed, that open findings moved to
   `TODO.md`, and that it is kept because `colour-schema.md` §8 and many
   `TODO.md` entries cite its `D` and `R` numbers. Do not touch a single
   existing entry: the file's whole value is that it is a historical record.
4. **Leave the file in place.** Do not delete it and do not start a new one.
   `TODO.md` is now the one tracker for findings; a second log would
   immediately disagree with it.

## Do not

- **Do not edit `design/colour-schema.md`.** Its §9 read-only table still
  lists `plan/03-drift-log.md` as "yes — append only", which is now stale, and
  that file may not be changed by an implementation PR — the rule is in §9
  itself. Add a `TODO.md` item for the maintainer instead, alongside the
  existing T010 and T011 schema doc debt.
- **Do not renumber anything.** Not the `D`/`R` entries, not the phase
  numbers. T010 exists precisely because renumbering means editing read-only
  history.
- **Do not migrate old entries into `TODO.md`.** The maintainer already did
  that harvest, and `TODO.md`'s own preamble records the cost of
  re-discovering items: fourteen entries that had already been fixed.
- Do not reword the phase-15 documents. They already describe the retirement.

## Gates

- Grep `docs/design/plan/` for `03-drift-log` and read every remaining hit:
  each should be a *citation* of a past decision or an explanation of why the
  file is kept, never an instruction to write to it.
- The drift log's entries are byte-identical to before, the new header note
  aside.
- `TODO.md` has gained the two items named in `00-entity-authoring.md` §13.

## References

`00-entity-authoring.md` §13. `handoff/README.md`'s own contract — a handoff
that is wrong is reported, not rewritten — which is the rule this PR is
repairing the plumbing for. `design/colour-schema.md` §9 for why one stale
line is deliberately left alone.
