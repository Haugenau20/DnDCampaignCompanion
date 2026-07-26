# Bug #1202 — StoryContext reorder path wrote `dateModified` as a `Date` object, not an ISO string

## Title
Chapter reorder wrote `dateModified: new Date()` (a `Date` object) while every other write site writes an ISO string — producing a Firestore Timestamp in a field that is a string everywhere else

## Status
✅ FIXED — incidentally, by attribution-consolidation Wave A

## Category
DATA

## Discovered In
Not surfaced by a test. Found during the attribution-consolidation Wave A refactor
(`docs/architecture/migration/attribution-consolidation-wave-a.md`) when the hand-rolled block was
replaced by the shared helper.

## Affected File
`src/features/storytelling/chapters/context/StoryContext.tsx` (reorder path inside `updateChapter`)

## Description

The chapter-reorder path built its attribution per-field inside a `.map()`:

```tsx
dateModified: c.id === chapterId ? new Date() : c.dateModified,
modifiedBy: c.id === chapterId ? user.uid : c.modifiedBy,
modifiedByUsername: c.id === chapterId ? getUserName(activeGroupUserProfile) || '' : c.modifiedByUsername,
modifiedByCharacterName: c.id === chapterId ? getActiveCharacterName(activeGroupUserProfile) || '' : c.modifiedByCharacterName,
```

Note the first line: `new Date()` — a **`Date` object**. Every other attribution write in the
codebase, including the two other blocks in this very file, uses
`new Date().toISOString()` — a **string**. `ContentAttribution.dateModified` is typed `string`.

The Firebase SDK serializes a `Date` to a Firestore **Timestamp**, not a string. So reordering a
chapter stored `dateModified` as a Timestamp, while creating or editing that same chapter stored it
as an ISO string. The field's type depended on which code path last touched the document.

### Impact
- **Consumers that treat `dateModified` as a string get wrong results on reordered chapters.**
  `formatAttributionDate` in `src/utils/attribution-utils.ts` calls `new Date(dateString)`; handed a
  Firestore Timestamp object rather than a string, that yields `Invalid Date`, and the function
  returns `''` — the modification date silently disappears from the UI.
- String comparison and sorting on `dateModified` (e.g. recent-activity ordering on HomePage)
  misbehaves for affected documents.
- It type-checked only because the object being built was not annotated at that point.

## Reproduction
1. Create a chapter (stores `dateModified` as an ISO string).
2. Reorder it so it moves position.
3. Inspect the stored document: `dateModified` is now a Firestore Timestamp, not a string.
4. View attribution in the UI — the "Modified by … on …" date is missing.

## Expected vs Actual

**Expected:** `dateModified` is an ISO 8601 string on every write path, per `ContentAttribution`.

**Actual (before fix):** The reorder path wrote a `Date`, stored as a Timestamp.

## Fix

Fixed as a side effect of Wave A: the block was replaced by `buildModificationAttribution(...)`, which
always writes `dateModified: new Date().toISOString()`. All three blocks in `StoryContext` now go
through the helper, so the path can no longer disagree with itself.

No test asserted the old `Date`-object shape, so nothing had to change on the test side — which is
also why the inconsistency survived this long.

## Follow-up still outstanding

**Existing documents were not migrated.** Any chapter reordered before this fix still holds a
Timestamp in `dateModified`, and will keep rendering a blank modification date. A one-off data
normalization pass — read every chapter, convert Timestamp `dateModified` to an ISO string — is
needed to clear the existing corruption. Filed here rather than done inline: it is a data migration,
not a code change, and it should be run deliberately against production with a backup in hand.
