# Bug #1419 — An NPC deep link silently hid every other location group

## Status
✅ FIXED — 2026-08-01, commit `5b31a82`.

## Category
UX

## Discovered In
Auditing why the four entity directories' filter rows had diverged.

## Affected File
`src/features/campaign-entities/npcs/components/NPCDirectory.tsx`

## Description

`NPCDirectory` groups NPCs by location. It *also* carried a `locationFilter` with **no picker** — the
only way it was ever set was the `?highlight=` deep-link effect:

```tsx
const highlightedNpc = npcs.find(npc => npc.id === highlightId);
if (highlightedNpc) {
  if (highlightedNpc.location) {
    setLocationFilter(highlightedNpc.location);
  }
  ...
}
```

So following a link to an NPC from a quest, rumor or location page did not merely highlight them — it
filtered the entire roster down to their location. Every other group vanished. The only explanation
offered was a small `Clear location: Ironhold` ghost button in the filter row, easily missed and
easily misread as a stray control rather than the reason two-thirds of the page is absent.

The user's mental model after clicking a link is "show me this NPC", not "hide everyone else".

`RumorDirectory` groups by location identically and reaches the opposite conclusion explicitly, in a
comment that predates this fix: *"Location is deliberately not part of this filter set — see the
grouping rationale below."* The two directories disagreed about the same design question.

## Reproduction

1. Open a quest with a related NPC, or a location with connected NPCs.
2. Click through to the NPC.
3. The NPCs page shows only that NPC's location group.

## Expected vs Actual

**Expected**: the target is highlighted, expanded and scrolled to; the roster is otherwise intact.
**Actual**: the roster is filtered to one location, explained only by a small ghost button.

## Fix

The `locationFilter` state, its filter clause and the "Clear location" button are gone. The deep-link
effect now highlights, expands and scrolls — which was always the whole job. Because the roster
groups by location, the target's group is visually separated anyway, so the filter added nothing the
grouping did not already provide.

Tests rewritten under `describe('deep link by ?highlight=')` to pin the new contract: every other
location group stays visible, the target is still expanded, and no location-clearing control exists.

## Notes

This is a **deliberate behaviour change**, not a defect fixed in place — the old behaviour was
intentional, just wrong. Recorded here because the reasoning matters if anyone is tempted to
reintroduce a location filter on this page: the grouping *is* the filter, and `RumorDirectory` had
already documented why.
