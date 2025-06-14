# Bug #002: NPC ID Generation Collision Risk

**Status**: 🔍 **DISCOVERED** (needs investigation in real codebase)  
**Category**: DATA  
**Discovery Method**: CRUD testing analysis  
**Impact**: Medium (data integrity risk)  

## Summary

The NPC ID generation algorithm may create duplicate IDs when multiple NPCs have the same name, potentially causing data collisions and overwrites.

## Discovery Details

**Test File**: `src/context/__tests__/NPCContext.crud.test.tsx`  
**Discovery Date**: January 2025  
**Discovered By**: Test isolation investigation  
**Related**: NPCContext.tsx line 116-121  

## Steps to Reproduce

1. Create an NPC named "Gandalf"
2. Try to create another NPC named "Gandalf" 
3. Both NPCs will generate ID "gandalf"
4. Second NPC may overwrite the first

## Expected Behavior

- Each NPC should have a unique ID regardless of name
- Duplicate names should be allowed with different IDs
- No data should be lost due to ID collisions
- System should handle name conflicts gracefully

## Actual Behavior (Suspected)

```typescript
// Current ID generation in NPCContext.tsx
const generateNPCId = useCallback((name: string): string => {
  return name.toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/^-+|-+$/g, '');    // Remove leading/trailing hyphens
}, []);
```

**Issues:**
- "Gandalf the Grey" → "gandalf-the-grey"
- "Gandalf The Grey" → "gandalf-the-grey" (SAME ID!)
- No uniqueness guarantee
- Potential data overwrites

## Potential Solutions

### Option 1: Append Timestamp
```typescript
const generateNPCId = (name: string): string => {
  const baseName = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${baseName}-${Date.now()}`;
};
```

### Option 2: Append Counter
```typescript
const generateNPCId = (name: string, existingNPCs: NPC[]): string => {
  const baseName = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  let counter = 1;
  let id = baseName;
  
  while (existingNPCs.some(npc => npc.id === id)) {
    id = `${baseName}-${counter}`;
    counter++;
  }
  
  return id;
};
```

### Option 3: Use UUID
```typescript
import { v4 as uuidv4 } from 'uuid';

const generateNPCId = (): string => {
  return uuidv4();
};
```

## Test Cases Needed

```typescript
test('should handle duplicate NPC names with unique IDs', async () => {
  const id1 = await addNPC({ name: 'Gandalf', /* ... */ });
  const id2 = await addNPC({ name: 'Gandalf', /* ... */ });
  
  expect(id1).not.toBe(id2);
  expect(npcs).toHaveLength(2);
});

test('should handle similar names with unique IDs', async () => {
  await addNPC({ name: 'Gandalf the Grey', /* ... */ });
  await addNPC({ name: 'Gandalf The Grey', /* ... */ });
  
  expect(npcs).toHaveLength(2);
  // Both should exist without overwriting
});
```

## Investigation Required

1. **Check Firebase Behavior** - What happens when same ID is used?
2. **Review Existing Data** - Are there any current duplicates?
3. **Test Real Implementation** - Does the actual code have this issue?
4. **User Impact Assessment** - Has this caused data loss?

## Recommendation

**Priority**: Medium - Should be addressed before restructuring to prevent data loss during migration.

The ID generation strategy should be reviewed and updated to guarantee uniqueness, especially considering:
- User workflows (multiple NPCs with similar names)
- Data integrity during imports
- Migration safety during restructuring