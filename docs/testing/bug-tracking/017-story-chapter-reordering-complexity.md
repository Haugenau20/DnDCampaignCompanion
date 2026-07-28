# Bug #017: Story Chapter Reordering Complexity Issues

**Status**: ✅ **FIXED 2026-07-28.** The fix described below as "attempted" has landed. The block was
resolved by explicit user authorisation to correct the one assertion that pinned the old mechanism —
see "Resolution", immediately below. The analysis in the rest of this document is preserved as
written, because the reasoning that identified the block is the most useful part of it.
**Priority**: Medium
**Category**: ARCHITECTURE
**Context**: StoryContext
**Discovery Date**: June 15, 2025
**Discovery Method**: Behavioral Testing

## Resolution — 2026-07-28

**Landed**, with the fix exactly as designed below: write and verify every chapter at its new
position first, then delete only ids not reused as another chapter's new position in the same batch.
Uses `setDocument`, never `createDocument` — the `// Do NOT switch this to createDocument` guards
from #1203 were honoured.

**The block, and how it was resolved.** `StoryContext.behavioral.test.tsx`'s
`'should handle complex chapter reordering'` asserted `expect(mockDeleteData).toHaveBeenCalled()`.
No correct implementation can satisfy that, and the proof is worth keeping:

> A reorder shifts a contiguous range and a chapter's id is derived from its order, so the affected
> range is a **closed permutation with no fixed points**. Moving `chapter-01` to order 3 rotates
> orders `{1,2,3} → {3,1,2}`, giving new ids `{chapter-03, chapter-01, chapter-02}` — **the same set
> as the old ids.** Every id is reused, so a reorder that writes before deleting has nothing left to
> delete. Asserting that a delete occurred can therefore only ever be satisfied by the
> delete-everything-first algorithm this bug exists to remove.

This is a distinct species from the other characterization tests catalogued in this project. The
others (#006's four, #005's one, #750's, #002's) assert the wrong **outcome** — their names state a
requirement their assertions deny. This one asserts the **mechanism**: nothing about it was false as
a description of the old algorithm, and it was still unsatisfiable by any correct one. *A test that
asserts how something is done, rather than what results, is a characterization test whether or not
its author intended one.*

**Authorised 2026-07-28** to replace it with an assertion on the outcome — the ids and orders
actually written — rather than to delete it. That is strictly stronger than what it replaced: the
old assertion never checked that chapters landed in the right places at all, and would not have
caught the atomicity defect. The new one would.

**Honest note on what proves what.** The corrected outcome assertion passes against *both*
implementations, since the old one also wrote the right ids on the happy path — so it is a better
specification but not evidence for this fix. The evidence is a separate regression test,
`'should not delete any chapter when a reorder write fails partway (bug #017)'`, which makes the
second `setDocument` reject and asserts nothing was deleted. Against the reverted fix it fails with
`Expected number of calls: 0, Received number of calls: 3` — all three chapters already gone at the
point of failure, which is the data loss this bug describes.

## Summary

**2026-07-28 update — the original diagnosis below is half wrong; read this before the rest of the
doc.** The 2026-07-27 audit (`docs/testing/phase4-audit-worksheet.md`, #017) established that the
headline claim — "complex data (`subChapters`, `summary`) is lost via a shallow spread" — is
**disproved**: `{...c}` in `updateChapter` carries nested data forward correctly, and
`StoryContext.bugs.test.tsx`'s "should handle complex multi-chapter reordering without data loss"
test actively asserts this and passes. The real, confirmed defect is narrower: `updateChapter`'s
order-change path deletes every affected chapter **before** creating any of the replacements, so a
partial failure of the create loop permanently loses chapters with no rollback. Its siblings
(`createChapter`, `deleteChapter`, `reorderChapters`) all create-and-verify the new position before
deleting the old one; `updateChapter` was the one place that didn't.

**A correct fix was designed, and it works** (see "Attempted Fix" below) — but it cannot land without
either an explicit decision to update one pre-existing test, or a different fix strategy, because the
only way to satisfy every constraint from the sibling functions and the bug report *and also* keep
the existing test suite 100% green does not exist for this specific operation. See "Why This Is
Blocked" for the proof.

## Bug Details

### Location
- **File**: `src/features/storytelling/chapters/context/StoryContext.tsx`
- **Lines**: 206-327 (`updateChapter` with reordering), 330-427 (`createChapter` with shifts), 430-503 (`deleteChapter` with shifts), 506-558 (`reorderChapters`)
- **Functions**: Complex reordering logic in updateChapter, createChapter insertion, deleteChapter shifting, reorderChapters

### Expected Behavior
```typescript
// EXPECTED: Atomic operations preserving all data
const reorderChapter = async (chapterId, newOrder) => {
  // Should preserve all chapter data including:
  // - Complex content (subChapters, summary, etc.)
  // - Metadata (creation dates, attribution)
  // - Relationships (references from other systems)
  // Should be atomic (all succeed or all fail)
  // Should handle errors gracefully with rollback
};
```

### Actual Behavior
```typescript
// ACTUAL: Multi-step process with data loss risks
const updateChapter = async (chapterId, updates) => {
  // 1. Delete affected chapters
  for (const chapter of affectedChapters) {
    await deleteData(chapter.id); // Risk: Data deleted before recreation
  }
  
  // 2. Create updated chapters
  for (const updatedChapter of updatedChapters) {
    await firebaseServices.document.setDocument('chapters', updatedChapter.id, updatedChapter);
    // Risk: Failure here leaves data in inconsistent state
  }
  
  // Issues:
  // - Non-atomic operations
  // - Complex data might be lost during recreation
  // - Poor error recovery
};
```

## Test Evidence

### Test Case: Complex Data Preservation
```typescript
// Test with complex chapter data
const complexChapterSet = [
  {
    id: 'chapter-01',
    title: 'Chapter 1',
    summary: 'Important summary 1',
    subChapters: [{ id: 'sub-1', title: 'Sub 1', content: 'Sub content' }],
    // ... other complex data
  }
];

// Move chapter 3 to position 1 (complex reordering)
await storyContext.updateChapter('chapter-03', { order: 1 });

// EXPECTED: All data preserved including subChapters and summaries
// ACTUAL: Risk of data loss during delete/recreate cycle
expect(mockFirebaseServices.document.setDocument).toHaveBeenCalledWith(
  'chapters',
  'chapter-02',
  expect.objectContaining({
    summary: 'Important summary 1', // BUG: Complex data might be lost
    subChapters: expect.any(Array), // BUG: SubChapters might be lost
  })
);
```

### Test Case: Error Recovery
```typescript
// Simulate Firebase failure during reordering
mockFirebaseServices.document.setDocument.mockRejectedValueOnce(new Error('Firebase write failed'));

// Try to update chapter order
await expect(storyContext.updateChapter('chapter-01', { order: 2 })).rejects.toThrow();

// EXPECTED: System should recover gracefully and not leave database in inconsistent state
// ACTUAL: May leave database in inconsistent state after partial operations
```

### Test Case: Concurrent Operation Handling
```typescript
// Multiple users trying to reorder chapters simultaneously
const user1Promise = storyContext.updateChapter('chapter-01', { order: 3 });
const user2Promise = storyContext.updateChapter('chapter-02', { order: 1 });

// EXPECTED: Operations should be serialized or properly handled
// ACTUAL: Potential for race conditions and data conflicts
```

## Root Cause Analysis

### Multi-Step Operation Design
```typescript
// Current reordering process involves multiple discrete operations:
// 1. Calculate which chapters are affected
// 2. Delete all affected chapters
// 3. Recreate all chapters with new IDs and orders
// 4. Refresh chapter data

// Problems:
// - Non-atomic: Failure at any step leaves inconsistent state
// - Data loss risk: Complex data might not be preserved
// - Race conditions: No locking during multi-step process
// - Error recovery: Limited ability to rollback partial operations
```

### Complex Data Handling
```typescript
// Chapter reordering recreates entire chapter objects
const updatedChapters = affectedChapters.map(c => ({
  ...c, // Spread operator may not preserve all nested data
  id: generateChapterId(newOrderMap.get(c.id)),
  order: newOrderMap.get(c.id),
  // Risk: Complex nested data (subChapters, etc.) might be lost
}));

// Issues:
// - Shallow vs deep copying concerns
// - Complex nested data preservation
// - Type safety during object recreation
```

## Impact Assessment

### Data Integrity (High Risk)
- **Data Loss**: Complex chapter data might be lost during reordering
- **Inconsistent State**: Failed operations leave database in inconsistent state
- **Race Conditions**: Concurrent operations can cause conflicts
- **Poor Recovery**: Limited ability to recover from partial failures

### User Experience Impact
- **Unreliable Operations**: Users may lose work during chapter reordering
- **Confusing Errors**: Poor error messages during complex operation failures
- **Performance**: Multi-step operations are slow and resource-intensive
- **Collaboration Issues**: Multiple users can interfere with each other

### System Reliability
- **Error Handling**: Poor recovery from partial operation failures
- **Scalability**: Complex operations don't scale well with large stories
- **Maintenance**: Complex reordering logic is difficult to maintain and debug
- **Testing**: Complex operations are difficult to test comprehensively

## Affected Operations

### Chapter Reordering (updateChapter)
```typescript
// Most complex operation with highest risk
// Involves:
// - Order change calculation
// - Multiple chapter deletion
// - Multiple chapter recreation
// - Attribution updates
// - Refresh operations
```

### Chapter Insertion (createChapter)
```typescript
// Moderate complexity when inserting into middle
// Involves:
// - Shifting existing chapters
// - Multiple ID changes
// - Preservation of existing data
```

### Chapter Deletion (deleteChapter)
```typescript
// Moderate complexity with shifting
// Involves:
// - Deleting target chapter
// - Shifting subsequent chapters
// - ID updates for shifted chapters
```

### Batch Reordering (reorderChapters)
```typescript
// High complexity for entire story reorganization
// Involves:
// - Analyzing all chapters
// - Determining optimal reordering strategy
// - Multiple delete/create cycles
```

## Story-Specific Implications

### Content Management Complexity
- **Large Stories**: Problems compound with more chapters
- **Rich Content**: Complex chapters with subChapters, summaries at higher risk
- **Collaborative Editing**: Multiple authors increase race condition risk
- **External References**: Other systems referencing chapters affected by ID changes

### Performance Implications
- **Database Load**: Multiple delete/create operations create high database load
- **User Experience**: Long-running operations with poor feedback
- **Resource Usage**: Memory intensive operations for large stories
- **Network Traffic**: Multiple round trips to Firebase

## Error Scenarios

### Partial Operation Failures
```typescript
// Scenario: Deletion succeeds but recreation fails
// 1. Delete old chapters ✓
// 2. Create new chapters ✗ (Firebase error)
// Result: Data lost, no rollback mechanism

// Scenario: Some chapters recreated, others fail
// 1. Delete chapters ✓
// 2. Create chapter A ✓
// 3. Create chapter B ✗ (Firebase error)
// 4. Create chapter C ? (not attempted)
// Result: Inconsistent state, partial data loss
```

### Concurrent Operation Conflicts
```typescript
// Scenario: Two users reordering simultaneously
// User 1: Move chapter 1 to position 3
// User 2: Move chapter 2 to position 1
// Result: Race condition, potential data loss or conflicts
```

### Data Preservation Failures
```typescript
// Scenario: Complex data lost during reordering
const chapterWithComplexData = {
  subChapters: [...], // Nested arrays
  customMetadata: {...}, // Custom fields
  relationships: [...] // References to other entities
};

// After reordering: Some complex data missing
// Cause: Incomplete object spreading or type issues
```

## 2026-07-28: Attempted Fix and Why It's Blocked

### The fix that was designed and verified correct

Replace the unconditional "delete all affected, then create all replacements" pair of loops with:

1. Write and verify **every** chapter at its new position first (`setDocument` + `getDocument`
   verify, matching the pattern in `createChapter`/`deleteChapter`/`reorderChapters`). Nothing is
   deleted while writes are still in flight, so if any `setDocument` or verification throws partway
   through, the function rejects **before any deletion happens** — every pre-reorder chapter still
   has a document, either its original one or the correct new one.
2. Only afterwards, delete old documents whose id was **not** reused as another chapter's new
   position in this same batch.

This was implemented, and confirmed by proof-by-revert: reverting only the production change made a
new regression test (call-order + partial-failure assertions) fail with
`expect(mockDeleteData).not.toHaveBeenCalled()` receiving actual delete calls for chapters that were
never successfully recreated — i.e. the new test does detect the original bug — and restoring the
fix made it pass again.

### Why a literal copy of the sibling pattern doesn't work here, and why step 2 is a near-total no-op

`createChapter`/`deleteChapter`/`reorderChapters` all process their per-chapter create-verify-delete
as a **chain**: each iteration's target id was vacated by the previous iteration (or is brand new),
and the chain never wraps back to its own start. `updateChapter`'s reorder is structurally different:
moving a chapter from order N to order M turns every chapter in the affected range `[min(N,M),
max(N,M)]` into a **closed permutation** of that same id range — every "old" id in the batch is also
some chapter's "new" id target, with **no fixed points** (verified directly against the code:
`affectedChapters = chapters.filter(c => c.order >= min && c.order <= max)`, and the shift logic
reassigns every one of those chapters to a different id; only the identical-order early-return path,
which is a separate branch, ever leaves an id unchanged).

This matters because a literal per-chapter "create new position, then immediately delete this
chapter's own old id" (mirroring the siblings exactly, interleaved) is **not safe** for a closed
permutation: the old id being vacated by one chapter's move is frequently the exact id another
chapter in the same batch is about to be written to. Simulated by hand on a 3-chapter rotation
(chapter-01→chapter-03, chapter-02→chapter-01, chapter-03→chapter-02): whichever chapter is
processed last will delete an old id that an earlier iteration in the *same batch* already wrote
fresh data into, destroying it. This is also true of doing all the deletes unconditionally in a
second pass without the "was this id reused" check — by the time that pass runs, every id has
already received its correct new content, so an unconditional delete-all-old-ids pass would wipe out
every chapter on **every successful reorder**, not just on failure. Neither variant is an acceptable
fix. The only difference a "was this id reused" check can make is to skip deletes that would corrupt
data just written in the same batch — and because the permutation has no fixed points, that check
skips **every** delete for a whole-range reorder. Deletion is not merely made safer here; it becomes
unnecessary, because overwriting via `setDocument` already relocates each chapter's content without
needing a delete step at all. (The all-chapters-captured-in-memory-before-any-Firestore-write
property of this function is precisely what makes this safe — equivalent to the temporary variable a
classic in-place cyclic array rotation needs.)

### The blocking test

`src/features/storytelling/chapters/context/__tests__/StoryContext.behavioral.test.tsx`, test
`'should handle complex chapter reordering'` (~line 870), reorders a 3-chapter set (a whole-range
rotation, per the above) and asserts:

```ts
expect(mockDeleteData).toHaveBeenCalled();
```

Under the fix above, `deleteData` is never called for this scenario (proven, not just observed —
see above), so this assertion fails: `Expected number of calls: >= 1, Received number of calls: 0`.
Confirmed by running `npx jest --testTimeout=15000 --maxWorkers=2 --testPathPattern="(Story|chapter|Chapter|Saga)"`
with the fix applied: exactly **one** test goes red across the whole suite (381 tests, 1 failed) —
this one. `docs/testing/methodology/testing-lessons-learned.md` (Session 4, June 15 2025) confirms
this test was written specifically to characterize the old multi-step delete/recreate cycle
("Multi-step operation: delete, recreate, reorder") — it documents the bug's own mechanism as if it
were the spec, rather than testing an outcome.

### Why this wasn't resolved unilaterally

No fix exists that is simultaneously (a) safe against partial-failure data loss — the actual defect
this bug is about — and (b) guarantees a `deleteData` call for a whole-range reorder, because (a)
mathematically forces zero deletes for that case. Editing that one assertion requires the
authorisation this task explicitly withheld ("If you hit a test asserting the current delete-first
ordering, do NOT edit it — report it and stop"), so the production change was reverted rather than
landed with a known regression. **Recommendation for the follow-up**: authorise updating that one
assertion (it should instead assert that `setDocument` was called for every affected chapter and
`refreshChapters` ran, dropping the `deleteData` expectation, or assert `mockDeleteData` was *not*
called for a whole-range rotation) — the assertion currently pins the exact bug this ticket is about.

## Recommended Resolution

### Architectural Improvements
1. **Atomic Operations**: Implement transaction-like behavior
2. **Data Preservation**: Ensure deep copying of complex data
3. **Error Recovery**: Implement rollback mechanisms
4. **Concurrent Handling**: Add locking or versioning

### Implementation Strategy
```typescript
// Improved reordering approach:
const reorderChaptersSafely = async (operations) => {
  // 1. Validate all operations first
  // 2. Create backup of current state
  // 3. Perform operations atomically
  // 4. Verify success before committing
  // 5. Rollback if any failures
};
```

### Technical Solutions
1. **Transaction Support**: Use Firebase transactions for atomic operations
2. **Optimistic Locking**: Implement version-based conflict resolution
3. **Data Validation**: Verify data integrity before and after operations
4. **Progress Tracking**: Better user feedback for long operations

## Testing Recommendations

### Comprehensive Error Testing
1. **Partial Failure Scenarios**: Test all possible failure points
2. **Data Preservation Testing**: Verify complex data survives reordering
3. **Concurrent Operation Testing**: Simulate multiple users
4. **Recovery Testing**: Test rollback and error recovery

### Performance Testing
1. **Large Story Testing**: Test with many chapters
2. **Complex Data Testing**: Test with rich chapter content
3. **Concurrent Load Testing**: Multiple simultaneous operations
4. **Resource Usage Monitoring**: Memory and network usage

## Priority Assessment

### Medium Priority Justification
- **Functional System**: Basic reordering works for simple cases
- **Edge Case Issues**: Problems mainly affect complex scenarios
- **Workarounds Available**: Users can avoid complex reordering
- **Low Frequency**: Most users don't frequently reorder chapters

### Risk Factors
- **Data Loss Potential**: High impact when failures occur
- **User Trust**: Failures can seriously damage user confidence
- **Debugging Difficulty**: Complex failures are hard to diagnose
- **Technical Debt**: Complex code increases maintenance burden

### When to Address
- **Before Production Scale**: Critical for multi-user environments
- **Architecture Refactoring**: Good candidate for major improvements
- **User Feedback**: If users report reordering issues
- **Performance Issues**: When operations become too slow