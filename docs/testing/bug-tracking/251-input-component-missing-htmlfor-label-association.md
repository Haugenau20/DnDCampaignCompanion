# Bug #251 - Input Component Missing `htmlFor` / `id` Label Association Prevents `getByLabelText` Testing

**Status**: 🔍 DISCOVERED  
**Category**: UI / TESTABILITY  
**Priority**: Low  
**Discovery Method**: Component unit testing  
**Context**: `src/components/core/Input.tsx`

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
