# Bug #303 — Selecting a renamed location as a parent produces a dangling `parentId`

## Title
`LocationFormSections` re-derives `parentId` by slugifying the parent's *current display name*, but
ids are fixed at creation and names are editable — so selecting a renamed location stores an id that
matches no location

## Status
🔍 DISCOVERED — **proven by a failing test, not by a code reading**

## Category
DATA

## Discovered In
`src/features/campaign-entities/locations/components/__tests__/LocationFormSections.test.tsx` —
`BasicInfoSection - parentId resolution via combobox selection`. The test is **deliberately left
failing** as a bug marker, per this project's methodology. It is the only red in that suite; do not
"fix" it by editing the assertion.

## Affected Files
- `src/features/campaign-entities/locations/components/LocationFormSections.tsx` (~line 106)
- `src/features/campaign-entities/locations/components/LocationCombobox.tsx` (the constraint, not the defect)

## Description

`LocationCombobox` deals exclusively in location **names** — it builds its option list as
`Array.from(new Set(locations.map(loc => loc.name)))` and calls `onChange` with a name string.
`LocationFormSections` then converts that name back into an id by re-running the slug function:

```tsx
<LocationCombobox
  label="Parent Location ID"
  value={formData.parentId || ''}
  onChange={(value) => handleInputChange('parentId', generateLocationId(value))}
  strictMode={true}
/>
```

This is only correct while `id === slugify(name)`. That invariant does **not** hold, because:

- A location's id is derived from its name **once, at creation** (`LocationContext.createLocation`).
- `updateLocation` writes to `location.id` and never re-keys, so **renaming a location leaves its id
  unchanged.**

So a location created as "Stonebridge" keeps the id `stonebridge` forever. Rename it to "New
Stonebridge Docks" and the combobox offers the new name; slugifying that yields
`new-stonebridge-docks`, which is **not any location's id**. The child stores a `parentId` pointing
at nothing.

### Impact

- `getChildLocations` / `getParentLocation` (`LocationContext:61`, `:68`) match on `parentId`
  equality, so the hierarchy link is silently lost — the child appears parentless and the parent
  appears childless.
- **`deleteLocation`'s cascade uses the same matching** (`getAllChildrenIds`, `:180`). A child whose
  `parentId` dangles is not seen as a descendant, so deleting the parent leaves it orphaned rather
  than removing it. #010 made that cascade correct with respect to *ordering*; this defect means it
  can be given the wrong *set*.
- Fails silently. `strictMode` validates that the typed text matches an existing location **name**,
  which it does — the name is real. Nothing validates that the derived id resolves.

### Relationship to the ID-collision cluster

This is the same broken assumption as #002/#004/#009/#012 (`id === slugify(name)`) reached from the
other direction: the cluster is about two names producing **one id**, this is about one location
having an id that its **current name no longer produces**. The collision fix makes it strictly worse
in principle — a location that gets a `-2` suffix has an id no name ever slugifies to — though it
does not create the defect, which is already live today for any renamed location.

## Reproduction

1. Create a location named "Stonebridge" (id becomes `stonebridge`).
2. Rename it to "New Stonebridge Docks". The id stays `stonebridge`.
3. Create or edit another location and select "New Stonebridge Docks" as its parent.
4. Inspect the stored child: `parentId` is `new-stonebridge-docks`.
5. The parent/child relationship does not render, because no location has that id.

The failing test performs steps 1–4 against the real `LocationCombobox`.

## Expected vs Actual

**Expected:** selecting a location as a parent stores that location's actual `id`.

**Actual:** it stores `slugify(currentName)`, which equals the real id only for locations that have
never been renamed.

## Recommended Fix — needs a decision

Two options, and the cheap one is probably right:

1. **Resolve the name to a real id locally in `LocationFormSections`** — call `useLocations()`, find
   the location whose `name` matches the selected value, and store its `id`, falling back to the
   slug only if no match is found. **No contract change**, contained to one file, and `strictMode`
   already guarantees the value is an existing name in the normal path. Ambiguity if two locations
   share a name; taking the first match is still strictly better than today's guaranteed miss.
2. **Change `LocationCombobox` to emit ids rather than names.** Architecturally cleaner, but the
   component is also consumed by `QuestFormSections`, so it is a wider contract change and touches a
   second feature.

Option 1 is recommended. Do **not** fix this by editing the marker test.

## Related
- [#002](./002-npc-id-generation-collision.md) / [#004](./004-quest-id-generation-collision.md) /
  [#009](./009-location-id-generation-collision.md) / [#012](./012-rumor-id-generation-collision.md)
  — the same `id === slugify(name)` assumption, failing in the other direction.
- [#010](./010-location-deletion-order-logic.md) — the cascade delete this defect can feed a wrong
  set of descendants.
