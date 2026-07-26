# Bug #1203 — Saga saves attribute to `user.displayName` and overwrite the original creator on every edit

## Title
`SagaEditPage` is the only attribution source for saga documents, and it writes the wrong username, no character fields, and resets `createdBy`/`dateAdded` on every save

## Status
✅ FIXED

### Fix summary

Attribution is now built exclusively inside `useSagaData`, using `buildCreationAttribution` /
`buildModificationAttribution` from `shared/attribution`:

- `SagaEditPage.tsx` no longer constructs any `created*`/`modified*` field. Its payload is now typed
  `SagaContentInput` (`title`, `content`, `lastUpdated`, `version` only) — a new type exported from
  `sagas/types.ts` alongside `SagaData`, since `SagaData` itself still requires the full
  `ContentAttribution` shape for a persisted document.
- `useSagaData.saveSaga(sagaData: SagaContentInput)` now pulls `user` (`useAuth`) and
  `activeGroupUserProfile` (`useUser`), both from `features/user-management`. Because `setDocument`
  is an upsert, `saveSaga` itself decides create vs. modify by checking whether the hook's cached
  `saga` state already has a `createdBy`: if so, it spreads the existing saga first (preserving
  `created*`/`dateAdded`) and overlays only `buildModificationAttribution(...)`; if not, it writes
  `buildCreationAttribution(...)` in full. Also added a `Not authenticated` guard (needed once the
  hook itself touches `user.uid`), matching the existing `No active group/campaign selected` guards.
- `useSagaData.updateSaga` now always merges `buildModificationAttribution(...)` into the update and
  never references `created*` fields.
- Added `src/features/storytelling/sagas/hooks/__tests__/useSagaData.test.ts` coverage for creation
  attribution (incl. character fields), preservation of `createdBy`/`dateAdded` across a save by a
  different user, modification attribution on subsequent saves, and `updateSaga` never touching
  `created*`. Updated the pre-existing `SagaEditPage.test.tsx` assertion that hard-coded
  `createdBy: "user-1"` in the `saveSaga` payload — that assertion encoded exactly this bug's buggy
  contract, so it was replaced with an assertion that the page's payload carries no attribution
  fields at all.

**Follow-up — stale-cache reopening of the same bug.** `saveSaga` originally decided create-vs-modify
purely from the hook's cached `saga` state (`saga?.createdBy`). That cache can be `null` even when a
document already exists in Firestore — `fetchSaga` catches its own read errors and leaves `saga` at
`null` with `loading` false, and `SagaEditPage`'s effect then happily populates the form with
`SAGA_DEFAULT_OPENING` and lets the user submit. A transient read failure (or any moment before the
first fetch resolves) was therefore enough to make `saveSaga` treat an *existing* saga as brand new
and overwrite its `created*`/`dateAdded` — bug #1203 again, through a narrower door. Fixed by having
`saveSaga` fall back to a direct `getDocument('saga', 'sagaData')` confirmation read (mirroring
`fetchSaga`'s call exactly) whenever the cached `saga` doesn't already carry a `createdBy`, and
branching create-vs-modify on that confirmed result instead of the cache. When the cache already has
`createdBy`, no extra read happens — the happy path is unchanged.

## Category
DATA

## Discovered In
Not surfaced by a test. Found during the attribution-consolidation Wave A audit
(`docs/architecture/migration/attribution-consolidation-wave-a.md`) when sweeping for write sites
outside the context layer.

## Affected Files
- `src/pages/story/SagaEditPage.tsx` (lines 80-85)
- `src/features/storytelling/sagas/hooks/useSagaData.ts` (`saveSaga`, line 70)

## Description

Unlike every other content type, sagas get **no attribution from the write layer at all**.
`useSagaData.saveSaga` writes through the explicitly attribution-free path:

```ts
await setDocument('saga', 'sagaData', sagaData);   // useSagaData.ts:70
```

`DocumentService.setDocument` is documented as *"Create or update a document **without** attribution
metadata."* `saveSaga` adds none of its own, and neither does `updateSaga` (which calls the equally
attribution-free `updateDocument`). So whatever `SagaEditPage` puts in the payload is exactly what
lands in Firestore:

```tsx
// SagaEditPage.tsx:80-85
content: content.trim(),
lastUpdated: new Date().toISOString(),
version: '1.0',
createdBy: user?.uid || '',
createdByUsername: user?.displayName || '',
dateAdded: new Date().toISOString()
```

Three distinct defects:

**1. Wrong username source.** `user.displayName` is the Firebase Auth display name. Every other write
site in the codebase attributes content with the *group-scoped* username
(`getUserName(activeGroupUserProfile)`), because identity in this app is per-group. A user whose
`displayName` is unset gets `''`.

**2. No character attribution.** `createdByCharacterId` / `createdByCharacterName` are never written,
so `AttributionInfo` cannot show which character authored the saga — it falls back to the username,
or to nothing.

**3. Editing an existing saga destroys the original creation attribution.** This is the serious one.
The payload sets `createdBy` and `dateAdded` **unconditionally on every save**, and there is no
`modifiedBy` / `modifiedByUsername` / `dateModified` at all. So when a second user edits the saga:
- `createdBy` is overwritten with the *editor's* uid,
- `dateAdded` is reset to *now*,
- no modification record is written anywhere.

The saga permanently appears to have been "created" by whoever last touched it, at the time they
touched it. The original author and creation date are unrecoverable from the document.

### Impact
- Silent, cumulative data loss of authorship on a shared collaborative document — precisely the
  metadata the attribution system exists to preserve.
- Inconsistent with all six other content types, which correctly separate `created*` from `modified*`.
- Not covered by any test, which is why it survived the behavioral-testing push.

## Reproduction
1. User A creates a saga. `createdBy` = A, `dateAdded` = T1.
2. User B opens the same saga and saves any edit.
3. Inspect `groups/{gid}/campaigns/{cid}/saga/sagaData`: `createdBy` is now B and `dateAdded` is T2.
   There is no record that A ever authored it, and no `modifiedBy` field.

## Expected vs Actual

**Expected:** Creation attribution is written once, from the group profile, including character
fields; subsequent saves write only modification attribution and leave `created*` untouched.

**Actual:** Every save rewrites creation attribution from the Auth display name, with no character
fields and no modification attribution.

## Recommended Fix

Bring sagas onto the same footing as every other content type:

1. Remove the attribution fields from `SagaEditPage`'s payload entirely — a page should not own write
   metadata.
2. In `useSagaData`, build attribution with the shared helper: `saveSaga` uses
   `buildCreationAttribution` **only when the saga does not yet exist**, and `buildModificationAttribution`
   otherwise; `updateSaga` always uses `buildModificationAttribution`. Alternatively, route both
   through `DocumentService.createDocument` / `updateDocumentWithAttribution`, which is where Wave B
   of the consolidation is heading anyway — see
   `docs/architecture/migration/attribution-consolidation-findings.md`.
3. Add tests asserting that a second save preserves `createdBy` / `dateAdded` and writes `modifiedBy`
   / `dateModified`. **Write those tests first** — they should fail against today's code.

Deliberately not fixed in Wave A, whose scope was limited to centralizing the mapping function
without changing any write path or stored values. This fix changes both.

## Related
- [#1200](./1200-chapter-form-dead-attribution-overwritten-by-storycontext.md) — same wrong
  `user.displayName` source in `ChapterForm`, but there the values are harmlessly overwritten
  downstream. Here nothing overwrites them, so the bad values persist.
- [#1204](./1204-component-layer-hand-rolled-attribution-discarded.md) — the broader pattern of
  components owning attribution they should not.
