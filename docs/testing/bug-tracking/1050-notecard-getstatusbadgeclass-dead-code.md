# Bug #1050 — NoteCard `getStatusBadgeClass` has unreachable "active" and default branches

## Title
NoteCard `getStatusBadgeClass` "active" and default branches are dead code — function only called when `note.status === "archived"`

## Status
✅ FIXED (2026-07-28)

## Category
ARCHITECTURE

## Discovered In
`src/features/collaboration/notes/components/__tests__/NoteCard.test.tsx` (current path)

## Affected File
`src/features/collaboration/notes/components/NoteCard.tsx` (current path; the file moved under
`features/collaboration/notes/` during the feature-first restructuring; was lines 44-53, 76-77)

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

## Resolution (2026-07-28)

Confirmed still live per the 2026-07-27 audit (`docs/testing/phase4-audit-worksheet.md`). Grepped
for `getStatusBadgeClass` across `src/`; the only production call site is still the JSX at
`{note.status === "archived" && (... ${getStatusBadgeClass()} ...)}`, so the `"active"` and
`default` arms remained unreachable in current code.

Applied option 1 (KISS, per the task instruction): removed the `getStatusBadgeClass` function
entirely and inlined the literal `status-archived` class at the call site:

```tsx
{note.status === "archived" && (
  <span className="text-xs px-2 py-0.5 rounded status-archived">
    Archived
  </span>
)}
```

Existing tests (`'should render Archived badge element with badge class for archived notes'` and
`'should render no badge for notes with unknown status'`) assert on rendered output, not on the
removed function directly, so both still pass unchanged.

Verified via `npx jest --testPathPattern="NoteCard"` (13 passed, 0 failed) and `npx tsc --noEmit`
(clean).
