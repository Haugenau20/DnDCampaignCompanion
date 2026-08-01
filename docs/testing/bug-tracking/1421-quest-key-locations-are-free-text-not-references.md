# Bug #1421 — `Quest.keyLocations` stores free text, not references to Location records

## Status
🔍 DISCOVERED — 2026-08-01. Scoped out of the `locationId` work deliberately.

## Category
Architecture / data model

## Affected Files
- `src/features/campaign-entities/quests/types.ts` (`QuestLocation`)
- `src/features/campaign-entities/quests/components/QuestDirectory.tsx` (`locationExists`)
- `src/features/campaign-entities/quests/components/QuestFormSections.tsx` (the editor)
- `src/features/campaign-entities/quests/context/QuestContext.tsx` (`getQuestsByLocation`)

## Description

`QuestLocation` is `{ name: string; description: string }` — a free-text pair with **no reference to
a Location record at all**. It is the last surviving instance of the ambiguity that
[#1412](./1412-npc-directory-groups-by-location-slug-not-name.md) and #1418 addressed everywhere
else.

The consequences are visible in code that already has to work around it:

- **`QuestDirectory` does name-matching to decide whether a key location is clickable.**
  `locationExists(name)` scans the whole locations collection for a case-insensitive name match, and
  renders a navigable button or inert text accordingly. So whether a key location is a link depends
  on string equality with a name the user typed, and **renaming the Location silently breaks it** —
  the same `id === slugify(name)` family of assumption catalogued in
  [#303](./303-location-parent-id-rederived-from-editable-name.md) and
  [#009](./009-location-id-generation-collision.md).
- **`getQuestsByLocation` has a separate clause just for it**, comparing `keyLocation.name` against
  the target Location's name (corrected in #1418 — it previously compared against an id).
- **Deep links go out by name**: `/locations?highlight=<name>`, which works only because
  `LocationDirectory`'s highlight effect accepts a name as well as an id.

## Why it was scoped out

The `locationId` contract (commit `d6d9847`) fixed the singular `quest.location` field. `keyLocations`
is a different shape — an **array of objects with their own `description`**, edited inline in
`QuestFormSections` with plain text inputs. Converting it means changing the editing UX (a repeatable
picker, not a text field), deciding what happens to the per-entry `description` when an entry becomes
a reference, and handling arrays of mixed migrated/un-migrated entries. That is a feature-sized
change, not a field addition.

## Recommended Fix

Extend `QuestLocation` to `{ locationId?: string; name: string; description: string }` and apply the
same contract already documented on `NPC.location`: `locationId` authoritative when it resolves,
`name` the free-text fallback, no migration needed. Then:

- `QuestDirectory.locationExists` becomes an id lookup, with the name match kept as the legacy
  fallback — `referencesLocation` in `locations/utils/location-display.ts` already implements exactly
  that predicate and should be reused rather than re-derived.
- The `keyLocations` editor in `QuestFormSections` gains a `LocationCombobox` per entry, wired the
  way the other four forms now are (`onSelectLocation` → `locationId: loc?.id ?? ''`).
- `getQuestsByLocation`'s special-case clause collapses into the shared predicate.

Doing this closes the location-reference work completely — after it, no entity refers to a place by
free text alone unless the user genuinely meant free text.
