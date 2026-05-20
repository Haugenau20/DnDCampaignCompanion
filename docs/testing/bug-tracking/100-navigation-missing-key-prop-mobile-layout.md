# Bug #100: Navigation Component — Missing React Key Prop on Mobile Nav Wrapper Divs

**Status**: 🔍 DISCOVERED  
**Category**: UI  
**Priority**: Low  
**Component**: Navigation.tsx  
**Discovered In**: Session — component unit tests (feature/unit-test-coverage)

## Description

The `Navigation` component renders navigation items in two layouts (desktop and mobile). In the mobile layout, each nav item is wrapped in an anonymous `<div>` without a `key` prop. This causes a React "Missing key prop" warning during rendering.

## Evidence

Observed during test execution of `Navigation.test.tsx`:

```
Warning: Each child in a list should have a unique "key" prop.
Check the render method of `Navigation`.
  at Navigation (src/components/layout/Navigation.tsx:60:11)
```

## Root Cause

In `Navigation.tsx`, the mobile navigation section (lines ~88-115) maps over `navItems` and renders:

```tsx
{navItems.map((item) => {
  return (
    <div>   {/* ← Missing key prop */}
      <Button ...>
        ...
      </Button>
    </div>
  );
})}
```

The desktop layout (lines ~61-84) correctly uses `key` on the `<Button>` element directly:

```tsx
return (
  <Button
    key={item.path}  // This would be the fix — but key is missing entirely
    ...
  >
```

Actually, looking at the code: neither the desktop nor mobile layout passes a `key` prop. The key must be on the outermost element returned from `map()`. The desktop layout's outermost element is `<Button>` and the mobile layout's is `<div>` — both are missing `key`.

## Impact

- Console warnings in development and test environments
- React may exhibit unexpected behavior when items are reordered
- Low production impact since the nav items are static, but it is incorrect React usage

## Fix

Add `key={item.path}` to the outermost element in both `navItems.map()` callbacks:

```tsx
// Desktop layout
return (
  <Button
    key={item.path}
    variant='ghost'
    ...
  >

// Mobile layout
return (
  <div key={item.path}>
    <Button ...>
```

## Tests

`src/components/layout/__tests__/Navigation.test.tsx` — warning appears in all tests that render `Navigation`.
