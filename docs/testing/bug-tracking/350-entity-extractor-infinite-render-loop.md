# Bug #350: EntityExtractor infinite render loop via unstable existingReferences default

**Status**: ✅ FIXED — Hoisted `EMPTY_REFERENCES: PotentialReference[] = []` as a module-level constant and changed the default prop from `existingReferences = []` to `existingReferences = EMPTY_REFERENCES`. This gives the default a stable identity across renders, breaking the infinite loop. 8 previously-skipped tests in `EntityExtractor.test.tsx` now pass. Fixed 2026-05-22.
**Priority**: High
**Category**: UI / DATA
**Context**: EntityExtractor component (`src/components/features/notes/EntityExtractor.tsx`)
**Discovery Date**: 2026-05-21
**Discovery Method**: Unit Testing (notes/rumors slice)

## Summary

`EntityExtractor` enters an infinite render loop when `referencesSearchComplete={true}` because the `existingReferences` prop defaults to a fresh `[]` literal on every render, which React's `useEffect` dependency comparison sees as a changed dependency, which re-runs the effect, which calls `setExtractedEntities(...)`, which re-renders, which creates a new `[]` default, which... loops forever.

In JSDOM/Jest the loop hits the `checkForNestedUpdates` guard but only after enough churn that test timeouts are exceeded (90+ seconds with no completion). In production, this likely manifests as runaway CPU usage and React DevTools showing constant re-renders whenever a parent does not memoize the `existingReferences` array.

## Location

- **File**: `src/components/features/notes/EntityExtractor.tsx`
- **Default prop**: line 38 — `existingReferences = []`
- **useEffect with bad dep**: lines 68–98 — `[noteId, getNoteById, existingReferences, referencesSearchComplete]`

## Expected Behavior

The effect should run when `existingReferences` *content* changes, not when its reference changes due to a default-value literal on each render.

## Actual Behavior

```
Warning: Maximum update depth exceeded. This can happen when a component
calls setState inside useEffect, but useEffect either doesn't have a
dependency array, or one of the dependencies changes on every render.

    at checkForNestedUpdates (react-dom.development.js)
    at dispatchSetState (react-dom.development.js)
    at loadAndFilterEntities (EntityExtractor.tsx:93)
    at EntityExtractor.tsx:97
```

Test with `referencesSearchComplete={true}` runs indefinitely; Jest times it out.

## Test Evidence

`src/components/features/notes/__tests__/EntityExtractor.test.tsx` has a `describe.skip(...)` block for the affected paths. Only the safe `referencesSearchComplete={false}` early-return paths can be exercised. Without the skip, the entire test file hangs.

## Impact

- **Functional**: Real user impact whenever a parent renders `<EntityExtractor>` without memoizing `existingReferences`. Likely runaway re-renders + degraded UI responsiveness.
- **Testing**: Roughly 60% of the component's logic is unreachable by unit tests. Extraction flow, entity filtering, error display under `referencesSearchComplete={true}` all blocked.

## Recommended Resolution

Hoist the default reference out of the props destructure so it has a stable identity:

```ts
const EMPTY_REFERENCES: PotentialReference[] = [];

const EntityExtractor: React.FC<EntityExtractorProps> = ({
  noteId,
  existingReferences = EMPTY_REFERENCES,  // stable reference
  ...
}) => { ... };
```

OR memoize at the call site (worse — callers shouldn't have to know).

After the fix, remove the `describe.skip` in `EntityExtractor.test.tsx` and the previously-hanging tests should pass.
