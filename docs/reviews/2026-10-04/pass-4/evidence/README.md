# Fourth-pass diagnostic evidence and replay

These are review diagnostics, not application fixes or new CI tests. They run
against the complete CRA App and real local Firebase emulators with synthetic
fixtures. The [verification record](../verification.md) explains runtime
boundaries, harness corrections and unverified experiments. Specialist reports
interpret each readback; an observation named `candidate` is not automatically
a confirmed defect.

## Preserved material

| Directory | Inputs/outputs | Interpretation |
|---|---|---|
| [Runtime probes](probes/runtime/) | Final `helpers.cjs`, `run.cjs`, and later `prepare-replay.cjs` aid | Local demo seeding/sign-in, loopback-only browser runner and isolated Functions/config staging |
| [Runtime outputs](outputs/runtime/) | CRA compile, Functions build, emulator readiness, actual config, signed-in smoke observations/output and Home screenshot | Local runtime readiness; no Windows script/export/import execution |
| [Workflow probes](probes/workflows/) | Fixtures, main journeys and bounded follow-up | Actual authoring/attachment/conversion/delete plus exact Search, known-issue and portrait checks |
| [Workflow outputs](outputs/workflows/) | Main/follow-up observations/output; initial selector screenshot | Two new failures plus passing controls; initial Search mistake is diagnostic history |
| [Recovery probes](probes/recovery/) | Corrected main, ordinary fallback and bounded terminal follow-up | Offline/Write-channel faults and normal navigation; terminal injection did not trigger |
| [Recovery outputs](outputs/recovery/) | Initial partial and corrected main, ordinary and terminal observations/output; screenshots | Only corrected/ordinary observations support findings; initial setup issues and terminal misses do not |
| [Legacy probes](probes/legacy/) | Supported-shape fixtures/journeys, chapter follow-up and date-timezone check | Actual read/edit/independent persistence checks and CDP timezone comparison |
| [Legacy outputs](outputs/legacy/) | Initial and chapter readbacks/output, timezone results and screenshots | Seven supported controls passed; initial shelf-selector failure retained; one confirmed display defect |

Every name/prose record is synthetic. Fixture provenance and supported-data
contracts are in [the legacy report](../16-legacy-data.md#fixture-provenance-and-validity).
Prepared extraction detections exercise conversions without a supplier request.
The image is a 149-byte, 16 × 12 generated PNG, prepared by the actual browser
pipeline into WebP. Storage paths and dimensions are retained; download-token
query values are replaced with `REDACTED`. Replay obtains a fresh local token.
Full synthetic email-action links are omitted from emulator output. ANSI terminal
formatting and trailing output whitespace are removed. No debug dump, secret file or private export is archived.

[Input hashes](input-hashes.json) cover the final preserved CJS files and the
executed temporary config. The original runtime helpers were corrected during
setup, and known-issue cases were appended after the first workflow module was
loaded. Final inputs match their retained originals, but earlier partial runs
are not claimed to use identical inputs. The prepare aid was assembled later
and executed only to verify staging, not to start another service. The main
chapter module was updated to select List; initial chapter output predates that
selector correction. See [verification](../verification.md#harness-corrections).

## Replay prerequisites and service setup

Replay is scoped to a disposable synthetic emulator environment. Paths below
match this review workspace. Elsewhere, change the repository path in helpers/
prepare aid, Playwright module path and Chromium executable. Install repository,
Firebase CLI and Functions dependencies using their existing lockfiles; provide
Node 22, Java 21, Chromium and Playwright Core. Browser execution needs permission
to connect to loopback sockets. Keep cloud proxy/CA settings intact where present.

Use separate terminals for services and run browser modules sequentially. Ports
3000, 4000, 4400, 5001, 8080, 9099 and 9199 must be available for this fresh demo
runtime. The prep aid does not stop services or import/export anything. It stages
only compiled Functions/package files and a dependency link, excluding `.env`.
The temporary config preserves the repository's development-rule selection.

```bash
cd /workspace/DnDCampaignCompanion
export PATH=/tmp/code-review-runtime/node_modules/.bin:$PATH
npm --prefix firebase/functions run build
node docs/reviews/2026-10-04/pass-4/evidence/probes/runtime/prepare-replay.cjs
```

In the emulator terminal:

```bash
cd /tmp/pass4-replay-runtime
export PATH=/tmp/code-review-runtime/node_modules/.bin:$PATH
FIREBASE_EMULATORS_PATH=/tmp/code-review-emulator-cache \
XDG_CONFIG_HOME=/tmp/code-review-config \
node /workspace/DnDCampaignCompanion/firebase/node_modules/firebase-tools/lib/bin/firebase.js \
  emulators:start --project demo-review-pass4 --config firebase.emulators.json \
  --only auth,firestore,functions,storage
```

The review used `/tmp/pass4-runtime` as staging; the replay aid uses a separate
`/tmp/pass4-replay-runtime` directory. Cached emulator files may need downloading
if absent. Wait for all configured emulators to be ready, not merely the UI.
Scheduled Pub/Sub triggers are intentionally outside this service selection.

In the App terminal:

```bash
cd /workspace/DnDCampaignCompanion
export PATH=/tmp/code-review-runtime/node_modules/.bin:$PATH
BROWSER=none HOST=127.0.0.1 PORT=3000 \
REACT_APP_USE_EMULATORS=true REACT_APP_EMULATOR_HOST=127.0.0.1 \
REACT_APP_AUTH_EMULATOR_PORT=9099 REACT_APP_FIRESTORE_EMULATOR_PORT=8080 \
REACT_APP_FUNCTIONS_EMULATOR_PORT=5001 REACT_APP_STORAGE_EMULATOR_PORT=9199 \
REACT_APP_PROJECT_ID=demo-review-pass4 REACT_APP_API_KEY=synthetic-review-key \
REACT_APP_AUTH_DOMAIN=demo-review-pass4.firebaseapp.com \
REACT_APP_STORAGE_BUCKET=demo-review-pass4.appspot.com \
REACT_APP_MESSAGING_SENDER_ID=000000000000 \
REACT_APP_APP_ID=1:000000000000:web:syntheticreview \
REACT_APP_MEASUREMENT_ID=review-disabled npm start
```

Wait for successful compilation. This runs the actual App rather than a focused
component harness. Root CRA may load local environment files, but the relevant
Firebase/emulator settings above override them. The browser runner aborts
nonlocal requests, including analytics/configuration attempts. No production
credential or external model request is needed.

## Browser commands

Each module exports `seed(api)`/`run(api)`; the central runner provides browser,
session, Firebase Admin API and output recording. The helper clears only the
selected synthetic review campaign/its notes before seeding, unless
`PASS4_REUSE=1`. That reuse flag is required for the bounded legacy chapter
follow-up. Synthetic global profile state is reset for the selected campaign;
parallel runs would interfere. The recovery fixture also uses the shared
synthetic second campaign `review-recovery-b`.

```bash
cd /workspace/DnDCampaignCompanion
export PATH=/tmp/code-review-runtime/node_modules/.bin:$PATH
review_evidence_dir=docs/reviews/2026-10-04/pass-4/evidence
node "$review_evidence_dir/probes/runtime/run.cjs" smoke
node "$review_evidence_dir/probes/runtime/run.cjs" workflows "$review_evidence_dir/probes/workflows/workflows.cjs"
node "$review_evidence_dir/probes/runtime/run.cjs" workflows-followup "$review_evidence_dir/probes/workflows/followup.cjs"
node "$review_evidence_dir/probes/runtime/run.cjs" recovery "$review_evidence_dir/probes/recovery/recovery.cjs"
node "$review_evidence_dir/probes/runtime/run.cjs" recoveryordinary "$review_evidence_dir/probes/recovery/ordinary-fallback.cjs"
node "$review_evidence_dir/probes/runtime/run.cjs" recoveryterminal "$review_evidence_dir/probes/recovery/terminal-listener.cjs"
node "$review_evidence_dir/probes/runtime/run.cjs" legacy "$review_evidence_dir/probes/legacy/legacy.cjs"
PASS4_REUSE=1 node "$review_evidence_dir/probes/runtime/run.cjs" legacy "$review_evidence_dir/probes/legacy/chapter-followup.cjs"
node "$review_evidence_dir/probes/runtime/run.cjs" legacytimezone "$review_evidence_dir/probes/legacy/date-timezone.cjs"
```

The runner writes `/tmp/pass4-AREA/observations.json` and prints observations.
Redirect stdout/stderr to a task-specific `.txt` file if retaining it. Preserve
legacy initial observations before the reuse follow-up overwrites that path.
The final workflow module also contains the two known-issue cases executed
separately in the retained follow-up; replay output therefore has extra entries
relative to the original main. IDs/timestamps generated on replay will differ.
Download/OOB token values must be redacted before archiving replay output.

The main recovery script uses a synthetic history adapter for supplemental
fallback transitions, and real Search for queued-save navigation. The ordinary
fallback module independently confirms the cause through actual campaign menu
and Search. Terminal transforms are bounded to local Firestore Watch traffic
and stop after 15 seconds without injection; the retained result is explicitly
unverified. A fresh replay is not expected to turn that limitation into proof.

No module is an authorization probe. Sign-in retrieves only a fresh synthetic
local email action to establish the ordinary session; same-tab/tab persistence
is setup. Authentication/account lifecycle review remains stopped. Use Ctrl+C
in the owned service terminals to stop this disposable runtime; do not run the
repository's broad Windows process-stop helper on a shared Linux workspace.
