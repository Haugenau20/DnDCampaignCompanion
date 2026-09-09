# PR 6.1 — Sigil paint, and adopt it in Roster

Phase 6 · branch `visual/phase-6-collections` · first PR

`EntitySigil` shipped in Phase 3 with tests and is imported by nothing but its
own test file. This PR gives it paint and puts it in the one component every
collection in the app renders through.

## Scope

- `src/core/themes/css/components.css`
- `src/core/themes/token-variables.ts` (verify only, edit only if needed)
- `src/core/components/Roster.tsx`
- `src/core/components/__tests__/Roster.test.tsx`
- `src/core/themes/__tests__/token-values.baseline.json`

## Do

1. **Verify the variables exist at runtime.** `entityPalette` is an ordered
   array and `sigilVariableFor(i)` expects `--entity-palette-<i>`; `entityInk`
   expects `--entity-ink`. Confirm `token-variables.ts` derives both from the
   token paths. If array tokens are not yet flattened per index, that is this
   PR's real work — do it there, not with a hand-written map (Phase 1's rule).
2. **Add `.entity-sigil` to `components.css`, in the `app` layer.** Background
   `var(--entity-palette-N)` per `[data-sigil-index="N"]`, N in 0–7; colour
   `var(--entity-ink)`; radius `var(--border-radius-md)`; no border, no shadow.
   Eight index rules, nothing else — every other property is identical across
   entities by design.
3. **Render it in `Roster.tsx`.** The row grid at ~line 422 gains a leading
   slot before the label. Size 28. It needs the entity id; if the row data
   does not carry one, thread it through as a required prop rather than
   deriving from the name — the id is what makes the mark stable.
4. **Tests:** a Roster row renders one sigil; the same entity in two rosters
   renders the same `data-sigil-index`; a row without an id fails loudly
   rather than rendering a mark.

## Do not

- Do not put the hue inline in `EntitySigil.tsx`. Paint stays in the
  stylesheet where a theme can reach it; the component states only which
  entity this is.
- Do not touch the directory components yet — 6.2 and 6.3 do that. This PR
  should light up sigils across the app *through* `Roster` alone.
- Do not give the sigil a border, ring or shadow to "separate it". If it does
  not separate, the palette is wrong, and that is a value question for later.
- Do not raise `SIGIL_BUCKET_COUNT`.

## Gates

- Both themes render eight distinct hues; medieval too (it still exists in
  this phase).
- Contrast: every palette entry against `--entity-ink` at 3:1 or better — a
  sigil is non-text even though it contains a letter, because the letter is
  `aria-hidden` duplication of the adjacent name.
- `css-layers.test.ts` green; no resting background added to a state class.
- Screenshot: NPCs, Locations, Quests, Rumors, light and dark.

## References

Design language §7 (identity marks), §2 "nothing is encoded by colour alone",
D7 and D10 in the drift log.
