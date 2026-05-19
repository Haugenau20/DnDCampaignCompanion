# Bug #050 - useNoteData: Unreachable Catch Block in getNoteCountForCampaign

## Status
🔍 DISCOVERED

## Category
VALIDATION / TESTABILITY

## Discovered By
Unit testing (hooks slice) - specification-based testing session

## File
`src/hooks/useNoteData.ts` - lines 114-117

## Description

`getNoteCountForCampaign` contains a defensive catch block that is unreachable in practice because `getNotesForCampaign` — which it calls internally — already catches all errors and returns an empty array `[]` instead of throwing.

## Code

```typescript
// useNoteData.ts lines 110-118
const getNoteCountForCampaign = useCallback(async (campaignId: string): Promise<number> => {
  try {
    const campaignNotes = await getNotesForCampaign(campaignId);
    return campaignNotes.length;
  } catch (err) {
    // ← This block is UNREACHABLE: getNotesForCampaign never throws
    console.error(`Error counting notes for campaign ${campaignId}:`, err);
    return 0;
  }
}, [getNotesForCampaign]);
```

```typescript
// getNotesForCampaign (lines 83-103) swallows all errors:
const getNotesForCampaign = useCallback(async (campaignId: string): Promise<Note[]> => {
  try {
    // ...fetch and filter logic
    return campaignNotes;
  } catch (err) {
    console.error(`Error fetching notes for campaign ${campaignId}:`, err);
    return [];  // ← Always returns [], never throws
  }
}, [user?.uid, activeGroupId, documentService]);
```

## Impact

- **Code Quality**: Dead code reduces clarity and creates false sense of error handling
- **Testing**: Lines 115-116 cannot be covered by unit tests
- **Testability**: 3.34% of `useNoteData.ts` statements are permanently uncovered

## Root Cause

`getNotesForCampaign` has a broad `try/catch` that returns `[]` on any error. Since `getNoteCountForCampaign` delegates entirely to `getNotesForCampaign`, the outer catch can never be triggered unless `getNotesForCampaign` itself is changed to throw.

## Failing Test

No failing test - this is a **testability bug** (dead code). The 100% branch coverage target cannot be achieved for `getNoteCountForCampaign` without modifying production code.

## Evidence

Coverage report shows `useNoteData.ts` lines 115-116 as permanently uncovered:
```
useNoteData.ts  |   96.66 |      100 |     100 |   96.36 | 115-116
```

## Recommended Fix

Either:
1. Remove the catch block from `getNoteCountForCampaign` since `getNotesForCampaign` already handles errors (preferred - simplifies code)
2. Make `getNotesForCampaign` throw on error so the outer catch is meaningful

```typescript
// Option 1: Simplified version
const getNoteCountForCampaign = useCallback(async (campaignId: string): Promise<number> => {
  const campaignNotes = await getNotesForCampaign(campaignId);
  return campaignNotes.length;
}, [getNotesForCampaign]);
```

## Priority

Low - No functional impact, only code quality and coverage concern.
