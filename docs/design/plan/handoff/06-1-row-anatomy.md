# PR 6.1 — Sigil adoption and row anatomy: state the type once

Phase 6 · branch `visual/phase-6-collections` · first migration PR · depends on 6.0

Two halves of one thought, and one PR by R7: `EntitySigil` goes into the
component every collection renders through, and the encodings it makes
redundant come out. Splitting them would land the app in exactly the state the
second half exists to fix — a mark, a coloured chip and a type-derived colour,
three encodings of one fact where design language §8 allows one.

Land them as two commits so the diff still reads as two changes.

Most of the sigil work is already done: `.entity-sigil` and its eight
`[data-sigil-index]` rules are in `components.css`, and `--entity-palette-0…7`
and `--entity-ink` resolve at runtime. `ActivityFeed` already renders one. No
*directory* does — that is what this PR fixes.

## Scope

- `src/core/components/Roster.tsx`
- `src/core/components/__tests__/Roster.test.tsx`
- `src/features/campaign-entities/npcs/components/NPCDirectory.tsx`
- `src/features/campaign-entities/locations/components/LocationDirectory.tsx`
- `src/features/campaign-entities/quests/components/QuestDirectory.tsx`
- `src/features/campaign-entities/rumors/components/RumorDirectory.tsx`
- `src/core/themes/css/components.css`
- `src/core/themes/token-variables.ts` (verify only; edit only if needed)
- the matching test files

## Do

### Commit 1 — adopt the sigil

1. **Verify the variables before touching anything.** `entityPalette` is an
   ordered array and `sigilVariableFor(i)` expects `--entity-palette-<i>`;
   `entityInk` expects `--entity-ink`. Confirm `token-variables.ts` derives both
   from the token paths. If array tokens are not flattened per index, fix it
   there — never with a hand-written map (Phase 1's rule).
2. **Render it in `Roster.tsx`.** The row grid gains a leading slot before the
   label. Size 28. It needs the entity id; if the row data does not carry one,
   thread it through as a required prop rather than deriving from the name — the
   id is what makes the mark stable across surfaces.
3. **Tests:** a Roster row renders one sigil; the same entity in two rosters
   renders the same `data-sigil-index`; a row without an id fails loudly rather
   than rendering a mark.

### Commit 2 — remove what the sigil made redundant

4. **One type encoding per row.** Keep a plain sans label; remove the
   `bg-secondary` fill behind it (`NPCDirectory` ~line 348) and any type-derived
   colour. The sigil identifies the *entity*; the label states the *type*;
   nothing else says either.
5. **Entity names in serif, everything about them in sans** (D46).
6. **Rules, not boxes.** Rows inside a directory card separate with an inset
   rule that stops short of the card edge. Remove per-row `rounded-md`
   backgrounds that exist only to draw a box (`LocationDirectory` ~lines 378,
   402).
7. **Nested lists** (a location's NPCs, a quest's objectives) indent under the
   parent row on `surface.sunken`, with the same rule treatment. They are parts
   of one object, not separate cards.
8. **`.location-type-*`:** the eight *tokens* went in Phase 3 and the eight
   *classes* now read the entity palette, so the one-way door in
   `00-transition-plan.md` §6.4 is already through. Leave the classes; Phase 12
   retires them with the rest of the cleanup. Check nothing persists a colour
   choice and log what you find either way.

## Do not

- Do not put the hue inline in `EntitySigil.tsx`. Paint stays in the stylesheet
  where a theme can reach it; the component states only which entity this is.
- Do not give the sigil a border, ring or shadow to "separate it". If it does
  not separate, the palette is wrong, and that is a value question for later.
- Do not raise `SIGIL_BUCKET_COUNT`.
- Do not delete the type *text*. Removing an encoding means removing the
  redundant one, never the accessible one.
- Do not introduce a second accent for any row state.
- Do not restyle the search or filter bar; that is 6.2.
- Do not change row spacing — 6.2 owns density, and mixing the two makes the
  screenshot diff unreadable. This is the seam worth keeping.

## Gates

- Both themes render eight distinct hues; medieval too (it still exists in this
  phase).
- Contrast: every palette entry against `--entity-ink` at 3:1 or better. A sigil
  is non-text even though it contains a letter, because the letter is
  `aria-hidden` duplication of the adjacent name.
- Every row's type is still stated in text.
- `css-layers.test.ts` green; no resting background added to a state class (D9).
- Screenshot pairs per directory, light and dark: the diff should read as
  *fewer* boxes, one new mark, and identical information.
- Empty campaign: every directory still renders its designed empty state.

## References

Design language §7 (identity marks), §8 (a row states its type once), §5 (rules
over boxes), §2 (nothing encoded by colour alone); D7, D9, D10, D25, D46, R7;
A1 in `../05-archetypes.md`.
