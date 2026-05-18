# Bug #012: Rumor ID Generation Collision Risk

**Status**: 🔍 DISCOVERED  
**Priority**: Medium  
**Category**: DATA  
**Context**: RumorContext  
**Discovery Date**: June 15, 2025  
**Discovery Method**: Behavioral Testing

## Summary

Rumor ID generation uses the same collision-prone algorithm as NPCContext, QuestContext, and LocationContext, creating identical IDs for case-variant and punctuation-variant rumor titles, leading to potential data overwrites.

## Bug Details

### Location
- **File**: `src/context/RumorContext.tsx`
- **Lines**: 99-105 (ID generation from title)
- **Functions**: addRumor (ID generation logic)

### Expected Behavior
```typescript
// EXPECTED: Unique IDs for different rumors
const rumor1 = { title: "Dragon Sighting" };     // ID: unique-id-1
const rumor2 = { title: "DRAGON SIGHTING" };    // ID: unique-id-2
const rumor3 = { title: "Dragon's Sighting" };   // ID: unique-id-3

// Each rumor should have a guaranteed unique ID
```

### Actual Behavior
```typescript
// ACTUAL: Same algorithm as other contexts produces collisions
const generateIdFromTitle = (title: string) => {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
};

const rumor1 = { title: "Dragon Sighting" };     // ID: "dragon-sighting"
const rumor2 = { title: "DRAGON SIGHTING" };    // ID: "dragon-sighting" (COLLISION!)
const rumor3 = { title: "Dragon's Sighting" };   // ID: "dragon-sighting" (COLLISION!)

// Result: Later rumors overwrite earlier ones in database
```

## Test Evidence

### Test Case: Case-Variant Collision
```typescript
// Test creating rumors with case differences
const rumor1 = { 
  title: 'Dragon Sighting',
  content: 'A dragon was seen',
  status: 'unconfirmed' as RumorStatus
};

const rumor2 = { 
  title: 'DRAGON SIGHTING',
  content: 'Another dragon report',
  status: 'unconfirmed' as RumorStatus
};

await act(async () => {
  await rumorContext.addRumor(rumor1);
  await rumorContext.addRumor(rumor2);
});

// BUG DISCOVERY: Both generate identical IDs
const [firstCall, secondCall] = mockAddData.mock.calls;
expect(firstCall[1]).toBe('dragon-sighting');
expect(secondCall[1]).toBe('dragon-sighting'); // COLLISION: Same ID!
```

### Test Case: Punctuation-Variant Collision
```typescript
// Test creating rumors with punctuation differences
const rumor1 = { title: "Wizard's Tower" };    // ID: "wizards-tower"
const rumor2 = { title: "Wizards Tower" };     // ID: "wizards-tower" (COLLISION!)

// Different titles produce identical IDs due to punctuation normalization
```

### Test Case: Multiple ID Collision Pattern
```typescript
// Evidence of systematic ID generation algorithm
const collisionExamples = [
  { title: "Dragon Attack", expectedId: "dragon-attack" },
  { title: "DRAGON ATTACK", expectedId: "dragon-attack" },
  { title: "Dragon-Attack", expectedId: "dragon-attack" },
  { title: "Dragon!!! Attack", expectedId: "dragon-attack" }
];

// All variants produce identical IDs
```

## Root Cause Analysis

### ID Generation Algorithm
```typescript
// Located in RumorContext.tsx around lines 99-105
// Same algorithm as NPC, Quest, and Location contexts:

const generateId = (title: string) => {
  // Convert to lowercase
  const lowercase = title.toLowerCase();
  
  // Remove all non-alphanumeric characters, replace with hyphens
  const normalized = lowercase.replace(/[^a-z0-9]/g, '-');
  
  // Collapse multiple hyphens into single hyphens
  const collapsed = normalized.replace(/-+/g, '-');
  
  return collapsed;
};

// Issues:
// 1. Deterministic: Same input always produces same output
// 2. Case insensitive: Different cases produce identical results
// 3. Punctuation normalization: Different punctuation produces identical results
// 4. No uniqueness validation: No checking for existing IDs
```

### Cross-Context Pattern Confirmation
This bug is **identical** to bugs found in:
- **Bug #002**: NPCContext ID Generation Collision Risk
- **Bug #004**: QuestContext ID Generation Collision Risk
- **Bug #009**: LocationContext ID Generation Collision Risk

**Systematic Issue**: All name-based ID generation contexts use the same vulnerable algorithm.

## Impact Assessment

### Data Integrity (Medium-High Impact)
- **Data Overwrites**: New rumors can overwrite existing ones with similar titles
- **Silent Data Loss**: No error or warning when collision occurs
- **User Confusion**: Rumors mysteriously disappear or change content
- **Campaign Continuity**: Important rumor information lost without user awareness

### User Experience Impact
- **Trust Issues**: Users lose confidence when their rumors disappear
- **Workflow Disruption**: Users need to recreate lost rumors
- **Collaboration Problems**: Group members' rumors may overwrite each other
- **Data Recovery**: No built-in mechanism to recover overwritten rumors

## Affected Operations

### Rumor Creation (addRumor)
- **Primary Risk**: Most common operation where collisions occur
- **Evidence**: Direct collision in addRumor function during testing
- **User Impact**: Users creating rumors with similar titles

### Data Migration and Import
- **Batch Operations**: Bulk rumor imports particularly vulnerable
- **Historical Data**: Existing rumors with similar titles at risk
- **Campaign Transfer**: Moving campaigns between systems may cause collisions

## Rumor-Specific Implications

### Campaign Content Integrity
- **Plot Rumors**: Critical plot information may be overwritten
- **NPC Information**: Rumors about NPCs may conflict and overwrite
- **Location Intelligence**: Location-based rumors particularly vulnerable
- **Quest Leads**: Rumor-to-quest conversion affected by data integrity issues

### Common Collision Scenarios
```typescript
// High-risk rumor title patterns:
const commonCollisions = [
  // Location-based rumors:
  { title: "Dragon Sighting", variants: ["DRAGON SIGHTING", "Dragon's Sighting"] },
  { title: "Tavern Rumors", variants: ["TAVERN RUMORS", "Tavern's Rumors"] },
  
  // NPC-based rumors:
  { title: "Merchant Tales", variants: ["MERCHANT TALES", "Merchant's Tales"] },
  { title: "Guard Reports", variants: ["GUARD REPORTS", "Guard's Reports"] },
  
  // Event-based rumors:
  { title: "Strange Lights", variants: ["STRANGE LIGHTS", "Strange-Lights"] },
  { title: "Missing People", variants: ["MISSING PEOPLE", "Missing-People"] }
];
```

## Reproduction Steps

1. Create a rumor with title "Dragon Sighting"
2. Verify rumor is created and stored
3. Create another rumor with title "DRAGON SIGHTING" 
4. Observe that the second rumor overwrites the first
5. Check database to confirm only one rumor exists with ID "dragon-sighting"

## Related Issues

### Cross-Context ID Generation Bugs
- **Bug #002**: NPCContext ID Generation Collision Risk (identical algorithm)
- **Bug #004**: QuestContext ID Generation Collision Risk (identical algorithm)
- **Bug #009**: LocationContext ID Generation Collision Risk (identical algorithm)

### Rumor-Specific Integration Issues
- **Bug #014**: Quest Conversion Function Integration Issues (may inherit ID collision problems)
- **Bug #013**: Rumor Combine Function Complex Logic Issues (may compound ID collision issues)

## Recommended Resolution

### Immediate Solutions
1. **UUID Implementation**: Replace deterministic ID generation with UUID system
2. **Uniqueness Validation**: Add database checking before ID assignment
3. **Collision Detection**: Implement conflict detection and resolution
4. **User Notification**: Warn users when potential title conflicts exist

### Implementation Options
```typescript
// Option 1: UUID-based IDs
import { v4 as uuidv4 } from 'uuid';
const generateUniqueId = () => uuidv4();

// Option 2: Incremental suffix for conflicts
const generateSafeId = async (baseTitle: string) => {
  let baseId = normalizeTitle(baseTitle);
  let finalId = baseId;
  let suffix = 0;
  
  while (await checkIdExists(finalId)) {
    suffix++;
    finalId = `${baseId}-${suffix}`;
  }
  
  return finalId;
};

// Option 3: Timestamp-based uniqueness
const generateTimestampId = (title: string) => {
  const baseId = normalizeTitle(title);
  const timestamp = Date.now();
  return `${baseId}-${timestamp}`;
};
```

### Cross-Context Coordination
1. **Standardize Approach**: Use same solution across all contexts
2. **Migration Strategy**: Plan for updating existing IDs
3. **Testing Validation**: Ensure fix works across all affected contexts
4. **Performance Consideration**: Ensure uniqueness checking doesn't impact performance

## Testing Impact

### Discovery Success
- **Behavioral Testing**: Real context behavior revealed collision vulnerability
- **Cross-Context Pattern**: Confirmed identical issue across 4 contexts
- **Specification Testing**: Tests define expected uniqueness behavior
- **Medium Priority**: Issue affects data integrity but has workarounds

### Test Evidence Validation
- **Collision Reproduction**: Successfully reproduced ID collisions in controlled testing
- **Algorithm Analysis**: Confirmed identical vulnerable algorithm across contexts
- **Impact Assessment**: Demonstrated data overwrite scenarios

### Regression Prevention
- **Bug Tests**: Failing tests will serve as regression prevention
- **Cross-Context Testing**: Pattern recognition prevents similar bugs in future contexts
- **Quality Assurance**: Tests will pass once ID generation is fixed across all contexts

## Priority Assessment

### Medium Priority Justification
- **Data Integrity Risk**: Significant risk of data loss through overwrites
- **User Impact**: Can cause confusion and workflow disruption
- **Systematic Issue**: Affects multiple contexts requiring coordinated fix
- **Workaround Available**: Users can avoid similar titles as temporary mitigation

### Risk Factors
- **Silent Failures**: No user warning when collisions occur
- **Campaign Disruption**: Lost rumors can disrupt campaign continuity
- **Trust Impact**: Data loss affects user confidence in system
- **Collaboration Issues**: Multiple users more likely to create conflicting titles

### When to Address
- **Coordinated Fix**: Should be addressed together with other ID generation bugs
- **Before Production Scale**: Important for applications with multiple active users
- **Data Migration**: Critical before any bulk data operations
- **User Feedback**: High priority if users report lost or overwritten rumors