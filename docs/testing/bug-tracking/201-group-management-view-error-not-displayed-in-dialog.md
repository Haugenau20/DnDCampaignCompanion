# Bug #201 - GroupManagementView: createGroup Error Rendered Twice at Once

**Status**: ✅ FIXED
**Category**: UI
**Priority**: Low
**Discovery Method**: Component unit testing
**Context**: `src/features/user-management/admin/components/GroupManagementView.tsx`

---

## Corrected Diagnosis (2026-07-28)

The original write-up below concluded the error was **invisible** after a `createGroup` failure.
That diagnosis was wrong. The 2026-07-27 audit (`docs/testing/phase4-audit-worksheet.md`)
established the actual defect: the error was rendered **twice, simultaneously** — once by an
always-present block in the main view (former lines ~72-78) and once inside the Create Group
dialog (former lines ~183-187), which stays mounted (`open={showCreateDialog}`) because
`handleCreateGroup`'s `catch` only calls `setError(...)`; it never closes the dialog. Both blocks
read the same `error` state, so once an error was set while the dialog was open, both rendered
identical text simultaneously.

A plain `screen.getByText(/.../)` throws a "multiple matches" error in that situation. Read quickly,
that throw reads as "not found," which is how the original investigation below concluded the error
was invisible rather than duplicated. It never inspected the thrown error message to see that it
was in fact a multiple-match error, not a not-found error.

## Fix

`error` state in this component has exactly one write site that sets a truthy value: the `catch`
block in `handleCreateGroup`. No other operation in this component (there is no wired-up delete, and
the "Edit Group" button has no handler) sets `error`, so the outer, always-present block was purely
redundant with the dialog's inline block and safe to remove outright — no separate "dialog error"
state was needed to preserve another code path.

Removed the outer `{error && ...}` block (and its now-unused `AlertCircle` import) from the main
view; kept the inline `{error && ...}` block inside the Create Group dialog form, since that is
where the user is looking when the failure happens.

## Regression Test

Added `'should show the createGroup error message exactly once (BUG #201 regression)'` in
`src/features/user-management/admin/components/__tests__/GroupManagementView.test.tsx`, asserting
`screen.getAllByText(/group creation failed/i)` has length 1.

Proven by reverting only the production change and re-running: the new test failed with
`Expected length: 1, Received length: 2` (two `<p class="... typography-error">Group creation
failed</p>` elements — one from each block), confirming the test actually exercises the duplication
bug rather than passing vacuously. Restoring the fix returned the suite to green
(20/20 in this file).

The pre-existing test `'should call createGroup and handle error gracefully'` deliberately does not
assert on the error text (see the comment on that test, corrected 2026-07-28 to reference this bug
instead of an unrelated closed entry, #200); it was left untouched.

---

## Original Write-Up (superseded by the corrected diagnosis above)

### Summary

When `createGroup()` throws an error, the `error` state is set and displayed inside the dialog form
via `{error && <Typography color="error">{error}</Typography>}`. However, in tests this error text
was not queryable via `screen.getByText()`, suggesting the error may not render visibly when the
Dialog mock renders dialog content or there is a state ordering issue.

### Evidence

Test that was supposed to verify error display:
```typescript
test('should show error when createGroup throws', async () => {
  mockCreateGroup.mockRejectedValue(new Error('Group creation failed'));
  // ... setup
  fireEvent.click(createBtn);
  await waitFor(() => {
    expect(screen.getByText(/group creation failed/i)).toBeInTheDocument();
  });
  // FAILED: Error text not found in DOM
});
```

The test was revised to only verify `createGroup` was called and the dialog stays open.

### Root Cause (as originally hypothesised — incorrect, see corrected diagnosis above)

The error `Typography` is rendered INSIDE the `<form>` element in the dialog. The Dialog mock
renders `children` normally, so this should be visible. The likely root cause is:

1. The `setError()` call happens in the `catch` block after `await createGroup(...)`
2. The error may be rendered in the outer component state (not inside dialog) when the dialog is
   still open
3. OR there is a race condition where React batches the `setCreatingGroup(false)` and `setError()`
   updates

### Impact

- Users who encounter a `createGroup` failure may or may not see the error message clearly
- The error state variable IS set correctly (verified by `createGroup` being called)
- The test was adapted to verify call behavior rather than error display

### Recommended Investigation

1. Manually test group creation failure in the browser to verify error message appears
2. Check if `setError()` triggers a visible re-render inside the dialog form
3. Verify no CSS/styling is hiding the error element
