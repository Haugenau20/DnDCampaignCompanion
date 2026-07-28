# Bug #1000 — setTheme catch block is unreachable dead code

**Title**: `setTheme` catch block (ThemeContext lines 188-194) is unreachable dead code

**Status**: ✅ FIXED (2026-07-28)

**Category**: ARCHITECTURE

**Discovered In**: `src/core/themes/__tests__/ThemeContext.test.tsx` (current path)

**Affected File**: `src/core/themes/ThemeContext.tsx` (current path; the file moved under `core/`
during the feature-first restructuring)

## Description

The `setTheme` function wraps `setCurrentTheme(themes[themeName] || defaultTheme)` in a try/catch block (lines 188-194). The `catch` handler calls `console.error` and then `setCurrentTheme(defaultTheme)`.

The `setCurrentTheme` setter is the state-setter returned by React's `useState`. React state setters never throw — they are guaranteed to be synchronous, side-effect-free function calls that enqueue a state update. The `themes[themeName]` lookup also cannot throw; it returns `undefined` for unknown keys (no exception). The `||` fallback to `defaultTheme` is therefore the correct safeguard for the invalid-key case, but the surrounding `try/catch` provides no additional safety.

As a result, lines 192-193 (`console.error(...)` and the fallback `setCurrentTheme(defaultTheme)` inside the `catch`) are unreachable under any realistic runtime condition. Code coverage confirms these lines are never exercised.

## Reproduction

Run coverage on `ThemeContext.tsx`:
```
npx jest --coverage --collectCoverageFrom="src/themes/ThemeContext.tsx" --testPathPattern="ThemeContext"
```
Lines 192-193 are reported as uncovered.

## Expected vs Actual

**Expected**: Every line of production code is reachable and serves a purpose.

**Actual**: Lines 192-193 are dead code. The `try/catch` around `setCurrentTheme` can never catch an exception because `useState` setters do not throw.

## Recommended Fix

Remove the try/catch entirely. The existing runtime fallback (`themes[themeName] || defaultTheme`) is sufficient to handle unknown theme names:

```typescript
const setTheme = (themeName: ThemeName) => {
  setCurrentTheme(themes[themeName] || defaultTheme);
};
```

If defensive error-catching is desired for future extensibility, add a code comment explaining the intent, but accept that branch coverage on a dead catch block will never reach 100%.

## Resolution (2026-07-28)

Confirmed still live per the 2026-07-27 audit (`docs/testing/phase4-audit-worksheet.md`). Read the
current `setTheme` (then lines 188-195): `setCurrentTheme` is the `useState` setter and cannot
throw, and `themes[themeName] || defaultTheme` already handles an unknown key without raising.
Grepped for `setTheme` across `src/`; every call site passes a `ThemeName`, and the one test that
deliberately exercises an invalid key (`'setTheme with an invalid theme name falls back to
defaultTheme'`) asserts on the `||` fallback's result, not on the catch block itself.

Removed the try/catch, keeping only the fallback:

```typescript
const setTheme = (themeName: ThemeName) => {
  setCurrentTheme(themes[themeName] || defaultTheme);
};
```

Note: a separate, unrelated try/catch in the same file (`applyThemeToDOM`, guarding
`localStorage.setItem`) is genuinely reachable — it has its own dedicated tests — and was left
untouched.

Verified via `npx jest --testPathPattern="ThemeContext"` (23 passed, 0 failed) and
`npx tsc --noEmit` (clean).
