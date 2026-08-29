# Performance — initial findings

**Measured**: 2026-08-29, on branch `feature/story-section-redesign`, against the local Firebase
emulators via `start-dev.ps1`.

**Scope**: deliberately narrow. These notes came out of investigating one reported symptom in the
story section — "going from one chapter to the next shows the correct content, then the loading
wheel, then the correct content" — and the load times noticed alongside it. **A full performance
review has not been done.** This file exists so that review starts from evidence rather than from
scratch. Treat everything under "Leads" as unverified.

---

## 1. Fixed: progress writes refetched the whole chapters collection

**Status: fixed** in `fix(story): stop progress writes refetching the chapters collection`.

The reported symptom was real but understated. It was not a one-off flicker; it was a loop that
never terminated. Sampling the DOM at 40Hz across a chapter open produced:

```
   26ms  other
  375ms  LOADING
 3524ms  other
 3552ms  LOADING
 4398ms  READER
 5652ms  LOADING
 6059ms  READER
 6603ms  LOADING
 7019ms  READER
 ... still alternating when sampling stopped at 11.5s
```

### Mechanism

`updateChapterProgress` ended with `refreshChapters()`:

1. `refreshChapters()` → `useFirebaseData.getData()` → `setLoading(true)`
2. → `StoryContext.isLoading` → `StoryPage` renders its loading card **instead of** the reader,
   which **unmounts `ChapterReader`**
3. → the reader's per-chapter "already reported completion" ref is reset by the unmount
4. → the fetch resolves, the reader remounts, reports completion again
5. → back to step 1

Every pass cost a full re-read of the `chapters` collection plus a Firestore write. The same
refetch also tore the reader down mid-scroll, discarding the reader's scroll position.

### Why the refetch was wrong in the first place

Reading progress lives in the `story-progress` document. A progress write cannot change any
chapter document, so re-reading `chapters` afterwards could never observe anything new. The call
appears to have been defensive rather than load-bearing.

### After

A chapter-to-chapter transition now shows **zero** loading states across eight seconds of
sampling. Pinned by `StoryContext.progress.test.tsx`, "does not refetch the chapters collection
when progress changes", which fails if the call is restored.

---

## 2. Lead: entity collections are fetched at least twice on every mount

**Status: identified by reading the code, not yet measured. Not fixed — it is repo-wide.**

Two independent mount effects both fetch:

- `shared/hooks/useFirebaseData.ts` — `useEffect(() => { getData(); }, [getData])`
- `features/storytelling/chapters/hooks/useChapterData.ts` —
  `useEffect(() => { fetchChapters(); }, [fetchChapters, activeGroupId, activeCampaignId])`,
  and `fetchChapters` calls the same `getData()`

So a mount costs two reads where one would do. It is likely **three** in practice: `fetchChapters`
changes identity when `activeGroupId` / `activeCampaignId` transition from undefined to a real
value during context restore, re-running the effect.

This is not specific to chapters. NPCs, quests, rumors and locations each have their own
`use*Data()` hook layered over the same `useFirebaseData`, so the same duplication very likely
applies to all four. That breadth is exactly why it was left alone here — it wants measuring
across domains and a single considered fix, not a local patch.

**Suggested first step**: instrument `getCollection` with a counter and load each route once, to
turn "at least twice" into a real number per domain before changing anything.

---

## 3. Lead: time-to-content is dominated by context restore, and is noisy

**Status: measured, but the numbers are not trustworthy enough to act on. Not investigated.**

The page shell is fast; the wait is for data. From a warm load of the reader route:

| Marker | Time |
|---|---|
| `domContentLoaded` | 38ms |
| `load` | 69ms |
| first Firestore request | 88ms |
| campaign name visible (context resolved) | 4835ms |
| reader rendered | 5621ms |

Nothing renders until the auth → user → groups → campaign restore completes. But repeating that
measurement across routes gave wildly inconsistent results:

| Route | Time to campaign context resolved |
|---|---|
| `/story/chapters/:id` | 942ms |
| `/` | 1086ms |
| `/npcs` | 1393ms |
| `/quests` | 4830ms |

The reader — the thing under investigation — came out **fastest**. The spread is far too wide to
attribute to any route's own code, and points at emulator or dev-server contention.

### Caveats that make these numbers weaker than they look

- Measured in same-origin iframes inside an already-loaded page, so **the JS bundle was served
  from cache**. Real cold loads will be slower, and bundle cost is entirely absent from these
  figures.
- The emulator was under load from the same session's probing.
- Dev builds are not production builds; `npm run build` output is ~302 kB JS / ~11 kB CSS gzipped,
  which these measurements say nothing about.
- A single sample per route. No repetition, no median.

**Do not quote these numbers as findings.** They justify looking at the context-restore chain
first; they do not establish its cost.

---

## Method notes for whoever picks this up

- **Measure from a fresh document, not a tab you have been poking at.** A tab that has sat through
  hot reloads gets into states the app never reaches normally — during this session one such tab
  sat in a permanent "Loading chapter..." that a fresh load did not reproduce, which nearly sent
  the investigation after a phantom.
- **Two app instances fight over `story-progress`.** An iframe plus its parent both running the app
  is two instances; each rewrites the whole progress document, so the last writer wins and
  measurements of writes get silently clobbered. Use one instance when measuring writes.
- **Watch out for markers that match the nav bar.** Timing "time to `/quests` content" against the
  string `Quest` matched the header link and reported 71ms. Pick a marker that only the loaded
  content can produce.
- The Firestore emulator's REST API is reachable from the page for asserting what was actually
  persisted:
  `http://localhost:8080/v1/projects/dnd-campaign-companion/databases/(default)/documents/groups/{group}/campaigns/{campaign}/story-progress/current-progress`

---

## Known, not performance, but adjacent

Two browser tabs open on the same campaign will clobber each other's reading progress. Both
replace the whole `story-progress` document on every write, so the last writer wins. Fixing it
properly means changing the document shape (per-chapter documents, or field-level merges), which
is a database-structure decision and needs sign-off before anyone starts.
