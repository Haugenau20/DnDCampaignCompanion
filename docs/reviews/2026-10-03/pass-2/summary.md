# Second-pass consolidated review

Reviewed commit and stack base: `8c03720020c7772b0bb8b256c4569c8b50c1e495`,
the head of [PR #196](https://github.com/Haugenau20/DnDCampaignCompanion/pull/196).
Application source is unchanged from the first-pass baseline `64fe195`.
This pass supplements the [first-pass summary](../pass-1-summary.md); it does
not replace or reprioritize its security/concurrency/deletion findings.

**Four specialist reviews completed: functional workflows, non-auth React
state, performance/scalability/cost, and test quality. There are 18 additional
product/performance issues: 2 high, 13 medium and 3 low.** Seven concrete test
protection gaps are recorded separately: 2 high, 4 medium and 1 low. Those gaps
explain why existing tests accept failures already reported in this or the first
pass; they are not seven additional application defects. The four reports
therefore contain 25 entries in total, with no repeated first-pass production
issue counted as new. Some performance entries revalidate residual work from
the historical performance review, as their classifications explain.

The coordinator executed **20 focused checks across 10 diagnostic suites**, all
passing assertions that characterize current behavior (including two preserved
route-budget controls). An existing ten-test objective suite passed unchanged;
an in-memory field-only patch caused **four expected assertion failures and six
passes**, demonstrating a defective test contract. Actual-function Node and
isolated Chromium benchmarks completed. Full type/lint/build/frontend/Functions
gates are reused from the byte-identical first-pass baseline, not claimed as new
runs. See [verification.md](verification.md) and [saved evidence](evidence/README.md).

Only review documents, indexes and diagnostic evidence changed. No application
fixes, existing tests, dependencies, rules, configuration, backlog or deployment
were modified. The authentication/account-lifecycle reviewer remains stopped at
the maintainer's instruction and was not resumed or replaced.

## Coverage

| Area | Model/reasoning | Result | Report |
|---|---|---|---|
| Functional workflows and recovery | GPT-6.1 Sol, xhigh | 6 findings: 1 high, 4 medium, 1 low; 7 component/hook diagnostics | [05-functional-workflows.md](05-functional-workflows.md) |
| Non-auth React state and lifecycle | GPT-6.1 Sol, xhigh | 7 findings: 1 high, 5 medium, 1 low; 8 state/search diagnostics | [06-react-state.md](06-react-state.md) |
| Performance, scalability and cost | GPT-6 Astra, xhigh | 5 findings: 4 medium, 1 low; deterministic counts, Chromium CPU measurements and 5 listener/save checks | [07-performance.md](07-performance.md) |
| Test quality and protection | GPT-6 Astra, xhigh | 7 gaps: 2 high, 4 medium, 1 low; existing-suite sensitivity plus cross-review evidence | [08-test-quality.md](08-test-quality.md) |
| Independent verification and consolidation | Coordinator | Ran specialist probes, checked source paths/causes, reconciled historical fixes and overlaps, preserved evidence | [verification.md](verification.md) |

Completion applies to each report's documented inspected scope. It does not
mean every repository behavior was exercised. React probes use controlled IO;
Chromium executes pure functions on a blank page, not a signed-in application.

## Ranked product and performance findings

| Group | Severity | Finding | Reachable failure or measured work | Fix direction |
|---|---|---|---|---|
| S201 | High | [FUNC-005](05-functional-workflows.md#func-005--a-rejected-chapter-save-navigates-away-and-discards-the-authors-draft) | Both create and edit chapter forms navigate away from a rejected valid save. Navigation is observed; route teardown/loss of component-only prose is source-traced. | Navigate after success; retain fields/error for retry. |
| S202 | High | [REACT-001](06-react-state.md#react-001--a-detail-editor-carries-one-records-draft-into-another-records-save) | Real router navigation from NPC A to B retains A's draft and saves it through B's callback. Wrong target/payload observed at the write boundary. | Bind editor/draft lifetime to full record identity and resolve dirty navigation. |
| S203 | Medium | [REACT-002](06-react-state.md#react-002--a-rejected-write-destroys-the-editor-and-its-retry-cannot-recover-the-page) | A rejected entity write switches the whole page to its error gate, unmounts the draft and stays blocked after a healthy read retry. Actual page/provider/write-hook chain reproduced. | Separate operation errors from read/load errors; keep editing mounted. |
| S204 | Medium | [FUNC-002](05-functional-workflows.md#func-002--a-failed-rescan-deletes-previous-detections-and-also-reports-that-no-new-names-were-found) | Local size rejection of a note rescan clears prior detections through two update calls and shows both error and empty-success wording. Actual panel/hook; persistence mocked. | Validate first; distinguish failure; replace detections only after success. |
| S205 | Medium | [REACT-003](06-react-state.md#react-003--navigating-away-before-note-autosave-discards-the-latest-edits) | Leaving a note before debounce cancels the only pending save; zero writes and old content on reopen reproduced. | Keep drafts beyond editor lifetime or save/confirm navigation with recovery. |
| S206 | Medium | [FUNC-001](05-functional-workflows.md#func-001--a-fetched-cross-campaign-note-opens-as-an-empty-read-only-editor) | A fetched owned note from another campaign supplies the page heading/banner but never reaches the real read-only editor. Blank content reproduced. | Explicitly pass the fetched note to its reader. |
| S207 | Medium | [FUNC-006](05-functional-workflows.md#func-006--a-failed-chapter-deletion-closes-the-confirmation-and-leaves-its-retry-disabled) | The page swallows a rejected chapter delete; the dialog closes and remains deleting/disabled when reopened. | Preserve rejection and reset settled dialog state. |
| S208 | Medium | [FUNC-003](05-functional-workflows.md#func-003--optional-scalar-facts-cannot-be-cleared-after-they-have-been-recorded) | Shared editor rejects every empty value, preventing removal of optional NPC/quest facts through the supported editing surface. | Caller-controlled requiredness or explicit clear action. |
| S209 | Medium | [REACT-005](06-react-state.md#react-005--chapters-with-identical-bodies-share-completion-and-restore-state) | Equal-text chapter transitions skip lifecycle reset; the second short chapter emits no completion. Restoration variants source-traced. | Reset/key the reader by chapter identity, preserving scrolling behavior. |
| S210 | Medium | [REACT-006](06-react-state.md#react-006--an-empty-campaign-never-initializes-search-and-a-transition-to-empty-retains-the-old-index) | Empty input never becomes ready; after data falls to zero, a fresh query still returns old indexed records. | Model scoped load completion; clear/rebuild empty indexes. |
| S211 | Medium | [REACT-007](06-react-state.md#react-007--index-updates-do-not-rerun-the-current-debounced-query) | Typing before collection arrival leaves a false miss after the matching record is indexed; repeating the query finds it. | Recompute active queries on scoped index version changes. |
| S212 | Medium | [PERF2-001](07-performance.md#perf2-001--location-search-and-filter-expansion-rebuild-the-whole-index-per-match) | At 2,000 matching shallow locations, search/filter ancestry makes 8M/4M indexing visits; Chromium medians 247.1/124 ms before rendering. | Reuse the shared index for bounded ancestor walks. |
| S213 | Medium | [PERF2-002](07-performance.md#perf2-002--saga-pagination-repeatedly-splits-prefixes-and-the-remaining-body) | A 50,000-word paragraph causes 50,350 word splits over 78.6M characters; Chromium median 481.4 ms. | Scan boundaries/counts once while retaining Markdown-safe slices. |
| S214 | Medium | [PERF2-003](07-performance.md#perf2-003--quick-add-opens-unrelated-collection-listeners-before-any-create) | Ordinary quick add opens four domain listeners before saving; quests and private notes are unnecessary for an ordinary NPC create. Actual providers/hook reproduced. | Demand only operation-required lists. |
| S215 | Medium | [PERF2-004](07-performance.md#perf2-004--daily-image-maintenance-has-no-per-run-or-delete-concurrency-bound) | Daily maintenance scans all reference documents and launches all orphan deletes at once; 5,000 pending deletes observed with mocked IO. | Bound concurrency/work and use resumable pages/candidate tracking. |
| S216 | Low | [FUNC-004](05-functional-workflows.md#func-004--the-command-palette-promises-named-creation-but-drops-the-search-text) | “New NPC named Droop” launches quick add without the name. | Carry query text through the creation action. |
| S217 | Low | [REACT-004](06-react-state.md#react-004--autosave-rejection-is-logged-but-has-no-visible-failure-reason) | Autosave rejection appears only in the console; the footer remains generic “Unsaved changes.” | Visible autosave failure/recovery state. |
| S218 | Low | [PERF2-005](07-performance.md#perf2-005--serialized-note-saves-still-repeat-an-unchanged-snapshot) | Manual save plus pending idle timer writes the identical snapshot twice, serially. | Skip unchanged saved snapshots while preserving newer queued edits. |

Absolute timings are host-specific pure-function measurements, not production
route latency or a mobile-device SLA. Maintenance mocks prove work/concurrency
growth, not an actual deployed timeout or outage. Each detailed report names
which consequences are observed and which are source-traced.

## Test protection gaps

These are additional review evidence about test design, not new product counts.
Repair the tests alongside their underlying implementation; increasing global
coverage alone would leave the demonstrated contracts unprotected.

| Gap | Severity | What passing tests miss or require | Existing production finding |
|---|---|---|---|
| TEST-001 | High | Atomic check-and-insert fake removes production's two-read creation race. | First-pass DATA-001 |
| TEST-002 | High | Outgoing-payload assertions require unrelated stale status/date fields. A field-only patch fails four tests. | First-pass DATA-003 |
| TEST-003 | Medium | Editor mock checks read-only state while never displaying fetched note data. | FUNC-001 |
| TEST-004 | Medium | Hook tests require failures to resolve `[]`; panel failure tests instead mock rejection and omit retained detections. | FUNC-002 |
| TEST-005 | Medium | Emulator deletion success fixtures/assertions omit promised cleanup branches and terminal SDK failure/retry contracts. | First-pass DATA-004/IMG-005 |
| TEST-007 | Medium | Rejected writer mock does not publish the provider error that gates/unmounts the actual editor. | REACT-002 |
| TEST-006 | Low | Preparation and rules tests independently accept incompatible equality semantics at exactly 2 MiB. | First-pass IMG-004 |

See [08-test-quality.md](08-test-quality.md) for exact assertions, source paths,
reproduction evidence and meaningful regression tests. Route-identity coverage
for REACT-001 is also discussed without inventing another application count.

## Integrated fix order and remaining scope

1. Retain the first-pass order for server-owned trust, atomic creation,
   scope-bound writes, collaborative patches and resumable deletion. Correct
   TEST-001/002/005/006 while implementing those protocols; a stronger fake or
   payload assertion must not hide the real behavior.
2. Add record-bound editor lifetime and failed-save draft retention
   (S201–S205). These are separate causes: service path capture does not stop
   an A draft being paired with B before submission, and a field patch does
   not stop the error gate unmounting the editor. Keep the real provider/page
   integration boundary in regression tests (TEST-007).
3. Repair fetched note data handoff, scan replacement, chapter-delete recovery
   and optional-field clearing. TEST-003/004 should join the real collaborating
   components/hooks, rather than making each side pass an incompatible contract.
4. Fix search's empty/scoped index lifecycle and query refresh, then chapter
   reader identity. Keep already-fixed completion merge and request-order guards.
5. Remove measured quadratic location work and repeated saga splitting; bound
   maintenance concurrency and unnecessary quick-add listeners. Compare portable
   operation counts before choosing production timing or capacity thresholds.
6. Finish the smaller named-create, autosave feedback and duplicate-write fixes.

Unverified leads stay outside totals: saga stale async reads, NotePage fallback
identity/response ownership, failed note listener recovery, pending snapshot
waiters, late queued saves and browser unload durability. The reports also
reconcile numerous historical bugs that are already fixed. No review finding
automatically updates `TODO.md` or the behavioural tracker.

Architecture/duplication, accessibility, external-AI integration reliability
and operations remain later angles. Mobile layout/touch, full signed-in browser
journeys, production data/billing, remote branch protection and deployed policy
parity remain unverified. Docker received no dedicated review. The stopped
authentication scope remains a deliberate limit.
