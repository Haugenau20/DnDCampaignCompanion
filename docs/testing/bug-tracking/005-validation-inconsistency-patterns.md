# Bug #005: Validation Error Precedence Inconsistency

**Status**: ✅ FIXED for `NPCContext` — ⚠️ **the same defect is live in `StoryContext`** (see the
orchestrator's note immediately below, added 2026-07-28 after the fix landed)  
**Category**: VALIDATION  
**Priority**: Medium  
**Discovery Method**: Behavioral Testing  
**Impact**: Medium - Inconsistent user experience across contexts

---

## ⚠️ Orchestrator's addendum, 2026-07-28 — do not close this outright

The fix below is correct and complete **for `NPCContext`**, which is now unanimous: all five
mutators throw on `!hasRequiredContext`. But a sweep of the sibling contexts, run after the fix
landed, found the identical intra-file split still present in `StoryContext.tsx`:

| `src/features/storytelling/chapters/context/StoryContext.tsx` | Line | On missing group/campaign |
|---|---|---|
| `updateChapterProgress` | 127 | `console.warn(…)` then `return` — **caller sees success** |
| `updateCurrentChapter` | 156 | `console.warn(…)` then `return` — **caller sees success** |
| `markChapterComplete` | 177 | `console.warn(…)` then `return` — **caller sees success** |
| (four other mutators) | 211, 335, 435, 511 | `throw new Error('No active group or campaign selected')` |

Three warn-and-return against four throw, in one file — structurally the same defect that was just
fixed in `NPCContext`, and it survived the fix because the fix was correctly scoped to one bug.

**This one is not obviously a defect, and that is why it needs a decision rather than a patch.** All
three log-and-return methods are reading-progress operations. Progress tracking is plausibly
fire-and-forget: a reader who has selected no campaign arguably should not get an exception thrown
at them for scrolling. That is a defensible *deliberate* difference, unlike NPCContext's, where two
note/relationship **writes** silently reported success. Whoever picks this up should decide the
contract first and then make the file state it consistently — not assume "throw" is right because
NPCContext ended there.

**A third idiom also exists**, so the cross-context half of this bug is genuinely still open:
`LocationContext`, `QuestContext` and `NoteContext` do not use a `hasRequiredContext` flag at all —
they inline `if (!user || !activeGroupId || !activeCampaignId)` (Location), `if (!activeGroupId ||
!activeCampaignId)` (Quest), or `if (!user?.uid || !activeGroupId)` (Note). Three shapes for one
precondition, across five contexts. That is what this bug was originally filed about, and it is not
resolved — only its single most actionable instance is.

Deliberately **not** filed as a new bug number: nothing here has been confirmed to misbehave against
running code yet, and filing unproven defects is what produced the five tracker entries this project
later had to retract (#013, #014, #300, #021, #022). Recorded here instead, with the evidence, so
the next pass starts from measurement rather than from a fresh assumption.

## Resolution Summary (2026-07-28)

The bug as originally filed (below) framed this as **NPCContext vs. QuestContext** disagreeing on
whether context or authentication is checked first. On investigation, that cross-context framing
was not the actionable defect: `QuestContext.tsx` consistently checks `!user || !userProfile`
first in every mutator, and `NPCContext.tsx`'s three throwing methods (`addNPC`, `updateNPC`,
`deleteNPC`) already check `!hasRequiredContext` first, then auth — internally consistent with each
other, just ordered opposite to Quest's convention. Standardizing that cross-context ordering choice
(Option 1 vs Option 2 in the original writeup) is a design decision with no behavioral defect behind
it, and was left alone.

**The actionable defect was inside `NPCContext.tsx` itself**: `updateNPCNote` and
`updateNPCRelationship` handled the *identical* `!hasRequiredContext` precondition a different way
than the other three mutators in the same file — `console.error(...)` followed by a bare `return`,
instead of `throw new Error(...)`. A caller awaiting `updateNPCNote()` or `updateNPCRelationship()`
with no group/campaign selected got a silently resolved `undefined`, indistinguishable from success,
while `addNPC`/`updateNPC`/`deleteNPC` on the same missing-context precondition correctly reject.
Four methods, one file, two incompatible contracts.

**Fix**: `updateNPCNote` and `updateNPCRelationship` now `throw new Error(...)` on
`!hasRequiredContext`, matching the majority (and now unanimous) contract in
`src/features/campaign-entities/npcs/context/NPCContext.tsx`:
- `updateNPCNote`: `throw new Error('Cannot update NPC note: No group or campaign selected')`
- `updateNPCRelationship`: `throw new Error('Cannot update NPC relationship: No group or campaign selected')`

Both methods already threw for their other two preconditions (`!user || !userProfile`, and
NPC-not-found), so this also makes each method internally consistent, not just consistent with its
siblings.

**Test correction required explicit authorization.** A characterization test,
`src/features/campaign-entities/npcs/context/__tests__/NPCContext.notes.test.tsx` →
`'should require group and campaign context for note addition'`, asserted the buggy log-and-return
behavior (`expect(result).toBeUndefined()`) even though its own name states the requirement the
assertion contradicted. It was confirmed to genuinely execute `updateNPCNote` (not an environment
error — see the project's `crypto.randomUUID`/JSDOM history) before being corrected under
user authorization granted 2026-07-28 to expect rejection instead. A new regression test,
`'should reject relationship update when group or campaign context is missing (bug #005)'` in
`NPCContext.behavioral.test.tsx`, was added for `updateNPCRelationship`'s missing-context path, since
no prior test covered it. Both were proven to fail against the reverted production fix before the
fix was restored.

**Files actually changed**:
- `src/features/campaign-entities/npcs/context/NPCContext.tsx` — `updateNPCNote` and
  `updateNPCRelationship` now throw instead of log-and-return
- `src/features/campaign-entities/npcs/context/__tests__/NPCContext.notes.test.tsx` — corrected
  characterization test assertion
- `src/features/campaign-entities/npcs/context/__tests__/NPCContext.behavioral.test.tsx` — added
  regression test for `updateNPCRelationship`

The rest of this document is preserved as originally filed for historical context; paths below refer
to the pre-migration tree (`src/context/...`) and are stale relative to the current
`src/features/campaign-entities/npcs/context/...` / `src/features/campaign-entities/quests/context/...`
layout.

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
---

## Addendum — 2026-07-28: the `StoryContext` half is decided, and the answer is "leave it"

The second pass fixed `NPCContext` and left this open as *"needs a decision, not a patch"*, noting
that `StoryContext` has the identical 3-warn-and-return vs. 4-throw split. That decision is now
made: **the split is the contract. It stays, and it is documented in the code.**

### The evidence, which turned out not to be a judgement call

1. **The interface already says so.** `updateChapterProgress`, `updateCurrentChapter` and
   `markChapterComplete` are declared `=> void`, not `=> Promise<void>`. They are `async` in
   implementation but their advertised contract is already fire-and-forget. Making them throw would
   put the implementation at odds with the type every consumer compiles against.

2. **Both live call sites are fire-and-forget.** `StoryPage` calls `updateCurrentChapter` inside a
   `useEffect` and `updateChapterProgress` inside `BookViewer`'s `onPageChange`. Neither awaits;
   neither catches.

3. **Therefore making them throw would create a fresh instance of [#1051](./1051-noteeditor-manualsave-rethrows-unhandled.md)** —
   an unhandled promise rejection from an effect and from a page-turn handler, with nothing surfaced
   to the user. #1051 was being fixed in the same pass. Shipping its cause in another file, in the
   name of consistency, would have been a poor trade.

4. **`markChapterComplete` has no production caller at all** — only two tests asserting it is a
   function. Its error contract is unobservable.

5. The four chapter mutators throw for the opposite reason: they are user-initiated writes reached
   from forms with UI that can catch and report. **A write that silently reports success is the
   actual defect this bug fixed in `NPCContext`** — and none of the three progress methods is a
   write of that kind.

### What changed

No behaviour. A block comment above `StoryContextValue` now states both contracts and why they
differ, so the next sweep that flags "3 warn-and-return vs 4 throw in one file" finds the answer
next to the finding. That is the whole deliverable for this half.

### What was still open — now closed, 2026-07-28

`LocationContext` and `QuestContext` inline `if (!activeGroupId || !activeCampaignId)`; `NoteContext`
uses `if (!user?.uid || !activeGroupId)`. Three idioms for one precondition. This was carried as
**cosmetic** — no behaviour shown to differ, and per the lesson that produced five retracted tracker
entries, not filed as a defect on the strength of a code-reading alone.

**Closed as no-defect after measuring it, and the framing turned out to be wrong: they are not three
idioms for one precondition. `NoteContext`'s is a genuinely different precondition.**

Notes are stored at `groups/{groupId}/users/{uid}/notes` (`NoteContext.tsx:43`, `:165`, `:393`) — a
**user-scoped, group-level path with no campaign segment.** So `!user?.uid || !activeGroupId` is
exactly the precondition its collection path requires; there is no campaign in the path to guard.
Campaign is applied afterwards as a *filter* on already-fetched documents
(`note.campaignId === activeCampaignId`, `:53`), and `createNote` separately requires a campaign
with its own distinct message (`:116`, *"No active campaign selected. Please select a campaign before
creating notes."*). Unifying `NoteContext` onto the campaign-scoped guard would be **actively
wrong** — it would refuse to list a user's notes whenever no campaign happened to be selected.

That leaves `LocationContext`/`QuestContext`'s inline `!activeGroupId || !activeCampaignId` against
`NPCContext`'s `hasRequiredContext` memo. Those two genuinely are one precondition in two spellings,
and the difference is that `NPCContext` also feeds the memo into `contextError` for its empty-state
message. Identical behaviour, no reachable difference, nothing to fix.

**Closed rather than unified.** Extracting a memo into two more contexts would be churn on a file
set that four separate passes have already rewritten, in exchange for no behaviour change and no
defect closed.

### A second instance of this entry's own generalisable point

The closing evidence is the *same lesson* the `StoryContext` half produced, one level further out.
That half found "N implementations, disagreeing" was really "N implementations answering different
questions" — with the asymmetry living in the **call sites**. This half found the same thing living
in the **storage paths**: `NoteContext` guards differently because it writes somewhere structurally
different. Both times the sweep that flagged the inconsistency was reading only the files that
contained it, and the explanation was outside them. **When a consistency sweep flags N
implementations, the deciding evidence is usually not in the N files.**

### The generalisable point

*"N implementations of one rule, disagreeing"* is a strong smell, and this project has fixed five
bugs of exactly that shape. But it is a smell, not a verdict: **sometimes the N implementations are
answering different questions.** Before unifying, establish that the callers want the same thing.
Here they demonstrably did not — and the sweep that found the asymmetry could not have known that,
because the asymmetry is in the call sites, not in the file the sweep was reading.
