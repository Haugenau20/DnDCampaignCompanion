# Deployment assumptions, disposable restore and Windows operations

Date: 2026-10-04. Reviewed baseline:
`4ebd53362c34840871745386b99f7905de75c26a`, head of
[PR #200](https://github.com/Haugenau20/DnDCampaignCompanion/pull/200).
Application source matches `64fe19512b1d3bd14427fad8996403a742fbe8a9`.

The repository deployment assumptions are internally consistent in the inspected
configuration. **Actual deployed policy, indexes, Hosting release and Functions
revision remain unverified:** this session has no configured cloud credentials
or identity, and its public Hosting origin is outside the enforced network
allowlist. Native Windows execution remains unavailable. These are explicit
coverage limits, not additional security or operations findings.

**The actual disposable Firestore/Storage export → owned shutdown → import →
readback round trip passed.** Seven fixture documents retained every asserted
field and checksum; the 68-byte image and rendering metadata matched. Six
actual-App routes and portrait decode/media fetch passed both before and after
restart. No new defect is counted; existing operator findings retain their
original qualifications.

## Scope and authorization boundary

Read `AGENTS.md`, `TODO.md`, the current tracker, all four prior summaries,
the pass-three operations report and its actual-source probe, and the first-pass
production-policy qualifications. Inspected current deployment/emulator JSON,
project selection, index definitions, Functions runtime/package entry point,
merge/preview/cleanup/test workflow assumptions, the shipping artifact extraction,
and complete startup/stop/export/data-management PowerShell branches.

Used the cloud-environment runtime skill to inspect safe environment readiness
and its supported network policy. The current observation reports restricted
networking enforced, no configured capabilities, secrets, runtime variables or
outbound identities. The executor policy also reports no VPN or TCP grants.
The reviewed Hosting host is absent from the allowlist, so no public-header
request was attempted and no proxy bypass was used. No interactive login,
credential file, environment-secret content or production API was inspected.

The root coordinator owns service/browser lifetimes. The specialist prepares
diagnostics and reads their results; it never runs the repository's process-stop
helper. Only a fresh synthetic `demo-review-pass5` session and a newly created
export directory under `/tmp/pass5-restore` are permitted. Existing repository
`firebase/emulator-data`, historical/user/production archives and real data are
excluded. No deployment, rule/config/dependency/application/test/backlog change,
real email or paid model call is part of this review.

Authentication/account-lifecycle review remains stopped. Ordinary synthetic
sign-in is a browser prerequisite; the export intentionally selects only
Firestore and Storage. There is no Auth restoration, account lifecycle,
authorization, App Check or live private-data-access assertion.

## Repository assumptions versus verifiable deployed metadata

| Area | Current source and observed local control | Deployed evidence and limit |
|---|---|---|
| Project selection | `firebase/.firebaserc:3` defaults to `dnd-campaign-companion`; merge workflow explicitly selects the same project (`firebase-hosting-merge.yml:54,96`). Review uses explicit `demo-review-pass5`. | No console/project API access; live project/app association is unverified. |
| Firestore policy | `firebase/firebase.json:9–15` contains indexes and deliberately omits `firestore.rules`. Emulator config also omits it and defaults to permissive reads/writes. `firestore.rules.prod` is a review copy. | No live rules release/source hash; source-copy tests and broad emulator access cannot establish live policy or repair deployment. The stale opening comment in the `.prod` copy was already qualified in pass one. |
| Storage policy | Production JSON has no Storage key; emulator JSON alone points to permissive `storage.rules` (`firebase.emulators.json:13–15`). `storage.rules.prod:3–18` explicitly describes console publication and the Firestore cross-service grant. | No live Storage rules release, grant or App Check enforcement setting. Permissive synthetic PNG upload is a restore control; it does not test production image MIME policy. |
| Config copies | Actual JSON comparison passes for `functions`, Firestore indexes and all common emulator ports/UI settings. The emulator-only Storage key and omitted Hosting section are documented differences. | Internal agreement is observed; no remote equality claim. |
| Indexes | `firebase/firestore.indexes.json` contains 20 index definitions and two field overrides. Both configs name this same file. The current merge deploy selects Functions only, then Hosting; it does not publish indexes. | No deployed index inventory/build status. The count is a source inventory, not proof that production contains these indexes or that any are missing. Emulator queries are not production composite-index readiness evidence. |
| Functions runtime and order | Package engine is Node 22, entry is `lib/index.js`; production predeploy invokes `build` (`firebase.json:3–7`; Functions `package.json:6,15,17`). Merge waits for tests, deploys Functions, then permits Hosting (`firebase-hosting-merge.yml:27,54,58`). Client Functions region is `europe-west1` (`BaseFirebaseService.ts:65`), matching inspected non-auth handler/scheduler metadata. | No deployed function revisions, runtime, IAM, secrets, scheduler/Artifact Registry state, trigger discovery or rollback evidence. Source secret names are configuration contracts, not evidence that secret values/bindings exist. |
| Hosting artifact | Merge builds with emulator mode explicitly false and copies CRA output into `firebase/build` (`firebase-hosting-merge.yml:71–88`), matching `hosting.public: build`. SPA rewrite targets `index.html` (`firebase.json:16–28`). | No live release ID, deployed artifact hash, headers/cache behavior, environment-resolved app association or release/revision match. The review browser serves a local production build with explicit demo settings, not the deployed site. |
| Backup and rollback | Host script intends export before stop and import when data exists (`start-dev.ps1:36–50,123–134`). A source-level optional production recovery owner/retention/revision record was already suggested in pass three. | No production backup configuration/retention, real export, disaster-recovery point/objective, previous Hosting release, Functions rollback or production restore trial inspected. No missing-backup claim. |

The retained [source snapshot](evidence/outputs/restore/source-snapshot.json)
records file hashes and these comparisons, without
credential values. Removing the rules keys from deployable config remains a
deliberate safety boundary; do not repair parity by pointing production JSON at
the permissive development files. SEC-001 and the other policy findings still
require checking actual console policy before treating a source change as live.

## Disposable export/import drill

**Expected behavior:** a completed pinned-CLI export, followed by termination and
a fresh import/start, retains representative typed Firestore fields, cross-record
links, image reference, Storage bytes and rendering metadata. Independent server
readback must agree before any after-import seed. The actual App must still read
the restored documents and decode the restored picture. Directory existence or
the emulator UI's HTTP status alone is insufficient evidence.

The [diagnostic module](evidence/probes/restore/restore.cjs) exports
`seed(api)`, `readback(api,phase)`
and `run(api)`; the coordinator supplies its unique synthetic user/group/campaign,
Admin SDK, browser and navigation callback. It seeds seven documents:

- NPC, location and quest with retained typed relationship IDs/objective.
- Chapter and the same synthetic user's campaign-scoped note with prose and ISO
  attribution dates, plus `saga/sagaData` with saga prose.
- A separately labelled export-codec diagnostic with an actual Firestore
  Timestamp, nested array, Unicode, empty string, zero, false and null. This is
  not an application schema/legacy compatibility assertion.

One immutable 68-byte synthetic 1×1 PNG lives under the NPC's image prefix. It
has `contentType: image/png`, a one-year immutable cache-control value, a synthetic
download token and a labelled custom review-purpose metadata value. The Firestore
image reference uses the same path/token and ordinary `StoredImage` fields.
Production allows different image MIME types; permissive development policy is
intentional here, and no production upload-policy claim is made.

`readback` reads all seven documents from the actual local Admin SDK, compares
every stored field against the fixture, canonicalizes real Timestamp values, and
records SHA-256 values. It separately downloads Storage bytes and fetches object
metadata, checking content type, cache control, length, MD5/custom metadata and
exact SHA-256. The after-import read repeats those operations and requires the
before/after document hashes and selected Storage metadata to match.

`run` performs six actual-App route reads: NPC, location, quest, chapter, note
and saga. It checks expected heading/prose, actual portrait decode to 1×1 pixels,
and successful tokenized media fetch with the same binary checksum. Ordinary
chapter reading may create/update the reader's separate progress document; it
does not change the seven fixture records. Those progress writes are not a
restore assertion.

The executed controlled sequence was:

1. Seed only the fresh synthetic restore campaign; complete independent readback
   and browser controls before export.
2. Finish all other browser workloads. Export the fresh session through actual
   Firebase CLI 15.22.4 with `--only firestore,storage` to a new directory; require
   a successful native exit and completed export metadata. No `--force` overwrite
   is used.
3. Produce a sorted export-file SHA-256/size manifest; require Firestore and
   Storage metadata, CLI version 15.22.4 and absence of Auth export metadata.
4. Coordinator stops only its owned emulator session and restarts with explicit
   `--import` from that fresh export. No fixture content is reseeded.
5. Run independent after-import readback before browser sign-in, then all six
   actual-App read/decode controls. Preserve manifests, small readbacks and logs;
   the export archive remains outside the repository.

**Execution result:** completed successfully on 2026-10-04. The coordinator's
before runner returned native exit 0. Actual CLI export returned exit 0 and
printed `Export complete`; the manifest diagnostic validated nine files, CLI
15.22.4, Firestore emulator 1.21.0, Storage 15.22.4 and no Auth export. The main
Firestore payload is 9,358,394 bytes: the fresh session also contains other
reviewers' synthetic campaign fixtures. Two synthetic Storage blobs are listed;
this specialist asserts exact restoration only for its seven named documents
and one named 68-byte portrait, not every other campaign/object in the archive.

The coordinator sent SIGINT only to its owned emulator CLI session and observed
clean exit 0, then started a new owned session with explicit import from the
same fresh export. The import log identifies the Firestore metadata path and
ready local services. Auth was intentionally not exported; only the ordinary
synthetic test user was recreated as browser setup using the coordinator's reuse
helper, whose reuse branch performs no Firestore writes. No fixture content was
reseeded. The after runner returned exit 0.

| Completed control | Result and retained evidence |
|---|---|
| Before export | Seven exact-field/hash controls and Storage binary/metadata checks pass; all six App routes, 1×1 portrait decode and HTTP 200 tokenized media pass. [Readback](evidence/outputs/restore/readback-before.json), [browser observations](evidence/outputs/restore/browser-before.json), [native output](evidence/outputs/restore/before-results.txt). |
| Export artifact | Nine sorted file size/SHA-256 entries; both supported service metadata sections; no Auth metadata. [Export output](evidence/outputs/restore/export-results.txt), [manifest](evidence/outputs/restore/export-manifest.json), [named fixture manifest](evidence/outputs/restore/fixture-manifest.json). Raw archive is excluded. |
| Restart/import | Fresh owned emulator session reads the same exported Firestore path and starts the local services. [Import output](evidence/outputs/restore/import-results.txt). Ownership/SIGINT/exit-0 observation belongs to the coordinator; no Windows stop helper was involved. |
| After import | All seven document SHA-256 values match before; all selected Storage metadata and 68 bytes match, SHA-256 `5e3d382db4dd83d59aa5742793ad6b7903409e865c83bcbc54835049f043bc15`. All six App reads and portrait decode/media fetch pass. [Readback](evidence/outputs/restore/readback-after.json), [browser observations](evidence/outputs/restore/browser-after.json), [native output](evidence/outputs/restore/after-results.txt). |
| Browser/runtime boundary | Before/after both record no uncaught page errors. Remote browser requests are blocked and recorded; successful content/image IO is local. After records `seededContentAfterImport: false` and zero Auth assertions. [Before observations](evidence/outputs/restore/observations-before.json), [after observations](evidence/outputs/restore/observations-after.json). |

The retained [runner](evidence/probes/restore/run-restore.cjs),
[export-manifest diagnostic](evidence/probes/restore/export-manifest.cjs) and
[source-config diagnostic](evidence/probes/restore/source-snapshot.cjs) preserve
the checks. Syntax checks passed under Node `v22.23.3`; Java reports
`21.0.12.1`. Source configuration comparison executed successfully. The original
synthetic PNG literal was corrected for its IDAT CRC during preparation, before
seeding; both executed phases use the same valid fixture bytes.

Replay requires the coordinator's staged/runtime prerequisites in the
[evidence guide](evidence/README.md). The actual before/after runner command is
Node 22 `/tmp/pass5-restore/run-restore.cjs before|after`, with the before phase
using the coordinator's `PASS5_BASE_URL=http://127.0.0.1:3001`. The export command
uses the pinned repo CLI, explicit demo project/config and a new path:

```sh
/tmp/code-review-runtime/node_modules/.bin/node \
  /workspace/DnDCampaignCompanion/firebase/node_modules/firebase-tools/lib/bin/firebase.js \
  emulators:export /tmp/pass5-restore/export-fresh-20261004 \
  --only firestore,storage --project demo-review-pass5 \
  --config /tmp/pass5-runtime/firebase.emulators.json --non-interactive
```

After owned shutdown, restart adds
`--import /tmp/pass5-restore/export-fresh-20261004` to the same explicit local
startup command. Before replaying, choose a new export directory and matching
manifest/runner context rather than overwriting this retained export. Archives
and the runner's synthetic sign-in prerequisite context stay outside the repo.

An independent negative CLI control selected a deliberately absent synthetic
project, `demo-review-pass5-missing-hub-control`, and an absent temporary export
target. The actual pinned CLI reported no running hub, returned native exit
**2**, and created no export directory. Ancillary remote-MOTD/update-store warnings
and an outer unexpected-error message were also recorded; the observed result
is a nonzero native failure, not a claim that this host returned the controller's
nominal exit 1. It did not contact or stop the running review emulators. This
strengthens OPS-001's native-failure acknowledgement requirement without running
PowerShell, simulating a partial snapshot or proving shutdown protection.
[Control output](evidence/outputs/restore/missing-hub-control.txt) and
[bounded result](evidence/outputs/restore/missing-hub-control.json) are retained.

## Windows source review and actual execution preconditions

The repository's supported workflow remains the host PowerShell script documented
in `AGENTS.md:102–110`. Linux execution of its underlying emulators is useful
Firebase IO evidence, but it is not execution of `Start-Process`, PowerShell
native-command status handling, Windows process enumeration, window-title filters
or execution policy. Both `powershell` and `pwsh` are unavailable; neither script
was run and no host process was selected or terminated by them.

| Native execution prerequisite | Source evidence and actual review status |
|---|---|
| Correct working directory | Script uses relative `firebase`, `./firebase/emulator-data`, `npm start` and generator paths (`start-dev.ps1:37,43,81`; `manage-dev-data.ps1:83,86`). A Windows trial must start at the checkout root. No unrelated directory is modified here. |
| Windows PowerShell child launcher | Startup explicitly runs `Start-Process -FilePath "powershell"` with window styles (`start-dev.ps1:47,50,81`). PowerShell Core alone would not prove this exact launch path. Not available. |
| Host tools and pinned version | Global `firebase`, host `npm`/`npx`, Java and dependencies must resolve in the launched shells. Repo-local CLI 15.22.4 is installed and the Linux drill uses it explicitly. The maintainer's global Windows version is still unverified; T065 already owns the version change/round trip. |
| Current emitted Functions | Host startup has no Functions build/watch (`start-dev.ps1:31–75`). The review builds/stages current Functions separately. OPS-004 already owns missing/stale backend startup; a passing restore does not fix or test the native startup omission. |
| Export acknowledgement and snapshot preservation | Stop/export use native CLI then success text without `$LASTEXITCODE`; stop continues into force termination (`start-dev.ps1:128–152,228–229`; `manage-dev-data.ps1:130–135`). OPS-001 remains source-confirmed with native execution unverified. This success-path CLI drill cannot establish failure-path protection. |
| Owned process shutdown | Stop enumerates every accessible `java` process and unscoped `firebase*` (`start-dev.ps1:142–152`). OPS-002 owns this defect; no Windows process-inventory/child-process trial was run. |
| Sample generation/reporting | Wrapper copies `.env.development` and invokes `ts-node` (`manage-dev-data.ps1:82–88`); no environment file or generator/account implementation was read or run. OPS-003's prior isolated source diagnostic remains its evidence. |

A meaningful future Windows validation should use a disposable checkout,
synthetic dataset and harmless owned child processes. First exercise a stub CLI
that exits nonzero and capture stop targets without termination; then exercise
a successful start/export/stop/import round trip. Record the actual Windows and
PowerShell versions, global CLI resolution/version, native exit handling,
Functions readiness and unrelated-process preservation. These checks belong to
existing OPS-001/002/004 and T065; no duplicate fifth-pass issue is filed.

## Findings, repair direction and limits

No new deployment/Windows defect is established by the inspected source. The
four pass-three operator findings and existing first-pass security findings
remain open with their original evidence levels. Internal JSON agreement does
not lower their severity. The passing success-path restore adds missing local
IO evidence; it does not clear export-error preservation, native startup or
process ownership.

Production parity requires an authorized operator/read-only identity to capture
actual Firestore and Storage release IDs/source hashes, deployed index states,
Functions revisions/runtime/region and relevant configuration bindings, and the
Hosting release/artifact. Record timestamps and compare them to the source
manifest; metadata disagreement must first be confirmed before calling it a
deployed defect. Record rollback/backup ownership and the last successful
production restore trial if available. This review does not request or attempt
those accesses, mutate live configuration or infer missing controls from lack of
visibility.

The local drill does not cover production exports, provider backup restoration,
cross-version CLI migration, remote IAM/App Check/console-policy enforcement,
index creation/readiness, scheduled-job restoration, Windows shell behavior,
crash/partial export, disk exhaustion or credential-bearing archives. Auth is
excluded from the export. Fresh synthetic content is the only restored data.
