# Bug #001: NPCContext Mock State Isolation Issues

**Status**: ✅ **FIXED** (in test setup)  
**Category**: CONTEXT  
**Discovery Method**: Specification-based CRUD testing  
**Impact**: High (for testing reliability)  

## Summary

During NPCContext CRUD testing, discovered that mock state was not properly isolated between tests, causing false positives and negatives in test results.

## Discovery Details

**Test File**: `src/context/__tests__/NPCContext.crud.test.tsx`  
**Discovery Date**: January 2025  
**Discovered By**: Automated testing with specification-based approach  

## Steps to Reproduce

1. Run NPCContext CRUD tests without proper state isolation
2. First test adds an NPC with ID "gandalf"
3. Second test runs and still sees the NPC from first test
4. Tests fail with "Found multiple elements" errors
5. State accumulates across tests

## Expected Behavior

- Each test should start with fresh, empty mock state
- Tests should be completely isolated from each other
- No data should persist between test runs
- Tests should be deterministic and repeatable

## Actual Behavior

- Mock NPCs array persisted between tests
- Tests accumulated state from previous tests  
- React warned about duplicate keys
- Tests had dependencies on execution order
- False positives and negatives in test results

## Root Cause

Mock state was declared at module level and shared across all test instances:

```typescript
// PROBLEMATIC: Shared state
const mockNPCs: any[] = [];

const mockNPCContextValue = {
  npcs: mockNPCs, // Same array reference used by all tests
  // ...
};
```

## Solution Applied

Implemented proper state isolation pattern:

```typescript
// FIXED: Fresh state for each test
const createMockState = () => ({
  mockNPCs: [] as any[],
  mockIsLoading: false,
  mockError: null as string | null
});

let currentMockState = createMockState();

// Reset function for test isolation
beforeEach(() => {
  currentMockState = createMockState();
});
```

## Test Case Reference

All tests in `NPCContext.crud.test.tsx` now pass with proper isolation:
- ✅ should start with empty NPC list
- ✅ should add new NPC successfully  
- ✅ should update existing NPC
- ✅ should delete existing NPC
- ✅ should validate required fields when adding NPC
- ✅ should handle update of non-existent NPC
- ✅ should handle delete of non-existent NPC

## Lessons Learned

1. **Test Isolation is Critical** - Shared state causes unreliable tests
2. **beforeEach for Reset** - Always reset mock state between tests
3. **Fresh Instances** - Create fresh mock instances, not shared references
4. **Specification-Based Testing** - This approach revealed the isolation issue immediately

## Impact on Real Codebase

This was a testing infrastructure issue, not a bug in the actual NPCContext. However, it demonstrates the importance of proper state management patterns that should be verified in the real implementation.