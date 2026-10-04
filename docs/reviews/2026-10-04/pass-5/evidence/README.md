# Fifth-pass diagnostic evidence and replay

These diagnostics support [the five specialist reports](../README.md), not
application fixes or additional CI tests. They use the complete production App,
actual Firebase SDK/local emulators and synthetic fixtures. The [verification
record](../verification.md) separates observed failures, controls, injected
transport, source-only claims and runtime/access limits.

## Retained inputs and outputs

| Area | Inputs | Outputs |
|---|---|---|
| Runtime | [helpers, runner, fixed-root server, demo environment and replay preparation](probes/runtime/) | [Production compile, asset manifest, server/emulator readiness and signed-in Home](outputs/runtime/) |
| Write failures | [Initial invalid-precision fault, corrected helper and note supplement](probes/writes/) | [Nine main cases, three note cases, readbacks and screenshots](outputs/writes/) |
| Keyboard | [Main, bounded campaign/Search follow-up and two Search-only variants](probes/keyboard/) | [Main](outputs/keyboard/), [campaign follow-up](outputs/keyboard-followup/), [ambiguous Search](outputs/keyboard-search/) and [corrected Search](outputs/keyboard-search-fixed/) |
| Listener | [Initial mapped-target transform and complete NPC follow-up](probes/listener/) | [Native notes failure/revisit/fresh-page control and actual NPC Retry/server-edit control](outputs/listener/) |
| Scale | [Current probe, reconstructed initial logic, 3,000-only wrapper and source-map summarizer](probes/scale/) | [Separate initial/follow-up/combined metrics, typed readbacks, CPU profiles, Listen messages and initial Search screenshot](outputs/scale/) |
| Restore | [Fixture, before/after runner, export manifest and source comparisons](probes/restore/) | [Config snapshot, missing-hub failure, export/import logs, hashes/readbacks and six-route before/after checks](outputs/restore/) |

All names/prose/pixels are synthetic. No raw export, synthetic-context browser
prerequisite file, debug dump, environment-secret file or private dataset is
committed. The actual 9.36 MB Firestore export and two Storage blobs stay under
`/tmp/pass5-restore/export-fresh-20261004`. The report verifies seven representative
documents and one 68-byte PNG, not every exported document or a production backup.

Saved outputs omit full synthetic sign-in action URLs and redact local Storage
download-token query values. [Redaction counts](redactions.json) document that
normalization; ANSI/trailing output whitespace is removed. Executable inputs
remain byte-for-byte copies, including explicitly synthetic fixture constants.
The restore token is an invented fixture value, not a production credential.

[Input hashes](input-hashes.json) verify retained CJS/shell/config files. Most
modules are the executed preserved versions; the current helper/runner includes
later collection/reuse corrections, and scale `initial.cjs` is a reconstructed
semantically equivalent initial variant, not a byte-original claim. Initial
keyboard/scale/NPC fixture failures remain in their actual outputs. A replay
preparation aid was assembled afterward and syntax/config checked; it starts no
service. Module success characterizes defects as well as passing controls.

## Runtime preparation

Paths match this Linux workspace. Elsewhere adapt repository/Playwright/Chromium
paths and fixed output paths. Use a disposable emulator environment with available
ports 3001/4000/4400/5001/8080/9099/9199; keep existing proxy/CA trust. Supply Node
22, Java 21, pinned Firebase CLI/dependencies, Chromium and Playwright Core.
Production/rules/device parity does not follow from local replay.

Copy probes into their expected `/tmp` locations; the restore runner deliberately
requires `/tmp/pass5-runtime/helpers.cjs` and writes its bounded files beside other
restore diagnostics. Install repository/CLI/Functions dependencies using existing
lockfiles if absent. Build Functions before preparation when compiled output is
absent; the reviewed runtime reused the unchanged prior compiled output.

```bash
cd /workspace/DnDCampaignCompanion
export PATH=/tmp/code-review-runtime/node_modules/.bin:$PATH
review_evidence_dir=/workspace/DnDCampaignCompanion/docs/reviews/2026-10-04/pass-5/evidence
for review_area in runtime writes keyboard listener scale restore; do
  mkdir -p "/tmp/pass5-$review_area"
  cp "$review_evidence_dir/probes/$review_area/"* "/tmp/pass5-$review_area/"
done
node /tmp/pass5-runtime/prepare-runtime.cjs
source /tmp/pass5-runtime/app-env.sh
BUILD_PATH=/tmp/pass5-runtime/production-build npm run build
```

The preparation aid copies only compiled `lib`, package metadata and a dependency
link, then uses the repository emulator config with loopback/path adjustments.
No Functions `.env` is staged. CRA's relevant demo/emulator variables are explicit
in [app-env.sh](probes/runtime/app-env.sh), overriding local settings without
printing secret contents. The browser aborts all non-loopback requests.

In a separate emulator terminal:

```bash
cd /tmp/pass5-runtime
export PATH=/tmp/code-review-runtime/node_modules/.bin:$PATH
FIREBASE_EMULATORS_PATH=/tmp/code-review-emulator-cache \
XDG_CONFIG_HOME=/tmp/code-review-config \
node /workspace/DnDCampaignCompanion/firebase/node_modules/firebase-tools/lib/bin/firebase.js \
  emulators:start --project demo-review-pass5 --config firebase.emulators.json \
  --only auth,firestore,functions,storage
```

Wait for every configured emulator, not just the UI. In another terminal:

```bash
PATH=/tmp/code-review-runtime/node_modules/.bin:$PATH node /tmp/pass5-runtime/server.cjs
```

This static server serves the newly built App at `http://127.0.0.1:3001`; it is
not the deployed Hosting release and uses no-store responses/uncompressed local
assets. Do not treat timings as production transport/device measurements.

## Browser modules

Run sequentially. Each area uses its own synthetic group/user. The helper clears
only that synthetic campaign/notes before ordinary seeding. `PASS5_REUSE=1`
ensures only the local synthetic Auth prerequisite and skips all Firestore seed
writes; a run-only module then preserves existing content. The stopped auth/
account-lifecycle investigation is not resumed by that setup.

```bash
export PATH=/tmp/code-review-runtime/node_modules/.bin:$PATH
export PASS5_BASE_URL=http://127.0.0.1:3001
node /tmp/pass5-runtime/run.cjs smoke
node /tmp/pass5-runtime/run.cjs writes /tmp/pass5-writes/writes-initial.cjs
node /tmp/pass5-runtime/run.cjs writes-notes /tmp/pass5-writes/note-failures.cjs
node /tmp/pass5-runtime/run.cjs keyboard /tmp/pass5-keyboard/keyboard.cjs
node /tmp/pass5-runtime/run.cjs keyboard-followup /tmp/pass5-keyboard/followup.cjs
node /tmp/pass5-runtime/run.cjs keyboard-search-fixed /tmp/pass5-keyboard/search-fixed.cjs
node /tmp/pass5-runtime/run.cjs listener /tmp/pass5-listener/listener.cjs
node /tmp/pass5-runtime/run.cjs listener-npc /tmp/pass5-listener/npc-followup.cjs
node /tmp/pass5-runtime/run.cjs scale /tmp/pass5-scale/scale.cjs
```

The initial main write helper intentionally retains the observed unsupported
nanosecond precision and acknowledged INVALID_ARGUMENT; the note supplement
imports the corrected helper. Native listener transform is scoped to a captured
local target, starts disarmed and confirms healthy state first. Its error is
injected into real SDK transport, not generated by the emulator. The initial
listener module includes the incomplete NPC fixture; use the dedicated complete
follow-up to reproduce the Retry control. Initial keyboard modules preserve
selector/setup mistakes; the exact Search-only module is the final control.

For the scale run, allow an exclusive browser slot without other profiling/full
suites. Current `scale.cjs` adds hydration recording behind a flag but defaults
to the original fixed warmup. The initial large-data Search episode may recur or
not; it is not an invariant regression assertion. Preserve partial observations
and `scale-measurements.json` before the fixtures-reusing follow-up overwrites
them. Its wrapper sets only 3,000 and makes no fixture seed:

```bash
PASS5_REUSE=1 node /tmp/pass5-runtime/run.cjs scale /tmp/pass5-scale/followup.cjs
node /tmp/pass5-scale/profile-summary.cjs /tmp/pass5-scale /tmp/pass5-runtime/production-build
```

Profiles need the build's matching source maps. Combined measurements preserve
100/1,000 from the initial complete run and 3,000 from its complete follow-up;
never infer timed-out action metrics from CPU samples. n=3/180 ms debounce,
GC/CDP overhead, different cache history, local IO and unattributed V8 samples
are documented in the [scale report](../18-browser-scale.md).

## Disposable export/import drill

Do this after other browser workloads finish. `before` seeds the seven fixtures
and saves an ordinary synthetic API context under `/tmp`; `after` never calls
a content seed. The before/after runner asserts hashes/metadata independently
before browser sign-in, then verifies six routes, portrait decode and media.

```bash
node /tmp/pass5-restore/run-restore.cjs before
XDG_CONFIG_HOME=/tmp/code-review-config \
node /workspace/DnDCampaignCompanion/firebase/node_modules/firebase-tools/lib/bin/firebase.js \
  emulators:export /tmp/pass5-restore/export-fresh-REPLAY \
  --only firestore,storage --config /tmp/pass5-runtime/firebase.emulators.json \
  --project demo-review-pass5 --non-interactive
node /tmp/pass5-restore/export-manifest.cjs /tmp/pass5-restore/export-fresh-REPLAY
```

Use a newly named absent export path, with no `--force`, and require successful
export before stopping. Stop only the owned emulator terminal with Ctrl+C, then
start the same emulator command with
`--import /tmp/pass5-restore/export-fresh-REPLAY`. Wait for full readiness. Auth
is intentionally absent from the archive, so recreate only its ordinary synthetic
sign-in prerequisite through the reuse helper, then run the after phase:

```bash
PASS5_REUSE=1 node - <<'JS'
const helper=require('/tmp/pass5-runtime/helpers.cjs');
helper.seedBase('restore').catch(e=>{console.error(e.message);process.exitCode=1;})
  .finally(()=>helper.db.terminate());
JS
node /tmp/pass5-restore/run-restore.cjs after
```

No Firestore/Storage content seed is called after import. Metadata comparison
selects content/bucket/cache/checksum/custom fields, excluding regenerated
version/time fields. Neither the success drill nor the recorded missing-hub
export control validates native Windows shutdown guards, production backups or
Auth restoration. Retain only bounded manifests/readbacks/logs/screenshots;
redact synthetic token URLs before committing output. Stop the owned static and
emulator terminals when done; do not use broad Java/Node process termination.
