# Bug #1408 — Every member's private notes were readable, listable and writable by the whole group

## Title
`groups/{groupId}/users/{uid}/notes` had no rule of its own, so it fell through to the catch-all
nested wildcard, whose read rule is `isGroupMember(groupId)`.

## Status
✅ FIXED in `firestore.rules.prod` (2026-07-29) — ⚠️ **awaiting console deploy.**

## Category
DATA

## Discovered In
Emulator probe, 2026-07-29, running the real `firestore.rules.prod` under a scratch project ID.

## Affected File
Production Firestore rules (Firebase console; review copy `firebase/firestore.rules.prod`)

## Description

Notes are personal by design: the client only ever builds the path from the **signed-in user's own
uid** (`NoteContext.tsx:43`, `useNoteData.ts:34`), so the UI never shows one user another's notes.
The rules did not agree. The previous policy had no `notes` block, so those documents matched:

```
match /{collection}/{docId} {
  match /{nestedCollection}/{nestedDocId} {
    allow read: if isGroupMember(groupId) || isGlobalAdmin();
    ...
```

with `collection = users`, `docId = <other user's uid>`, `nestedCollection = notes`.

**Measured against the previous ruleset**, as a plain member against another member's notes:

| Attempt | Result |
|---|---|
| read another member's note | **ALLOWED** |
| list another member's notes | **ALLOWED** |
| write another member's note | **ALLOWED** |

Nothing leaked through the application, because no client code ever requests that path. But any group
member using the Firebase SDK directly could read every other member's private notes — and write to
them.

## Expected vs Actual

**Expected**: notes are private to their author, as the product intends.
**Actual (before fix)**: readable, listable and writable by every member of the group.

## Fix

An explicit owner-only block, added inside `match /groups/{groupId}/users/{userId}`:

```
match /notes/{noteId} {
  allow read, write: if isSignedIn() && request.auth.uid == userId;
}
```

Deliberately **not** readable by group admins or the global admin: "private" that an admin can read is
not private. Verified after the change — all three attempts now DENIED, while the owner's own read and
write still succeed.

If note sharing is added later, it should copy or publish the note into a campaign-scoped collection
rather than widening this rule.
