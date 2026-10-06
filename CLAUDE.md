# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose
A tool for D&D **players** (not DMs) to collect and organize their shared campaign data: stories,
rumors, NPCs, locations, and quests. Components should focus on player-facing features.

**Design for scale.** The site has fewer than 20 users today, but design everything as if it were a
large, fully deployed website with many users: concurrency, abuse, data volume and cost included.
"Only a handful of people use it" is never the reason to skip a guard, an index or a race fix.

**Key documents**
- `TODO.md` — **start here**: the backlog, its priorities and what is blocked on whom
- `docs/testing/bug-tracking/README.md` — live bug tracker
- `docs/architecture/migration/deep-dive-feature-enhancements.md` — long-term feature ideas (nothing in it is installed yet)

## Running the Project

- Start: **`.\scripts\start-dev.ps1 -Action start`** — compiles `firebase/functions`, then the
  Firebase emulators, then `npm start`, all directly on the host. **No Docker.** The emulators run
  the compiled `lib/`: after editing a function, `npm --prefix firebase/functions run build`.
- **The emulators need Java 21+** (firebase-tools 15). `start` checks it first and says what it found;
  emulators that exit while starting have their last output printed, and the full log is
  `firebase/emulator-start.log`.
- Stop / restart / status: `.\scripts\start-dev.ps1 -Action stop|restart|status` (`stop` exports
  emulator data to `firebase/emulator-data`; `start` re-imports it if present). A failed export
  stops nothing; `-Force` stops anyway and loses the changes since the last export. `stop` ends only
  what listens on this project's ports (and what those processes started), not every `java`.
- Sample data: `.\scripts\manage-dev-data.ps1 -Action generate`
- **Never stop a dev server or the emulators you did not start in this session.** The maintainer
  usually has them running. Need to switch branches under a running dev server? Ask first, or use a
  worktree.

The emulators run from **`firebase/firebase.emulators.json`**, not `firebase.json`: `firebase.json`
names the **production** rulesets (`*.rules.prod`, which CI deploys), while the emulators need the
permissive ones. Starting emulators by hand? Pass `--config firebase.emulators.json` too, or they
enforce production rules against dev data and Storage (9199) is missing.

There is no Docker anywhere: CI builds the shipped site directly, from the lockfile
(`npm ci`, then `npm run build` — see T107).

### If the dev server reports errors that `tsc` and `npm run build` do not
Vite pre-bundles dependencies into `node_modules/.vite`. After a dependency change or a branch switch
under a running dev server, a stale pre-bundle can report errors no gate sees: stop it, then
`rm -rf node_modules/.vite` (or `npx vite --force`) and start again. Neither the dev server nor the
build type-checks; `npx tsc --noEmit` does.

**`os = "linux"` in a user `~/.npmrc` breaks Vite on Windows**: npm then installs Rolldown's,
Lightning CSS's and esbuild's Linux binaries, and the dev server and build fail with "Cannot find
native binding". The message suggests deleting `package-lock.json` -- don't; remove the `.npmrc`
line and run `npm ci` (or `npm ci --os=win32` for one install).

### Environment gotchas
- The scripts' health checks must use `127.0.0.1` and `Invoke-WebRequest -UseBasicParsing`. Until
  2026-09-24 they used `localhost` without it, and always failed: Windows PowerShell's default
  parser refuses to run non-interactively, and the dev server listens on IPv4 only (`server.host` in
  `vite.config.ts`), so `localhost`
  tries `::1` first and outlasts the 2 s timeout. Symptoms, if they return: `start`/`restart` claims
  the emulators "failed to start within 45 seconds" and never runs `npm start`, `stop` **silently
  skips the export**, and `status` says nothing is running. Check ports 3000/4000/5001/8080/9099/9199.
- Responsive checks: a maximized Chrome window ignores resize below its minimum width. Render the app
  in a 320px-wide iframe instead — media queries evaluate against the iframe's own viewport.
- The header overflows horizontally below ~380px on **every** route (tracked in `TODO.md`). If your
  page "overflows at 320px", check whether the offender is inside `header`/`footer` first.
- **Signing in as another user in a browser check.** There are no passwords: sign-in is a magic link
  or Google, and the Auth emulator keeps every link in an outbox instead of sending mail. In the dev
  server the "Check your inbox" screen has a dev-only **Open the emulator's link** button
  (`DevEmailLinkShortcut`). By hand: request a link from `/signin` (or mint one with
  `POST http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=fake-api-key`
  and `{"requestType":"EMAIL_SIGNIN","email":…,"continueUrl":"http://localhost:3000/auth/link…","canHandleCodeInApp":true}`),
  read it from `GET http://127.0.0.1:9099/emulator/v1/projects/dnd-campaign-companion/oobCodes`,
  and navigate to its `oobLink`. Set `localStorage.pendingEmailSignIn` to
  `{"email":…,"rememberMe":false}` first if the link wasn't requested from that browser. Google
  sign-in opens a popup the browser agent cannot drive — that's the maintainer's to check.
- Seeded accounts for such checks (`SAMPLE_MEMBERSHIPS` in `utils/__dev__/generators/userGenerator.ts`):
  `player9@example.com` (Faramir) is in **no group**; `player8@example.com` (Eowyn) is a **second
  admin** in group 1. An older emulator dataset lacks both — regenerate it (this resets the other
  seeded profiles too).

## Testing

- `npm test` — jest. **The suite is expected to be fully green; any red is a regression.**
- `npm run test:coverage` — CI floor is a uniform **80%** (`jest.config.ts`)
- `npm run test:behavioral` — behavioural suites only; `npm run test:html` — HTML report
- `npm run lint` — ESLint on app code (test files excluded), **zero warnings allowed**; CI runs it
- `npm run lint:tests` — ESLint on the test files against a per-file baseline
  (`scripts/test-lint-baseline.json`) that may only go down; CI runs it. Fixed problems in a test
  file you touched? It fails until you lower the baseline: `npm run lint:tests -- --update`, then
  read the baseline's diff — `--update` records a rise just as readily
- Single file, fast: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="<pattern>"`

**Baseline**: 0 failed / 2 skipped / 6049 passed / 6051 total across 315 suites (2026-10-06,
`main` at `aac8ae1`, via `npm run test:ci`). The 2 skips are #901's, closed as testability-only.
- **Measure a new baseline; never carry one forward.** Past figures went stale by up to 25 suites
  because they were taken on branches that later merged. If your run disagrees, run the suites you
  touched alone and reconcile the delta before assuming a regression.
- A full run prints `A worker process has failed to exit gracefully` and still exits 0 — pre-existing,
  ignore it.
- Don't run the suite while `npm run build` competes for CPU; it produces spurious timeouts
  (e.g. `QuickAddForm.test.tsx`).
- To prove "the same suites failed", run the suspects alone; piping a full run through `tail`
  discards earlier failures' names.
- Two catalogued defects (#1414, #1415) are pinned by tests asserting the **defective** behaviour,
  so they are green. Check the tracker before dismissing any red as "expected".

### Testing philosophy
Tests define expected behaviour and reveal bugs — **never modify a test to make it pass.** Write
tests from requirements, not the current implementation; fix the code or document the issue in the
tracker.

**A failing test is not automatically a bug.** Three catalogued "bugs" (#013, #014, #300) were a
missing `crypto.randomUUID` in JSDOM: the tests died on the environment error before any assertion.
When triaging a red test, first establish that it actually executed the code it names.

### `firebase/functions` has its own suite — root `npm test` does not run it
`cd firebase/functions && npm test` runs jest against the **running emulators** (start them with
`start-dev.ps1` first; a `globalSetup` fails fast if they are down). Each suite uses its own `demo-`
project id, so dev data is untouched (one exception, below). CI runs it too, as the `functions` job in
`test.yml`, so it gates every PR and the deploy. Tests live in `firebase/functions/test/`.

**With no emulators running** (a cloud session, or CI): `npm --prefix firebase ci`, then
`npm --prefix firebase run test:functions`. It starts the emulators with the repo's pinned CLI, runs
the suite, and stops them; it needs Java. The pin (`firebase/package.json`) is **15.22.4 on purpose**:
from 15.23.0 the CLI ignores `NO_PROXY`, so behind a proxy the Storage rules suite fails 11 tests.
The reason is recorded in that file.

- **Callables** — invoked with `fn.run({data, auth})` against emulator Firestore. Covered:
  `createGroup`, `redeemInvitation`, `setMemberRole`, `deleteGroup`, `deleteCampaign`, the sign-up gate (`reserveSignUp`, and `gateAccountCreation`
  whose handler is exported as `admitAccount`), the last-admin guard in `removeUserFromGroup` /
  `deleteUser`, device sign-in (`startDeviceSignIn` / `approveDeviceSignIn` / `claimDeviceSignIn`),
  and `extractEntities`'s party exclusion — with OpenAI stubbed by `jest.mock("openai")`, the way to
  test any callable that calls out. A callable with no suite can be broken in production with every
  gate green -- `createGroup` failed every call until 2026-10-06 -- so give a new one a suite;
  `test/emulator.ts` is the harness to copy.
- **Scheduled** — `sweepOrphanedImagesDaily` never fires in the emulator; its two bodies are
  tested directly: `sweepReleasedImages(now)`, the daily run over the `releasedImages` and
  `pendingUploads` ledgers, and `sweepOrphanedImages(now)`, the full read it adds on the 1st of
  the month. `now` is injected because the Storage emulator cannot backdate a file's `timeCreated`.
  `resumeCampaignDeletionsDaily` likewise: its body `resumeCampaignDeletions(now)` finishes campaign
  deletions that failed and were never retried (their record in `groups/{g}/campaignDeletions`).
  `resumeGroupDeletionsDaily` the same for groups: `resumeGroupDeletions(now)`, records in the
  top-level `groupDeletions`.
  `sweepContactThrottleDaily` too: `sweepContactThrottle(now)` deletes the contact form's expired
  budgets (`contactThrottle`), which the privacy page promises are gone within a day.
- **`test/rules/firestore-rules-prod.test.ts`** — loads `firestore.rules.prod` and acts as real users.
  `RULES_FILE=<path>` runs it against another revision — **that is the control**: run it against
  `git show HEAD:firebase/firestore.rules.prod` and the tests for whatever you closed must fail there.
- **`test/rules/storage-rules-prod.test.ts`** — the same for `storage.rules.prod`, with the same
  `RULES_FILE` control. **The one suite that writes to dev data**: the Storage emulator answers the
  rules' `firestore.get()` from the project the emulators were started with, not the test's `demo-`
  project, so it seeds membership docs there under `zz-storage-rules-` ids and deletes them after.

The control rule applies to anything new: a suite green on its first run proves the code runs, not
that it changed anything. Break the thing on purpose once and watch the right tests fail.

**`gateAccountCreation` is a blocking function; the emulator registers it only at startup.** New
callables hot-reload, but a new or renamed `beforeUserCreated` trigger isn't wired in until the
emulators restart — until then every account creation silently succeeds. Restart, or register it:
`PATCH http://127.0.0.1:9099/emulator/v1/projects/dnd-campaign-companion/config` with
`{"blockingFunctions":{"triggers":{"beforeCreate":{"functionUri":"http://127.0.0.1:5001/dnd-campaign-companion/europe-west1/gateAccountCreation"}}}}`.
Verify with a raw `accounts:signUp` for an uninvited address: it must return
`BLOCKING_FUNCTION_ERROR_RESPONSE … INVITE_REQUIRED`. Seeded `@example.com` users are exempt only
inside the emulator (`FUNCTIONS_EMULATOR`) and only for **password** sign-ups.

**Device sign-in needs one production grant.** `claimDeviceSignIn` calls `createCustomToken`, which
in production requires the functions' runtime service account to hold **Service Account Token
Creator** on itself. The emulator needs nothing, so no test catches it — the live symptom is every
claim failing as `internal`. Expired `deviceSignIns` docs are deleted lazily by `startDeviceSignIn`;
a Firestore TTL policy on `expiresAt` is the intended sweep.

**The functions use only the modular `firebase-admin` API** (`getFirestore()`, `getAuth()`,
`FieldValue` from `firebase-admin/firestore`, ...); keep it that way. Inside the Functions emulator
the namespaced `admin.firestore` is a stand-in without `FieldValue`, `FieldPath` or `Timestamp`, so
code using it passed every jest test and failed every call in the dev app. `firebase-admin` 14
removes the namespace altogether.

**Rules are deployed from the repo** (T105): every merge to `main` deploys `firestore.rules.prod`
and `storage.rules.prod`, so a change to either is live once merged, and a console edit lasts only
until the next merge. Never point `firebase.json` at `firestore.rules` or `storage.rules` — those
are the permissive emulator rulesets; the deploy job refuses it.

`npm run lint` in `firebase/functions` reports ~2,000 pre-existing problems (mostly CRLF
`linebreak-style`), so it is **not a pass/fail gate** — stash, capture a baseline, and diff.

## Verifying a Change Before Proposing a Merge

Merging to `main` deploys live: the Cloud Functions first, then the Firestore and Storage rules,
then Hosting (`firebase-hosting-merge.yml`; functions and rules deploy under the
`FIREBASE_FUNCTIONS_DEPLOY_SA` secret, and either failing holds Hosting back). That deploy is
non-interactive, so it fails when production still has a function the source no longer exports —
delete it by hand — or when `europe-west1` loses its Artifact Registry cleanup policy. **Deploy
order is fixed** — a rule may rely on a live function, and the frontend on a live rule. A rule that
refuses what the *live* frontend still writes must merge after that frontend has shipped, in a
later PR. CI (`.github/workflows/test.yml`) runs all three steps,
plus `npm run lint`, `npm run lint:tests`, the `firebase/functions` suite and `npm run check:bundle`, on every PR and
before the deploy, which waits on them. A ruleset on `main` requires `test / test`, `test / functions`
and `test / bundle`, so a red PR cannot merge; a new job in `test.yml` gates nothing until the
maintainer adds it there. Changed a function? Run `npm --prefix firebase run test:functions` too.

**Never watch CI or PRs after pushing** — the maintainer's standing rule (2026-09-27). Do not
subscribe to PR activity, poll check runs, `/loop`, schedule check-ins (`send_later`, routines,
cron), or wait on CI in any other way. Run the gates below locally, push, report, and stop; the
maintainer watches CI and asks when something needs doing.

1. `npx tsc --noEmit` — type errors block the deploy
2. `npm test` — must be fully green
3. **`npm run build` — required, not implied by the two above.** It is the only gate that bundles,
   and Vite does not type-check (gate 1 does). A module that only resolves under jest, or a
   `process.env` name `vite.config.ts` does not replace, fails here. A new top-level `src/` directory
   must also be added to the resolver allow-list in `jest.config.ts`.
4. **`npm run check:bundle`** after the build: the entry (what `build/index.html` loads) must stay under the ceiling in
   `scripts/check-bundle-size.js` (T030). Over it usually means an eager module (a provider, the
   layout, a barrel's public API) now imports something only one page needs. Raising the ceiling
   is allowed; say in the PR what grew and why it belongs in the entry bundle.

**`package.json` declares `"sideEffects": ["*.css"]`**: Rolldown (`vite build`) may drop any other module
in `src/` whose exports nobody uses, which is how the feature barrels stay out of the entry bundle
(T030). A module imported only for what it does on load (`import "./x"`) is silently dropped from the
build, while the dev server (which does not tree-shake) and jest still run it, so neither shows it. Add such a file to the list. Route pages load through `app/lazyPage.ts`; a page added to `App.tsx` should too.

**Three resolvers agree on `baseUrl` and `@/`; `ts-node` honours neither.** Bare `baseUrl` imports
(`core/types/common`) remain the convention in shipped code.

| Resolver | `baseUrl` | `paths` (`@/…`) |
|---|---|---|
| `tsc --noEmit` | ✅ | ✅ |
| jest | ✅ (via `moduleNameMapper`) | ✅ |
| Vite (`npm start`, `npm run build`, via `resolve.tsconfigPaths`) | ✅ | ✅ |
| **`ts-node`** | **❌** | **❌** |

`ts-node` has no `tsconfig-paths` here, so anything under `src/utils/__dev__/` (operator tooling run
via `npx ts-node`) must use **relative** imports — and be verified by actually running the script.

## Architecture

Feature-first, with shared infrastructure:

```
src/
├── app/                      # Composition root: App.tsx + layout shell (Header, Footer, Navigation, Layout)
├── features/                 # Four domains, each behind a barrel index.ts
│   ├── campaign-entities/    #   NPCs, Quests, Locations, Rumors + relationship logic
│   ├── storytelling/         #   Chapters, Stories, Sagas
│   ├── collaboration/        #   Notes, AI entity extraction, AI usage tracking
│   └── user-management/      #   Auth, Groups, Profiles, Admin
├── pages/                    # Route components; layouts/ aggregates several domains
├── shared/                   # Cross-domain code owned by no single feature (components, context, hooks, utils)
├── core/                     # Infrastructure — depends on nothing internal
│   ├── components/           #   UI primitives: Button, Card, Dialog, Input, Typography, Roster
│   ├── services/             #   Firebase (auth/user/group/campaign/data), search, openai
│   ├── attribution/          #   the single place attribution values are built
│   └── types/ themes/ constants/ utils/
├── test-utils/               # Test infrastructure — never bundled
├── utils/__dev__/            # Sample-data tooling (used by scripts/manage-dev-data.ps1)
└── styles/, index.tsx, setupTests.ts
```

- **State**: React Context providers, living with the domain they serve; access via hooks such as
  `useAuth()`, `useGroups()`
- **Firebase**: services come from `core/services/firebase`, whose barrel initializes lazily on first
  use (importing it is side-effect free). All services extend `BaseFirebaseService`.

### Dependency rules
- `app/` → anything (composition root)
- `pages/`, `features/`, `shared/` → `core/`, `shared/`, and other features' **public barrels**
- `core/` → nothing internal

**The invariant: never import another feature's internals** — every cross-feature edge goes through
that feature's `index.ts`. **Inside a domain, import siblings directly — never your own barrel**
(that creates cycles such as `index.ts` → `AdminPanel.tsx` → `index.ts`).

**`npm run lint` refuses import cycles** (`import/no-cycle`, on the lint script only, so the dev
server and build don't pay its ~20 s). The usual way into one is a `shared/` module importing a
feature's barrel while that feature renders it: pass the value in as a prop, or split the part the
feature needs into a file that imports no feature (`QuickAddContext` vs `QuickAddProvider`).
`import type` is exempt, since it never reaches the bundle.

Filenames mislead about where code belongs (e.g. `UsageContext` sounds shared but depends on entity
extraction). Open the file and check its imports before deciding a boundary.

**Grep trap**: file bodies here are indented, so `grep "^export"` misses most exports. Read the file;
don't infer its exports or size from a column-anchored grep.

## Code Style
- **TypeScript**: strict typing; interfaces/types in dedicated files
- **Theme system**: NEVER hardcode colors — always use theme variables
- **Naming**: components PascalCase, utilities camelCase
- **Quotes**: double quotes (ESLint)
- **Docs**: JSDoc on functions, components, and complex variables
- **Features**: each owns its components/, hooks/, context/, services/, types/ and exposes a clean
  public API via `index.ts`
- **New integrations**: extend `BaseFirebaseService`; keep API keys out of the frontend (use Firebase
  Functions); support both emulator and production configs
- **Principles**: KISS, YAGNI, SOLID, DRY

## Technology Stack
- React 18 + TypeScript, TailwindCSS with a custom theme system
- Firebase: Auth, Firestore, Functions, Hosting, Analytics
- OpenAI for entity extraction (via Functions), with usage tracking
- Jest + React Testing Library, ESLint, PowerShell automation scripts
- Icons: Lucide React
