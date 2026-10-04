# Fourth-pass review: browser failure and recovery

Date: 2026-10-04. Reviewed baseline: `c2d8a88d0541b01c0f9cc2e7c497206a29746ce5`,
with application source unchanged from `64fe19512b1d3bd14427fad8996403a742fbe8a9`.
Review branch: `docs/code-review-pass-4-2026-10-04`.

**Two additional findings are confirmed, both medium severity and high
confidence:** a queued note save changes record ownership after navigation,
and the note page retains another route's fallback state. Five main browser
scenarios and one ordinary-navigation follow-up completed centrally. Two
attempts to inject a terminal notes listener error did not trigger; that lead
remains unverified and is excluded from findings.

## Scope and evidence boundaries

Read `AGENTS.md`, `TODO.md`, the current behavioural tracker, all three prior
summaries, the second-pass React/functional reports and current authoring/gated
page records. Inspected the actual note provider, editor, list and route,
listener-demand lifetime, shared collection subscription/retry/snapshot waiter,
Firestore initialization and write/read service boundaries. Entity-authoring
§7 requires retaining typed characters after a failed write and waiting for
acknowledged persistence before showing success. The note route explicitly
promises viewing owned notes from another campaign; serialized saves must
retain the existing same-editor typing and coalescing protections.

The coordinator ran the complete CRA App in Chromium against local Auth,
Firestore, Functions and Storage emulators. This specialist prepared modules
under `/tmp/pass4-recovery`, exporting fixture `seed(api)` and browser
`run(api)`, without starting a browser/server or running full suites. Fixtures
are synthetic notes in `groups/review-group/users/review-user/notes`, reviewer
campaigns and a second campaign `review-recovery-b`. Writes and reads use the
actual application Firebase SDK and emulator; server verification uses the
local Admin SDK independently of browser latency compensation.

Observed save faults are controlled browser offline mode and a Write-channel
block restricted to `127.0.0.1:8080`/`localhost:8080`. The central runner blocks
external browser requests. Proposed terminal-error transforms were similarly
restricted to the local notes Watch target, but never selected that target or
injected an error. They establish no terminal recovery behavior. Ordinary
fallback confirmation uses the actual campaign menu and exact note Search
option; its earlier supplemental cases use a synthetic browser history entry
plus a real `popstate` event with the full router/provider/page mounted.

Authentication, account lifecycle and access-control review remain stopped.
Ordinary local sign-in and shared-tab persistence are test setup only. No
production data, paid model, real email, deployment, application-source/test/
rule/config/dependency change or backlog update belongs to this review.

## Findings

### RECOVERY-001 — A queued note save transfers to the next note and drops its own latest submitted text

**Severity:** medium. **Confidence:** high. **Classification:** new, distinct
from REACT-001, REACT-003 and DATA-002.

**Source at the reviewed SHA:**

- [NoteEditor.tsx:167](../../../../src/features/collaboration/notes/components/NoteEditor.tsx#L167)
  captures the current note and writes both current field refs at lines
  170–185. Its load effect at lines 115–134 correctly loads a different note's
  fields when `noteId` changes.
- [NoteEditor.tsx:210](../../../../src/features/collaboration/notes/components/NoteEditor.tsx#L210)
  stores the latest callback independently of record identity. Lines 212–240
  keep one in-flight promise and queued slot for the component lifetime;
  the follow-up calls the latest callback at lines 217 and 238 rather than
  the callback/record that owned the queued request.
- [NotePage.tsx:229](../../../../src/pages/notes/NotePage.tsx#L229)
  mounts an unkeyed editor. [App.tsx:198](../../../../src/app/App.tsx#L198)
  supplies an unkeyed `/notes/:noteId` route, and
  [CommandPalette.tsx:90](../../../../src/shared/components/command-palette/CommandPalette.tsx#L90)
  navigates directly between note routes.
- [NoteContext.tsx:212](../../../../src/features/collaboration/notes/context/NoteContext.tsx#L212)
  resolves the submitted ID from the captured note list and writes the
  explicit private-notes collection at lines 217–241. The observed campaign
  and group remain unchanged throughout; service scope redirection is not
  required.

**Trigger:** Load saved note A and prime the header's Search result for saved
note B. Go offline, edit A, and press Ctrl+S. While that save is pending, type
a newer A version and press Ctrl+S again. Choose B using the real Search
result, then reconnect. B's original title/body load correctly before the
first A write completes.

**Expected:** A's explicitly requested follow-up persists A's latest text,
or reports an incomplete save while retaining a recoverable A draft. Opening
B must not transfer that queued action to B.

**Observed:** Before reconnect, the server still holds both original records.
After reconnect A holds only `First explicitly submitted version of note A.`;
`Latest explicitly queued version of note A.` is absent. B retains its own
correct original body, but its `updatedAt`/`dateModified` advance from the seed
value to `2026-10-04T06:35:26.899Z`, and B's footer changes from `Saving...` to
`Saved just now`. The queued A request has executed against B's latest
callback. No visible failure or recoverable A draft remains.

**Impact and limits:** A's newest explicitly submitted private-note text is
lost through ordinary note-to-note navigation during a slow/offline save. The
executed B record receives a redundant write and incorrect modification
ownership; it is not overwritten with A's prose. This differs from REACT-001,
where the old scalar draft is submitted to the next record before any await.
It differs from REACT-003's cancelled debounce: a second manual save was
already queued here. It does not require a campaign/group switch or the
mutable-path defect in DATA-002.

**Fix and validation:** Bind editor/save-queue lifetime to full note identity,
or keep independent record-bound save jobs/drafts with immutable target paths.
Coalesce newer text only within that identity. A simple way to preserve the
existing serialized behavior is to give different note identities different
editor instances; the unmount control below demonstrates that an old queued
save can finish against its original note. Re-run this actual Search/offline
sequence and assert latest A text persists, B receives no A-owned write, and
B never inherits A's saving/success/error state. Keep same-note continuous
writing, repeated manual-save coalescing and first-create protections; do not
replace the fresh-field behavior with a stale same-record snapshot.

**Evidence:** `queued-route-before-reconnect` and
`queued-route-after-reconnect` in
[final observations](evidence/outputs/recovery/final-observations.json),
[central output](evidence/outputs/recovery/final-results.txt),
[probe](evidence/probes/recovery/recovery.cjs), and
[screenshot](evidence/outputs/recovery/recovery-queued-route-after-reconnect.png).

### RECOVERY-002 — Another note's fallback or missing state survives ordinary route/campaign changes

**Severity:** medium. **Confidence:** high. **Classification:** new; the
previously unverified NotePage identity lead, distinct from FUNC-001.

**Source at the reviewed SHA:**

- [NotePage.tsx:41](../../../../src/pages/notes/NotePage.tsx#L41)
  stores fetched note, in-flight and missing state without tagging/resetting
  them by route identity or campaign. Lines 55–62 suppress a direct fetch
  whenever the old fallback or missing flag remains set. Lines 70–90 also
  commit direct-read responses without an identity guard.
- [NotePage.tsx:125](../../../../src/pages/notes/NotePage.tsx#L125)
  chooses `currentCampaignNote || crossCampaignNote`; the stale fallback
  therefore becomes the displayed record once the current route's note
  disappears from the active-campaign list. The heading uses it at line 175.
- [App.tsx:198](../../../../src/app/App.tsx#L198)
  reuses the note route component. Search opens the requested note at
  [CommandPalette.tsx:90](../../../../src/shared/components/command-palette/CommandPalette.tsx#L90),
  and [ContextSwitcher.tsx:142](../../../../src/shared/components/context-switcher/ContextSwitcher.tsx#L142)
  changes campaign through the existing page rather than resetting its local
  fallback state.

**Ordinary trigger:** With campaign A active, open owned `recovery-cross-a`
from campaign B. Use the actual campaign menu to select B; A's saved fields
now load normally. Search for and open `recovery-cross-b`; the route, heading
and body correctly show that second note. Select campaign A again while
staying on the second note route.

**Expected:** The second note remains the only eligible fallback for its URL.
A route's cached miss/fetched result must never suppress another identity's
lookup or supply its heading/banner. Campaign changes should invalidate any
fallback whose identity/scope does not match the current request.

**Observed:** After returning to A, the URL stays `/notes/recovery-cross-b`,
but the heading becomes `Recovery recovery-cross-a`. Both notes still exist
with distinct titles and bodies in the emulator. Before that campaign switch,
the second note's real heading/body were verified correct. No synthetic
history navigation, application-service replacement or component mock is
used in this confirmation.

Supplemental same-route probes also show that a prior missing-note lookup
leaves an existing other-campaign note stuck at `Note Not Found`, and that a
fetched first fallback supplies the heading after moving to a second fallback
URL. Those two transitions use the explicitly synthetic history adapter; the
ordinary menu/Search scenario independently establishes the shared cause.

**Impact and limits:** Ordinary campaign/record navigation displays another
note's identity or falsely reports that an existing note is missing. The
blank read-only fields are already FUNC-001 and are not counted again. Passing
the fetched note into a reader would leave this stale-fallback cause intact
and could then render the wrong note's prose. Neither unauthorized disclosure
nor a wrong-record delete/write is claimed from these observations. Direct
async response reordering is source-traced but was not separately executed.

**Fix and validation:** Key fallback/missing/in-flight state by full lookup
identity, discard mismatched cached state synchronously, and guard async
commits with that identity/request ownership. Preserve #800/#1150/#1151's
bounded-fetch-loop fixes while permitting a new identity to fetch. Re-run the
actual campaign/Search sequence and the missing-to-existing transition;
correct URL, heading, campaign banner and persisted body must agree. Add a
controlled delayed A-read/B-navigation check so a late A result cannot become
B's fallback. Keep FUNC-001's explicit fetched-data handoff as separate work.

**Evidence:**
[ordinary observations](evidence/outputs/recovery/ordinary-observations.json),
[ordinary output](evidence/outputs/recovery/ordinary-results.txt),
[ordinary probe](evidence/probes/recovery/ordinary-fallback.cjs), and
[screenshot](evidence/outputs/recovery/recovery-ordinary-fallback.png).
The supplemental `fallback-*` records are in the final main observations.

## Controls and existing-issue reconciliation

| Completed browser case | Actual observation | Mapping |
|---|---|---|
| Offline save, second manual save, then All notes | The server remains unchanged offline. After the editor unmounts and networking returns, `Latest queued save retained after full editor unmount.` persists on the original note. | Passing queued-save/unmount/reconnect control; preserve this when repairing RECOVERY-001. It does not establish durability before any save is requested. |
| Two ordinary same-account tabs | A's body change is server-confirmed. B continues showing the old body; changing only B's title then saves that old body back. | DATA-003 independent-field/stale-write evidence, not a new count. `NoteEditor.tsx:115–116` ignores subsequent same-note snapshots and lines 170–185 always submit both fields. |
| Reload with a local Write-channel block | Two Write requests are blocked; the editor shows submitted text and `Saving...`, while the server retains the original. After reload/removing the block, both server and editor still show the original text and the old saved timestamp. | Broader REACT-003 note-durability evidence, grouped rather than counted again. This reaches an SDK-queued save and real reload, beyond the earlier cancelled-debounce probe. No server acknowledgement occurred. |

The reload result supports retaining drafts durably or protecting departure
while persistence is pending; keeping a provider-only draft across SPA routes
would not cover document reload. [BaseFirebaseService.ts:63](../../../../src/core/services/firebase/core/BaseFirebaseService.ts#L63)
uses `getFirestore` without configuring a persistent Firestore cache. The
experiment does not cover a tab crash, OS termination, maximum lost-text
interval or a write already acknowledged by the server.

Tracker #1051's manual/ref-save rejection protection remains valid and is not
refiled. Same-note serialization and first-create tracking remain useful.
RECOVERY-001 exposes record ownership across that serialized queue; it does
not claim normal same-note saves overlap. Tracker #800/#1150/#1151 fixes
prevent old refetch loops; RECOVERY-002 concerns reuse of their settled state.
FUNC-001, REACT-001/003 and DATA-003 remain in their original issue groups. No
tracker/backlog entries were changed.

## Unverified recovery leads and execution limits

The private-note listener's terminal-error recovery remains unverified.
[NoteContext.tsx:93](../../../../src/features/collaboration/notes/context/NoteContext.tsx#L93)
publishes an error/empty snapshot, exposes no retry at lines 512–531, and
[NotesList.tsx:105](../../../../src/features/collaboration/notes/components/NotesList.tsx#L105)
has no retry control. Listener demand lingers for five minutes after the last
reader leaves ([useListenerDemand.ts:12](../../../../src/shared/hooks/useListenerDemand.ts#L12)).
These are source leads, not observed terminal SDK failure/recovery.

The first attempted transform targeted native XHR response text, while the browser SDK
uses Fetch streaming by default. A bounded follow-up observed six local Fetch
requests and 14 frames but captured no notes target ID, injected no error and
left the notes list healthy. Each attempt stopped after its 15-second wait.
No product finding follows from these harness misses; no injected callback,
closed target or failed ordinary retry was observed. See
[terminal output](evidence/outputs/recovery/terminal-results.txt),
[terminal observations](evidence/outputs/recovery/terminal-observations.json)
and [bounded follow-up](evidence/probes/recovery/terminal-listener.cjs).

[useFirebaseData.ts:95](../../../../src/shared/hooks/useFirebaseData.ts#L95)
keeps shared snapshot waiters without explicit per-path/unmount cancellation.
The traced page Retry callers ignore returned arrays, and the quest provider
wraps its refresh as void. No concrete new user-visible wrong-result consumer
was established; waiter ownership remains unranked. Listener errors do release
waiters at lines 130–138, and shared collection retry reopens a failed target
at lines 180–186. Actual collection retry after a terminal error was not
established in this pass.

The corrected central main run exited zero with five completed scenarios and
one untriggered terminal case. The ordinary-navigation follow-up exited zero.
Initial loose Search matching, a non-shared initial test session, and a central
routing-teardown race were corrected; their partial output is diagnostic
history only. Probe syntax checks passed. Full gates reuse the byte-identical
source baseline; no fresh full-suite/build result is claimed here. Physical
devices, other browsers, production transport/policy parity, hard tab close,
crash recovery and reordered direct-note reads remain outside this evidence.
