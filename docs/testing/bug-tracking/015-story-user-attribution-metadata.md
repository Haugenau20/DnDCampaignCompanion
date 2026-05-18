# Bug #015: Story User Attribution Metadata Issues

**Status**: 🔍 DISCOVERED  
**Priority**: High  
**Category**: DATA  
**Context**: StoryContext  
**Discovery Date**: June 15, 2025  
**Discovery Method**: Behavioral Testing

## Summary

User attribution metadata utilities (`getUserName` and `getActiveCharacterName`) return empty strings and null values in StoryContext operations, identical to the pattern found in RumorContext, LocationContext, NPCContext, and QuestContext.

## Bug Details

### Location
- **File**: `src/context/StoryContext.tsx`
- **Lines**: 208, 209, 270, 271, 365, 366, 369, 370
- **Functions**: createChapter, updateChapter (including complex reordering)

### Expected Behavior
```typescript
// EXPECTED: Proper user attribution across all chapter operations
{
  createdByUsername: "Test User",
  createdByCharacterName: "Test Character",
  modifiedByUsername: "Test User", 
  modifiedByCharacterName: "Test Character"
}
```

### Actual Behavior
```typescript
// ACTUAL: Empty/null attribution across all operations
{
  createdByUsername: "",
  createdByCharacterName: null,
  modifiedByUsername: "",
  modifiedByCharacterName: null
}
```

## Test Evidence

### Test Case: Chapter Creation
```typescript
// Test expects proper attribution metadata
expect(mockFirebaseServices.document.setDocument).toHaveBeenCalledWith(
  'chapters',
  'chapter-01',
  expect.objectContaining({
    createdByUsername: 'Test User',
    createdByCharacterName: 'Test Character'
  })
);

// FAILS: Receives empty string and null
// createdByUsername: ""
// createdByCharacterName: null
```

### Test Case: Chapter Updates
```typescript
// Test expects proper modification metadata
expect(mockUpdateData).toHaveBeenCalledWith(
  'chapter-01',
  expect.objectContaining({
    modifiedByUsername: 'Test User',
    modifiedByCharacterName: 'Test Character'
  })
);

// FAILS: Receives empty string and null
// modifiedByUsername: ""
// modifiedByCharacterName: null
```

### Test Case: Complex Chapter Reordering
```typescript
// Test expects proper attribution during reordering operations
expect(mockFirebaseServices.document.setDocument).toHaveBeenCalledWith(
  'chapters',
  expect.any(String),
  expect.objectContaining({
    modifiedByUsername: 'Test User',
    modifiedByCharacterName: 'Test Character'
  })
);

// FAILS: Complex operations also have attribution issues
```

## Root Cause Analysis

### Utility Functions Investigation
```typescript
// Multiple instances across StoryContext.tsx
modifiedByUsername: getUserName(activeGroupUserProfile),
modifiedByCharacterName: getActiveCharacterName(activeGroupUserProfile),
```

### Cross-Context Pattern Confirmation
This bug is **identical** to bugs found in:
- **Bug #011**: RumorContext User Attribution Issues
- **Bug #008**: LocationContext User Attribution Issues
- **Bug #002**: NPCContext attribution (mentioned in lessons learned)
- **Bug #004**: QuestContext attribution (mentioned in lessons learned)

**Systematic Issue**: All contexts using these utilities are affected.

## Impact Assessment

### Data Integrity (High Impact)
- **Chapter Operations**: All chapter creation/modification lacks proper authorship
- **Complex Reordering**: Multi-step reordering operations lose attribution tracking
- **Audit Trail**: Complete loss of user tracking for story system
- **Content Attribution**: Users cannot see who authored story chapters

### User Experience Impact
- **Accountability**: Users cannot see who created/modified chapters
- **Collaboration**: Group storytelling hindered by missing attribution
- **Trust**: Users may lose confidence in data integrity
- **History Tracking**: No way to track story authorship over time

## Affected Operations

### Creation Operations
- **createChapter**: Missing createdByUsername, createdByCharacterName
- **Chapter insertion with reordering**: Missing attribution for shifted chapters

### Update Operations  
- **updateChapter**: Missing modifiedByUsername, modifiedByCharacterName
- **Complex reordering**: Missing modification attribution during multi-step operations
- **Order changes**: Attribution lost during chapter position changes

### Complex Operations
- **Chapter reordering**: Multi-step operations with delete/recreate cycles lose attribution
- **Batch operations**: Multiple chapters affected by single operation lack proper tracking

## Story-Specific Implications

### Chapter Management
```typescript
// Complex reordering involves multiple operations
affectedChapters.forEach(c => {
  if (c.id !== chapterId && c.order > oldOrder && c.order <= newOrder) {
    newOrderMap.set(c.id, c.order - 1);
  }
});

// All affected chapters lose proper attribution
modifiedByUsername: getUserName(activeGroupUserProfile) || '', // Returns ""
modifiedByCharacterName: getActiveCharacterName(activeGroupUserProfile) || '', // Returns null
```

### Content Integrity
- **Story Authorship**: Critical for tracking who contributed to campaign story
- **Chapter History**: No way to trace story evolution over time
- **Collaborative Writing**: Multiple users contributing to story need attribution

## Cross-Context Implications

### Systematic Bug Pattern
```typescript
// Same pattern across ALL contexts:
getUserName(activeGroupUserProfile)           // Returns: ""
getActiveCharacterName(activeGroupUserProfile) // Returns: null
```

### Database Consistency
- **Audit Metadata**: Inconsistent across all entity types
- **User Tracking**: Broken application-wide
- **Data Migration**: May need cleanup of existing bad data

## Reproduction Steps

1. Setup authenticated mock user with proper profile data
2. Perform any chapter operation (create, update, reorder)
3. Verify attribution metadata in database call
4. Observe empty strings and null values instead of expected names

## Related Issues

### Cross-Context Attribution Bugs
- **Bug #011**: Rumor User Attribution Metadata Issues (same utilities)
- **Bug #008**: Location User Attribution Metadata Issues (same utilities)
- **Similar patterns** in NPC and Quest contexts (mentioned in documentation)

### Story-Specific Impact
- **Chapter System**: All chapter operations affected
- **Complex Operations**: Multi-step reordering particularly problematic
- **Collaboration Features**: Story collaboration compromised

## Recommended Resolution

### Investigation Priority
1. **Root Cause Analysis**: Examine getUserName and getActiveCharacterName utility implementations
2. **Profile Structure**: Verify mock data matches production profile structure
3. **Cross-Context Testing**: Confirm all contexts have identical issue
4. **Data Cleanup**: Plan for fixing existing bad data

### Implementation Options
1. **Fix Utilities**: Correct utility functions to properly extract user/character names
2. **Update Profile Structure**: Ensure profile data structure matches utility expectations
3. **Fallback Logic**: Add fallback values when utilities return empty/null
4. **Consistent Attribution**: Create single attribution service used by all contexts

## Testing Impact

### Discovery Success
- **Behavioral Testing**: Real context behavior revealed systematic issue
- **Cross-Context Pattern**: Confirmed same bug across multiple contexts
- **Specification Testing**: Tests define expected behavior, expose implementation gaps
- **High Priority**: Bug affects ALL user-facing story operations

### Regression Prevention
- **Bug Tests**: Failing tests serve as regression prevention for all contexts
- **Cross-Context Tests**: Pattern recognition prevents similar bugs in future contexts
- **Quality Assurance**: Tests will pass once utilities are fixed system-wide

## Story-Specific Considerations

### Complex Operation Testing
- **Reordering Logic**: Multi-step operations need comprehensive testing
- **Batch Updates**: Operations affecting multiple chapters need attribution tracking
- **Error Recovery**: Failed operations should not lose attribution data

### Content Management Impact
- **Author Attribution**: Critical for collaborative storytelling features
- **Edit History**: Story evolution tracking requires proper attribution
- **User Accountability**: Story management requires clear authorship tracking