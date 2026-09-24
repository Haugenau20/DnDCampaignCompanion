# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose
A tool for D&D **players** (not DMs) to collect and organize their shared campaign data: stories,
rumors, NPCs, locations, and quests. Components should focus on player-facing features.

**Key documents**
- `docs/testing/post-test-coverage-roadmap.md` — live status and execution order; **start here**
- `docs/testing/bug-tracking/README.md` — live bug tracker
- `TODO.md` — backlog
- `docs/architecture/migration/deep-dive-feature-enhancements.md` — long-term feature ideas (nothing in it is installed yet)

## Running the Project

- Start: **`.\scripts\start-dev.ps1 -Action start`** — Firebase emulators, then `npm start`, both
  directly on the host. **No Docker.**
- Stop / restart / status: `.\scripts\start-dev.ps1 -Action stop|restart|status` (`stop` exports
  emulator data to `firebase/emulator-data`; `start` re-imports it if present)
- Sample data: `.\scripts\manage-dev-data.ps1 -Action generate`

The emulators run from **`firebase/firebase.emulators.json`**, not `firebase.json`: the Storage
emulator won't start under the real project id without a `storage.rules` key, and that key in
`firebase.json` would let a bare `firebase deploy` push the permissive emulator rules live. Starting
emulators by hand? Pass `--config firebase.emulators.json` too, or Storage (9199) is missing.

`scripts/manage-environment.ps1` and `docker/` are Docker-based and unused. Don't reach for them
without checking with the maintainer — a compile error was once diagnosed against a container that
was never running.

### If the dev server reports errors that `tsc` and `npm run build` do not
Almost certainly a stale cache. `npm start` and `npm run build` keep **separate** webpack caches, so
every gate can be green while the dev server compiles something else. The signature is an error
quoting a *new* line in one file while claiming a *stale* fact about another. Confirm the symbol is
really present on disk and `npx tsc --noEmit` is clean, then:

```
rm -rf node_modules/.cache
```

and restart the dev server. **A `git checkout` while the dev server runs reliably causes this** —
the errors name files from whichever branch you visited.

### Environment gotchas
- The scripts' health checks must use `127.0.0.1` and `Invoke-WebRequest -UseBasicParsing`. Until
  2026-09-24 they used `localhost` without it, and always failed: Windows PowerShell's default
  parser refuses to run non-interactively, and the dev server listens on IPv4 only, so `localhost`
  tries `::1` first and outlasts the 2 s timeout. Symptoms, if they return: `start`/`restart` claims
  the emulators "failed to start within 45 seconds" and never runs `npm start`, `stop` **silently
  skips the export**, and `status` says nothing is running. Check ports 3000/4000/5001/8080/9099/9199.
- `-Action stop` can leave an orphaned `react-scripts` holding port 3000.
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
- Single file, fast: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="<pattern>"`

**Baseline**: 0 failed / 2 skipped / 5354 passed / 5356 total across 267 suites (2026-09-24,
`fix/notes-story-refetch-gate`). The 2 skips are #901's, closed as testability-only.
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
project id, so dev data is untouched (one exception, below). Not in CI (no emulator there). Tests live in
`firebase/functions/test/`:

- **Callables** — invoked with `fn.run({data, auth})` against emulator Firestore. Covered:
  `redeemInvitation`, `setMemberRole`, the sign-up gate (`reserveSignUp`, and `gateAccountCreation`
  whose handler is exported as `admitAccount`), the last-admin guard in `removeUserFromGroup` /
  `deleteUser`, device sign-in (`startDeviceSignIn` / `approveDeviceSignIn` / `claimDeviceSignIn`),
  and `extractEntities`'s party exclusion — with OpenAI stubbed by `jest.mock("openai")`, the way to
  test any callable that calls out. Older callables (`createGroup`, `deleteCampaign`, …) have none
  yet; `test/emulator.ts` is the harness to copy.
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

The deployed Firestore rules live in the Firebase console, not a deploy step — don't assume they
match `firestore.rules.prod` without reading them back.

`npm run lint` in `firebase/functions` reports ~2,000 pre-existing problems (mostly CRLF
`linebreak-style`), so it is **not a pass/fail gate** — stash, capture a baseline, and diff.

## Verifying a Change Before Proposing a Merge

Merging to `main` deploys live.

1. `npx tsc --noEmit` — type errors block the deploy
2. `npm test` — must be fully green
3. **`npm run build` — required, not implied by the two above.** webpack honours tsconfig `baseUrl`
   but **ignores `paths`**, so `@/...` imports pass `tsc` and jest and then fail the build with
   `Module not found`. Use bare `baseUrl` imports (`core/types/common`) in anything that ships; `@/`
   is safe only in `__tests__/` and `test-utils/`. A new top-level `src/` directory must also be
   added to the resolver allow-list in `jest.config.ts`.

**Four resolvers disagree; no single gate catches all of them:**

| Resolver | `baseUrl` | `paths` (`@/…`) |
|---|---|---|
| `tsc --noEmit` | ✅ | ✅ |
| jest | ✅ (via `moduleNameMapper`) | ✅ |
| webpack (`npm run build`) | ✅ | ❌ |
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
│   └── types/ themes/ config/ constants/ utils/
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
