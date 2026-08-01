# Bug #1420 — `LocationCard.tsx` is dead code kept alive by the barrel

## Status
🔍 DISCOVERED — 2026-08-01. Confirmed by grep; deliberately left unfixed.

## Category
Maintainability

## Affected Files
- `src/features/campaign-entities/locations/components/LocationCard.tsx` (543 lines)
- `src/features/campaign-entities/index.ts:27` (the only thing importing it)
- `src/features/campaign-entities/locations/components/__tests__/LocationCard.test.tsx`

## Description

`LocationCard` has **no non-test importer**. It is reachable only through the barrel re-export, which
is what stops every tooling signal from noticing it:

```
src/features/campaign-entities/index.ts:27:
export { default as LocationCard } from './locations/components/LocationCard';
```

It was superseded when `LocationDirectory` was rebuilt as a roster (commit `fe0cd72`), which replaced
the card grid with `RosterRow`s. The card's own "Expand Sub Locations" button — the affordance that
became the generic chevron — is still in there at `:516-525`.

This is the **exact situation** commit `7615159` resolved for `QuestCard`, which was deleted as an
orphan in the same redesign. `LocationCard` was missed.

It still contributes to coverage numbers, still type-checks, still runs its own test suite, and still
appears in the barrel's public API as though it were something a consumer might legitimately use.

## Why it is not fixed

Deleting it also means deleting `LocationCard.test.tsx`, which is a **coverage decision rather than a
bug fix** — the suite's statement coverage will move, and the CI floor is a uniform 80%. That is a
judgement call for the repository owner, not something to bundle into an unrelated commit.

## Recommended Fix

Delete the component, its test file, and the barrel export, exactly as `7615159` did for `QuestCard`.
Then re-measure coverage (`npm run test:coverage`) and confirm the floor still holds.

Check for siblings while there: `LocationCombobox`, `NPCCard`, `NPCLegend` and `RumorCard` are all
barrel-exported too, and at least `RumorCard` is still referenced. Do not assume — grep each one, and
remember the lesson recorded in CLAUDE.md that `grep "^export"` misses indented exports in this
codebase.
