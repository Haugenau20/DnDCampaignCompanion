# T032 — performance remediation plan

**Status**: drafted 2026-10-02, overnight, **not yet reviewed by the maintainer**.
Phases 1–2 are implemented on `perf/t032-firestore-listeners` alongside this
document; everything after them waits for a review of this plan.

The direction was decided on 2026-10-02 (`TODO.md`, T032): Firestore listeners
(`onSnapshot`) per collection, mounted by the routes that need them; the SDK's
latency compensation replaces the refetch after a known write; one small
in-memory cache for attribution profiles; no new dependency. `PERF-05` and
`PERF-02` must be answered on their own terms.

Finding ids (`PERF-nn`) refer to
[`performance-review-2026-08-30.md`](performance-review-2026-08-30.md). Its
§"Suggested performance budgets" are the acceptance criteria below.

## Where things stand (read in the tree, 2026-10-02)

- Each entity provider (`NPCProvider`, `QuestProvider`, `RumorProvider`,
  `LocationProvider`, `StoryProvider`) owns a read hook (`use*Data`) that
  fetches its collection with `getDocs` through `useFirebaseData.getData`, and a
  write-only `useFirebaseData` instance (`autoFetch: false`). Every mutation
  ends with `await refresh*()`, a full re-read of the collection. The duplicate
  mount fetches (`PERF-08`) and the duplicate page-level refreshes are already
  gone (`provider-fetch-counts.test.tsx`, `redundant-refreshes.test.tsx`).
- Every attributed write (`DocumentService.createDocument`,
  `updateDocumentWithAttribution`) reads `groups/{g}/users/{uid}` first, to stamp
  the username and active character.
- Notes are already constrained to the active campaign and read once
  (`PERF-04`'s headline is fixed), but are still fetch-then-refetch.
- All providers sit above the router (`app/App.tsx`), and `SearchContext`
  (mounted globally for the header search) reads all of them, so every
  signed-in route loads every collection (`PERF-03`).
- Chapter structural operations still shift chapters one at a time with
  `set` → verifying `get` → `delete` (`StoryContext.tsx`, `createChapter`,
  `deleteChapter`, `reorderChapters`, `updateChapter`'s renumber path).

## Phases

### Phase 1 — Entity collections become listeners (`PERF-06`, `PERF-08`, `PERF-13`) · implemented

- `DocumentService.subscribeToCollection(path, onNext, onError)` wraps
  `onSnapshot` on an explicit collection path, and `useFirestore` exposes it.
- `useFirebaseData` gains a `subscribeTo` option: a full collection path, or
  `null` for "no scope yet". With it, the instance listens instead of fetching:
  `data` follows the snapshot stream, `loading` is true until the first
  snapshot for the current path, and `getData()` answers from the latest
  snapshot (waiting for the first one if it has not arrived) — **no read**.
  Without it, the hook behaves exactly as before.
- The five read hooks pass `subscribeTo` built from the active
  group/campaign, or `null` when signed out or unscoped. The path is built
  from the React state the hooks already gate on, not from the service's
  own copy of the active ids, so the subscription can never point at a
  different campaign than the one the page shows.
- The read hooks' public shape is unchanged, including `refresh*()`. A
  provider's `await refresh*()` after a write now costs nothing: by the time
  the write's promise resolves, the listener has already delivered it.
- **Budget**: mounting a provider opens one subscription and performs zero
  `getDocs`; a single create/update/delete is one write and zero collection
  reads.

What it buys beyond the round trips: another player's edits appear without a
reload, which is most of what "shared campaign data" means.

### Phase 2 — Attribution profile cache (`PERF-06`, `PERF-02`) · implemented

- The Firebase services share the last-read group profile per
  `(groupId, uid)` (`BaseFirebaseService`), and `DocumentService` reuses it
  for creation and modification attribution.
- `UserService.getGroupUserProfile` still always reads, because sign-in's
  restore acts on the profile's `activeCampaignId`. Its reads seed the cache,
  so the first write of a session costs nothing, and two identical reads in
  flight at once share one request (`PERF-02`'s leftover duplicate).
- Any write to that profile through `UserService` (character switch, username
  change, profile edit) invalidates the entry, as does sign-out. A cached entry
  also expires after five minutes, so a profile changed from another device
  is picked up without a reload.
- **Budget**: N attributed writes in a session cost one profile read, not N.
- **Not done**: `PERF-09`. Home's `fetchAttributionUsernames` reads through
  `getGroupUserProfile`, which always reads. It should use the cache, but
  `attribution-utils.test.ts` pins that exact call, so changing it changes
  those assertions. That is left for the review.

### Phase 3 — Notes listener · next, small

`NoteContext` and `useNoteData` move to the same subscription
(`groups/{g}/users/{uid}/notes` with `where("campaignId", "==", …)`), which
needs the subscription to accept constraints. Autosave (`PERF-14`) then no
longer re-reads anything on save.

### Phase 4 — Remove the now-free refresh calls · needs a decision

After phase 1, `refresh*()` after a write is a no-op that still reads like a
round trip. Deleting the calls is right, but about 20 assertions in the
context and page suites pin "a refresh follows a write"
(`expect(mockRefreshNPCs).toHaveBeenCalled()`). Under the project's rule those
tests are not edited to pass; they would be **rewritten to the new requirement**
("the list reflects the write without a re-read"). That is a change to the
tests' requirement, so it is the maintainer's call. Until then the calls stay
and cost nothing.

### Phase 5 — Subscriptions on demand (`PERF-03`)

Keep the providers where they are (the quick-add form and the header search
need their write methods and lists from any route), but make each provider's
subscription **reference-counted**: it opens when the first component reads
the list, and closes a short while after the last one unmounts, so a quick
back-and-forth does not resubscribe. Writes need no subscription.

- `SearchContext` subscribes only once the search box is opened, not on mount.
- `UsageProvider`'s callable runs only where the meter renders (`NotePage`).
- **Budget**: the Privacy page reads zero campaign collections and calls no
  usage function.

This is the larger change: every list consumer goes through a hook that
registers interest, and the providers' value objects must be memoized
(`PERF-15`) or the registration churns.

### Phase 6 — Chapters (`PERF-05`)

Two steps, the second needing a decision.

1. **Now, no data migration**: each structural operation (insert, delete,
   reorder) builds the full set of moves (`set` new id, `delete` old id)
   locally and commits it as **one `writeBatch`** through
   `DocumentService.batchOperations`. Drop the per-document verifying `get`:
   a batch is atomic, so a partial shift — the thing the verification guards
   against — cannot happen. Insert-at-front on 32 chapters goes from ~102
   serial operations to one commit. Batches cap at 500 writes, i.e. ~250
   chapters per operation; above that the operation must be split, and the
   plan should state the cap rather than silently fail.
2. **Later, needs the maintainer**: decouple identity from order — stable
   chapter ids plus an `order` field. That changes every chapter id in
   production, and chapter ids appear in URLs, notes' references and reading
   progress, so it needs a one-off migration (an operator script under
   `utils/__dev__/`, or a callable) and a decision on what old URLs do.

### Phase 7 — Restore orchestrator (`PERF-02`)

Restore is 3 round trips already (2026-09-25). What remains: the group profile
is requested twice (concurrently; whether the SDK coalesces them is
unverified), and nothing measures request counts. Write the
request-count test first (an auth integration test over a counted Firestore,
the same technique as `provider-fetch-counts.test.tsx`), then fold the
second request into the first. A full "single restore orchestrator" rewrite of
`FirebaseContext` is only worth it if that test shows more than this one
duplicate.

## Out of scope here

`PERF-11` (location cycles), `PERF-12` (progress document growth) and
`PERF-15` beyond what phase 5 needs are separate items, not part of this
programme.

## Questions for the maintainer

1. Phase 4: may the "refresh follows a write" assertions be rewritten to the
   listener requirement, so the dead calls can go?
2. Phase 6.2: is a chapter-id migration acceptable at all, and should old
   chapter URLs redirect?
3. Listener cost: a listener re-reads the collection only when it
   (re)subscribes; any document a player changes is one read per listening
   client. At ~20 users this is far below the free tier, but it is a different
   cost shape from today's, so it is named here.
