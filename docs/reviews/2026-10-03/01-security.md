# Security and authorization review

Date: 2026-10-03. Reviewer: `gpt-6-astra`, `xhigh` reasoning.
Reviewed commit: `64fe19512b1d3bd14427fad8996403a742fbe8a9`.
Scope: the approved first-pass security assignment in [plan.md](plan.md).

Six confirmed defects are recorded below: two high and four medium. All have
local dynamic evidence; the limits of each reproduction are stated explicitly.
There is no claim that the deployed console rules match the repository copy,
that production was exploited, or that production data was accessed. No source,
existing test, dependency, configuration, or tracker changes were made. Paid
model calls and mail delivery were replaced with in-memory stubs.

## Inspected scope and limits

| Boundary or workflow | Inspected source and conclusion |
|---|---|
| Firestore production authorization | Entire `firebase/firestore.rules.prod`: global users/admin, group records, group profiles, username reservations, invitations, private notes, reading progress, campaigns and entity wildcard. Rules tests plus focused probes exercised the review copy. |
| Storage production authorization | Entire `firebase/storage.rules.prod` and its rules suite: group membership, admin-only crest, member-owned campaign images, own screenshot folder, size/type/name restrictions and overwrite denial. No new direct cross-group Storage authorization bypass found within these paths. |
| Production versus development | `firebase/firebase.json`, `firebase/firebase.emulators.json`, both development rules files, frontend Firebase/App Check configuration, and deployment workflow. Default production deployment deliberately contains no rules keys; emulator behavior is permissive unless tests load a policy explicitly. |
| Callable authorization | All exported callables in `firebase/functions/src/index.ts`; `groupManagement/*`, `userManagement/*`, `campaignManagement/deleteCampaign.ts`, `entityExtraction.ts`, `partyCharacters.ts`, `contact.ts`, `signUp/*`, `deviceSignIn/*`, and supporting registration-token/error/deletion helpers. Identity and roles generally come from authenticated uid or protected records; findings identify the exceptions and downstream trust. |
| Client-controlled identity/schema | `GroupService`, `UserService`, `InvitationService`, `DocumentService`, `BaseFirebaseService`; administration member mapping and `useGroups`; checked which client-writable fields later become server authority or administrative operation targets. |
| Private content and tokens | Explicit note/progress rules, callable deletion of personal subtrees, device-request deny rules and secret/code checks, invitation lookups, model/mail secret references, image URL handling, Markdown rendering. Private-note isolation held in the focused direct read/list/write controls. |
| Requirements and tracker | `AGENTS.md`, `TODO.md`, review plan/index, behavioral tracker and relevant security entries, Storage-image design, privacy-policy design, admin handoff, and current rules/function tests. Existing historical findings were checked against current source rather than treated as current exposures. |

Important exclusions: no production-console rules comparison, IAM/service-account
review, live App Check enforcement check, production logs or credentials,
network penetration test, real SMTP/OpenAI request, or full browser execution of
the administrative attack sequence. Group-account lifecycle races are primarily
in the auth review; content/deletion concurrency is primarily in the data review;
image object/document consistency is primarily in the uploaded-image review.
The scheduled image sweeper is covered by the image specialist, not independently
re-reviewed here in full. The secret check examined source references and tracked
filenames, not secret values or git history.

## Findings

### SEC-001 — A user can grant themselves unlimited paid AI usage

**Severity: high. Confidence: high. Classification: new, dynamically reproduced.**

**Locations:** `firebase/firestore.rules.prod:192-196`;
`firebase/functions/src/entityExtraction.ts:263-287,311-341,427-438,679-692`.

**Preconditions and reachable scenario:** An authenticated account has its normal
`users/{uid}` profile. The self-update rule protects only `isAdmin` and `groups`.
The caller can therefore update `entityExtractionUsage.isUnlimited` to `true`,
replace the usage counters, delete usage state, or alter its limits. The callable
reads that exact client-writable map with the Admin SDK. A truthy `isUnlimited`
returns before all quota checks and counter updates. Authentication, the pinned
model, and the 10,000-character content cap do not protect this quota boundary.

**Expected versus actual:** Only trusted administration should change paid-use
entitlements; the server should own counters. Instead a normal user can remove
all daily, weekly and monthly limits with one allowed profile update and continue
calling `extractEntities` against the project's model key.

**Impact:** Unbounded extraction spending relative to the advertised 10/day,
30/week and 100/month account limits. This requires an existing authenticated
account; it does not expose the OpenAI key or permit arbitrary model selection.

**Evidence:** `/tmp/security-review-probe.cjs` loaded the production rules copy
into `demo-security-review-20261003`. An exhausted account was first denied with
`resource-exhausted`, with zero model-stub calls. Its own rules-enforced
`entityExtractionUsage.isUnlimited` update then succeeded; twelve subsequent
real handler invocations succeeded and left all exhausted counters unchanged.
Replacing the counters with zero also succeeded and admitted another extraction.
OpenAI was stubbed before the source module loaded; no paid call occurred.

**Fix direction:** Make the usage map entirely server-owned. Prefer an explicit
allowlist of self-editable global-profile fields over a denylist of currently
known privilege fields. Keep legitimate quota administration behind verified
admin authority. Fix SEC-003 separately: protecting this field alone does not
make the server's quota reservation atomic.

**Verification:** Rules tests must deny self-updates, nested updates, field
removal and whole-document replacement that change any usage field, while normal
profile edits still work. Against the real handler and a model stub, exhaust
each period and assert that additional calls are refused without invoking the
model.

**Tracker:** Not present in `TODO.md` or the behavioral tracker. Related to the
client-writable-authority pattern fixed in #1425/#1426, but those fixes protect
membership/admin fields only; this is a separate remaining entitlement.

### SEC-002 — Mutable profile IDs redirect an administrator's removal to another member

**Severity: high. Confidence: high. Classification: new, dynamically reproduced
through the target-selection helper and callable; React interaction source-traced.**

**Locations:** `firebase/firestore.rules.prod:231-242`;
`src/core/services/firebase/group/GroupService.ts:135-146`;
`src/features/user-management/admin/types.ts:40-41`;
`src/features/user-management/admin/components/MembersCard.tsx:185-189,264-278`;
`src/features/user-management/admin/pages/AdminPeoplePage.tsx:166-185,265-266`;
`src/features/user-management/groups/hooks/useGroups.ts:179-187`;
`firebase/functions/src/userManagement/removeUserFromGroup.ts:94-108,124-138`;
`firebase/functions/src/shared/deleteUserSubtree.ts:25-36`.

**Preconditions and reachable scenario:** A malicious ordinary member changes
`userId` on their own group profile to an innocent ordinary member's uid. This
is allowed because the self-update rule protects only `role`. The member list
maps `{id: document.id, ...data}`, which also lets a stored `id` replace the
canonical ID, and `memberId()` prefers the mutable `userId` field. The visible
row and confirmation use the attacker's username. When an administrator chooses
to remove that row, the page sends the innocent member's uid to the authorized
removal callable.

**Expected versus actual:** Removing the displayed member should address that
member's Firestore document uid. Instead the callable correctly trusts its admin
caller but receives a target selected from attacker-controlled identity data.
It removes the innocent member and their private subtree while leaving the
attacker's membership intact.

**Impact:** An administrative removal can irreversibly delete another member's
private notes and reading progress and revoke their group access. The attacker
can defeat their own removal. An administrator must take the removal action;
this is not a direct unaided role escalation. Role-change actions use the same
helper and can also target a different person from the displayed row.

**Evidence:** `/tmp/security-identity-probe.cjs` first proved the attacker could
not directly delete the innocent profile. Their own `userId` rewrite was then
allowed by the production rules copy. A source-matched service mapping yielded
a row named `attacker`, while the actual `memberId` function returned `innocent`.
Passing that helper result to the actual callable as the admin deleted the
innocent profile and a synthetic private note, removed their global membership,
and preserved the attacker's profile/membership. No browser click was automated;
the exact React-to-hook-to-service wiring above was inspected. The same probe
also confirmed that a stored `id` field is writable.

**Fix direction:** Derive administrative targets solely from the document path.
Assign canonical IDs after document data, and remove the preference for a
client-stored identity field. Prevent clients from changing `id`/`userId` in
rules; compatibility with legacy documents must not give stored fields authority
over the path identity.

**Verification:** Seed a profile with conflicting `id`, `userId`, document id and
username. Render the real members page and confirm removal/role changes address
only the canonical document uid. Assert the innocent member's profile, notes and
membership survive. Add rules tests denying identity-field changes, including
when a legacy profile originally omitted these fields.

**Tracker:** New. Existing #1409/#1425/#1426 prevent role/membership escalation
but do not protect identity fields. Current `admin/types.ts` documents the
historical absent-`userId` UI bug; the fallback introduced for that shape does
not establish trust in a present `userId`.

### SEC-003 — Concurrent extraction calls overrun the quota and lose usage counts

**Severity: medium. Confidence: high. Classification: new, dynamically reproduced.**

**Locations:** `firebase/functions/src/entityExtraction.ts:263-265,311-341,427-438`.
Related reset write: `entityExtraction.ts:175-185,204-225`.

**Preconditions and reachable scenario:** An authenticated account has one or
more calls remaining and issues overlapping extraction requests, through multiple
clients or direct callable use. Each request reads the same usage document,
checks the same remaining quota and later writes its own incremented copy with
`set(..., {merge:true})`. Neither the read/check/write nor the period reset is a
transaction.

**Expected versus actual:** With one remaining slot, at most one call should
reserve it. Multiple requests can all be admitted, perform separate model calls,
and record only one increment. This remains exploitable after SEC-001 is fixed.

**Impact:** Paid-use limits are exceeded and stored daily/weekly/monthly usage
understates actual calls. Severity is medium independently of SEC-001: concurrent
bursts can multiply the remaining quota, while the stronger unlimited-entitlement
issue is separately high.

**Evidence:** `/tmp/security-quota-race.cjs` seeded usage at 9/10 daily and 9 for
the other periods. A deterministic barrier paused four real Firestore reads
after they returned the old quota snapshot and before any quota write. All four
actual handler calls succeeded, the model stub was invoked four times, and every
persisted period count became 10, undercounting by three. The barrier controls a
legal scheduling order; it does not alter returned data or bypass quota checks.
No client edited its quota and no paid model call occurred.

**Fix direction:** Reserve a usage slot with a Firestore transaction that reads,
resets if necessary, validates and updates all periods together. Keep the paid
model request outside the retried transaction. Status/reset calls must not
rewrite stale counter maps over newer reservations; compute display resets
without writing or use the same transactional policy.

**Verification:** From one slot remaining, race several real handler calls with
a model stub and assert exactly one admission/model invocation. Repeat at
period rollover and with concurrent `getUsageStatus` calls. Incrementing with
`FieldValue.increment` alone is insufficient if admission still uses a separate
unprotected read.

**Tracker:** No matching open item found. Cross-referenced with the data reviewer;
this report owns the quota/abuse boundary rather than duplicating it as a generic
lost-update issue.

### SEC-004 — A member can disappear from the roster while retaining campaign access

**Severity: medium. Confidence: high. Classification: new, dynamically reproduced.**

**Locations:** `firebase/firestore.rules.prod:161-165,244-248,326-353`;
`src/core/services/firebase/group/GroupService.ts:135-146`;
`firebase/storage.rules.prod:56-62,86-102`.

**Preconditions and reachable scenario:** An ordinary group member directly
deletes `groups/{groupId}/users/{theirUid}` using the client SDK. The rule still
allows this as “leave group.” Unlike the removal callable, a document delete does
not remove the group from `users/{uid}.groups`. The administration roster is
queried from the group-profile collection, while Firestore and Storage membership
checks use the unchanged global array.

**Expected versus actual:** A user omitted from the membership roster after
leaving should have access revoked. The attacker instead removes the visible
membership record while retaining group-authorized campaign reads, creates,
updates and deletes. The normal roster UI no longer offers that user's removal.
An operator who already knows the uid can still invoke the legitimate removal
path; this is concealment from ordinary administration, not irrevocable access.

**Impact:** Hidden continued access to the shared group's data and an inaccurate
security-management roster. No invitation bypass or access to previously
unjoined groups is claimed. The same discrepancy leaves private subcollections
behind, but data-orphan consequences are not counted again here.

**Evidence:** In `/tmp/security-identity-probe.cjs`, the production rules copy
allowed self-deletion. A real admin query no longer returned the `hidden` member.
The deleted-profile user's campaign read and update still succeeded, and their
global membership stayed `['g']`. Storage persistence follows from its identical
global-array membership predicate; this particular post-deletion Storage operation
was not independently run.

**Fix direction:** Remove obsolete client delete grants for group profiles now
that leaving/removal is server-managed. Keep membership revocation and profile
lifecycle coordinated through that server path, and reconcile existing mismatches.
Review both self-delete and admin-delete grants so direct deletes cannot create
the same split representation.

**Verification:** Rules must reject raw self-profile and other-profile deletion.
Normal callable removal should delete the personal subtree, remove the global
membership, and deny subsequent campaign and Storage access. Verify the
administration roster remains a truthful view of active membership.

**Tracker:** New remaining direct-write path adjacent to #1425 and #1405. Those
fixes server-manage joining and recursive callable cleanup; neither removes the
old group-profile delete grants. Separate from the auth review's in-flight leave
or role-transition races.

### SEC-005 — A member can make account cleanup delete someone else's reserved name

**Severity: medium. Confidence: high. Classification: new, dynamically reproduced
for self-leave; account-deletion variant source-confirmed.**

**Locations:** `firebase/firestore.rules.prod:231-242,291-297`;
`firebase/functions/src/userManagement/removeUserFromGroup.ts:83-88,112-121`;
`firebase/functions/src/userManagement/deleteUser.ts:94-106`;
`src/core/services/firebase/user/UserService.ts:170-173,182-231,241-247`.

**Preconditions and reachable scenario:** A normal member directly changes their
own group-profile `username` to another member's reserved name. The profile
update is allowed without validating its reservation. They then leave the group
through `removeUserFromGroup`. The callable reads that mutable username and uses
Admin SDK authority to delete the corresponding reservation without checking its
`userId` owner. Account deletion contains the same trust assumption.

**Expected versus actual:** Cleanup should delete only reservations belonging to
the departing uid. A caller who is correctly denied direct deletion of somebody
else's name can nevertheless cause that deletion through their own cleanup.

**Impact:** The other user's profile survives but their reserved name becomes
available for another member to claim. Username lookup can then resolve the
victim's name to a different account, and the original name-to-person guarantee
is lost. This does not delete the victim's account or change their role.

**Evidence:** `/tmp/security-review-probe.cjs` confirmed direct member deletion of
the admin's reservation was denied. It then changed the member's own username to
`Admin` through the production rules and called the real self-leave handler. The
admin reservation was deleted while the admin group profile survived. This does
not require any action by an administrator. The `deleteUser` variant was read,
not separately executed.

**Fix direction:** Before deleting a username reservation, verify its stored owner
matches the departing uid, with a transaction/precondition so a concurrent
reservation change cannot invalidate that check. Enforce rename/reservation
consistency at the rules or server transaction boundary, rather than depending
on `UserService.changeGroupUsername` being the only writer.

**Verification:** A departing user with a forged or stale username must not delete
another uid's reservation. Legitimate rename, leave and account deletion must
still release their own name. Race cleanup against reservation replacement and
assert ownership is preserved.

**Tracker:** New. Related to #1427, whose legitimate rename fix allows owners to
delete their own reservations; that direct-delete protection was confirmed to
work and is bypassed only through this server-side confused-deputy path.

### SEC-006 — Anonymous contact callers can evade the mail throttle by changing the supplied address

**Severity: medium. Confidence: high. Classification: new, dynamically reproduced
with a mail stub; live delivery and deployment behavior untested.**

**Locations:** `firebase/functions/src/contact.ts:78-106,301-305,314-349,351-356,373-376,446-447`.

**Preconditions and reachable scenario:** The public contact callable accepts a
name, email and message without authentication. It identifies an anonymous caller
as `anonymous_${sanitizedEmail}` using an unverified request field. A caller who
exhausts the five-request limit can supply another syntactically valid invented
address and receive a fresh allowance. The throttle also lives only in one
process's in-memory object, so instance restarts or multiple instances do not
share the budget. No `enforceAppCheck` setting is present on this callable.

**Expected versus actual:** The claimed spam limit should bound one untrusted
sender's ability to trigger outbound mail. It instead bounds each arbitrary
label the sender chooses within a single warm process.

**Impact:** Repeated mail to the configured maintainer inbox, consumption of the
sending account's mail quota, and diminished availability of the contact/support
channel. The recipient is server-fixed (`to: contactEmail`), so this is not an
arbitrary-recipient open relay. Actual deployed spam, provider blocking and dollar
cost were not measured.

**Evidence:** `/tmp/security-review-probe.cjs` admitted five anonymous submissions
with one address and denied its sixth. Ten more submissions with ten different
invented addresses immediately succeeded, producing fifteen captured mail-stub
calls. The real handler emitted success logs, but `nodemailer` had been replaced
before module load and no messages were sent. The multi-instance limitation is
source-confirmed, not dynamically simulated.

**Fix direction:** Use a persistent abuse budget that cannot be reset by choosing
a different reply-to address, plus a shared outbound-mail ceiling. Preserve the
intended anonymous contact flow with an appropriate verified anti-abuse signal;
App Check can be an additional barrier, not a substitute for a durable quota.
Keep reply-to validation separate from caller identity.

**Verification:** Changing the submitted email, reloading the function process,
or using another instance must not reset the relevant sender/global budget.
Exercise both anonymous and authenticated paths with a stub mail transport and
assert rejected calls never reach it.

**Tracker:** No matching backlog/tracker item found. The prior App Check issues
#1300/#1411 concern initialization/emulator behavior, not this callable's
unverified limiter key.

## Reproductions and verification record

The coordinator executed the probes against centrally managed disposable local
emulators. They load source TypeScript in memory; production source/tests are
unchanged. Functions are invoked through their real `.run` handlers, while
Firestore client operations use `@firebase/rules-unit-testing` and the current
production review copy. Handler invocation does not exercise the deployed HTTP
transport, IAM or App Check. The identity probe uses the actual `memberId`
helper and a source-matched service mapping; it does not automate React.

Commands, from the shared review environment:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node /tmp/security-review-probe.cjs
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node /tmp/security-identity-probe.cjs
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node /tmp/security-quota-race.cjs
```

| Evidence | Observed outcome |
|---|---|
| `/tmp/code-review-baseline/security-probes.log` | Passed: SEC-001, SEC-005, SEC-006; eight negative access controls; contact HTML capture and nonmember own-note write observations. |
| `/tmp/code-review-baseline/security-identity-probes.log` | Passed: SEC-002 target redirection and synthetic private-note deletion; SEC-004 hidden membership retaining campaign access. |
| `/tmp/code-review-baseline/security-quota-race.log` | Passed: four accepted calls against one remaining quota slot, all counters persisted as 10. |
| `/tmp/code-review-baseline/functions-tests.log` | Shared existing suite: 12 suites / 216 tests passed, including both production-rules-copy suites. See the coordinator's baseline for environment details. |

Probe artifacts are temporary paths listed for reproducibility; the coordinator
owns their preservation with the consolidated review evidence. The Admin SDK
logged a metadata lookup warning in this environment; the probes nevertheless
completed against the explicit local demo projects. No credential values appear
in this report or probe output.

The eight negative Firestore controls denied self-assignment of global admin,
addition of an unauthorized group, self-promotion to group admin, another
member's private-note read/list/write, and an outsider's campaign read/write.
These are controls for the tested operations, not proof that every rule path is
safe. Existing tests omit the writable quota map, administrative identity
conflicts, profile-delete/membership divergence and username-cleanup mismatch;
green coverage does not establish those cross-layer contracts.

## Unverified concerns and explicit non-findings

- **Production policy drift remains unverified.** Both `.prod` files explicitly
  state that they are console review copies. `firebase.json` has no Firestore or
  Storage rules key, and production deploy uses `--only functions` before
  Hosting. Thus passing rules tests does not confirm the live policy. This is a
  documented deployment model, not a newly proved open-production-database bug.
  The early explanatory comment in `firestore.rules.prod:9-14` predates removal
  of the configuration key; current `firebase.json` is the relevant source.
- **Contact HTML context is not escaped.** `contact.ts:173-181,365,422-426`
  interpolates caller-supplied context into HTML. The stub captured an intact
  injected link in the HTML body. Mail-client display/filter behavior was not
  tested, and no script execution or account compromise is claimed. Escape
  context values for HTML and keep plain-text formatting separate; this remains
  a scoped rendering concern rather than an additional high-severity finding.
- **Markdown can emit external images.** `MarkdownRenderer.tsx:38-54` customizes
  anchors but leaves Markdown images enabled; `ChapterReader.tsx:378` renders
  shared chapter content through it. Uploaded-image renderers separately enforce
  own-bucket URLs to prevent external tracking (`ImageStorageService.ts:75-96`).
  A browser request/Privacy-design comparison was not performed in this pass;
  retain this as a follow-up rather than claiming a demonstrated tracking event.
- **Private notes need no membership check.** `firestore.rules.prod:261-262`
  permits any signed-in uid to write its own note path inside a known foreign
  group. The probe confirmed this. It grants no ability to read another uid's
  notes or the foreign campaign. The current rules explicitly acknowledge the
  distinction at `268-270`; group/campaign existence and cleanup implications
  overlap the data review. No separate confidentiality bypass is claimed.
- **Shared campaign mutation is intentional.** Members may edit/delete other
  members' campaign entities; the production rules explain this #1406 decision.
  Client-stamped attribution therefore is not an immutable security audit log.
  No unauthorized access finding is based merely on ordinary member content
  edits, a supplied entity id, or the presence of an arbitrary content field.
- **Download URLs are deliberate bearer capabilities.** The Storage design and
  rules explicitly allow a previously issued campaign-image URL to continue
  working without a later rules evaluation. That documented tradeoff is not a
  new member-removal bypass. Uploader-held screenshot metadata/token behavior
  was not independently tested here; there is no demonstrated other-user
  screenshot disclosure.
- **No exposed service secret was identified in the inspected source.** Model
  and SMTP credentials are read from Function secret bindings, while Firebase
  browser config and reCAPTCHA site keys are public configuration. This limited
  source inspection is not a secret-history or deployed-IAM audit.

## Tracker reconciliation and cross-agent ownership

Historical #1408/#1409/#1410 and #1425/#1426 describe previously broad rules or
client-owned membership/roles. Their original exploits do not follow from the
current production review copy; focused controls above confirm key fixes.
Several old tracker rows still say “awaiting deploy,” while newer source comments
claim earlier console comparisons. Without a new console comparison this review
makes no claim about those live deployment statuses and files none again as a
new source defect. #1405's recursive deletion is present and explains the private
note impact of SEC-002; #1427's owner-only reservation deletion works directly and
is undermined by the distinct callable trust in SEC-005.

The auth specialist owns device-session/credential lifecycle, account-cap and
last-admin races. The data specialist owns graph deletion, note/campaign
orphaning and mutable async context affecting writes. The image specialist owns
Storage object/document lifecycle. SEC-003 stays here because its distinct impact
is paid-use admission; SEC-004 stays here because the retained access survives an
intentional direct client operation even without concurrency.

Suggested remediation order: protect paid-use state and make quota reservations
atomic (SEC-001/003); fix canonical administrative identity (SEC-002); close direct
profile-deletion and reservation-cleanup paths (SEC-004/005); replace the contact
throttle with a durable abuse budget (SEC-006). Validate rule changes against the
legitimate client workflows and deploy through the project's explicit console
process only in a separately authorized implementation task.
