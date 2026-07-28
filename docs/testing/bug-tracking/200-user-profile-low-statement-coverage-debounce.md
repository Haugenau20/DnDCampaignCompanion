# Bug #200 - UserProfile Username Debounce Validation Branch Untestable Without Timer Mocking

**Status**: 🚫 **CLOSED — no production defect** (2026-07-28)  
**Category**: UI / TESTABILITY  
**Priority**: Closed  
**Discovery Method**: Component unit testing coverage analysis  
**Context**: `src/features/user-management/profiles/components/UserProfile.tsx` lines 91-128  
*(the path recorded below, `src/components/features/auth/UserProfile.tsx`, predates the
feature-first restructuring and no longer exists)*

---

## Closing note — 2026-07-28

**Closed as testability-only. There is nothing to fix in `UserProfile.tsx`.**

The Phase 4 audit read the current code (`docs/testing/phase4-audit-worksheet.md`) and found a
textbook debounce: a `setTimeout(…, 500)` inside a `useEffect`, with `clearTimeout` returned as
cleanup, and correct guard clauses ahead of it. Correct, idiomatic, and doing what it should.

The report itself never claimed a functional defect — only that `userEvent` (real timers) and
`jest.useFakeTimers()` compose badly in this one test file, leaving lines uncovered. That is a
statement about the test, not the component, and this tracker is for production defects.

**If the coverage gap is worth closing later**, the fix belongs in the test:
`fireEvent.change` instead of `userEvent`, then `jest.advanceTimersByTime(500)`, then flush the
pending promise. Filing that as a bug against the component would be miscategorising it.

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
