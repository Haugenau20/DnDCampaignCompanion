# Bug #1051 — NoteEditor `handleManualSave` re-throws error causing unhandled rejection from button click

## Title
NoteEditor `handleManualSave` re-throws errors (line 126), resulting in unhandled promise rejection when called from the Save button click handler

## Status
✅ FIXED

## Category
UI

## Discovered In
`src/features/collaboration/notes/components/__tests__/NoteEditor.test.tsx`
(pre-restructuring path was `src/components/features/notes/__tests__/NoteEditor.test.tsx` — that tree no longer exists)

## Affected File
`src/features/collaboration/notes/components/NoteEditor.tsx` (lines 107–130 pre-fix, specifically line 126;
pre-restructuring path was `src/components/features/notes/NoteEditor.tsx` — that tree no longer exists)

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

## Why option 1 was rejected

Option 1 looks like the simpler fix — swallow the error inside `handleManualSave` instead of
re-throwing — but it silently breaks a real dependency elsewhere in the codebase.

`handleManualSave` is exposed through `useImperativeHandle` as `saveCurrentContent`
(`NoteEditor.tsx`), which `NotePage.saveCurrentEditorContent`
(`src/pages/notes/NotePage.tsx`, ~line 93) calls on behalf of
`EntityExtractor.handleExtract` (`src/features/collaboration/entity-extraction/components/EntityExtractor.tsx`,
~lines 204–222). That call site **awaits** the promise and depends on the rejection:

```typescript
if (saveCurrentEditorContent) {
  setIsSavingBeforeExtraction(true);
  try {
    await saveCurrentEditorContent();
    console.log("EntityExtractor: Saved current editor content before extraction");
  } catch (saveError) {
    console.error("EntityExtractor: Failed to save content before extraction:", saveError);
    throw new Error("Failed to save your work before analysis. Please save manually and try again.");
  } finally {
    setIsSavingBeforeExtraction(false);
  }
}
```

If `handleManualSave` stopped re-throwing (option 1), this `catch` block would never fire.
AI entity extraction would silently proceed against unsaved editor content, and the user would
never see the "Failed to save your work before analysis" warning — a strictly worse outcome than
the original bug, and much harder to notice because nothing throws or logs at the point of failure.

This is a genuine, tested dependency, not a hypothetical one — `EntityExtractor.test.tsx` already
had `should show error message when saveCurrentEditorContent fails` and
`should not call extractWithOpenAI when save fails` (in the `error handling` describe block)
asserting on this exact abort path before this fix, both passing against a mocked
`saveCurrentEditorContent` that rejects.

**The fix actually applied is option 2**, implemented with a small twist: rather than inlining
`.catch()` at each of the two call sites, both the Save button's `onClick` and the Ctrl+S keydown
handler now go through a single new `triggerManualSave` wrapper in `NoteEditor.tsx`, which calls
`handleManualSave()` and attaches `.then()`/`.catch()` there. `handleManualSave` itself is
**unchanged** — it still re-throws on save failure — so the ref-exposed `saveCurrentContent`
contract that `EntityExtractor` relies on is untouched. A new regression test,
`should reject saveCurrentContent (via ref) when saveNote fails, so callers like EntityExtractor can abort`
(in the `imperative ref methods` describe block of `NoteEditor.test.tsx`), pins this down directly
so a future maintainer cannot "simplify" this by deleting the re-throw without a test going red.

A new `saveError` state in `NoteEditor` is set by `triggerManualSave`'s `.catch()`, rendered via
`getStatusIndicator()` (a new branch, ordered after the "Saving..." branch and before the
"unsaved changes" branch), and cleared both on the next successful save and whenever the user
edits the title or content.
