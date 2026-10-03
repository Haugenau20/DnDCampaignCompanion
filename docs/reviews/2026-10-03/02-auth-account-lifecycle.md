# Authentication and account lifecycle — partial review

Reviewed commit: `64fe19512b1d3bd14427fad8996403a742fbe8a9`.

Specialist: `gpt-6.1-sol`, `xhigh` reasoning. The specialist encountered an
OpenAI policy interruption. The maintainer subsequently instructed the
coordinator to stop that agent and not resume it. This document preserves the
evidence collected before the stop; the coordinator assembled it and did not
restart or replace the specialist. **This scope is incomplete.**

No application code, existing tests, rules, account data in production, or
deployment settings were changed. Emulator probes use isolated `demo-` projects;
frontend probes run actual components/providers with controlled dependencies.

## Coverage and limits

Evidence covers the last-admin guards across demotion/leaving/deletion, account
deletion sequencing, the email-link completion page, and the auth-state loading
callback. The specialist also traced invitations, sign-up, device sign-in,
Google sign-in, and leave-group refresh, but their complete coverage assessment
was not delivered. Those paths must not be treated as fully reviewed.

The coordinator ran `/tmp/auth-lifecycle-probe.cjs` against the central Auth and
Firestore emulators. A deterministic barrier delays the return from the real
guard after each real Firestore read; it forces a legal concurrent interleaving.
The actual compiled callable handlers perform the writes. A second probe uses
the real React page/provider with dependency stubs. See
[evidence/probe-results.md](evidence/probe-results.md) for outputs and limits.

## Confirmed findings

### AUTH-001 — Concurrent admin exits can leave remaining members without an admin

**Severity:** high. **Confidence:** high; reproduced against emulators with
actual handlers and a controlled scheduling barrier. **Classification:** new
concurrency gap in the last-admin protection, not a claim that its ordinary
sequential protection is missing.

**Source:** `firebase/functions/src/shared/groupAdmins.ts:29-42`,
`firebase/functions/src/groupManagement/setMemberRole.ts:77-84`,
`firebase/functions/src/userManagement/removeUserFromGroup.ts:27-36`, and
`firebase/functions/src/userManagement/deleteUser.ts:69-79,119-129`.

**Scenario:** A group contains admins A/B and member C. A and B concurrently
demote themselves, leave, or delete their accounts. Each guard reads the other
admin before either mutation commits, so both pass. Both operations succeed;
C remains with no admin. Membership/role changes and the invariant check do
not share a transaction or group-level synchronization point.

**Evidence:** All three controlled interleavings returned two fulfilled calls.
Self-demotion left `{adminA: member, adminB: member, memberC: member}`;
self-leave and self-delete each left `{memberC: member}`. The barrier changes
scheduling, not the guard decision or database state.

**Impact:** Remaining members cannot manage invitations, member roles, or
campaign administration without operator intervention.

**Fix direction:** Enforce the last-admin invariant atomically with membership
changes using a shared group synchronization record or transactional admin
membership/count. Multi-service account deletion needs a reserved transition
and retryable cleanup rather than an uncoordinated precheck.

**Verification:** Concurrently exercise each pair of demotion/leave/delete
operations and assert at least one admin survives whenever members remain.
Retain the sequential last-admin tests as well.

### AUTH-002 — A transient Auth deletion failure becomes unretryable after profile deletion

**Severity:** medium. **Confidence:** high; emulator fault injection.
**Classification:** new recovery gap beside the prior #1405 subtree-cleanup fix.

**Source:** `firebase/functions/src/userManagement/deleteUser.ts:49-60,110-129`.

**Scenario:** Account deletion removes group subtrees and commits deletion of
`users/{uid}`, then the Auth delete fails transiently. A retry immediately
rejects because the global profile no longer exists, before attempting Auth
deletion again.

**Evidence:** Injecting failure only in `admin.auth().deleteUser` produced
`internal` on the first call, `not-found` on retry, `profileExists: false`, and
`authExists: true`. The fault is synthetic; the persisted state and retries use
the actual callable and emulators.

**Impact:** The user is left with an Auth account whose profile and private group
data were already removed. The public deletion flow cannot finish cleanup.

**Fix direction:** Persist a durable deletion job/tombstone and make each cleanup
step idempotent. Missing profile must not prevent completing an authorized,
already-started Auth deletion. Avoid simply reversing destructive steps without
a recovery design.

**Verification:** Inject failure before/after each cross-service step, retry,
and assert completion without surviving identity/profile/subtree records.

### AUTH-003 — An old auth-state load can restore the previous user's context after sign-out

**Severity:** medium. **Confidence:** high for the component behavior;
reproduced in React with delayed service responses, not a live browser.
**Classification:** new lifecycle race.

**Source:** `src/features/user-management/auth/context/FirebaseContext.tsx:275-318,357-418`.

**Scenario:** A signed-in user's profile load is pending. A newer signed-out
callback clears the provider. The earlier callback subsequently resolves and
writes the old profile, groups, active group/profile, and campaign into state.
There is no auth generation/current-user check after the awaits.

**Evidence:** The actual provider ended with `user: null` while
`userProfile.id`, `activeGroupUserProfile.userId`, `activeGroupId`, and
`activeCampaignId` again referred to the prior user. The targeted React
assertions passed.

**Impact:** The UI/service context can mix signed-out state with stale account
data. This does not by itself establish a server authorization bypass.

**Fix direction:** Track an auth generation and current UID. Discard every
asynchronous result whose generation/UID no longer matches; invalidate pending
loads on sign-out and account change.

**Verification:** Delay an initial profile/group load, then sign out or sign in
as a different user. Release the old request and assert no old state/service
selection is restored.

### AUTH-004 — Unrelated pending-email state blocks a valid device approval flow

**Severity:** medium. **Confidence:** high for the component branching;
reproduced with actual React page and controlled sign-in failure.
**Classification:** new error-recovery gap.

**Source:** `src/features/user-management/auth/pages/EmailLinkPage.tsx:73-82,92-103,131-155`.

**Scenario:** A browser has a pending-email record from an earlier request and
opens a device-approval link for a different request. The page gives any pending
email precedence over the link's device intent, attempts direct completion with
the stale address, then shows a failure without an email correction input.

**Evidence:** `completeSignInLink` received the unrelated pending address;
`lookUpDeviceSignIn` and `approveDeviceSignIn` were not called. After the modeled
wrong-address rejection the rendered page had an alert and no textbox.

**Impact:** A valid cross-device link cannot complete through the normal page
when unrelated local pending state is present.

**Fix direction:** Correlate pending state with the opened request, handle
device intent explicitly, and provide a recoverable email/device path when
local state is stale or mismatched.

**Verification:** Exercise matching/unrelated pending state, same-browser links,
device links, and a wrong-address retry with actual Firebase behavior when
browser coverage is available.

## Unverified concerns and stopped work

- **Cleanup after an ambiguous invitation response:**
  `EmailLinkPage.tsx:106-119` and `JoinAsNewUser.tsx:128-140` call
  `deleteFreshAccount` on any failed join for a new user; the cleanup primitive
  in `AuthService.ts:386-390` performs client Auth deletion. The targeted React
  probe confirmed that a modeled lost response after commit triggers cleanup.
  However, a follow-up emulator probe did **not** establish the claimed Auth
  account deletion (`authGone: false`), and its assertion failed. This report
  therefore records a concern about ambiguous outcomes, **not a confirmed
  account-loss finding**. The stopped specialist was not resumed to resolve it.
- **Active context after a successful leave:** The specialist traced a possible
  stale selection after `refreshGroups`, and prepared another temporary test.
  That additional test was not run before the stop. Treat this as an uncovered
  follow-up, not a confirmed finding.
- Device request replay/expiry, Google sign-in lifecycle, invitation admission,
  and sign-up blocking deserve a complete coverage review in a later authorized
  pass. Existing passing suites establish their tested cases, not exhaustive
  assurance.

The first temporary frontend configuration failed before assertions because an
absolute module-directory override resolved incompatible Jest internals. The
temporary harness was corrected and the three recorded React probes passed.
Neither this setup error nor the inconclusive follow-up is a baseline repository
test failure. No existing tests were edited.
