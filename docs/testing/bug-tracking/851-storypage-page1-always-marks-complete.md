# Bug #851 — StoryPage page 1 always marks chapter as complete

## Title
StoryPage `handlePageChange` marks chapter complete whenever page === 1, regardless of user intent

## Status
🔍 DISCOVERED

## Category
DATA

## Discovered In
`src/pages/story/__tests__/StoryPage.test.tsx` — "reading progress tracking" describe block

## Affected File
`src/pages/story/StoryPage.tsx` (line 88)

## Description
The `handlePageChange` handler reads:

```ts
updateChapterProgress(currentChapter.id, {
  lastPosition: page,
  isComplete: isComplete || page === 1
});
```

The condition `page === 1` means that any time a reader navigates to page 1 of a chapter — including opening a chapter for the first time — `isComplete` is set to `true`. This is almost certainly unintended: page 1 is the *start* of a chapter, not the end.

A chapter should only be marked complete when the reader reaches the last page or when the calling component passes `isComplete = true`.

## Reproduction
1. Navigate to a story chapter.
2. The `BookViewer` fires `onPageChange(1)` on initial load.
3. `updateChapterProgress` is called with `isComplete: true` — the chapter is immediately marked read before the user has read anything.

## Expected vs Actual
**Expected**: `isComplete` is true only when explicitly passed as true (reader finished the chapter) or when `page` equals the last page.

**Actual**: `isComplete: isComplete || page === 1` — chapter is marked complete on every page 1 event (initial load or back-navigation to start).

## Recommended Fix
Remove the `|| page === 1` fallback. The correct condition should be:

```ts
isComplete: !!isComplete
```

Or, if chapter length is known, compare against total pages:

```ts
isComplete: isComplete || page === totalPages
```
