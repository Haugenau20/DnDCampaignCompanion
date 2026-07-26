# Bug #1200 — ChapterForm builds attribution that StoryContext unconditionally overwrites

## Title
ChapterForm attribution fields (lines 117-120, 139-141) are dead code — StoryContext overwrites every one of them, and they use the wrong source (`user.displayName` instead of the group username)

## Status
🔍 DISCOVERED

## Category
ARCHITECTURE

## Discovered In
Not surfaced by a test. Found by code inspection during the attribution-consolidation audit
(`docs/architecture/migration/attribution-consolidation-wave-a.md`).

## Affected File
`src/features/storytelling/chapters/components/ChapterForm.tsx`

## Description

`ChapterForm` builds attribution metadata into the payloads it hands to `StoryContext`:

```tsx
// create path, lines 112-121
const newChapter: Omit<Chapter, 'id'> = {
  title, content, summary: finalSummary, order,
  dateModified: new Date().toISOString(),
  createdBy: user?.uid || '',
  createdByUsername: user?.displayName || '',   // <-- wrong source
  dateAdded: new Date().toISOString(),
};

// edit path, lines 134-142
const updates: Partial<Chapter> = {
  title, content, summary: finalSummary, order,
  dateModified: new Date().toISOString(),
  modifiedBy: user?.uid || '',
  modifiedByUsername: user?.displayName || '',  // <-- wrong source
};
```

Two separate problems:

**1. The values are wrong.** `user.displayName` is the Firebase Auth display name. Every other write
site in the codebase attributes content with the *group-scoped* username via
`getUserName(activeGroupUserProfile)`, because a user's identity is per-group in this app. The
character fields (`createdByCharacterId` / `createdByCharacterName` and their `modified*` twins) are
omitted entirely.

**2. The values are never used.** `StoryContext` spreads the incoming payload **first** and then
overwrites every attribution field with correctly-sourced values, on both paths:

- Create — `StoryContext.tsx:359-371`: `{ ...chapterData, ... createdBy: user.uid, createdByUsername: getUserName(activeGroupUserProfile) || '', ... }`
- Edit — `StoryContext.tsx:204-210`: `updateData(chapterId, { ...updates, ... modifiedBy: user.uid, modifiedByUsername: getUserName(activeGroupUserProfile), ... })`

So the wrong values are computed and then discarded on every save. **There is no user-visible data
corruption today** — chapters are stored with the correct group username. The defect is that a
presentation component owns write-metadata logic it has no business owning, and that logic is both
wrong and inert. It will become a real bug the moment someone reorders those spreads or routes
`ChapterForm` to a different consumer.

### Impact
- Misleads maintainers into thinking `ChapterForm` controls chapter attribution. It does not.
- A component-layer copy of attribution mapping that the attribution-consolidation effort must not
  be fooled into "fixing" in place — the fields should be deleted, not corrected.
- Latent: any change to spread order in `StoryContext` silently starts writing Auth display names
  and dropping character attribution.

## Reproduction
1. Sign in as a user whose Firebase Auth `displayName` differs from their group username (or is unset).
2. Create a chapter via `ChapterForm`.
3. Inspect the stored document: `createdByUsername` holds the **group username**, not `displayName`.
   The value ChapterForm computed never reaches Firestore.

## Expected vs Actual

**Expected:** A form component collects user input and hands over domain data. Attribution is applied
once, by the write layer.

**Actual:** `ChapterForm` computes six attribution fields from the wrong source, and `StoryContext`
overwrites all six.

## Recommended Fix

Delete the attribution fields from both payloads in `ChapterForm` — `createdBy`, `createdByUsername`,
`dateAdded`, `dateModified` on the create path, and `modifiedBy`, `modifiedByUsername`,
`dateModified` on the edit path. Keep only the domain fields (`title`, `content`, `summary`, `order`).
`StoryContext` already supplies correct attribution for both paths.

This requires a type check: `Omit<Chapter, 'id'>` on the create path may demand the attribution fields
be present. If so, the create call should take a domain-only input type (the `DomainData<T>` split
sketched in `docs/testing/post-test-coverage-roadmap.md`), or `StoryContext.createChapter` should
accept a narrower parameter type. Do not paper over it by keeping the dead fields.

Deliberately **not** fixed as part of attribution-consolidation Wave A: that effort centralizes the
attribution *mapping function* without changing any write path, and this fix changes a call
signature. It needs its own tests — `ChapterForm` currently has no test asserting what it sends to
`createChapter` / `updateChapter`, which is why the dead fields went unnoticed.
