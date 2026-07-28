# Bug #010: Location Hierarchical Deletion Order Logic

**Status**: ✅ FIXED  
**Priority**: Medium  
**Category**: DATA  
**Context**: LocationContext  
**Discovery Date**: June 15, 2025  
**Discovery Method**: Behavioral Testing
**Fix Date**: July 27, 2026

## Summary

Location deletion algorithm may not follow optimal order for hierarchical child deletion, potentially causing database referential integrity issues during cascading deletes.

## Bug Details

### Location
- **File**: `src/context/LocationContext.tsx`
- **Lines**: 192-195 (deleteLocation function)
- **Function**: Recursive child deletion logic

### Expected Behavior
Children should be deleted in a specific order that maintains referential integrity:
1. Deepest children first (grandchildren)
2. Direct children second
3. Parent location last

### Actual Behavior
Deletion order differs from expected sequence, potentially causing constraint violations.

## Test Evidence

### Hierarchical Structure Test
```typescript
// Test hierarchy:
// parent-location
// ├── child-location-1
// │   └── grandchild-location
// └── child-location-2

// EXPECTED deletion order:
// 1. grandchild-location
// 2. child-location-1  
// 3. child-location-2
// 4. parent-location

// ACTUAL deletion order (from test failure):
// Different sequence that may violate constraints
```

### Test Failure Evidence
```typescript
test('should delete location and all children recursively', async () => {
  await locationContext.deleteLocation('parent-location');

  // BEHAVIOR: Should delete all child locations first, then parent
  expect(mockDeleteData).toHaveBeenCalledTimes(4);
  
  // Expected order validation
  expect(mockDeleteData).toHaveBeenNthCalledWith(1, 'grandchild-location');
  expect(mockDeleteData).toHaveBeenNthCalledWith(2, 'child-location-1');
  expect(mockDeleteData).toHaveBeenNthCalledWith(3, 'child-location-2');
  expect(mockDeleteData).toHaveBeenNthCalledWith(4, 'parent-location');
});

// TEST FAILS: Actual deletion order differs from expected
```

## Root Cause Analysis

### Current Implementation
```typescript
// LocationContext.tsx lines 182-195
const getAllChildrenIds = (parentId: string): string[] => {
  const directChildren = locations.filter(loc => loc.parentId === parentId);
  return [
    ...directChildren.map(child => child.id),
    ...directChildren.flatMap(child => getAllChildrenIds(child.id))
  ];
};

const childrenIds = getAllChildrenIds(locationId);

// Delete all children first
if (childrenIds.length > 0) {
  await Promise.all(childrenIds.map(id => deleteData(id)));
}

// Then delete the parent location
await deleteData(locationId);
```

### Algorithm Issues
1. **Flatten Order**: `flatMap` may not preserve depth-first order
2. **Parallel Deletion**: `Promise.all` executes deletions in parallel, not sequentially
3. **No Depth Ordering**: Algorithm doesn't guarantee deepest-first deletion
4. **Race Conditions**: Parallel execution may cause constraint violations

## Impact Assessment

### Database Integrity
- **Referential Integrity**: Parent locations may be deleted before all children
- **Constraint Violations**: Foreign key constraints may fail during deletion
- **Transaction Safety**: Parallel deletions may not be atomic

### User Experience
- **Silent Failures**: Database constraint errors may not surface to user
- **Partial Deletions**: Some locations may remain if deletion fails midway
- **Data Inconsistency**: Orphaned child locations if parent deletion succeeds

## Behavioral Testing Discovery

### Why Tests Revealed This Bug
1. **Specification-Based Testing**: Test defined expected deletion order based on referential integrity requirements
2. **Implementation Testing**: Real context behavior exposed actual algorithm order
3. **Edge Case Coverage**: Complex hierarchical structure revealed ordering issues

### Test Design Success
```typescript
// Test creates realistic hierarchy
const mockLocations = [
  { id: 'parent-location', ... },
  { id: 'child-location-1', parentId: 'parent-location', ... },
  { id: 'child-location-2', parentId: 'parent-location', ... },
  { id: 'grandchild-location', parentId: 'child-location-1', ... }
];

// Test verifies specific deletion order for referential integrity
expect(mockDeleteData).toHaveBeenNthCalledWith(1, 'grandchild-location');
```

## Recommended Resolution

### Sequential Depth-First Deletion
```typescript
const deleteLocationRecursively = async (locationId: string): Promise<void> => {
  // Get direct children
  const children = locations.filter(loc => loc.parentId === locationId);
  
  // Delete each child recursively (depth-first)
  for (const child of children) {
    await deleteLocationRecursively(child.id);
  }
  
  // Delete this location after all children are deleted
  await deleteData(locationId);
};
```

### Transaction-Safe Approach
```typescript
const deleteLocationWithTransaction = async (locationId: string): Promise<void> => {
  const batch = firestore.batch();
  const deletionOrder = collectDeletionOrder(locationId);
  
  // Add deletions to batch in correct order
  deletionOrder.forEach(id => {
    batch.delete(firestore.collection('locations').doc(id));
  });
  
  // Execute as atomic transaction
  await batch.commit();
};
```

## Resolution

**Fixed**: July 27, 2026, in `src/features/campaign-entities/locations/context/LocationContext.tsx`
(`deleteLocation`, ~line 165 — the file moved during the feature-first restructuring; the paths
above and in the code samples throughout this doc, `src/context/LocationContext.tsx`, are stale).

Two changes, matching the two root causes identified above:

### 1. `getAllChildrenIds` now returns depth-first post-order

The old implementation built the list breadth-first (all direct children, then all their
descendants via a second `flatMap` pass). It's replaced with a single `flatMap` where each direct
child contributes its own descendants first, then itself:

```typescript
const getAllChildrenIds = (parentId: string): string[] => {
  const directChildren = locations.filter(loc => loc.parentId === parentId);
  return directChildren.flatMap(child => [
    ...getAllChildrenIds(child.id),
    child.id
  ]);
};
```

For the test fixture (`parent-location` → `child-location-1` → `grandchild-location`, plus sibling
`child-location-2`), this produces `['grandchild-location', 'child-location-1',
'child-location-2']` — every node's descendants precede the node itself, and the top-level parent
is still appended after `childrenIds` by the existing `await deleteData(locationId)` call.

### 2. Deletion is now sequential, not `Promise.all`

Even with the list correctly ordered, `Promise.all(childrenIds.map(id => deleteData(id)))` fires
all deletes concurrently and provides no ordering guarantee at all. Replaced with an ordered
`for...of` loop:

```typescript
for (const id of childrenIds) {
  await deleteData(id);
}
await deleteData(locationId);
```

### Trade-off (deliberate, not a follow-up item)

Sequential deletion is slower than the previous parallel `Promise.all` for deep or wide location
trees — N round trips instead of one batch. This is inherent to guaranteeing deletion order, and
ordering is the entire point of this fix; it is not something to "optimize back" later without
reintroducing the bug. In practice, player-authored location hierarchies in this app (region → city
→ building, at most a handful of levels with a handful of children each) are small enough that the
extra round trips are not user-visible. The transaction-safe/batched-write approach sketched above
under "Recommended Resolution" would recover the single-round-trip cost while preserving order, but
that's a genuine follow-up (it changes the write path to a Firestore batch/transaction) rather than
part of this fix.

### Verification

- `LocationContext.bugs.test.tsx` › `Bug #010: Location Hierarchical Deletion Order Logic` › both
  `should delete children in proper depth-first order` and `should handle sequential deletion
  instead of parallel` now pass.
- `Bug #009: Location ID Generation Collision Risk` (same file) is untouched and still fails by
  design — it's a separate, explicitly deferred bug about ID slug collisions, unrelated to deletion
  order.
- No other test in `LocationContext.behavioral.test.tsx`, the wider `locations` test group, or the
  wider `campaign-entities` test group changed status.

## Related Issues

### Cross-Context Implications
- **NPCContext**: May have similar referential integrity issues
- **QuestContext**: May have relationship deletion ordering problems
- **Database Design**: Need to review all cascading deletion patterns

### Database Considerations
- **Firestore Transactions**: Consider using batched writes for atomicity
- **Referential Integrity**: Implement proper constraint checking
- **Error Handling**: Add rollback mechanisms for failed deletions

## Testing Notes

### Behavioral Testing Effectiveness
- **Real Implementation**: Testing actual deletion logic with mocked database calls
- **Order Verification**: Tests verify exact sequence of database operations
- **Edge Case Coverage**: Complex hierarchies reveal ordering issues

### Coverage Impact
- **Function Coverage**: 100% achieved (deletion logic fully tested)
- **Branch Coverage**: Edge cases in deletion ordering covered
- **Integration Testing**: Would benefit from Firebase emulator testing

## Resolution Priority

### Immediate Actions
1. **Fix Deletion Order**: Implement proper depth-first sequential deletion
2. **Add Transaction Safety**: Use batched writes for atomicity
3. **Error Handling**: Add proper rollback for failed deletions

### Future Enhancements
1. **Database Constraints**: Implement application-level referential integrity
2. **Soft Deletion**: Consider soft delete pattern for safety
3. **Audit Trail**: Track deletion operations for debugging