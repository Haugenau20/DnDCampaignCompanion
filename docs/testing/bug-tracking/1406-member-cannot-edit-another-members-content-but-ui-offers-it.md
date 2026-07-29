# Bug #1406 — Every member is offered Edit on content they are forbidden to save

## Title
Production rules deny a group member updating content another member created, but the app gates the
Edit affordance on nothing at all — so the routine collaborative edit fails at write time, and in the
NPC forms it fails *silently*.

## Status
🔍 DISCOVERED — 2026-07-29. **Both halves proven**: the denial against the real production ruleset
loaded into the running emulator, the missing gate by exhaustive search.

## Category
VALIDATION

## Discovered In
Emulator probe, 2026-07-29. This settles the second of the two "open contract questions" carried in
the session handoff, which was recorded as *"Unverified — cheap to settle in Deliverable 1."* It is
now verified, and it is worse than the note implied.

## Affected Files
- Production Firestore rules (Firebase console; review copy at `firebase/firestore.rules.prod`)
- Every entity edit affordance — no file implements a creator check, which is the defect
- `src/features/campaign-entities/npcs/components/NPCEditForm.tsx` (silent failure — see
  [#1400](./1400-npc-forms-swallow-write-failures-silently.md))

## Description

### Half one: the rule denies it (proven)

The production ruleset allows an update only when:

```
allow update: if isGroupMember(groupId) &&
              (resource.data.createdBy == request.auth.uid ||
               isGroupAdmin(groupId) ||
               isGlobalAdmin());
```

Probed against the **actual production ruleset** loaded into the running Firestore emulator under an
isolated project ID, with a real group, a real admin, a real member and a real NPC:

| Attempt | Result |
|---|---|
| **member updates another member's NPC** | **DENIED** (`permission-denied`) |
| member reads another member's NPC | ALLOWED |
| member creates their own NPC | ALLOWED |
| member updates their own NPC | ALLOWED |
| group admin updates a member's NPC | ALLOWED |

The denial is clean — the target document was re-read afterwards and still held its original value,
so nothing is partially written.

### Half two: the UI offers it anyway (proven)

There is **no creator check anywhere in the application.** A search across all of `src/` for
`canEdit`, `isOwner`, `isCreator`, `isGroupAdmin`, and for any comparison of `createdBy` against the
current user, returns **zero** results in application code. The only matches are two comment lines in
`src/utils/__dev__/normalizeChapterDateModified.ts` describing the rule.

Every member therefore sees a fully functional Edit affordance on every entity, fills in the form, and
discovers on save that they were never permitted to make the change.

### Why this has never been noticed

**The emulator ruleset is permissive** — `firebase/firestore.rules` is `allow read, write: if true`,
which is correct for an emulator. So this failure **cannot reproduce in local development**. It exists
only in production, where the rules that deny it live in the Firebase console and have no test
covering them.

### What the user actually experiences

- **NPC edit** (the most-used entity): **nothing happens.** Per
  [#1400](./1400-npc-forms-swallow-write-failures-silently.md) the catch does only `console.error`, so
  the member's edits vanish with no message, no error, and no indication the save failed.
- **Quest / Location / Rumor edit**: the raw Firebase error surfaces — *"Missing or insufficient
  permissions."* — with no explanation of why or what to do.

In a typical five-player group there is one admin, so **four of five players cannot correct anyone
else's entry**, and one of the four entity types tells them nothing at all when they try.

## Reproduction

Requires production rules; will not reproduce against the emulator's default ruleset.

1. Load `firebase/firestore.rules.prod` into the emulator for a scratch project ID via
   `PUT /emulator/v1/projects/{projectId}:securityRules`.
2. Create a group with an admin and a member; create an NPC as the admin.
3. Signed in as the member, `updateDoc` that NPC → `permission-denied`.

## Expected vs Actual

**Expected**: either a member can edit shared campaign content, or the app does not offer them an
Edit control that cannot succeed.

**Actual**: the control is always offered, the save always fails for non-creators who are not admins,
and for NPCs the failure is invisible.

## Recommended Fix

⚠️ **This entry contains a contract decision and must not be "fixed" unilaterally.** The handoff
explicitly lists the creator-restriction as a decision, not a defect. What is unambiguously a defect
is the *mismatch* — offering an action that cannot succeed. Three coherent resolutions:

1. **Relax the rule to match the UI.** Let any group member update any content in their group;
   attribution already records `createdBy` and `modifiedBy` separately, so authorship survives. Fits
   a shared campaign journal, where the point is collective record-keeping. Changes production rules —
   the widest blast radius, and it must be made in the console *and* mirrored into
   `firestore.rules.prod` in the same PR.
2. **Gate the UI to match the rule.** Hide or disable Edit unless
   `createdBy === user.uid || isGroupAdmin`, with a tooltip saying why. No rules change, no
   security implication. But it makes a real product limitation visible and permanent, and members
   will ask why they cannot fix a typo.
3. **Keep both, fix only the reporting.** Leave rule and UI as they are; make the failure legible
   ("Only the player who added this NPC, or a group admin, can edit it"). Smallest change, but it
   means users keep filling in forms that were always going to be rejected.

Regardless of which is chosen, [#1400](./1400-npc-forms-swallow-write-failures-silently.md) and
[#1401](./1401-entity-contexts-read-error-from-wrong-hook-instance.md) must be fixed, or option 3 is
impossible and options 1–2 still leave every other write failure invisible.

**A test covering the production ruleset would have caught this.** There is currently none — the rules
that actually run in production are exercised by nothing. Worth considering independently of which
resolution is chosen.
