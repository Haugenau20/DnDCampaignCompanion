# Bug #1050 — NoteCard `getStatusBadgeClass` has unreachable "active" and default branches

## Title
NoteCard `getStatusBadgeClass` "active" and default branches are dead code — function only called when `note.status === "archived"`

## Status
🔍 DISCOVERED

## Category
ARCHITECTURE

## Discovered In
`src/components/features/notes/__tests__/NoteCard.test.tsx`

## Affected File
`src/components/features/notes/NoteCard.tsx` (lines 44–53)

## Description
`getStatusBadgeClass()` is a switch function with three branches:
- `case "active"` → returns `"status-active"` (line 47)
- `case "archived"` → returns `"status-archived"` (line 49)
- `default` → returns `""` (line 51)

However, the function is only ever called inside the JSX condition `{note.status === "archived" && (...)}` (line 76), meaning `getStatusBadgeClass()` is only invoked when the status is already `"archived"`. The `"active"` branch (line 47) and `default` branch (line 51) can never be reached at runtime. Coverage tools correctly flag lines 47 and 51 as uncovered.

## Reproduction
1. Run coverage on `NoteCard.tsx`.
2. Lines 47 and 51 are reported as uncovered regardless of test completeness.
3. There is no code path that calls `getStatusBadgeClass()` when `note.status !== "archived"`.

## Expected vs Actual
**Expected**: `getStatusBadgeClass` returns different class strings for different statuses, useful for rendering status-aware styles on any note.

**Actual**: The function is called only inside `{note.status === "archived" && ...}`, making two of its three branches permanently dead. The `"active"` case is never executed.

## Recommended Fix
Either:
1. Remove the `getStatusBadgeClass` function and inline `"status-archived"` directly in the JSX (KISS principle), or
2. Move the conditional rendering outside the `status === "archived"` guard and use `getStatusBadgeClass()` to drive both visibility and styling — making the "active" branch meaningful.
