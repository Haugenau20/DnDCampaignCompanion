# Fifth-pass verification

Baseline: `4ebd53362c34840871745386b99f7905de75c26a`, PR #200 head.
Source/configuration/rules/dependencies/existing tests match `64fe195`.
Changes are confined to review records, indexes and diagnostic evidence.

## Runtime

Fresh project `demo-review-pass5` runs Auth 9099, Firestore 8080, Functions 5001,
Storage 9199, UI 4000 and hub 4400 on loopback. The repository's emulator config
is copied under `/tmp/pass5-runtime`; path resolution and loopback hosts are
adjusted there. Only previously compiled Functions `lib`/package files and an
installed-dependency link are staged, with no Functions environment files. No
repository emulator-data directory is imported or overwritten. The stopped
fourth-pass services were not reused as a data baseline.

CRA production compilation freshly passed with explicit synthetic Firebase and
emulator settings, output `/tmp/pass5-runtime/production-build`. A fixed-root
loopback static server at 3001 supplies the actual App and SPA routes. Node
22.23.3/npm 11.9.0, Java 21, Firebase CLI 15.22.4, Chromium 151.0.7922.173 and
Playwright Core match the prior toolchain. The optimized entry is about 266.8 kB
gzip; this compilation uses review environment strings, not production settings.

Reviewers prepare `seed`/`run` modules; central browser runs execute sequentially
with distinct synthetic users/groups, so active-campaign writes cannot cross
reviewer scopes. All browser requests allow loopback only. Remote fonts,
analytics and Firebase configuration/installation attempts are blocked and
recorded by origin/path. CLI/Admin metadata attempts emit restricted-network
403 warnings without preventing local work. Development Firestore/Storage
rules are permissive; no authorization/deployed-policy claim follows.

## Executed checks and results

| Check | Result and boundary |
|---|---|
| Production compile / Home smoke | Completed; actual signed-in demo Home rendered |
| Write main | Nine observed cases, including permanent server rejection, draft/retry, known gating/conversion/partial deletion and image cleanup; one actual unhandled rejection on attachment recorded |
| Note-write supplement | Three observed cases; autosave/manual retry control and new Delete/Archive feedback gap; no page errors |
| Keyboard main and bounded follow-ups | All thirteen planned scenarios observed; four selector/setup failures preserved and corrected; final exact palette result/Escape/navigation control passes |
| Listener main | Healthy exact notes target captured; synthetic selected frame reaches native SDK error; route return stays failed while server/fresh page are healthy. Incomplete NPC fixture initially prevents its control. |
| NPC-listener follow-up | Complete required fixture; selected native error and actual Try again reopen subscription; independent server rename appears. All new-page error collection reports zero page errors. |
| Production scale | 100/1,000 initial scenarios complete; 3,000 initially stalls on 15 Search results. Follow-up repeats only 3,000 without seeding, and completes full measurements. n=3 warm samples, n=1 new-document samples; no field/device metrics. |
| Source/deployment comparison | Config/project/index/Hosting/runtime assumptions inspected; 20 index definitions/two field overrides inventoried. No live inventory/headers/policy equality verified. |
| Missing-hub export | Actual CLI exits 2; no output directory created. Does not validate Windows stop handling. |
| Restore before | Seven exact fixture documents, typed/nested/Unicode values and relationships, PNG byte/selected metadata readback; six actual routes plus image decode/media fetch pass |
| Export/shutdown/import | Pinned CLI export succeeds for Firestore/Storage, with Auth absent; nine-file checksum manifest retained. Only owned emulator CLI receives SIGINT, then fresh startup imports that new synthetic archive. |
| Restore after | No content reseed. Exact seven-document and binary/selected metadata comparison passes; six App routes, image decode and media 200 pass. Auth setup recreated only for ordinary local sign-in. |

The raw synthetic export remains under `/tmp`; only manifest/checksums and
bounded diagnostic readbacks are committed. An exact comparison does not cover
all historical user data, backups, codec combinations or production restore.
The metadata comparison excludes generation/update timestamps which import may
regenerate. Auth restoration is deliberately not asserted.

## Interpretation and harness corrections

Main write mutation used a nanosecond timestamp unsupported by the emulator,
which returned acknowledged `INVALID_ARGUMENT`. Its executed input is preserved
as `writes-initial.cjs`; subsequent notes use a valid microsecond stale
precondition. The note console error code was not captured, so only its actual
settlement, unchanged server state and healthy retry are claimed. These are
controlled rejected writes, not production incidents or transient-outage tests.

Listener faults replace one mapped native notes/NPC Watch target event with
`REMOVE/cause14`. Actual SDK callbacks, UI and retry are verified; that frame
was not generated by the server. Initial NPC fixture omitted required
`relationship` and caused a directory error; the complete follow-up fixes only
the synthetic fixture. Initial central page-error collection covered the main
page only. Later runs collect new-page errors as well; the initial console
records/fixture failure are not erased by the later zero-error controls.

Keyboard initial campaign/Search assumptions ran before session restoration;
subsequent loose option/combobox selectors confused create commands and the
native Notes sort Select. Each diagnostic failure is retained. Final keyboard
Search uses the real input and exact result id. No product finding is assigned
to those setup mistakes.

The initial scale module timed out before flushing 3,000-record action metrics;
those values are not reconstructed from its profile. Its `initial.cjs` preserves
semantically equivalent fixed-warmup logic, without a byte-identical original
claim. The retained current module/wrapper includes bounded hydration recording;
combined metrics use only complete 100/1,000 initial plus 3,000 follow-up data.
The follow-up starts with 30 hits and does not prove an index-arrival/requery
repair. CPU self attribution remains heavily `(program)`/native and cannot
establish inclusive React time or production performance percentiles.

Fixture PNG CRC/type fields were corrected before the restore seed. The after
runner reconstructs API context without calling a content seed; independent
readback occurs before its browser sign-in and feature journeys. The separate
ordinary synthetic Auth prerequisite does not modify Firestore seed content.

## Reused gates and document checks

The [original baseline](../../2026-10-03/baseline.md) has successful TypeScript,
production lint, test-lint baseline gate, frontend/Functions builds, 307 frontend
suites (5,783 pass/two skipped) and twelve Functions/emulator suites (216 pass).
Its test-lint gate permits 1,005 recorded existing problems. Full gates are reused
for identical source; this pass claims a fresh production build and the focused
checks above, not another full-suite run.

Final syntax/JSON/local-link/source-line/hash/whitespace and docs-only scope
checks are recorded in [document-checks.json](evidence/document-checks.json).
Diagnostic success/exit zero characterizes defects and controls; no application
repair or universal pass is implied. Physical devices, alternate browsers,
screen-reader speech, native Windows, live deployment parity, production
restore/privacy/audit settings and live supplier calls remain unverified.
Authentication/account lifecycle remains stopped; no application, existing test,
rule/config/dependency or backlog changes were made.
