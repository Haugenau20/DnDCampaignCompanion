# Bug #023: entityMapper.ts — extractDetailsByType has empty body

**Status**: 🔍 DISCOVERED  
**Priority**: High  
**Category**: DATA  
**Context**: EntityExtractionService / entityMapper  
**Discovery Date**: 2026-05-19  
**Discovery Method**: Unit Testing (service slice)

## Summary

`extractDetailsByType` in `src/services/firebase/ai/entityMapper.ts` has a completely empty function body — it contains only a comment `// ... (copy the full implementation)` and returns `undefined` for every call. The function is exported and is the canonical implementation for mapping OpenAI entity detail objects into typed detail maps by entity type. The full, working implementation exists in `EntityExtractionService.ts` as a private arrow function, but was never copied across.

## Bug Details

### Location
- **File**: `src/services/firebase/ai/entityMapper.ts`
- **Lines**: 40–44 — `extractDetailsByType` function body
- **Functions**: `extractDetailsByType`

### Expected Behavior
```typescript
// EXPECTED: Per JSDoc and EntityExtractionService.ts private implementation
extractDetailsByType({ name: 'Gandalf', relationship: 'friendly', context: 'tavern' }, 'npc')
// Should return:
// { name: 'Gandalf', title: undefined, race: undefined, occupation: undefined,
//   location: undefined, relationship: 'friendly', description: undefined, context: 'tavern' }

extractDetailsByType({ name: 'Bree', locationType: 'town', context: 'settlement' }, 'location')
// Should return:
// { name: 'Bree', locationType: 'town', description: undefined, parentLocation: undefined, context: 'settlement' }
```

### Actual Behavior
```typescript
// ACTUAL: Function returns undefined for every input
extractDetailsByType(details, 'npc')     // → undefined
extractDetailsByType(details, 'location') // → undefined
extractDetailsByType(details, 'quest')    // → undefined
extractDetailsByType(details, 'rumor')    // → undefined
```

## Test Evidence

### Failing Tests (8 tests in entityMapper.test.ts)

```typescript
// src/services/firebase/ai/__tests__/entityMapper.test.ts

test('should return npc-specific fields for type "npc"', () => {
  const result = extractDetailsByType(npcDetails, 'npc');
  expect(result).toHaveProperty('name', 'Strider'); // FAILS — result is undefined
});

test('should return location-specific fields for type "location"', () => {
  const result = extractDetailsByType(locationDetails, 'location');
  expect(result).toHaveProperty('name', 'Bree'); // FAILS — result is undefined
});

test('should return quest-specific fields for type "quest"', () => {
  const result = extractDetailsByType(questDetails, 'quest');
  expect(result).toHaveProperty('title', 'Destroy the One Ring'); // FAILS
});

test('should return rumor-specific fields for type "rumor"', () => {
  const result = extractDetailsByType(rumorDetails, 'rumor');
  expect(result).toHaveProperty('title', 'Strange lights'); // FAILS
});

// ... plus 4 more default-value tests all failing with TypeError on undefined
```

### Error Output
```
TypeError: Cannot read properties of undefined (reading 'objectives')
  at entityMapper.test.ts:237:21

expect(received).toHaveProperty(path, value)
  Matcher error: received value must not be null nor undefined
  Received has value: undefined
```

## Root Cause Analysis

The file comment reveals the intent:
```typescript
// Copy the extractDetailsByType function from entityExtractor.ts here
export const extractDetailsByType = (
  details: any,
  type: EntityType
): any => {
  // ... (copy the full implementation)  ← placeholder never replaced
};
```

The developer intended to copy the switch-case implementation from `EntityExtractionService.ts` (which has it as a private arrow function at lines 231–276) but left a placeholder comment and never completed the copy.

### Working Implementation (exists in EntityExtractionService.ts)
```typescript
// Lines 231–276 of EntityExtractionService.ts — the working private method:
private extractDetailsByType = (details: ExtractedEntityDetails, type: EntityType): any => {
  switch (type) {
    case 'npc':
      return { name, title, race, occupation, location, relationship: ... || 'unknown', description, context };
    case 'location':
      return { name, locationType, description, parentLocation, context };
    case 'quest':
      return { title, description, objectives: ... || [], NPCsInvolved: ... || [], locationName, context };
    case 'rumor':
      return { title, content, status, sourceType, sourceName, context };
    default:
      return details;
  }
};
```

## Impact Assessment

### Functional Impact (High)
- `mapOpenAIEntityToExtractedEntity` in `entityMapper.ts` calls `extractDetailsByType` to populate `extraData`
- Because `extractDetailsByType` returns `undefined`, when entities use the "details" format, `extraData` will contain `{ ...undefined, originalText: '...' }` which silently produces `{ originalText: '...' }` only
- All type-specific fields (name, relationship, locationType, title, etc.) are silently lost
- Entity extraction UI will display entities without meaningful detail fields

### Severity: High
- Exported public function behaves like a no-op
- Silent data loss — no error thrown, just empty extraData
- The private copy in `EntityExtractionService` works fine, but this exported version is broken

## Recommended Resolution

Copy the switch-case implementation from `EntityExtractionService.ts` into `entityMapper.ts`:

```typescript
export const extractDetailsByType = (
  details: any,
  type: EntityType
): any => {
  switch (type) {
    case 'npc':
      return {
        name: details.name,
        title: details.title,
        race: details.race,
        occupation: details.occupation,
        location: details.location,
        relationship: details.relationship || 'unknown',
        description: details.description,
        context: details.context,
      };
    case 'location':
      return {
        name: details.name,
        locationType: details.locationType,
        description: details.description,
        parentLocation: details.parentLocation,
        context: details.context,
      };
    case 'quest':
      return {
        title: details.title,
        description: details.description,
        objectives: details.objectives || [],
        NPCsInvolved: details.NPCsInvolved || [],
        locationName: details.locationName,
        context: details.context,
      };
    case 'rumor':
      return {
        title: details.title,
        content: details.content,
        status: details.status,
        sourceType: details.sourceType,
        sourceName: details.sourceName,
        context: details.context,
      };
    default:
      return details;
  }
};
```

After this fix, all 8 failing unit tests should turn green.
