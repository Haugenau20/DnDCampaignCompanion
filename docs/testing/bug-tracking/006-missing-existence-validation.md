# Bug #006: Missing Entity Existence Validation

**Status**: ✅ FIXED (2026-07-27)
**Category**: VALIDATION  
**Priority**: Medium  
**Impact**: Medium - Potential data integrity issues

## Investigation Update (2026-07-27) — Final Resolution

### Production fix

Added the missing existence guard to all three affected methods in
`src/features/campaign-entities/npcs/context/NPCContext.tsx`, mirroring the pattern already used in
`LocationContext.updateLocation` (~line 72):

```typescript
const existingNPC = getNPCById(npcId);
if (!existingNPC) {
  throw new Error('NPC not found');
}
```

- `updateNPCNote` (~line 50) and `updateNPCRelationship` (~line 74): the existing `if (npc) { ... }`
  block (no `else`, silent no-op) was inverted into an early-guard `if (!npc) { throw ... }`,
  inserted after the existing `hasRequiredContext` and auth checks, in the same order/position as
  before.
- `updateNPC` (~line 128): **this one was worse than the original report described.** It never
  called `getNPCById` at all — it ran `await updateData(npc.id, updatedNPC)` unconditionally, so
  updating a nonexistent NPC wasn't a silent no-op like the other two, it was a **phantom write**:
  Firestore would happily create/update a document for an ID that didn't exist in local state,
  with no error and no indication anything was wrong. The fix adds the `getNPCById` lookup that was
  missing entirely, and `getNPCById` was added to the method's `useCallback` dependency array
  (it wasn't a dependency before, since the method never referenced it).

### Test corrections (user-authorised exception, four tests only)

The prior attempt at this fix (see history below) was correctly reverted when it turned 4
passing tests red — those tests encoded the pre-fix buggy behavior as the expected behavior. The
user explicitly authorised correcting exactly these four tests, and no others, as a narrow,
named exception to the "never edit a test to make it pass" rule:

1. **`NPCContext.behavioral.test.tsx` › `NPC Update Behavior` › `should reject updates to
   nonexistent NPC`** — previously asserted `updateNPC` **resolves** `undefined` for a nonexistent
   NPC and that `mockUpdateData` **is** called once (its own comment: "DISCOVERY: This reveals that
   updateNPC doesn't check if NPC exists!"). Corrected to assert the promise **rejects** with
   `'NPC not found'` and that `mockUpdateData` is **not** called. Justified because the test was
   asserting the exact defect bug #006 reports, by its own admission in the original comment.
2. **`NPCContext.behavioral.test.tsx` › `NPC Update Behavior` › `should reject relationship update
   for nonexistent NPC`** — same pattern for `updateNPCRelationship`; corrected to assert rejection
   with `'NPC not found'`. Its `expect(mockUpdateData).not.toHaveBeenCalled()` was already correct
   and was left unchanged.
3. **`NPCContext.notes.test.tsx` › `Note Validation Behavior` › `should reject note addition for
   nonexistent NPC`** — same pattern for `updateNPCNote`; corrected to assert rejection with
   `'NPC not found'`.
4. **`NPCContext.notes.test.tsx` › `Note Validation Behavior` › `should require group and campaign
   context for note addition`** — a different category of problem: a test-harness defect, not a
   mis-specification. It set no `mockUseNPCData` return value of its own, so it inherited the
   leftover mock from the preceding test (`getNPCById` → `undefined`), because
   `jest.clearAllMocks()` clears call history but not `mockReturnValue`. Once the existence guard
   was added, that leftover `undefined` tripped the new check and the test failed for the wrong
   reason (a "missing NPC" error) even though it is nominally about missing group/campaign context.
   Fixed by giving the test its own explicit `mockUseNPCData.mockReturnValue({ ..., hasRequiredContext:
   false })`, matching the setup style already used by neighbouring tests in the file. What the test
   asserts was **not** changed — it still verifies that `updateNPCNote` returns `undefined` without
   calling Firebase when group/campaign context is missing (that early-return behavior is unaffected
   by this fix, since the `hasRequiredContext` check runs before the new existence check). The only
   change is removing its accidental dependency on test execution order.

All four tests kept their names and structure; only assertions (and, for #4, the mock setup) changed.
Stale `// BEHAVIOR:` / `// DISCOVERY:` comments describing the old buggy behavior as expected were
updated to describe the validated-existence behavior, referencing bug #006. Test #4's comments were
left as-is since they describe the (unchanged) missing-context behavior, not the existence-validation
bug.

### Verification

- `should reject updates to nonexistent NPCs` / `should reject note updates to nonexistent NPCs` /
  `should reject relationship updates to nonexistent NPCs` (the 3 bug-#006 marker tests in
  `NPCContext.bugs.test.tsx`) now pass.
- The 2 `Bug #002: ID Generation Collision Prevention` tests still fail, as they must — bug #002 is
  a separate, deliberately deferred issue and was not touched.
- No test outside the four listed above changed status: `npcs` test-path run went from 5
  failed/244 passed/249 total to 2 failed/247 passed/249 total; `campaign-entities` test-path run
  went from 11 failed/755 passed/766 total to 8 failed/758 passed/766 total — in both cases exactly
  the 3 bug-#006 tests flipped, nothing else moved. `npx tsc --noEmit` is clean before and after.

## Investigation History (2026-07-27, first attempt — superseded above)

A fix was attempted in `src/features/campaign-entities/npcs/context/NPCContext.tsx`: added the
missing existence guard clause (`const existingNPC = getNPCById(...); if (!existingNPC) { throw new
Error('NPC not found'); }`) to `updateNPC`, `updateNPCNote`, and `updateNPCRelationship`, mirroring
the pattern already used in `LocationContext.updateLocation`.

This made the 3 target tests in
`src/features/campaign-entities/npcs/context/__tests__/NPCContext.bugs.test.tsx` (describe block
`Bug #006: Missing Entity Existence Validation`) pass. **However, it also turned 4 currently-passing
tests red**, so the change was reverted (`git checkout --`) rather than landed:

- `NPCContext.behavioral.test.tsx` › `NPC Update Behavior` › `should reject updates to nonexistent NPC`
  — asserts `updateNPC` **resolves** with `undefined` for a nonexistent NPC and that
  `mockUpdateData` **is** called once. This encodes the old buggy silent-no-op behavior as the
  expected behavior (its own comment reads "DISCOVERY: This reveals that updateNPC doesn't check if
  NPC exists!").
- `NPCContext.behavioral.test.tsx` › `NPC Update Behavior` › `should reject relationship update for
  nonexistent NPC` — same pattern for `updateNPCRelationship`.
- `NPCContext.notes.test.tsx` › `Note Validation Behavior` › `should reject note addition for
  nonexistent NPC` — same pattern for `updateNPCNote`.
- `NPCContext.notes.test.tsx` › `Note Validation Behavior` › `should require group and campaign
  context for note addition` — this test does not set its own `mockUseNPCData` return value, so it
  inherits the leftover mock (`getNPCById` returning `undefined`) left behind by the preceding test
  in the same file (test execution order dependency / mock pollution, since `jest.clearAllMocks()`
  clears call history but not `mockReturnValue`). With the existence guard added, that leftover
  `undefined` now trips the new check and throws, even though this test is nominally about missing
  group/campaign context, not a missing NPC.

These four tests are exactly the ones this bug report's own "Testing Notes" section anticipated
would need updating once the fix landed (`src/context/__tests__/behavioral/NPCContext.*.test.tsx:
Update test expectations`). Per this project's testing methodology, the fixing agent may not modify
test files to make them pass — a previously-passing test going red is a signal for a human/orchestrator
decision, not something to route around. **Next step for whoever picks this back up**: decide
whether to update those 4 tests (and fix the mock-pollution bug in the fourth one) in the same
change as the production fix, since they currently assert the exact behavior bug #006 says is wrong.

## Summary

Some update operations don't validate that the target entity exists before attempting to update it, leading to operations that appear to succeed but don't actually modify any data.

## Discovery Context

Found during behavioral testing when attempting to update nonexistent NPCs. The operation resolved successfully instead of rejecting with an appropriate error message.

## Technical Details

### Affected Operations

#### NPCContext.updateNPC()
**File**: `src/context/NPCContext.tsx:149`
```typescript
const updateNPC = useCallback(async (npc: NPC): Promise<void> => {
  if (!hasRequiredContext) {
    throw new Error('Cannot update NPC: No group or campaign selected');
  }

  if (!user || !userProfile) {
    throw new Error('User must be authenticated to update an NPC');
  }

  // ❌ No validation that NPC exists
  const updatedNPC = {
    ...npc,
    modifiedBy: user.uid,
    modifiedByUsername: getUserName(activeGroupUserProfile),
    dateModified: new Date().toISOString()
  };
  
  await updateData(npc.id, updatedNPC);  // Updates regardless of existence
  await refreshNPCs();
}, [hasRequiredContext, user, userProfile, activeGroupUserProfile, updateData, refreshNPCs]);
```

#### NPCContext.updateNPCNote()
**File**: `src/context/NPCContext.tsx:52`
```typescript
const updateNPCNote = useCallback(async (npcId: string, note: NPCNote) => {
  if (!hasRequiredContext) {
    console.error('Cannot update NPC note: No group or campaign selected');
    return;  // ❌ Returns silently instead of throwing
  }

  if (!user || !userProfile) {
    throw new Error('User must be authenticated to add notes');
  }

  const npc = getNPCById(npcId);
  if (npc) {  // ❌ Only updates if exists, but doesn't throw if doesn't exist
    // Update logic here
  }
  // ❌ No error if npc is undefined
}, [getNPCById, updateData, refreshNPCs, hasRequiredContext, user, userProfile, activeGroupUserProfile]);
```

### Behavioral Test Evidence

**Test File**: `src/context/__tests__/behavioral/NPCContext.behavioral.test.tsx`
```typescript
test('should reject updates to nonexistent NPC', async () => {
  mockUseNPCData.mockReturnValue({
    npcs: [],
    getNPCById: jest.fn().mockReturnValue(undefined),  // Nonexistent NPC
    hasRequiredContext: true,
  });

  const updatedNPC = {
    id: 'nonexistent-npc',
    name: 'Updated Name',
    // ... other fields
  };

  // DISCOVERY: updateNPC doesn't validate existence - resolves instead of rejecting
  await act(async () => {
    const result = await npcContext.updateNPC(updatedNPC);
    expect(result).toBeUndefined(); // updateNPC resolves even for nonexistent NPC
  });

  // Firebase IS called even for nonexistent NPC - this may be a bug!
  expect(mockUpdateData).toHaveBeenCalledTimes(1);
});
```

**Test File**: `src/context/__tests__/behavioral/NPCContext.notes.test.tsx`
```typescript
test('should reject note addition for nonexistent NPC', async () => {
  mockUseNPCData.mockReturnValue({
    npcs: [],
    getNPCById: jest.fn().mockReturnValue(undefined),  // Nonexistent NPC
  });

  const noteData = {
    date: '2023-06-15',
    text: 'Note for nonexistent NPC'
  };

  // DISCOVERY: updateNPCNote doesn't throw for nonexistent NPC - just returns undefined
  await act(async () => {
    const result = await npcContext.updateNPCNote('nonexistent-npc', noteData);
    expect(result).toBeUndefined();
  });

  // Firebase should not be called for nonexistent NPC
  expect(mockUpdateData).not.toHaveBeenCalled();
});
```

## User Impact

### Data Integrity Issues
1. **Silent Failures**: Operations appear successful but don't modify data
2. **Inconsistent State**: UI might show updates that don't persist
3. **User Confusion**: No feedback when operations fail silently

### Developer Impact
1. **Debugging Difficulty**: Silent failures are hard to trace
2. **Data Consistency**: Unclear when updates actually occur
3. **Error Handling**: Inconsistent error patterns across operations

## Expected vs Actual Behavior

### Expected Behavior
```typescript
const updateNPC = useCallback(async (npc: NPC): Promise<void> => {
  // Standard validation...
  
  const existingNPC = getNPCById(npc.id);
  if (!existingNPC) {
    throw new Error(`NPC with ID '${npc.id}' not found`);
  }
  
  // Proceed with update...
}, [getNPCById, updateData, refreshNPCs, ...]);
```

### Actual Behavior
```typescript
const updateNPC = useCallback(async (npc: NPC): Promise<void> => {
  // Standard validation...
  
  // ❌ No existence check - proceeds regardless
  await updateData(npc.id, updatedNPC);
  await refreshNPCs();
}, [updateData, refreshNPCs, ...]);
```

## Reproduction Steps

1. Authenticate and set up proper context
2. Attempt to update an NPC that doesn't exist:
   ```typescript
   await npcContext.updateNPC({
     id: 'nonexistent-id',
     name: 'Updated Name',
     // ... other required fields
   });
   ```
3. **Result**: Operation resolves successfully
4. **Expected**: Operation should reject with "NPC not found" error

## Root Cause Analysis

### Inconsistent Validation Patterns
Different operations have different validation approaches:

1. **updateNPC**: No existence validation
2. **updateNPCNote**: Conditional existence check (silent failure)
3. **updateNPCRelationship**: Conditional existence check (silent failure)

### Missing Standard Pattern
No established pattern for entity existence validation before updates:
```typescript
// Missing standard validation:
const validateEntityExists = (entityId: string, entityName: string) => {
  const entity = getEntityById(entityId);
  if (!entity) {
    throw new Error(`${entityName} with ID '${entityId}' not found`);
  }
  return entity;
};
```

## Recommended Solution

### Implement Consistent Existence Validation
```typescript
const updateNPC = useCallback(async (npc: NPC): Promise<void> => {
  if (!hasRequiredContext) {
    throw new Error('Cannot update NPC: No group or campaign selected');
  }

  if (!user || !userProfile) {
    throw new Error('User must be authenticated to update an NPC');
  }

  // ✅ Validate NPC exists
  const existingNPC = getNPCById(npc.id);
  if (!existingNPC) {
    throw new Error(`NPC with ID '${npc.id}' not found`);
  }

  const updatedNPC = {
    ...npc,
    modifiedBy: user.uid,
    modifiedByUsername: getUserName(activeGroupUserProfile),
    dateModified: new Date().toISOString()
  };
  
  await updateData(npc.id, updatedNPC);
  await refreshNPCs();
}, [getNPCById, hasRequiredContext, user, userProfile, activeGroupUserProfile, updateData, refreshNPCs]);
```

### Standardize Note Update Pattern
```typescript
const updateNPCNote = useCallback(async (npcId: string, note: NPCNote) => {
  if (!hasRequiredContext) {
    throw new Error('Cannot update NPC note: No group or campaign selected');
  }

  if (!user || !userProfile) {
    throw new Error('User must be authenticated to add notes');
  }

  // ✅ Validate NPC exists and throw if not found
  const npc = getNPCById(npcId);
  if (!npc) {
    throw new Error(`NPC with ID '${npcId}' not found`);
  }

  // Proceed with note update...
}, [getNPCById, updateData, refreshNPCs, hasRequiredContext, user, userProfile, activeGroupUserProfile]);
```

## Implementation Impact

### Medium Risk Changes
- **Behavior Change**: Operations will now throw errors instead of silent failures
- **Test Updates**: Behavioral tests need to be updated to expect validation
- **Error Handling**: UI needs to handle new validation errors

### Files Requiring Updates
- `src/context/NPCContext.tsx`: Add existence validation to all update operations
- `src/context/QuestContext.tsx`: Review for similar issues
- `src/context/__tests__/behavioral/NPCContext.*.test.tsx`: Update test expectations

## Testing Notes

### Why Behavioral Testing Found This
1. **Mock-based tests** would mock the validation and miss the real issue
2. **Integration tests** might not test edge cases
3. **Behavioral tests** test actual context logic and reveal missing validation

### Additional Testing Needed
After implementing the fix:
1. Test all update operations with nonexistent entities
2. Verify proper error messages are thrown
3. Test that valid updates still work correctly
4. Ensure UI properly handles validation errors

## Related Issues

### Similar Patterns Likely in Other Contexts
- QuestContext update operations
- LocationContext update operations  
- RumorContext update operations
- StoryContext update operations

### Consistency Considerations
- Should all contexts use the same validation pattern?
- Should error messages be standardized?
- Should existence validation be a shared utility?

## Verification Steps

After fix implementation:
1. Behavioral tests should expect validation errors for nonexistent entities
2. All update operations should validate existence before proceeding
3. Error messages should be consistent and helpful
4. Silent failures should be eliminated across all contexts