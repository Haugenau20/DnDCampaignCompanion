# Bug #1415: Quests Search Matches Raw NPC Ids, Not NPC Names

**Status**: ✅ FIXED (2026-07-31)
**Category**: UI
**Priority**: Low
**Component**: `src/pages/quests/QuestsPage.tsx`
**Discovered In**: Session 2026-07-31 — while rewriting `QuestsPage.test.tsx` for the roster redesign

## Resolution

The predicate now resolves each id to its NPC's display name before matching, keeping the raw-id
match as a fallback:

```ts
quest.relatedNPCIds?.some(id => {
  const npc = getNPCById(id);
  return npc?.name.toLowerCase().includes(search) || id.toLowerCase().includes(search);
})
```

Three decisions worth recording:

- **Reused `getNPCById` rather than building a `npcNameById` map.** The suggested fix below proposed
  memoising a map over `npcs`, but `getNPCById` is already destructured from `useNPCs()` and already
  performs exactly this resolution for the expanded row. Sharing it avoids a second lookup path that
  could drift from the display path. It also happens to be the only workable option against the
  existing test mock, which supplies `getNPCById` but no `npcs` array — a map built by mapping over
  `npcs` would have thrown. `getNPCById` was added to the `filteredQuests` `useMemo` deps.
- **The id fallback is kept**, `||`-ed and never replacing the name check, so deep links and
  copy-pasted ids still match.
- **Unresolvable ids stay searchable**, which matches the display path: the expanded row renders
  `"{npcId} (not found in NPC directory)"` rather than hiding a deleted NPC, so the id remains
  visible text and therefore ought to remain findable. Filter and display now agree — the original
  defect was in part that they didn't.

**Proven load-bearing, not vacuously green.** The fix was temporarily reverted and the inverted test
re-run: it failed with `Find the Dragon` not found when searching `"willow"`, then passed once the fix
was restored. The id-fallback and unresolvable-id tests pass either way, as expected — raw-id matching
existed before too.

Test coverage, in `describe('search filter')`:
- `matches search text against the related NPC's resolved name, not just its raw id` — the inverted
  pinning test, and #1415's regression guard
- `also matches a raw NPC id typed verbatim, as a fallback for deep links and copy-pasted ids`
- `still matches an unresolvable (deleted) NPC id via the raw-id fallback`

Verified: `src/pages/quests` 3 suites / 97 tests green, `tsc` clean.

## Description

The quest search box advertises itself as searching quests, and it correctly matches title,
description and objective text. Its fourth clause intends to let you find a quest by the NPC involved
— but it compares the search string against the **raw id strings** in `relatedNPCIds`, never against
the NPCs' resolved display names.

Since ids are opaque generated values, a user typing a person's name will never match through this
clause. It is effectively dead code that reads as a working feature.

**Pre-existing, not introduced by the roster redesign.** `git show a0e23fd:src/pages/quests/QuestsPage.tsx`
line 78 is byte-identical. The redesign carried it through unchanged.

## Root Cause

`QuestsPage.tsx:125-130`:

```ts
const matchesSearch =
  quest.title.toLowerCase().includes(search) ||
  quest.description.toLowerCase().includes(search) ||
  quest.objectives.some(obj => obj.description.toLowerCase().includes(search)) ||
  quest.relatedNPCIds?.some(npc => npc.toLowerCase().includes(search));
  //                        ^^^ this is an id, not a name
```

The parameter name `npc` invites the misreading — it holds an id string, not an NPC object. The same
page already resolves ids to names elsewhere for display (`QuestsPage.tsx:432-434` maps
`relatedNPCIds` through a lookup), so the resolution mechanism exists and is simply not used here.

Note the asymmetry that makes this a real usability defect rather than merely dead code: quests also
carry `importantNPCs`, which are free-text names and *are* searchable in practice via other clauses.
So searching a name finds *some* quests and misses others, with no visible rule — worse than the
clause not existing at all.

## Reproduction

1. Create an NPC named `Gundren Rockseeker`; note its generated id
2. Create a quest whose `relatedNPCIds` contains that id
3. Search the quests page for `Gundren`
4. The quest is not found — unless its title, description or an objective happens to contain the name

## Current Test Coverage

`QuestsPage.test.tsx` documents the present behaviour in:

> `matches search text against the raw relatedNPCIds values`

As with [#1414](./1414-location-directory-deep-nested-match-unreachable.md), that test pins **actual**
behaviour so the suite doesn't hide the defect. **When this is fixed, invert the test** — assert that
searching the NPC's *name* finds the quest — rather than deleting it.

## Suggested Fix

Resolve ids to names once, then match against the names. The NPC list is already available via
`useNPCs()`. Sketch:

```ts
const npcNameById = useMemo(
  () => new Map(npcs.map(n => [n.id, n.name.toLowerCase()])),
  [npcs]
);
// ...
quest.relatedNPCIds?.some(id => npcNameById.get(id)?.includes(search))
```

Two things to decide while fixing:

- Whether an id typed verbatim should still match. Probably yes as a fallback, so deep links and
  copy-pasted ids keep working — `||` the id check rather than replacing it.
- Whether an unresolvable id (deleted NPC) should be skipped silently or surfaced. The expanded row
  at `QuestsPage.tsx:432-434` already has to answer this for display; the two should agree.

## Affected Files

- `src/pages/quests/QuestsPage.tsx:125-130` (the search predicate)
- `src/pages/quests/QuestsPage.tsx:432-434` (existing id → name resolution for display)
- `src/pages/quests/__tests__/QuestsPage.test.tsx` (the pinning test to invert)
