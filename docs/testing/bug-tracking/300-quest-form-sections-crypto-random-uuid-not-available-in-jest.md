# Bug #300: QuestFormSections ObjectivesSection uses crypto.randomUUID() — crashes in Jest/JSDOM

**Status**: 🔍 DISCOVERED  
**Category**: UI / TESTABILITY  
**Priority**: Medium  
**Affected File**: `src/components/features/quests/QuestFormSections.tsx`  
**Discovery Method**: Unit test (QuestFormSections.test.tsx)  
**Discovered**: 2026-05-20

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
