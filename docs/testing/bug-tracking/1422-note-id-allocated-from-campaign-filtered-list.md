# Bug #1422 — Note creation is impossible in every campaign but the one holding the highest note number

## Title

`generateSequentialNoteId` allocates a note id from the **campaign-filtered** list while the
documents live in a **campaign-agnostic** collection, so the id it produces already exists as soon
as the active campaign has fewer notes than another. The save fails and the raw internal error —
including the user's uid — is rendered into the UI.

## Status

✅ FIXED (2026-08-28). Verified end to end in the running app, not only by test.

## Category

DATA / CRUD

## Discovered In

Browser walkthrough on the local dev server, 2026-08-28, while exercising the
notes → AI entity extraction path that
`docs/testing/post-test-coverage-roadmap.md` lists as never exercised. The extraction feature was
not itself at fault: it auto-saves before analysing, and that save is what failed.

## Affected Files

- `src/features/collaboration/notes/context/NoteContext.tsx` — `generateSequentialNoteId` (was
  `:103`), `fetchNotes` (`:38`), `createNote` (`:120`)

## Description

Notes are stored flat at `groups/{groupId}/users/{uid}/notes` and joined to a campaign by a
`campaignId` **field** — there is no per-campaign subcollection. `fetchNotes` fetches that whole
collection, filters it to `activeCampaignId`, and puts only the filtered array into `notes` state.

`generateSequentialNoteId` then computed `max(...) + 1` over `notes` — the filtered view. The id it
returns must be unique across the **unfiltered** collection, so the maximum was taken over the wrong
set. With two notes in campaign A and none in campaign B, campaign B's first note is allocated
`note-1`, which campaign A already owns.

`DocumentService.createDocument` correctly refuses to overwrite, and its message is developer-facing
by design. Nothing catches it before it reaches the user:

```
Cannot create document: a document with id "note-1" already exists in collection
"groups/group1/users/2w3CJPNBc1Ptd55ouMfyYUDerRKQ/notes". createDocument never overwrites an
existing document - use updateDocumentWithAttribution to modify it, or setDocument if this is a
deliberate re-key.
```

That string is rendered **into the note editor**, exposing the user's uid and two internal method
names. Same signature as [#1402](./1402-cross-session-id-collision-surfaces-developer-error.md),
but where #1402 needs two concurrent sessions to race, this one is **deterministic** — it fails the
same way every time.

The unfiltered array (`fetchedData`) was already in hand at `fetchNotes:51` and was discarded.

## Reproduction

Measured against the running emulator with the seeded `dm@example.com` account:

1. Sign in. Group "The Fellowship" has two campaigns; `notes` holds `note-1` and `note-2`, both
   `campaignId: campaign1-1` (The Lord of the Rings).
2. Switch the active campaign to **The Hobbit** (`campaign1-2`), which has **0** notes.
3. Notes → Create Note. The editor opens at `/notes/note-1`.
4. Click Save (or the Smart Detection button, which auto-saves first).

**Result**: the save fails and the internal error above is printed in the editor. Smart Detection
reports *"Failed to save your work before analysis. Please save manually and try again."* — and
saving manually fails identically, so the advice cannot be followed.

**Control, in the same session**: switch back to The Lord of the Rings and create a note. The editor
opens at `/notes/note-3`, which is free, and the save succeeds. The difference is measured, not
inferred: creation works in the campaign holding the highest note number and fails in every other.

## Expected vs Actual

| | |
|---|---|
| **Expected** | A new note gets an id unused anywhere in the user's note collection, and saves. |
| **Actual** | The id is unused only *within the active campaign*; saving fails, and a developer-facing error naming the user's uid is shown to the player. |

## Recommended Fix

Allocate against the unfiltered collection, not the filtered view.

## Resolution (2026-08-28)

`fetchNotes` now records the unfiltered id set into a new `allNoteIds` state slice before the
campaign filter discards it, and `generateSequentialNoteId` reads that instead of `notes`.
`createNote` also claims its id into `allNoteIds` immediately, because two creates in a row both
happen before any refetch and would otherwise be allocated the same number.

Only the ids are kept, not the other campaigns' note bodies — nothing else needs them, and holding
the full unfiltered array in state would quietly widen what a `notes` consumer could reach.

**Not fixed by making the id a UUID.** Sequential `note-N` ids are load-bearing here: they appear
in the URL (`/notes/note-3`) and two existing tests assert the sequence. Changing the id scheme is a
larger decision than this defect requires.

**Deliberately not addressed**: the cross-*session* case. If another device created notes since the
last fetch, `allNoteIds` is stale and a collision is still possible. That is exactly
[#1402](./1402-cross-session-id-collision-surfaces-developer-error.md), it is still open, and its
fix (refresh-and-retry around the create) is the one that closes both. This entry fixes the
deterministic single-session case that made a core feature unusable.

### Verification

- Two regression tests in `NoteContext.bugs.test.tsx`, both **proven against the un-fixed code**:
  reverting `generateSequentialNoteId` to read `notes` produces `Expected: "note-3", Received:
  "note-1"` — the exact collision observed in the browser.
- Full suite **187 suites / 4282 passed / 2 skipped / 0 failed**, from a pre-change baseline of
  4270 passed reproduced at the start of the session. `tsc --noEmit` clean; `npm run build` succeeds.
- **Confirmed in the running app**: after the fix, creating the first note in The Hobbit opens at
  `/notes/note-4` and saves. Firestore then holds `note-1..3 → campaign1-1` and
  `note-4 → campaign1-2`.
