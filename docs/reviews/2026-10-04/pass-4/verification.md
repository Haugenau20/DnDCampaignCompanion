# Fourth-pass verification

Reviewed baseline: `c2d8a88d0541b01c0f9cc2e7c497206a29746ce5`, current `main`
after the earlier review stack merged. Application source, existing tests,
rules, configuration and dependencies are identical to the original `64fe195`
baseline. This pass changes only review records, indexes and diagnostic evidence.

## Local runtime

The repository's [startup script](../../../../scripts/start-dev.ps1) launches
Windows PowerShell windows. PowerShell is unavailable here; the same configured
services and ports were started directly on Linux. Root `npm start` runs the
complete CRA App, with explicit `REACT_APP_*` demo-project/emulator overrides.
Functions were freshly built, then only compiled `lib` and `package.json` were
copied under `/tmp`; their installed dependencies were linked. No Functions
`.env` or credentials were copied. Temporary configuration changes path
resolution and emulator hosts, not repository configuration.

| Service | Endpoint | Observed readiness |
|---|---|---|
| Complete App | `127.0.0.1:3000` | CRA compiled successfully; synthetic signed-in Home and real feature routes rendered |
| Auth | `127.0.0.1:9099` | Ordinary local email-link sign-in; synthetic user only, no real mail |
| Firestore | `127.0.0.1:8080` | Actual application SDK reads/writes; independent local Admin readback |
| Functions | `127.0.0.1:5001` | 18 definitions loaded; ordinary setup/usage calls completed; no supplier invocation |
| Storage | `127.0.0.1:9199` | Actual image upload, binary inspection, browser decode and removal |
| Emulator UI / hub | `127.0.0.1:4000` / `4400` | All configured emulators ready |

Project: `demo-review-pass4`; synthetic user/group `review-user`/`review-group`.
No existing emulator export was imported or overwritten. Reviewer campaigns are
separate and experiments run sequentially because the user's active campaign
is shared. The repository config specifies no Firestore rules and explicitly
permissive development Storage rules. This is local functional verification,
not production-policy or access-control validation. Scheduled Pub/Sub image
sweeping is not started by this service selection.

Tooling: Node 22.23.3, npm 11.9.0, Java 21, Firebase CLI 15.22.4, Chromium
151.0.7922.173 and Playwright Core. Chromium allows loopback requests only;
remote font, Firebase configuration/installation and analytics attempts were
aborted and recorded by origin/path without query credentials. CLI/Admin SDK
metadata/MOTD attempts emitted restricted-network 403 warnings; local service
work still completed. No production/private data or paid model call was used.
The [runtime outputs](evidence/outputs/runtime/) preserve compile/readiness and
smoke evidence. Synthetic sign-in links and image download tokens are redacted.

## Executed browser checks

The central runner supplied a real Playwright page/session and local fixture API
to specialist `seed`/`run` modules. App/router/providers/services remain actual
repository code; the fixtures and faults are synthetic. Results are recorded in
[diagnostic evidence](evidence/README.md), including replay commands.

| Run | Result | Interpretation |
|---|---|---|
| Full-App smoke | Complete; signed-in Home rendered, no page errors | Validates runtime and ordinary synthetic setup |
| Workflow main | 20 observed journey/candidate cases, one Search selector error | 18 ordinary/conversion/delete controls and two product findings; Search error was a probe mistake |
| Workflow follow-up | Two known-issue reproductions, six exact Search routes and image-storage round trip complete | Search worked after exact option selection; no query reissue in this warm-provider check; local WebP uploaded/decoded/reopened/removed |
| Recovery corrected main | Five completed scenario groups; terminal simulation timed out without injection | Queued-route and fallback failures confirmed; unmount/reconnect control passed; tabs/reload strengthen prior findings |
| Ordinary fallback follow-up | Complete through campaign menu and Search | Confirms wrong fallback heading without synthetic history navigation |
| Terminal Fetch follow-up | Six requests/14 frames, no target IDs and `injected: false` | Unverified; healthy list does not establish terminal-error recovery |
| Legacy main and bounded chapter follow-up | Seven distinct compatibility controls complete | Six initially passed; selecting actual List mode corrected the seventh probe's shelf assumption |
| Legacy timezone follow-up | Date-only defect plus ISO control and real edit readback complete | Actual Chromium timezone override, not a physical-device measurement; date stored unchanged |

Completed main/follow-up browser boundary records contain zero uncaught page
errors. Probe assertions deliberately characterize failures and controls; exit
zero is not a claim that the application is defect-free. Browser groups are not
Jest suite/test counts. Backend readback avoids treating Firestore's optimistic
browser snapshot alone as acknowledged persistence.

## Harness corrections

Initial runtime setup tried an absolute Functions source that the CLI resolved
relative to its temporary config. The coordinator stopped that owned CLI and
restarted with a relative staged Functions directory. Ordinary email-link UI was
used after correcting an initial password-form assumption. Neither is a source
finding.

Initial workflow Search selected the named-create command via loose text matching.
The follow-up uses exact result IDs, retaining the original diagnostic output.
Initial recovery Search had the same selector issue; a fresh-tab session also
needed the ordinary remember-me choice. The central route handler was corrected
to tolerate handled/closed-route teardown during local fault removal/reload.
These initial partial results do not support product claims. The corrected run
and ordinary follow-up provide the findings' evidence.

The legacy probe initially expected a visible chapter title in the default Shelf
view. It now selects List, and only the affected case was rerun against retained
fixtures. The first terminal transform used XHR despite the SDK's Fetch stream;
the bounded Fetch follow-up also missed the notes target. Both terminal attempts
remain unverified, and neither contributes to the five findings.

Archived helpers/modules are the final versions, including these corrections.
The initial workflow main had already loaded its module before the two known-
issue cases were appended; those cases were executed in the follow-up. Replay of
the final main module includes them. Exact earlier-version reconstruction is not
claimed. The replay preparation aid was assembled afterward and checked to stage
files/config correctly; it did not start a second runtime.

## Reused full baseline and final document checks

The [first-pass baseline](../../2026-10-03/baseline.md) records successful
TypeScript, production lint, test-lint baseline gate, frontend/Functions builds,
307 frontend suites (5,783 passed, two skipped) and 12 Functions/emulator suites
(216 passed). Test lint accepts its 1,005 recorded existing problems; that gate
is not a zero-lint result. These full checks are reused for identical source and
are not claimed as fresh fourth-pass runs. This pass freshly compiled Functions
and CRA and added the complete-App checks above.

Final verification covers relative document links and source-line bounds,
all archived CJS syntax, output JSON parsing, retained-input hashes, whitespace
and documentation-only git scope. Detailed final counts are recorded in
[evidence/document-checks.json](evidence/document-checks.json).

Authentication/account lifecycle remains stopped. Physical devices, alternate
browsers, production transport/policy parity, real export/import/restart,
acknowledged-write crashes, direct-read reordering, screen-reader speech and
live supplier behavior were not tested. No application fix, existing test,
rule/config/dependency or backlog edit was made.
