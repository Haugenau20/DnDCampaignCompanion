# Bug #850 — HomePage chapter activity inclusion inconsistency

## Title
HomePage chapter activity inclusion uses `dateModified || dateAdded` fallback while other entity types require `dateModified`

## Status
🔍 DISCOVERED

## Category
DATA

## Discovered In
`src/pages/__tests__/HomePage.test.tsx` — "activity computation" describe block

## Affected File
`src/pages/HomePage.tsx` (lines 125–132 vs 141–196)

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
