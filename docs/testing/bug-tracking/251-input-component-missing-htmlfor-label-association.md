# Bug #251 - Input Component Missing `htmlFor` / `id` Label Association Prevents `getByLabelText` Testing

**Status**: ✅ FIXED  
**Category**: UI / TESTABILITY  
**Priority**: Low  
**Discovery Method**: Component unit testing  
**Context**: `src/core/components/Input.tsx`

---

## Summary

The `Input` component renders a `<label>` element but does not associate it with the input/textarea via `htmlFor` / `id`. This breaks accessibility (screen readers cannot associate the label with the form control) and prevents `getByLabelText()` queries in React Testing Library tests.

---

## Evidence

### Component Code (Input.tsx, lines ~110-116)

```tsx
{label && (
  <label className={clsx('mb-1.5 text-sm font-medium', 'form-label')}>
    {label}
  </label>
)}
```

The `<label>` has no `htmlFor` attribute, and the `<input>` / `<textarea>` has no matching `id`.

### Testing Impact

All NPC form component tests (`NPCForm.test.tsx`, `NPCEditForm.test.tsx`) that attempt `screen.getByLabelText(/name \*/i)` fail with:

```
TestingLibraryElementError: Unable to find a label with the text: /name \*/i
```

Tests were forced to use index-based `getAllByRole('textbox')[N]` queries, which are fragile and break if the form order changes.

---

## Expected Behaviour

The `Input` component should associate labels with form controls, per WCAG 1.3.1 (Info and Relationships):

```tsx
const inputId = props.id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

{label && (
  <label htmlFor={inputId} className={...}>
    {label}
  </label>
)}
<input id={inputId} ... />
```

---

## Impact

- **Accessibility**: HIGH — screen readers cannot associate label text with inputs
- **Testability**: MEDIUM — forces fragile index-based query patterns in tests
- **Affected Components**: All components using `Input` with a `label` prop (NPCForm, NPCEditForm, QuestForm, LocationForm, etc.)

---

## Scope

This is a systematic issue in the core Input component affecting all forms across the application. Fixing it in `Input.tsx` will resolve the accessibility issue and re-enable `getByLabelText()` testing in all affected test suites.

---

## Resolution (2026-07-28)

**What was actually wrong**: confirmed as described. `Input.tsx` (`src/core/components/Input.tsx`,
formerly `src/components/core/Input.tsx` before the restructuring) rendered `<label>{label}</label>`
with no `htmlFor`, and neither the `<input>` nor the `<textarea>` branch received an `id`. `id` was
folded into the generic `...props` spread, so an explicitly-passed `id` did land on the control, but
nothing ever pointed the label at it.

**What changed** (`src/core/components/Input.tsx`):
- `id` is now destructured out of `props` explicitly.
- `React.useId()` generates a stable id per instance.
- `inputId = label ? (id ?? generatedId) : id` — a caller-supplied `id` always wins; a generated id
  is only produced (and only applied to the control) when a `label` is actually rendered, so instances
  without a label keep their exact prior DOM output.
- `<label htmlFor={inputId}>` and `id={inputId}` were added to both the `<input>` and the `<textarea>`
  render branches, so both control types get the association.

**Regression tests added** (`src/core/components/__tests__/Input.test.tsx`, `label prop` describe
block): label↔input association via `getByLabelText`, label↔textarea association, explicit `id`
prop honoured and reflected in the label's `htmlFor`, and distinct generated ids across two
simultaneously-rendered labelled inputs.

**Proof by revert**: with the test file's new assertions in place, `src/core/components/Input.tsx`
was reverted to its pre-fix state (`git stash push -- src/core/components/Input.tsx`) and the suite
was re-run. Result: 4 failed / 26 passed, all four failures the new tests, each with
`TestingLibraryElementError: Found a label with the text of: <label>, however no form control was
found associated with that label.` The fix was then restored and the suite returned to 30/30 green.

**Verification**:
- `Input.test.tsx` alone: 30/30 passed.
- Wider blast radius (`(Form|Input|Profile|Dialog|Editor)` pattern, 24 suites): 714 passed, 1 skipped,
  0 failed.
- `npx tsc --noEmit`: clean.
- Full suite: 3975 passed / 7 failed / 3 skipped / 3985 total across 180 suites — the same 7
  ID-collision bug markers in `NPCContext.bugs.test.tsx`, `QuestContext.bugs.test.tsx`,
  `LocationContext.bugs.test.tsx`, `RumorContext.bugs.test.tsx` that make up the documented baseline
  (7 failed / 3 skipped / 3971 passed / 3981 total). The 4-test delta is exactly the new regression
  tests added here; nothing else moved.

**Nothing found that contradicts the original report** — the defect, its location (module path aside,
which was already known to be stale), and the WCAG 1.3.1 framing were all accurate.
