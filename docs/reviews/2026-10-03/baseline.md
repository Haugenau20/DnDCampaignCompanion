# First-pass verification baseline

Reviewed commit: `64fe19512b1d3bd14427fad8996403a742fbe8a9` (`origin/main`
confirmed by fetch before agents launched). Branch: `work`. The initial local
changes were the review plan/index and their link in `docs/README.md`.
The baseline was not changed during review.

## Runtime and setup

- CI-compatible Node **22.23.3**, installed only under `/tmp/code-review-runtime`.
  The environment's default Node was 24.19.0; verification used the temporary
  Node 22 executable through `PATH`, without changing repository dependencies.
- npm 11.9.0 and Java 21.0.12.1. Firebase CLI **15.22.4**, the existing repository
  pin. Existing frontend/CLI/Functions dependencies were already present.
- The temporary npm cache and Firebase emulator cache/config were placed in
  `/tmp` because the ordinary home cache was read-only. No lockfiles changed.
- Central Auth, Firestore, and Storage emulators ran at loopback ports
  9099/8080/9199 under `demo-code-review`. The Functions/rules suites and focused
  probes each use their own `demo-` project. No Functions server, production
  backend, mail delivery, or paid model request was required.
  The central emulator session was stopped after verification.

Emulator startup command, with temporary Node 22 first on PATH:

```bash
FIREBASE_EMULATORS_PATH=/tmp/code-review-emulator-cache \
XDG_CONFIG_HOME=/tmp/code-review-config \
node firebase/node_modules/firebase-tools/lib/bin/firebase.js \
  emulators:start --only auth,firestore,storage \
  --config firebase/firebase.emulators.json \
  --project demo-code-review --non-interactive
```

The central emulators were kept alive for the suite and focused probes, rather
than restarting them for each command. This exercises the same test configuration
as `npm --prefix firebase run test:functions` with explicit isolated project
selection. The permissive startup rules are not the production policy tests:
the rules suites/probes explicitly load the repository `.prod` rules into their
own disposable project namespaces.

## Recorded checks

| Check | Command | Result |
|---|---|---|
| Type checking | `node node_modules/typescript/bin/tsc --noEmit` | Pass, exit 0 |
| App lint/cycles | `npm run lint` | Pass, exit 0 |
| Test lint baseline | `npm run lint:tests` | Pass: 1,005 recorded problems in 148 files equals the existing 1,005 baseline; this is a baseline gate, not zero lint problems |
| Frontend coverage suite | `npm run test:ci -- --maxWorkers=2` | Pass: **307 suites; 5,783 passed, 2 skipped, 5,785 total**; exit 0 |
| Production build | `CI=false npm run build` | Pass, exit 0; same CI setting as the repository build job |
| Entry bundle budget | `npm run check:bundle` | Pass: **266.64 kB gzip**, below **275 kB**; 20 route chunks |
| Functions build | `npm --prefix firebase/functions run build` | Pass, exit 0 |
| Functions and production-copy rules suites | `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199 npm --prefix firebase/functions test` | Pass: **12 suites; 216 tests**, exit 0 |

Frontend coverage: **94.79% statements / 86.16% branches / 89.58% functions /
95.52% lines**, above the uniform 80% threshold. The frontend suite took
108.401 seconds (110.47 seconds including npm/runner overhead); the Functions
suite took 15.336 seconds. Older counts in `AGENTS.md` are historical and were
not used as the measured baseline.

The emulator-backed Admin SDK emitted `MetadataLookupWarning` (403 from metadata
lookup); checks still completed successfully using explicit demo project IDs.
Expected error-path logging in existing tests is not a failed assertion.

Runner commands/exit codes/durations for the seven build/frontend checks are
preserved in [evidence/baseline-results.json](evidence/baseline-results.json).
Full transient logs remain in `/tmp/code-review-baseline`; focused reproduction
logs and scripts are preserved in this review's evidence directory.

## Meaning and limitations

The baseline is green while the focused probes reproduce untested interleavings
and failure contracts. Passing coverage does not refute those findings.
No application code, existing tests, rules, package manifests, lockfiles,
backlog records, or deployment settings were modified by this review.

Production console rule parity, deployed function versions/configuration, App
Check enforcement on live requests, browser/device behavior, and production data
migrations were not verified. Source-runtime mocks model specific schedules and
faults; they do not claim the frequency of those schedules in production.
The auth specialist was stopped at the maintainer's request after a policy
interruption; its report is partial. See [pass-1-summary.md](pass-1-summary.md)
and [evidence/probe-results.md](evidence/probe-results.md).
