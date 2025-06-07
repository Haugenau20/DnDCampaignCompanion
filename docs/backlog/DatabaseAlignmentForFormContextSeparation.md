# Database Alignment for Form/Context Separation

## Overview

This document outlines the final phase of the Form/Context Separation refactoring that requires aligning the database layer with the new clean type system. The previous phases have completely rewritten the type system, contexts, and forms to eliminate mixed responsibilities, but the database layer still needs to be updated to work with the new patterns.

## Current State

After completing Phases 1-3 of the refactoring:

- **Types**: All entity types now follow `Entity<DomainData>` pattern with clean separation
- **Contexts**: All contexts use `SystemMetadataService` for consistent attribution metadata
- **Forms**: All forms submit pure `FormData<T>` without system metadata
- **Database**: Still using legacy field names and potentially inconsistent data structures

## Required Changes

### 1. Firebase Schema Migration

#### Attribution Field Standardization

**Current Legacy Fields (inconsistent across entities):**
```typescript
// Old inconsistent attribution fields
dateAdded: string;           // Should be createdAt
dateModified?: string;       // Should be modifiedAt
createdBy: string;
createdByUsername: string;
createdByCharacterId?: string | null;
createdByCharacterName?: string | null;
modifiedBy?: string;         // Should be required
modifiedByUsername?: string; // Should be required
// ... potentially missing fields
```

**New Standardized Fields:**
```typescript
// New consistent SystemMetadata fields
createdAt: string;           // Renamed from dateAdded
modifiedAt: string;          // Renamed from dateModified, now required
createdBy: string;
createdByUsername: string;
createdByCharacterId?: string | null;
createdByCharacterName?: string | null;
modifiedBy: string;          // Now required
modifiedByUsername: string;  // Now required
modifiedByCharacterId?: string | null;
modifiedByCharacterName?: string | null;
```

#### Database Migration Strategy

Since we're not maintaining backwards compatibility, we can do an aggressive migration:

**Option 1: Complete Data Reset (Recommended for Development)**
- Clear all existing data in Firebase emulators
- Regenerate sample data using new schema
- Update any hardcoded test data to use new field names

**Option 2: Data Migration Script (If Production Data Exists)**
- Create migration script to rename fields across all collections
- Ensure all entities have complete SystemMetadata
- Validate data integrity after migration

### 2. Firebase Service Layer Updates

#### Update BaseFirebaseService

The `BaseFirebaseService` class and related Firebase services need to be updated to work with the new type system:

```typescript
// services/firebase/core/BaseFirebaseService.ts
// Update to work with Entity<T> types and SystemMetadata
```

#### Update DocumentService

```typescript
// services/firebase/data/DocumentService.ts
// Ensure all CRUD operations use new type contracts
```

#### Update Collection Queries

All Firebase queries need to be updated to use the new field names:
- `dateAdded` → `createdAt`
- `dateModified` → `modifiedAt`
- Ensure proper indexing for new field names

### 3. Firestore Rules Updates

#### Security Rules Alignment

Update `firebase/firestore.rules` to use new field names:

```javascript
// Old rules referencing dateAdded, dateModified
// Need to be updated to createdAt, modifiedAt

// Ensure all attribution fields are properly validated
// Add rules to ensure SystemMetadata completeness
```

#### Index Updates

Update `firebase/firestore.indexes.json` for new field names:
- Update any indexes using `dateAdded` to use `createdAt`
- Update any indexes using `dateModified` to use `modifiedAt`
- Ensure proper indexing for query performance

### 4. Sample Data Generation

#### Update Data Generators

All sample data generators need to be updated:

```typescript
// src/utils/__dev__/generators/*/
// Update all entity generators to use SystemMetadata format
// Ensure consistent attribution across all generated entities
```

**Files to Update:**
- `campaignGenerator.ts`
- `contentGenerators/chapterGenerator.ts`
- `contentGenerators/locationGenerator.ts`
- `contentGenerators/npcGenerator.ts`
- `contentGenerators/questGenerator.ts`
- `contentGenerators/rumorGenerator.ts`
- `contentGenerators/sagaGenerator.ts`
- `userGenerator.ts`
- `groupGenerator.ts`

#### Update Sample Data Scripts

```typescript
// src/utils/__dev__/generateSampleData.ts
// Ensure all generated data follows new Entity<T> pattern
// Use SystemMetadataService for consistent attribution
```

### 5. Test Data Updates

#### Update Mock Data

```typescript
// src/__mocks__/mockData.ts
// Update all mock entities to use new schema
// Ensure test data has complete SystemMetadata
```

#### Update Component Tests

All component tests that use entity data need to be updated:
- Update test data to use new field names
- Ensure tests work with new type contracts
- Update any hardcoded field references

### 6. Hook Updates

#### Update Firebase Data Hooks

Several hooks may need updates to work with the new type system:

```typescript
// src/hooks/useFirebaseData.ts
// Ensure hook works with Entity<T> types
// Update any field name references

// src/hooks/useNPCData.ts
// src/hooks/useQuestData.ts
// src/hooks/useLocationData.ts
// etc. - Update all entity-specific hooks
```

## Implementation Steps

### Step 1: Database Schema Migration

1. **Clear Development Data:**
   - Stop development environment
   - Clear Firebase emulator data
   - Clear any cached data

2. **Update Field Mappings:**
   - Create a mapping document for field name changes
   - Document any breaking changes for team awareness

### Step 2: Service Layer Updates

1. **Update BaseFirebaseService:**
   - Modify to work with Entity<T> types
   - Ensure SystemMetadata is properly handled
   - Update error handling for new contracts

2. **Update DocumentService:**
   - Align with new type system
   - Update query builders for new field names
   - Test CRUD operations thoroughly

### Step 3: Rules and Indexes

1. **Update Firestore Rules:**
   - Change field name references
   - Add validation for complete SystemMetadata
   - Test security rules thoroughly

2. **Update Indexes:**
   - Modify for new field names
   - Deploy index updates
   - Monitor query performance

### Step 4: Data Generation

1. **Update Generators:**
   - Modify all entity generators
   - Use SystemMetadataService consistently
   - Test generated data structure

2. **Regenerate Sample Data:**
   - Run sample data generation
   - Verify data integrity
   - Test application with new data

### Step 5: Testing and Validation

1. **Integration Testing:**
   - Test full create/read/update/delete flows
   - Verify attribution metadata is correct
   - Test all entity types thoroughly

2. **UI Testing:**
   - Verify forms submit correctly
   - Ensure contexts handle data properly
   - Test edge cases and error scenarios

## Validation Checklist

### Data Integrity
- [ ] All entities have complete SystemMetadata
- [ ] Field names are consistent across all collections
- [ ] Attribution data is properly formatted
- [ ] No legacy field names remain in database

### Functionality
- [ ] Create operations add proper SystemMetadata
- [ ] Update operations update modifiedAt/modifiedBy fields
- [ ] Delete operations work correctly
- [ ] Query operations use correct field names

### Performance
- [ ] Database queries perform efficiently
- [ ] Proper indexes are in place
- [ ] No unnecessary data fetching

### Security
- [ ] Firestore rules work with new schema
- [ ] Data access is properly controlled
- [ ] Attribution data cannot be tampered with

## Risks and Mitigation

### Data Loss Risk
- **Risk**: Incorrect migration could lose data
- **Mitigation**: Work in development environment only, backup before migration

### Performance Impact
- **Risk**: New indexes might affect performance
- **Mitigation**: Monitor query performance, optimize indexes as needed

### Breaking Changes
- **Risk**: Other parts of application might break
- **Mitigation**: Comprehensive testing, systematic updates

## Success Criteria

The database alignment is complete when:

1. **Schema Consistency**: All entities in database use SystemMetadata format
2. **Field Name Consistency**: All legacy field names have been updated
3. **Functional Integrity**: All CRUD operations work with new schema
4. **Performance Maintained**: No significant performance degradation
5. **Security Maintained**: All security rules work with new schema
6. **Test Coverage**: All tests pass with new data structure

## Post-Migration

After completing the database alignment:

1. **Update Documentation**: Reflect new schema in technical documentation
2. **Team Communication**: Inform team of changes and new patterns
3. **Monitoring**: Monitor application for any issues
4. **Performance Tuning**: Optimize queries and indexes as needed

This database alignment will complete the Form/Context Separation refactoring, resulting in a fully consistent architecture from UI components through to data persistence.