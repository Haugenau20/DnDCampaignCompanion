# Bug #1416 — A location whose `parentId` does not resolve renders nowhere at all

## Status
✅ FIXED — 2026-08-01, commit `e668807`.

## Category
UI / data integrity

## Discovered In
Investigating a report that "all child locations have gone missing" on the Locations page. That
report was a false alarm — the campaign being viewed (LOTR) genuinely has five locations, all with
`parentId: null`, so a flat list of five was correct, and the nesting was never broken. Chasing it
turned up this instead, on the same code path.

## Affected File
`src/features/campaign-entities/locations/components/LocationDirectory.tsx`

## Description

`LocationDirectory` buckets every location into `locationHierarchy` keyed by `parentId || 'root'`,
then renders from `'root'` downward. `renderRows` is only ever called with `'root'` or with the id of
a row **it is already rendering** (the recursive call inside a row's `expandedContent`).

So a location whose `parentId` names an id that is not in the loaded set sits under a hierarchy key
nobody ever visits. It renders **nowhere** — not in the tree, not in the group's `count`, and it does
not trigger the empty state — while still counting toward `RosterStatusBar`'s `total={locations.length}`.
The page therefore shows a bar reading "5 charted so far" above a list containing four rows, with no
indication that anything is missing.

This was live in the seeded emulator data: `bag-end`'s `parentId` was `hobbiton`, and no `hobbiton`
document existed in any campaign.

[#303](./303-location-parent-id-rederived-from-editable-name.md) documents the mechanism that
produces dangling `parentId`s in real user data — renaming a parent re-derives its id — but its
Impact section understates the consequence. It says the child "appears parentless"; in the directory
the child is **invisible**.

## Reproduction

1. Seed the emulator (`.\scripts\manage-dev-data.ps1 -Action generate`).
2. Select The Hobbit campaign and open **Locations**.
3. The status bar reads 5; count the rows — there are 4. Bag End appears nowhere.

## Expected vs Actual

**Expected**: every location is reachable, and the counts reconcile.
**Actual**: locations with a dangling `parentId` are silently dropped from the page.

## Fix

Orphaned buckets are collected alongside `locationHierarchy` and rendered in a second, muted
`RosterGroup` titled **"Unplaced"**, placed after the main one. The empty state now keys off *both*
groups being empty rather than only the root rows, so root + unplaced reconciles against the status
bar total. An orphan's own descendants still nest underneath it as normal, since they are keyed by
the orphan's own (perfectly valid) id.

The ~230-line row body was **not** duplicated: `renderRows` was split into `renderLocationRows`,
which takes a pre-resolved list, plus a thin `renderRows` that resolves and filters out of
`locationHierarchy` as before and delegates.

The seed data's dangling reference was fixed separately by adding the `hobbiton` village the data had
always implied.

## Notes

There was **no test anywhere** rendering a location with an unresolvable `parentId` before this fix.
Four were added in `LocationDirectory.test.tsx`, including the one that matters most — that root rows
plus unplaced rows together account for every location supplied.
