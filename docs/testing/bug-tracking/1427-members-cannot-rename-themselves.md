# Bug #1427 — A member could not change their name in a group

## Title
`changeGroupUsername` deletes the old username reservation, and only a global admin could delete
one.

## Status
✅ FIXED in `firestore.rules.prod` (2026-09-23). ⚠️ **Awaiting console deploy.**

## Category
VALIDATION

## Discovered In
Emulator probe, 2026-09-23, against the live ruleset, running `UserService.changeGroupUsername`'s
exact transaction as a plain member.

## Affected File
Production Firestore rules; `UserService.changeGroupUsername`

## Description
The rename is one transaction: update the profile's `username`, create the new reservation, delete
the old one. The rules allowed the first two and reserved `delete` on `usernames` for the global
admin, so the whole transaction was denied for everyone else. Invisible in development, where the
emulator's rules allow everything.

## Reproduction
As a member of a group, run the rename transaction → **denied** (`permission-denied`).

## Fix
`allow delete` on a reservation whose `userId` is the caller. Deleting someone else's stays global
admin only. Pinned by the rules suite ("a member renames themselves, exactly as
changeGroupUsername does" / "a member cannot release someone else's name").
