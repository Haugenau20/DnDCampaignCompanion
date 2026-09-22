# Entity loader consolidation — design

**Date** 2026-09-22 · **Branch** `fix/entity-loader-consolidation` · **Base** `main` @ 74b5e49

Closes **T046** (`NPCsPage` renders from a second loader), **T023** (every entity
collection has several independent loaders) and **T003** (auth context logs user
profile data to the console), in one PR.

T046 is filed as size S and T023 as size M, and the S version is the patch that
already shipped. Doing T046 *as* T023 is the point of this PR: the symptom was
one stale word on one ladder, the defect is that a page and its provider hold
two independently fetched copies of the same collection.

## Why these three travel together

T046 cannot be fixed without T023's change — "drop the second loader and read
the provider" *is* T023, applied to one directory. T003 is unrelated but is pure
deletion in files nobody else is touching, so it costs nothing to carry and
removes profile data from the production console a release earlier.

## The inventory

Eleven redundant fetches, measured 2026-09-22:

| Count | Where | Cause |
|---|---|---|
| 5 | write instances in `NPCContext`, `QuestContext`, `LocationContext`, `RumorContext`, `StoryContext` | second `useFirebaseData` per context, mounted for writes, fetches anyway |
| 1 | `pages/npcs/NPCsPage.tsx` | calls `useNPCData()` instead of `useNPCs()` — **this is T046** |
| 1 | `pages/npcs/NPCDetailPage.tsx` | same double loader; not user-visible, because it calls `refreshNPCs()` explicitly at five sites |
| 4 | `shared/context/SearchContext.tsx` | builds its own chapter, NPC, location and rumour hooks |

### Two facts in the TODO entries are stale, and the entries should be corrected

- T023 names `pages/npcs/NPCsEditPage.tsx` as an independent loader. **That file
  does not exist.**
- T046 says "the other three contexts already expose their refresh". Only
  `LocationContextValue` declares one. `QuestContext` puts `refreshQuests` in its
  value object but `QuestContextValue` does not declare it; `RumorContextValue`
  and `NPCContextValue` expose nothing. It is 1 of 4, not 3 of 4.

### The fact that makes this cheap

`useFirebaseData`'s own JSDoc already establishes the finding this design rests
on: the write instance's `data` array *"is written here but not read by any
current consumer"*. Killing the duplicate fetch is therefore an opt-out flag,
not a restructure. Verified at all five call sites — each destructures only
`addData`/`updateData`/`deleteData` and `error`.

## Design

### 1. `useFirebaseData` gains `autoFetch?: boolean`, default `true`

When `false`:

- the mount fetch effect does not run;
- the `AUTH_STATE_CHANGED_EVENT` listener is not registered;
- `loading` initialises to `false`.

That last point is a correctness detail, not a nicety: `loading` starts `true`
because a fetch is assumed to be in flight on mount. With no mount fetch, a
permanently-`true` `loading` would be a lie told to any future consumer.

Everything else is untouched. `addData`, `updateData`, `deleteData` and `error`
behave identically, so the read/write error separation introduced for **bug
#1401** — the write instance's `error` bound as `writeError` because read and
write failures were being conflated — survives exactly as documented.

`addData`'s optimistic `setData` append still runs against an array that starts
empty and is never read. That was already true; the flag does not change it.

### 2. Five write instances opt out

`NPCContext.tsx:25`, `QuestContext.tsx:47`, `LocationContext.tsx:27`,
`RumorContext.tsx:20`, `StoryContext.tsx:89`.

**`StoryContext.tsx:95` deliberately does not.** That third instance, against
`story-progress`, genuinely reads `data: progressData`. It is the reason the flag
is per-call-site rather than a change to the hook's default, and the reason this
design does not simply make the write path a different hook.

### 3. T046 — the NPC pages read the provider

- `NPCContextValue` gains `refreshNPCs: () => Promise<NPC[]>` and
  `hasRequiredContext: boolean`. `LocationContextValue` is the precedent for
  both; the provider already computes both and discards them.
- `NPCsPage` and `NPCDetailPage` swap `useNPCData()` for `useNPCs()`, which means
  `loading` becomes `isLoading` at the `usePageGate` call.
- `NPCsPage` passes the provider's `refreshNPCs` to `NPCDirectory`'s
  `onNPCUpdate`/`onNPCDelete` instead of its local `handleNPCChanged`.

The `onNPCUpdate` prop **stays**. It is legitimate component API, and the 15.7
patch that first called it was not wrong — it was insufficient, because it fixed
one write path out of several. Once the page renders the provider's copy, every
write path in the directory is refreshed by the context, and the prop stops
carrying the fix on its own.

`NPCDetailPage`'s five explicit `refreshNPCs()` calls now resolve to the
provider's refresh. They remain correct and are left alone.

### 4. SearchContext consumes the four providers

`useChapterData()` → `useStory()`, `useNPCData()` → `useNPCs()`,
`useLocationData()` → `useLocations()`, `useRumorData()` → `useRumors()`.

The file already does exactly this for quests (`useQuests()`), so each swap is
symmetrical with a line already present. It is safe because `SearchProvider` is
mounted inside all four providers at `App.tsx:52-59`.

**This changes index-rebuild timing, and that is a real behaviour change riding
in a debt PR.** Today the index rebuilds when SearchContext's own hooks' arrays
change; afterwards it rebuilds when the providers' arrays change. Same data, but
a write through a context now invalidates the search index where previously it
did not until that hook's next fetch. This is judged strictly more correct —
stale search results after an edit are a real if unreported defect — but it is
called out here so it is not discovered as a surprise.

The `useChapterData`, `useNPCData`, `useLocationData` and `useRumorData` hooks
are **not** deleted: each remains its own context's read hook.

### 5. T003 — thirty deletions

23 `console.log` calls under `src/features/user-management/` (17 in
`auth/context/FirebaseContext.tsx`, 4 in `groups/hooks/useGroups.ts`, 2 in
`groups/hooks/useCampaigns.ts`) and 7 in
`src/features/collaboration/notes/context/NoteContext.tsx`.

They print user ids, loaded profile objects, group profiles and campaign counts
on every auth state change, in production. Straight deletion, no dev-mode guard.
`console.error` calls are untouched everywhere.

No existing test asserts on any of them — verified; only `console.error` is ever
spied on in this suite.

## Testing

The PR's purpose is closing a defect class, so the tests pin the class rather
than the symptom.

1. **`useFirebaseData`** — with `autoFetch: false`, no `getCollection` on mount
   and none on an `AUTH_STATE_CHANGED_EVENT`; writes still call through; `error`
   still surfaces. With the flag absent, current behaviour is unchanged.
2. **One new suite covering all five contexts** — mounting a provider issues
   exactly **one** `getCollection` for its collection. This is the regression
   pin: it is what stops the next write instance reintroducing the duplicate.

   This cannot be added to the existing `*Context.behavioral.test.tsx` suites.
   Those mock `shared/hooks/useFirebaseData` wholesale, so no `getCollection`
   ever happens in them and there is nothing to count. The new suite must use
   the **real** `useFirebaseData` and the real `use*Data` read hooks, mocking
   only `useFirestore` (for a counting `getCollection`) and the auth, group and
   campaign hooks that gate fetching.

   One suite rather than five edits, because the rule is one rule. It also
   needs a case asserting `StoryProvider` issues one `chapters` fetch **and one
   `story-progress` fetch** — the instance that must keep fetching — so the
   exception is pinned alongside the rule rather than left as a comment.
3. **`NPCsPage`** — the page renders the provider's array, so a write through the
   context is reflected without the page refetching. The T046 pin.
4. **T003** — a tree-walking test asserting `user-management` and `NoteContext`
   ship no `console.log`, following the `css-class-manifest.test.ts` precedent.
   Without it the calls grow back; with it, the rule is stated once.

### Test edits that are not tests bent to pass

`NPCsPage.test.tsx`, `NPCDetailPage.test.tsx` and
`SearchContext.behavioral.test.tsx` mock the barrel hooks their subjects
consume. Those subjects now consume different hooks, so the mocks name different
hooks. Each is a shallow barrel mock and each edit is a name swap; no assertion
changes. This is the collaborator changing, not the expectation.

## Verification

All three gates, because CLAUDE.md's resolver table says no one of them implies
the others:

- `npx tsc --noEmit` — clean on this branch before any change (measured).
- `npm test` — measure the baseline on this branch first; any red is a
  regression.
- `npm run build` — webpack ignores tsconfig `paths`, so it can fail where the
  other two pass. No `@/` imports in anything this PR ships.

Plus a Chrome pass, because both defects were found there and neither is visible
in jsdom:

- `/npcs` — change an NPC's stance on the ladder; the word updates without a
  reload, and every other write path in the directory behaves the same.
- The command palette — search still returns results across all six types after
  the SearchContext swap.

## Commits

Three, in dependency order:

1. `perf(data): write instances stop fetching the collection they write to` —
   the `autoFetch` flag and the five opt-outs.
2. `fix(npcs): the NPCs page reads the provider it writes through` — the
   `NPCContextValue` additions, both NPC pages, SearchContext.
3. `chore(logging): stop printing user profiles to the console` — T003.

## Out of scope

- **T029** (notes fetched twice on every authenticated route, unbounded) is a
  different finding in the same area. Only its `console.log` overlap is taken
  here.
- Deleting the `use*Data` read hooks, or merging read and write into a single
  `useFirebaseData` instance per context. Both are larger changes that the
  `writeError` separation (bug #1401) makes non-trivial, and neither is needed
  to close T023.
