# Bug #101: Card.test.tsx — Stale CSS Class Assertion

**Status**: ✅ FIXED  
**Category**: UI (Testing)  
**Priority**: Low  
**Component**: src/core/components/__tests__/Card.test.tsx  
**Discovered In**: Session — component unit tests (feature/unit-test-coverage)

## Description

The pre-existing `Card.test.tsx` file contains one test that asserts on the class name `default-card`:

```typescript
it('renders with theme-specific styling', () => {
  const { container } = renderCard({}, 'Themed card');
  expect(container.firstChild).toHaveClass('default-card');
});
```

This test **fails** because the Card component uses class name `card` (not `default-card`). The test was written against an outdated class naming convention where theme CSS classes were prefixed with `default-`.

## Evidence

Test failure output:
```
● Card Component › Simple Scenarios › renders with theme-specific styling

  expect(element).toHaveClass("default-card")

  Expected the element to have class:
    default-card
  Received:
    card
```

## Root Cause

The Card component applies the class `card` (not `default-card`):

```tsx
// Card.tsx line ~172
`card`,
```

A previous refactoring removed the `default-` prefix from theme CSS class names but did not update the test assertion.

## Impact

- 1 test failing in CI (if Card.test.tsx is run in isolation or alongside other tests)
- False signal in test output — a green test suite would hide this real discrepancy
- The production component works correctly; only the test is wrong

## Fix Options

**Option A** (correct, non-specification approach): Update the test to assert `card` class instead of `default-card`. This matches current implementation.

**Option B** (specification-based approach per project methodology): Keep the test as-is to document that the class naming convention has changed, and verify whether `default-card` was intended to be removed. If removal was intentional, fix the test. If it was accidental, restore the original class name in the component.

Per the project's behavioral testing methodology ("failing tests are bug markers"), this test correctly identifies a discrepancy that needs a decision.

## Recommendation

Since the theme CSS class system intentionally uses plain names like `card`, `button-primary` etc. (without the `default-` prefix), update the failing test assertion from `default-card` to `card`.

## Related

- Button.test.tsx was deleted and rewritten fresh (was asserting `default-button-primary`)
- Typography.test.tsx was deleted and rewritten fresh (similar stale class assertions)

## Resolution

Confirmed `Card.tsx:171` is correct: it applies the plain class `card` (no prefix), consistent with
every other class the component family emits (`card-header`, `card-content`, `card-footer`).
`Card.test.tsx` was the one file in this family that still encoded the retired `default-` prefix
convention — `Button.test.tsx` (header comment: "Fresh behavioral tests — no Tailwind class
assertions") and `Typography.test.tsx` (e.g. asserting unprefixed `typography-heading`) had already
been migrated off it. Since the production code is correct and the test alone was stale, the fix
went in the test, per the project's sanctioned exception for this exact situation.

Changed `src/core/components/__tests__/Card.test.tsx` line ~281, test `Card Component > Simple
Scenarios > renders with theme-specific styling`:

```diff
- expect(container.firstChild).toHaveClass('default-card');
+ expect(container.firstChild).toHaveClass('card');
```

This was the only `default-`-prefixed assertion in the file — no other stale assertions found.

**Verification**:
- `Card.test.tsx` alone: 1 failed / 178 passed / 179 total → 0 failed / 179 passed / 179 total
- `core/components` suite: 5 suites / 124 tests, all passing (unchanged pass count, failure removed)
- `npx tsc --noEmit`: clean, no errors
