# Fourth-pass review plan

Date: 2026-10-04. Status: completed; all three authorized specialist reviews
and bounded runtime follow-ups delivered. The maintainer requested full local browser workflows, failure
recovery and representative legacy data using the repository's development
startup configuration.

Reviewed baseline: `c2d8a88d0541b01c0f9cc2e7c497206a29746ce5`, current `main`
after the three earlier review PRs merged. Application source remains identical
to `64fe19512b1d3bd14427fad8996403a742fbe8a9`. Fourth-pass branch:
`docs/code-review-pass-4-2026-10-04`. A separate review PR targets `main` because
the earlier stack is merged; earlier summaries remain historical records.

| Reviewer | Model/reasoning | Scope | Report |
|---|---|---|---|
| Complete browser workflows | GPT-6.1 Sol, xhigh | Actual App routes and providers with real local Firebase SDK/emulator IO; create/edit/attach/delete, notes and prepared-detection conversion, chapter authoring/reading, search/navigation; known defects revalidated without recounting | `14-browser-workflows.md` |
| Browser failure and recovery | GPT-6.1 Sol, xhigh | Offline/reconnect, queued save/navigation/unload/reload, multi-tab ordinary edits, note fallback ownership and listener recovery; distinguish real transport failure from injected terminal protocol errors | `15-browser-recovery.md` |
| Legacy data compatibility | GPT-6 Astra, xhigh | Historically supported record shapes, normalization and read/edit round trips; old objectives, note titles/dates, optional fields, location references and story data; distinguish intentional compatibility decisions from defects | `16-legacy-data.md` |

The coordinator owns runtime startup, seed/session helpers and central browser
execution. Specialists prepare isolated probes and write only their reports.
No finding quota. Read `AGENTS.md`, `TODO.md`, current specifications/tracker and
all [prior review summaries](../../2026-10-03/README.md); exact source references,
reachable triggers, meaningful fix checks and evidence limits are required.
Prior findings and known tracker entries are cross-references rather than new
counts. Preserve passing end-to-end controls as well as diagnosed failures.

## Runtime and verification boundaries

`scripts/start-dev.ps1` launches Windows `powershell` processes; this Linux
workspace has no PowerShell. The coordinator uses its actual Firebase emulator
configuration/services/ports plus root `npm start` directly. Functions are
compiled first. A temporary config changes path resolution and binds services
to loopback. Compiled Functions/package files are staged under `/tmp` without
environment/secret files. The synthetic `demo-review-pass4` project starts
fresh, without importing or overwriting any existing emulator-data directory.

The full App runs under CRA with explicit demo-project/emulator environment
overrides. A local synthetic user/group and separate reviewer campaigns provide
ordinary sign-in setup. Chromium requests permit only loopback services; remote
analytics/production/model requests are blocked. Prepared extraction detections
exercise conversions without a paid model call. Fixtures and backend readback
are synthetic. Development emulator policies follow the repository config;
these checks do not establish production-rule parity or authorization coverage.

Run reviewers' browser experiments sequentially, capturing actual UI state,
emulator readbacks, callback-independent behavior, screenshots and fault timing.
Inject faults only into local transport. Distinguish transient offline recovery
from controlled terminal listener frames. Correct harness issues before using
their observations as findings; document any remaining execution block.

Physical devices, Safari/iOS/Android, screen-reader speech, deployed settings,
backup/restore production drills, dependency/privacy audits and Windows startup
remain outside this pass. The stopped authentication/account-lifecycle review
must not resume or be replaced. Local test sign-in is setup, not a renewed
investigation. No production data, real mail, paid model call or deployment.

This is a review: change only reports/indexes and preserved diagnostic evidence.
No application fixes, existing-test edits, rule/config/dependency changes or
backlog updates. Reuse the full green baseline for byte-identical source; add
the new end-to-end verification record and evidence guide. Finish with local
document/syntax/JSON/whitespace/scope checks, commit/push and a separate PR.
