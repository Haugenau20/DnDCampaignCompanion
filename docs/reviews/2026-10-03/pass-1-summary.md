# First-pass consolidated review

Reviewed commit: `64fe19512b1d3bd14427fad8996403a742fbe8a9`.

**Security, data integrity/concurrency, and uploaded-image reviews are complete.**
The authentication specialist was stopped at the maintainer's request after an
OpenAI policy interruption and was not resumed after that instruction. Its
already-collected, verified findings are retained in a **partial** report. This
is a delivered first-pass assessment with that explicit coverage gap, not a
claim that the entire repository or authentication scope has been reviewed.

The baseline passes: frontend **307 suites / 5,783 passed / 2 skipped**;
Functions/rules **12 suites / 216 passed**; type checking, app lint, test-lint
baseline gate, production build, Functions build, and bundle budget all pass.
The entry bundle is **266.64 kB gzip**, below the 275 kB ceiling. Focused probes
nevertheless reproduce missing concurrency, trust-boundary, and recovery cases.

**There are 21 grouped issues: 7 high, 13 medium, and 1 low.** The specialist
reports contain 25 confirmed finding entries; four overlapping entries are
folded into the shared issue groups below. None is ranked critical on this
evidence. One medium entry (DATA-010) is source-confirmed without its proposed
live interleaving; it is explicitly grouped with the deletion protocol work.
An inconclusive invitation-cleanup concern is excluded from this count.

No application code, existing tests, production rules, dependencies, backlog,
or deployment settings were changed. Review outcomes and diagnostic evidence
are the only repository changes.

## Coverage and reports

| Area | Reviewer | Status | Report |
|---|---|---|---|
| Security/authorization | GPT-6 Astra, xhigh | Complete for documented inspected scope; 6 findings | [01-security.md](01-security.md) |
| Authentication/account lifecycle | GPT-6.1 Sol, xhigh | Stopped by user; 4 retained verified findings; coordinator assembled partial report | [02-auth-account-lifecycle.md](02-auth-account-lifecycle.md) |
| Data integrity/concurrency | GPT-6 Astra, xhigh | Complete for documented inspected scope; 10 findings | [03-data-integrity.md](03-data-integrity.md) |
| Uploaded-image lifecycle | GPT-6.1 Sol, xhigh | Complete for documented inspected scope; 5 findings | [04-uploaded-images.md](04-uploaded-images.md) |
| Build/tests and independent confirmation | Coordinator | Completed baseline, executed focused probes, reconciled overlaps | [baseline.md](baseline.md), [probe evidence](evidence/probe-results.md) |

“Complete” means the approved assignment's documented source scope and evidence
limits, not exhaustive production assurance. Live console policies/deployments,
real browser/device timing and codec behavior, and production data were not
inspected. Docker received no dedicated review.

## High-priority issue groups

| Group | Finding(s) | Concrete failure and evidence | Fix direction |
|---|---|---|---|
| R01 | SEC-001 | A signed-in ordinary user can change their own trusted AI usage fields. An exhausted account set `isUnlimited` and completed 12 additional mocked-model calls; resetting counters also succeeded through production-copy rules. | Protect all server-owned usage/entitlement fields and audit existing values. Verify deployed policy parity before applying the policy fix. |
| R02 | SEC-002 | Writable profile identity fields influence admin target selection. Removing an attacker-labelled row addressed another uid and deleted that member's private note while preserving the attacker. Rules/helper/callable reproduced; actual React click source-traced. | Use document-path identity for every admin action and prohibit client identity-field changes. |
| R03 | DATA-001 | Two independent same-slug creates both read absence, both succeed, and leave only one record. The normal existing-record retry does not close this time-of-check/time-of-write race. Actual service/helper source-runtime probe. | Conditional create in a transaction, preserving deliberate display-name collision behavior. |
| R04 | DATA-002, IMG-001 | An in-flight write selects its group/campaign after an await. Switching scope redirects content into the newly selected campaign; image replacement can also delete the original campaign's still-referenced file. Actual service/hook source-runtime probes. | Capture full target path and attribution scope at operation start; complete against that scope or cancel safely. |
| R05 | DATA-003, IMG-002 | Unrelated edits send stale whole records/arrays. An objective tick reverted a newer quest title; a second tick undid the first. An unrelated note write restored an already-deleted old image. Actual contexts/hook source-runtime probes. | True field patches; stable element identities and transactional/independent updates for arrays; explicit conflicts for overlapping prose edits. |
| R06 | DATA-004, DATA-010, IMG-005 | Campaign cleanup ignores individual BulkWriter failures; `close()` does not reject them. Failed notes can remain after root deletion. Real recursiveDelete can remove the root despite a failed child, then the callable rejects retry. Storage-first deletion can break live image refs. Concurrent content remains writable during cleanup (source-confirmed, no full scheduling run). | Durable deletion job/state, write fencing, observed per-operation results, idempotent/resumable cleanup after root loss, and deliberate binary/document failure handling. |
| R07 | AUTH-001 | Two admins concurrently demote/leave/delete after reading each other as the surviving admin. All three controlled emulator interleavings succeeded and left member C without an admin. | Serialize the invariant check with membership/role transitions using a shared transactional group record; reserve/recover multi-service exits. |

## Other confirmed issue groups

| Group | Severity | Finding | Outcome and verification |
|---|---|---|---|
| R08 | Medium | SEC-003 | Four extractions use the single remaining quota slot while persisted counters record only one. Actual handler/emulator with scheduling barrier and model stub. |
| R09 | Medium | SEC-004 | Raw self-profile deletion hides the roster member but leaves global membership and campaign read/write access. Production-copy rules/emulator. |
| R10 | Medium | SEC-005 | Mutable username followed by self-leave makes server cleanup delete another member's reserved name. Rules and actual callable/emulator. |
| R11 | Medium | SEC-006 | Anonymous contact rate limiting uses a caller-supplied email and per-process state. Invented addresses evade the tested limit; mail transport stubbed. |
| R12 | Medium | DATA-005 | Conversion creates the target before source validation/commit. Two rejected 501-rumor attempts leave two quests and no converted rumors. Actual context source-runtime probe; other partial-operation variants source-traced. |
| R13 | Medium | DATA-006 | Opposite concurrent location moves create a cycle; a new child missed by the delete snapshot remains attached to a missing parent. Actual context source-runtime probes. |
| R14 | Medium | DATA-007 | Concurrent chapter appends persist distinct chapters with orders `1,2,3,3`. Actual story context source-runtime probe. |
| R15 | Medium | DATA-008 | Entity kinds share collection-local slugs, but attachment/detach logic uses an untyped id. A location attachment falsely marks an identically keyed quest attached; wrong-kind detach source-traced. |
| R16 | Medium | DATA-009 | Group removal deletes its subtree, fails its final batch, then retries without the lost username metadata. Membership removal succeeds but the name remains reserved. Actual callable/emulator failure/retry. |
| R17 | Medium | IMG-003 | A pending offline attachment outlives the 24-hour orphan grace period. The actual sweep deletes its object; reconnecting acknowledges a write to the missing binary. Actual Firebase client/emulators with injected sweeper time. |
| R18 | Medium | AUTH-002 | Auth deletion fails after the global profile is removed; retry returns not-found and leaves an Auth account. Actual callable/emulator failure/retry. |
| R19 | Medium | AUTH-003 | An old async auth callback restores prior profile/group/campaign after newer sign-out. Actual React provider with delayed dependencies. No server authorization bypass claimed. |
| R20 | Medium | AUTH-004 | Unrelated pending email takes precedence over a device link; after rejection there is no email correction input. Actual React page with controlled failure. |
| R21 | Low | IMG-004 | Exactly 2 MiB passes preparation but violates the strict-less-than Storage rule. Source-runtime boundary predicate check; actual byte-upload not run. |

Each specialist report supplies exact file/line references, preconditions,
impact, evidence limits, suggested changes, and a focused verification proposal.
The grouped severity reflects the most serious verified consequence; it does
not convert every related variant into high severity.

## Recommended fix sequence

1. **Close server trust gaps first:** R01/R02 plus R09/R10. Check the actual
   console policy against the reviewed `.prod` copies, protect usage and identity
   fields, use canonical member targets, remove obsolete raw profile deletes,
   and verify reservation ownership during cleanup. Quota R08 needs a separate
   transaction/reservation fix even after client usage edits are prohibited.
2. **Prevent silent write loss/misrouting:** R03/R04/R05. Establish explicit
   scope-bound document operations, conditional creates, and true field patches;
   then address array/prose conflict semantics. This resolves shared image
   consequences without separate superficial image-only patches.
3. **Make destructive transitions recoverable:** R06/R07/R16/R18. Use durable
   operation state, transactional group invariants and deletion fencing, observe
   all writes, and test every service-boundary failure. Feed this evidence into
   the existing group-deletion plan T037 before implementing that feature.
4. **Repair domain graph/order/conversion operations:** R12/R13/R14/R15. Keep
   structural reads current and encode relation kind with identity; preserve one
   operation/target across retries.
5. **Finish bounded recovery/abuse/edge fixes:** R11/R17/R19/R20/R21. Image
   finalization/sweeping needs a protocol for pending writes rather than relying
   solely on age; the exact-size mismatch is small independent work.

These are recommendations, not implemented fixes or new backlog entries. Some
steps share infrastructure, so final PR scopes should follow their concrete
dependency and regression tests rather than blindly creating 21 separate PRs.

## Reconciliation and unresolved evidence

- Historical #1402/collision fixes still handle ordinary existing-record
  collisions; R03 identifies the independent simultaneous-create gap.
- #1403/#1405 normal cascade fixes are implemented. This pass reports residual
  failure, concurrency, and retry issues, not those older missing implementations.
- Required checks/Functions deploy setup were just closed in the updated main
  backlog (T061/T070); this pass does not repeat them as open findings.
- T037 group deletion and T079 legacy location fields remain explicit planned
  or investigation work, not newly discovered defects. No missing-feature audit
  is substituted for code review.
- The auth invitation-cleanup concern has a passing component invocation probe
  but an inconclusive account-deletion emulator result. It is excluded from
  confirmed findings and ranked counts; no stopped agent was restarted to finish
  it. The prepared post-leave fourth frontend probe was not executed.
- Unescaped contact HTML, external Markdown images, console-rule parity, live
  App Check enforcement, and browser image/codec behavior are scoped concerns or
  exclusions in the specialist reports, not inflated into confirmed exploit claims.

Later agreed review areas remain unexecuted: functional correctness, React state
and async behavior beyond these seams, performance/cost, test quality,
architecture, duplication, accessibility, AI integration reliability, and
deployment/operations. This first pass informs their focus but does not replace
them or claim approval to run subsequent passes.
