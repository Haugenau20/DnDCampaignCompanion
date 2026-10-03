# Second-pass performance, scalability and cost review

Reviewed commit: `8c03720020c7772b0bb8b256c4569c8b50c1e495`, application source
identical to first-pass `64fe19512b1d3bd14427fad8996403a742fbe8a9`.
Date: 2026-10-03. Reviewer assignment: performance/scalability/cost; the
[approved plan](plan.md) records GPT-6 Astra, xhigh.

Five findings: **four medium, one low**. Two identify measured synchronous CPU
work, two identify unnecessary or unbounded service work, and one identifies
redundant note writes. None establishes a production outage or latency SLA.
The old global-fetch, serial chapter-shift, whole-progress-write and overlapping
note-save problems must not be reported as though they were still unchanged.

## Scope and evidence

Inspected application/provider composition; demand ownership; collection and
attribution services; Home, entity directories/detail pages, quick add, notes,
search, chapters and saga reading; progress persistence; route chunks/source
maps; and image maintenance/campaign cleanup work. Read `AGENTS.md`, `TODO.md`,
all three historical files in `docs/performance/`, and the first-pass summary.

The coordinator executed the probes centrally; this reviewer prepared them in
`/tmp/pass2-performance`. No production calls, paid AI, email, emulator writes,
application changes, existing-test changes, dependency changes, Docker work or
deployment occurred for these probes. Authentication, invitations, credentials
and account lifecycle were not reopened. The historical authentication
waterfall is explicitly left outside new runtime coverage.

Evidence forms:

- `bench.cjs`: transpiles the actual TypeScript functions, counts work with
  bounded synthetic inputs, and invokes the actual image sweep with all I/O
  replaced by counted fakes. Run with `node /tmp/pass2-performance/bench.cjs`.
  The coordinator also ran this under Node **22.23.3**.
- `browser-bench.cjs`: loads the same pure functions into a blank Chromium
  **151.0.7922.173** page. All network requests are blocked. One warmup, then
  median of three calls, without CPU throttling, React rendering or layout.
  Run with `node /tmp/pass2-performance/browser-bench.cjs`.
- `probes.test.tsx` and `route-budget.test.tsx`: actual NoteEditor and real
  demand providers/quick-add hook, with counted persistence/listener fakes and
  fake timers for notes. Both suites passed: **5 diagnostics**, 7.387 s.
  Run from the repository with
  `NODE_ENV=test node node_modules/jest/bin/jest.js --config /tmp/pass2-performance/jest.config.cjs --runInBand --silent=false`.
  The two existing route-budget cases are copied into the temporary harness;
  the quick-add and two duplicate-save cases are additional diagnostics.
- The retained production artifact's **505 local source-map entries match the
  current files byte-for-byte**. Its manifest has one entry and 20 async JS
  chunks. Level-9 gzip confirms the earlier **266.644 kB** entry measurement.

The coordinator preserves diagnostic sources/results with the pass evidence.
Original Node benchmark output labels all timing runs “uninstrumented”; that
label is inaccurate for the **location** measurements, whose objects retain
counting `id` getters. The prepared script now explains this. Location timing
claims below use the separate Chromium runs with plain object fields, while
Node supplies deterministic operation counts. No numbers were adjusted to
compensate for instrumentation.

## PERF2-001 — Location search and filter expansion rebuild the whole index per match

**Severity: medium. Confidence: high. Classification: residual of historical
PERF-11's complexity concern, verified in the replacement implementation;
not a recurrence of its nontermination bug.**

Sources:

- `src/features/campaign-entities/locations/components/LocationDirectory.tsx:208-217`
  calls `ancestorIdsOf` once per location matching a status/type pill.
- The same file, `338-342`, calls `pathLabelOf(locations, id)` for every search
  hit, during render. The directory already builds a shared index at `120`.
- `src/features/campaign-entities/locations/utils/location-tree.ts:99-107`
  builds a full map inside `ancestorPathOf`, then calls `ancestorIdsOf`.
- `src/shared/hooks/useHighlightTarget.ts:30-37` builds another full map inside
  `ancestorIdsOf`.

**Trigger and outcome.** In a large location directory, search for a common
word in the names/descriptions, or select a status shared by many locations.
A shallow tree is enough; no cycle, deep nesting or invalid data is required.
The intended work is one index build plus short parent walks. For `N` locations
and `H` hits, search instead constructs `2H` full maps and performs `2NH`
indexing visits. Pill expansion constructs `H` full maps, or `NH` visits.
The depth cap does not bound these full-collection rebuilds.

The fixture is one root and `N-1` direct children, all matching:

| Locations/hits | Search indexing visits | Pill indexing visits | Chromium search ancestry work | Chromium pill ancestry work |
|---:|---:|---:|---:|---:|
| 100 | 20,000 | 10,000 | 1.8 ms | 0.5 ms |
| 500 | 500,000 | 250,000 | 38.8 ms | 10.7 ms |
| 1,000 | 2,000,000 | 1,000,000 | 68.7 ms | 37.6 ms |
| 2,000 | 8,000,000 | 4,000,000 | 247.1 ms | 124.0 ms |

`bench.cjs` counts actual ID reads; `browser-bench.cjs` invokes the actual
helpers without getters. These are **ancestry computation alone**, before
row rendering/layout, not measured total interaction latency. The input itself
updates React state directly, so this synchronous work is on the typing/filter
path. It also repeats when search rows render for selection/expansion changes.
There are no additional Firestore reads from these helpers.

**Fix and verification.** Let ancestry helpers accept the already-built index,
reuse `byId` for both walking and resolving ancestors, and derive labels once
per data/query change. Preserve cycle, missing-parent and depth-cap behavior.
Assert index construction occurs once, then rerun this shallow-tree scenario;
its indexing work should be O(N), with O(H × bounded depth) traversal. A future
DOM-size decision can be measured separately; virtualization is not necessary
to remove this avoidable quadratic allocation.

## PERF2-002 — Saga pagination repeatedly splits prefixes and the remaining body

**Severity: medium. Confidence: high. Classification: new finding.**

Sources:

- `src/features/storytelling/stories/utils/paginate-prose.ts:166-204`:
  `countWords(remaining)` on every page, followed by `countWords(candidate)`
  and inline-span scans for every whitespace boundary within that page.
- `src/features/storytelling/stories/components/BookViewer.tsx:46-56` calls
  the paginator synchronously when the saga content changes.
- `src/pages/story/SagaPage.tsx:120-128` mounts that viewer with stored content.
  Ordinary chapters use the scrolling ChapterReader and are **not** subject
  to this paginator.

**Trigger and outcome.** Open a saga containing a long paragraph, including
pasted plain prose without blank paragraph separators. The editor has no
smaller body limit that excludes the measured 345 kB example. A 250-word page
budget limits displayed prose, but does not limit preparation work.

With `W` words and page budget `B`, repeatedly counting remaining words adds
O(W²/B) work; recounting each candidate prefix adds O(WB), plus repeated inline
span scans. The fixture uses ordinary `word0`–`word99` tokens with single spaces,
not malformed markup:

| Words | Source bytes | Pages | Actual word-split calls | Characters passed to word splits | Chromium median |
|---:|---:|---:|---:|---:|---:|
| 1,000 | 6,899 | 4 | 762 | 682,723 | 4.9 ms |
| 5,000 | 34,499 | 20 | 4,810 | 4,562,419 | 31.8 ms |
| 10,000 | 68,999 | 40 | 9,870 | 10,033,039 | 67.1 ms |
| 20,000 | 137,999 | 80 | 19,990 | 23,044,279 | 143.1 ms |
| 50,000 | 344,999 | 200 | 50,350 | 78,637,999 | 481.4 ms |

The Node count intercepts the real `String.split(/\s+/)` calls only; it excludes
additional regex scans and array filtering. Browser timings have no interceptor.
At 50,000 words, the paginator passes over 227 times the input length through
word splitting alone. This blocks the main thread before its `setPages` can
show the book. The measured 481 ms is a synthetic function duration, not a
claim about a real user's saga or mobile device.

**Fix and verification.** Scan word boundaries once and maintain running word
and inline-delimiter state, retaining safe block boundaries and verbatim source
slices. Avoid recounting the entire remainder or each growing candidate.
Verify existing Markdown-preservation cases and the long-single-paragraph case;
count near-linear boundary visits before setting a device-specific timing gate.
A worker is unnecessary if the algorithmic waste can be removed directly.

## PERF2-003 — Quick add opens unrelated collection listeners before any create

**Severity: medium. Confidence: high. Classification: new call-site finding
within the historical PERF-03 demand-budget area.**

Sources:

- `src/shared/components/quick-add/useQuickAddCreate.ts:117-121` calls all four
  list-reading hooks with default subscriptions: NPCs, quests, locations, notes.
- `src/shared/components/quick-add/QuickAddForm.tsx:76-78` invokes that hook for
  every entity kind. The hook receives the kind only when its returned write
  function is called, at `useQuickAddCreate.ts:124-128`.
- `useQuickAddCreate.ts:144-154` uses NPC/location lists for optional carried
  reference resolution; `175-177` marks a note only when conversion IDs exist.
- `src/shared/hooks/useListenerDemand.ts:12,33-57` retains released listeners
  for five minutes; `src/shared/hooks/useCampaignCollection.ts:35-38` opens
  their collection subscriptions.

**Trigger and outcome.** From a fresh scoped session on a route without entity
readers, open quick add for an ordinary NPC, or open `/npcs/create` directly.
No carried extraction data or source note is required. Even cancelling without
creating anything opens:

```
groups/group-1/campaigns/campaign-1/npcs
groups/group-1/campaigns/campaign-1/locations
groups/group-1/campaigns/campaign-1/quests
groups/group-1/users/user-1/notes   (campaign constrained)
```

The actual-hook/actual-provider diagnostic observed exactly these four listener
registrations. Its companion baseline still observes zero with just the closed
header search/create actions, and six when global search opens. Query callbacks
are fakes, so this is an ownership/operation-count proof, not a bill measurement.

For a cold server-backed listener, returned documents are initially read in
full. If NPCs/locations/quests/private campaign notes each contain 100 documents,
this path requests 400 initial documents. **At least the 100 quests and 100 notes
are irrelevant to an ordinary NPC create**, even allowing the existing NPC and
location readers for reference/collision behavior. With `Q` quests and `M`
notes the avoidable initial documents are `Q+M`, plus unnecessary change
notifications during the five-minute linger. Reopening within that linger
reuses the listeners; this is not four fresh reads per keystroke or every open.
Local SDK cache/reconnection state and security-rule-dependent reads can alter
billing, so exact invoice counts are not asserted.

The comment at `useQuickAddCreate.ts:108-111` claiming the subscription costs no
fetch is stale: subscribing through the demand hook is precisely what opens
the initially absent database listener.

**Fix and verification.** Pass the entity kind and conversion/reference needs
into the hook before subscription setup, then keep hook calls unconditional
while setting `subscribe` only for lists the selected operation needs. Do not
turn off a list required to resolve carried names or mark a source note. Extend
the real-provider budget test across ordinary NPC/location/quest creation and
note conversion; verify irrelevant listeners remain closed and supported
conversion references still resolve correctly.

## PERF2-004 — Daily image maintenance has no per-run or delete-concurrency bound

**Severity: medium. Confidence: high for work/cost growth; production timeout
threshold unmeasured. Classification: new scalability finding, separate from
first-pass IMG-003 and deletion-protocol findings.**

Sources:

- `firebase/functions/src/imageMaintenance/sweepOrphanedImages.ts:50-67`
  materializes all NPC, location, campaign and group reference snapshots.
- `103-118` reads both Storage prefixes with auto-pagination defaults and builds
  full file/orphan arrays.
- `120-122` launches one delete promise for every eligible orphan at once.
- `144-151` repeats the whole job daily without a cursor or work budget.

**Trigger and outcome.** A growing installation accumulates many campaign
entities and an orphan backlog from cancelled/replaced uploads or failed
cleanup. The global daily job scales with **all** content, even if most records
have no image and few objects need cleanup. The `select` projection saves
transferred fields; it does not make returned documents free reads.

Let `D = NPCs + locations + campaigns + groups`, `F` be the files listed under
the two prefixes, and `O` be old eligible orphans. Each successful run performs
four reference queries returning D documents, lists F objects, and launches O
delete promises without an application cap. The reference scan alone costs
D returned-document reads per day, or approximately 30D in a 30-day month
(subject to query minimums, billing policy and free quota). For example,
100 campaigns × (100 NPCs + 100 locations), plus 100 campaign and 10 group
records, means **20,110 returned documents/day; 603,300/month**, even with no
orphan deleted. No dollar price or actual production population is assumed.

The actual exported sweep with counted fakes demonstrated:

| Fixture | Reference-query calls | Returned reference documents | Orphans deleted | Peak unresolved delete calls |
|---|---:|---:|---:|---:|
| 1,000 orphans | 4 | 3,000 | 1,000 | 1,000 |
| 5,000 orphans | 4 | 15,000 | 5,000 | 5,000 |

The reference count in this synthetic fixture deliberately supplies N documents
to each of three collection-group snapshots and an empty groups snapshot.
Delete promises settle on the next event-loop turn, exposing launch concurrency.
This proves the lack of application backpressure; it does **not** prove 5,000
simultaneous network sockets, a Storage quota rejection, memory exhaustion or a
production timeout. Those depend on SDK transport and deployment limits.

**Fix and verification.** Bound delete concurrency first. For a larger corpus,
process explicit pages/cursors with a per-run budget and resumable progress;
consider targeting upload candidates rather than reading every entity daily.
Preserve the age/reference checks and address IMG-003's pending-upload protocol
when changing the maintenance design. A bounded implementation should show a
fixed peak in-flight count with 5,000 orphans, resume from a cursor after an
interrupted page, and avoid repeatedly scanning already-completed pages.

Individual delete failures already use `allSettled`, are recorded in `failed`,
and leave the object for a later sweep. This finding does not claim those
errors are silently lost or repeat the first-pass orphan-age correctness bug.

## PERF2-005 — Serialized note saves still repeat an unchanged snapshot

**Severity: low. Confidence: high. Classification: residual deduplication work
from historical PERF-14; its overlap defect is fixed.**

Sources:

- `src/features/collaboration/notes/components/NoteEditor.tsx:167-185` writes
  without comparing against the latest successfully persisted snapshot.
- `215-239` serializes requests but always executes the queued follow-up.
- `253-259` keeps the idle debounce alive after a successful manual save.
- `src/features/collaboration/notes/context/NoteContext.tsx:212-240` adds a fresh
  `updatedAt` and sends each existing-note save through attributed update.
- `src/core/services/firebase/data/DocumentService.ts:240-258` performs one
  `updateDoc` per such call.

**Trigger and observed result.** Edit a saved note once, press Ctrl+S within the
2-second idle delay, and type nothing else. The actual NoteEditor probe observed
one manual save, then one idle update with exactly the same `{title, content}`.
A second probe kept the manual save pending while the idle timer fired: after
that save resolved, a second identical snapshot was written serially. Both
probes passed with two equal captured payloads.

This is **two writes for one changed snapshot**, not overlapping writes or data
loss. Each duplicate carries a fresh modification timestamp and may cause
another listener snapshot, notes sort, reference recomputation and search-index
rebuild. Twenty such edit/manual-save/pause cycles request forty writes instead
of twenty. The five-minute attribution cache normally prevents twenty extra
profile reads; a duplicate does not imply an extra profile read every time.
There is no separate private-note revision/history document on this save path.

**Fix and verification.** Track the last successfully saved fields per note,
skip unchanged queued/idle snapshots, and cancel the pending idle timer only
when the current fields are known saved. Preserve a later edit made during the
round trip and retry after failure; merely suppressing every queued request
would lose legitimate newer text. Verify the two diagnostics fall to one write,
while an intervening edit still results in a serialized second write.

## Budgets, safe non-findings and capacity limits

### Route reads and listener ownership

The five entity providers use `useCampaignCollection` and one listener each;
notes use one campaign-constrained personal query. `useFirebaseData.ts:125-160`
opens/closes according to the full path, while its subscription-mode `getData`
answers from the latest snapshot. There is no per-consumer duplicate listener
and no full collection refetch after each successful entity/note write.

Cold-route source budgets below exclude authentication/group/campaign setup,
SDK cache effects, rule evaluation, reconnects and any lingering readers from a
previous route. Counts are collection owners, not assumed billable RPCs:

| Surface | Data demand |
|---|---|
| Privacy with search/quick add closed | 0 campaign listeners, 0 progress reads, 0 usage callables; real-provider diagnostic |
| Home | Chapters, quests, rumors, NPCs, locations; one reader-progress document when story first demanded |
| NPC directory | NPCs and locations |
| Location directory | Locations, NPCs and quests for linked summaries |
| Chapters/one chapter | Chapters plus one progress-document read per scope; full chapter bodies are held |
| Saga viewer | One `saga/sagaData` document via `useSagaData`; no saga collection listener |
| Notes directory | Campaign-constrained private notes |
| Note editor and campaign links | Notes plus NPCs, locations, quests, rumors; usage status when its meter requests it |
| Global search | Six domain listeners, plus the story provider's progress document when first demanded; no usage call |
| Ordinary quick-add surface | Four listeners, including the excess identified in PERF2-003 |

Reference/attachment consumers share their owners; two `useNPCs` consumers do
not mean two NPC snapshots. The five-minute linger trades retained change reads
for avoiding another initial collection read after short navigation. A quiet
open listener does not continuously reread its collection. Scope changes close
old paths; genuine new-scope demand or a retry/reconnect can read a fresh set.

There is still **no server pagination** for an entity directory, notes list,
chapter index or search corpus. One chapter detail consequently needs the
campaign's entire chapter snapshot, not just its selected chapter. With 100
chapters × 20 kB body, its body content is approximately 2 MB before metadata
and protocol overhead. This is a capacity fact, not a measured slow production
route: one shared query also supplies ordering, next/previous, and search.
Measure actual campaign sizes before adding a separate summary/body schema or
paged search architecture.

### Writes, history, cache and bounded batches

- Existing entity/note update: one write; warm attribution adds zero profile
  reads, cold/expired attribution adds one coalesced profile read. An explicit-ID
  create additionally checks that target document. These are client operation
  counts, not a promise about rule-dependent billable reads.
- `BaseFirebaseService.ts:168-211` shares in-flight group-profile reads and a
  five-minute attribution cache; `215-230` invalidates a key or all keys.
  `UserService.ts:105-107` uses the cache for attribution. Its TTL is not LRU
  eviction, but the inspected use is bounded by distinct encountered group/user
  pairs within the session; no demonstrated memory problem is asserted.
- `HomePage.tsx:40-99` still scans author IDs after collection changes, but
  `fetchAttributionUsernames` now uses cached group profiles. The old repeated
  network-read accusation is obsolete during the TTL. This retains normal
  fallback names for historical data.
- Ordinary note saves do not append content revisions. Entity `NoteHistory`
  renders existing note arrays, and note edits replace their array field; the
  first-pass DATA-003 concurrency consequences remain cross-references.
  Growing arrays remain part of the entity document and therefore its initial
  read payload. No large actual history or document-limit failure was measured.
- A dirty note uses 2 s idle/30 s interval saves, with one active and at most one
  coalesced queued save. Repeated keystrokes do not write individually. PERF2-005
  is specifically unchanged work after another save has already succeeded.
- Story progress is per reader/campaign. `StoryContext.tsx:300-327` merges a
  patch, and `332-367` sends only the changed chapter entry. Scroll reports are
  throttled to 1,500 ms, with immediate completion/cleanup edge flushes; a
  continuous scroll is roughly 40 cadence writes/minute, not one per DOM event.
  It performs no chapter refetch. The persisted progress map still grows with
  chapters read, but its network write payload no longer contains all entries.
- Chapter insertion into 32 chapters now commits at most 33 writes in **one
  batch**, not the old ~102 serial remote operations. Moving updates affected
  orders with stable IDs. `StoryContext.tsx:65-75` refuses more than 500 writes
  before committing; renumbering an already contiguous story commits none.
  `commitEntityWrites.ts:29-38` likewise makes an empty batch a no-op and rejects
  more than 500 selected entity writes. These limits are deliberate capacity
  guards. First-pass DATA-007's concurrent append ordering is separate.
- Location cascade deletion still serializes descendant deletions, and child
  promotion serializes updates before deleting the parent
  (`LocationContext.tsx:230-259`). A subtree of K records means K document
  delete calls; it is not constant latency, but there is no old full-collection
  reload after each call. The source explicitly preserves descendant-first
  ordering. No new interactive latency was measured for this rare operation.
- Campaign cleanup uses BulkWriter and Admin `recursiveDelete`. Before the
  subtree operation it performs three fixed document reads, reads U member
  rows, and runs U sequential campaign-note queries; it queues matching-note
  deletions, U progress deletes and up to U profile updates
  (`deleteCampaign.ts:46-141`). BulkWriter chunks writes; the outer member
  snapshot/note queries are not a bounded resumable job. This is relevant to
  first-pass DATA-004/DATA-010's durable deletion redesign, not another counted
  performance finding or a renewed account-lifecycle investigation.

### Search, rendering and bundles

`SearchService` terminates on whitespace-only input, filters empty tokens,
finds bounded snippets and caps results per type. The synthetic query
`dungeon` over 5,000 × 1,200-character documents returned five results in
**45.9 ms** in Chromium; 1,000 documents took **7.5 ms**. Two spaces returned
zero immediately in the Node checks. Debouncing reduces frequency, not the
synchronous work of one query. The cap applies after scanning/scoring/sorting
matches, so it does not mean only five documents are processed. These bounded
numbers support monitoring corpus size, not reviving the former 22-second
whitespace-freeze claim.

There is remaining render/derivation work without enough evidence for a new
ranked bottleneck:

- `SearchContext.tsx:166-198` rebuilds all six search-document arrays whenever
  any input list changes, even when its own demand is off and another route
  keeps data loaded. Six separately delivered equal-size collections of n
  documents can build n + 2n + ... + 6n = **21n** document wrappers at startup,
  versus 6n after all arrive; this is a possible delivery schedule, not a
  measured count of React commits. A note update then rebuilds the entire
  currently loaded index. Per-type memoization/on-demand work is proportionate
  if profiling shows it matters. React's other review owns stale-index behavior.
- Provider values for entities, notes/story and Firebase are still broad new
  objects. `subscribe: false` stops listener ownership, not context invalidation.
  Snapshot `.docs.map` in `DocumentService.ts:375-379` recreates all document
  objects, so unchanged list entries do not preserve referential identity.
  `useCampaignCollection` memoizes sorting between snapshots, and NoteProvider
  memoizes its campaign filtering/sorting. No render duration or production
  profiler evidence justifies declaring every context update a performance bug.
- Directory lists are fully rendered; NPC grouping resolves locations with
  per-item linear searches, and expanded relation summaries use linear lookups.
  These are follow-up profiling targets, not substitutes for the measured
  ancestry problem. The existing small-group workload may be entirely adequate.
- There is only **one NavigationProvider** (`index.tsx:77`, `App.tsx:88`). Its
  navigation stack is capped at 50 entries (`NavigationContext.tsx:54,86-98`),
  so it does not have unbounded history growth. Navigation semantics belong to
  the functional review.

The retained build is `main.5f48ff51.js`: **266.644 kB gzip**, under the 275 kB
entry ceiling. It contains **no Lodash source**. The source maps confirm route
barrels group story pages together and entity-kind pages together, while admin
pages split individually; the lazy declarations have not pulled all those pages
back into the eager entry. Markdown's large parser ecosystem is in a deferred
vendor chunk; eager code is dominated by Firebase and routing/React sources.
Uncompressed source-map package lengths are not attributed gzip contribution.

All 21 JS files together total **437.718 kB level-9 gzip**, of which **171.074 kB**
is outside the entry. `App.tsx:33-79` prefetches every lazy route group at idle;
that deliberate navigation/bandwidth trade means the entry ceiling is not a
whole-session download ceiling. Browser prefetch policy/cache can vary, and the
Markdown subdependency is loaded separately, so no claim is made that every
byte downloads on every route. No measured initial-load regression justifies a
new prefetch finding. The build migration decision T059 remains backlog work.

## Historical reconciliation and exclusions

| Historical item | Current disposition |
|---|---|
| Initial progress/refetch loop; PERF-12 | Removed: progress patches, no chapter reload; retained payload/document-growth limits described above |
| PERF-01 whitespace loop | Fixed and bounded probes confirm termination |
| PERF-02 auth restore waterfall | No new auth runtime review; attribution/in-flight cache independently inspected, old 1.5–7.6 s timings not reused |
| PERF-03 global demand | Fixed on nonreading routes; specific quick-add exception is PERF2-003 |
| PERF-04 duplicate/all-campaign notes | One campaign-constrained demand listener; no duplicate note fetch |
| PERF-05 serial chapter shifts | One guarded batch with stable identities |
| PERF-06 attributed writes/full reloads | Five-minute attribution reuse and listener snapshots; no blanket post-write reload |
| PERF-07 switch plus full reload | Context switcher uses context actions; no `window.location.reload` in that component; no auth-switch performance claim |
| PERF-08 duplicate hook collection ownership | Pages/reference consumers reuse provider lists; inspected read hooks have one owner |
| PERF-09 repeated Home profile reads | Cached/coalesced attribution lookup; local recomputation remains |
| PERF-10 eager route bundle/Lodash | Route chunks present, no Lodash sources, current entry within budget |
| PERF-11 hierarchy nontermination/quadratic work | Cycle/depth guards and child index exist; per-hit full ancestry-map rebuild remains PERF2-001 |
| PERF-13 profile/admin duplicate reloads | Ordinary profile changes patch context; AdminCampaignsPage uses the context list, not the deleted CampaignManagementView's second list; no auth mutation workflow executed |
| PERF-14 overlapping autosave | Serialized/coalesced; unchanged snapshots still duplicated in PERF2-005 |
| PERF-15 provider churn/duplicate navigation | Duplicate navigation provider removed; broad context identity churn remains an unranked profiling consideration |

First-pass quota abuse and concurrent extraction charging (SEC-001/SEC-003),
contact abuse (SEC-006), cross-scope writes and stale whole-record updates
(DATA-002/DATA-003), failed cleanup/retry (DATA-004/DATA-010), and pending-upload
sweeping (IMG-003) remain first-pass findings. Their financial consequences are
not counted again here. No production database sizes, billing exports, remote
latencies, reconnect charging, real mobile timing, server resource limits, full
route paint timings or broad React Profiler traces were obtained. The browser
measurements validate pure CPU work only; they do not replace those omissions.
