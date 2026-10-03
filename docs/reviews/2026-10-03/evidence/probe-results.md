# Focused reproduction record

Baseline: `64fe19512b1d3bd14427fad8996403a742fbe8a9`. The coordinator executed
these probes. All records are synthetic; emulators use isolated `demo-`
namespaces. OpenAI and email transports are stubs. No live-service messages,
paid requests, deployments, or production mutations occurred.

## Results

| Probe | Method | Observed result | Preserved output |
|---|---|---|---|
| Security rules/callable boundaries | Repository production rules in emulator, actual callable source, mocked AI/mail | Eight role/membership/private-note negative controls denied. Exhausted quota denied; client unlimited flag and counter reset allowed extra calls. Contact limiter accepted ten invented-address calls after blocking the sixth same-address call. Mutable username plus self-leave deleted another user's reservation. Unescaped context markup reached captured mail HTML; rendered mail behavior unverified. | [security-probes.log](outputs/security-probes.log) |
| Canonical member identity/membership representation | Production rules, actual `memberId` helper/callable, source-matched service mapping | Forged own profile identity redirected an admin removal to another member, deleting that member's private note while attacker remained. Deleting own profile hid the roster row but retained campaign read/update access. React click path source-traced. | [security-identity-probes.log](outputs/security-identity-probes.log) |
| AI quota race | Actual handler/emulator reads, barrier after snapshots, model stub | Four calls read daily 9/10 before writes. All succeeded; stored daily/weekly/monthly counts ended at 10 rather than recording four operations. No client quota modifications. | [security-quota-race.log](outputs/security-quota-race.log) |
| Data write/graph algorithms | Actual transpiled service/context/helper source, controlled React/Firebase boundaries; real BulkWriter with failed outbound RPC | Same-slug overwrite; wrong-campaign write; duplicate chapter order; lost independent quest edits/objective ticks; location cycle and orphan child; duplicate targets after rejected 501-rumor conversions; cross-kind attachment collision. Real BulkWriter close fulfilled while its individual operation rejected. Completion marker present. | [data-source-probes.log](outputs/data-source-probes.log) |
| Campaign and leave recovery | Actual callable source/emulators, injected outgoing BulkWriter/final-batch errors | Campaign delete reported success with a retained private note and missing campaign; retry refused. Failed leave final commit followed by retry removed membership but retained username reservation. | [data-deletion-probes.log](outputs/data-deletion-probes.log) |
| Campaign partial deletion | Actual compiled callable/Storage/Firestore; injected failed subtree call or one failed descendant operation in real recursiveDelete | Storage file removed while live campaign/NPC docs survived; separately, real recursiveDelete removed root but retained failed child and retry returned not-found. Completion marker present. | [campaign-failure-probes.log](outputs/campaign-failure-probes.log) |
| Uploaded-image write/cleanup algorithms | Actual hook/context/service/sweeper source; controlled I/O | Delayed unrelated write restored deleted old image; context switch attached uploaded picture elsewhere and deleted original referenced object; pending attachment swept; exact 2 MiB accepted preparation predicate but failed rules predicate. | [image-source-probes.log](outputs/image-source-probes.log) |
| Offline attachment versus sweep | Actual Firebase client `disableNetwork`/queued `updateDoc`/`enableNetwork`, actual sweeper/emulators; sweeper clock advanced two days | Queued save acknowledged after reconnection, but referenced new object had been swept. No wait of two real days or metadata alteration. | [image-offline-probe.log](outputs/image-offline-probe.log) |
| Auth lifecycle (partial) | Actual compiled callables/emulators; barrier after real admin guard reads; failed Auth deletion | Three concurrent admin exit patterns left no admin; transient Auth delete failure left Auth account after profile removal and retry refused. Added invitation cleanup subprobe failed to establish Auth-account loss: authGone was false. **Entire extended script exits 1; only earlier passing subprobes are used as evidence.** | [auth-lifecycle-probes.log](outputs/auth-lifecycle-probes.log) |
| Auth frontend transitions (partial) | Actual React email-link page/provider, controlled dependency delays/errors | Three assertions passed: ambiguous join rejection triggered fresh-account cleanup, stale pending email bypassed device approval with no correction field, and old auth callback restored prior context after sign-out. The first proves cleanup invocation, not end-to-end account loss. | [auth-front-probes.log](outputs/auth-front-probes.log) |

## Diagnostic source artifacts

The [probes directory](probes/) preserves diagnostic source/configuration. These
are review artifacts, not new repository regression tests or fixes. Root paths
were adjusted only in the archival copies to derive the repository from this
directory or `REVIEW_REPO`; assertions and algorithms are unchanged. The archived
React file includes the **three tests actually executed**, excluding a fourth
prepared test that was not run before the auth agent was stopped.

| Source | Requirements |
|---|---|
| [security-review-probe.cjs](probes/security-review-probe.cjs) | Local Firestore/Auth; mocked model/mail; loads production rule copy |
| [security-identity-probe.cjs](probes/security-identity-probe.cjs) | Local Firestore; source handler/helper |
| [security-quota-race.cjs](probes/security-quota-race.cjs) | Local Firestore; mocked model |
| [data-integrity-source-probes.cjs](probes/data-integrity-source-probes.cjs) | Existing frontend/Functions dependencies; no network |
| [data-integrity-deletion-emulator.cjs](probes/data-integrity-deletion-emulator.cjs) | Local Firestore/Storage |
| [code-review-campaign-failures.cjs](probes/code-review-campaign-failures.cjs) | Local Firestore/Storage; Functions build at reviewed SHA |
| [uploaded-images-review-probe.cjs](probes/uploaded-images-review-probe.cjs) | Existing dependencies; no network; repository argument optional |
| [uploaded-images-offline-emulator-probe.cjs](probes/uploaded-images-offline-emulator-probe.cjs) | Local Firestore/Storage; repository argument optional |
| [auth-lifecycle-probe.cjs](probes/auth-lifecycle-probe.cjs) | Local Firestore/Auth; Functions build. Extended invitation case remains inconclusive; do not interpret whole script as passing |
| [auth-front-transitions.test.js](probes/auth-front-transitions.test.js), [config](probes/auth-review-jest.config.cjs) | Run through repository Jest with the archived config; temporary dependency fault models |

Example local invocation from the repository root, with Node 22 and emulators
already running:

```bash
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199 \
node docs/reviews/2026-10-03/evidence/probes/security-review-probe.cjs
```

## Interpretation limits and corrected harnesses

- Barriers demonstrate a legal interleaving, not its production probability.
- Callables are invoked through their actual `.run` handlers. Live HTTP App Check
  middleware, deployments, credentials, and console-rule parity are not verified.
- Source-runtime probes retain production algorithms but model persistence;
  inspect the boundary and source trace alongside their output.
- Diagnostic fault injection is intentional. Expected injected errors in output
  do not mean existing repository suites failed.
- The first data probe omitted a quest lookup mock and used an incomplete
  BulkWriter transport stub. Both were repaired in the temporary harness; final
  execution exited 0 with all assertions and a completion marker.
- The first temporary auth Jest configuration resolved incompatible nested Jest
  internals. It was corrected without editing repository tests; three probes
  subsequently passed. The extended Auth cleanup probe remains inconclusive.
- The coordinator's first campaign-failure diagnostic reproduced its assertions
  but leaked its supplied BulkWriter during cleanup. The temporary harness now
  closes that writer; its final execution exited 0 with the completion marker.

The auth specialist was stopped at the user's request and was not resumed after
that request. Its unexecuted fourth frontend probe and undelivered coverage work
do not count as completed review evidence.
