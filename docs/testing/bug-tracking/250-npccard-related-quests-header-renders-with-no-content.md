# Bug #250 - NPCCard "Related Quests" Header Renders When All Quest IDs Are Unresolvable

**Status**: 🔍 DISCOVERED  
**Category**: UI  
**Priority**: Low  
**Discovery Method**: Component unit testing  
**Context**: `src/components/features/npcs/NPCCard.tsx`

---

## Summary

When an NPC has `connections.relatedQuests` IDs that cannot be resolved by `getQuestById()` (i.e., the function returns `undefined` for every quest ID), the "Related Quests" section heading still renders in the DOM with an empty list beneath it. The user sees an orphaned "Related Quests" heading with no content.

---

## Evidence

### Component Code (NPCCard.tsx, lines ~235-273)

```tsx
{npc.connections.relatedQuests.length > 0 && (
  <div>
    <Typography variant="h4" className="mb-2">
      Related Quests
    </Typography>
    <div className="space-y-2">
      {npc.connections.relatedQuests.map((questId) => {
        const quest = getQuestById(questId);
        return quest ? (
          <Button ...>{quest.title}</Button>
        ) : null;  // renders nothing if quest not found
      })}
    </div>
  </div>
)}
```

### What Happens

The outer guard `npc.connections.relatedQuests.length > 0` passes when there are quest IDs in the array. However, if all of those IDs fail to resolve via `getQuestById`, the inner map renders only `null` values. The "Related Quests" heading is still shown.

### Discovered By Test

```
should not render a quest button when quest is not found by id
```

The test confirmed that the "Related Quests" header does appear in the DOM even when no quest content is rendered beneath it.

---

## Expected Behaviour

The "Related Quests" section heading should only be rendered when at least one quest ID resolves to a valid quest object. Orphaned section headers with no content create a confusing UI.

---

## Suggested Fix

Compute the resolved quests list before rendering and guard on that:

```tsx
const resolvedQuests = npc.connections.relatedQuests
  .map(id => getQuestById(id))
  .filter(Boolean);

{resolvedQuests.length > 0 && (
  <div>
    <Typography variant="h4" className="mb-2">Related Quests</Typography>
    <div className="space-y-2">
      {resolvedQuests.map(quest => (
        <Button key={quest!.id} ...>{quest!.title}</Button>
      ))}
    </div>
  </div>
)}
```

---

## Impact

- **User Experience**: Low — only visible when quest IDs reference deleted/non-existent quests
- **Data Integrity**: Not affected — display-only issue
- **Frequency**: Uncommon — occurs when quests are deleted but NPC connections are not cleaned up

---

## Notes

This is related to the broader missing cascade-delete pattern: when a quest is deleted, NPC connection arrays should be cleaned up. Bug #006 (Missing Entity Existence Validation) documents the backend side of this issue.
