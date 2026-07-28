# Bug #150 - Dialog Component Portal Ref Pattern Prevents JSDOM Testing

**Status**: ✅ FIXED  
**Category**: UI / TESTABILITY → **escalated to a real production bug**  
**Priority**: Medium  
**Discovery Method**: Component unit testing  
**Context**: `src/core/components/Dialog.tsx`

---

## Escalation and fix (Phase 4 triage, 2026-07-27)

This was originally filed as a JSDOM-only testability limitation — the assumption being that every
real consumer renders `<Dialog>` unconditionally in its own JSX (mounting once with `open=false`),
so the ref would already be populated by the time `open` ever becomes `true`. The Phase 4 audit
(`docs/testing/phase4-audit-worksheet.md`, `#150` section) checked all ~20 consumers and found one
exception: `src/features/user-management/auth/components/SessionTimeoutWarning.tsx` guards the
`<Dialog>` element itself behind `if (!showWarning) return null;` (line ~90), so `<Dialog>` does not
exist in the tree at all until `showWarning` first becomes `true` — at which point Dialog mounts
fresh with `open={true}` and a null portal ref, renders `null`, and nothing forces a further
re-render until some unrelated state changes (e.g. `timeRemaining` on the next 60-second interval
tick). Net effect in production: the session-expiry warning dialog could fail to appear for up to a
minute of its five-minute warning window. This made the bug a real, if narrow and transient,
production defect — not merely a testing artifact.

**Fix applied**: `portalRootRef` (a `useRef`) was replaced with `portalRoot` (a `useState`), per
Option 1 below. All other reads of the old ref (the escape-key handler's `dataset.open` toggling,
the early-return guard, and the `createPortal` call) were updated to read the state value instead,
and the escape-key effect's dependency array now includes `portalRoot` so it re-runs and attaches
correctly once the portal element becomes available. The portal-creation effect's dependency array
deliberately still only lists `[isNested]` — it must **not** depend on `portalRoot`, since that
effect is the one that sets `portalRoot`; depending on its own output would recreate the container
(and reset the state) every run, looping forever. The existing cleanup (removing the div from
`document.body`) is preserved, now paired with `setPortalRoot(null)`.

**Verification**: full Jest suite (`--testTimeout=15000 --maxWorkers=2`) produces identical results
with the old ref-based file and the new state-based file — `9 failed, 3 skipped, 3966 passed, 3978
total` in both cases — so the fix introduces no regressions. `npx tsc --noEmit` is clean and
`npm run build` succeeds (bundle grew by 35 bytes). `SessionTimeoutWarning.test.tsx`'s 18 tests
passed both before and after (they were already using state-driven timer advances that happen to
mask the bug in that suite), so this fix was verified by reasoning about the render sequence
(described above) rather than by a newly-red-then-green test — no test in the existing suite
exercised the exact "Dialog mounts fresh with `open=true`" first-render path the way production
`SessionTimeoutWarning` does.

**Secondary items resolved in the same pass**:
- `Dialog.test.tsx`'s header comment cited "Bug #100" (the unrelated Navigation key-prop bug) as the
  root cause; corrected to #150.
- Checked bugs #301 (`JoinGroupDialog`) and #302 (`LocationFormSections`/`QuestFormSections`),
  filed as consequences of this same ref pattern. Neither production component gates its own
  `<Dialog>` element behind the `open` boolean (both mount `<Dialog>` unconditionally with `open`
  starting `false`), so neither was a live production bug, and neither test suite's pass/fail status
  changed: `JoinGroupDialog.test.tsx`, `LocationFormSections.test.tsx`, and `QuestFormSections.test.tsx`
  all show the same `3 suites / 97 tests, all passing` with the ref-based file and the state-based
  file alike.

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

- `src/core/components/Dialog.tsx` — production fix applied (see "Escalation and fix" above)
- `src/shared/components/__tests__/DeleteConfirmationDialog.test.tsx` — workaround still in place
  (not required by this fix; left as-is, out of scope for this pass)

---

## Discovery Context

Discovered while writing unit tests for `src/components/shared/DeleteConfirmationDialog.tsx` as part of the component test coverage initiative (feature/unit-test-coverage branch).
