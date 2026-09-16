# PR 10.3 — What A5 actually needed

Phase 10 · fourth PR · closes the phase · independent of 10.0–10.2

The measurement this phase's handoffs were written from, and the three loose
ends it turned up that belong nowhere else.

## The measurement, for the record

Taken across all 26 A5 files, 4,494 lines, before any of Phase 10 was written:

| checked | result |
|---|---|
| hardcoded hex | **zero** (4 matches were `#201` bug references) |
| `[data-theme=…]` patches | **zero** |
| raw `<select>` | **zero** — Phase 8 caught them all, R21 included |
| raw `<textarea>` | **one**, and it is not where 9.2 said (see item 1) |
| raw `<input>` | two, both labelled checkboxes — legitimate |
| stranded components | **zero** |
| tables using zebra fills | zero — `PrivacyDataTable` already rules every row |
| serif on a utility surface | zero — A5's "sans throughout" already holds |
| pages using `PageShell` / `usePageGate` | **zero of four** |
| A5 suites using the a11y or accent gates | **zero of twenty** |

Two things worth naming from that. First, **the streak of stranded components
ends here** — R13 found three cards, R15 `NPCLegend`, R29 `LatestChapter`, and
A5 has none, so "check for a component nothing renders" can stop being the
first thing a phase does. Second, the phase's real work was composition and
gates, not paint, which is the fourth phase in a row where that was true
(R13, R19, R29). At four, it is the expectation rather than the surprise, and
`00-transition-plan.md`'s "adoption before invention" is why: the token work
landed early and the phases since have been consuming it.

## Do

1. **`ContactForm`'s raw `<textarea>` goes, and 9.2's claim gets corrected.**
   `09-2` said `NoteEditor` was "the last one" and its gate proved it, because
   the gate was `grep -rn '<textarea' src/features src/pages` — and
   `ContactForm.tsx` lives in `src/shared/components/`. The grep was accurate
   about what it checked and the sentence it supported was wrong.
   Convert it to `Input isTextArea` the way D89 converted the note body, and
   **write the gate as `src` minus `core/components/Input.tsx`** so the next
   person's "last one" is true. Record the correction as a revision — it is a
   small factual error but it is exactly the kind that a later reader would
   inherit as settled.
2. **Decide what to do about the admin debug logging.** `AdminPanel` prints six
   `console.log` lines of auth state on every render pass, and
   `CampaignManagementView` two more. They are not errors — there are 13
   `console.*` calls in A5 and the other five are `console.error` in catch
   blocks, which are fine.
   The honest framing: there are **119 `console.*` calls across `src`**, so
   this is not an A5 problem and a phase-wide cleanup is not Phase 10's job.
   But logging a user's admin status and group membership on every render is
   its own small thing, in a file this phase is already touching. Remove those
   eight or log why they stay; do not start on the other 111.
3. **Do the A5 read, and expect to change nothing.** A5 asks that these
   surfaces "inherit correctly and read well", with four specific rules: sans
   throughout, `surface.card` sections with one rule between, tables ruled
   rather than filled, and admin views allowed their density. Three of the four
   measured clean before the phase started. Walk them in the browser and either
   confirm or fix — and if it is confirm, **say so explicitly**, because a
   phase that closes with "nothing needed doing here" is a real result and
   reads as an oversight when it is left unsaid.

## Do not

- Do not widen item 2 into a `console.*` audit. 119 call sites is a project.
- Do not convert the two labelled checkboxes to `Input`. `Input` is a text
  control; a checkbox with an associated `<label>` is already named and already
  correct, and D73 is the precedent for leaving a correct control alone.
- Do not touch `PrivacyDataTable`'s markup to "improve" the rules. It measured
  right. Re-deriving a correct surface is how a good one gets worse — the same
  warning `09-3` carried about the reader.
- Do not open Phase 11's work. Medieval's ornament and dark's parity are D40's
  and Phase 11's, however tempting it is while looking at these pages in dark.

## Gates

- `grep -rn '<textarea' src --include=*.tsx` returns nothing outside tests and
  `core/components/Input.tsx`. This is the corrected gate; run it as written.
- `ContactForm`'s control resolves by label, and `unnamedControlsIn` is clean
  for the form.
- The contact suite stays green — `ContactForm.test.tsx` is the slowest suite
  in the project at ~32s, so run it alone and give it room.
- The correction to 9.2 has a drift-log entry. So does item 2's decision.
- Screenshots of all four A5 pages, light and dark, if 10.0 and 10.1 have
  landed; otherwise note which are pending.
- Suite green; count grows only by whatever item 1 adds.

## References

D89 (the note body's conversion, and the pattern to copy); `09-2`'s gate, for
the correction; A5 in `../05-archetypes.md`; D40 and Phase 11 for what is
deliberately left; R13, R15, R19, R29 for the streak this phase ends.
