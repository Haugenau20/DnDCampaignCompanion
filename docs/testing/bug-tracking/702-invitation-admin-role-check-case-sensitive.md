# Bug #702: useInvitations admin role check is case-sensitive while useGroups.isAdmin is case-insensitive

**Title**: useInvitations.generateRegistrationToken uses case-sensitive role check, inconsistent with useGroups.isAdmin

**Status**: 🔍 DISCOVERED

**Category**: VALIDATION

**Discovered In**: `src/context/firebase/hooks/__tests__/useInvitations.test.tsx`

**Affected File**: `src/context/firebase/hooks/useInvitations.ts`

## Description

Two hooks check whether the current user has admin privileges, but they use different comparison strategies:

`useInvitations.ts` (line 26):
```ts
if (!activeGroupUserProfile || activeGroupUserProfile.role !== 'admin') {
  throw new Error('Only admins can generate registration tokens');
}
```

`useGroups.ts` (line 38):
```ts
return activeGroupUserProfile.role?.toLowerCase() === 'admin';
```

The `useGroups` version normalises the role to lowercase before comparing, so `'Admin'`, `'ADMIN'`, and `'admin'` all pass. The `useInvitations` version uses strict equality — `'Admin'` or `'ADMIN'` would be rejected as non-admin.

If the Firestore database stores role values in mixed case (e.g., due to an earlier bug or manual data entry), `useInvitations.generateRegistrationToken` will incorrectly block a legitimate admin user from generating tokens.

## Reproduction

1. Set `activeGroupUserProfile.role = 'Admin'` (capital A).
2. Call `useInvitations().generateRegistrationToken()`.
3. Observe: throws "Only admins can generate registration tokens".
4. Meanwhile, `useGroups().isAdmin` returns `true` for the same profile.

## Expected vs Actual

**Expected**: Both hooks use the same normalised comparison — an admin is an admin regardless of the case stored in Firestore.

**Actual**: `useInvitations` rejects uppercase/mixed-case role values while `useGroups.isAdmin` accepts them.

## Recommended Fix

Apply the same case-insensitive comparison in `useInvitations`:

```ts
// Before:
if (!activeGroupUserProfile || activeGroupUserProfile.role !== 'admin') {

// After:
if (!activeGroupUserProfile || activeGroupUserProfile.role?.toLowerCase() !== 'admin') {
```

**Severity**: Low — only affects environments where role values are stored in non-lowercase, which may not occur in practice given current code paths. However, the inconsistency is a latent correctness hazard.
