# Bug #300: QuestFormSections ObjectivesSection uses crypto.randomUUID() — crashes in Jest/JSDOM

**Status**: ✅ FIXED  
**Category**: UI / TESTABILITY  
**Priority**: Medium  
**Affected File**: `src/components/features/quests/QuestFormSections.tsx`  
**Discovery Method**: Unit test (QuestFormSections.test.tsx)  
**Discovered**: 2026-05-20  
**Resolved**: 2026-07-26

## Resolution

Fixed at the root: a deterministic `crypto.randomUUID` polyfill was added to `src/setupTests.ts`
during the attribution-consolidation work, so the API is available to every suite. The counter-based
implementation returns v4-shaped ids that are stable across runs, which makes generated ids
assertable rather than random.

Production code was not changed — `crypto.randomUUID` is a legitimate browser API, and the gap was
in the test environment.

This same gap was also the sole cause of bugs [#013](./013-rumor-combine-function-logic.md) and
[#014](./014-quest-conversion-integration.md), whose marker tests silently never executed the logic
they were written to check. Worth remembering: a test that aborts on an environment error looks
identical, in the failure count, to a test that found a real defect.

---

## Summary

`ObjectivesSection.handleAddObjective()` calls `crypto.randomUUID()` to generate a unique ID for new objectives. This API is not available in Jest's JSDOM environment, causing the component to throw a `TypeError: crypto.randomUUID is not a function` whenever the "+" (add objective) button is clicked during tests.

---

## Evidence

When the "+" add-objective button is clicked in a test:

```
TypeError: crypto.randomUUID is not a function

    at ObjectivesSection.handleAddObjective (QuestFormSections.tsx:204:35)
```

Relevant source code:
```typescript
// QuestFormSections.tsx line ~204
const handleAddObjective = () => {
  handleInputChange('objectives', [
    ...(formData.objectives || []),
    { id: crypto.randomUUID(), description: '', completed: false }  // ← crashes in JSDOM
  ]);
};
```

---

## Impact

- **Test Coverage**: The `handleAddObjective` function path is untestable without polyfilling `crypto.randomUUID` in Jest setup
- **QuestFormSections.tsx statement coverage**: ~65.81% (versus ~85%+ achievable)
- **QuestFormSections.tsx function coverage**: ~62.06% 
- All coverage paths involving newly-added objectives are unreachable in tests
- **Production behavior**: Works correctly in browsers (which support `crypto.randomUUID`)

---

## Root Cause

- `crypto.randomUUID()` is a browser API introduced in modern browsers
- Jest uses JSDOM as its environment, which does not implement `crypto.randomUUID`
- The test environment lacks this API without explicit polyfilling

---

## Cross-Reference

- Related to Session 3 testing notes: "crypto.randomUUID dependency in Jest environment"
- Similar pattern referenced in `testing-lessons-learned.md` section on RumorContext complex functions

---

## Recommended Fix

**Option A (Production code fix)**: Replace `crypto.randomUUID()` with a simpler ID generator that works in all environments:
```typescript
const id = `objective-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

**Option B (Test infrastructure fix)**: Add a `crypto.randomUUID` polyfill to Jest setup:
```typescript
// jest.setup.ts or jest.config.js
global.crypto = {
  randomUUID: () => `${Math.random().toString(36).substr(2, 9)}`
} as any;
```

Option B is less invasive and should be preferred since it doesn't change production code.

---

## Notes

- The test file documents this limitation with a comment referencing this bug
- The "+" button renders correctly (button is present) — only the click handler crashes
- All other ObjectivesSection functionality (editing, removing, checkbox toggle) is fully testable
