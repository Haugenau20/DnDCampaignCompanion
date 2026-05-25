# Bug #650 — UsageContext infinite refresh loop when fetchUsageStatus returns null

## Title
UsageContext enters an infinite refresh loop when the user is unauthenticated or fetchUsageStatus returns null

## Status
🔍 DISCOVERED

## Category
CONTEXT / PERFORMANCE

## Discovered In
`src/context/__tests__/behavioral/UsageContext.behavioral.test.tsx`

## Affected File
`src/context/UsageContext.tsx`

## Description

`UsageContext` tracks whether the initial usage load has occurred via a `ref`:

```tsx
const hasLoadedUsage = useRef(false);
```

Inside `refreshUsageStatus`, `hasLoadedUsage.current` is only set to `true` when `fetchUsageStatus()` resolves to a non-null value:

```tsx
const status = await entityService.fetchUsageStatus();
if (status) {
  setUsageStatus(status);
  setIsUsageLimitExceeded(status.limitExceeded);
  hasLoadedUsage.current = true;  // ← Only set when status is truthy
}
```

The `useEffect` that drives the initial load checks both `hasLoadedUsage.current` and `isLoadingUsage`:

```tsx
useEffect(() => {
  if (!hasLoadedUsage.current && !isLoadingUsage) {
    refreshUsageStatus();
  }
}, [refreshUsageStatus, isLoadingUsage]);
```

When `fetchUsageStatus()` returns `null` (e.g., unauthenticated user, no Firebase auth session), the cycle is:

1. Mount: `hasLoadedUsage.current = false`, `isLoadingUsage = false` → effect fires → `refreshUsageStatus()` called
2. `setIsLoadingUsage(true)` → `isLoadingUsage = true`
3. `fetchUsageStatus()` returns `null` → `hasLoadedUsage.current` stays `false`
4. `setIsLoadingUsage(false)` → `isLoadingUsage = false`
5. Effect dep (`isLoadingUsage`) changed → effect fires again → **infinite loop**

## Reproduction

```tsx
// In a test or component:
mockFetchUsageStatus.mockResolvedValue(null); // simulates unauthenticated user

renderHook(() => useUsageContext(), { wrapper: UsageProvider });

// fetchUsageStatus is called infinitely, never stabilising
```

## Expected Behavior
When `fetchUsageStatus()` returns `null` (user not authenticated), the provider should mark the load as complete and stop retrying. The component should stay in a stable state with `usageStatus: null` and `isLoadingUsage: false`.

## Actual Behavior
`refreshUsageStatus()` is called in a tight loop because `hasLoadedUsage.current` is never set to `true` after a null response. The `isLoadingUsage` toggle (true → false) re-triggers the effect on every cycle.

## Recommended Fix

Mark the load as complete regardless of whether a valid status was returned:

```tsx
const refreshUsageStatus = useCallback(async () => {
  setIsLoadingUsage(true);
  try {
    const status = await entityService.fetchUsageStatus();
    if (status) {
      setUsageStatus(status);
      setIsUsageLimitExceeded(status.limitExceeded);
    }
    // Always mark as loaded, even for null (unauthenticated) responses:
    hasLoadedUsage.current = true;
  } catch (error) {
    console.error('Error refreshing usage status:', error);
    hasLoadedUsage.current = true; // Prevent retry on error too
  } finally {
    setIsLoadingUsage(false);
  }
}, [entityService]);
```
