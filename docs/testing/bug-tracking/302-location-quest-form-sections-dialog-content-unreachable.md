# Bug #302: LocationFormSections and QuestFormSections dialog content unreachable in JSDOM

**Status**: 🔍 DISCOVERED  
**Category**: UI / TESTABILITY  
**Priority**: Low  
**Affected Files**: 
  - `src/components/features/locations/LocationFormSections.tsx`
  - `src/components/features/quests/QuestFormSections.tsx`
**Discovery Method**: Unit tests (LocationFormSections.test.tsx, QuestFormSections.test.tsx)  
**Discovered**: 2026-05-20  
**Extends**: Bug #150 (Dialog Portal Ref Pattern Prevents JSDOM Testing)

---

## Summary

`RelatedQuestsSection`, `RelatedNPCsSection` (in both LocationFormSections and QuestFormSections) render selection dialogs using the `Dialog` component. The dialog content (quest/NPC selection buttons inside the dialog) is unreachable in JSDOM tests due to the portal rendering pattern (Bug #150).

---

## Impact

**LocationFormSections.tsx**:
- Statement coverage: ~77.38% (target: 85%)
- Lines 175-181, 232-248, 316, 326-342 uncovered (dialog interior content)

**QuestFormSections.tsx**:
- Statement coverage: ~65.81% (target: 85%)
- Lines 90, 101-128 uncovered (RelatedNPCsSection dialog interior)
- Also affected by Bug #300 (crypto.randomUUID in ObjectivesSection)

---

## What is Untestable Due to This Bug

- Quest/NPC selection buttons inside dialogs
- Toggle behavior when a quest/NPC is clicked in the dialog list
- "Done" button inside dialogs
- Confirming that `setSelectedQuests`/`setSelectedNPCs` is called with correct updated Set values after dialog interaction

---

## What CAN Be Tested (Successfully)

- Dialog open button click (`setIsQuestDialogOpen(true)`, `setIsNPCDialogOpen(true)`)
- Selected items displayed as tags outside the dialog
- Tag removal (X button on selected items)
- All non-dialog sections (BasicInfoSection, FeaturesSection, TagsSection)

---

## Root Cause

Same as Bug #150. The `Dialog` component renders into a portal outside the standard render container.

---

## Recommended Fix

Mock the Dialog component in test files to render children inline:
```typescript
jest.mock('../../../../components/core/Dialog', () => ({
  default: ({ children, open, title }: any) => 
    open ? (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    ) : null
}));
```

This would allow the dialog content to be tested without modifying production code.

---

## Related

- Bug #150: Dialog Portal Ref Pattern Prevents JSDOM Testing (pre-existing root cause)
- Bug #300: QuestFormSections crypto.randomUUID in Jest
- Bug #301: JoinGroupDialog form content unreachable
