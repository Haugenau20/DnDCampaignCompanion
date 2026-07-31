# Bug #1414: Location Directory — A Match Nested Two Or More Levels Deep Is Unreachable

**Status**: 🔍 DISCOVERED
**Category**: UI
**Priority**: Medium
**Component**: `src/features/campaign-entities/locations/components/LocationDirectory.tsx`
**Discovered In**: Session 2026-07-31 — while rewriting `LocationDirectory.test.tsx` for the roster redesign

## Description

Searching, or filtering by status, fails to reveal a matching location when that location sits **two
or more levels below** the level currently rendered. The connecting middle ancestor is filtered out
of its own parent's row list, so the branch that would lead to the match is never drawn — while the
auto-expand effect has simultaneously decided that same ancestor *should* be expanded.

A match exactly **one** level deep works correctly, which is why this hides: the shallow case is the
one you reach for when testing by hand.

**Pre-existing, not introduced by the roster redesign.** `git show a0e23fd:.../LocationDirectory.tsx`
has the same early return at lines 110/121. The redesign carried the logic through unchanged; it only
made the symptom easier to see, because the hierarchy is now drawn as nested groups.

## Root Cause

`locationMatchesFilters` takes an `isChild` flag. When set, it returns on the node's own status and
search only, and **never falls through** to the descendant check that the `isChild === false` path
performs:

```ts
// LocationDirectory.tsx:196-208
const matchesStatus = status === 'all' || loc.status === status;
const matchesType   = type === 'all' || loc.type === type;
const matchesSearch = !search || /* name | description | type */;

if (isChild) {
  return matchesStatus && matchesSearch;   // ← returns here; no descendant check
}

// only reached when isChild === false:
if (matchesStatus && matchesType && matchesSearch) return true;
const children = hierarchy[loc.id] || [];
return children.some(child => locationMatchesFilters(child, hierarchy, status, type, search, false));
```

`renderRows` calls it with `isChild = true` whenever the parent's own type already satisfies the type
filter — which is essentially always, since `typeFilter` defaults to `'all'`:

```ts
// LocationDirectory.tsx:288-294
if (parentLocation && (typeFilter === 'all' || parentLocation.type === typeFilter)) {
  return locationMatchesFilters(location, locationHierarchy, statusFilter, typeFilter, searchQuery, true);
}
return locationMatchesFilters(location, locationHierarchy, statusFilter, typeFilter, searchQuery, false);
```

Meanwhile the auto-expand effect (~line 237) always calls the matcher with `isChild = false`, so it
*does* find descendant matches and adds the connecting ancestor to `expandedLocations`.

The two callers therefore disagree about the same node: the expander says "expand this, a descendant
matches", and the renderer says "this node doesn't match, drop it". The renderer wins, and the match
is unreachable.

## Reproduction

Three levels — Region → City → Building — where only the Building matches:

1. `Region` (status `known`), child `City` (status `known`), child `Building` (status `visited`)
2. Filter status to `visited`
3. `Region` renders (its descendant matches, via the `isChild === false` path)
4. `City` is dropped — `renderRows` asks with `isChild = true`, and `City`'s own status is `known`
5. `Building` never renders, because its parent row is gone

Expected: `Region › City › Building` visible, ancestors auto-expanded, `Building` revealed.

## Current Test Coverage

`LocationDirectory.test.tsx` contains a test that **pins this actual behaviour** rather than the
desired behaviour:

> `hierarchical layout › a search match nested two levels deep is unreachable — the connecting ancestor is filtered out of its own parent's render`

It carries an in-file comment explaining the root cause. That was a deliberate choice to avoid a
misleading green suite, but note the tension with this repo's testing philosophy ("tests must define
expected behavior"): **when this is fixed, that test must be inverted, not deleted.** It is a
documentation-of-defect test, not a specification.

## Suggested Fix

Let the `isChild` branch fall through to the descendant check instead of returning early. The flag's
legitimate purpose is only to exempt a child from the **type** filter (a Building under a City you
filtered to shouldn't vanish because "Building" isn't the selected type) — it was never meant to
suppress descendant matching:

```ts
if (matchesStatus && matchesSearch && (isChild || matchesType)) {
  return true;
}
const children = hierarchy[loc.id] || [];
return children.some(child =>
  locationMatchesFilters(child, hierarchy, status, type, search, isChild)
);
```

Verify with a 3-level fixture, and confirm the expander and the renderer now agree — the underlying
defect is that two callers of the same predicate disagreed about the same node.

## Affected Files

- `src/features/campaign-entities/locations/components/LocationDirectory.tsx:188-222` (the predicate)
- `src/features/campaign-entities/locations/components/LocationDirectory.tsx:285-294` (`renderRows`)
- `src/features/campaign-entities/locations/components/LocationDirectory.tsx:224-247` (auto-expand effect)
- `src/features/campaign-entities/locations/components/__tests__/LocationDirectory.test.tsx` (the pinning test to invert)
