# Bug #004: Quest ID Generation Collision Risk

**Date**: June 14 2025  
**Context**: Quest Context Testing  
**Severity**: Medium  
**Status**: Identified  

## Description

The Quest ID generation function in `QuestContext.tsx` can generate identical IDs for different quest titles, creating a collision risk that could result in data loss.

## Location

**File**: `src/context/QuestContext.tsx`  
**Function**: `generateQuestId` (lines 71-77)  
**Code**:
```typescript
const generateQuestId = useCallback((title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
    .replace(/^-+|-+$/g, '');    // Remove leading/trailing hyphens
}, []);
```

## Problem Examples

Multiple different quest titles generate the same ID:

| Quest Title | Generated ID | Collision? |
|-------------|--------------|------------|
| "Save the Village" | `save-the-village` | ✅ Base |
| "SAVE THE VILLAGE" | `save-the-village` | ❌ Same |
| "Save...the...Village!!!" | `save-the-village` | ❌ Same |
| "  Save the Village  " | `save-the-village` | ❌ Same |
| "Save-the-Village" | `save-the-village` | ❌ Same |

## Impact Analysis

### Data Loss Risk
- **High Risk**: New quest with duplicate ID overwrites existing quest
- **User Impact**: Lost quest data, progress, and objectives
- **Silent Failure**: No warning to user about collision

### Realistic Scenarios
1. **Campaign Variants**: "Find the Artifact" vs "Find The Artifact!" 
2. **Case Differences**: "dragon's lair" vs "Dragon's Lair"
3. **Punctuation**: "Quest #1: Beginning" vs "Quest 1 Beginning"
4. **Spacing**: "Save  the  Village" vs "Save the Village"

## Discovery Method

Found through specification-based testing in `QuestContext.crud.test.tsx`:

```typescript
test('should identify potential ID collision scenarios', () => {
  const titles = [
    'Save the Village',
    'Save The Village', 
    'SAVE THE VILLAGE',
    'Save-the-Village',
    'Save...the...Village!!!',
    '  Save the Village  '
  ];

  const ids = titles.map(title => generateQuestId(title));
  const uniqueIds = new Set(ids);
  
  // All generate same ID - collision risk
  expect(uniqueIds.size).toBe(1);
});
```

## Technical Analysis

### Root Cause
The ID generation algorithm is **deterministic but not unique**:
1. Converts to lowercase (loses case distinction)
2. Trims whitespace (loses spacing distinction)  
3. Replaces all non-alphanumeric with hyphens (loses punctuation distinction)
4. Removes leading/trailing hyphens (normalizes format)

### Firebase Implications
- Firebase uses the generated ID as the document key
- Duplicate IDs cause `addData(newQuest, id)` to **overwrite** existing document
- No built-in collision detection in current implementation

## Comparison with NPC Context

**Same Issue Exists**: NPC Context has identical ID generation logic (`NPCContext.tsx:89-95`)

```typescript
// NPCs have same vulnerable pattern
const generateNPCId = (name: string): string => {
  return name.toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};
```

**Conclusion**: This is a **systemic issue** affecting multiple contexts.

## Recommended Solutions

### Option 1: Timestamp Suffix (Simplest)
```typescript
const generateQuestId = (title: string): string => {
  const baseId = title.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${baseId}-${Date.now()}`;
};
```

**Pros**: Simple, guaranteed unique  
**Cons**: Less readable IDs

### Option 2: Counter System (Elegant)
```typescript
const generateQuestId = async (title: string): Promise<string> => {
  const baseId = title.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
    
  // Check if baseId exists
  const existing = await getQuestById(baseId);
  if (!existing) return baseId;
  
  // Find next available ID
  let counter = 1;
  let candidateId = `${baseId}-${counter}`;
  while (await getQuestById(candidateId)) {
    counter++;
    candidateId = `${baseId}-${counter}`;
  }
  return candidateId;
};
```

**Pros**: Clean IDs for unique titles  
**Cons**: Async complexity, performance impact

### Option 3: Random Suffix (Balanced)
```typescript
const generateQuestId = (title: string): string => {
  const baseId = title.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const randomSuffix = Math.random().toString(36).substr(2, 6);
  return `${baseId}-${randomSuffix}`;
};
```

**Pros**: Simple, very low collision chance  
**Cons**: Always has random suffix

### Option 4: UUID System (Most Robust)
```typescript
import { v4 as uuidv4 } from 'uuid';

const generateQuestId = (): string => {
  return uuidv4();
};
```

**Pros**: Guaranteed unique, no collision risk  
**Cons**: Loses human-readable aspect

## Recommended Implementation

**Preferred**: **Option 2 (Counter System)** for production

**Reasons**:
1. **Clean IDs**: Most quests get readable IDs (`dragon-quest`)
2. **Guaranteed Uniqueness**: Collisions resolved with counter (`dragon-quest-2`)
3. **User Friendly**: IDs still somewhat readable and predictable
4. **Backwards Compatible**: Existing quests with unique IDs unchanged

## Testing Requirements

Any fix should include:

1. **Collision Tests**: Verify different titles don't generate same ID
2. **Performance Tests**: Ensure ID generation doesn't slow down quest creation
3. **Migration Tests**: Verify existing quests unaffected
4. **Edge Case Tests**: Empty titles, special characters, very long titles

## Related Issues

This bug likely affects:
- **NPC Context**: Same ID generation pattern
- **Location Context**: Likely similar pattern
- **Rumor Context**: Likely similar pattern  
- **Story Context**: Likely similar pattern

**Recommendation**: Fix systemically across all contexts.

## Priority Assessment

**Medium Priority** because:
- **Real Risk**: Users could lose quest data
- **Not Immediate**: Requires specific collision scenarios
- **Systemic**: Affects multiple contexts
- **Fixable**: Clear solution path available

**Should fix before**: Major restructuring or production deployment

## Status

- [x] **Identified**: Through Quest Context testing
- [ ] **Investigated**: Test in Firebase environment  
- [ ] **Planned**: Choose implementation approach
- [ ] **Implemented**: Code the fix
- [ ] **Tested**: Verify fix works
- [ ] **Deployed**: Roll out to production