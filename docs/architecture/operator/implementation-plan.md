# The operator page: implementation plan

**Status** approved by the maintainer, 2026-10-08 · **TODO** T137 · **With** [design](design.md) and
[security architecture](security-architecture.md)

A high-level plan: what lands in which order, who does it, and how each step is checked. Each code
step gets a detailed plan of its own when it is picked up, written against the tree as it is then.

## Order

| Step | What | Who | Needs | Size | Goes live |
|---|---|---|---|---|---|
| 0 | Preparation: the operator account, the project's questions | Maintainer | Nothing | S | Nothing |
| 1 | Allowances on the server | PR | Nothing | M | Functions; the app sees no difference |
| 2 | The operator actions | PR | 1 | M | Functions; the founder script records `issuedBy` and has the daily budget |
| 3 | The service, run locally | PR | 2 | L | Nothing new: the server is built but not deployed |
| 4a | The setup script and its runbook | PR | 3 | M | Nothing |
| 4b | Running the setup | Maintainer | 4a, 0 | M | A protected, empty service |
| 5 | The pipeline and the checks | PR | 4b | M | The operator page, after approval |
| 6 | Go-live checks | Maintainer, with Claude | 5 | S | Nothing |
| 7 | Cleanup and documentation | PR | 6 | S | Functions and app; T137 rewritten to phase 2 |
| 8 | Lock the audit retention | Maintainer | 6, plus 30 days | S | Nothing |

Steps 1 to 3 can go up as one stack, and 4a and 5 as another. Step 5 must not merge before 4b: its
workflow needs the identities 4b creates, and the service must already exist, protected, before any
pipeline deploys to it.

## Step 0: preparation (maintainer)

- **A Google account used only for operator work.** Sign it in with a passkey or a security key,
  register a backup key kept somewhere else, and check its recovery options.
  [Security architecture](security-architecture.md#1-the-human-identity), layer 1.
- **Is the project in a Google Cloud organization?** Without one, IAP needs a custom OAuth client
  and consent screen. The answer changes what 4a's script does.
- **The defaults** in the design's [decisions](design.md#decisions-with-defaults): keep or change.

## Step 1: allowances on the server (PR)

- **`src/extractionAllowance.ts`:** the type, its bounds, and `effectiveLimits(profile, now)`, which
  covers the allowance, then the old `isUnlimited` and `customLimit`, then the defaults.
- **`entityExtraction.ts`:**
  - `readUsage` takes its limits from `effectiveLimits`
  - `getUsageStatus` and the extraction transaction return the effective limits and `isUnlimited`,
    plus `raisedUntil` when an expiring allowance applies
  - `customLimit` is no longer sent
- **Tests:**
  - `extractEntities.test.ts` covers each branch of `effectiveLimits`: unlimited, raised, expired,
    the two old fields, the defaults. `isUnlimited` and `customLimit` have no test today.
  - A rules test: a player can read their own `extractionAllowance` but not write it.
- **Live effect:** nothing writes the new field yet, and the console edit still works. The app keeps
  working unchanged, because it reads `customLimit ?? daily.limit`.
- **Gates:** `npm --prefix firebase run test:functions`, with the control (break `effectiveLimits`
  once and watch the right tests fail); the functions' lint compared against its baseline.

## Step 2: the operator actions (PR)

- **`src/operator/founderLinks.ts`:**
  - `issueFounderLink`: `issuedBy`, and the 24-hour budget counted in the same transaction
  - `listFounderLinks`: newest first, paged by `createdAt`
  - `revokeFounderLink`: refuses a used link; otherwise sets `expiresAt` to now, plus `revokedAt`
    and `revokedBy`
- **`issueFounderInvitation`** becomes the issuing core of the above. `issue-founder-invitation.js`
  passes `issuedBy: "script"`, and its suite still passes.
- **`src/operator/accounts.ts`:** look up one account by exact email: the Auth record, whether a
  profile exists, its usage, its allowance.
- **`src/operator/allowances.ts`:** validate against the bounds, then set or clear with `update`.
  Setting deletes the old `customLimit` and `isUnlimited` in the same write; a missing profile is
  refused with a plain message.
- **`src/operator/audit.ts`:** the one function that writes an audit line, in the shape the design
  gives.
- **Tests:**
  - every action against the emulators
  - a revoked link is refused by `reserveSignUp`, by the gate and by `createGroup`
  - the budget holds under two issues racing for the last slot
  - the bounds hold
- **Live effect:** the script records `issuedBy` and has the daily budget. Nothing else is
  reachable: nothing in `src/operator/` is exported.

## Step 3: the service, run locally (PR)

- **`src/operator/http/`:**
  - the identity check (google-auth-library's IAP verification; keys and audience passed in)
  - CSRF
  - the escaping `html` template and the pages
  - the security headers
  - the route table and the `node:http` server
- **`src/operator/main.ts`:** production configuration only: Google's keys, the audience and the
  subjects from the environment, and it exits when any is missing.
- **`src/operator/dev.ts` and `npm run operator:dev`:** port 4700, against the dev emulators, with a
  throwaway key pair. It refuses to start outside the emulators.
- **The container files:** `firebase/functions/operator/Dockerfile` (base image pinned by digest,
  production dependencies only, runs as a non-root user), `cloudbuild.yaml` and `.dockerignore`
  (which keeps `dev.js` out). They are first built for real in step 5.
- **Tests:** the HTTP suite the [security architecture](security-architecture.md#how-each-control-is-known-to-work)
  lists, and a test that `src/index.ts` exports nothing from `src/operator/`.
- **A browser journey** in `e2e/`: the operator page against `operator:dev` and the e2e emulators.
  It issues a link, sees it listed, and revokes it; then finds a seeded account, raises its
  allowance and resets it. It is located by role and accessible name, as the other journeys are.
- **Gates:** the functions suite; `npm --prefix firebase run test:e2e`; a look at the pages at
  320 px.

## Step 4a: the setup script (PR)

`firebase/functions/operator/infra/setup.sh` is idempotent `gcloud`, run by the maintainer under the
owner's login, never by CI. Its header lists the steps, as the other operator scripts' do, and
`--check` only reports. It sets up, in order:

1. **APIs:** Cloud Run, IAP, Cloud Build, Artifact Registry, Secret Manager, IAM Credentials.
2. **Service accounts and roles:**
   - `operator-runtime@`, `operator-deployer@`, `operator-builder@` and `operator-verifier@`
   - each with exactly the roles in the [security architecture](security-architecture.md#6-the-runtime-identity-b3)
   - the role names confirmed against the live project
3. **Artifact Registry:** the `operator` repository, with a cleanup policy.
4. **Secret Manager:** the CSRF key, readable by `operator-runtime@` only.
5. **Workload Identity Federation:** the pool, and a GitHub provider with the attribute condition
   on `repository_id`, `ref`, `workflow_ref` and `environment`.
6. **The service:**
   - created from Google's placeholder image, with IAP on, the invoker check on, and the IAP
     service agent as the only invoker
   - then the IAP access list (the operator account) and the re-authentication settings
   - and, if step 0 found no organization, the OAuth client first
7. **Audit:**
   - IAP's Data Access logs
   - the `operator-audit` bucket (400 days, unlocked) and its sink
   - the two log-based alerts, emailing the maintainer
8. **Open questions it settles and writes down:**
   - whether `SECURE_KEY` is offered for the account's type
   - whether `roles/run.developer` can switch IAP off (if it can, the verification in step 5
     catches it and the service's own check still refuses)
   - which roles a Cloud Build submission needs

The runbook beside it says what to check after each part. The GitHub side is set up in the same
step: the `operator` environment (the maintainer's approval, `main` only), and the variables
`OPERATOR_SUBJECTS`, the provider and the account names.

## Step 4b: running the setup (maintainer)

The maintainer runs `setup.sh`, then `setup.sh --check`, and reports what it printed. At the end
the service exists, protected, serving Google's placeholder, and an anonymous request to it is
turned away.

## Step 5: the pipeline and the checks (PR)

- **`operator-deploy.yml`:**
  - runs after a successful run of the main deploy workflow
  - has its own concurrency group, and actions pinned by commit
  - signs in without a key, as `operator-deployer@`
  - builds with Cloud Build as `operator-builder@`
  - deploys by digest, with the environment's approval
  - skips when nothing the image is built from has changed
- **`operator-verify.yml`:** the six checks of the
  [security architecture](security-architecture.md#10-checking-the-configuration-t9), as
  `operator-verifier@`, after every operator deploy and daily.
- **Dependabot:** npm in `firebase/functions`, the base image's digest, and the GitHub Actions.
  It is new to the repository, so its scope is the maintainer's call when the PR is reviewed.
- **Live effect:** the first merge asks for approval, then puts the operator page up behind IAP.

## Step 6: go-live checks (maintainer, with Claude)

1. Sign in as the operator on a desktop and on a phone; IAP asks for the key.
2. Issue a link, see it listed, revoke it; starting a sign-up with it is refused as expired.
3. Look up the maintainer's own account and make it unlimited. That moves it off the console's
   `isUnlimited`.
4. Confirm both actions' audit lines are in `operator-audit`, and that both alert emails arrived.
5. A Google account not on the list is refused by IAP. An anonymous request is turned away.
6. Run `operator-verify.yml` once with a stranger added to the expected list. It must fail.
7. Search production for profiles that still carry `customLimit` or `isUnlimited`, and set them on
   the page.

## Step 7: cleanup and documentation (PR)

- **Retire the old fields:**
  - `effectiveLimits` stops reading `customLimit` and `isUnlimited`, once step 6 found none left
  - the app's `customLimit` reads go (`UsageMeter.tsx:115`, `useEntityExtractor.ts:113`, `:125`,
    `hasCustomLimit` in `UsageContext.tsx:185`)
  - `UsageMeter` may say "raised until …" from `raisedUntil`
- **The privacy page:** `EXTRACTION_FACTS.caps` says what the caps are. Decide whether it adds
  "unless raised on request".
- **CLAUDE.md:** a short operator section covering `operator:dev`, the deploy and its approval, the
  verification, and break-glass.
- **The onboarding plan's D6:** its pointer to this design changes from "proposed" to what was built.
- **TODO.md:** T137 rewritten to what remains, which is phase 2, the overview.

## Step 8: lock the audit retention (maintainer)

After 30 days of the bucket in use, lock its retention. It cannot be unlocked: from then on no
entry can be deleted before its 400 days are up, including by the owner.

## Rolling back

Every step adds and removes nothing, so the scripts and the console keep working throughout.

- **Turn the page off at once:** empty IAP's access list.
- **Take it down:** delete the Cloud Run service.
- **Steps 1 and 2** can each be reverted alone. A profile that already carries an allowance then
  falls back to the defaults, until step 1 is back.

## Related

- **T139** replaces the rest of CI's keys with the keyless sign-in this plan uses from the start.
- **T128's caps** bound what founder links can cost.
- **T127** makes a founder link lead somewhere.
- **T138** decides whether the overview can show traffic.
- **Two items worth filing when step 4a is picked up:**
  - storing only hashes of invitation tokens
  - the functions' service account ([residual risks](security-architecture.md#residual-risks) 4
    and 5)
