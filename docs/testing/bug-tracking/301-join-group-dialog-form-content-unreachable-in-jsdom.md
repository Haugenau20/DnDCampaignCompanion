# Bug #301: JoinGroupDialog form content unreachable in JSDOM — Dialog portal limitation

**Status**: 🚫 **CLOSED — no production defect** (2026-07-28)  
**Category**: UI / TESTABILITY  
**Priority**: Closed  
**Affected File**: `src/features/user-management/groups/components/JoinGroupDialog.tsx`
*(path below predates the feature-first restructuring)*  
**Discovery Method**: Unit test (JoinGroupDialog.test.tsx)  
**Discovered**: 2026-05-20  
**Extends**: Bug #150 (Dialog Portal Ref Pattern Prevents JSDOM Testing) — **now ✅ FIXED**

---

## Closing note — 2026-07-28

**Closed: this component never had the defect, and its parent bug is fixed anyway.**

The Phase 4 audit checked the whole file for an early return keyed on `open` and found none, then
checked all three real call sites — `Header.tsx:349`, `UserProfileButton.tsx:115-117`,
`ContextSwitcher.tsx:153-155`. Every one renders `<JoinGroupDialog open={someState} …/>`
unconditionally from its own first render, with `someState` starting `false`. That is the
"always mounted, toggle later" pattern, which never trips #150's mechanism: the Dialog mounts
closed, its effect populates the portal root, and only then does `open` flip.

The only place `open={true}` reaches a fresh mount is the test file itself
(`render(<JoinGroupDialog open={true} …/>)`). That is a test-authoring choice, not how the app
uses the component — so what the test found was a property of the test.

**And the underlying issue is gone regardless.** #150 was fixed in Phase 4: `Dialog`'s portal root
moved from a ref to state, so a Dialog mounted already-open now renders. Nothing here is blocked
any more, in production or in JSDOM.

---

## Summary

`JoinGroupDialog` renders its entire form content (invitation token input, username input, error messages, submit button) inside a `Dialog` component. The `Dialog` component uses a React portal pattern that renders outside the standard DOM tree, making the form content unreachable via `@testing-library/react` `screen` queries in JSDOM.

This is an extension of the pre-existing Bug #150 (Dialog portal ref testability issue) applied specifically to JoinGroupDialog.

---

## Evidence

When `JoinGroupDialog` is rendered with `open={true}`, the `screen` queries cannot find any form elements:

```typescript
render(<JoinGroupDialog open={true} onClose={jest.fn()} />);

// All of these return null:
screen.queryByText('Join a Group')           // null
screen.queryByLabelText('Invitation Token')  // null
screen.queryByRole('button', { name: /join/i })  // null
```

The Dialog renders into `document.body` via a portal, outside the `render()` container.

---

## Impact

- **Test Coverage**: `JoinGroupDialog.tsx` achieves only ~55.78% statement coverage
- The following code paths are untestable:
  - Form rendering (all Input and Button elements)
  - Error message display after invalid token/username
  - Submit handler (`handleSubmit`) 
  - Username validation display feedback
  - Token validity display feedback (check/X icons)
  - `joinGroupWithToken` call
  - `onSuccess` callback
  - `onClose` call from Cancel button
- Only side-effect behavior (URL param extraction, async token validation) can be tested

---

## What CAN Be Tested (Successfully)

- URL query parameter extraction (token, groupId) via `useLocation` mock
- `validateToken` called with correct token from URL params
- `validateUsername` NOT called before token verified
- Props accepted without errors (`open`, `onClose`, `onSuccess`)
- Closed state: dialog content absent when `open={false}`

---

## Root Cause

Same as Bug #150: The `Dialog` component attaches its content to `document.body` via a React portal. The RTL `render()` function attaches to a `<div>` in `document.body`, but the portal content appears elsewhere in `document.body`, outside the `render()` container's subtree.

---

## Recommended Fix

Same as Bug #150 resolution options:
1. Add `data-testid` attributes to key form elements and use `within(document.body)` in tests
2. Mock the Dialog component in tests to render children inline
3. Use a `container` option in `render()` that includes the portal target

The simplest workaround for tests is to mock Dialog to render children directly:
```typescript
jest.mock('../../../../components/core/Dialog', () => ({
  default: ({ children, open }: { children: React.ReactNode; open: boolean }) => 
    open ? <div>{children}</div> : null
}));
```

---

## Related

- Bug #150: Dialog Portal Ref Pattern Prevents JSDOM Testing (pre-existing)
- Affected NPC form dialogs: Bug #150
- Affected Location form dialogs: Bug #150
- Affected Quest form dialogs: Bug #150
