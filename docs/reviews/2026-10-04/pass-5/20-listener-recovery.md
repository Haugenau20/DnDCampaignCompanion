# Fifth-pass review: terminal listener failure and recovery

Date: 2026-10-04. Reviewed baseline:
`4ebd53362c34840871745386b99f7905de75c26a` (PR #200), with application
source unchanged from `64fe19512b1d3bd14427fad8996403a742fbe8a9`.
Review branch: `docs/code-review-pass-5-2026-10-04`.

**One new finding is confirmed: RECOVERY-003, medium severity and high
confidence.** A controlled native SDK target rejection leaves the notes list
blocked without a retry; immediate ordinary navigation back does not reopen it.
The notes still exist and a fresh page reads them correctly. The shared NPC
read Retry successfully reopens its listener and observes a later server edit.

## Scope and evidence boundaries

Read `AGENTS.md`, `TODO.md`, the live behavioural tracker, all four earlier
review summaries, the fourth-pass browser recovery report and both its terminal
probe and outputs. Inspected the actual notes provider/list, shared collection
subscription/retry/waiters, listener demand, NPC provider/list route and document
service. Reconciled the existing REACT, DATA and RECOVERY findings rather than
recounting them.

The fourth pass observed local XHR/Fetch traffic but captured no notes target,
injected no error and verified no terminal SDK callback. Those attempts remain
unverified. This pass maps the installed SDK's protocol before repeating:
`DocumentService.subscribeToCollection` delegates to native `onSnapshot`;
WebChannel carries length-prefixed JSON frames; incoming `documentChange`
contains the full document name and `targetIds`. A `targetChange` with type
`REMOVE`, explicit selected target IDs and a `cause` is processed by the native
Firestore remote store through `rejectListen`. By contrast a stream transport
failure causes its connection to reopen automatically. The diagnostic targets
the former and makes no claim that ordinary offline/transport interruption is
a terminal listener failure.

Prepared and centrally executed `/tmp/pass5-listener/listener.cjs`, exporting
`seed(api)` and `run(api)` without starting a browser/server. It seeds one synthetic private note and one
synthetic NPC in the coordinator's dedicated local demo project. Each scenario
begins with a healthy visible record and captured target mapping, then arms a
Fetch-stream transformation restricted to loopback Firestore Listen requests
on port 8080. An independent Admin SDK update provides the selected event. The
transform replaces exactly one native Watch event with selected-target
`REMOVE`/cause code 14, preserving frame lengths. It records the original and
replacement payload, target provenance, native error console output and UI.
Application callbacks, services and providers are not replaced or directly
called. The synthetic injected frame tests SDK/application terminal-target
handling; it does not establish an emulator-generated or production server
failure frequency.

The coordinator ran the production App in Chromium at `127.0.0.1:3001` with
local demo emulators, and owns independent server readbacks. Dedicated fixture
scope: `pass5-group-listener`, `pass5-user-listener`, `review-listener` in
`demo-review-pass5`. The NPC-only follow-up uses separate
`pass5-group-listener-npc`, `pass5-user-listener-npc` and
`review-listener-npc` fixtures in that demo project. Notes checks use ordinary Privacy Policy → Notes
navigation and a fresh-page healthy control. NPC checks use the actual `Try again` control,
then an independent server rename to distinguish a live reopened listener
from cached or one-shot data. Each scenario stops early if its healthy UI or
exact target capture cannot be established; at most two selected terminal
injections belong to this assignment.

Authentication/account lifecycle and access-policy investigation remain stopped.
No production data, credentials, real email, paid model, deployment or changes
to application source, tests, rules, configuration, dependencies or backlog are
part of this assignment.

## RECOVERY-003 — A terminal notes listener failure has no ordinary retry

**Severity:** medium. **Confidence:** high. **Classification:** new; confirms
the earlier unverified terminal-listener recovery lead.

**Source at the reviewed SHA:**

- [NoteContext.tsx:85](../../../../src/features/collaboration/notes/context/NoteContext.tsx#L85)
  opens the notes listener in an effect keyed to path/campaign/demand. The error
  callback at lines 93–96 publishes `Failed to fetch notes` and an empty stored
  snapshot; the effect has no retry attempt dependency. Its public value at
  lines 512–531 exposes no retry operation.
- [NotesList.tsx:105](../../../../src/features/collaboration/notes/components/NotesList.tsx#L105)
  renders the error alone; no ordinary retry control is offered.
- [useListenerDemand.ts:12](../../../../src/shared/hooks/useListenerDemand.ts#L12)
  keeps demand alive for five minutes after the last reader leaves. An ordinary
  immediate route return therefore need not change the notes subscription key
  or reopen a terminally closed listener. A sufficiently long zero-demand
  interval, campaign change or full provider remount can change the effect
  ownership; none should be described as permanent data loss.
- [useFirebaseData.ts:130](../../../../src/shared/hooks/useFirebaseData.ts#L130)
  releases first-snapshot waiters with an empty array on listener error.
  [useFirebaseData.ts:180](../../../../src/shared/hooks/useFirebaseData.ts#L180)
  resets the latest snapshot and bumps `attempt` for an explicit retry after
  failure; the new effect clears the error and waits for a fresh snapshot.
- [NPCsPage.tsx:28](../../../../src/pages/npcs/NPCsPage.tsx#L28)
  wires actual page Retry to the read provider's `refreshNPCs`, through
  [useCampaignCollection.ts:48](../../../../src/shared/hooks/useCampaignCollection.ts#L48).

**Trigger:** Open the healthy saved notes list in a local full-App browser.
Capture native target 10 from both its outgoing filtered notes query and the
incoming exact seeded note document name. Arm the loopback Watch transform,
then update that synthetic note independently through the Admin SDK. Replace
one selected target event with `REMOVE`, target ID 10 and cause code 14.

**Expected:** A failed terminal subscription can be retried after its failure
condition clears, with an ordinary visible recovery action. Revisiting the
notes should not silently preserve a closed subscription while the server and
application transport are healthy. Retain existing campaign isolation and
listener demand behavior.

**Observed:** The original selected event was a target-specific `RESET`; it
was changed into the recorded `REMOVE`/cause frame. The actual SDK invokes
the provider callback, logging `Error listening to notes: FirebaseError:
Synthetic loopback notes or collection target failure`. The list becomes
`Failed to fetch notes`, with no retry control. After disabling the transform,
the actual Privacy Policy link and Notes navigation button return to the same
error. The Watch request count stays eight and no notes target is reopened.
A fresh unmodified page shows `Pass5 Terminal Note` and the independent server
update, `Synthetic server change triggers selected native terminal event.`
The Admin read confirms that title/body and the original persisted metadata.

**Impact and limits:** A recoverable terminal read-target failure blocks the
private notes list for its current subscription lifetime, forcing a reload or
scope/demand reset. Saved note content is not deleted. A sufficiently long
zero-demand interval or campaign change can reopen the effect; neither was
executed here. The failure frame is synthetic, but the target mapping, SDK
terminal error, actual provider/UI, ordinary route return and fresh-page/server
controls are observed. This establishes handling after that native failure;
it does not establish the frequency of server-generated code-14 target errors,
production authorization failures or normal offline SDK reconnection behavior.

**Fix and validation:** Give the notes provider an explicit failed-listener
retry operation that changes the subscription attempt, clear its matching
error on retry, and expose an ordinary list recovery control. Keep retries
owned by the full notes scope and avoid blind retries of permanent failures.
Repeat this selected-target native-error sequence from a healthy list; retry
must restore the correct campaign notes and observe a subsequent independent
server update. Keep listener demand linger for healthy subscriptions, and
verify a changed campaign cannot display the previous scope.

**Evidence:** `listener-notes-healthy-target-captured` and
`listener-notes-native-terminal-recovery` in
[main observations](evidence/outputs/listener/main-observations.json),
[central output](evidence/outputs/listener/main-results.txt),
[executed initial probe](evidence/probes/listener/listener.cjs),
[failed list](evidence/outputs/listener/listener-notes-failed.png) and
[ordinary returned list](evidence/outputs/listener/listener-notes-returned.png).

## Shared collection retry and waiter ownership

**Passing actual-provider/native SDK control:** The fixture-corrected NPC-only
run begins with `Pass5 Terminal NPC` visible and exact native target 10 captured
from the outgoing collection query and incoming full document name. Its
selected `RESET` is transformed into the same native `REMOVE`/cause-14 failure.
The actual shared hook logs its listener error and the page shows the matching
load error plus `Try again`. After disabling the transform, the ordinary
button restores the directory. The outgoing log records a new Listen request
for the same full NPC query, and an independent Admin rename then appears as
`Pass5 Terminal NPC Recovered` in the actual directory and server readback.
This demonstrates continuing subscription recovery, beyond cached display.
The captured total Watch request count rises from seven at failure to ten
after recovery; the probe does not isolate request billing or retry read cost.

[Follow-up observations](evidence/outputs/listener/npc-observations.json),
[central output](evidence/outputs/listener/npc-results.txt),
[executed follow-up](evidence/probes/listener/npc-followup.cjs),
[failed directory](evidence/outputs/listener/listener-npcs-failed.png) and
[recovered directory](evidence/outputs/listener/listener-npcs-recovered.png)
preserve the positive control.

First-snapshot waiters lack explicit per-path/unmount cancellation at
[useFirebaseData.ts:95](../../../../src/shared/hooks/useFirebaseData.ts#L95).
Production page Retry callers ignore returned arrays; the quest provider wraps
refresh as void. No concrete additional wrong-result consumer or user-visible
waiter-ownership failure has been established. This remains an unranked source
lead, rather than a new finding.

## Reconciliation and remaining limits

REACT-002 concerns a mutation failure merged into the page error while Retry
refreshes a different healthy read instance. This diagnostic instead examines
an actual SDK read-target rejection and its corresponding read retry. REACT-004
concerns autosave failure feedback. RECOVERY-001/002 own the already-observed
note queue and fallback identity failures; neither is reprobed or counted here.

The initial central run completed with exit zero and established the notes
finding. Its NPC positive control stopped before arming: the diagnostic seed
omitted required `relationship`, and `NPCDirectory.tsx:495` threw on that
missing fixture field. The selected NPC target was already captured, but no
NPC terminal error or retry was injected. This is a harness fixture error,
not an additional product finding. `/tmp/pass5-listener/npc-followup.cjs`
adds the complete required NPC shape and runs only that positive control.
That follow-up completed with exit zero and confirmed working native
read-listener recovery. Two selected terminal injections were executed across
two central runs; no further experiments were needed. Both probes pass
`node --check`.

The first run’s browser page-error collector covered the original coordinator
page, while these cases used newly opened pages. Their own console output
is retained; no blanket absence-of-page-errors claim follows from the
coordinator’s empty list. The NPC follow-up captures errors on all newly
opened pages and reports none. External resource failures are blocked-browser
setup effects and are distinct from the recorded native listener error.

No fresh full test/type/build gate is claimed for this documentation-only
assignment. Production transport/policy parity, long demand expiry, physical
devices, hard crashes and direct-read response reordering remain outside this
probe.
