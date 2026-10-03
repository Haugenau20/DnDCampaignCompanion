# T032 — performance remediation

**Status**: done, 2026-10-03. Drafted 2026-10-02; phases 1–2 shipped in #181,
the rest in the PR after it. This is now the record of how the last six
findings of [`performance-review-2026-08-30.md`](performance-review-2026-08-30.md)
were closed: `PERF-02`, `PERF-03`, `PERF-05`, `PERF-06`, `PERF-09`, `PERF-13`.

The direction (decided 2026-10-02): Firestore listeners (`onSnapshot`) per
collection; the SDK's latency compensation replaces the re-read after a
write; one small in-memory cache for group profiles; no new dependency.

## Decisions (maintainer, 2026-10-03)

1. The tests that pinned "a refresh follows a write" could be rewritten to the
   listener requirement (no re-read after a write).
2. A chapter-id migration was acceptable, with no redirect for old URLs. In the
   end none was needed; see phase 6.
3. Listener cost was explained and accepted: a listener pays one read per
   document when it opens, then one read per changed document per listening
   client. Listeners are scoped to one campaign, so a change fans out to that
   group's online members only, and the cost per player does not grow with the
   number of groups.

## What each phase did

### 1 — Entity collections are listeners (`PERF-06`, `PERF-08`, `PERF-13`)

`useFirebaseData`'s `subscribeTo` follows a listener on a collection path. The
five entity read hooks listen on the active campaign's collection, so a write
reaches the list with no read, and so does another player's edit.

### 2 — Group-profile cache (`PERF-06`, `PERF-02`)

The services share the last-read group profile for five minutes; attribution
reuses it, and two identical reads in flight share one request. Writing the
profile or signing out drops it. `getGroupUserProfile` still always reads.

### 3 — Notes listener

`NoteProvider` listens on the user's notes, constrained to `campaignId`.
Unsaved notes stay local drafts until their first save. `useNoteData`, an
unused second loader, was deleted.

### 4 — No re-read after a write

Every `refresh*()` after a write is gone; the five read hooks share
`useCampaignCollection`, which derives the list from the snapshot (the old copy
ignored an empty snapshot, so the last deleted record would have stayed).
`refresh*()` now means "retry": it reopens a listener Firestore closed after an
error, which the pages' Retry buttons had silently lost in phase 1.

### 5 — Listen only while something reads (`PERF-03`)

The providers stay above the router, but each counts its readers
(`useListenerDemand`) and listens only while one is mounted, plus five minutes.
Write-only callers pass `{ subscribe: false }`; the search subscribes only
while the palette is open; reading progress is read on first use; the usage
callable runs when `UsageMeter` asks. **Budget, pinned by
`shared/context/__tests__/route-read-budget.test.tsx`**: a page that reads no
campaign data opens no listener, reads no document and calls no usage function.

### 6 — Chapters move by `order`, in one batch (`PERF-05`)

A chapter's id no longer encodes its position. Insert, delete, move and
renumber are one `batchOperations` commit of `order` updates: atomic, and one
round trip instead of ~102 serial operations for an insert at the front of 32
chapters. Existing `chapter-NN` ids were kept as they are, so no migration was
needed and old URLs, notes' references and reading progress all still work.
New chapters get a random `chapter-` id. One change rewrites at most 500
chapters (Firestore's batch limit), and is refused whole above that.

### 7 — Restore's request count (`PERF-02`)

`restore-request-count.test.tsx` runs the real `FirebaseProvider` over a counted
Firestore: restore is four requests (account, group, group profile, campaign
list). The duplicate profile read the plan expected to fold was already shared
by phase 2, so no restore orchestrator was built.

### Also closed

- **Rumour batch actions (`PERF-06`)**: marking or deleting a selection,
  and marking the originals after combine or convert, is one batch.
- **`PERF-09`**: attribution names (Home, `AttributionInfo`) come from
  `getCachedGroupUserProfile`.
- **`PERF-13`**: a profile edit is applied to state
  (`applyUserProfileChanges`, `applyGroupUserProfileChanges`) instead of a
  four-request refresh; only a write that moves the active group or campaign
  still refreshes.
