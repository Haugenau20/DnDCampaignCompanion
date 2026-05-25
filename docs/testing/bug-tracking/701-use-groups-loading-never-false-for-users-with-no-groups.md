# Bug #701: useGroups loading state never becomes false for authenticated users with no groups

**Title**: useGroups loading state never becomes false for authenticated users who have no groups

**Status**: ✅ FIXED — Changed `groups.length > 0` to `Array.isArray(groups)` in the `fullyLoaded` useEffect in `useGroups.ts`. The fix aligns the condition with the code comment ("even if empty array"). Test un-skipped and passing.

**Category**: CONTEXT

**Discovered In**: `src/context/firebase/hooks/__tests__/useGroups.test.tsx`

**Affected File**: `src/context/firebase/hooks/useGroups.ts`

## Description

The `useGroups` hook derives a `loading` state from an internal `fullyLoaded` boolean. `fullyLoaded` is set to `true` by a `useEffect` when the following condition is met:

```ts
if (user && (groups.length > 0 || activeGroupUserProfile)) {
  setFullyLoaded(true);
}
```

The comment above the effect states: _"Consider fully loaded when we have a user and either: 1. We have groups loaded (even if empty array)"_ — but the code uses `groups.length > 0`, which is `false` for an empty array. This directly contradicts the comment.

**Result**: For a valid, authenticated user who belongs to **no groups**, `fullyLoaded` is never set to `true`, so `loading = !fullyLoaded` remains `true` indefinitely. Any component that renders conditional UI based on `loading` (e.g., skeleton loaders) will never exit the loading state for new users who haven't joined a group yet.

## Reproduction

1. Sign in as a new user who has no groups.
2. Observe `useGroups().loading` — it is always `true`.
3. Any UI that shows a spinner while `loading` is true will spin forever.

## Expected vs Actual

**Expected**: `loading` becomes `false` once Firebase has finished loading groups (even if the result is an empty array) and the user is authenticated.

**Actual**: `loading` stays `true` indefinitely when the user has no groups and no `activeGroupUserProfile`.

## Recommended Fix

Change the condition to use `groups !== undefined` (i.e., the groups array has been fetched, regardless of length), or add a separate flag for "groups fetch has completed". The simplest fix aligned with the comment:

```ts
// Before:
if (user && (groups.length > 0 || activeGroupUserProfile)) {

// After (matches the comment — "even if empty array"):
if (user && (Array.isArray(groups) || activeGroupUserProfile)) {
```

Or better yet, track load completion separately:

```ts
const [groupsLoaded, setGroupsLoaded] = useState(false);
// Set groupsLoaded = true after refreshGroups() resolves
```

**Severity**: High — new users with no groups will see permanent loading spinners. This is the primary onboarding path where users first join a group.
