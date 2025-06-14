# Test Organization Structure

This directory contains tests for React Context providers, organized by testing approach and scope.

## Directory Structure

```
src/context/__tests__/
├── behavioral/           # Behavioral tests - test actual context logic with mocked dependencies
│   ├── NPCContext.behavioral.test.tsx     # ✅ Complete NPC behavioral tests
│   ├── NPCContext.notes.test.tsx          # ✅ NPC note management tests
│   ├── QuestContext.behavioral.test.tsx   # ✅ Complete Quest behavioral tests
│   └── QuestContext.objectives.test.tsx   # ✅ Quest objective management tests
├── integration/          # Integration tests - test context + Firebase interaction (future)
├── legacy/              # Old tests awaiting behavioral conversion
│   └── NoteContext.test.tsx               # TODO: Convert to behavioral pattern
└── README.md           # This file
```

## Test Categories

### 1. Behavioral Tests (`/behavioral`)
**Purpose**: Test actual context behavior with mocked external dependencies

**Characteristics**:
- ✅ Uses real Context Providers and hooks
- ✅ Mocks only Firebase dependencies (`useAuth`, `useFirebaseData`, etc.)
- ✅ Tests actual context logic (black box testing)
- ✅ Can discover real bugs in implementation
- ✅ Validates user-facing behavior

**Example**:
```typescript
// behavioral/NPCContext.behavioral.test.tsx
test('should reject NPC creation without authentication', async () => {
  // Mock unauthenticated state
  mockUseAuth.mockReturnValue({ user: null });
  
  // Test real NPC context behavior
  const npcContext = useNPCs(); // Real hook!
  
  // Should throw real authentication error
  await expect(npcContext.addNPC(npcData)).rejects.toThrow(
    'User must be authenticated to add an NPC'
  );
});
```

### 2. Integration Tests (`/integration`)
**Purpose**: Test context + Firebase interaction end-to-end

**Characteristics**:
- Uses real Context Providers
- Uses Firebase emulators for real database operations
- Tests complete workflows from context to database
- Validates data persistence and retrieval
- Tests real user scenarios

**Example**:
```typescript
// integration/NPCContext.integration.test.tsx
test('should create NPC and persist to Firebase', async () => {
  // Uses real Firebase emulator
  const npcContext = useNPCs();
  
  const npcId = await npcContext.addNPC(npcData);
  
  // Verify NPC exists in Firebase
  const retrievedNPC = await npcContext.getNPCById(npcId);
  expect(retrievedNPC).toMatchObject(npcData);
});
```

### 3. Legacy Tests (`/legacy`)
**Purpose**: Tests awaiting conversion to behavioral pattern

**Current Status**:
- ✅ **NPC & Quest**: All legacy tests removed (replaced by comprehensive behavioral tests)
- ⏳ **NoteContext**: Awaiting behavioral conversion
- 📋 **Future contexts**: New contexts should start with behavioral tests

**Migration Path**: Convert remaining tests to behavioral pattern in `/behavioral` directory

## Testing Principles

### ✅ Behavioral Testing (Preferred)

**Follow These Principles**:
1. **Test Real Code**: Use actual Context Providers and hooks
2. **Mock Dependencies**: Only mock external dependencies (Firebase, APIs)
3. **Black Box Testing**: Test behavior, not implementation details
4. **Specification-Based**: Define what SHOULD happen, let tests reveal bugs
5. **User-Focused**: Test from user perspective, not developer perspective

### ❌ Mock-Based Testing (Deprecated)

**Avoid These Patterns**:
1. Mocking the context being tested
2. Testing mock implementations instead of real code
3. Tests that can never fail (always pass because you control mocks)
4. Testing implementation details instead of behavior
5. Tests that don't exercise actual context logic

## File Naming Convention

### Behavioral Tests
- `{Context}Context.behavioral.test.tsx` - Main behavioral test suite
- `{Context}Context.{feature}.test.tsx` - Feature-specific behavioral tests

**Examples**:
- `NPCContext.behavioral.test.tsx` - Main NPC behavioral tests
- `QuestContext.objectives.test.tsx` - Quest objective management tests

### Integration Tests
- `{Context}Context.integration.test.tsx` - Integration with Firebase
- `{Context}Context.e2e.test.tsx` - End-to-end user workflow tests

### Legacy Tests
- Keep original filenames when moving to `/legacy`
- Add `// DEPRECATED` comment at top of file

## Running Tests

### Run Behavioral Tests Only
```bash
npm test -- src/context/__tests__/behavioral
```

### Run Integration Tests Only
```bash
npm test -- src/context/__tests__/integration
```

### Run All Context Tests
```bash
npm test -- src/context/__tests__
```

### Run Specific Context
```bash
npm test -- src/context/__tests__/behavioral/NPCContext
```

## Migration Checklist

When converting legacy tests to behavioral tests:

### ✅ Before (Legacy Pattern)
```typescript
// ❌ Wrong: Testing mocks
jest.mock('../NPCContext', () => ({
  useNPCs: () => mockNPCOperations
}));

test('should call addNPC with correct data', () => {
  mockNPCOperations.addNPC(npcData);
  expect(mockNPCOperations.addNPC).toHaveBeenCalledWith(npcData);
});
```

### ✅ After (Behavioral Pattern)
```typescript
// ✅ Right: Testing real context with mocked dependencies
jest.mock('../firebase', () => ({
  useAuth: () => mockUseAuth(),
  useFirebaseData: () => mockUseFirebaseData()
}));

test('should create NPC with proper authentication', async () => {
  const npcContext = useNPCs(); // Real context!
  await expect(npcContext.addNPC(npcData)).rejects.toThrow(/authenticated/);
});
```

### Conversion Steps (For Remaining Contexts)
1. ✅ Move legacy test to `/legacy` directory
2. ✅ Create new behavioral test in `/behavioral` directory
3. ✅ Mock Firebase dependencies, not the context itself
4. ✅ Test actual context behavior and logic
5. ✅ Verify tests can discover real bugs
6. ✅ Remove legacy test once behavioral coverage is complete

## Benefits of New Structure

### Organization Benefits
- **Clear Separation**: Behavioral vs Integration vs Legacy
- **Easy Navigation**: Find right test type quickly
- **Scalable**: Add new contexts without cluttering
- **Migration Path**: Gradual transition from legacy to behavioral

### Testing Benefits
- **Real Coverage**: Tests actually validate context functionality
- **Bug Discovery**: Can find implementation issues
- **Confidence**: Tests prove code works correctly
- **Maintainability**: Tests only break when specifications change

### Development Benefits
- **Faster Debugging**: Behavioral tests reveal actual problems
- **Refactoring Safety**: Tests protect against breaking changes
- **Documentation**: Tests serve as behavior specifications
- **Quality Assurance**: Prevents regression issues

## Current Status & Next Steps

### ✅ Completed
1. **NPC Context**: Complete behavioral test coverage (15 tests)
2. **Quest Context**: Complete behavioral test coverage (35 tests)
3. **Test Organization**: Clean directory structure established
4. **Legacy Cleanup**: All obsolete NPC/Quest tests removed

### 🔄 Next Steps
1. **NoteContext**: Convert legacy test to behavioral pattern
2. **Other Contexts**: Create behavioral tests for Location, Rumor, Story contexts
3. **Integration Tests**: Add Firebase emulator integration tests
4. **Documentation**: Keep README updated as new contexts are added

### 📊 Test Coverage Summary
- **Total Behavioral Tests**: 50 tests passing
- **NPC Context**: ✅ Complete (behavioral + notes)
- **Quest Context**: ✅ Complete (behavioral + objectives)
- **Note Context**: ⏳ Legacy pattern (needs conversion)
- **Other Contexts**: 📋 Not yet implemented