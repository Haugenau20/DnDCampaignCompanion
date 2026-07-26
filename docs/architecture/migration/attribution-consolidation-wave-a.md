# Attribution Consolidation — Wave A (single mapping function)

*Working spec. Follow-up to `attribution-consolidation-findings.md`. Branch: `refactor/attribution-consolidation`.*

## Goal

`src/shared/attribution` becomes the **only** place in the codebase that constructs attribution
field values. Every write site calls it instead of hand-rolling the field mapping.

## Non-goals (explicitly out of scope for Wave A)

- **Do not change any write path.** Contexts keep calling `useFirebaseData` / `documentService`
  exactly as they do today. Collapsing to a single write path is Wave B, a separate decision.
- **Do not touch the read/display side**: `src/utils/attribution-utils.ts`,
  `src/components/shared/AttributionInfo.tsx`. Those format attribution for display; they are
  a different concern and are already centralized.
- **Do not fix `ChapterForm.tsx:118-119`** (it builds attribution from `user.displayName` instead
  of the group username). That changes stored values and needs its own tests — it gets filed as
  a bug, not fixed here.
- **Do not refactor `user-utils.ts`.** The helper depends on it and it stays as-is.

## The rule

After Wave A, no file outside `src/shared/attribution/` may build an object literal containing
`createdBy`, `createdByUsername`, `createdByCharacterId`, `createdByCharacterName`, `dateAdded`,
`modifiedBy`, `modifiedByUsername`, `modifiedByCharacterId`, `modifiedByCharacterName`, or
`dateModified` **for the purpose of writing it to a document**. Test fixtures and mock data are
exempt — they are data, not mapping logic.

## API

```ts
import { buildCreationAttribution, buildModificationAttribution } from "shared/attribution";

// Creation: returns created* AND modified* fields + dateAdded + dateModified (same timestamp)
const attribution = buildCreationAttribution({ uid: user.uid, activeGroupUserProfile });

// Modification: returns modified* fields + dateModified only
const attribution = buildModificationAttribution({ uid: user.uid, activeGroupUserProfile });
```

Use the bare `shared/attribution` form, matching the existing `features/user-management` import
style in these files.

> **Gotcha, already fixed — do not re-diagnose.** `tsconfig.json` sets `baseUrl: src`, so bare
> imports type-check, but Jest resolves them through an explicit allow-list in
> `jest.config.ts:13`. `shared` was missing from that list (it is a new top-level directory added
> by the feature-first migration, and every other top-level `src/` dir was already there), so bare
> `shared/attribution` imports type-checked but failed at test time with
> `Cannot find module 'shared/attribution'`. `shared` has been added to the list. If you still see
> that error, your working tree is stale — do **not** work around it by switching to `@/`.

> **Never use the `@/` alias in code that ships.** `react-scripts`' webpack config honours
> tsconfig's `baseUrl` but **ignores `paths`**. So `@/...` imports resolve under `tsc --noEmit`
> and under Jest (whose `moduleNameMapper` has a `@/` catch-all), and then fail the production
> build with `Module not found: Can't resolve '@/utils/user-utils'`. The helper itself shipped
> with two such imports and they went unnoticed for weeks, because until Wave A wired it up
> nothing imported the module, so webpack never had to resolve it. Fixed to bare `types/common`
> and `utils/user-utils`.
>
> **Consequence for verification: `tsc --noEmit` + Jest green is NOT sufficient.** Neither
> exercises webpack's resolver. Run `npm run build` before proposing a merge — that is what CI
> and the deploy actually run. The `@/` form remains fine in `src/test-utils/` and `__tests__/`,
> which are never bundled.

`AttributionSource.activeGroupUserProfile` accepts any object with `username`,
`activeCharacterId`, and `characters[]` — which is true both of the in-memory React
`activeGroupUserProfile` and of the raw Firestore `groups/{gid}/users/{uid}` document.

## Site inventory

| Site | Attribution field refs | Notes |
|---|---|---|
| `src/services/firebase/data/DocumentService.ts` | 10 | `getCreationAttribution` / `getModificationAttribution` |
| `src/features/campaign-entities/npcs/context/NPCContext.tsx` | 25 | 1 creation, 3 modification blocks |
| `src/features/campaign-entities/locations/context/LocationContext.tsx` | 14 | |
| `src/features/campaign-entities/quests/context/QuestContext.tsx` | 28 | |
| `src/features/storytelling/chapters/context/StoryContext.tsx` | 16 | 3 blocks |
| `src/features/campaign-entities/rumors/context/RumorContext.tsx` | 56 | largest; includes combine + convert-to-quest paths |
| `src/context/NoteContext.tsx` | 13 | `createNote` (local object) + `saveNote` |

## Known semantic changes — expected, do not paper over

These are intended consequences of standardizing. If a test fails **because of one of these**,
that is a finding to report, not a test to edit.

1. **`createdByCharacterId` / `modifiedByCharacterId` appear where they were previously dropped**
   (Quest, Location, Rumor, Story, Note). Purely additive; both fields are optional on
   `ContentAttribution`, so this is type-safe.
2. **`characterName` changes from `""` to `null` when there is no active character.**
   `NoteContext` writes `characterName || ""` and `StoryContext` writes `... || ''`; the helper
   returns `null`. If a test asserts `""`, **halt and report** — do not change the assertion and
   do not add a `|| ""` around the helper result to force it.
3. **`DocumentService.createDocument` will now also write `modified*` fields on create.** Today
   `getCreationAttribution` returns only `created*`. This change is approved: it matches the
   helper and the five other write sites.

## Scope note: the component/page layer is NOT covered by Wave A

The site inventory above was built by grepping context files. A sweep after the refactor found
attribution field-mapping in the presentation layer too. None of it was changed by Wave A, and all of
it is now filed:

| Site | Filed as | Why not fixed here |
|---|---|---|
| `ChapterForm.tsx` | [#1200](../../testing/bug-tracking/1200-chapter-form-dead-attribution-overwritten-by-storycontext.md) | dead — `StoryContext` overwrites it |
| `NPCForm`, `NPCEditForm`, `QuestCreateForm`, `RumorCard` | [#1204](../../testing/bug-tracking/1204-component-layer-hand-rolled-attribution-discarded.md) | dead — contexts overwrite them |
| `SagaEditPage.tsx` + `useSagaData.saveSaga` | [#1203](../../testing/bug-tracking/1203-saga-edit-page-attribution-wrong-source-and-overwrites-creator.md) | **live and harmful** — nothing overwrites it; edits destroy the original creator |

All three fixes change either stored values or call signatures, which Wave A explicitly does not do.
They need failing tests first.

## Additional data-shape change observed during the refactor

`RumorContext` attaches attribution to individual **rumor notes**. Those note objects previously
received a creation-only subset (`createdBy`, `createdByUsername`, `createdByCharacterName`,
`dateAdded`); via `buildCreationAttribution` they now also receive the `modified*` fields and
`dateModified`. This is additive and harmless — `shouldShowModification` in `attribution-utils.ts`
returns `false` when the modifier matches the creator and the timestamps are equal, so note display
is unchanged — but it does mean rumor-note documents carry five more fields than before. Accepted
rather than special-cased: adding a creation-only variant to the helper would reintroduce a second
mapping shape, which is the thing this effort exists to remove.

## Constraints

- **Preserve `DocumentService`'s existing guard clauses and error messages** — `'Not authenticated'`,
  `'No active group selected'`, `'User profile not found'`. The helper does not throw. Replace only
  the field-mapping block, never the surrounding control flow.
- **Preserve every existing call signature.** No context's public API changes in Wave A.
- **Keep `Partial<ContentAttribution>` return types** where they exist; the helper's return value
  is assignable to them.

## Testing protocol (non-negotiable)

This project uses behavioral testing: **failing tests are bug markers, and a test is never edited
to make it pass.** See `docs/testing/methodology/testing-lessons-learned.md`.

- **Baseline, measured on `main` at `c054d68`:** 53 failed / 3 skipped / 3886 passed of 3942, in
  10 failed suites. Your change must not increase any failure count.
- Verify per file: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="<pattern>"`
- **Halt-on-failure:** if a test that passed before your change now fails, revert the production
  change with `git checkout -- <file>` and report what happened. Do not modify the test, do not
  weaken an assertion, do not delete a case, do not add `|| ""`-style shims to make an assertion
  match. Reporting a blocked task is a success; a green suite bought by editing a test is a failure.
- `npx tsc --noEmit` must be clean. TypeScript errors block deploy on this repo.

## Reference

- Findings that motivated this: `docs/architecture/migration/attribution-consolidation-findings.md`
- Helper + its unit tests: `src/shared/attribution/`
- Methodology: `docs/testing/methodology/testing-lessons-learned.md`
