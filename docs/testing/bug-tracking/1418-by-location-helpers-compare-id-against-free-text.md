# Bug #1418 — `getNPCsByLocation` / `getQuestsByLocation` compare an id against a field that may hold a name

## Status
✅ FIXED — 2026-08-01, commit `d6d9847`.

## Category
Data integrity (latent — see Notes)

## Discovered In
Implementing the `location`/`locationId` contract (step 1 of the proper fix for
[#1412](./1412-npc-directory-groups-by-location-slug-not-name.md)). These are the same defect one
layer below the display bug #1412 recorded.

## Affected Files
- `src/features/campaign-entities/npcs/context/NPCContext.tsx`
- `src/features/campaign-entities/quests/context/QuestContext.tsx`

## Description

Both helpers took a location **id** and compared it against the entity's `location` field:

```tsx
// NPCContext
npcs.filter(npc => npc.location?.toLowerCase() === location.toLowerCase());

// QuestContext
quests.filter(quest =>
  quest.location === locationId ||
  quest.keyLocations?.some(location => location.name === locationId)
);
```

But `location` does not consistently hold an id. Sample-data generators wrote the **id**
(`mines-of-moria`); the entity forms wrote the **display name** ("Mines of Moria"). So both helpers
matched generator-created documents and silently missed every form-created one — roughly half the
population, with no error.

**A second, separate defect in the Quest helper**: its `keyLocations` clause compares keyLocation
**names** against a parameter named `locationId`. `keyLocations` is free text describing places
mentioned in a quest write-up, not a reference to a Location record, so comparing it to an id could
only ever match by coincidence. The parameter name made the mistake hard to see.

## Why the obvious fix was not available

Resolving a name back to an id needs the locations array, and `NPCContext` cannot get it: `App.tsx`
nests `NPCProvider` **outside** `LocationProvider` (lines 44-45), so `useLocations()` throws there.
Reordering the providers to suit two helpers with no callers was not warranted.

## Fix

Both helpers now take the **`Location` record** rather than a bare id, and share one predicate,
`referencesLocation` in `locations/utils/location-display.ts`:

- `reference.locationId` set → match against `location.id` only. A canonical reference either names
  that Location or it does not.
- otherwise → case-insensitive match of the legacy `reference.location` text against **either**
  `location.id` or `location.name`, covering both legacy shapes.

Passing the whole record is what makes this work without the locations array — the caller already
knows which Location it is asking about, so both of that Location's identifying strings are in hand.

`getQuestsByLocation`'s `keyLocations` clause now reads `keyLocation.name === location.name`,
case-insensitively, which is what it always meant.

## Notes

**Latent, not live.** Neither helper has a caller outside its own context and tests — verified by
grep across `src/`. Filed and fixed anyway because the API was wrong and would have been wrong
silently the first time anyone used it.

This was also **caught in review, not by the agent that wrote it**: the first implementation matched
legacy documents storing an id but not those storing a name, i.e. it fixed the generator-shaped half
of the problem and left the form-shaped half. See `location-display.ts`'s doc comment on
`referencesLocation`, which records why the signature takes a `Location`.
