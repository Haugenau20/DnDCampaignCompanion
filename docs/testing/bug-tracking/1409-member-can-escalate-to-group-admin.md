# Bug #1409 — A group member could make themselves a group admin with one write

## Title
`allow create, update: if isSignedIn() && request.auth.uid == userId` on the group profile let a
member write **any** field of their own profile, including `role`.

## Status
🟡 PARTIALLY FIXED in `firestore.rules.prod` (2026-07-29) — the one-write path is closed; a two-step
delete-and-recreate path remains and needs a code change. ⚠️ **Awaiting console deploy.**

## Category
VALIDATION

## Discovered In
Emulator probe, 2026-07-29, running the real `firestore.rules.prod` under a scratch project ID.

## Affected File
Production Firestore rules (Firebase console; review copy `firebase/firestore.rules.prod`)

## Description

The group profile at `groups/{groupId}/users/{userId}` carries the `role` field that
`isGroupAdmin(groupId)` reads. The rule permitting self-service profile updates placed no restriction
on which fields could change, so:

```js
updateDoc(doc(db, "groups", groupId, "users", myUid), { role: "admin" })
```

**Measured as ALLOWED** against the previous ruleset. From there the member gains everything
`isGroupAdmin` gates: deleting the group, deleting other members' profiles, creating registration
tokens, deleting campaigns.

This also contaminated the first run of the probe battery — every later check passed because the
escalation check ran first and left the test member an admin. The battery was restructured to reset
the member's role before each escalation check; the numbers in this report are from the isolated run.

## Fix (partial)

```
allow update: if isSignedIn() && request.auth.uid == userId &&
               !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role']);
```

Verified: self-escalation now DENIED, while every legitimate self-update — `activeCampaignId`,
`activeCharacterId`, `preferences`, `characters` — still succeeds (16/16 app-flow probe).

## ⚠️ What is NOT fixed

`create` must still permit `role: "admin"`, because `GroupService.createGroup:101` writes the group
creator's own profile with `role: 'admin'` **from the client**, inside a transaction. So a member can
still delete their own profile (permitted — "leave group") and create it again as an admin.

Conditioning `create` on the group document's `createdBy` was considered and **rejected**: the group
doc is written in the *same transaction* as the profile, so a rules `get()` may not see committed
data, and getting that wrong breaks group creation for everyone.

**The clean fix is a code change**: move group-profile creation into a Cloud Function using the Admin
SDK, then deny `create` to clients entirely. Filed here rather than attempted, because it is a
behaviour change to the registration path and deserves its own review.
