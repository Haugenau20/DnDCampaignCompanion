# Bug #1410 — Any group member could mint registration tokens

## Title
The catch-all `match /{collection}/{docId}` had `allow create: if isGroupMember(groupId)`, and it
matched every group-level collection — including `registrationTokens`, whose own block restricts
create to admins.

## Status
✅ FIXED in `firestore.rules.prod` (2026-07-29) — ⚠️ **awaiting console deploy.**

## Category
VALIDATION

## Discovered In
Emulator probe, 2026-07-29, running the real `firestore.rules.prod` under a scratch project ID.

## Affected File
Production Firestore rules (Firebase console; review copy `firebase/firestore.rules.prod`)

## Description

Firestore evaluates **all** matching rules and grants access if **any** of them allows. The
`registrationTokens` block correctly said:

```
allow list, create: if isGroupAdmin(groupId) || isGlobalAdmin();
```

but the sibling wildcard `match /{collection}/{docId}` also matched
`groups/{groupId}/registrationTokens/{token}` and said `allow create: if isGroupMember(groupId)`. The
permissive rule wins.

**Measured as ALLOWED**: a plain member creating `groups/{g}/registrationTokens/{token}`. Since token
`get` is public (`allow get: if true`, needed for registration), a member could mint invitations to
the group at will.

The same wildcard is why #1408's notes were exposed. It is the single root cause of two separate
findings, which is what a broad wildcard sitting alongside specific blocks tends to produce.

## Fix

The wildcard is removed. `campaigns` — the only group-level collection that held content — is now
matched explicitly, and everything else falls through to the final `allow read, write: if false`.

A group's collections are exactly `campaigns`, `users`, `usernames` and `registrationTokens`,
confirmed via `listCollectionIds` against the emulator, and all four have explicit blocks. Verified
after the change: member creating a registration token now DENIED, while an admin creating one and a
joiner marking one used both still succeed.
