# Bug #1051 — NoteEditor `handleManualSave` re-throws error causing unhandled rejection from button click

## Title
NoteEditor `handleManualSave` re-throws errors (line 126), resulting in unhandled promise rejection when called from the Save button click handler

## Status
🔍 DISCOVERED

## Category
UI

## Discovered In
`src/components/features/notes/__tests__/NoteEditor.test.tsx`

## Affected File
`src/components/features/notes/NoteEditor.tsx` (lines 107–130, specifically line 126)

## Description
`handleManualSave` is an async function that catches save errors, logs them, and then re-throws on line 126:

```typescript
} catch (error) {
  console.error("Failed to manually save note:", error);
  throw error; // Re-throw so calling components can handle the error
} finally {
  setIsSaving(false);
}
```

This function is invoked by two callers:
1. The Save button's `onClick` handler — a fire-and-forget call (no `.catch()`) 
2. The `Ctrl+S` keyboard shortcut handler — also fire-and-forget
3. Via the `useImperativeHandle` ref (where a calling component could handle it)

When `saveNote` fails and `handleManualSave` re-throws, callers 1 and 2 produce an unhandled promise rejection because neither attaches error handling. The comment says "Re-throw so calling components can handle the error" but the actual callers in the same component don't.

## Reproduction
1. Mock `saveNote` to reject with an `Error('Save failed')`.
2. Click the Save button.
3. Observe unhandled promise rejection — the error propagates to the test runner as a test failure even when `console.error` is suppressed.

## Expected vs Actual
**Expected**: On save failure, `handleManualSave` either:
- Swallows the error internally and shows an error state to the user, or
- Re-throws and all call sites attach `.catch()` handlers

**Actual**: `handleManualSave` re-throws, but the button's `onClick` and Ctrl+S handler do not catch the error — producing an unhandled rejection. No error is shown to the user in the UI.

## Recommended Fix
Either:
1. Remove `throw error` from `handleManualSave` (lines 125–126) and instead set local error state to display to the user, or
2. Wrap the Save button's `onClick` call: `onClick={() => handleManualSave().catch(err => setError(err.message))}` and similarly for the keyboard shortcut handler.
