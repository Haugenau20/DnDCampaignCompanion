# Bug #600 — Location Sort Order Inconsistency Between useLayoutData and LocationsMap

## Title
Location sort order for "explored" status is reversed between `useLayoutData` hook and `LocationsMap` component

## Status
🔍 DISCOVERED — fix attempted 2026-07-28, **blocked, left unfixed** (see Resolution Attempt below)

## Category
UI / DATA

## Discovered In
Unit tests for `useLayoutData` (`useLayoutData.test.ts`) and `LocationsMap` (`LocationsMap.test.tsx`)

## Affected Files
- `src/pages/layouts/common/hooks/useLayoutData.ts` — lines ~102–115 (current path; moved during restructuring, was `src/components/features/layouts/common/hooks/useLayoutData.ts`)
- `src/pages/layouts/journal/sections/LocationsMap.tsx` — lines ~19–31 (current path; moved during restructuring, was `src/components/features/layouts/journal/sections/LocationsMap.tsx`)

## Resolution Attempt (2026-07-28)

Re-verified live: `LocationsMap.tsx`'s own comment directly above its sort (`// Sort locations by
status (explored first) then by name`) says **explored first**, but its code sorts explored
**last** — the opposite of both its own comment and `useLayoutData`'s sort. So the comment is
correct and the code is the defect; the direction to fix towards is explored-first, matching
`useLayoutData`.

Applying that fix (flipping the three comparator branches in `LocationsMap.tsx` so `explored`
returns `-1`/`1` instead of `1`/`-1`, matching `useLayoutData` exactly) breaks a pre-existing,
currently-passing test in `src/pages/layouts/journal/sections/__tests__/LocationsMap.test.tsx`:

```
sorting behavior › displays known-status locations before explored ones

Expected: "Known Town"
Received: "Explored City"
```

That test is a characterization test of the current (buggy) behaviour — it asserts `known` sorts
before `explored`, i.e. explored-last, which is exactly the bug being removed. Per this project's
test-modification policy, a test cannot be edited just because a fix makes its assertion stale;
that requires explicit authorisation. The production change was therefore reverted
(`git checkout -- LocationsMap.tsx`) and **this bug is left unfixed** pending a decision on that
test. `LocationsMap.test.tsx` is back to its original 21/21 passing state.

**Next step for whoever picks this up**: get explicit sign-off to update the "displays
known-status locations before explored ones" test's expected order (known after explored, per the
explored-first direction below), then reapply the sort-direction fix described in "Recommended
Fix".

## Description
The two implementations of location sorting by status produce **opposite orderings** for `explored` locations:

- **`useLayoutData`** (lines 106–109): `explored` is sorted **first** (highest priority). `visited` comes second, `known` comes last.
- **`LocationsMap`** (lines 22–27): `explored` is sorted **last** (lowest priority). `visited` comes second, `known`/others come first.

This means a consumer that displays `sortedLocations` from `useLayoutData` will show explored places first, while `LocationsMap` — which does its own internal sort on the raw `locations` prop — will show explored places last.

## Reproduction

### useLayoutData behaviour (explored = FIRST):
```ts
// useLayoutData.ts lines 106-109
if (firstLocation.status === 'explored') return -1;  // explored before everything
if (secondLocation.status === 'explored') return 1;
if (firstLocation.status === 'visited') return -1;   // visited before known
if (secondLocation.status === 'visited') return 1;
```

### LocationsMap behaviour (explored = LAST):
```ts
// LocationsMap.tsx lines 22-27
if (a.status === 'explored') return 1;   // explored AFTER everything
if (b.status === 'explored') return -1;
if (a.status === 'visited') return 1;    // visited AFTER known
if (b.status === 'visited') return -1;
```

## Expected vs Actual

**Expected**: Both implementations should use the same sort priority for `explored` locations.

**Actual**: `useLayoutData` puts explored first; `LocationsMap` puts explored last. The intent appears to be that more-explored locations should be de-emphasised (they are "done"), but only `LocationsMap` implements this. `useLayoutData`'s `sortedLocations` is inconsistent with this intent.

## Recommended Fix
Decide on a canonical sort order and apply it consistently. If the intent is "active/less-explored locations first" (consistent with `LocationsMap`), then `useLayoutData.sortedLocations` should be updated to match:
```ts
// Make useLayoutData match LocationsMap:
if (firstLocation.status === 'explored') return 1;
if (secondLocation.status === 'explored') return -1;
if (firstLocation.status === 'visited') return 1;
if (secondLocation.status === 'visited') return -1;
```
Alternatively, if explored-first is desired, update `LocationsMap` accordingly.
