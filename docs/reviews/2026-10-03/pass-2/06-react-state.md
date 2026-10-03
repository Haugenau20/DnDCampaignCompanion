# Second-pass review: non-auth React state and async behavior

Reviewer: GPT-6.1 Sol, xhigh. Date: 2026-10-03. Reviewed commit:
`8c03720020c7772b0bb8b256c4569c8b50c1e495`; application source is identical to
first-pass baseline `64fe19512b1d3bd14427fad8996403a742fbe8a9`.

Seven new findings are confirmed: **one high, five medium, and one low**.
The coordinator executed eight focused actual-source React probes: five state
probes and three search probes, all passing their defect-characterization
assertions. Those results establish the described failures; they are not
passing acceptance tests for the intended behavior.

## Scope and evidence limits

Read `AGENTS.md`, `TODO.md`, the current bug-tracker index, the second-pass
plan, the first-pass summary and the relevant data/image reports. Requirements
were reconciled with the current tree, including the entity-authoring save
contract in `docs/design/plan/15-entity-authoring/00-entity-authoring.md` §7,
gated-page design and the notes authoring records. The older gated-page spec's
group-only notes requirement has changed in current code: notes now require a
campaign. It is not reported as missing functionality.

Inspected these non-auth state seams:

- Collection ownership: `src/shared/hooks/useFirebaseData.ts`,
  `useCampaignCollection.ts`, `useListenerDemand.ts`, the NPC/Quest/Location/
  Rumor/Story providers, and the separate private-note listener/draft store.
- Local UI state: shared `InlineEditor`, `usePendingWrite`, `useSelection`,
  entity directory selection/draft handling, and NPC/quest/location detail
  editors and their page gates.
- Notes: `NoteEditor`, `NotePage`, `NoteContext`, `NotesList`, save scheduling,
  manual/ref saves, first-create tracking and unmount behavior.
- Search/navigation: `SearchContext`, `useSearch`, `CommandPalette`,
  `NavigationContext`, quick-add provider/form lifetime and route reuse.
- Story: progress read/write state in `StoryContext`, `StoryPage`,
  `ChapterReader`, chapter data hooks and the separately fetched saga hook.

The probes execute real React components/hooks under jsdom with synthetic
input collections and controlled service promises. The NPC probes retain the
real `MemoryRouter`, detail page, provider, write hook, editor, page gate and
gated renderer. They mock the already-loaded read collection, unrelated
feature data and the document-service boundary. The search probes retain the
real provider, search service and debouncing hook, mocking only collection
inputs. No real browser, Firebase write, production document, paid extraction
or external message is involved. Geometry for the chapter probe is explicitly
synthetic; prose rendering is stubbed.

Credentials, invitations, account deletion, authentication callback lifetime
and access-control investigation are excluded. The stopped auth review was
not resumed. Performance counts belong to the performance reviewer; broader
functional defects and test-gate protection belong to the other reviewers.
No application source, existing tests, config, dependencies or backlog were
edited. Only this report was written in the repository by this reviewer;
temporary probes were prepared under `/tmp/pass2-react` and run centrally.

## Findings

### REACT-001 — A detail editor carries one record's draft into another record's save

**Severity:** high. **Confidence:** high. **Classification:** new, distinct
from first-pass DATA-002/IMG-001.

**Source at the reviewed SHA:**

- `/workspace/DnDCampaignCompanion/src/pages/npcs/NPCDetailPage.tsx:265–278`
  resolves the record from the current route; `309–325` retains editor flags;
  `483–486` saves the current `npc`; `1009–1019` mounts an unkeyed description
  editor with a newly rendered callback. Related-person links at `393–407`
  provide ordinary navigation to another NPC detail route.
- `/workspace/DnDCampaignCompanion/src/shared/components/inline-edit/InlineEditor.tsx:105`
  initializes its typed value only once; `134–146` submits that value through
  the current callback.
- Same source pattern, not independently executed:
  `/workspace/DnDCampaignCompanion/src/pages/quests/QuestDetailPage.tsx:146–169,291–294`
  and `/workspace/DnDCampaignCompanion/src/pages/locations/LocationDetailPage.tsx:137–159,247–250,636–646`.
- `/workspace/DnDCampaignCompanion/src/app/App.tsx:143,156,173` supplies unkeyed detail
  route elements for `/npcs/:npcId`, `/quests/:questId` and `/locations/:locationId`.

**Trigger:** Open Alice's description editor, type an unsaved draft, then
navigate to Bob through a related-person link, search result or history while
both records are already loaded in the same campaign. React Router reuses
the matching detail component.

**Expected:** A draft/editor belongs to the record that opened it. Changing
record identity should reset, preserve separately or explicitly resolve that
draft before an action can write the new record.

**Actual:** The detail page now shows Bob and renders a callback for Bob, while
the mounted `InlineEditor` still holds Alice's draft. Save writes that draft
to Bob. This occurs before any service await: no delayed attribution lookup,
scope switch or concurrent client is required.

**Impact:** Ordinary navigation can overwrite the wrong shared record's
description. Other open scalar editors use the same identity-free lifetime;
their consequences are source-traced variants of this finding.

**Execution proof:** `state-probes.test.js`, test
`actual reused NPC detail editor submits Alice draft to Bob`, navigates through
the real router from `/npcs/a` to `/npcs/b`. The textarea retains
`Draft belonging only to Alice`. Saving calls the controlled boundary with
`('npcs', 'b', { name: 'Bob', description: 'Draft belonging only to Alice', ... })`.
This proves the UI's wrong target/data pair, not a real persisted Firebase write.

**Fix and verification:** Bind the editing surface and its state to full
record identity, preferably group/campaign/type/id, and decide explicitly how
dirty drafts survive navigation. A scalar `initialValue` update alone must
not overwrite typing on unrelated snapshots. Test the real route transition
for NPCs, quests and locations, with both collections already loaded; verify
that no A draft can call B's mutator and that a late A completion cannot close
a newly opened B editor. Capturing service scope remains necessary for
DATA-002 but does not fix this pre-submit identity mismatch.

### REACT-002 — A rejected write destroys the editor and its Retry cannot recover the page

**Severity:** medium. **Confidence:** high. **Classification:** new; a
cross-layer consequence of the already-fixed tracker #1401 error propagation.

**Source at the reviewed SHA:**

- `/workspace/DnDCampaignCompanion/src/shared/hooks/useFirebaseData.ts:272–291`
  publishes a write error and rethrows.
- `/workspace/DnDCampaignCompanion/src/features/campaign-entities/npcs/context/NPCContext.tsx:41–44,255,267`
  merges that write error into the public error, but exposes the read hook's
  refresh operation separately.
- `/workspace/DnDCampaignCompanion/src/pages/npcs/NPCDetailPage.tsx:283–296`
  passes the merged error to the page gate and binds Retry to `refreshNPCs`.
- `/workspace/DnDCampaignCompanion/src/shared/components/gated/usePageGate.ts:102–111`
  treats this as the page's error state; `GatedContent.tsx:108–124` replaces
  the page body and unmounts its editor.
- Source-traced equivalents:
  `/workspace/DnDCampaignCompanion/src/features/campaign-entities/quests/context/QuestContext.tsx:34–37,409`
  and `/workspace/DnDCampaignCompanion/src/pages/quests/QuestDetailPage.tsx:151–164`;
  `/workspace/DnDCampaignCompanion/src/features/campaign-entities/locations/context/LocationContext.tsx:39–42,296`
  and `/workspace/DnDCampaignCompanion/src/pages/locations/LocationDetailPage.tsx:142–155`.

**Trigger:** A loaded NPC's inline description save rejects at the document
boundary, for example with an unavailable/validation error.

**Expected:** Keep every typed character and show a field-local error, as
entity-authoring §7 requires. Retrying should permit another write; successful
collection loading should remain usable.

**Actual:** `InlineEditor` catches the rejection correctly in isolation, but
the provider's error simultaneously switches `GatedContent` away from the
ready page. The textarea and draft disappear. The visible `Try again` only
refreshes the independent, healthy read instance. It cannot clear the
write-only hook's error, which clears only when another mutation starts.
Those mutations are behind the same error gate.

**Impact:** A failed save loses the local draft and leaves the loaded entity
page blocked even when the read succeeds. The provider lives above the
router, so ordinary navigation does not necessarily reset this write error;
a full provider remount/reload recovers the UI but cannot recover the lost text.

**Execution proof:** The actual NPC provider/write hook/page-gate/editor chain
was mounted. A synthetic rejected update removed the description textbox.
Clicking `Try again` invoked the healthy read refresh once; the error stayed
visible and the textbox stayed absent. The probe mocks only the read result
and service boundary, rather than forcing the page's public error directly.

**Fix and verification:** Separate read/listener failure from operation-local
write failure. Keep a successfully loaded page mounted when one mutation
rejects; let the editor/row present and retry that operation. Retain #1401's
ability to observe write errors without converting them into page-load
errors. Add an integration test across the real provider and page: fail a
save, assert the same typed text remains, retry successfully, and confirm that
the healthy list/read gate never hides the editor.

### REACT-003 — Navigating away before note autosave discards the latest edits

**Severity:** medium. **Confidence:** high. **Classification:** new.

**Source at the reviewed SHA:**

- `/workspace/DnDCampaignCompanion/src/features/collaboration/notes/components/NoteEditor.tsx:71–75,143–144,253–270,327–350`
  keeps editing text locally, schedules a two-second idle autosave, cancels
  its timeout on unmount and clears the thirty-second interval. Keystrokes
  do not publish the text to provider drafts or persistent storage.
- `/workspace/DnDCampaignCompanion/src/pages/notes/NotePage.tsx:139–141,229–235`
  wires `All notes` directly to navigation, without a save/dirty check.
- `/workspace/DnDCampaignCompanion/src/features/collaboration/notes/components/NoteEditor.tsx:405–412`
  leaves that navigation action enabled while dirty or saving.

**Trigger:** Edit a saved note and immediately click `All notes`, another
header route or a search result before the two-second debounce fires.

**Expected:** Preserve the draft across ordinary navigation, flush it before
leaving with failure recovery, or require an explicit discard decision.

**Actual:** Navigation unmounts the editor, cancels its pending save, and drops
the only copy of the new text. Opening the note again loads the prior server
content. The thirty-second interval is not a fallback after unmount.

**Impact:** The end of a writing session is lost during an ordinary action.
Typing continuously keeps extending the debounce, so the affected text may
be everything since the last interval save, rather than only two seconds of
typing. The executed case establishes loss before the first debounce; it
does not measure a maximum production loss interval.

**Execution proof:** The real `NoteEditor` was edited, then its real `All
notes` callback caused parent unmount, modeling `NotePage`'s traced navigation
handler. Advancing synthetic timers by 35 seconds yielded zero calls to
either `updateNote` or `saveNote`. Reopening displayed `Original content`,
not the new text. Firebase/provider boundaries were controlled doubles; the
cancelled scheduling and lost local state are actual component behavior.

**Fix and verification:** Hold drafts outside the editor's lifetime or
implement navigation save/confirmation that keeps the text available when
a flush fails. A fire-and-forget cleanup write alone cannot provide recovery
for a rejected operation. Verify back/header/search navigation before the
debounce, during an in-flight save and after a rejected save; returning must
recover the latest draft or an explicitly confirmed persisted version.

### REACT-004 — Autosave rejection is logged but has no visible failure reason

**Severity:** low. **Confidence:** high. **Classification:** new, distinct
from the fixed manual-save tracker #1051 and from REACT-003's draft loss.

**Source at the reviewed SHA:**
`/workspace/DnDCampaignCompanion/src/features/collaboration/notes/components/NoteEditor.tsx:245–250`
only logs an autosave rejection; `302–309` sets `saveError` for manual save;
`356–385` renders the actual error only when that state is set.

**Trigger:** Pause after typing and have the debounced save reject.

**Expected:** Distinguish an attempted, failed save from a normal waiting
debounce, showing the reason and a clear recovery action while retaining text.

**Actual:** The footer returns to `Unsaved changes`; the reason exists only
in the console. The user is not falsely told the text was saved, and the
text remains mounted. The dirty interval can retry later and Ctrl/Cmd+S can
surface a manual error, which limits the severity.

**Impact:** Someone relying on autosave cannot tell why their note remains
unsaved or whether waiting will solve it. Persistent failures are concealed
behind the same state as ordinary unsaved typing.

**Execution proof:** Rejecting `updateNote` after the real two-second debounce
produced a console error, retained `Unsaved changes`, and rendered no
`Synthetic note save refused` text. One write attempt occurred.

**Fix and verification:** Publish the autosave failure through the same
user-visible save state while keeping the rejection contract required by the
pre-extraction imperative save. Clear it on meaningful recovery. Verify
debounce and interval failure/success transitions, retained text, and the
manual/ref rejection behavior already protected for #1051.

### REACT-005 — Chapters with identical bodies share completion and restore state

**Severity:** medium. **Confidence:** high. **Classification:** new; distinct
from the fixed #018/#852 progress-persistence/merge defects.

**Source at the reviewed SHA:**

- `/workspace/DnDCampaignCompanion/src/features/storytelling/stories/components/ChapterReader.tsx:97–117,188–211,260–268,291–303`
  keeps per-chapter state in refs but resets/restores it only when `content`
  changes. Chapter identity is not a prop/dependency.
- `/workspace/DnDCampaignCompanion/src/pages/story/StoryPage.tsx:148–155,207–221`
  supplies a handler for the current chapter to the same unkeyed reader.

**Trigger:** Navigate between two different chapters with identical body
text. Copying an existing chapter's prose produces this valid state.

**Expected:** Restore the second chapter's saved reading position and give
it its own completion/throttle/cleanup state, even when its prose is equal.

**Actual:** The effect does not run. A short first chapter emits completion
once; the second short chapter inherits the already-complete ref and never
emits its own completion. For long equal-text chapters, saved-position
restoration and pending progress ownership also share the prior effect
lifetime. These long-chapter consequences are source-traced, not executed.

**Impact:** Fully read chapters can remain unread in the persisted progress
map, and resume/navigation can retain the wrong position. The effect
explicitly captures a chapter-specific callback for cleanup, so using body
equality as identity also defeats that ownership protection.

**Execution proof:** Actual `ChapterReader` with a synthetic 500px body and
1000px viewport reported `(100, true)` for chapter A. Rerendering the same
instance for chapter B with identical body, a new title/number and its own
callback produced no B progress callback. Markdown/layout were controlled,
so this proves the missing lifecycle reset, not browser scrolling fidelity
or a real progress write.

**Fix and verification:** Pass an explicit chapter identity or key the reader
by full scope/chapter identity. Keep `position` updates from fighting active
scrolling; identity should reset restoration even when the body is equal.
Verify short and long equal-body chapter switches, distinct saved positions,
pending throttle flushes, and that completion reaches each chapter once.

### REACT-006 — An empty campaign never initializes search, and a transition to empty retains the old index

**Severity:** medium. **Confidence:** high. **Classification:** new.

**Source at the reviewed SHA:**

- `/workspace/DnDCampaignCompanion/src/shared/context/SearchContext.tsx:138,159–164,166–198`
  keeps a single index for the provider's lifetime and returns without
  initializing or clearing it whenever all six document arrays are empty.
- `/workspace/DnDCampaignCompanion/src/shared/components/command-palette/CommandPalette.tsx:188–198`
  displays a skeleton whenever `isIndexReady` is false.
- `/workspace/DnDCampaignCompanion/src/core/services/search/SearchService.ts:38–51,92–95`
  retains initialized records until it is explicitly rebuilt/cleared.

**Trigger:** Open search in a legitimately empty campaign. Alternatively,
delete the last searchable record or switch from a populated campaign to an
empty one, keeping the same top-level provider mounted.

**Expected:** A completed empty load is a ready index with zero results.
Scope changes/deletions must invalidate old indexed records immediately.

**Actual:** With no prior documents, `isIndexReady` stays false forever. After
a prior nonempty index, the zero-document guard retains that index and the
latched ready flag. A freshly executed query still returns old documents,
even though every current collection is empty.

**Impact:** Empty campaigns show permanent loading, and deleted/prior-campaign
records remain searchable and can navigate to missing or same-slug records
in the currently selected campaign. This is a non-auth scope/UI correctness
finding; no account switch or access-control consequence is claimed.

**Execution proof:** One actual provider/hook probe with settled synthetic
empty inputs stayed not ready after five seconds. A second initialized Alice,
changed all current arrays to empty, then ran a fresh `Alice` query. It
returned `alice` despite `currentDocuments: 0`. This tests the common array
transition produced by last-record deletion and by campaign-to-empty changes;
the surrounding campaign switcher and Firestore listener were not executed.

**Fix and verification:** Track scoped load completion separately from
document count. Publish an empty index when all current loads settle empty,
clear/tag the index and results on scope change, and handle failed loads
explicitly. Test initial empty campaign, deleting the final record, and a
populated-to-empty campaign switch with old/new records sharing an id. New
queries must never consult the prior scope's index.

### REACT-007 — Index updates do not rerun the current debounced query

**Severity:** medium. **Confidence:** high. **Classification:** new, distinct
from REACT-006's retained index.

**Source at the reviewed SHA:**

- `/workspace/DnDCampaignCompanion/src/shared/context/SearchContext.tsx:179–180,198,207–225`
  rebuilds the real index but keeps `handleSearch` stable and does not
  recompute the current results.
- `/workspace/DnDCampaignCompanion/src/shared/hooks/useSearch.ts:78–87`
  executes only when the debounced query, stable search callback or minimum
  length changes; index readiness/version is absent.

**Trigger:** Open search and type a valid query while the asynchronously
loaded collections are still empty. Let the matching collection arrive
without changing the query. The same stale-results seam applies to live
record edits/deletes after a search, even when the index remains nonempty.

**Expected:** Once the current index is ready or changes, results for the
unchanged visible query should match that index.

**Actual:** The early query runs against an empty index. Data later builds a
healthy index and marks it ready, but results stay empty. The palette can
therefore present a real no-results state for a record that is indexed and
would match immediately. Editing or repeating the query repairs the result.

**Impact:** Ordinary search during initial listener loading produces a false
miss; already displayed matches can also remain stale after index changes.
Unlike REACT-006, the index in the executed case is correct: repeating the
same query returns the matching record.

**Execution proof:** Using the actual provider/service/debounce hook, `Alice`
was typed and the 180ms debounce advanced before Alice arrived. After the
collection arrived and another five seconds elapsed, state was
`isIndexReady: true`, `query: Alice`, `results: []`. Explicitly executing the
same query then returned one Alice result. No synthetic delayed search
implementation was used; the production search service is synchronous and
the defect is its scheduling against changing collection inputs.

**Fix and verification:** Publish a scoped index version/readiness signal
and schedule the active valid query when that version changes. Avoid
depending on the results array itself, which would create a search loop;
the current hook's comment correctly identifies that trap. Verify data
arrival after typing, matching-record edits/deletion and scope changes;
unchanged query results should refresh without redundant self-triggering.

## Executed checks and durable evidence

The coordinator ran these commands from `/workspace/DnDCampaignCompanion`:

```bash
node node_modules/jest/bin/jest.js --config /tmp/pass2-react/jest.config.cjs --runInBand --watch=false
node node_modules/jest/bin/jest.js --config /tmp/pass2-react/jest.config.cjs --runInBand --watch=false --runTestsByPath /tmp/pass2-react/search-probes.test.js
```

At the time of the first command only the five state tests were present;
**5/5 passed**. The subsequent search-only command produced **3/3 passed**.
Running the first command against the final preserved folder discovers all
eight. The external Jest config disables type diagnostics for these JS
diagnostic harnesses and stubs unrelated Firebase/Markdown dependencies; it
is not a substitute for the project's type/build/test gates. A resolver
setup issue with a broad `moduleDirectories` override was removed before
the central execution; React/RTL/router imports in the temporary tests use
explicit repository dependency paths. No failing diagnostic setup is
reported as an application defect.

Durable copies supplied by the coordinator:

- [State probe source](evidence/probes/react/state-probes.test.js).
- [Search probe source](evidence/probes/react/search-probes.test.js).
- [Probe config](evidence/probes/react/jest.config.cjs).
- [State output](evidence/outputs/react-state.txt).
- [Search output](evidence/outputs/react-search.txt).

The green first-pass full baseline is reused because application source,
tests and gates are byte-identical; see [../baseline.md](../baseline.md).
These new seam probes explain why that baseline can coexist with the seven
failures. Full suites/emulators were not started by this reviewer.

## Inspected safeguards, exclusions and unresolved leads

These observations are bounded source checks, not additional confirmations:

- `useCampaignCollection` renders only data associated with its current
  subscription path; `useFirebaseData` returns empty data on a path mismatch.
  Listener effects return their unsubscribe callbacks. `useListenerDemand`
  gives each holder an idempotent release, cancels linger on reacquisition,
  and clears its closing timeout when the provider unmounts. No confirmed
  missing collection-unsubscribe defect was found in those inspected paths.
- `StoryContext` tags its progress read location and uses a `current` cleanup
  flag to drop an abandoned read; pending local changes merge over a late
  current-scope read. That explicit guard was not generalized into a claim
  that all async hooks are safe. In particular `useSagaData.ts:31–60,164–166`
  has unguarded async result/loading updates across non-auth campaign changes.
  A reordered-saga-read probe was not executed; this remains an unresolved
  lead rather than an eighth confirmed finding.
- `NoteEditor` already coalesces overlapping save requests and reads fresh
  field refs for a queued save; `createdIdsRef` in `NoteContext` addresses the
  just-created draft's second save. Their normal same-editor behavior should
  be preserved when fixing navigation. Queued save behavior after unmount,
  note-id reuse while a save is pending and browser/tab-close durability were
  not executed. The performance report owns redundant unchanged save counts.
- `NotePage.tsx:41–96` stores cross-campaign fallback/missing/in-flight flags
  without a scope/id reset or stale-response guard. Its same-route parameter
  switch and overlapping direct-read variants were source leads only; the
  confirmed blank cross-campaign note workflow is owned by the functional
  report. Neither is counted again here without its own executed scenario.
- `NoteContext.tsx:85–100,512–531` has listener error publication but no
  explicit retry operation; `NotesList.tsx:105–111` renders that error without
  a retry control. No actual failed SDK listener/recovery probe was executed.
  This remains a recovery coverage limit, not a new ranked issue.
- `useFirebaseData` keeps `getData()` snapshot waiters in a shared ref and
  releases them on the next snapshot, with no explicit unmount cancellation.
  Current entity listener/write separation limits reachable consumers of
  those waiting values. A pending A waiter resolving with B or never settling
  after unmount was not promoted to a user-facing bug without a traced caller.
- The four directories share `useSelection`; data-loading gates can unmount
  them during campaign changes. No cross-campaign destructive selection
  scenario was executed. Do not infer one merely because the generic hook
  has no campaign parameter. The rumor directory separately stores per-
  campaign drafts and hydrates them on campaign change.
- `usePendingWrite.ts:34–41` builds a mounted cleanup function without
  registering it in an effect. No concrete user consequence was established
  from post-unmount state calls under React 18, so this is an implementation
  concern rather than a counted bug.

## Reconciliation and fix order

First-pass DATA-002/IMG-001 wrong-scope writes and DATA-003/IMG-002 stale
whole-record writes remain applicable. REACT-001 adds a different cause:
the UI pairs the previous record's draft with the next record's callback
before submitting. Service path capture and field-patch fixes alone leave
that path reachable. The stopped auth agent's AUTH-003 result is neither
expanded nor counted here.

Tracker #1401's dropped writer-error problem is already fixed; REACT-002
records the new consequence of feeding the now-visible operation error into
a page-load gate. Tracker #1051 protects the manual/ref-save rejection
contract; it does not establish autosave failure feedback or navigation
durability. Tracker #018/#852 progress persistence/merge fixes are retained;
REACT-005 concerns per-chapter reader identity. No backlog or tracker entries
were changed by this assessment.

Fix record-bound editor lifetime first, then separate operation failures from
page loading and preserve note drafts across navigation. Search needs scoped
empty-load initialization plus query/index synchronization; those are two
separate state transitions. Chapter identity should govern reader restoration
and completion. Add focused integration tests at the actual provider/page
seams and retain the meaningful existing save/progress regressions.
