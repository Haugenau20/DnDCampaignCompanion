# Bug #005: Validation Error Precedence Inconsistency

**Status**: 🔍 DISCOVERED  
**Category**: VALIDATION  
**Priority**: Medium  
**Discovery Method**: Behavioral Testing  
**Impact**: Medium - Inconsistent user experience across contexts

## Summary

Different contexts use different precedence for validation checks, leading to inconsistent error messages and user experience when the same validation conditions are violated.

## Discovery Context

Found during comprehensive behavioral testing when comparing error handling patterns between NPCContext and QuestContext implementations.

## Technical Details

### Error Precedence Differences

#### NPCContext Pattern
```typescript
// NPCContext checks group/campaign context BEFORE authentication
if (!hasRequiredContext) {
  throw new Error('Cannot add NPC: No group or campaign selected');
}

if (!user || !userProfile) {
  throw new Error('User must be authenticated to add an NPC');
}
```

#### QuestContext Pattern  
```typescript
// QuestContext checks authentication BEFORE context
if (!user || !userProfile) {
  throw new Error('User must be authenticated to add quests');
}

if (!hasRequiredContext) {
  throw new Error('Cannot add quest: No group or campaign selected');
}
```

### Behavioral Test Evidence

**Test File**: `src/context/__tests__/behavioral/NPCContext.behavioral.test.tsx`
```typescript
test('should reject NPC creation when user not authenticated', async () => {
  // No authentication, no context
  mockUseAuth.mockReturnValue({ user: null });
  mockUseGroups.mockReturnValue({ activeGroupId: null });

  // NPCs prioritize context validation over authentication
  await expect(npcContext.addNPC(npcData)).rejects.toThrow(
    'Cannot add NPC: No group or campaign selected'  // Context error, not auth error
  );
});
```

**Test File**: `src/context/__tests__/behavioral/QuestContext.behavioral.test.tsx`
```typescript
test('should reject quest creation when user not authenticated', async () => {
  // No authentication, no context  
  mockUseAuth.mockReturnValue({ user: null });
  mockUseGroups.mockReturnValue({ activeGroupId: null });

  // Quests prioritize authentication validation over context
  await expect(questContext.addQuest(questData)).rejects.toThrow(
    'User must be authenticated to add quests'  // Auth error, not context error
  );
});
```

## User Impact

### Confusion for Users
1. **Inconsistent Error Messages**: Same conditions (no auth + no context) produce different error messages
2. **Unpredictable UX**: Users can't predict which error they'll see first
3. **Training Issues**: Support needs to understand different error patterns per context

### Developer Impact
1. **Maintenance Burden**: Different validation patterns to maintain
2. **Testing Complexity**: Need to test different error precedences per context
3. **Code Inconsistency**: Similar operations behave differently

## Expected vs Actual Behavior

### Expected Behavior
Consistent validation precedence across all contexts:
```typescript
// Option 1: Authentication first (more common pattern)
if (!user) throw new Error('Authentication required');
if (!context) throw new Error('Context required');

// Option 2: Context first (current NPC pattern)  
if (!context) throw new Error('Context required');
if (!user) throw new Error('Authentication required');
```

### Actual Behavior
Different precedence per context:
- **NPCs**: Context → Authentication
- **Quests**: Authentication → Context

## Reproduction Steps

1. Ensure user is not authenticated (`user: null`)
2. Ensure no group/campaign context selected (`activeGroupId: null`)
3. Attempt to create both an NPC and a Quest
4. **Result**: Different error messages for identical conditions

## Root Cause Analysis

### Implementation Differences
Each context was implemented independently without standardized validation patterns:

**NPCContext.tsx:124**
```typescript
const addNPC = useCallback(async (npcData: Omit<NPC, 'id'>): Promise<string> => {
  if (!hasRequiredContext) {  // Context check first
    throw new Error('Cannot add NPC: No group or campaign selected');
  }

  if (!user || !userProfile) {  // Auth check second
    throw new Error('User must be authenticated to add an NPC');
  }
  // ...
}, [hasRequiredContext, user, userProfile, ...]);
```

**QuestContext.tsx:89** 
```typescript
const addQuest = useCallback(async (questData: Omit<Quest, 'id'>): Promise<string> => {
  if (!user || !userProfile) {  // Auth check first
    throw new Error('User must be authenticated to add quests');
  }

  if (!hasRequiredContext) {  // Context check second
    throw new Error('Cannot add quest: No group or campaign selected');
  }
  // ...
}, [user, userProfile, hasRequiredContext, ...]);
```

## Recommended Solution

### Option 1: Standardize on Authentication First (Recommended)
```typescript
// Standard pattern for all contexts
const addEntity = useCallback(async (entityData) => {
  if (!user || !userProfile) {
    throw new Error('User must be authenticated to add [entity]');
  }

  if (!hasRequiredContext) {
    throw new Error('Cannot add [entity]: No group or campaign selected');
  }
  // ...
});
```

**Rationale**: Authentication is typically the first barrier in most applications

### Option 2: Standardize on Context First
```typescript
// Alternative standard pattern
const addEntity = useCallback(async (entityData) => {
  if (!hasRequiredContext) {
    throw new Error('Cannot add [entity]: No group or campaign selected');
  }

  if (!user || !userProfile) {
    throw new Error('User must be authenticated to add [entity]');
  }
  // ...
});
```

**Rationale**: Context might be more fundamental to the application flow

## Implementation Impact

### Low Risk Changes
- **No functional changes** - just reordering validation checks
- **Backward compatible** - same validation, different order
- **Test updates needed** - behavioral tests will need error message updates

### Files Requiring Updates
- `src/context/NPCContext.tsx` (if choosing Option 1)
- `src/context/QuestContext.tsx` (if choosing Option 2)
- All related behavioral tests in `src/context/__tests__/behavioral/`

## Testing Notes

This bug was only discoverable through behavioral testing because:
1. **Mock-based tests** wouldn't reveal precedence differences
2. **Integration tests** might not test both conditions simultaneously
3. **Behavioral tests** compare actual context behavior across implementations

## Related Issues

- Similar inconsistencies likely exist in other contexts (Location, Rumor, Story)
- Update and delete operations may have similar precedence inconsistencies
- Error message text also varies ("Cannot add NPC" vs "Cannot add quest")

## Verification Steps

After fix implementation:
1. Run behavioral tests to ensure consistent error precedence
2. Test all CRUD operations across all contexts
3. Verify error messages follow consistent patterns
4. Update all behavioral tests to expect the standardized error precedence