# Bug #600 — Location Sort Order Inconsistency Between useLayoutData and LocationsMap

## Title
Location sort order for "explored" status is reversed between `useLayoutData` hook and `LocationsMap` component

## Status
🔍 DISCOVERED

## Category
UI / DATA

## Discovered In
Unit tests for `useLayoutData` (`useLayoutData.test.ts`) and `LocationsMap` (`LocationsMap.test.tsx`)

## Affected Files
- `src/components/features/layouts/common/hooks/useLayoutData.ts` — lines 106–109
- `src/components/features/layouts/journal/sections/LocationsMap.tsx` — lines 22–27

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
