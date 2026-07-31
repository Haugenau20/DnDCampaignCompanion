# Bug #1415: Quests Search Matches Raw NPC Ids, Not NPC Names

**Status**: 🔍 DISCOVERED
**Category**: UI
**Priority**: Low
**Component**: `src/pages/quests/QuestsPage.tsx`
**Discovered In**: Session 2026-07-31 — while rewriting `QuestsPage.test.tsx` for the roster redesign

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
