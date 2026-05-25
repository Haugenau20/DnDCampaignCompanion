# Bug #1151 — NotePage infinite re-fetch loop when cross-campaign fetch throws an error

## Title
NotePage catch block (line 79) does not halt re-fetch loop after a Firestore error

## Status
🔍 DISCOVERED

## Category
UI / ARCHITECTURE

## Discovered In
`src/pages/notes/__tests__/NotePage.test.tsx`

## Affected File
`src/pages/notes/NotePage.tsx`

## Description
When a user navigates to a note that is not found in the React context, the cross-campaign fetch path triggers `DocumentService.getDocument(...)`. If this call **throws an error** (e.g., network failure, Firestore permission denied), the catch block at line 78-80 only logs the error:

```tsx
} catch (error) {
  console.error("Error fetching cross-campaign note:", error);
} finally {
  setIsLoadingCrossCampaignNote(false);
}
```

`crossCampaignNotFound` is never set to `true`. Once `isLoadingCrossCampaignNote` goes back to `false`, the `shouldFetchCrossCampaignNote` condition is `true` again, triggering another fetch — which throws again — creating an infinite re-fetch loop. The "Note Not Found" UI state is never reached.

### Root Cause
The catch block (lines 78-82) sets `isLoadingCrossCampaignNote(false)` via `finally` but does not set `crossCampaignNotFound(true)`. This allows the useEffect to immediately re-trigger on the next render cycle, causing continuous fetch attempts on every error.

## Reproduction
1. Navigate to `/notes/<id>` where `getNoteById(id)` returns `undefined`.
2. Firestore is unavailable or returns a permission error for `getDocument`.
3. The catch block executes, `isLoadingCrossCampaignNote` returns to `false`.
4. Observe the page stays on "Loading note..." indefinitely, with repeated failed Firestore calls.

## Expected vs Actual

**Expected:** After a fetch error, the page should stop retrying automatically and either display "Note Not Found" or show an error state. Continuous re-fetch on error is harmful (wasted network, Firestore quota consumption).

**Actual:** The page loops indefinitely in the loading state, repeatedly firing failed `getDocument` requests on every render.

## Recommended Fix
Set `crossCampaignNotFound(true)` in the catch block so the effect does not re-trigger after an error:

```tsx
} catch (error) {
  console.error("Error fetching cross-campaign note:", error);
  setCrossCampaignNotFound(true);  // <-- prevents infinite re-fetch on error
} finally {
  setIsLoadingCrossCampaignNote(false);
}
```

If retry-on-error behaviour is desired, implement explicit retry counting with a maximum rather than an implicit infinite retry via the effect dependency loop.
