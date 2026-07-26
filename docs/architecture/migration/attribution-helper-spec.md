# Spec: Centralized Attribution Helper (salvage from `form-context-separation`)

> ⚠️ **SUPERSEDED (2026-07-05).** The problem statement below ("this is a bug fix";
> "fixes the highest-priority user-attribution bug") did **not** survive verification: the
> attribution bug-marker tests already pass, nothing consumes the "missing" `characterId`, and
> the real issue is that attribution is written **three different ways** across the codebase.
> Read **`attribution-consolidation-findings.md`** for the corrected analysis and the current
> recommendation. The Wave-1 helper (`src/shared/attribution`) still exists and is still useful —
> but its role is now "the single mapping function," not "wire it into the contexts." Do **not**
> execute the "call sites to update" plan below as written.

*Status: SUPERSEDED — see attribution-consolidation-findings.md. Wave-1 helper built & merged.*
*Author context: distilled from the abandoned `feature/form-context-separation` branch and verified against the current codebase on 2026-07-05.*

This spec turns the one salvageable idea from the abandoned `feature/form-context-separation`
branch into a concrete, low-risk task, scoped to fit the feature-first migration already in
flight. It implements the long-standing backlog item in
`docs/architecture/migration/FormContextStandard.txt`.

---

## Why (the value case — this is a bug fix, not just tidying)

Every context builds its attribution metadata by hand, inline, in each create/update path.
That block is copy-pasted **~15+ times across 6 contexts**, with **70 call sites** of
`getUserName(activeGroupUserProfile)` / `getActiveCharacterName(...)`. The copies have
**drifted out of sync**:

| Context | writes `createdByCharacterId` / `modifiedByCharacterId`? |
|---|---|
| NPCContext (migrated) | ✅ yes |
| LocationContext (migrated) | ✅ yes |
| **QuestContext (migrated)** | ❌ **no** — only username + character *name* |
| **RumorContext (not yet migrated)** | ❌ **no** — only username + character *name* |
| NoteContext (not yet migrated) | uses a divergent `\|\| ""` fallback style |

**Consequence (live in production):** quests and rumors are persisted **without the character
ID**. Any logic keyed on `createdByCharacterId` (e.g. "entities created by my character",
surviving a character rename) silently fails for those entity types. This is the highest-priority
systematic user-attribution issue.

Centralizing the logic in one helper:
1. **Fixes the bug** — quests/rumors get the full, correct field set.
2. **Removes the DRY violation** — one source of truth instead of 15 copies, so the drift
   cannot recur.
3. **Closes the `FormContextStandard.txt` backlog item** and matches the form/context boundary
   the migration is enforcing anyway (forms submit clean domain data; contexts own all system
   metadata).

Passes YAGNI: the duplication and divergence already exist and have already produced a defect.
This is not speculative.

---

## What NOT to do (do not lift the old branch's code)

Do **not** cherry-pick or merge anything from `feature/form-context-separation`. Its
`SystemMetadataService` re-invented a `SystemMetadata` type, baked in legacy `dateAdded /
dateModified / updatedAt` compatibility shims, used `any` params, and shipped a weak
`Date.now()+random` ID generator. It also never compiled (213 TS errors) and fights the
behavioral test suite on main. **Re-author the concept fresh** using what already exists on
this branch.

Also do not salvage: the rewritten contexts/forms/hooks, the hybrid legacy-API shims, or
`chapterGenerator.ts.backup`.

---

## The canonical type already exists — reuse it

`src/types/common.ts` already defines the full attribution shape. Build the helper to produce
**this** type. Do **not** introduce a new `SystemMetadata` type.

```ts
export interface ContentAttribution {
  createdBy: string;
  createdByUsername: string;
  createdByCharacterId?: string | null;
  createdByCharacterName?: string | null;
  dateAdded: string;
  modifiedBy?: string;
  modifiedByUsername?: string;
  modifiedByCharacterId?: string | null;
  modifiedByCharacterName?: string | null;
  dateModified?: string;
}
```

---

## Design (KISS — plain functions, not a class/service)

Two pure functions. No class, no singleton — this is stateless mapping of an
`activeGroupUserProfile` (+ `user.uid`) into a `ContentAttribution`.

```ts
// Proposed location: src/shared/attribution/attribution.ts
// (Attribution is used by campaign-entities AND storytelling AND collaboration/notes,
//  so it is cross-domain and belongs in shared/, not inside one feature. This will be the
//  first module under src/shared/ — see "Placement" below.)

import type { ContentAttribution } from "@/types/common";
import { getUserName, getActiveCharacterName } from "@/utils/user-utils";

/** Minimal shape the helper needs. Type against the real profile type, not `any`. */
type AttributionSource = {
  uid: string;
  activeGroupUserProfile: ActiveGroupUserProfile | null | undefined;
};

/**
 * Full attribution for entity CREATION.
 * Sets both created* and modified* fields to the same actor/time.
 */
export function buildCreationAttribution(src: AttributionSource): ContentAttribution {
  const now = new Date().toISOString();
  const username = getUserName(src.activeGroupUserProfile);
  const characterId = src.activeGroupUserProfile?.activeCharacterId ?? null;
  const characterName = getActiveCharacterName(src.activeGroupUserProfile);

  return {
    createdBy: src.uid,
    createdByUsername: username,
    createdByCharacterId: characterId,
    createdByCharacterName: characterName,
    dateAdded: now,
    modifiedBy: src.uid,
    modifiedByUsername: username,
    modifiedByCharacterId: characterId,
    modifiedByCharacterName: characterName,
    dateModified: now,
  };
}

/**
 * Attribution delta for entity UPDATES. Only the modified* fields + dateModified.
 * Spread over the existing entity so created* fields are preserved.
 */
export function buildModificationAttribution(
  src: AttributionSource,
): Pick<
  ContentAttribution,
  | "modifiedBy"
  | "modifiedByUsername"
  | "modifiedByCharacterId"
  | "modifiedByCharacterName"
  | "dateModified"
> {
  const now = new Date().toISOString();
  return {
    modifiedBy: src.uid,
    modifiedByUsername: getUserName(src.activeGroupUserProfile),
    modifiedByCharacterId: src.activeGroupUserProfile?.activeCharacterId ?? null,
    modifiedByCharacterName: getActiveCharacterName(src.activeGroupUserProfile),
    dateModified: now,
  };
}
```

Notes:
- **No ID generation here.** ID strategy differs per entity (`generateNPCId(name)` etc.) and
  stays in each context. Keep this helper single-responsibility: attribution only.
- **No legacy shim fields.** `ContentAttribution` is already the clean shape; don't add
  `updatedAt`/duplicate fields.
- Use the real profile type for `activeGroupUserProfile` (find the existing type used by
  `useUser()` / the group context), not `any`.

### Placement

`src/shared/` does not exist yet. Two options:
- **(Recommended)** Create `src/shared/attribution/` with `attribution.ts` + `index.ts` barrel.
  This bootstraps the `shared/` layer the target architecture calls for, and is honest about the
  fact that storytelling and notes also consume attribution.
- If you'd rather not open `shared/` mid–campaign-entities migration, place it at
  `src/features/campaign-entities/shared/attribution.ts` temporarily and move it to `src/shared/`
  when the collaboration/storytelling domains need it. (Slightly violates "features don't import
  across features" once notes uses it — hence shared/ is preferred.)

---

## Call sites to update

Replace the inline attribution literals with helper calls. Preserve each context's existing ID
generation and array-initialization logic — only the attribution fields change.

Migrated (on this branch):
- `src/features/campaign-entities/npcs/context/NPCContext.tsx` — create + update paths
- `src/features/campaign-entities/quests/context/QuestContext.tsx` — **fixes the missing
  characterId bug**
- `src/features/campaign-entities/locations/context/LocationContext.tsx`

Not yet migrated (update in place now, or as each domain migrates — see sequencing):
- `src/context/RumorContext.tsx` — **fixes the missing characterId bug**
- `src/context/NoteContext.tsx` — normalizes the `|| ""` fallback divergence
- `src/features/storytelling/chapters/context/StoryContext.tsx` and `sagas` — if/where they
  write attribution

Pattern per create path:
```ts
const attribution = buildCreationAttribution({ uid: user.uid, activeGroupUserProfile });
const newQuest: Quest = { id, ...questData, ...attribution, /* arrays… */ };
```
Pattern per update path:
```ts
const patch = buildModificationAttribution({ uid: user.uid, activeGroupUserProfile });
await documentService.update(id, { ...changes, ...patch });
```

---

## Sequencing (fits the in-flight migration)

1. Land the helper + update the **three already-migrated** contexts (NPC/Quest/Location) as part
   of this branch. This is where the Quest bug lives.
2. Migrate **Rumors** into `src/features/campaign-entities/rumors/` (the remaining sub-feature of
   this domain) and have its new context use the helper from day one — fixing the Rumor bug in the
   same move.
3. Notes/Story adopt the helper when the collaboration/storytelling domains are next touched.

---

## Testing (behavioral methodology stays in force)

- **Do not modify tests to make them pass.** Failing tests are bug markers.
- Add focused unit tests for `buildCreationAttribution` / `buildModificationAttribution`
  (`src/shared/attribution/__tests__/attribution.test.ts`): correct field mapping, null
  character handling, create-sets-both vs update-sets-only-modified.
- After wiring Quest/Rumor to the helper, the character-ID attribution gap should close. If an
  existing `*.behavioral.test.tsx` asserts the buggy (missing-ID) behavior, treat that as a bug
  marker to update deliberately — not a silent edit.
- Watch the 85% coverage floor; the new module needs its own tests.

---

## Definition of done

- [ ] `buildCreationAttribution` / `buildModificationAttribution` exist in `src/shared/attribution/`
      with unit tests, producing `ContentAttribution`.
- [ ] NPC, Quest, Location contexts use the helper; no inline attribution literals remain in them.
- [ ] Quest (and Rumor, when migrated) persist `createdByCharacterId` / `modifiedByCharacterId`.
- [ ] No new `SystemMetadata` type; no legacy shim fields introduced.
- [ ] `tsc` clean; coverage ≥ 85%.

---

## Source archive

The original abandoned branch is reference-only. Before it is pruned, archive it:
```
git tag archive/form-context-separation origin/feature/form-context-separation
git push origin archive/form-context-separation
```
See `docs/testing/post-test-coverage-roadmap.md` (§ "Salvage from feature/form-context-separation")
for the original salvage decision this spec implements.
