# Bug #700: useCampaigns.createCampaign name argument silently dropped in 3-arg calling convention when name is falsy

**Title**: useCampaigns createCampaign 3-arg convention: name argument silently coerced to empty string when falsy

**Status**: ✅ FIXED

**Category**: VALIDATION

**Discovered In**: `src/features/user-management/groups/hooks/__tests__/useCampaigns.test.tsx`

**Affected File**: `src/features/user-management/groups/hooks/useCampaigns.ts`

## Description

`useCampaigns.createCampaign` supports two calling conventions:
1. `createCampaign(name, description)` — uses `activeGroupId` from context
2. `createCampaign(groupId, name, description)` — uses provided groupId

In the 3-arg form, the implementation does:

```ts
groupId = nameOrGroupId;
name = description || '';       // ← 'description' param holds the actual name
description = optionalName;
```

The expression `description || ''` means: if the second argument (the campaign name) is an empty string, `undefined`, `null`, `0`, or any other falsy value, the `name` silently becomes `''`. This differs from the 2-arg form where `name = nameOrGroupId` with no coercion.

## Reproduction

```ts
// Calling the 3-arg convention with an empty name
createCampaign('g1', '', 'My description')
// → firebaseServices.campaign.createCampaign called with name = '' (expected: '')
// ← This specific case is "accidentally correct"

// But calling with undefined name:
createCampaign('g1', undefined as any, 'desc')
// → name = undefined || '' = '' ← no error, silently uses ''
// ← Expected: validation error or preservation of caller's intent
```

## Expected vs Actual

**Expected**: The function either validates that `name` is a non-empty string or preserves whatever value was passed (even `undefined`/`null`) so that downstream validation in `firebaseServices.campaign.createCampaign` can enforce the contract.

**Actual**: Falsy values are silently coerced to `''` via the `|| ''` operator. This means a caller can accidentally create an unnamed campaign with no error feedback.

## Recommended Fix

Replace the coercion with a direct assignment and let the service layer validate:

```ts
// Before:
name = description || '';

// After:
name = description ?? '';
// or ideally:
name = description as string;  // let service throw if empty
```

Alternatively, add an explicit guard:

```ts
if (!description) {
  throw new Error('Campaign name is required');
}
name = description;
```

**Severity**: Low — only affects 3-arg callers passing a falsy name (edge case in current usage). The 2-arg form is unaffected.

## Resolution (2026-07-28)

Applied the explicit-guard option from the recommended fix, not the `??` coercion: the
2nd positional arg (`description`, which holds the caller's `name` in the 3-arg form) is now
validated with `if (!description) { throw new Error('Campaign name is required'); }` before being
assigned to `name`. `??` was rejected because it would still let `''` (a fully valid JS "falsy but
provided" value) through as a persisted, empty campaign name — `CampaignService.createCampaign`
slugifies `name` into the Firestore document ID (`name.toLowerCase().trim().replace(...)`), so an
empty name produces an empty-string path segment and fails downstream with a confusing Firestore
error instead of a clear validation message at the call site. The throw front-loads that validation
with an explicit, actionable error.

**Proof by revert**: added two regression tests to
`src/features/user-management/groups/hooks/__tests__/useCampaigns.test.tsx` covering `createCampaign("g99", "", "Description")` and
`createCampaign("g99", undefined as any, "Description")` in the 3-arg form, both expecting a throw
of `"Campaign name is required"`. Reverting the production fix (restoring
`name = description || '';`) turned both new tests red — the two `createCampaign` calls resolved
successfully instead of throwing (`Received promise resolved instead of rejected`). Restoring the
fix returned the suite to 29/29 passing. Full `useCampaigns.test.tsx` suite: 29 passed both before
(pre-existing 27) and after (29 with the 2 new tests) the fix, confirming no regressions.
