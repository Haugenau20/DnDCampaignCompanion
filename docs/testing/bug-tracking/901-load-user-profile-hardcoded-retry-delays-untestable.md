# Bug #901 — FirebaseContext: loadUserProfile hardcoded 1-second retry delays make error paths untestable

## Title
`loadUserProfile` uses hardcoded 1-second `setTimeout` delays between retries, making the error/retry path untestable without real-time waiting

## Status
🔍 DISCOVERED

## Category
TESTABILITY

## Discovered In
`src/context/firebase/__tests__/FirebaseContext.behavioral.test.tsx`

## Affected File
`src/context/firebase/FirebaseContext.tsx` — `loadUserProfile` function (lines ~202–231)

## Description
`loadUserProfile` implements a retry loop (max 3 attempts) with hardcoded 1-second delays between retries:

```typescript
await new Promise(resolve => setTimeout(resolve, 1000));
retryCount++;
```

This pattern is used both when `getUserProfile` returns `null` (retry) and when it throws (retry up to `maxRetries - 1`). After exhausting all retries, the function throws `'Failed to load user profile after multiple attempts'`, which is caught by the outer `onAuthStateChanged` handler and surfaced as an error state.

**Problem:** The hardcoded delays cannot be controlled by `jest.useFakeTimers()` in the current test setup. The `Promise`-based `setTimeout` pattern does not flush reliably when called inside `async` functions wrapped in `act()`. Attempts to use `jest.runAllTimers()` after initiating the callback do not advance the timers through all iterations of the `while` loop because each `await` checkpoint suspends execution at a microtask boundary that is not synchronised with the timer flush.

As a result, tests that verify the error path after retry exhaustion time out or never see the error state set.

## Reproduction
```typescript
// Expect: after all retries fail, error state is set
jest.useFakeTimers();
mockGetUserProfile.mockResolvedValue(null); // always null → triggers retries

renderHook(() => useFirebaseContext(), { wrapper });
act(() => { capturedAuthCallback!(fakeUser); });

await act(async () => { jest.runAllTimers(); }); // does NOT advance through all retries

// result.current.error is still null — error path never observed
```

## Expected vs Actual
**Expected:** Tests can verify that when `getUserProfile` consistently fails, the error state is surfaced after the retry loop completes.

**Actual:** The retry loop delays cannot be controlled in the Jest environment, making these code paths effectively untestable without waiting 3+ real seconds per test.

## Recommended Fix
Accept an optional `retryDelayMs` parameter in `loadUserProfile` (defaulting to `1000` in production):

```typescript
const loadUserProfile = async (userId: string, retryDelayMs = 1000) => {
  // ...
  await new Promise(resolve => setTimeout(resolve, retryDelayMs));
  // ...
};
```

In tests, the `FirebaseProvider` could accept a `testOverrides` prop, or the delay could be injected via a module-level constant that tests can override. Alternatively, use `jest.useFakeTimers({ legacyFakeTimers: false })` (modern fake timers) and `jest.runAllTimersAsync()` which better handles `Promise`-based async timers.
