# Third-pass consolidated review

Reviewed commit and stack base: `0ba261205f2a55082a0560f1c68861a463fb8f89`,
the head of [PR #197](https://github.com/Haugenau20/DnDCampaignCompanion/pull/197).
Application source is unchanged from `64fe19512b1d3bd14427fad8996403a742fbe8a9`.
This pass supplements the [first](../pass-1-summary.md) and
[second](../pass-2/summary.md) passes; their priorities and evidence remain valid.

**Five specialist reviews completed, with 16 additional findings: 12 medium
and four low.** These include product interaction/integration defects and four
local development-tooling defects. Two PowerShell findings are source-confirmed
with host execution unverified. Optional refactoring opportunities are recorded
separately and do not inflate the finding count.

The coordinator ran 12 actual-source React checks across four suites, source
contract/response/orchestration diagnostics, dependency and duplicate-body
censuses, and an actual-component Chromium keyboard/geometry/accessibility
harness. Final focused assertions passed. Full type/lint/build/frontend and
Functions gates are reused from the byte-identical source baseline, not reported
as new runs. See [verification](verification.md) and [saved evidence](evidence/README.md).

Only review documents, indexes and diagnostic evidence changed. No application
fixes or existing tests, dependencies, configuration, backlog or deployments
changed. The authentication/account-lifecycle reviewer remains stopped at the
maintainer's instruction and was not resumed or replaced.

## Coverage

| Area | Model/reasoning | Outcome | Report |
|---|---|---|---|
| Duplicate code, logic and maintainability | GPT-6 Astra, xhigh | Two findings: one medium, one low; measured clone candidates, drift diagnostics and bounded consolidation recommendations | [09-duplication.md](09-duplication.md) |
| Architecture and dependencies | GPT-6 Astra, xhigh | One medium finding; no cycles in inspected frontend/Functions graphs; two optional maintenance items | [10-architecture.md](10-architecture.md) |
| Accessibility and interaction | GPT-6.1 Sol, xhigh | Six medium findings; real Chromium keys, focus, geometry, computed CSS and accessibility-tree observations | [11-accessibility.md](11-accessibility.md) |
| AI integration reliability | GPT-6 Astra, xhigh | Three findings: one medium, two low; synthetic response/UI failures and four successful conversion controls | [12-ai-integration.md](12-ai-integration.md) |
| Operations and delivery | GPT-6.1 Sol, xhigh | Four findings: three medium, one low; isolated CLI/orchestration probes and source-only PowerShell review | [13-operations.md](13-operations.md) |

Completion applies to the documented inspected scopes. No report claims
exhaustive repository coverage, live model quality, production policy parity,
screen-reader speech or a full signed-in browser journey.

## Additional findings

Each ID below owns one root cause. Multiple manifestations of a title or usage
snapshot contract are grouped. Source-only PowerShell evidence is explicit.

| Severity | ID | Failure and evidence | Bounded direction |
|---|---|---|---|
| Medium | ARCH-001 | An unguarded theme-storage read prevents root content rendering; a failed preference write skips DOM theme application. Real provider/boundary diagnostics. | Guard preference reads and apply the theme independently of persistence. |
| Medium | A11Y-001 | Attachment tray Space/Enter handlers consume keys from its filter and action buttons, changing relationships instead of typing/closing/creating. Chromium keys and callback recording. | Scope list navigation to its intended control; preserve native field/button activation. |
| Medium | A11Y-006 | Shared primary and outline buttons have transparent focus outlines and no replacement indicator in both themes. Actual CSS and Chromium computed styles/screenshots. | Give shared buttons a visible themed focus indicator that survives the CSS layers. |
| Medium | A11Y-004 | The phone chapter drawer leaves focus behind its scrim and tabs into obscured reader controls; Escape does not dismiss it. Chromium at the phone breakpoint. | Use modal focus entry/containment, dismissal and return for the narrow drawer. |
| Medium | A11Y-002 | Palette arrow navigation selects an option fully outside the visible scroll area; Enter still opens it. Chromium geometry and navigation callback. | Scroll the active option into view without moving text-input focus. |
| Medium | A11Y-003 | Quick-add child autofocus captures the dialog's return target inside the dialog; closing leaves focus on the document body. Real dialog/quick-add components in Chromium. | Capture the opener before descendant focus changes; coordinate modal initial focus. |
| Medium | A11Y-005 | Quick-add field errors have no description association or announcement and leave focus on submit. Chromium DOM and accessible tree. | Associate errors and provide predictable invalid-submit focus/announcement. |
| Medium | DUP-001 | Normal content-only notes/rumours have blank or legacy names in attachment, search and quest backlinks because consumers project raw titles independently. Component/provider and pure-contract diagnostics; quest consequences source-traced. | Apply existing domain display-title contracts at presentation/index boundaries. |
| Medium | AI-001 | Cached exhausted usage keeps scanning disabled after reset; an ordinary failed counted request also leaves stale remaining-capacity feedback. Actual provider/hook/panel diagnostics and handler trace. | Refresh expired snapshots and reconcile ordinary attempted-request failures. |
| Medium | OPS-001 | A failed emulator export can print success and still force shutdown, losing latest local edits. PowerShell control-flow evidence; no host execution. | Check export completion and preserve a recoverable snapshot before shutdown/restart. |
| Medium | OPS-002 | Project stop force-terminates every accessible Java process, including unrelated work. PowerShell source evidence; no process terminated. | Retain and validate owned process trees; shut down only those processes. |
| Medium | OPS-004 | Supported host startup omits Functions compilation/watch and can exercise missing or stale emitted backend code while UI health looks ready. Actual pinned CLI method probes; full startup source-traced. | Compile current Functions and check backend readiness; manage the watcher. |
| Low | AI-002 | The strict model schema accepts confidence `90` or `-0.4`; unchanged client values format as 9000% or −40%. Actual request-schema validation and response mapping. | Specify and validate the finite 0–1 confidence contract. |
| Low | AI-003 | A configured zero allowance is shown as ten because the meter uses truthiness instead of nullish override selection. Actual meter/panel diagnostic. | Share the client allowance selector and preserve real zero values. |
| Low | OPS-003 | Sample-generation failures log an error, then the entry point announces completion and exits zero. Actual source with controlled dependencies. | Propagate failure and check native exit status before announcing success. |
| Low | DUP-002 | Combine-rumour dialog predicts an ID that actual collision/UUID allocation changes. Actual allocator diagnostic and source-traced preview. | Remove the preview or show only the completed operation's returned identifier. |

Exact source references, triggers, requirements, reproduction boundaries and
meaningful fix checks are in each specialist report. No new critical/high
finding was established in this pass; earlier high-severity findings remain
ahead of routine cleanup.

## Duplication and architectural maintenance

The duplicate-body census covers 305 production TS/TSX files outside the stopped
scope: 1,182 eligible function bodies, six exact cross-file groups and 11
structural candidate groups (two overlap the exact groups). Its 374 repeated
tokens count only copies beyond the first within exact bodies, excluding many
other source forms. This is not a repository duplication percentage.

Prefer the following small changes when touching the relevant code:

1. Repair display-title consumers and remove the misleading slug prediction.
   These are demonstrated drift; sharing slugification alone cannot predict
   a final allocated ID.
2. Consolidate the duplicated batch-limit/preparation algorithm through its
   writer adapter, preserving empty/500/501 boundaries and error behavior.
   Use intent-sized patch contracts for the already-reported DATA-003.
3. Reuse the existing query parser and consider domain-local entity labels,
   shared inbound-link rows and a small outside-click hook when they reduce
   maintenance. Preserve deliberate domain copy, timestamps and presentation.
4. Retire the nine verified unused implementation modules under ARCH-M01 after
   rechecking callers; expose the four story utility imports through the public
   barrel under ARCH-M02. The unused modules are absent from the retained build's
   21 JS source maps, so removal is maintenance cleanup with no proven bundle
   saving.

No blanket CRUD/page framework is recommended. The read hooks, entity-ID and
attribution contracts, note mutation/date helpers and objective normalization
already have shared owners. Prose matching versus exact reference resolution,
legacy-location compatibility, byte-colour contrast math and mirrored contact
labels were checked without establishing new drift. Separate package boundaries
can justify a small parity check instead of a shared package.

The import census found zero cycles across 351 frontend modules and 30 Functions
modules, zero `core` dependency inversions and zero own-feature-barrel imports.
Current cross-feature/shared-to-feature barrel edges and seven documented dynamic
route exceptions are allowed. A folder-level cycle or broad barrel does not
prove a JavaScript cycle or a larger shipped bundle.

## Fix order and reconciliation

Keep the prior security, concurrency/deletion and high-severity draft-retention
work first. Within this pass, repair theme fallback and shared keyboard/focus
contracts, then title projections and usage freshness. Address local export,
process ownership and Functions compilation before relying on the host stop/
restart workflow; the two PowerShell paths need verification on the supported
host. Low-severity display/reporting changes and optional consolidation follow.

DATA-001/002/003/005/008, IMG-004, FUNC-001/002, REACT-002/006/007,
PERF2-003/004 and TEST-006 are cross-referenced rather than refiled. Fixed/current
tracker contracts and documented design exceptions were reconciled by each
specialist. Docker was secondary and inspected only where current Hosting
delivery uses it; existing T059/T065 work was not counted again.

Response-shape validation, model/client deadline alignment, production restore
and alert ownership are useful follow-up recommendations with explicit limits.
They are not counted outages or evidence that deployed controls are absent.
