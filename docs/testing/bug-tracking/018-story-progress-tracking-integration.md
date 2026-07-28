# Bug #018: Story Progress Tracking Integration Issues

**Status**: ✅ FIXED  
**Priority**: Medium (confirmed worse in practice — see Resolution: this fully disabled the
"resume where you left off" feature, not just a data-consistency nit)  
**Category**: INTEGRATION  
**Context**: StoryContext  
**Discovery Date**: June 15, 2025  
**Discovery Method**: Behavioral Testing
**Fix Date**: July 27, 2026

## Summary

Story progress tracking integration has inconsistent behavior when no group/campaign context is available, silent failures in progress updates, and disconnected progress calculations that don't reflect actual stored progress data.

## Bug Details

### Location
- **File**: `src/context/StoryContext.tsx`
- **Lines**: 100-128 (updateChapterProgress), 131-148 (updateCurrentChapter), 151-168 (markChapterComplete), 171-179 (getReadingProgress)
- **Functions**: Progress tracking functions with context dependency issues

### Expected Behavior
```typescript
// EXPECTED: Robust progress tracking with proper error handling
const updateChapterProgress = async (chapterId: string, progress: Partial<ChapterProgress>) => {
  // Should handle missing context gracefully with user feedback
  // Should update stored progress and reflect in calculations
  // Should provide clear error messages for failures
  // Should maintain consistency between stored and calculated progress
};
```

### Actual Behavior
```typescript
// ACTUAL: Silent failures and inconsistent behavior
const updateChapterProgress = async (chapterId, progress) => {
  if (!hasRequiredContext) {
    console.warn('Cannot update chapter progress: no active group or campaign');
    return; // Silent failure - no user feedback
  }
  
  // Updates progress but calculations use different data source
  await updateProgressData('current-progress', updatedProgress);
  // getReadingProgress() uses defaultProgress, not actual stored progress
};
```

## Test Evidence

### Test Case: Progress Tracking Integration
```typescript
// Test basic progress tracking functionality
expect(storyContext.storyProgress).toEqual(
  expect.objectContaining({
    currentChapter: '',
    lastRead: expect.any(Date),
    chapterProgress: {}
  })
);

// EXPECTED: Progress should be properly initialized and functional
// ACTUAL: Progress exists but may not be connected to actual stored data
expect(typeof storyContext.updateChapterProgress).toBe('function');
expect(typeof storyContext.markChapterComplete).toBe('function');
expect(typeof storyContext.getReadingProgress).toBe('function');
```

### Test Case: Missing Context Handling
```typescript
// Test progress updates without proper context
mockUseChapterData.mockReturnValue({
  hasRequiredContext: false // No context available
});

await act(async () => {
  await storyContext.updateChapterProgress('chapter-01', { lastPosition: 50 });
});

// EXPECTED: Graceful handling with appropriate user feedback
// ACTUAL: Silent failure with only console warning
console.warn('BUG #018: Progress tracking may not handle missing context gracefully');
```

### Test Case: Progress Calculation Consistency
```typescript
// Test reading progress calculation
const initialProgress = storyContext.getReadingProgress();
expect(initialProgress).toBe(0);

// EXPECTED: Progress calculation should reflect stored progress data
// ACTUAL: Calculation uses static defaultProgress instead of stored data
```

## Root Cause Analysis

### Disconnected Data Sources
```typescript
// Progress updates use updateProgressData
await updateProgressData('current-progress', updatedProgress);

// But progress calculations use static defaultProgress
const getReadingProgress = useCallback(() => {
  const completedChapters = Object.values(defaultProgress.chapterProgress) // Uses static data!
    .filter(progress => progress.isComplete)
    .length;
  
  return chapters.length > 0 
    ? (completedChapters / chapters.length) * 100 
    : 0;
}, [chapters.length]);

// Problem: updateProgressData updates stored data, but getReadingProgress uses static data
```

### Context Dependency Issues
```typescript
// Silent failures when context missing
if (!hasRequiredContext) {
  console.warn('Cannot update chapter progress: no active group or campaign');
  return; // No user feedback, operation silently fails
}

// Issues:
// - No user-visible error messages
// - No alternative behavior when context unavailable
// - Inconsistent handling across different progress functions
```

### Progress State Management
```typescript
// Progress state not properly integrated with component state
const [isUpdating, setIsUpdating] = useState(false); // For chapter operations
// But no loading state for progress operations

// Progress data not exposed in context value:
const value: StoryContextValue = {
  storyProgress: defaultProgress, // Always returns static default
  // Missing: actual stored progress, progress loading state, progress errors
};
```

## Impact Assessment

### User Experience (Medium Impact)
- **Silent Failures**: Progress updates fail without user notification
- **Inconsistent Data**: Progress calculations don't reflect actual stored progress
- **Poor Feedback**: No loading states or error messages for progress operations
- **Confusion**: Users don't understand why progress tracking isn't working

### Data Integrity Issues
- **Disconnected Systems**: Progress storage and calculation use different data
- **Lost Progress**: Silent failures mean user progress may not be saved
- **Inconsistent State**: Displayed progress doesn't match stored progress
- **Context Dependency**: Progress tracking completely disabled without context

### Functional Impact
- **Reading Tracking**: Users can't track their reading progress effectively
- **Campaign Management**: No way to see story completion across group
- **User Engagement**: Poor progress feedback reduces user engagement
- **Data Loss**: Silent failures mean progress data may be lost

## Affected Operations

### Progress Update Operations
```typescript
// updateChapterProgress: Silent failure when no context
// updateCurrentChapter: Silent failure when no context  
// markChapterComplete: Silent failure when no context
// All use console.warn instead of user-visible errors
```

### Progress Calculation Operations
```typescript
// getReadingProgress: Uses static defaultProgress instead of stored data
// getChapterById: Works correctly but not connected to progress
// Progress display: Shows incorrect data due to disconnected calculations
```

### Context Management
```typescript
// hasRequiredContext: Properly detected but poorly handled
// Progress completely disabled when no group/campaign
// No graceful degradation or alternative behavior
```

## Story-Specific Implications

### Reading Experience
- **Progress Tracking**: Central feature for story/campaign reading
- **Collaboration**: Group members can't see shared reading progress
- **Engagement**: Poor progress tracking reduces user engagement with story content
- **Navigation**: Progress-based navigation features don't work properly

### Campaign Management
- **Story Completion**: No way to track campaign story progress
- **User Activity**: Can't see who's reading what chapters
- **Content Planning**: DMs can't see what content has been consumed
- **Pacing**: No data to inform story pacing decisions

## Integration Issues

### Data Flow Problems
```typescript
// Expected flow:
// 1. User reads chapter
// 2. Progress updated in storage
// 3. Progress calculation reflects stored data
// 4. UI shows accurate progress

// Actual flow:
// 1. User reads chapter
// 2. Progress update may silently fail
// 3. Progress calculation uses static default data
// 4. UI shows incorrect progress (always 0%)
```

### Context Coupling Issues
- **Hard Dependency**: Progress completely disabled without group/campaign context
- **No Graceful Degradation**: No alternative behavior when context unavailable
- **User Confusion**: No explanation why progress tracking doesn't work
- **Feature Discovery**: Users may not realize progress tracking exists

## Error Scenarios

### Missing Context Scenarios
```typescript
// Scenario: User not in group but reading shared story
// Progress updates silently fail
// User has no indication progress should be tracked
// Reading experience degraded with no explanation

// Scenario: Context lost during session
// Progress stops working mid-session
// No user notification of the problem
// User may lose progress data
```

### Data Consistency Scenarios
```typescript
// Scenario: Progress stored but not calculated
// updateChapterProgress saves data successfully
// getReadingProgress returns 0% due to static default
// UI shows no progress despite stored data
// User confusion about progress tracking
```

## Recommended Resolution

### Data Flow Integration
1. **Connect Calculations**: Make getReadingProgress use actual stored progress data
2. **State Management**: Properly integrate progress state with context state
3. **Data Synchronization**: Ensure stored and calculated progress stay in sync
4. **Loading States**: Add proper loading states for progress operations

### Error Handling Improvements
1. **User Feedback**: Replace console.warn with user-visible error messages
2. **Graceful Degradation**: Provide alternative behavior when context unavailable
3. **Error Recovery**: Allow users to retry failed progress operations
4. **Context Guidance**: Help users understand context requirements

### Technical Implementation
```typescript
// Improved progress integration:
const StoryProvider = () => {
  const [storedProgress, setStoredProgress] = useState<StoryProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState(false);
  
  const getReadingProgress = useCallback(() => {
    // Use actual stored progress instead of static default
    const progress = storedProgress || defaultProgress;
    const completedChapters = Object.values(progress.chapterProgress)
      .filter(p => p.isComplete).length;
    return chapters.length > 0 ? (completedChapters / chapters.length) * 100 : 0;
  }, [chapters.length, storedProgress]);
  
  const updateChapterProgress = async (chapterId, progressUpdate) => {
    if (!hasRequiredContext) {
      throw new Error('Progress tracking requires an active group and campaign');
    }
    
    setProgressLoading(true);
    try {
      const updatedProgress = { /* ... */ };
      await updateProgressData('current-progress', updatedProgress);
      setStoredProgress(updatedProgress); // Keep local state in sync
    } finally {
      setProgressLoading(false);
    }
  };
};
```

## Testing Recommendations

### Integration Testing
1. **Data Flow Testing**: Verify progress storage and calculation consistency
2. **Context Dependency Testing**: Test behavior with and without context
3. **Error Handling Testing**: Verify user feedback for all error conditions
4. **State Management Testing**: Test progress state throughout lifecycle

### User Experience Testing
1. **Progress Tracking Workflows**: End-to-end reading and progress scenarios
2. **Error Recovery Testing**: Test user recovery from error conditions
3. **Context Switching Testing**: Test behavior when context changes
4. **Performance Testing**: Test progress operations with large stories

## Priority Assessment

### Medium Priority Justification
- **Feature Completeness**: Progress tracking is a key story feature
- **User Experience**: Poor integration affects user engagement
- **Data Integrity**: Silent failures and inconsistent data are serious issues
- **Low Complexity**: Integration issues are fixable without major architecture changes

### Impact Considerations
- **User Confusion**: Silent failures create confusing user experience
- **Data Loss Risk**: Progress data may be lost due to silent failures
- **Feature Adoption**: Poor integration may prevent users from adopting progress tracking
- **Quality Perception**: Integration issues affect perception of overall system quality

### When to Address
- **User Experience Focus**: When improving story reading experience
- **Data Consistency**: When addressing data integrity issues
- **Feature Development**: Before adding more progress-related features
- **User Feedback**: If users report progress tracking issues

## Resolution

**Fixed**: July 27, 2026, in
`src/features/storytelling/chapters/context/StoryContext.tsx` (the file moved during the
feature-first restructuring; the `src/context/StoryContext.tsx` paths above are stale).

### Confirmed real-world impact (worse than "Medium" as originally framed)

Before fixing this, the consumer was checked directly: `src/pages/story/StoryPage.tsx:45` does
`} else if (storyProgress.currentChapter) {` to route a reader back to their last-read chapter when
they land on `/story` without a specific chapter ID in the URL. Because `storyProgress` was always
the frozen `defaultProgress` constant, `currentChapter` was permanently `''`, so this branch was
**always dead code** — every reader landed on chapter 1 regardless of reading history. This is a
complete feature outage ("resume where you left off" does not work at all), not a data-consistency
nit as the original priority framing suggested.

### Root cause

`defaultProgress` was a module-level constant, never mutated. `updateChapterProgress` and
`updateCurrentChapter` each built a new progress object by spreading `defaultProgress`, wrote it to
Firestore, and discarded the result — nothing held it in component state. `getReadingProgress` and
the exposed `storyProgress` value both read directly from the frozen constant, so they could never
reflect anything that had ever been written.

### Fix

Added a real, held-in-state progress value, and re-pointed every read/write path at it instead of
the frozen constant. `defaultProgress` is kept, unchanged, as the initial/fallback value for a
first-time reader who has no persisted `current-progress` document yet.

```typescript
// Real, held-in-state reading progress. `defaultProgress` remains only the
// initial/fallback value for a first-time reader who has no persisted document.
const [storedProgress, setStoredProgress] = useState<StoryProgress>(defaultProgress);
```

**Loading the persisted document.** `useFirebaseData<StoryProgress>({ collection: 'story-progress' })`
already fetches the whole collection on mount via its own internal effect (see
`src/shared/hooks/useFirebaseData.ts`) and exposes the result as `data`. No second fetch call was
needed — the story-progress instance of the hook was extended to also destructure `data` (aliased
`progressData`, defaulted to `[]` for the case where a test mock supplies the hook without a `data`
key at all), and a new effect finds the `current-progress` document in that array and seeds
`storedProgress` from it once it arrives:

```typescript
useEffect(() => {
  const persisted = progressData.find(
    (doc) => (doc as StoryProgress & { id?: string }).id === 'current-progress'
  );
  if (persisted) {
    setStoredProgress(persisted);
  }
}, [progressData]);
```

If no document exists yet (first-time reader), `progressData` stays empty, `persisted` is
`undefined`, and `setStoredProgress` is never called — `storedProgress` simply stays at its
`defaultProgress` initial value. This is the fallback the task specified, and it's also exactly what
`StoryContext.bugs.test.tsx`'s "should properly integrate progress tracking with chapter operations"
test asserts (`storyProgress` toEqual the all-default shape) — the mocked `useFirebaseData` in that
suite never supplies a `data` array, so the effect never fires, and the test's expectation continues
to hold after the fix.

**Avoiding a render loop.** The effect is keyed only on `[progressData]`, and `progressData` is a
stable reference from `useFirebaseData`'s own `useState` — it only changes identity when that hook's
internal fetch actually resolves (on mount, or on an auth-state-changed event), never as a side
effect of this component re-rendering. The effect body itself only calls `setStoredProgress` inside
the `if (persisted)` branch — it never writes state unconditionally on every render, which is what
would be required to create a loop. (In the test-mock scenario, where the mocked `useFirebaseData`
lacks a `data` key so the destructuring default `= []` produces a fresh empty-array literal on every
render, the effect *does* re-run every render because `[] !== []` by reference — but since
`persisted` is always `undefined` for an empty array, no state write ever happens, so this re-running
is inert, not a loop.)

**Accumulation instead of overwriting.** `updateChapterProgress` and `updateCurrentChapter` now
spread from `storedProgress` (the current state) instead of `defaultProgress` (the frozen constant),
and both call `setStoredProgress(updatedProgress)` after the Firestore write succeeds:

```typescript
const updatedProgress = {
  ...storedProgress,
  chapterProgress: {
    ...storedProgress.chapterProgress,
    [chapterId]: { chapterId, lastPosition, isComplete, lastRead: new Date() }
  }
};
await updateProgressData('current-progress', updatedProgress);
setStoredProgress(updatedProgress);
refreshChapters();
```

This was the core of the bug: previously, every call spread the same never-changing
`defaultProgress`, so a second call to `updateChapterProgress` for a different chapter would spread
`{}` again and produce a `chapterProgress` map containing only the newest chapter, discarding every
earlier entry. Spreading from `storedProgress` — which itself was just updated by the *previous* call
— means each new call's `chapterProgress`/`currentChapter` map is built on top of the last one, so
successive updates accumulate. This was verified by tracing the call sequence by hand: call 1
(`updateChapterProgress('chapter-01', ...)`) starts from `storedProgress = defaultProgress`
(`chapterProgress: {}`), writes and stores a result with `chapterProgress: { 'chapter-01': {...} }`;
call 2 (`updateChapterProgress('chapter-02', ...)`) now spreads *that* result, producing
`chapterProgress: { 'chapter-01': {...}, 'chapter-02': {...} }` — both entries present, where before
the fix call 2 would have produced only `{ 'chapter-02': {...} }`, silently dropping chapter-01's
recorded progress.

`getReadingProgress` and the context's exposed `storyProgress` were both re-pointed at
`storedProgress`:

```typescript
const getReadingProgress = useCallback(() => {
  const completedChapters = Object.values(storedProgress.chapterProgress)
    .filter(progress => progress.isComplete).length;
  return chapters.length > 0 ? (completedChapters / chapters.length) * 100 : 0;
}, [storedProgress, chapters.length]);
// ...
const value: StoryContextValue = {
  chapters,
  storyProgress: storedProgress,
  // ...
};
```

**Preserved unchanged, as instructed**: the `hasRequiredContext` guards and their `console.warn`
messages in `updateChapterProgress`/`updateCurrentChapter`/`markChapterComplete`, and the existing
`try/catch` error handling around each Firestore write. This doc's own "Recommended Resolution"
section (above) suggested replacing the warnings with thrown errors — that change was deliberately
**not** made; it's a behavioural change beyond the scope of this state-management fix and was
explicitly out of scope per the fix instructions.

### Is `StoryPage`'s resume-last-chapter branch reachable now?

Yes. Traced by hand rather than by a new test (no existing test in
`src/pages/story/__tests__/StoryPage.test.tsx` exercises this branch — that suite mocks `useStory`
wholesale, so it never touches the real `StoryContext` implementation this fix changes, and adding
one was outside this task's requested scope): `storyProgress.currentChapter` in `StoryPage.tsx:45`
now reads `storedProgress.currentChapter` through the real context, which `updateCurrentChapter`
sets on every chapter visit and which the new load-effect seeds from the persisted document on
mount. A returning reader who previously visited a chapter (setting `currentChapter` in Firestore)
will, on their next visit to `/story` with no `chapterId` in the URL, have `storedProgress` populated
from that persisted document before the navigation effect runs its `else if` chain, making the
`else if (storyProgress.currentChapter)` branch true and firing `navigateToPage` to their last
chapter. Previously this was structurally impossible, since `storyProgress` never varied.

### Verification

- `StoryContext.bugs.test.tsx` › `Bug #018` describe block: both tests continue to pass — the
  first asserts the all-default shape (still true, since the test's mocked `useFirebaseData` never
  supplies `data`, so the load-effect never overrides the default) and the second asserts graceful
  handling with no context (untouched guard logic).
- Full `StoryContext` test pattern: 33/33 passing.
- Full `storytelling` test pattern: 205/205 passing (up from 204/205 — the one fixed test belongs to
  bug #019, landed in the same pass; no #018-related test changed status either direction).
- `StoryPage` test pattern: 26/26 passing, unchanged before/after (no test in that suite currently
  exercises the resume branch either as reachable or dead, so this fix could not have flipped one).
- `npx tsc --noEmit`: clean, no new type errors.

### Not done — flagged, not silently dropped

No test in the current suite exercises "does a second `updateChapterProgress` call preserve the
first chapter's recorded progress" or "does `StoryPage` actually navigate via the resume branch."
Both are exactly the behaviors this fix restores, and both would be worth adding as regression
coverage in a follow-up — they were not added here because the task scope was the production fix
plus the specified verification commands, not new test authorship.