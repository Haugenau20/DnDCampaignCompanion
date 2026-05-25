# Bug #1152 — FirebaseContext dead code: `if (profile)` else branch at lines 289-291 is unreachable

## Title
FirebaseContext `if (profile)` else branch (lines 289-291) is unreachable dead code — `loadUserProfile` always returns a profile or throws

## Status
🔍 DISCOVERED

## Category
ARCHITECTURE

## Discovered In
`src/context/firebase/__tests__/FirebaseContext.behavioral.test.tsx`

## Affected File
`src/context/firebase/FirebaseContext.tsx`

## Description
In the `onAuthStateChanged` handler, after calling `loadUserProfile`, the code checks:

```tsx
const profile = await loadUserProfile(firebaseUser.uid);
setProfileLoading(false);

if (profile) {
  // Load groups and finalize auth
} else {
  console.warn(`No profile loaded for user ${firebaseUser.uid}, cannot load groups`);
  setAuthLoading(false);  // lines 290-291
}
```

The `else` branch at lines 290-291 is **unreachable dead code**. `loadUserProfile` is designed to:
1. Return a non-null `UserProfile` if found.
2. Retry up to `maxRetries` times if null is returned.
3. After exhausting retries, `throw new Error('Failed to load user profile after multiple attempts')`.

`loadUserProfile` **never returns `null`** without throwing. Therefore, when `await loadUserProfile(...)` resolves (rather than throws), `profile` is always truthy. The `else` branch can never execute.

### Impact
- The dead code creates a misleading impression that `loadUserProfile` can return a falsy value, making the code harder to reason about.
- Coverage tools flag this as an uncovered branch, increasing noise in coverage reports.
- The dead code could confuse future maintainers who might incorrectly assume `loadUserProfile` can silently return null.

## Reproduction
The dead code is confirmed by 100% statement coverage with 0% branch coverage for lines 290-291 — statements at those lines are never executed even though every other code path is covered.

## Expected vs Actual

**Expected:** Either (a) `loadUserProfile` can return null (in which case the guard is correct and tests should cover it), or (b) the guard is not needed and should be removed.

**Actual:** `loadUserProfile` cannot return null without throwing, making the `else` branch permanently unreachable.

## Recommended Fix
Remove the unreachable `else` branch and simplify the code:

```tsx
const profile = await loadUserProfile(firebaseUser.uid);
setProfileLoading(false);

// loadUserProfile always returns a profile or throws — no null check needed
setGroupsLoading(true);
await loadGroups(firebaseUser.uid, profile, firebaseUser);
setGroupsLoading(false);
setAuthLoading(false);
```

Alternatively, if there is a future requirement to allow `loadUserProfile` to return null, update it to do so and add test coverage for the null path.
