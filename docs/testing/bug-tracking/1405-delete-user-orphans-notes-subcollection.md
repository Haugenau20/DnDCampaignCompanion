# Bug #1405 — Deleting a user permanently orphans that user's notes

## Title
The `deleteUser` Cloud Function batch-deletes a user's group profile documents but never touches
`groups/{groupId}/users/{uid}/notes`, which Firestore does not remove with the parent document.

## Status
✅ FIXED (awaiting deploy) — 2026-10-01. Discovered 2026-07-29; pre-existing and already deployed at
that time, not introduced by any current work.

**Resolution.** The code fix had already landed on `main` as a side effect of the privacy-policy work
(PR #80, `e350c1d`): `firebase/functions/src/shared/deleteUserSubtree.ts` exports
`deleteGroupUserDocument`, an Admin SDK `recursiveDelete` of `groups/{g}/users/{uid}`, and both
functions call it. This report was never updated, and nothing tested the behaviour for notes. Done now:

- **Reproduced** (the report was filed from a code reading): with the helper reduced to a plain
  `groupUserRef.delete()`, the notes survive in every scenario below. The unfixed shape is therefore
  confirmed to orphan them.
- **`removeUserFromGroup` had the same defect** (`:111`) and is fixed by the same helper.
- **Ordering.** `recursiveDelete` cannot join a `WriteBatch`, so in both functions it runs *before*
  the batch commit. If it fails, nothing else has changed (user still in the group / account still
  whole, `deleteUser` has not yet touched Auth), so the call can simply be retried. The reverse order
  would leave a state with no way back: `removeUserFromGroup`'s commit strips the group from the
  user's `groups` array, after which nothing would see the membership to retry the subtree delete.
  The residual window is the other direction: notes gone, then the batch fails, which leaves a member
  with no notes who can retry.
- **Tests**: `firebase/functions/test/deleteUserNotes.test.ts` (10 tests) covers both functions: notes
  and nested subcollections gone, other members' notes untouched, multi-group deletes, notes kept in
  groups the user stays in, admin-initiated paths, and retry after a failed `recursiveDelete`. Run
  against the plain-delete shape, 8 of the 10 fail (the 2 "other members untouched" guards pass by
  design); with the fix all 10 pass.
- **Not done**: a one-off pass for notes orphaned before the fix shipped (see Recommended Fix). No
  audit has been run to find out whether any exist.
- Needs a Functions deploy to be live.

## Category
DATA

## Discovered In
Code reading during the 2026-07-29 session, while surveying existing Cloud Functions as a pattern for
[#1403](./1403-campaign-delete-confirmed-but-never-performed.md).

## Affected Files
- `firebase/functions/src/userManagement/deleteUser.ts:92` (`batch.delete(groupUserRef)`)
- `firebase/functions/src/userManagement/removeUserFromGroup.ts:111` (same shape, same gap)

## Description

`deleteUser` walks the user's group memberships and, per group, deletes the username reservation and
the group user profile document:

```ts
// Delete group user profile
batch.delete(groupUserRef);
```

`groupUserRef` is `groups/{groupId}/users/{userId}` — and notes live **underneath** it, at
`groups/{groupId}/users/{uid}/notes` (`NoteContext.tsx:43`, `useNoteData.ts:34`).

**Firestore does not delete subcollections when the parent document is deleted.** Deleting the parent
document leaves the `notes` subcollection intact and, worse, *unreachable*: the app only ever reaches
notes by way of the signed-in user's own uid, and that user no longer exists. The documents remain
stored and billed with no code path in the application that can list or remove them.

`removeUserFromGroup` has the identical gap at `:111`.

This is the same orphan class as #1403, which is how it was found — but unlike #1403 this one is
already live in production.

## Reproduction

Not yet reproduced against a running system. **This entry is filed from a code reading**, which this
project's methodology treats as insufficient on its own — five earlier entries were retracted for
exactly that. Before acting on it:

1. Create a user in the emulator, join a group, write at least one note.
2. Call `deleteUser` for that user.
3. Query `groups/{groupId}/users/{uid}/notes` directly via the emulator REST API or Admin SDK and
   check whether documents remain.

The mechanism (Firestore not cascading to subcollections) is documented Firestore behaviour and is
the same fact that motivates #1403, so the prediction is a confident one — but it is a prediction
until step 3 is run.

## Expected vs Actual

**Expected (predicted)**: deleting a user removes the data stored under that user.

**Actual (predicted)**: the `notes` subcollection survives indefinitely with no way to reach it.

## Recommended Fix

Both functions already run under the Admin SDK, so the fix is the same primitive #1403 will use:
replace `batch.delete(groupUserRef)` with `admin.firestore().recursiveDelete(groupUserRef)`, which
removes the document and everything below it.

Note that `recursiveDelete` cannot participate in the surrounding `WriteBatch` — it manages its own
batching — so the ordering needs a small restructure rather than a one-line swap.

Any already-orphaned notes from users deleted before the fix will need a separate one-off pass;
`src/utils/__dev__/normalizeChapterDateModified.ts` is the working template for that, and its `audit`
mode is the cheap way to find out whether any exist before deciding it is worth writing.
