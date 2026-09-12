# PR 12.4 — Non-colour cues

Phase 12 · fourth PR

The accent and `outcome.failed` are 40° apart on a warm palette — the closest
pair in the schema, and the one real cost of choosing amber. Two shape cues
make that safe, and incidentally make every state legible in greyscale.

## Read-only, in every PR of this phase

`../../design/colour-schema.md`, `colour-schema.json`, `design-language.md`,
`01-token-model.md`, `06-colour-schema-rollout.md` and every
`handoff/12-*.md` are **read-only**. A handoff that is wrong is reported, not
rewritten. `../03-drift-log.md` is append-only and is where findings go.
Schema §9 has the procedure.

## Scope

- `src/core/themes/css/components.css`
- `src/core/themes/css/theme-effects.css`
- The four directories touched by `12-3`

## Do

1. **`cue.hatch` on failure.** A failed quest's progress fill renders as 45°
   hatching in `outcome.failed.fill` instead of a solid bar. This is the
   important one: it makes failure readable from the bar's texture alone, with
   no copy change and no icon.
2. **`cue.strike` on negation.** A hairline rule through the label, in the
   label's own ink, for a deceased NPC and a false rumour. Both are facts that
   are fully known and negated — which is precisely what a strike says and a
   red label does not.
3. **Drive both from the `cue` enum** added in `12-2`, so a theme can change
   cue strength without a code path.

## Do not

- Do not use an icon or a glyph. A shape difference in the element that already
  exists costs nothing; an icon adds a thing to align, translate and explain.
- Do not hatch anything other than failure. A texture that means two things
  means nothing.
- Do not compensate with a stronger red. If the hue needs to shout, the cue is
  not doing its job.
- Do not animate either cue (design language §9).

## Gates

- Greyscale screenshot of quests, locations, rumours and NPCs: every state
  still distinguishable.
- Deuteranopia simulation of the same four, with the accent and
  `outcome.failed` both present in one frame.
- The colour-blind gate recorded as failing in `12-3` now passes.
- Hatching legible at the bar's real height — check it at the row height that
  actually ships, not at a demo size.

## References

Schema §6 (the cue table). Design language §2 (nothing encoded by colour
alone), §9 (restrained motion), §10 (accessibility as identity). Token model §6
(ornament is an enum, not a code path).
