# Bug #852 — `updateChapterProgress` overwrites the chapter entry instead of merging, so re-reading a finished chapter un-completes it

**Status**: 🔍 DISCOVERED
**Category**: DATA
**Priority**: Medium
**Impact**: Medium — silently loses per-chapter completion state during ordinary reading
**Discovered**: 2026-07-28, while verifying the fix for [#851](./851-storypage-page1-always-marks-complete.md)
**Affected files**:
- `src/features/storytelling/chapters/context/StoryContext.tsx` (`updateChapterProgress`, ~lines 122-150)
- `src/features/storytelling/stories/components/BookViewer.tsx` (`handlePageChange`, ~lines 74-91)
- `src/pages/story/StoryPage.tsx` (`handlePageChange`, ~line 81)

---

## Summary

`updateChapterProgress` accepts `progress: Partial<ChapterProgress>` — a signature that promises
partial-update semantics — but its body **replaces the whole per-chapter entry**, defaulting every
field the caller did not supply:

```ts
const updatedProgress = {
  ...storedProgress,
  chapterProgress: {
    ...storedProgress.chapterProgress,
    [chapterId]: {
      chapterId,
      lastPosition: progress.lastPosition || 0,
      isComplete: progress.isComplete || false,   // <-- overwrite, never merged
      lastRead: new Date()
    }
  }
};
```

The outer two spreads preserve *other* chapters. Nothing preserves the *existing values of this
chapter*. `isComplete` is therefore reset to `false` on any call that does not explicitly pass
`true`.

## Why that fires during normal reading

`BookViewer` calls its `onPageChange` **twice** on the final page, and **once without the completion
flag on every other page turn** (`BookViewer.tsx:74-91`):

```ts
onPageChange?.(newPage);                       // always — no isComplete argument
const isComplete = newPage === totalPages;
if (isComplete) {
  onPageChange?.(newPage, true);               // additionally, on the last page
}
```

`StoryPage.handlePageChange` forwards straight through:

```ts
updateChapterProgress(currentChapter.id, {
  lastPosition: page,
  isComplete: !!isComplete
});
```

So opening a **previously completed** chapter at page 1 writes `isComplete: false` over the stored
`true`. The chapter is marked complete again only if the reader navigates all the way back to the
last page.

## Reproduction

1. Read a chapter to its final page — it is stored with `isComplete: true`.
2. Navigate away, then re-open that chapter (it opens at page 1).
3. `onPageChange(1)` fires with no `isComplete` argument.
4. Stored progress for that chapter is now `isComplete: false`.

Any completion-derived UI — `getReadingProgress()`, completion badges — silently regresses.

## Expected vs actual

| | Expected | Actual |
|---|---|---|
| Re-opening a finished chapter | stays complete | reverts to incomplete |
| `updateChapterProgress(id, { lastPosition: 3 })` | updates position only | also resets `isComplete` to `false` |

## Relationship to other bugs — read this before triaging

**This is not caused by #851's fix, and it is not a regression from it.** #851 corrected
`isComplete: isComplete || page === 1` to `isComplete: !!isComplete`. The overwrite behaviour is
identical either way; the old code merely happened to write `true` on page 1, which masked this on
exactly the page where it now bites. Reverting #851 would not fix #852 — it would only trade
"re-reading un-completes a chapter" for "loading page 1 completes a chapter you never read."

**It was inert until 2026-07-28.** Before [#018](./018-story-progress-tracking-integration.md) was
fixed earlier the same day, reading progress was a frozen module-level constant: nothing accumulated
and nothing was read back. These writes never reached storage, so the overwrite had no observable
effect. #018's fix — moving progress into real state seeded from Firestore — is what made this
consequential. **A dormant defect became live because a neighbouring one was fixed.**

## Recommended fix

Merge with the existing entry rather than replacing it, and stop coercing absent fields to
defaults:

```ts
const existing = storedProgress.chapterProgress[chapterId];
...
[chapterId]: {
  ...existing,
  chapterId,
  ...progress,          // only the fields the caller actually supplied
  lastRead: new Date()
}
```

That makes the body honour the `Partial<ChapterProgress>` the signature already advertises.

**Consider also**: `BookViewer`'s double-call on the last page (`onPageChange(n)` then
`onPageChange(n, true)`) means two writes per completing page turn, the first of which clears the
flag the second sets. Merging fixes the data outcome, but a single call carrying the correct flag
would be cleaner and halve the writes. Treat that as a separate question — it is a change to
`BookViewer`'s contract with all its consumers.

**Do not fix while `StoryContext.tsx` is being edited for [#017](./017-story-chapter-reordering-complexity.md)** — same file.

## Verification note

Confirmed by reading all three files, not inferred from a failing test — no test currently covers
re-opening a completed chapter, which is why this survived. Any fix needs a regression test that
completes a chapter, re-opens it at page 1, and asserts `isComplete` is still `true`; it must be
proven to fail against the unfixed code.
