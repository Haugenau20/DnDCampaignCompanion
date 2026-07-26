# Bug #1204 — Form components build attribution that their context immediately discards

## Title
`NPCForm`, `NPCEditForm`, `QuestCreateForm` and `RumorCard` construct attribution metadata that the
context overwrites on every write — dead code that reads as authoritative

## Status
🔍 DISCOVERED

## Category
ARCHITECTURE

## Discovered In
Not surfaced by a test. Found during the attribution-consolidation Wave A audit
(`docs/architecture/migration/attribution-consolidation-wave-a.md`) when sweeping for write sites
outside the context layer.

## Affected Files
- `src/features/campaign-entities/npcs/components/NPCForm.tsx` (lines 184-191)
- `src/features/campaign-entities/npcs/components/NPCEditForm.tsx` (lines 79-83)
- `src/features/campaign-entities/quests/components/QuestCreateForm.tsx` (lines 142-144)
- `src/features/campaign-entities/rumors/components/RumorCard.tsx` (lines 88-90)

## Description

Four form components build attribution into the payloads they hand to their context. In every case
the context spreads its own attribution **after** the incoming payload, so the component's values are
discarded before they reach Firestore:

| Component | Builds | Consumed by | Outcome |
|---|---|---|---|
| `NPCForm` | full creation attribution (no `characterId`) | `NPCContext.addNPC` → `{ ...npcData, id, ...creationAttribution }` | discarded |
| `NPCEditForm` | modification attribution | `NPCContext.updateNPC` → `{ ...npc, ...modificationAttribution }` | discarded |
| `QuestCreateForm` | `createdBy`, `createdByUsername`, `dateAdded` | `QuestContext.addQuest` → `{ id, ...questData, ...buildCreationAttribution(...) }` | discarded |
| `RumorCard` | empty-string placeholders | `RumorContext.updateRumorNote` → `{ ...note, ...creationAttribution }` | discarded |

`RumorCard` is the honest one — it writes `''` with explicit `// Will be set in context` comments, so
it is only satisfying required type fields, not pretending to compute anything. The other three
silently compute real values (`getUserName(activeGroupUserProfile)`, `new Date().toISOString()`, and
in `NPCEditForm`'s case even `modifiedByCharacterId`) that are then thrown away.

### Impact
- **No user-visible bug today.** Stored attribution is correct, because the contexts win.
- Misleads maintainers into believing the form controls attribution, and invites "fixes" in the wrong
  layer — during Wave A this cost real time to rule out.
- Latent: any reordering of the spreads in a context — or a new consumer that does not re-apply
  attribution — silently starts persisting the form's values. `NPCForm` and `QuestCreateForm` omit
  `createdByCharacterId`, so that day would ship a regression.
- The same pattern with **no** downstream overwrite is bug [#1203](./1203-saga-edit-page-attribution-wrong-source-and-overwrites-creator.md),
  where it does cause real data loss. This is the same shape, currently masked.

## Reproduction
1. Add a `console.log` of the payload inside any of the four components, and another inside the
   corresponding context method after the attribution spread.
2. Create or edit the entity.
3. The attribution fields differ between the two logs; the context's values are what Firestore
   receives.

## Expected vs Actual

**Expected:** Form components collect user input and hand over domain data. Attribution is applied
once, by the write layer.

**Actual:** Four components compute attribution that is unconditionally discarded.

## Recommended Fix

Delete the attribution fields from all four components' payloads, keeping only domain fields. The
contexts already supply correct attribution on every path.

This will require a type adjustment: several of these payloads are annotated with types that require
the attribution fields (for example `Omit<Quest, 'id'>`), which is *why* the fields were added in the
first place. The clean fix is a domain-data type that excludes system metadata — the `DomainData<T>` /
`Entity<T>` split sketched in `docs/testing/post-test-coverage-roadmap.md` — so the compiler stops
demanding attribution from the presentation layer. Do not work around it by keeping the dead fields.

Deliberately not fixed in Wave A, whose scope was limited to centralizing the mapping function
without changing call signatures or stored values. Each of these needs a test asserting what the
component sends to its context — none currently has one, which is why the dead fields went unnoticed.

## Related
- [#1200](./1200-chapter-form-dead-attribution-overwritten-by-storycontext.md) — `ChapterForm`, the
  first instance of this pattern found.
- [#1203](./1203-saga-edit-page-attribution-wrong-source-and-overwrites-creator.md) — the same
  pattern where nothing overwrites the values, so it corrupts data.
