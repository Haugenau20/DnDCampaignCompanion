# Operations and delivery review

Reviewer: GPT-6.1 Sol, xhigh. Date: 2026-10-03. Reviewed commit:
`0ba261205f2a55082a0560f1c68861a463fb8f89`, head of
[PR #197](https://github.com/Haugenau20/DnDCampaignCompanion/pull/197).
Application source is unchanged from `64fe195`.

This review follows the current host development path documented in
`AGENTS.md:102–110` and the existing production GitHub Actions path. It records
four newly identified operator-tooling defects: three medium and one low.
Two are source-confirmed PowerShell failures; the generator and Functions-build
contracts have isolated actual-source diagnostic probes. These are development
and operator failures, not four additional production application defects.

## Inspected scope and limits

- Read the current instructions, backlog, live tracker, previous two summaries
  and third-pass plan. Reconciled the relevant current `CLAUDE.md` notes.
- Read all functions and dispatch branches in `scripts/start-dev.ps1` and
  `scripts/manage-dev-data.ps1`; traced sample-generation orchestration and its
  entry point without investigating account-generation internals.
- Inspected all four Actions workflows, root/tooling/Functions package scripts,
  the Functions compiler contract, both Firebase configs, project selection,
  local emulator data persistence, and the bundle/test-lint gates.
- Checked build-time environment names and emulator ports without reading
  `.env` files or credential values. The two Firebase configs agree on Functions,
  indexes and the common emulator ports; Storage's separate development config
  and console-managed production policies are deliberate recorded choices.
- Inspected the production Dockerfile only because both current Hosting workflows
  use it to produce the deployed artifact. No container was built or run, and
  this report makes no keep/remove recommendation about Docker.
- Checked the pinned Firebase CLI's local Node runtime build/validation and
  emulator reload code. No operator script, deployment, live API, real message,
  paid AI call, credential flow or production mutation was executed.
- Authentication/account-lifecycle review remains stopped. No credential,
  invitation, deletion/access-control investigation was resumed. The production
  repair script's login path was not reviewed or run.

The coordinator reuses the unchanged-source green Node 22/frontend/Functions
baseline. PowerShell is absent in this environment; its findings below have no
executed Windows-process or shell reproduction. Local CLI method probes do not
constitute a full Functions-emulator startup. Deployed policies, secret
configuration, remote workflow/branch-protection state, production backups,
restore drills, billing and alert delivery were not inspected.

## Findings

### OPS-001 — A failed emulator export does not prevent shutdown and can be reported as successful

**Severity:** Medium. **Confidence:** High for the source control flow; host
PowerShell execution unverified. **Classification:** New operator data-recovery
defect, distinct from the previously fixed localhost/parser check and T065 CLI
version drift. **Evidence:** Source-only.

**Source:** `scripts/start-dev.ps1:120–169`, especially export at `128`, success
at `129`, catch at `130–132`, and unconditional force-stop at `137–162`;
`scripts/start-dev.ps1:219–234`; `scripts/manage-dev-data.ps1:119–148`.
The persistence contract is documented in `AGENTS.md:108–109` and
`CLAUDE.md:18–19`.

**Trigger:** Use the supported `stop` or `restart` action after editing local
emulator data, and the export fails: for example, a filesystem/export-hub error.
An old export is sufficient; no successful snapshot of the latest session is
required. The emulator runs without `--export-on-exit`, so no second automatic
export is configured (`start-dev.ps1:47–50`).

**Expected:** Determine whether a new export completed before terminating the
processes that hold its data. A failure should preserve the running environment
for retry and identify that shutdown did not complete, unless the operator
deliberately selects an explicit discard/force path.

**Actual:** Even a terminating export error enters a catch that only prints
`Failed to export data`, then immediately reaches the same force-shutdown block.
For the normal Windows PowerShell native-command contract, a CLI's nonzero exit
status is not itself a caught PowerShell exception; no `$LASTEXITCODE` check
exists, and the script prints `Data exported successfully` before killing the
emulators. The standalone `export` action has the same false-success issue.
`manage-dev-data.ps1` additionally creates the export directory before invoking
Firebase, then treats that directory's existence as success: an empty or old
directory is enough to print `Successfully exported ... files!` after failure.

**Impact:** Latest local campaign edits can be lost at an ordinary stop/restart.
The next start imports the older snapshot, and the export output can mislead the
operator about recoverability. This is local development-data loss; no production
data loss is asserted.

**Verification:** Read the complete export/stop/restart functions and dispatch.
The stop path has no condition connecting export completion to shutdown. The
installed pinned CLI confirms export errors use a failure exit, not a success
result: its local `lib/emulator/controller.js:730–789` rejects missing/unresponsive
hubs and failed export requests. No export or process termination was attempted.

**Fix direction:** Centralize export into a helper that checks native exit status,
returns a reliable success/failure result and propagates failure. Export to a
temporary sibling directory and promote the completed snapshot after validating
its metadata; retain the previous good snapshot. Make stop/restart wait for a
successful export or an explicit discard choice; do not treat an existing
directory as proof of a newly completed export.

**Meaningful checks:** On the actual supported Windows PowerShell version, use a
stub native Firebase executable returning exit 1 and another throwing a shell
error. Record rather than execute process stops. Verify both cases report
failure, preserve the old export, do not stop processes and do not restart. A
successful fixture export must be promoted and permit only the owned shutdown.
Cover an existing old directory and an initially absent directory.

### OPS-002 — Stopping this project force-terminates every Java process on the host

**Severity:** Medium. **Confidence:** High. **Classification:** New operator
process-ownership defect; separate from the known orphaned React-server note.
**Evidence:** Source-only.

**Source:** `scripts/start-dev.ps1:43–51`, `81`, `140–153` and `172–176`.

**Trigger:** Run the documented `stop` or `restart` action while another Java
program is running under a user the caller can terminate: for example, another
project's emulator or a Java application.

**Expected:** Stop the emulator/server processes launched for this checkout.
Unrelated host processes should retain their lifetime and data.

**Actual:** The startup calls discard the `Start-Process` results and retain no
owned PID or process tree. Stop instead obtains `Get-Process -Name "java"` and
pipes the entire collection to `Stop-Process -Force`. There is no checkout,
command-line, port, parent-PID or ownership filter. This block runs even when the
emulator UI health check says this project's environment is absent, because
that check only guards export. The `firebase*` process enumeration is also
unscoped, although the concrete Java case alone establishes the defect.

**Impact:** A normal operation on this project interrupts unrelated Java work
without graceful shutdown. An unrelated emulator can lose its in-memory data;
other applications can lose unflushed work. No real host process was terminated
to demonstrate that consequence.

**Verification:** Read the complete startup and stop functions. The Java process
selection and unconditional force-stop pipeline establish the affected set
directly; no shell/process mock is presented as an observed Windows outcome.

**Fix direction:** Capture and persist the launched processes or their process
trees, bind them to this checkout and validate that they still refer to the
owned commands before shutdown. Request graceful termination/export first; any
force fallback must remain confined to those owned PIDs.

**Meaningful checks:** Use a process-inventory test double with owned emulator
Java processes, an unrelated Java application and another project's emulator.
Capture stop targets and verify only the owned tree is selected. Include the
case where this environment is already stopped, and a stale/reused recorded PID.
Follow with a Windows round trip using harmless synthetic child processes, not
the developer's actual applications.

### OPS-004 — Host startup never compiles Functions, so the emulator can run missing or stale backend code

**Severity:** Medium. **Confidence:** High for the build/validation contract;
full host startup unverified. **Classification:** New local backend
reproducibility defect, separate from T065's global-CLI version issue.
**Evidence:** Actual pinned CLI source with isolated filesystem/dependency
doubles; PowerShell integration source-traced.

**Source:** `scripts/start-dev.ps1:31–75`, particularly launch at `47–50`;
`firebase/functions/package.json:6–9,17`; `firebase/functions/tsconfig.json:8,14–16`;
`firebase/functions/.gitignore:1–3`; `firebase/firebase.emulators.json:4–9`.

**Trigger:** Start the documented host environment from a fresh checkout after
installing dependencies, or edit/pull Functions TypeScript after a previous
build and use start/restart. The emitted `lib/index.js` is respectively absent
or older than `src/`.

**Expected:** The Functions emulator loads the current checkout's compiled
backend. Missing/failed compilation should prevent reporting a ready development
environment. Function edits need either a compiler watcher or an explicit
rebuild as part of restart.

**Actual:** The supported host script launches `firebase emulators:start`
directly. It neither runs the Functions `build` script nor starts `build:watch`.
The package entry point is `lib/index.js`, with TypeScript emitted into `lib/`
and excluded from Git. The `predeploy` hook compiles during deploy; it does not
compile at emulator startup. The separate `functions` package `serve` script
explicitly builds first, but `start-dev.ps1` does not invoke it.

The pinned CLI's Node `Delegate.build()` is empty. Its package validator requires
the emitted entry point to exist, and a TypeScript filesystem change only
requests trigger reload; it does not transpile the source. A missing entry point
is logged by `loadTriggers`, which returns after the error, so its failure need
not stop the other emulators/UI. The host health check tests only HTTP port 4000
and then reports the complete environment ready (`start-dev.ps1:13–19,70–71,105`).

**Impact:** A fresh development setup has no callable backend despite a healthy
UI, or a developer exercises the previous Functions implementation and falsely
believes a fix/new function is under test. The relevant production deploy path
does build first and is not affected by this defect.

**Observed diagnostic:** The coordinator's actual-source probe invokes the pinned CLI's
`Delegate.build()` against a synthetic Functions tree with the repository's
entry-point/build contract. It separately exercises the current package
validator and extracts the exact current `FunctionsEmulator.loadTriggers`
method for its discovery-failure path. A stale synthetic emitted module is used
to distinguish source changes from the artifact the runtime consumes. With no
`lib/index.js`, build creates no file and validation rejects; the actual
`loadTriggers` method with controlled discovery logs that error and resolves.
With an existing synthetic emitted module, build leaves its old exported version
unchanged despite newer TypeScript source. It starts no server and imports none
of the application's function handlers. The healthy-UI/full startup consequence
is source-traced, not observed in a running emulator.

**Fix direction:** Build Functions and check the result before emulator launch;
manage a compiler watcher alongside the emulator when source edits should reload
automatically. Report backend definition-load readiness as well as UI readiness.
Preserve the current explicit emulator configuration and pinned-version policy.

**Meaningful checks:** With a disposable checkout and synthetic harmless
function, verify start generates its missing `lib` entry point, a TypeScript
syntax error stops startup visibly, and a source edit changes the loaded
handler's result after rebuild/watch. Repeat after deleting `lib`. Keep an
explicit backend-load failure check rather than accepting UI HTTP success.

### OPS-003 — Sample-generation errors resolve successfully and the entry point exits zero

**Severity:** Low. **Confidence:** High. **Classification:** New operator
failure-reporting defect. **Evidence:** Actual orchestration and entry-point
source with synthetic SDK/generator dependencies.

**Source:** `src/utils/__dev__/dndSampleDataGenerator.ts:41–79`, particularly
`77–79`; `src/utils/__dev__/generateSampleData.ts:11–25`;
`scripts/manage-dev-data.ps1:81–99`.

**Trigger:** After the generator modules have loaded, Firebase initialization or
an awaited content-generation operation rejects: for example, the emulator
becomes unavailable mid-run.

**Expected:** The generator rejects or returns a structured failed result; its
CLI entry point prints failure and exits nonzero. Partial seed data must not be
announced as a fully completed dataset.

**Actual:** The inner catch prints `Error generating sample data` and does not
rethrow or return a failure result. Its promise therefore resolves `undefined`.
The actual outer entry point takes `.then`, prints the completed-data summary,
and calls `process.exit(0)`; its intended `.catch`/exit-1 branch is unreachable
for these failures. The PowerShell wrapper then announces sample generation
success as well.

**Impact:** Failed or incomplete seed data is reported as successful. A developer
can spend time debugging the application against a broken/stale local fixture;
automation receives a successful status. This does not establish malformed
production data or an application account-lifecycle defect.

**Observed diagnostic:** The coordinator's probe transpiles and runs both current source files
in closed VMs. SDK setup and generator helpers are inert synthetic dependencies,
dotenv is a no-op, and `process.exit` is captured. It injects one initialization
failure and one late content failure, with a successful run as a control. Both
failed cases log the inner error, print the entry point's success summary and
record exit `0`; neither reaches its failure continuation, and neither completes
content. The successful control completes content and exits `0`. It does not
execute account-generation implementations or send any request.

An import/module-resolution failure *before* the orchestration runs is a
different path and is not claimed as this inner catch's outcome. Independently,
the wrapper ignores native `npx` exit status (`manage-dev-data.ps1:86–88`), as in
OPS-001's native-command handling; do not count that wrapper mechanism again.

**Fix direction:** Rethrow the inner error or explicitly expose completion/failure
and let the entry point own its final status. Check the native command's exit
code in the PowerShell wrapper before printing success. Preserve a useful error
and identify incomplete generation rather than concealing it.

**Meaningful checks:** Run the actual orchestration/entry boundary with startup
and late write failures. Each failure must emit no completed-data summary and
exit nonzero; the positive control must exit zero. A wrapper test with an
intentionally nonzero native executable should exercise module-import failure
separately and suppress the wrapper's success message.

## Checks and outcomes

Preserved [diagnostic](evidence/probes/operations/operations-probe.cjs), originally
prepared at `/tmp/pass3-operations/operations-probe.cjs`. Syntax check
passed under Node 22:

```sh
/tmp/code-review-runtime/node_modules/.bin/node --check /tmp/pass3-operations/operations-probe.cjs
```

The coordinator ran the five actual-source cases centrally with:

```sh
/tmp/code-review-runtime/node_modules/.bin/node /tmp/pass3-operations/operations-probe.cjs /workspace/DnDCampaignCompanion
```

**Result:** All five diagnostic assertions passed under Node 22; output was
recorded in the [saved output](evidence/outputs/operations/results.txt). They characterize current
defective behavior, rather than asserting the proposed fixes. The successful
generation control proves the harness also reaches a legitimate completion.
Actual orchestration/entry source and exact current CLI methods execute with
controlled dependencies. No full emulator startup, real SDK IO, account
generation, export or process shutdown is claimed. PowerShell cases remain
source-only. Full gates are reused from the byte-identical reviewed baseline,
not rerun by this reviewer.

## Reconciliation, useful controls and optional work

- Production delivery has concrete source gates: the merge workflow waits for
  the reusable test workflow before Functions (`firebase-hosting-merge.yml:26–54`),
  and Hosting waits for both (`57–58`). Functions predeploy builds the backend.
  Frontend CI has separate type, lint, test/coverage and bundle jobs; the current
  full baseline is green. Closed T061/T070 are not reopened as missing gates or
  missing Functions deployment.
- T059 already records CRA's peer-dependency workaround and the shipping
  Dockerfile's `npm install` versus CI's `npm ci`. It is known migration work,
  not a new reproducibility finding. T065 already records the host global CLI
  drift and the reason for pinning 15.22.4; no duplicate finding is filed.
- The preview job has no `needs: test`; this previously recorded preview
  non-gating behavior is not newly counted. Preview-channel cleanup has a
  source-level guard for open PRs/manual recovery and channel-name matching;
  the pinned CLI's returned `{channels}` matches its JSON parser. No real
  channel was listed or removed.
- `CLAUDE.md:51` already records that stop can leave an orphaned React server.
  The old localhost/noninteractive-parser health-check failure was corrected to
  `127.0.0.1`/`-UseBasicParsing`. These do not duplicate OPS-001/002.
- The tracker explicitly warns that imported emulator data can be arbitrarily
  old (`docs/testing/bug-tracking/README.md:187–204`). That existing warning is
  not a new seed-schema finding; OPS-003 concerns failure acknowledgement.
- Production policies are intentionally managed outside deployable config.
  Their actual parity and the production index inventory remain unverified;
  absence of remote inspection is not evidence that they are absent or wrong.
- Optional operational improvement: record the backup/restore owner, configured
  production retention and last successful restore trial, plus how an operator
  finds a previous Hosting release and matching Functions revision. This report
  does not assert that production backups or recovery controls are missing.
- Optional observability improvement: document alert ownership and the expected
  response to failed Functions deploys and logged daily-maintenance failures.
  Existing image-maintenance code logs individual failures and a run summary
  (`sweepOrphanedImages.ts:129–155`); actual alerts/delivery were not inspected.
  Prior image cleanup/recovery and PERF2-004 maintenance-concurrency findings
  stay in their original reports and are not counted again.

Fixing these operator defects needs no redesign of the deployment architecture:
preserve recoverable data, own the processes being stopped, compile the backend
being exercised, and report seed completion truthfully. No backlog, config,
source, existing test or dependency changes are made by this report.
