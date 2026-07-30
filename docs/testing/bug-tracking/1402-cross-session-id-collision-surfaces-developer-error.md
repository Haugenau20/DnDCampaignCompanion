# Bug #1402 — A cross-session name collision shows the player an internal developer message instead of disambiguating

## Title
`isTaken` consults only client-local state, so a second session's identical name skips
disambiguation, trips `createDocument`'s write-layer guard, and surfaces a message telling the user to
"use `updateDocumentWithAttribution`".

## Status
🔍 DISCOVERED — 2026-07-29. **Proven against the running Firestore emulator.** No data is lost.

## Category
UI

## Discovered In
Emulator probe, 2026-07-29, run under an isolated project ID against the live Firestore emulator
using the real `generateUniqueEntityId` and `createDocument`'s guard transcribed verbatim.

## Affected Files
- `src/features/campaign-entities/npcs/context/NPCContext.tsx:116-120` (and the equivalent in Quest,
  Location, Rumor contexts)
- `src/core/services/firebase/data/DocumentService.ts:186-196` (the guard — correct, not the defect)

## Description

The [#002](./002-npc-id-generation-collision.md) family fix disambiguates on collision via
`generateUniqueEntityId(name, isTaken)`. `isTaken` is **synchronous** and consults two client-local
sources:

```tsx
const isTaken = (candidateId: string) =>
  issuedIds.current.has(candidateId) || Boolean(getNPCById(candidateId));
```

`issuedIds` is a session-scoped ref; `getNPCById` searches the locally loaded `npcs` array. Neither
knows about a document written by a *different* session since this client last refreshed.

So when session B creates an NPC whose slug session A already used, `isTaken` returns `false`, the
clean slug is chosen, and the write proceeds — where `DocumentService.createDocument`'s existence
guard correctly refuses it and throws.

**This is the guard working as designed.** The defect is what the user is then shown.

## Reproduction

Verified against the running emulator (isolated project, sample data untouched):

| Scenario | Result |
|---|---|
| Same session, "Gandalf" then "Gandalf" | `gandalf`, `gandalf-2` ✅ correct |
| Same session, "Gandalf" then "gandalf" | `gandalf`, `gandalf-2` ✅ correct |
| **Two sessions**, both "Gandalf" | session B **throws** |
| **Two sessions**, "Gandalf" then "gandalf" | session B **throws** |
| Two sessions, B calls `refresh()` first | `gandalf-2` ✅ correct |

The thrown message, verbatim:

```
Cannot create document: a document with id "gandalf" already exists in collection "npcs".
createDocument never overwrites an existing document - use updateDocumentWithAttribution to
modify it, or setDocument if this is a deliberate re-key.
```

Server state after the failed write was checked directly: **session A's document is intact, one
document on the server.** Nothing is overwritten and nothing is lost.

The final row is the important one — a refresh immediately before the id derivation produces the
correct `gandalf-2`. The gap is a missing refresh/retry, not a flaw in the disambiguation scheme.

## Expected vs Actual

**Expected**: two players in one campaign both adding an NPC called "Gandalf" get `gandalf` and
`gandalf-2`, exactly as they would within one session. The second player sees no error at all.

**Actual**: the second player's create fails. In Quest/Location/Rumor forms they are shown the raw
message above, naming internal service methods. In the NPC forms they are shown **nothing at all**
(see [#1400](./1400-npc-forms-swallow-write-failures-silently.md)).

## Recommended Fix

On a create that fails the existence guard, refresh from the server and retry the id derivation once,
before surfacing anything to the user. The emulator probe shows this resolves the collision correctly.

A retry loop needs a bound (one retry is almost certainly enough — the second derivation sees fresh
server state) and the final failure still needs a user-facing message that does not name
`updateDocumentWithAttribution`.

**Do not** "fix" this by making `isTaken` async and querying Firestore per candidate — that adds a
round trip to every create for a rare collision, and still races. The retry is the cheaper and more
honest shape.

Priority note: this is the most likely *trigger* for #1400 and #1401 in real use, but it is the least
severe of the three on its own, because the write-layer guard means no data is at risk.
