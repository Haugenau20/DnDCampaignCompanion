# PR 7.0 — Retire the three stranded cards

Phase 7 · runs before 7.1 · deletion only

`04-rollout.md` says Phase 7 "also migrates `NPCCard`, `LocationCard`,
`RumorCard`, `NoteCard` where they name colours directly, and drops the
`[data-theme=…]` patches that survive there". Both halves of that sentence were
measured against the tree as it stood before Phase 6, and neither holds now
(R13):

- **Three of the four cards are rendered by nothing.** `NPCCard` (394 lines),
  `LocationCard` (542) and `RumorCard` (405) are exported from
  `features/campaign-entities/index.ts` and imported by no component in the
  app — only by their own test files, which are a further ~1,300 lines. They
  were stranded when the directories moved to `Roster` rows, not left behind
  deliberately. `NoteCard` is live: `NotesList` renders it.
- **No `[data-theme=…]` patch survives in any of them.** The 21 that remain in
  the tree are medieval ornament (10), scrollbars (4), a dark dialog shadow, a
  light card hover, and book/reader typography — none of them card colour.

Migrating 1,341 lines of unreachable component would be work that changes
nothing anybody can see. Delete them first, so 7.1–7.3 never have to decide
whether to reuse them.

## Scope

- `src/features/campaign-entities/npcs/components/NPCCard.tsx` + its test
- `src/features/campaign-entities/locations/components/LocationCard.tsx` + its test
- `src/features/campaign-entities/rumors/components/RumorCard.tsx` + its test
- `src/features/campaign-entities/index.ts` (three barrel exports)
- `src/core/themes/css/components.css` (only rules left with no consumer)

## Do

1. **Read all three before deleting them.** They are the closest thing this
   repo has to a specification for what an entity page shows: each renders the
   full field set, the note history, related quests and NPCs, and attribution.
   `07-1` already carries that field list, derived from them and from the
   types — check it against what you read and correct it if it missed
   something. That is the whole reason this PR runs first rather than last.
2. Delete the three components, their tests, and their barrel exports.
3. Re-grep for each name afterwards. The barrel export is the reference that a
   JSX-shaped grep misses.
4. Remove any `components.css` rule whose only remaining consumer was one of
   the three. `quest-status-*` is **not** one of those — `LocationDirectory`
   still renders it, and Phase 12 retires that family.

## Do not

- Do not delete `NoteCard`. It is live.
- Do not delete `EntityCard` (`collaboration/entity-extraction`). Different
  component, different domain, live.
- Do not "keep one as a reference". Git keeps it; the tree should not.
- Do not treat the deletion as licence to change what a directory row shows.
  6.1 settled the row.

## Gates

- `grep -rn "NPCCard\|LocationCard\|RumorCard" src/` returns nothing outside
  changelog-style docs.
- Suite green, minus exactly the three deleted suites. Record the before and
  after counts in the PR body.
- `npm run build` green, and the bundle gets smaller. Put the delta in the
  PR body — it is the receipt.
- No route changes. Nothing rendered differently anywhere.

## References

R13; design language §12.1; the same argument as `06-0`.
