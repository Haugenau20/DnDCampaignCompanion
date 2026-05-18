# Bug #011: Rumor User Attribution Metadata Issues

**Status**: 🔍 DISCOVERED  
**Priority**: High  
**Category**: DATA  
**Context**: RumorContext  
**Discovery Date**: June 15, 2025  
**Discovery Method**: Behavioral Testing

## Summary

User attribution metadata utilities (`getUserName` and `getActiveCharacterName`) return empty strings and null values in RumorContext operations, identical to the pattern found in LocationContext, NPCContext, and QuestContext.

## Bug Details

### Location
- **File**: `src/context/RumorContext.tsx`
- **Lines**: 58, 80, 90, 125, 128, 152, 215, 229, 232, 264, 304, 316
- **Functions**: All user-facing operations (addRumor, updateRumor, updateRumorStatus, updateRumorNote, combineRumors, convertToQuest)

### Expected Behavior
```typescript
// EXPECTED: Proper user attribution across all operations
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

### Test Case: Rumor Creation
```typescript
// Test expects proper attribution metadata
expect(mockAddData).toHaveBeenCalledWith(
  expect.objectContaining({
    createdByUsername: 'Test User',
    createdByCharacterName: 'Test Character'
  }),
  'test-rumor-for-attribution'
);

// FAILS: Receives empty string and null
// createdByUsername: ""
// createdByCharacterName: null
```

### Test Case: Rumor Updates
```typescript
// Test expects proper modification metadata
expect(mockUpdateData).toHaveBeenCalledWith(
  'test-rumor',
  expect.objectContaining({
    modifiedByUsername: 'Test User',
    modifiedByCharacterName: 'Test Character'
  })
);

// FAILS: Receives empty string and null
// modifiedByUsername: ""
// modifiedByCharacterName: null
```

### Test Case: Note Creation
```typescript
// Test expects proper note attribution
expect(mockUpdateData).toHaveBeenCalledWith(
  'test-rumor',
  expect.objectContaining({
    notes: [
      expect.objectContaining({
        createdByUsername: 'Test User',
        createdByCharacterName: 'Test Character'
      })
    ]
  })
);

// FAILS: Note attribution also empty/null
```

## Root Cause Analysis

### Utility Functions Investigation
```typescript
// Multiple instances across RumorContext.tsx
modifiedByUsername: getUserName(activeGroupUserProfile),
modifiedByCharacterName: getActiveCharacterName(activeGroupUserProfile),
```

### Cross-Context Pattern Confirmation
This bug is **identical** to bugs found in:
- **Bug #008**: LocationContext User Attribution Issues
- **Bug #002**: NPCContext attribution (mentioned in lessons learned)
- **Bug #004**: QuestContext attribution (mentioned in lessons learned)

**Systematic Issue**: All contexts using these utilities are affected.

## Impact Assessment

### Data Integrity (High Impact)
- **Rumor Operations**: All rumor creation/modification lacks proper authorship
- **Note System**: Rumor notes missing attribution metadata
- **Audit Trail**: Complete loss of user tracking for rumor system
- **Cross-System**: Quest conversion from rumors also affected

### User Experience Impact
- **Accountability**: Users cannot see who created/modified rumors
- **Collaboration**: Group collaboration hindered by missing attribution
- **Trust**: Users may lose confidence in data integrity

## Affected Operations

### Creation Operations
- **addRumor**: Missing createdByUsername, createdByCharacterName
- **combineRumors**: Missing attribution for combined rumor creation
- **convertToQuest**: Missing attribution when creating quests from rumors

### Update Operations  
- **updateRumor**: Missing modifiedByUsername, modifiedByCharacterName
- **updateRumorStatus**: Missing modification attribution
- **updateRumorNote**: Missing both note and rumor modification attribution

### Note Operations
- **updateRumorNote**: Note attribution completely broken
- **combineRumors**: Generated notes lack proper attribution

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
2. Perform any rumor operation (create, update, add note, combine, convert)
3. Verify attribution metadata in database call
4. Observe empty strings and null values instead of expected names

## Related Issues

### Cross-Context Attribution Bugs
- **Bug #008**: Location User Attribution Metadata Issues (same utilities)
- **Similar patterns** in NPC and Quest contexts (mentioned in documentation)

### Integration Impact
- **Quest System**: convertToQuest function creates quests with broken attribution
- **Note System**: All rumor notes lack proper attribution
- **Audit System**: Application-wide audit trail compromised

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
- **High Priority**: Bug affects ALL user-facing operations

### Regression Prevention
- **Bug Tests**: Failing tests serve as regression prevention for all contexts
- **Cross-Context Tests**: Pattern recognition prevents similar bugs in future contexts
- **Quality Assurance**: Tests will pass once utilities are fixed system-wide