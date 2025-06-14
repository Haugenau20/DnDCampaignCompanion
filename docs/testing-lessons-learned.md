# Testing Lessons Learned - NPC Context Implementation

**Purpose**: Document key learnings from NPCContext testing to accelerate testing of other campaign entities (Quest, Location, Rumor, Story contexts).

**Date**: January 2025  
**Source**: Comprehensive NPC Context testing phase  

## Critical Testing Philosophy Reminders

### ⚠️ NEVER Change Tests to Make Them Pass
- **Wrong**: Test expects unique IDs → Code generates duplicates → Change test to expect duplicates
- **Right**: Test expects unique IDs → Code generates duplicates → Document as bug and keep test expectation
- **Key Point**: Tests define correct behavior; bugs are when code doesn't meet the specification

### ✅ Specification-Based Testing Works
- Tests successfully discovered real bugs (ID collision, React key warnings)
- Maintaining strict expectations revealed actual problems that need fixing
- Test failures often indicate real issues, not test problems

## Type System Investigation Lessons

### 1. Always Read Actual Type Definitions First
**Mistake**: Assumed `NPCNote` had complex structure with `id`, `createdBy`, `tags`, etc.  
**Reality**: Simple interface with just `date: string` and `text: string`  
**Time Lost**: ~2 hours fixing tests that used wrong structure  

**Process for Other Contexts**:
```bash
# ALWAYS do this first for each context
cat src/types/quest.ts    # or location.ts, rumor.ts, story.ts
cat src/types/common.ts   # Check BaseContent interface
```

### 2. Check Context Implementation Before Writing Tests
**Lesson**: Read the actual Context file to understand real behavior
```bash
# Do this before writing any tests
cat src/context/QuestContext.tsx  # Understand actual methods and error messages
```

**Key Areas to Check**:
- Error messages (copy exact text for test expectations)
- Required fields in operations
- Authentication requirements
- ID generation logic
- Relationship structures

### 3. Interface Inheritance Patterns
**Discovery**: All entities extend `BaseContent` from `types/common.ts`  
**Implication**: Common fields like `id`, `createdBy`, `dateAdded` are consistent  
**Application**: Can reuse test patterns for common BaseContent functionality  

## Test Infrastructure Lessons

### 1. Test Utility File Strategy That Works
```
src/test-utils/
├── simple-test-utils.tsx        # Lightweight, no Firebase
├── enhanced-test-utils.tsx      # Full context providers  
├── firebase-test-helpers.ts     # Firebase emulator setup
└── test-data-helpers.ts         # Type-safe data creation
```

**Why This Works**:
- `simple-test-utils.tsx` avoids Firebase initialization errors
- Separate helpers prevent circular dependencies
- Type-safe data creation catches interface changes

### 2. React Router Future Flags Are Essential
**Problem**: Deprecation warnings cluttering test output  
**Solution**: Always include in test wrappers:
```tsx
<BrowserRouter future={{ 
  v7_startTransition: true, 
  v7_relativeSplatPath: true 
}}>
```

### 3. Test Isolation Patterns That Work
```tsx
describe('Context Tests', () => {
  let mockState: any;
  
  beforeEach(() => {
    // Create fresh mock instances every time
    mockState = {
      entities: [],
      isLoading: false,
      error: null
    };
    
    // Reset any module-level state
    jest.clearAllMocks();
  });
});
```

**Critical**: Never reuse mock objects between tests - always create fresh instances

## Context Testing Patterns

### 1. Standard Test Suite Structure
For each context (Quest, Location, Rumor, Story), create these test files:

```
src/context/__tests__/
├── EntityContext.crud.test.tsx           # Create, Read, Update, Delete
├── EntityContext.relationships.test.tsx  # Cross-entity dependencies  
├── EntityContext.notes.test.tsx         # Note management (if applicable)
├── EntityContext.auth.test.tsx          # Authentication & authorization
├── EntityContext.utilities.test.tsx     # Helper functions
├── EntityContext.integration.test.tsx   # Real behavior analysis
└── EntityContext.hook-error.test.tsx    # Error boundaries
```

### 2. Relationship Testing Strategy
**NPCs taught us**: Relationships are the most complex part and critical for restructuring

**For each entity, test**:
- Bidirectional relationships (if Entity A references B, does B reference A?)
- Filtering by related entities
- Relationship updates and integrity
- Circular reference handling
- Missing/malformed relationship data

**Template**:
```tsx
describe('Entity-Quest Relationships', () => {
  test('should handle bidirectional Entity-Quest relationships', () => {
    // Create entity with quest reference
    // Verify quest references entity back
    // Test filtering in both directions
  });
});
```

### 3. Authentication Testing Template
**Discovered Pattern**: All contexts have similar auth requirements

```tsx
describe('Authentication Requirements', () => {
  test('should define required authentication operations', () => {
    const authRequiredOperations = [
      'addEntity',
      'updateEntity', 
      'deleteEntity',
      'updateEntityNote',        // if notes supported
      'updateEntityRelationship' // if relationships supported
    ];
    
    const readOperations = [
      'getEntityById',
      'getEntitiesByQuest',      // adapt to actual relationships
      'getEntitiesByLocation'    // adapt to actual relationships
    ];
  });
});
```

## Bug Discovery Patterns

### 1. ID Generation Testing Template
**Every context likely has same ID generation pattern**:
```tsx
test('should document ID generation behavior', () => {
  const generateEntityId = (name: string): string => {
    return name.toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Test collision scenarios
  expect(generateEntityId('Test Entity')).toBe('test-entity');
  expect(generateEntityId('TEST ENTITY')).toBe('test-entity'); // Same ID!
  
  // Document as potential bug if no uniqueness mechanism
});
```

### 2. React Key Warning Detection
**Template for all contexts**:
```tsx
test('should render Entity list without React key warnings', () => {
  const consoleSpy = jest.spyOn(console, 'warn');
  
  // Add multiple entities and render list
  
  expect(consoleSpy).not.toHaveBeenCalledWith(
    expect.stringContaining('Encountered two children with the same key')
  );
});
```

## Time-Saving Strategies

### 1. Copy-Paste Templates That Work
**Base CRUD Test Template**:
```tsx
describe('EntityContext CRUD Operations', () => {
  let mockState: EntityContextState;
  let mockOperations: any;

  beforeEach(() => {
    mockState = {
      entities: [],
      isLoading: false,
      error: null
    };
    
    mockOperations = {
      addEntity: jest.fn(),
      updateEntity: jest.fn(),
      deleteEntity: jest.fn(),
      getEntityById: jest.fn()
    };
  });

  test('should start with empty entity list', () => {
    expect(mockState.entities).toEqual([]);
    expect(mockState.isLoading).toBe(false);
    expect(mockState.error).toBeNull();
  });
  
  // Add other CRUD tests following same pattern
});
```

### 2. Test Data Helper Generation Strategy
**For each entity, create helpers like**:
```tsx
export const createTestQuest = (overrides: Partial<Quest> = {}): Quest => {
  return {
    id: `quest-${Date.now()}-${Math.random()}`,
    name: 'Default Quest Name',
    description: 'Default quest description',
    status: 'active',
    // ... other required fields from Quest interface
    connections: {
      relatedNPCs: [],
      relatedLocations: [],
      // ... other relationship arrays
    },
    notes: [],
    createdBy: 'test-user',
    createdByUsername: 'TestUser',
    dateAdded: new Date().toISOString(),
    ...overrides
  };
};
```

### 3. Error Message Documentation Strategy
**For each context, extract actual error messages**:
```bash
# Search for error messages in context file
grep -n "throw new Error\|console.error" src/context/QuestContext.tsx
```

**Then document exactly as they appear in tests - don't guess!**

## Common Pitfalls to Avoid

### 1. ❌ Don't Assume Type Structures
- Always read the actual interface files
- Don't copy-paste from other contexts without checking
- Interfaces may be simpler or more complex than expected

### 2. ❌ Don't Skip Relationship Testing
- NPCs showed us relationships are most complex
- Cross-feature dependencies are critical for restructuring
- Relationship bugs cause data integrity issues

### 3. ❌ Don't Mock What You're Testing
- Test the actual context logic, not mocked versions
- Use simple test utilities to avoid Firebase, but test real logic
- Mock external dependencies, not the code under test

### 4. ❌ Don't Change Tests to Match Bugs
- If test expects unique IDs but code generates duplicates, that's a bug
- Document the bug, don't change the test
- Specification-based testing reveals problems

## Reusable Test Utilities (Already Created)

### Leverage Existing Infrastructure
```tsx
// These are ready to use for other contexts:
import { render } from '../../test-utils/simple-test-utils';           // No Firebase issues
import { renderWithProviders } from '../../test-utils/enhanced-test-utils'; // Full context
import { createMockFirebaseContext } from '../../test-utils/firebase-test-helpers'; // Firebase setup
```

### Test Data Pattern to Follow
```tsx
// Follow this pattern for each entity type
import { createTestQuest, createTestLocation, createTestRumor, createTestStory } from '../../test-utils/test-data-helpers';
```

## Validation Checklist for Each Context

### ✅ Before Writing Tests
- [ ] Read actual interface files (`src/types/[entity].ts`)
- [ ] Read actual context implementation (`src/context/[Entity]Context.tsx`)
- [ ] Identify unique relationships for this entity
- [ ] Check if entity supports notes/comments
- [ ] Document actual error messages

### ✅ During Test Writing
- [ ] Start with simple structure validation
- [ ] Test CRUD operations with specification expectations
- [ ] Test all unique relationships for this entity
- [ ] Test authentication requirements
- [ ] Use actual error message text, not assumptions

### ✅ After Tests Complete
- [ ] Run tests and document any discovered bugs
- [ ] Verify no false positives due to poor test isolation
- [ ] Check that tests reveal problems, don't hide them
- [ ] Document any entity-specific patterns for future reference

## Expected Time Savings

**Estimated time per context using these lessons**:
- **Without lessons**: 8-12 hours per context (based on NPC experience)
- **With lessons**: 3-5 hours per context
- **Savings**: ~60% time reduction due to proven patterns and avoiding pitfalls

**Total estimated time for remaining contexts**:
- Quest Context: 3-4 hours
- Location Context: 3-4 hours  
- Rumor Context: 3-4 hours
- Story Context: 4-5 hours (likely most complex)

## Success Metrics

**For each context, aim for**:
- 90%+ test pass rate (skipping Firebase-dependent tests is OK)
- Discovery of at least 1-2 real bugs or issues
- Complete coverage of CRUD, relationships, auth, and utilities
- Reusable test patterns that accelerate subsequent contexts

## Next Context Recommendation

**Start with Quest Context** - likely has most relationships with other entities, similar to NPCs. Apply these lessons and refine the approach before tackling Location, Rumor, and Story contexts.