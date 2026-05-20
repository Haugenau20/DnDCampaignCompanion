# Bug #200 - UserProfile Username Debounce Validation Branch Untestable Without Timer Mocking

**Status**: 🔍 DISCOVERED  
**Category**: UI / TESTABILITY  
**Priority**: Low  
**Discovery Method**: Component unit testing coverage analysis  
**Context**: `src/components/features/auth/UserProfile.tsx` lines 247-275

---

## Summary

The `checkUsername` async function inside the `useEffect` debounce block (lines 247-275) requires a 500ms fake-timer advance combined with `act()` wrapping to reliably execute in Jest/JSDOM. The combination of `userEvent.type()` interactions and `jest.useFakeTimers()` causes test timeouts because userEvent uses real timers internally. Standard `fireEvent.change()` combined with `jest.advanceTimersByTime()` can reach the debounce, but the async nature of the subsequent `validateUsername` call requires further coordination.

---

## Evidence

Coverage report shows lines 247-275 uncovered in the username debounce effect:
```
UserProfile.tsx | 78.09 | 69.54 | 80 | 81.19 | 98-101,112-114,157,239-242,247-275,280-281...
```

The username debounce block:
```typescript
const timer = setTimeout(() => {
  checkUsername();  // Lines ~247-275
}, 500);
```

---

## Impact

- Username validation UI feedback (spinner, available/unavailable indicator) within UserProfile's edit mode is not covered by tests
- Error paths in `validateUsername` inside UserProfile (distinct from RegistrationForm) are untested
- Statement coverage is 78% instead of the 85%+ target

---

## Root Cause

The userEvent v14 API uses real timers internally, making it incompatible with `jest.useFakeTimers()` in the same test. Switching to `fireEvent.change()` + `jest.advanceTimersByTime()` works for the timeout portion, but the subsequent `mockResolvedValue()` async await creates a second timing challenge.

---

## Recommended Fix

```typescript
// Option 1: Use jest.useFakeTimers({ doNotFake: ['Promise'] })
// Option 2: Use fireEvent.change + jest.runAllTimers + await Promise resolution
// Option 3: Restructure the effect to be more easily testable via extracted functions
```

---

## Workaround Applied

Tests cover username validation through RegistrationForm.tsx where the same debounce pattern works correctly. UserProfile's username edit path is tested at the submit level (save button → updateGroupUserProfile call).
