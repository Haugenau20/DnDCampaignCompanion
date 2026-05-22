# Bug #800 — NotePage infinite re-fetch loop when note does not exist

## Title
NotePage infinite re-fetch loop when note ID is valid but note is not found in Firestore

## Status
✅ FIXED — Added `crossCampaignNotFound: boolean` state (default `false`). When `getDocument` resolves to `null`, the new `else` branch calls `setCrossCampaignNotFound(true)`. The `shouldFetchCrossCampaignNote` guard now includes `&& !crossCampaignNotFound`, and `crossCampaignNotFound` is added to the `useEffect` dependency array. This prevents re-fetch after a null result; the "Note Not Found" UI renders correctly. 2 previously-skipped tests in `NotePage.test.tsx` now pass. Fixed 2026-05-22.

## Category
UI / ARCHITECTURE

## Discovered In
`src/pages/notes/__tests__/NotePage.test.tsx`

## Affected File
`src/pages/notes/NotePage.tsx`

## Description
When a user navigates to `/notes/<id>` for a note that:
1. Is not found in the current campaign context (`getNoteById` returns `undefined`), **and**
2. Also does not exist in Firestore (`documentService.getDocument` returns `null`)

the page enters an infinite re-fetch loop and never reaches the "Note Not Found" UI state.

### Root Cause
The `useEffect` that fetches cross-campaign notes has `isLoadingCrossCampaignNote` in its dependency array (line 80). The condition that triggers a fetch (`shouldFetchCrossCampaignNote`) requires `!isLoadingCrossCampaignNote` to be truthy.

When `getDocument` resolves to `null`, neither branch of the `if/else if` inside `fetchCrossCampaignNote` executes (because `note` is falsy), so `crossCampaignNote` remains `null`. The `finally` block sets `isLoadingCrossCampaignNote` to `false`.

This state change triggers the effect again. All conditions in `shouldFetchCrossCampaignNote` are still truthy (`crossCampaignNote` is still `null`, `!isLoadingCrossCampaignNote` is true again), so the fetch fires again — infinitely.

## Reproduction
1. Navigate to `/notes/nonexistent-id` while logged in with an active group and campaign.
2. `getNoteById("nonexistent-id")` returns `undefined`.
3. `DocumentService.getDocument(...)` resolves to `null`.
4. Observe the page stays on "Loading note..." indefinitely (infinite network requests in the background).

## Expected vs Actual

**Expected:** After the Firestore lookup returns `null`, the page should display the "Note Not Found" UI.

**Actual:** The page loops indefinitely in the loading state, continuously firing `getDocument` requests.

## Recommended Fix
Add a "not found" sentinel to state so the effect does not re-trigger after a failed lookup. For example:

```tsx
const [crossCampaignNotFound, setCrossCampaignNotFound] = useState(false);

// In shouldFetchCrossCampaignNote, add:
// && !crossCampaignNotFound

// In fetchCrossCampaignNote, when note is null:
// setCrossCampaignNotFound(true);
```

Alternatively, remove `isLoadingCrossCampaignNote` from the effect's dependency array and use a `useRef` to track in-flight status, preventing re-triggering on loading state changes.
