# Fifth-pass review plan

Date: 2026-10-04. Status: completed; all five specialist assessments and bounded experiments delivered. Baseline:
`4ebd53362c34840871745386b99f7905de75c26a`, head of
[PR #200](https://github.com/Haugenau20/DnDCampaignCompanion/pull/200).
Application source matches `64fe195`. Branch:
`docs/code-review-pass-5-2026-10-04`; target the fourth-pass branch while PR #200
remains open, or main if it merges before publication.

The maintainer requested all five remaining review areas together, using as many
specialists as useful. Five parallel specialists inherit the coordinator's model
and reasoning configuration. Runtime/browser experiments are coordinated
sequentially; parallel source review does not introduce browser resource noise.

| Reviewer | Scope | Report |
|---|---|---|
| Write failures | Terminally rejected writes, draft/retry/success state, partial conversion/attachment/deletion and images | `17-write-failures.md` |
| Browser scale | Actual production App at multiple synthetic campaign sizes; search/render/heap/listener behavior and attributable source causes | `18-browser-scale.md` |
| Complete keyboard journeys | Full App navigation, menus, dialogs, authoring, validation and focus/error announcement behavior | `19-keyboard-journeys.md` |
| Listener recovery | Reliable terminal listener fault and actual SDK/provider retry, separating injected behavior from real transport | `20-listener-recovery.md` |
| Deployment/restore | Deployment assumptions and verifiable metadata, disposable local export/import functional drill, Windows execution limitations | `21-deployment-restore.md` |

## Runtime and boundaries

Fresh local `demo-review-pass5` Auth/Firestore/Functions/Storage emulators use the
repository's development services/ports/configuration, staged under `/tmp` with
loopback hosts and no Functions environment files. Separate synthetic user/group
identities isolate reviewer campaigns. A CRA production build uses explicit demo
and emulator environment settings, served on loopback for real App checks and
laboratory performance measurements. Browser remote requests are blocked.

Inspect AGENTS/TODO/current tracker and all prior summaries before counting a
finding. Retain known-issue confirmations, positive controls and unverified leads
separately. No finding quotas. Exact source references, reachable triggers,
observed persistence/UI results, severity/confidence, repair direction and
meaningful regression checks are required. Prepared detections avoid live model
calls. Controlled write/listener faults must prove they triggered and establish
whether actual SDK error acknowledgement occurred.

The runtime has no configured cloud identities/credentials/VPN and no Windows or
PowerShell. Live deployed policy parity and native Windows process execution
cannot be asserted from repository copies or local emulators. Perform an actual
disposable synthetic export/import drill after browser runs finish, coordinating
only owned service restarts and retaining manifest/checksum evidence rather than
private credential-bearing archives. No existing emulator-data directory is used.

The stopped authentication/account-lifecycle review remains stopped. Ordinary
synthetic sign-in provides test setup only. No production data, real mail, paid
model call, deployment, policy/configuration change or backlog update is included.
Physical devices and field performance/screen-reader speech remain outside the
available runtime. Changes are review documents/indexes and diagnostic evidence;
no application fixes, existing-test/rule/config/dependency changes. Reuse the full
unchanged-source baseline; add focused executed evidence and fresh production
compilation. Finish by validating documents/syntax/JSON/whitespace/scope, then
commit/push and create a separate review PR.
