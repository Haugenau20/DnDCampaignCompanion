# Bug #1153 — FirebaseContext `groupsLoading` not reset to false when `loadGroups` throws

## Title
FirebaseContext `groupsLoading` remains `true` when `loadGroups` throws, causing `loading` to be stuck at `true` after a group-load error

## Status
🔍 DISCOVERED

## Category
CONTEXT

## Discovered In
`src/context/firebase/__tests__/FirebaseContext.behavioral.test.tsx`

## Affected File
`src/context/firebase/FirebaseContext.tsx`

## Description
In the `onAuthStateChanged` handler, when an authenticated user's profile is loaded successfully, the code proceeds to load groups:

```tsx
if (profile) {
  setGroupsLoading(true);
  await loadGroups(firebaseUser.uid, profile, firebaseUser);  // may throw
  setGroupsLoading(false);  // only reached if loadGroups succeeds
  setAuthLoading(false);
}
```

If `loadGroups` throws (e.g., because `getGroups` rejects with a network error), the outer `catch` block at lines 293-296 handles the error:

```tsx
} catch (err) {
  console.error('Error in auth state change loading:', err);
  setError(err instanceof Error ? err.message : 'Failed to load user data');
  setAuthLoading(false);  // authLoading is reset
  // groupsLoading is NOT reset here!
}
```

`setGroupsLoading(false)` is **not called** in the catch block. As a result, `groupsLoading` remains `true`, and the computed `loading` value (`authLoading || profileLoading || groupsLoading`) stays `true` indefinitely, even though the error has been handled.

### Impact
- Any UI that depends on `loading === false` to display content or remove loading spinners will be permanently blocked.
- Users who experience a network error during login will see an infinite loading state even though the error has been set.
- The `error` state correctly reports the failure, but the `loading` state contradicts it, creating an inconsistent UI state.

## Reproduction
1. Mock `getGroups` to throw `new Error("Firestore getGroups failed")`.
2. Trigger the `onAuthStateChanged` callback with a valid user.
3. Mock `getUserProfile` to return a valid profile (so execution reaches `loadGroups`).
4. After the callback settles, observe `context.loading === true` (bug) and `context.error === "Firestore getGroups failed"` (correct).

## Expected vs Actual

**Expected:** After `loadGroups` throws, both `groupsLoading` and `authLoading` should be reset to `false`. `loading` should become `false` so the UI can display the error state.

**Actual:** `groupsLoading` remains `true` after the error. `loading` stays `true` indefinitely, preventing any error UI from rendering.

## Recommended Fix
Add `setGroupsLoading(false)` to the catch block:

```tsx
} catch (err) {
  console.error('Error in auth state change loading:', err);
  setError(err instanceof Error ? err.message : 'Failed to load user data');
  setGroupsLoading(false);  // <-- add this
  setAuthLoading(false);
}
```

Or wrap the group loading section in its own try/finally:

```tsx
setGroupsLoading(true);
try {
  await loadGroups(firebaseUser.uid, profile, firebaseUser);
} finally {
  setGroupsLoading(false);
}
setAuthLoading(false);
```
