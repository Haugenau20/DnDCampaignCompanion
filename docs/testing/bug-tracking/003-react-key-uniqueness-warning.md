# Bug #003: React Key Uniqueness Warning

**Status**: 🔍 **DISCOVERED** (testing revealed, likely exists in real code)  
**Category**: UI  
**Discovery Method**: CRUD testing console warnings  
**Impact**: Low (user experience, no data loss)  

## Summary

React warns about non-unique keys when rendering lists of NPCs, indicating potential rendering issues and poor performance.

## Discovery Details

**Test File**: `src/context/__tests__/NPCContext.crud.test.tsx`  
**Discovery Date**: June 14 2025  
**Console Warning**: "Encountered two children with the same key"  

## Steps to Reproduce

1. Create an NPC that generates a specific ID (e.g., "gandalf")
2. Update the NPC (causing re-render)
3. React shows both old and new versions temporarily
4. Console warning: "Keys should be unique so that components maintain their identity"

## Expected Behavior

- Each rendered NPC should have a unique, stable key
- No React warnings in console
- Smooth re-renders when NPCs are updated
- Consistent component identity across updates

## Actual Behavior

```
Warning: Encountered two children with the same key, `gandalf`. 
Keys should be unique so that components maintain their identity 
across updates. Non-unique keys may cause children to be 
duplicated and/or omitted — the behavior is unsupported and 
could change in a future version.
```

## Root Cause Analysis

**Related to Bug #002**: If NPCs can have duplicate IDs, and those IDs are used as React keys, this will cause rendering issues.

Likely occurring in components that render NPC lists:
- `NPCDirectory` component
- `NPCCard` components in lists
- Search results showing NPCs

## Potential Code Locations

```typescript
// PROBLEMATIC: Using potentially non-unique ID as key
{npcs.map(npc => (
  <NPCCard key={npc.id} npc={npc} />  // If npc.id not unique!
))}
```

## Solutions

### Immediate Fix
```typescript
// Use array index + ID for guaranteed uniqueness
{npcs.map((npc, index) => (
  <NPCCard key={`${npc.id}-${index}`} npc={npc} />
))}
```

### Proper Fix (after Bug #002)
```typescript
// Once IDs are guaranteed unique, this is safe
{npcs.map(npc => (
  <NPCCard key={npc.id} npc={npc} />
))}
```

### Alternative with Stable Keys
```typescript
// Use creation timestamp + ID for stability
{npcs.map(npc => (
  <NPCCard key={`${npc.id}-${npc.dateAdded}`} npc={npc} />
))}
```

## Investigation Required

1. **Find all list renderings** of NPCs in the codebase
2. **Check key prop usage** in NPC-related components  
3. **Verify if real users see these warnings**
4. **Test performance impact** of non-unique keys

## Components to Check

- `src/components/features/npcs/NPCDirectory.tsx`
- `src/components/features/npcs/NPCCard.tsx`
- `src/components/shared/SearchResults.tsx` (if shows NPCs)
- Any other components rendering NPC lists

## Test Cases Needed

```typescript
test('should render NPC list without React key warnings', () => {
  const consoleSpy = jest.spyOn(console, 'warn');
  
  // Add multiple NPCs
  addNPC({ name: 'NPC 1' });
  addNPC({ name: 'NPC 2' });
  
  // Render component that lists NPCs
  render(<NPCDirectory />);
  
  // Should not have key warnings
  expect(consoleSpy).not.toHaveBeenCalledWith(
    expect.stringContaining('Encountered two children with the same key')
  );
});
```

## Impact Assessment

**User Impact**: Low
- No data loss
- No functional breakage
- Slightly degraded render performance
- Console noise for developers

**Developer Impact**: Medium  
- Console warnings make debugging harder
- Indicates architectural issues
- Could mask other important warnings

## Recommendation

**Priority**: Low-Medium - Fix as part of Bug #002 resolution.

This is likely a symptom of the ID generation issue. Once NPCs have guaranteed unique IDs, this warning should disappear naturally.