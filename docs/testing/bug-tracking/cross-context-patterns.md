# Cross-Context Bug Patterns Analysis

**Date**: June 15, 2025  
**Analysis Scope**: NPCContext, QuestContext, LocationContext, RumorContext, StoryContext  
**Discovery Method**: Behavioral Testing Methodology  

> ⚠️ **Read this before using anything below. Revised 2026-07-28.**
>
> **Pattern 1 has been struck — it was never real**, and as this document's self-declared
> "highest priority systematic issue" it misdirected priority for over a year. Its premise is
> false against `src/core/utils/user-utils.ts`. The strike, the verified source, and what
> actually caused the symptom are recorded in place, in section 1.
>
> The remaining patterns are **descriptive, not verified**. This document was written from test
> output in June 2025, before the feature-first restructuring, and its file paths and line
> numbers are stale throughout. Where it disagrees with
> `docs/testing/phase4-audit-worksheet.md`, that worksheet wins — every verdict in it was
> reached by reading current production code, with the code quoted.
>
> **The general caution this document earned**: a pattern synthesised from several contexts'
> test output inherits every one of those tests' harness assumptions. Agreement across five
> contexts felt like five independent confirmations; it was one shared mock shape, counted five
> times. Confirm a root cause against production source directly before acting on it.

## 🔍 **Systematic Bug Patterns Discovered**

Through comprehensive behavioral testing across 5 campaign entity contexts, we have identified **systematic bug patterns** that affect multiple or all contexts. These patterns represent architectural and implementation issues that require coordinated fixes across the entire codebase.

## 1. ~~User Attribution Metadata Failures (CRITICAL PATTERN)~~ — ❌ STRUCK 2026-07-28

> **This pattern was never real. Its central claim is false, and it steered priority for over a
> year.** Struck rather than deleted, because how it went wrong is the useful part.
>
> **The claim**: that `getUserName` and `getActiveCharacterName` "consistently return empty/null
> values," making this "the highest priority systematic issue" in the codebase.
>
> **What the code actually says** (`src/core/utils/user-utils.ts`, verified 2026-07-28):
> ```ts
> export const getUserName = (userProfile: any): string => {
>   return userProfile?.username || '';
> };
> ```
> It returns the username whenever one is present. It returns `''` only when handed a profile that
> has no `username` — which is correct behaviour, not a defect. `getActiveCharacterName` likewise
> resolves the active character correctly and returns `null` only when there genuinely isn't one.
>
> **What actually produced the observed empties**: the shape of the mock profile in the tests. The
> symptom was in the harness, never in production. This is the same failure mode that produced five
> retracted tracker entries (#013, #014, #300, #021, #022) — a red or surprising test result was
> read as a production defect without first confirming the production code could produce it.
>
> **What became of the three bugs cited as evidence**: #008, #011 and #015 are all ✅ FIXED — closed
> by the PR #16 attribution consolidation, which made `src/core/attribution/` the single place
> attribution values are built and `DocumentService` the single write path that applies them. Note
> that the consolidation was worth doing on its own merits; it did not fix the defect this pattern
> described, because there was no such defect.
>
> **Lesson**: a pattern assembled from several contexts' test output inherits every one of those
> tests' harness assumptions. Cross-context analysis multiplies confidence, but it multiplies a
> shared systematic error just as readily. Confirm the root cause against production source once,
> directly, before promoting anything to "highest priority."

## 2. ID Generation Collision Vulnerabilities (ARCHITECTURAL PATTERN)

### **Affected Contexts**: 5/5 (Different Severity Levels)
- ✅ **NPCContext**: Bug #002 - ID Generation Collision Risk
- ✅ **QuestContext**: Bug #004 - ID Generation Collision Risk
- ✅ **LocationContext**: Bug #009 - ID Generation Collision Risk
- ✅ **RumorContext**: Bug #012 - ID Generation Collision Risk
- ✅ **StoryContext**: Bug #016 - Chapter ID Generation System Issues (Different approach, still has edge cases)

### **Pattern Description**
**Name-Based ID Generation** (NPC, Quest, Location, Rumor):
```typescript
// SYSTEMATIC VULNERABILITY PATTERN:
const generateId = (name: string) => {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
};

// COLLISION EXAMPLES:
generateId("Dragon Sighting") === generateId("DRAGON SIGHTING") === "dragon-sighting"
generateId("Wizard's Tower") === generateId("Wizards Tower") === "wizards-tower"
```

**Order-Based ID Generation** (Story):
```typescript
// BETTER BUT STILL HAS EDGE CASES:
const generateChapterId = (order: number) => {
  return `chapter-${order.toString().padStart(2, '0')}`;
};

// EDGE CASE ISSUES:
// - No validation for extreme values
// - Race conditions during reordering
// - No upper limit constraints
```

### **Root Cause Analysis**
- **Deterministic Algorithm**: Same input always produces same output
- **No Uniqueness Validation**: No checking for existing IDs before creation
- **Case Insensitivity**: Different casing produces identical IDs
- **Character Normalization**: Punctuation differences ignored

### **Impact Assessment**
- **Data Overwrites**: New entities can overwrite existing ones
- **Silent Failures**: No error when collision occurs
- **User Confusion**: Entities mysteriously disappear or change
- **Data Loss**: Critical issue for data integrity

### **Evidence Pattern**
```typescript
// TEST EVIDENCE across all name-based contexts:
const entity1 = { name: "Dragon Sighting" };    // ID: "dragon-sighting"
const entity2 = { name: "DRAGON SIGHTING" };   // ID: "dragon-sighting" (COLLISION!)

// Result: entity2 overwrites entity1 in database
```

### **Resolution Priority**: MEDIUM (Systematic Architecture Change Required)

## 3. Validation Inconsistency Patterns (USER EXPERIENCE PATTERN)

### **Affected Contexts**: 5/5 (Various Manifestations)
- ✅ **NPCContext**: Bug #006 - Missing Entity Existence Validation
- ✅ **QuestContext**: Mentioned in cross-context validation analysis
- ✅ **LocationContext**: Hierarchical validation issues
- ✅ **RumorContext**: Complex function validation gaps
- ✅ **StoryContext**: Bug #019 - Chapter Order Validation Issues

### **Pattern Description**
```typescript
// INCONSISTENT VALIDATION PATTERNS:

// Some contexts validate authentication first:
if (!user) throw new Error('User must be authenticated');
if (!entity) throw new Error('Entity not found');

// Others check existence first:
if (!entity) throw new Error('Entity not found');  
if (!user) throw new Error('User must be authenticated');

// Some have no validation at all for certain operations
```

### **Root Cause Analysis**
- **No Standard Pattern**: Each context implements validation differently
- **Missing Validation**: Some operations lack proper input validation
- **Error Message Inconsistency**: Different error messages for similar conditions
- **Edge Case Gaps**: Complex operations often lack validation

### **Impact Assessment**
- **User Experience**: Inconsistent error messages confuse users
- **Data Integrity**: Missing validation allows invalid operations
- **Developer Experience**: Inconsistent patterns make code harder to maintain
- **Quality Perception**: Inconsistency affects perceived system quality

### **Resolution Priority**: MEDIUM (User Experience and Code Quality)

## 4. Complex Function Integration Challenges (ARCHITECTURAL PATTERN)

### **Affected Contexts**: 2/5 (Advanced Contexts)
- ✅ **RumorContext**: Bug #013 - Combine Function Logic, Bug #014 - Quest Conversion Integration
- ✅ **StoryContext**: Bug #017 - Reordering Complexity, Bug #018 - Progress Tracking Integration

### **Pattern Description**
```typescript
// COMPLEX OPERATION CHALLENGES:

// Multi-step operations with failure points:
async function complexOperation() {
  // Step 1: Delete existing data ✓
  await deleteExistingData();
  
  // Step 2: Transform and validate ✓  
  const transformedData = transformData();
  
  // Step 3: Create new data ❌ (Potential failure point)
  await createNewData(transformedData);
  
  // Result: Partial completion, inconsistent state
}
```

### **Root Cause Analysis**
- **Non-Atomic Operations**: Complex operations lack transaction-like behavior
- **Poor Error Recovery**: Limited rollback capabilities for partial failures
- **Integration Dependencies**: Complex functions depend on multiple systems
- **Testing Challenges**: Difficult to test multi-step operations comprehensively

### **Impact Assessment**
- **Data Integrity**: Risk of partial operations leaving inconsistent state
- **User Experience**: Complex operations may fail with poor user feedback
- **Feature Reliability**: Advanced features less reliable than basic operations
- **Development Complexity**: Complex functions harder to maintain and debug

### **Resolution Priority**: MEDIUM (Feature Completeness and Reliability)

## 5. React Error Boundary Integration Issues (DEVELOPMENT PATTERN)

### **Affected Contexts**: ALL TESTED (5/5)
- ✅ **NPCContext**: Error boundary integration mentioned
- ✅ **QuestContext**: Error boundary integration mentioned
- ✅ **LocationContext**: Error boundary integration documented
- ✅ **RumorContext**: Error boundary integration documented
- ✅ **StoryContext**: Error boundary integration documented

### **Pattern Description**
```typescript
// CONSISTENT ERROR BOUNDARY PATTERN:
export const useContext = () => {
  const context = useContext(ContextObject);
  if (context === undefined) {
    throw new Error('useContext must be used within a Provider');
  }
  return context;
};

// Issue: Error boundary integration could be improved
```

### **Resolution Priority**: LOW (Development Experience)

## 📊 **Pattern Analysis Summary**

### **Universal Patterns (5/5 Contexts)**
1. ~~**User Attribution Failures**~~ — ❌ **struck 2026-07-28, never real** (see Pattern 1)
2. **ID Generation Issues** - Architectural vulnerability
3. **Validation Inconsistencies** - User experience issue
4. **Error Boundary Integration** - Development experience issue

### **Advanced Context Patterns (2/5 Contexts)**
5. **Complex Function Integration** - Feature reliability issue

### **Bug Distribution by Pattern**

*Updated 2026-07-28 against the tracker. Four of the five rows below were materially wrong as
originally written — the correction is larger than the original analysis.*

```
User Attribution:  ✅ 0 bugs — pattern STRUCK; #008/#011/#015 all FIXED (PR #16)
ID Generation:     ⏸️ 4 bugs (#002, #004, #009, #012) - DEFERRED by decision; 7 marker
                      tests kept deliberately red. #016 belongs under Validation, not
                      here — the audit found its live part is order validation, and its
                      ID-collision framing is not reproducible against current code.
Validation:        🔍 2 open (#005, #016-narrowed); #006 and #019 both FIXED
Complex Functions: 🔍 1 open (#017, recharacterized); #013/#014 were harness artifacts
                      (JSDOM `crypto.randomUUID`), #018 FIXED
Error Boundaries:  ⬜ 5 "documented issues" - never filed, never substantiated
```

## 🔧 **Systematic Resolution Strategy**

### ~~**Phase 1: Critical Infrastructure (High Priority)**~~ — ❌ WITHDRAWN 2026-07-28
1. ~~**Fix User Attribution Utilities**~~
   - Withdrawn with Pattern 1. There is nothing to fix in `getUserName` /
     `getActiveCharacterName` — see the struck Pattern 1 above for the verified source.
   - Attribution *was* consolidated (PR #16), on separate and better-founded grounds:
     `src/core/attribution/` is now the single place attribution values are built and
     `DocumentService` the single write path that applies them. Read
     `docs/architecture/migration/attribution-consolidation-findings.md` before touching it —
     its RESOLVED section records two categories of write that must **never** be routed
     through `createDocument`.

### **Phase 2: Data Integrity (Medium Priority)**
2. **Standardize ID Generation**
   - Implement UUID-based ID generation system
   - Add uniqueness validation before database writes
   - Migrate existing collision-prone IDs
   - Update all contexts to use new system

3. **Standardize Validation Patterns**
   - Define standard validation order and patterns
   - Implement consistent error messages
   - Add missing existence validation
   - Create validation utility functions

### **Phase 3: Advanced Features (Medium Priority)**
4. **Improve Complex Function Reliability**
   - Implement atomic operation patterns
   - Add proper error recovery and rollback
   - Improve integration testing approaches
   - Enhance user feedback for complex operations

### **Phase 4: Developer Experience (Low Priority)**
5. **Enhance Error Boundary Integration**
   - Improve error boundary patterns
   - Standardize error handling across contexts
   - Add development-time error helpers

## 🎯 **Cross-Context Testing Insights**

### **Behavioral Testing Effectiveness**
- **Pattern Recognition**: Cross-context testing reveals systematic issues
- **Bug Discovery Rate**: 15.3% average discovery rate across 5 contexts
- **Systematic Validation**: Confirms issues are architectural, not isolated
- **Priority Guidance**: Cross-context patterns inform priority decisions

### **Testing Infrastructure Evolution**
- **Standardized Approach**: Same methodology successfully applied across contexts
- **Scalable Patterns**: Testing patterns work for simple and complex contexts
- **Coverage Insights**: Different contexts reveal different types of issues
- **Future Testing**: Patterns inform testing strategy for remaining contexts

## 📈 **Impact of Cross-Context Analysis**

### **Before Pattern Recognition**
- Individual bugs seemed like isolated issues
- Priority unclear without broader context
- Solutions might address symptoms, not root causes
- Limited understanding of systematic issues

### **After Pattern Recognition**
- **Systematic Issues Identified**: Clear root causes affecting multiple contexts
- **Priority Clarification**: Cross-context patterns inform priority decisions
- **Solution Strategy**: Address root causes rather than individual symptoms
- **Prevention Strategy**: Patterns inform prevention of similar issues

## 🚀 **Recommendations for Remaining Testing**

### ~~**For NoteContext Testing**~~ — superseded 2026-07-28 (NoteContext testing is done)
1. ~~**Expect Same Patterns**: Anticipate user attribution and ID generation issues~~ — this
   advice is exactly how the error propagated. Told to *expect* attribution failures, the
   NoteContext pass duly found them and filed #020, #021 and #022. **All three closed as test
   issues, not implementation bugs.** Priming an investigation with the pattern it should find
   is a good way to find it whether or not it is there.
2. **Pattern Validation**: confirm a pattern against production source before extending it to a
   new context — not against the new context's test output.

### **For Cross-Context Integration Testing**
1. **Relationship Testing**: Test entity relationships across contexts
2. **Systematic Bug Confirmation**: Verify fixes work across all contexts
3. **Performance Impact**: Test systematic changes don't impact performance

### **For Future Development**
1. **Prevention Patterns**: Use identified patterns to prevent similar issues
2. **Architecture Standards**: Implement standards based on pattern analysis
3. **Quality Assurance**: Use patterns as quality checkpoints for new code

## 🏆 **Key Achievements**

*Rewritten 2026-07-28. The original read as a claim of vindication; the record does not support it.*

What this analysis actually produced, scored against outcomes:

- **4 patterns, not 5.** Pattern 1 is struck — false premise, and it was the one rated highest.
- **Its strongest claim was its wrongest.** "Highest priority systematic issue," "complete loss of
  user tracking across entire application," HIGH / Immediate Attention — all of it against a
  utility that works. Confidence tracked the number of contexts agreeing, and every one of them
  was reading the same mock.
- **The surviving patterns are real but were overstated.** ID generation (Pattern 2) is a genuine
  collision risk, deliberately deferred with its marker tests kept red. Validation inconsistency
  (Pattern 3) is real and concrete — `NPCContext` handles one precondition two incompatible ways
  in a single file. Both are narrower than described here.
- **Roughly a third of the bugs cited as evidence were harness artifacts** — #013, #014, #300,
  #021, #022 were filed as production defects and retracted.

**The durable finding is methodological, and it is worth more than the patterns were.**
Cross-context analysis multiplies apparent confidence without multiplying evidence: five contexts
sharing one test harness produce one observation reported five times. Behavioral testing did find
real defects across this codebase — but the value came from tests that failed against production
code, not from synthesis across test output. Verify a root cause once, directly, in the source.