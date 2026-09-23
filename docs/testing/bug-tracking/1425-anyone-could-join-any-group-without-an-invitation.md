# Bug #1425 — Anyone signed in could join any group without an invitation

## Title
`isGroupMember` trusts `users/{uid}.groups`, and a user could write that array about themselves.

## Status
✅ FIXED in `firestore.rules.prod` and the `redeemInvitation` Cloud Function (2026-09-23, T052).
⚠️ **Awaiting console deploy** — functions first, then the frontend, then the rules.

## Category
VALIDATION

## Discovered In
Reading the rules while implementing T013's token expiry, which checked a field no rule read.
Measured the same day against the live ruleset (the console copy matched `firestore.rules.prod`
rule for rule) loaded into the emulator under a scratch project.

## Affected File
Production Firestore rules (Firebase console; review copy `firebase/firestore.rules.prod`),
`InvitationService.signUpWithToken` / `joinGroupWithToken`, `GroupService.joinGroup`

## Description
Group membership is the `groups` array on the caller's own global profile. The rules let a user
create that profile with any content and update it freely except `isAdmin`, so adding a group's id
was permitted — and it is exactly what `isGroupMember` reads. The registration token, including
the expiry T013 added, was checked only by the client that chose to. The "mark token used" rule
did not require the token to be unused. Group ids leak through every invitation link, and stay in
it after the token is spent.

## Reproduction
As a fresh account with no invitation: write `users/{uid}` with `groups: [<victim group>]`, then
read and write that group's campaigns. `functions/test/rules/firestore-rules-prod.test.ts`, run with
`RULES_FILE` pointing at the pre-2026-09-23 revision, reproduces it.

## Expected vs Actual
- **Expected**: only someone holding an unused, unexpired token can join.
- **Actual**: stranger reads the campaign → denied; stranger lists the group in their own profile →
  **allowed**; stranger then reads and writes the campaign → **allowed**. Creating their own
  member profile, and marking a used or expired token as theirs, were also allowed.

## Fix
Joining runs in the `redeemInvitation` Cloud Function: one Admin SDK transaction that checks the
token and writes the membership, the group profile, the username reservation and the spent token.
The rules refuse any client write to `groups`, any client create of `users/{uid}` or of a group
profile, a username reservation by a non-member, and a client "mark used". Pinned by
`functions/test/redeemInvitation.test.ts` (15) and the rules suite.
