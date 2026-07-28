# Bug #1052 — NoteEditor `getLastSavedText` line 170 is dead code

## Title
NoteEditor `getLastSavedText` has unreachable guard on line 169-171 — function is only called when `!isUnsaved && !hasUnsavedChanges`

## Status
✅ FIXED (2026-07-28)

## Category
ARCHITECTURE

## Discovered In
`src/features/collaboration/notes/components/__tests__/NoteEditor.test.tsx` (current path)

## Affected File
`src/features/collaboration/notes/components/NoteEditor.tsx` (current path; the file moved under
`features/collaboration/notes/` during the feature-first restructuring; was lines 168-187,
specifically 169-171)

## Description
`getLastSavedText()` starts with a guard:

```typescript
const getLastSavedText = () => {
  if (note?.isUnsaved || hasUnsavedChanges) {
    return "Not saved";  // line 170 — UNREACHABLE
  }
  ...
};
```

However, `getLastSavedText()` is only ever called from `getStatusIndicator()`, and only in the else branch — after the guard `if (note?.isUnsaved || hasUnsavedChanges)` inside `getStatusIndicator` returns early with a different JSX block. This means when `getLastSavedText()` is invoked, `note?.isUnsaved` and `hasUnsavedChanges` are both guaranteed to be falsy, making line 170 permanently unreachable.

Coverage tools correctly flag line 170 as uncovered regardless of how many test scenarios are run.

## Reproduction
1. Run coverage on `NoteEditor.tsx`.
2. Line 170 (`return "Not saved"`) is always reported as uncovered.
3. No test can reach this line without restructuring the component.

## Expected vs Actual
**Expected**: `getLastSavedText` has a meaningful guard that prevents returning "Not saved" in additional scenarios.

**Actual**: The guard duplicates a condition already checked by the calling function (`getStatusIndicator`), making line 170 dead code.

## Recommended Fix
Remove lines 169–171 from `getLastSavedText` — the guard is redundant given the function's single call site. Alternatively, call `getLastSavedText()` from additional code paths where the guard would provide value.

## Resolution (2026-07-28)

Confirmed still live per the 2026-07-27 audit (`docs/testing/phase4-audit-worksheet.md`). Grepped
for `getLastSavedText` across `src/`; the only call site is still `getStatusIndicator`'s final
`return`, reached only after the identical `note?.isUnsaved || hasUnsavedChanges` guard earlier in
`getStatusIndicator` already tested false — so the duplicated guard inside `getLastSavedText` was
still dead.

Removed the redundant guard, leaving:

```typescript
const getLastSavedText = () => {
  if (!lastSaved) return "Never saved";
  ...
};
```

No test targets the literal `"Not saved"` string produced by the removed guard (the only
`"Not saved..."` assertion in the test file is for `'Not saved to server'`, which comes from the
separate, still-reachable branch in `getStatusIndicator`), so no test needed to change.

Verified via `npx jest --testPathPattern="NoteEditor"` (29 passed, 1 skipped [pre-existing, bug
#1051, unrelated], 0 failed) and `npx tsc --noEmit` (clean).
