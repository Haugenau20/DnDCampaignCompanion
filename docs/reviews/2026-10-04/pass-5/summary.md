# Fifth-pass review summary

Date: 2026-10-04. Baseline: `4ebd53362c34840871745386b99f7905de75c26a`,
head of [PR #200](https://github.com/Haugenau20/DnDCampaignCompanion/pull/200).
Application source matches `64fe195`. This separate review PR stacks on the
fourth-pass branch while PR #200 is open. No application fixes are included.

**Four new confirmed findings: two medium and two low, all high confidence.**
Five specialists covered the remaining write-failure, browser-scale, keyboard,
listener-recovery and deployment/restore areas. See [verification](verification.md)
and [evidence/replay](evidence/README.md) for executed boundaries and controls.

## New findings and recommended order

| Order | Finding | Severity | Observed result | Repair and meaningful check |
|---|---|---|---|---|
| 1 | [RECOVERY-003](20-listener-recovery.md#recovery-003--a-terminal-notes-listener-failure-has-no-ordinary-retry) | Medium | A selected native SDK notes-target rejection leaves an error-only list. Disabling the fault and ordinary route return do not recover it; fresh-page/server controls remain healthy. | Expose operation-owned listener retry and reopen the failed effect. Repeat the selected-target failure and ordinary retry; preserve the working shared-collection retry control. |
| 2 | [A11Y-007](19-keyboard-journeys.md#a11y-007--location-and-quest-inline-editors-remove-keyboard-focus-without-returning-it) | Medium | Location/quest inline editing leaves BODY focused after Escape, Cancel and acknowledged save. NPC correctly returns to its name control. The next Tab stays local, rather than restarting at the page top. | Return focus to the retained display control after editor completion, preserving failed/slow saves. Check forward/backward keyboard continuation on actual pages. |
| 3 | [WRITES-001](17-write-failures.md#writes-001--failed-private-note-delete-and-archive-give-no-visible-explanation) | Low | Rejected note Delete closes its confirmation; Archive also provides no visible failure explanation. Original data remains intact and same-page retries work. | Render action-local errors and retain a usable confirmation/retry. Assert visible reason, original server state and successful one-operation retry. |
| 4 | [A11Y-008](19-keyboard-journeys.md#a11y-008--campaign-selection-and-undo-remove-their-focused-controls-without-handing-focus-back) | Low | Successful campaign selection/Undo remove focused controls without a focus handoff. The next Tab reaches Undo/Home; Escape return and live switch confirmation work. | Restore a persistent trigger or explicit successor after completion, retaining immediate Undo and live feedback. |

These are additional roots. Earlier high-severity integrity/security findings
retain priority; no finding count is created for the same prior issue appearing
in another browser journey. Search landing focus is an unranked improvement,
not another ranked finding.

## What the final pass established

| Review | Executed evidence | Additional count |
|---|---|---:|
| [Write failures](17-write-failures.md) | Twelve full-App/local-IO cases. Three create/draft retries, note manual retry and old-image/binary preservation pass; known operation-error gates and two-stage conversion duplication reproduce. Subtree partial deletion is recoverable after reload. | 1 low |
| [Browser scale](18-browser-scale.md) | Production App at 100/1,000/3,000 total records; n=3 filter/search/navigation samples, long tasks, real typed readbacks and twelve route cycles with post-GC heap/DOM/target controls. | 0 |
| [Keyboard journeys](19-keyboard-journeys.md) | Thirteen planned scenarios observed after bounded selector/setup corrections. Native validation, NPC focus return, palette Escape/destination and keyboard note save pass; prior accessibility issues gain full-App evidence. | 1 medium, 1 low |
| [Listener recovery](20-listener-recovery.md) | Exact healthy target capture, controlled native Watch rejection, actual SDK/provider error, ordinary return, independent server/fresh-page controls; NPC Try again reopens and observes a later server edit. | 1 medium |
| [Deployment/restore](21-deployment-restore.md) | Repository configuration comparisons; actual pinned-CLI Firestore/Storage export, owned shutdown, fresh import, exact seven-document comparison, image bytes/selected metadata and six App routes. Missing-hub export fails without creating output. | 0 |

The browser runs a freshly compiled CRA production build with explicit demo
emulator settings. It is the actual App/router/providers/SDK, not a substitute
component harness. Faults and fixtures are synthetic; external browser requests
are blocked. Development emulator rules are permissive. The nine main write
faults received real `INVALID_ARGUMENT` acknowledgements because the diagnostic
precondition used unsupported precision. The corrected note helper requests a
stale precondition, but its exact returned error code was not captured. The
listener error frame is synthesized into real native transport, not claimed as
an emulator-generated or observed production failure.

## Capacity measurements and bounded conclusions

| Total records | NPC rows | Clear filter → full roster, median ms | Warm return to NPCs, median ms | Warm palette search, median ms |
|---:|---:|---:|---:|---:|
| 100 | 40 | 42.6 | 60.8 | 228.5 |
| 1,000 | 400 | 128.2 | 176.4 | 237.1 |
| 3,000 | 1,200 | 346.2 | 569.8 | 238.5 |

These n=3 laboratory timings end at the expected DOM state plus two animation
frames; search includes its intentional 180 ms debounce. Restoring the large
roster produces long tasks and 19,407 DOM elements. Bounded paging/virtualization
and reusable location indexes are proportionate capacity recommendations,
subject to preserving existing interaction/reference semantics. V8 self profiles
are mostly unattributed `(program)` samples and do not establish a precise
inclusive component-time cause.

Visible-route DOM counts and six active collection targets remain stable through
repeated navigation; post-GC heap is nearly flat after initial route warming.
This does not prove absence of every leak or five-minute listener expiry.
Single new-document timings, especially the 38.486-second local-IO outlier,
are unisolated n=1 observations and are not production/device forecasts.

The initial large-data Search run stalled at 15 results. In the fixtures-reusing
follow-up the first query already returned all 30, and stayed at 30 before and
after explicit requery. The episode is consistent with known REACT-007, but
the hydration cause and a requery repair were not causally established. No new
Search finding is counted.

## Prior results strengthened and remaining limits

REACT-002's write-error/read-gate seam reproduces through real edit/attach/delete
and portrait-replacement failure; DATA-005's conversion creates two targets after
a source-mark failure and whole-action retry. REACT-004's failed idle autosave
retains text and permits manual save but lacks a failure reason. Partial subtree
completion stays in the existing deletion repair group. Keyboard evidence
strengthens A11Y-003/004/005 and FUNC-005 without recounting them. The successful
restore path does not repair OPS-001/002 or validate Windows failure handling.

The live deployed rules/indexes/Hosting release/Functions revision remain
unverified: no cloud identity/credentials or allowed public Hosting access are
available. Repository copies do not establish deployed parity. Native Windows,
real physical devices/field metrics, screen-reader speech, other browsers,
production backups/disaster recovery, live supplier behavior and every possible
fault combination remain outside the executed scope. Auth was excluded from
export; ordinary synthetic sign-in was setup, and the stopped authentication/
account-lifecycle review remained stopped.

All requested areas have a bounded assessment or explicit access limit. The
next useful work is implementing the ranked repairs with regression coverage,
and completing live deployment/Windows/device validation when those runtimes
are available. Earlier [review results](../README.md) remain historical records.
