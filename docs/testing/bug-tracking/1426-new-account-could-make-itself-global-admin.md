# Bug #1426 — Any new account could make itself a global admin

## Title
`users/{userId}` `allow create` checked only that the uid matched, so the profile could be created
with `isAdmin: true`.

## Status
✅ FIXED in `firestore.rules.prod` (2026-09-23). ⚠️ **Awaiting console deploy.**

## Category
VALIDATION

## Discovered In
Emulator probe while measuring #1425, 2026-09-23, against the live ruleset.

## Affected File
Production Firestore rules (Firebase console; review copy `firebase/firestore.rules.prod`)

## Description
The update rule forbade touching `isAdmin`; the create rule did not. Anyone can create a Firebase
Auth account with the public web API key, and a new account has no `users/{uid}` yet — so its
first write could carry `isAdmin: true`, after which `isGlobalAdmin()` is true: `/admin` settings,
every group, every campaign, every other user's profile. Only other users' emails and private notes
stayed out of reach.

## Reproduction
Fresh account: read `/admin/settings` → denied. Create own `users/{uid}` with `isAdmin: true` →
**allowed**. Read `/admin/settings` again → **allowed**.

## Expected vs Actual
- **Expected**: no client can grant itself global admin.
- **Actual**: every new account could.

## Fix
No client may create `users/{uid}` at all; `redeemInvitation` and `createGroup` create it with the
Admin SDK. Pinned by the rules suite.

**Interim hotfix, safe to deploy on its own**: in the console, change the create line to
`allow create: if isSignedIn() && request.auth.uid == userId && !('isAdmin' in request.resource.data);`
— nothing in the currently deployed frontend writes `isAdmin`.
