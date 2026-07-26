# Findings: Attribution is written three different ways — consolidate to one

*Investigated 2026-07-05 while verifying the Wave-2 premise of `attribution-helper-spec.md`. This document supersedes that spec's problem statement.*

## TL;DR

The premise behind `attribution-helper-spec.md` — "a shared helper fixes the highest-priority
user-attribution bug" — **does not survive verification.** The attribution *bug-marker tests
already pass*, nothing consumes the "missing" field, and the real problem is bigger and more
useful to fix: **the codebase writes attribution metadata in three incompatible ways.** The
right move is to collapse them into a single path, not to add a fourth.

The Wave-1 work (the `src/shared/attribution` helper + the Rumors feature migration) is done,
verified, and merged — it is still useful, but its role changes (see Recommendation).

---

## What I set out to verify vs. what I found

The spec claimed the helper would fix the systematic user-attribution bug (#008/#011/#015/#020),
justified by "Quest and Rumor omit `createdByCharacterId`." Verifying against the actual tests
and code:

1. **The attribution bug-markers already pass.** Running `RumorContext.bugs.test.tsx --verbose`:
   Bug #011 (User Attribution) — all 3 tests **PASS**. The 5 red tests in that file are Bug #012
   (ID collision), #013 (combine logic), #014 (quest conversion). Across all four campaign-entity
   contexts, the 15 failing bug-markers are ID-collision / validation / cascade-order / combine /
   quest-conversion — **none are attribution.**

2. **Nothing consumes the "missing" field.** `src/components/shared/AttributionInfo.tsx` (the only
   attribution *display* component) reads `createdByCharacterName` / `modifiedByCharacterName`
   only — it never reads `createdByCharacterId` / `modifiedByCharacterId`. Adding those IDs to
   Quest/Rumor fixes an inconsistency with no reader and no test.

3. Therefore the proposed "wire the four contexts to the helper" is a **DRY refactor, not a bug
   fix.** It would not turn any red test green.

That would be a fine outcome on its own — except verification also surfaced the real issue.

---

## The real finding: three divergent attribution paths

`DocumentService` already contains a correct, centralized attribution implementation:

- `DocumentService.createDocument()` (`src/services/firebase/data/DocumentService.ts:205`) calls
  the private `getCreationAttribution()` (`:87`), which **fetches the live user profile from
  Firestore** (`groups/{groupId}/users/{userId}`), reads `username` / `activeCharacterId`,
  resolves the character name from `characters[]`, and returns a full `ContentAttribution`
  including `createdByCharacterId`.
- `updateDocumentWithAttribution()` (`:257`) does the same for modifications.
- `setDocument()` (`:240`) is explicitly documented: *"Create or update a document **without**
  attribution metadata. Use createDocument or updateDocumentWithAttribution for automatic
  attribution."*

Now look at who writes entity data, and how:

| Area | Write call | Attribution source | Correct? |
|---|---|---|---|
| **NoteContext** | `documentService.createDocument(...)` (`NoteContext.tsx:186`) | DocumentService (live Firestore profile) | ✅ the intended path |
| **NPC / Quest / Location / Rumor contexts** | `useFirebaseData.addData` → `setDocument` (the *no-attribution* path) | **hand-rolled inline** from the React-context `activeGroupUserProfile`, and **inconsistently** (Quest & Rumor drop `characterId`) | ❌ bypasses the service |
| **Storytelling (StoryContext, useSagaData)** | `setDocument` directly | minimal / none (to confirm) | ❌ bypasses the service |

Updates tell the same story: `useFirebaseData.updateData` (`useFirebaseData.ts:86`) routes to
`updateDocument` — **not** `updateDocumentWithAttribution` — so the campaign-entity contexts also
hand-roll modification attribution instead of using the service method built for it.

So the same job — "stamp who/when/which-character onto a document" — is implemented **three
times, three ways**: once correctly in `DocumentService` (used only by Notes), once hand-rolled
and inconsistently across four campaign-entity contexts, and once (near-)absent in storytelling.
This is precisely the "different ways of doing the same thing / duplication across the project"
we want eliminated.

### Why this happened
The campaign-entity contexts use the generic `useFirebaseData` hook, whose `addData` deliberately
calls the *no-attribution* `setDocument` and leaves attribution to the caller. Each caller then
re-implemented attribution from the in-memory `activeGroupUserProfile` — and the copies drifted
(Quest/Rumor lost `characterId`). NoteContext, written later or differently, went straight to
`DocumentService.createDocument` and got it for free.

---

## What is actually red (for context, not this effort)

The genuinely failing bug-markers are architectural bugs the migration roadmap explicitly
deferred until after restructuring:
- ID-generation collisions (NPC #002, Quest #004, Rumor #012, Location case-variants)
- Missing entity-existence validation (NPC #006)
- Location cascade-delete ordering
- Rumor combine logic (#013) and quest-conversion integration (#014)

None of these are attribution. They are a separate, already-catalogued workstream.

---

## Recommendation: one construction function + one write path

Goal: exactly **one** way to attribute a write, impossible for a caller to get wrong.

**1. Single construction implementation.** Keep the Wave-1 `src/shared/attribution` helper, but
reframe it as the *one* place that maps a user profile → `ContentAttribution`. Refactor
`DocumentService.getCreationAttribution` / `getModificationAttribution` to call the helper instead
of duplicating the field-mapping. (The helper stays pure and profile-source-agnostic; the service
passes its Firestore-fetched profile in.) This removes the last duplication of the *mapping*
logic.

**2. Single write path.** Route **all** entity contexts through
`DocumentService.createDocument` / `updateDocumentWithAttribution` (as NoteContext already does),
and **delete every hand-rolled inline attribution block** in the NPC / Quest / Location / Rumor
(and storytelling) contexts. After this, contexts never touch attribution — the service owns it,
so a caller *cannot* drop `characterId` again.

Net result: one mapping function, one write path, zero duplication, and the Quest/Rumor
inconsistency disappears as a side effect. This directly serves the "streamlined, single way"
objective — more so than the original helper-wiring plan, which would have added a fourth path.

### Why DocumentService as the single authority (not the helper-in-contexts approach)
- It already exists and is already correct and complete.
- It reads the **authoritative** profile (live from Firestore), not a possibly-stale in-memory
  React-context object.
- One feature (Notes) already uses it — standardizing means moving *toward* the existing-correct
  implementation, not away from it.
- The only cost is one extra `getDoc` per create/update. Entity creation is a cold, user-initiated
  action, not a hot loop — this is a non-issue in practice.

### Alternative considered (and rejected)
"Make the helper the single source and have every context call it, still writing via the
no-attribution `setDocument`." Rejected because it keeps attribution as a *caller* responsibility
(the exact pattern that drifted), forces NoteContext to move *off* the more-correct service path,
and keeps a stale in-memory profile as the data source.

---

## Scope, risk, and sequencing (for a future session)

**Scope**: NPC, Quest, Location, Rumor contexts (create + update paths) + a storytelling audit
(StoryContext, useSagaData) to confirm what, if any, attribution they write. NoteContext is the
reference; it likely needs no change.

**Primary risk — test re-seaming (not assertion changes).** The campaign-entity behavioral/bug
tests mock at the `useFirebaseData` seam (`mockAddData` / `mockUpdateData`). Switching contexts to
`documentService.createDocument` moves the collaborator, so those tests' **mock wiring** must be
re-pointed at `documentService`. Per the project's testing methodology this is legitimate
(updating the *mock of a changed collaborator*, never editing an *assertion* to force a pass). Budget
real time for it; it touches many test files. This is the main reason to do it as its own focused
effort, not bolted onto the migration.

**Sequencing** (suggested):
1. Refactor `DocumentService` attribution methods to delegate to the `shared/attribution` helper
   (small, isolated, keeps behavior identical — verify with existing DocumentService tests).
2. Audit storytelling attribution and decide its target behavior.
3. Migrate the four campaign-entity contexts to the service methods, deleting inline attribution,
   one context at a time, re-seaming each context's tests as you go. Green tests after each.
4. Confirm `AttributionInfo` still renders correctly (names unchanged; IDs now consistently present).

**Do not** do this mid-migration in the same commits as structural moves — keep the "collapse to
one path" change isolated so a regression is easy to bisect.

---

## Status of work done this session (branch `migration/campaign-entities`)

- ✅ **Wave 1a** — `src/shared/attribution/` helper (`buildCreationAttribution` /
  `buildModificationAttribution`) + 10 unit tests. Merged. `tsc` clean, tests green. Still useful
  as the single construction function above.
- ✅ **Wave 1b** — Rumors sub-feature migrated into `src/features/campaign-entities/rumors/`
  (structural move, mirrors the Locations migration). Merged. `tsc` clean; same 5 pre-existing
  bug-markers fail, no regressions. **Campaign-entities is now fully migrated (NPC/Quest/Location/
  Rumor).**
- ⛔ **Wave 2** — NOT done. Deliberately paused: the original plan (wire contexts to the helper)
  is superseded by this document's recommendation.

## Open decision for next session
Confirm the direction: **standardize all entity writes on `DocumentService`'s attribution methods
(single write path) + helper as the single mapping function**, then schedule it as a focused,
test-re-seaming effort separate from the migration. If agreed, step 1 (DocumentService → helper
delegation) is the safe, self-contained starting point.
