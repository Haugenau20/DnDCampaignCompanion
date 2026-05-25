# Bug #1150 — NotePage infinite re-fetch loop when same-campaign note not in context (timing case)

## Title
NotePage same-campaign timing branch (line 71) causes infinite re-fetch loop — loading spinner never resolves

## Status
✅ FIXED

## Category
UI / ARCHITECTURE

## Discovered In
`src/pages/notes/__tests__/NotePage.test.tsx`

## Affected File
`src/pages/notes/NotePage.tsx`

## Description
When a user navigates to a note that belongs to their **active campaign** but is not yet present in the React context (e.g., a timing/race condition between Firestore data arriving and context hydration), the cross-campaign fetch path is triggered.

The cross-campaign fetch call (`getDocument`) returns the note with a `campaignId` equal to `activeCampaignId`. The code at line 68-71 detects this and calls `setCrossCampaignNote(null)` — but since `crossCampaignNote` is already `null` (its initial value), this is a no-op state update.

Critically, `crossCampaignNotFound` is never set to `true` in this branch. The `useEffect` condition (`shouldFetchCrossCampaignNote`) evaluates to `true` again on the next render (once `isLoadingCrossCampaignNote` returns to `false`), triggering another fetch — creating an infinite re-fetch loop.

### Root Cause
Lines 68-71 in `NotePage.tsx`:
```tsx
} else if (note && note.campaignId === activeCampaignId) {
  // Note belongs to current campaign but wasn't found in context
  // This could happen due to timing issues - don't treat as cross-campaign
  setCrossCampaignNote(null);  // <-- no-op; crossCampaignNotFound never set
}
```

`setCrossCampaignNote(null)` is idempotent when `crossCampaignNote` is already `null`. Without setting `crossCampaignNotFound = true`, the effect re-triggers endlessly.

## Reproduction
1. Navigate to `/notes/<id>` where the note exists in Firestore with `campaignId === activeCampaignId`.
2. `getNoteById(id)` returns `undefined` (context not yet hydrated).
3. `DocumentService.getDocument(...)` resolves with a note whose `campaignId === activeCampaignId`.
4. Observe the page stays on "Loading note..." indefinitely (infinite `getDocument` calls).

## Expected vs Actual

**Expected:** After the Firestore lookup confirms the note belongs to the active campaign (even though it wasn't in context), the page should stop loading and either display the note or show "Note Not Found" (since `crossCampaignNote` stays null and `noteToDisplay` is null).

**Actual:** The page loops indefinitely in the loading state, continuously firing `getDocument` requests.

## Recommended Fix
Set `crossCampaignNotFound(true)` in the same-campaign timing branch so the effect does not re-trigger:

```tsx
} else if (note && note.campaignId === activeCampaignId) {
  // Note belongs to current campaign but wasn't found in context (timing issue)
  setCrossCampaignNote(null);
  setCrossCampaignNotFound(true);  // <-- prevents infinite re-fetch
}
```

Alternatively, unify the guard logic: any fetched note that should not be displayed as a cross-campaign note should set `crossCampaignNotFound = true`.
