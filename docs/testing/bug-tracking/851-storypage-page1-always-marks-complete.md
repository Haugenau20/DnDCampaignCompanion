# Bug #851 — StoryPage page 1 always marks chapter as complete

## Title
StoryPage `handlePageChange` marks chapter complete whenever page === 1, regardless of user intent

## Status
✅ FIXED (2026-07-28)

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

## Resolution (2026-07-28)

Applied `isComplete: !!isComplete` — the first candidate above, not the `page === totalPages`
variant. This was not a guess between two live options; reading `BookViewer.tsx`
(`src/features/storytelling/stories/components/BookViewer.tsx`, lines 74-91) resolves the ambiguity
directly:

```ts
const handlePageChange = useCallback((newPage: number) => {
  if (newPage >= 1 && newPage <= totalPages) {
    setCurrentPage(newPage);
    onPageChange?.(newPage);
    // Mark as complete if we're on the last page
    const isComplete = newPage === totalPages;
    if (isComplete) {
      onPageChange?.(newPage, true);
    }
  } else if (newPage > totalPages && hasNextChapter) {
    // Mark current chapter as complete before moving to next
    onPageChange?.(totalPages, true);
    onNextChapter?.();
  } else if (newPage < 1 && hasPreviousChapter) {
    onPreviousChapter?.();
  }
}, [...]);
```

`totalPages` is BookViewer's own internal state (`useState`, derived from paginating `content`) and
is never passed up to `StoryPage` — there is no prop that would let `StoryPage` compute
`page === totalPages` itself. BookViewer already performs that comparison internally and signals the
result through the second `onPageChange` argument: it calls `onPageChange(newPage)` unconditionally,
then *additionally* calls `onPageChange(newPage, true)` when `newPage` is the last page, and calls
`onPageChange(totalPages, true)` right before advancing to the next chapter. So `isComplete` arriving
at `StoryPage.handlePageChange` is already the authoritative "reader finished this chapter" signal —
`page === 1` was never a stand-in for a real condition StoryPage needed to compute; it was simply
wrong. `page === totalPages` isn't implementable in `StoryPage` (it doesn't have `totalPages`) and
isn't needed there either, since BookViewer already did that comparison and reports the outcome.

**Fix applied** (`src/pages/story/StoryPage.tsx`, `handlePageChange`):
```ts
updateChapterProgress(currentChapter.id, {
  lastPosition: page,
  isComplete: !!isComplete
});
```

**Regression test**: `src/pages/story/__tests__/StoryPage.test.tsx`, "reading progress tracking"
describe block. The BookViewer mock previously only exercised `onPageChange(2)` (no `isComplete`
argument), which never covered the `page === 1` branch of the bug. Added two cases:
- `onPageChange(1)` (no `isComplete` arg — the initial-load / Home-key / back-navigation shape) must
  now yield `isComplete: false`.
- `onPageChange(3, true)` (BookViewer's own explicit complete signal) must still yield
  `isComplete: true`, so the fix doesn't just always report `false`.

**Proof by revert**: reverted only the production line (`git checkout --
src/pages/story/StoryPage.tsx`), re-ran
`npx jest --testTimeout=10000 --maxWorkers=1 --testPathPattern="StoryPage"`. The new
"does NOT mark the chapter complete on page 1 when isComplete is not signaled" test failed:

```
- Expected
+ Received

  "chapter-01",
  Object {
-   "isComplete": false,
+   "isComplete": true,
    "lastPosition": 1,
  },
```

27 passed / 1 failed / 28 total with the bug present. Restored the fix; re-ran the same command:
28 passed / 28 total.
