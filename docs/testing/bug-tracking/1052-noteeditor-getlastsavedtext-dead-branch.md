# Bug #1052 — NoteEditor `getLastSavedText` line 170 is dead code

## Title
NoteEditor `getLastSavedText` has unreachable guard on line 169-171 — function is only called when `!isUnsaved && !hasUnsavedChanges`

## Status
🔍 DISCOVERED

## Category
ARCHITECTURE

## Discovered In
`src/components/features/notes/__tests__/NoteEditor.test.tsx`

## Affected File
`src/components/features/notes/NoteEditor.tsx` (lines 168–187, specifically lines 169–171)

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
