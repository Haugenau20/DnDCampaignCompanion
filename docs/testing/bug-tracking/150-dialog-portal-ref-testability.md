# Bug #150 - Dialog Component Portal Ref Pattern Prevents JSDOM Testing

**Status**: 🔍 DISCOVERED  
**Category**: UI / TESTABILITY  
**Priority**: Medium  
**Discovery Method**: Component unit testing  
**Context**: `src/components/core/Dialog.tsx`

---

## Summary

The `Dialog` component creates its portal root element inside a `useEffect` and stores the reference in a `useRef`. Because refs do not trigger re-renders, the conditional check `if (!open || !portalRootRef.current) return null` always returns `null` on the first render in JSDOM test environments. The portal content is never populated, making it impossible to query dialog contents in standard RTL tests without mocking the Dialog component.

---

## Evidence

### What Happens in Tests

```
// Dialog renders a portal root div, but it's always empty:
<body>
  <div />
  <div class="root-dialog-root" data-nested="false" data-open="true" id="dialog-..."/>
</body>
```

The portal root div exists but is empty — `createPortal` is never called because `portalRootRef.current` is null on first render, and refs don't trigger a second render.

### Root Cause

```tsx
// Dialog.tsx
const portalRootRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  // This runs AFTER first render
  const div = document.createElement('div');
  document.body.appendChild(div);
  portalRootRef.current = div;  // ← Ref update, no re-render triggered!
}, [isNested]);

// First render: portalRootRef.current === null → returns null
if (!open || !portalRootRef.current) return null;

// createPortal never called on first render
return createPortal(dialogContent, portalRootRef.current);
```

### Impact on Tests

`DeleteConfirmationDialog`, and any other component using `Dialog`, cannot be tested without mocking the `Dialog` component itself. This breaks the "test real code" principle — consumers of Dialog must mock the underlying Dialog to test their own behavior.

---

## Workarounds Used in Tests

Tests for `DeleteConfirmationDialog` mock the Dialog component to render inline:

```tsx
jest.mock('../../core/Dialog', () => {
  const MockDialog: React.FC<{
    open: boolean;
    onClose: () => void;
    title?: string;
    children?: React.ReactNode;
  }> = ({ open, onClose, title, children }) => {
    if (!open) return null;
    return (
      <div data-testid="mock-dialog">
        {title && <h3>{title}</h3>}
        <button onClick={onClose} aria-label="Close dialog">X</button>
        {children}
      </div>
    );
  };
  return MockDialog;
});
```

---

## Recommended Fix

Replace the ref-based portal root with `useState` so React triggers a re-render when the portal root becomes available:

```tsx
// Option 1: useState-based portal root (triggers re-render)
const [portalRoot, setPortalRoot] = useState<HTMLDivElement | null>(null);

useEffect(() => {
  const div = document.createElement('div');
  document.body.appendChild(div);
  setPortalRoot(div);  // ← State update → triggers re-render → createPortal called!
  return () => { document.body.removeChild(div); };
}, [isNested]);

if (!open || !portalRoot) return null;
return createPortal(dialogContent, portalRoot);
```

This change would make Dialog content testable in JSDOM without component mocking.

**Alternative Option 2**: Add a `data-testid` prop to Dialog that allows tests to use `{ hidden: true }` on queries, or expose a testing-specific render mode.

---

## Files Affected

- `src/components/core/Dialog.tsx` — production fix needed
- `src/components/shared/__tests__/DeleteConfirmationDialog.test.tsx` — workaround in place

---

## Discovery Context

Discovered while writing unit tests for `src/components/shared/DeleteConfirmationDialog.tsx` as part of the component test coverage initiative (feature/unit-test-coverage branch).
