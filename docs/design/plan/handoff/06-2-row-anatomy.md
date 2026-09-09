# PR 6.2 — Row anatomy: state the type once

Phase 6 · second PR · depends on 6.1

With a sigil present, most rows now encode their type three times: the mark,
a coloured chip, and in `LocationDirectory` a `--location-type-*` colour.
Design language §8 allows one.

## Scope

- `src/features/campaign-entities/npcs/components/NPCDirectory.tsx`
- `src/features/campaign-entities/locations/components/LocationDirectory.tsx`
- `src/features/campaign-entities/quests/components/QuestDirectory.tsx`
- `src/features/campaign-entities/rumors/components/RumorDirectory.tsx`
- `src/core/themes/css/components.css`
- the matching test files

## Do

1. **One type encoding per row.** Keep a plain sans label; remove the
   `bg-secondary` fill behind it (`NPCDirectory` ~line 348) and any
   type-derived colour. The sigil identifies the *entity*; the label states
   the *type*; nothing else says either.
2. **Rules, not boxes.** Rows inside a directory card separate with an inset
   rule that stops short of the card edge. Remove per-row `rounded-md`
   backgrounds where they exist only to draw a box
   (`LocationDirectory` ~lines 378, 402).
3. **Nested lists** (a location's NPCs, a quest's objectives) indent under the
   parent row on `surface.sunken`, with the same rule treatment. They are
   parts of one object, not separate cards.
4. **Retire `--location-type-*`** in favour of the entity palette. Flagged as
   a one-way door in `00-transition-plan.md` §6.4 — check nothing persists a
   colour choice, and log the entry either way.

## Do not

- Do not delete the type *text*. Removing the encoding means removing the
  redundant one, never the accessible one.
- Do not introduce a second accent for any row state.
- Do not restyle the search or filter bar; that is 6.3.
- Do not change row spacing yet — 6.3 owns density, and mixing the two makes
  the screenshot diff unreadable.

## Gates

- Every row's type is still stated in text.
- Grep clean: no `--location-type-` left in `src/`.
- Screenshot pairs per directory; the diff should read as *fewer* boxes and
  identical information.
- Empty campaign: every directory still renders its designed empty state.

## References

Design language §8 (a row states its type once), §5 (rules over boxes), §2
(nothing encoded by colour alone).
