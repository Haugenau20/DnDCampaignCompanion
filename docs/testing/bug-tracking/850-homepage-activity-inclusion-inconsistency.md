# Bug #850 — HomePage chapter activity inclusion inconsistency

## Title
HomePage chapter activity inclusion uses `dateModified || dateAdded` fallback while other entity types require `dateModified`

## Status
✅ FIXED (2026-07-28)

## Category
DATA

## Discovered In
`src/pages/__tests__/HomePage.test.tsx` — "activity computation" describe block

## Affected File
`src/pages/HomePage.tsx` (lines ~126–197 in the `activities` useMemo)

## Resolution

Unified all five branches on the chapter pattern, `dateModified || dateAdded`, per this report's
recommended fix: quests, rumors, and NPCs now check `X.dateModified || X.dateAdded` instead of
`X.dateModified` alone. Locations keep their `'dateModified' in location` type-narrowing check
(needed because of the field's type) but now also fall through to `location.dateAdded`:
`'dateModified' in location && (location.dateModified || location.dateAdded)`. The `timestamp:`
expression after each guard (`new Date(X.dateModified || X.dateAdded)`) was already written this
way for all five types, so no change was needed there.

Proof: added one test per previously-strict type (quest, rumor, NPC, location) to
`src/pages/__tests__/HomePage.test.tsx`, each creating an item with only `dateAdded` set and
asserting it still appears in the activity feed (`data-activity-count` = 5, i.e. included alongside
the other four fixture items). Reverting the production fix and re-running those four tests
reproduced the reported inconsistency directly:

```
includes a quest in activities when only dateAdded is set (dateModified || dateAdded fallback)
Expected: 5
Received: 4
```

(same 5-vs-4 failure for rumor, NPC, and location). Restoring the fix turns all four green again.
Full `HomePage.test.tsx` suite: 25/25 passing after the fix (21 pre-existing + 4 new).

## Description
The `activities` useMemo in `HomePage` applies different inclusion logic across content types:

- **Chapters**: included if `chapter.dateModified || chapter.dateAdded` — a chapter with only `dateAdded` is included.
- **Quests, Rumors, NPCs, Locations**: included only if `X.dateModified` is truthy — items with only `dateAdded` are excluded.

This inconsistency means chapters that have never been edited (no `dateModified`) still appear in recent activity, while new quests/NPCs/etc. created but not yet modified are silently excluded.

## Reproduction
1. Create a chapter with `dateAdded` but no `dateModified`.
2. Create a quest with `dateAdded` but no `dateModified`.
3. Observe: chapter appears in activities; quest does not.

## Expected vs Actual
**Expected**: All entity types use the same fallback logic — either all use `dateModified || dateAdded` or all require `dateModified`.

**Actual**: Chapters use the fallback (`dateModified || dateAdded`), other types do not.

## Recommended Fix
Unify the activity inclusion logic. The simplest fix is to use `item.dateModified || item.dateAdded` for all entity types, matching the chapter pattern. Alternatively use only `dateModified` across all types and ensure creation sets `dateModified` as well as `dateAdded`.
