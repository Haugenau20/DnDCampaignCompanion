# Bug #900 — FirebaseContext: authLoading never set to false on authenticated success path

## Title
FirebaseContext `authLoading` never set to `false` after successful profile + group load for authenticated users

## Status
✅ FIXED — Added `setAuthLoading(false)` after `setGroupsLoading(false)` in the authenticated success path of `FirebaseContext.tsx`. Test un-skipped and passing.

## Category
CONTEXT

## Discovered In
`src/context/firebase/__tests__/FirebaseContext.behavioral.test.tsx`

## Affected File
`src/context/firebase/FirebaseContext.tsx`

## Description
The `FirebaseProvider` maintains an `authLoading` state variable (starts `true`). The computed `loading` value is derived as:

```typescript
const loading = authLoading || profileLoading || groupsLoading;
```

When a user signs in, the `onAuthStateChanged` callback:
1. Sets `profileLoading = true`, awaits `loadUserProfile`, sets `profileLoading = false`
2. If a profile is returned, sets `groupsLoading = true`, awaits `loadGroups`, sets `groupsLoading = false`

However, `setAuthLoading(false)` is **never called** in the happy path (when both profile and groups load successfully). As a result, `authLoading` remains `true` indefinitely after a successful login, causing `loading` to stay `true` for the entire lifetime of the authenticated session.

The only code paths that call `setAuthLoading(false)` are:
- The unauthenticated branch (`else` block — user signs out)
- The `catch` block (error path)
- The `else` branch inside the profile check (`console.warn('No profile loaded...')`)

The primary happy path — profile loads, groups load — never resets `authLoading`.

## Reproduction
```typescript
// After a successful sign-in with a valid profile and groups:
const { result } = renderHook(() => useFirebaseContext(), { wrapper });

await act(async () => {
  await authCallback(fakeUser); // triggers profile + groups loading
});

// loading stays true indefinitely
console.log(result.current.loading); // true — should be false
```

## Expected vs Actual
**Expected:** `loading` becomes `false` after `loadUserProfile` and `loadGroups` complete successfully.

**Actual:** `loading` remains `true` indefinitely because `authLoading` is never set to `false` in the success path.

## Recommended Fix
Add `setAuthLoading(false)` after the successful `loadGroups` call in the `onAuthStateChanged` handler:

```typescript
if (profile) {
  setGroupsLoading(true);
  await loadGroups(firebaseUser.uid, profile, firebaseUser);
  setGroupsLoading(false);
  setAuthLoading(false); // ← ADD THIS
} else {
  console.warn(...);
  setAuthLoading(false);
}
```
