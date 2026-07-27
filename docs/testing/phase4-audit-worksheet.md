# Phase 4 Bug Audit Worksheet

Audited on branch `triage/phase4-bug-triage`, current date 2026-07-27. This worksheet covers the
25 bugs assigned to this pass (the ones not already decided by the orchestrator or a prior
pass). Every verdict below is backed by reading the current production file at the path given,
not by inference from the original (often stale) bug report path.

One process note: `src/features/campaign-entities/npcs/context/NPCContext.tsx` was being edited
concurrently by another agent while this audit ran. The diff that landed during this session only
touched `addNPCNote`/`updateNPCRelationship`/`updateNPC` existence-validation (bug #006 territory,
out of scope here) — it did not touch the attribution code quoted under #007 below, so that
evidence is unaffected. Confirmed via `git diff` before finalizing this worksheet.

---

## Dead-code / unreachable-branch claims

### #1000 — setTheme catch block is unreachable dead code

**Verdict**: STILL LIVE

**Current file path**: `src/core/themes/ThemeContext.tsx:188-195`

**Evidence**:
```tsx
const setTheme = (themeName: ThemeName) => {
  try {
    setCurrentTheme(themes[themeName] || defaultTheme);
  } catch (error) {
    console.error('Error setting theme:', error);
    setCurrentTheme(defaultTheme);
  }
};
```
Unchanged from the report. `setCurrentTheme` is a `useState` setter — it cannot throw — and the
`themes[themeName] || defaultTheme` fallback already handles the unknown-key case without an
exception. The catch block is unreachable.

**Recommendation**: Fix — remove the try/catch, keep the `||` fallback.

---

### #1050 — NoteCard `getStatusBadgeClass` unreachable "active"/default branches

**Verdict**: STILL LIVE

**Current file path**: `src/features/collaboration/notes/components/NoteCard.tsx:44-53,76-77`

**Evidence**:
```tsx
const getStatusBadgeClass = (): string => {
  switch (note.status) {
    case "active":
      return "status-active";     // line 47 — unreachable
    case "archived":
      return "status-archived";
    default:
      return "";                  // line 51 — unreachable
  }
};
...
{note.status === "archived" && (
  <span className={`text-xs px-2 py-0.5 rounded ${getStatusBadgeClass()}`}>
```
The only call site is gated by `note.status === "archived"`, so `getStatusBadgeClass()` only ever
executes with `note.status === "archived"`. The "active" and default arms are dead.

**Recommendation**: Fix — inline `"status-archived"` and drop the function (KISS), or move the
conditional so all three branches become reachable. Low priority.

---

### #1052 — NoteEditor `getLastSavedText` unreachable guard

**Verdict**: STILL LIVE

**Current file path**: `src/features/collaboration/notes/components/NoteEditor.tsx:168-216`

**Evidence**:
```tsx
const getLastSavedText = () => {
  if (note?.isUnsaved || hasUnsavedChanges) {
    return "Not saved";   // line 169-171 — unreachable
  }
  ...
};
...
const getStatusIndicator = () => {
  ...
  if (note?.isUnsaved || hasUnsavedChanges) {
    return ( /* different JSX, does NOT call getLastSavedText */ );
  }
  return (
    <Typography variant="body-sm" color="secondary">
      {getLastSavedText()}    // line 213 — only call site
    </Typography>
  );
};
```
`getLastSavedText()` is only invoked from `getStatusIndicator`'s final `return`, which is only
reached when the same guard (`note?.isUnsaved || hasUnsavedChanges`) has already been checked
false. The duplicated guard inside `getLastSavedText` is dead.

**Recommendation**: Fix — delete the redundant guard (lines 169-171).

---

### #1152 — FirebaseContext `if (profile)` else branch unreachable

**Verdict**: STILL LIVE

**Current file path**: `src/features/user-management/auth/context/FirebaseContext.tsx:203-231,283-292`

**Evidence**: `loadUserProfile` (lines 203-231):
```tsx
while (retryCount < maxRetries) {
  try {
    const profile = await firebaseServices.user.getUserProfile(userId);
    if (profile) {
      setUserProfile(profile);
      return profile;                      // only non-throwing return path
    } else {
      ...retry...
    }
  } catch (err) {
    if (retryCount >= maxRetries - 1) throw err;
    ...retry...
  }
}
throw new Error('Failed to load user profile after multiple attempts');
```
Every path out of this function either `return profile` (truthy, since it's behind `if (profile)`)
or `throw`. Caller (lines 283-292):
```tsx
const profile = await loadUserProfile(firebaseUser.uid);
setProfileLoading(false);
if (profile) {
  ...
} else {
  console.warn(`No profile loaded for user ${firebaseUser.uid}, cannot load groups`);
  setAuthLoading(false);
}
```
The `else` (lines 289-291) can never run — a resolved `loadUserProfile()` call is always truthy.

**Recommendation**: Fix — delete the `else` branch, keep the resolved path unconditional.

---

### #050 — useNoteData `getNoteCountForCampaign` unreachable catch

**Verdict**: STILL LIVE

**Current file path**: `src/features/collaboration/notes/hooks/useNoteData.ts:83-118`

**Evidence**:
```ts
const getNotesForCampaign = useCallback(async (campaignId: string): Promise<Note[]> => {
  try {
    ...
    return campaignNotes.sort(...);
  } catch (err) {
    console.error(`Error fetching notes for campaign ${campaignId}:`, err);
    return [];                       // always resolves, never throws
  }
}, [user?.uid, activeGroupId, documentService]);

const getNoteCountForCampaign = useCallback(async (campaignId: string): Promise<number> => {
  try {
    const campaignNotes = await getNotesForCampaign(campaignId);
    return campaignNotes.length;
  } catch (err) {
    console.error(`Error counting notes for campaign ${campaignId}:`, err);
    return 0;                        // unreachable — getNotesForCampaign never throws
  }
}, [getNotesForCampaign]);
```
`getNotesForCampaign`'s own try/catch swallows every error and resolves `[]`; it never rejects, so
the outer catch in `getNoteCountForCampaign` can't fire.

**Recommendation**: Fix — drop the outer try/catch (option 1 in the original report).

---

## Logic / data claims

### #007 — User attribution metadata inconsistency (NPC creation vs. update)

**Verdict**: FIXED (for NPCs — the specific create/update asymmetry the report describes no
longer exists, though the mechanism moved, it didn't just disappear)

**Current file path**:
- `src/features/campaign-entities/npcs/context/NPCContext.tsx:101-139` (context — now attribution-free)
- `src/features/campaign-entities/npcs/components/NPCForm.tsx:165-195` (creation attribution)
- `src/features/campaign-entities/npcs/components/NPCEditForm.tsx:60-92` (update attribution)

**Evidence**: The context layer no longer adds attribution to either operation:
```tsx
// NPCContext.tsx addNPC (line 113-116)
const newNPC: NPC = { ...npcData, id };
await addData(newNPC, id);

// NPCContext.tsx updateNPC (line 133-135)
const updatedNPC = { ...npc };
await updateData(npc.id, updatedNPC);
```
But the form layer builds full attribution before calling into the context — and, notably, both
create and update now build it symmetrically:
```tsx
// NPCForm.tsx handleSubmit (lines 183-191)
createdBy: user?.uid || '',
createdByUsername: getUserName(activeGroupUserProfile),
createdByCharacterName: getActiveCharacterName(activeGroupUserProfile),
dateAdded: now,
modifiedBy: user?.uid || '',
modifiedByUsername: getUserName(activeGroupUserProfile),
modifiedByCharacterName: getActiveCharacterName(activeGroupUserProfile),
dateModified: now,

// NPCEditForm.tsx handleSubmit (lines 79-83)
modifiedBy: user?.uid || '',
modifiedByUsername: getUserName(activeGroupUserProfile),
modifiedByCharacterId: activeGroupUserProfile?.activeCharacterId || null,
modifiedByCharacterName: getActiveCharacterName(activeGroupUserProfile),
dateModified: now
```
So creation now stamps `createdBy`/`createdByUsername`/`dateAdded` (the exact fields the bug said
were missing). I spot-checked `QuestContext.tsx` too — same pattern: no attribution fields appear
in the context file itself, only in its test fixtures — consistent with the same
"attribution moved to the form layer" architecture applying beyond NPCs.

**Recommendation**: Close as fixed. Note for whoever owns the tracker: this is the same
architectural pattern flagged by #1204 ("component layer hand-rolled attribution"), which is
already decided/out of scope for this pass — the fix for #007 and the pattern #1204 describes are
the same code.

---

### #100 — Navigation missing React key prop (mobile layout)

**Verdict**: STILL LIVE (and desktop is equally affected, not just mobile)

**Current file path**: `src/app/layout/Navigation.tsx:61-84` (desktop), `:89-115` (mobile)

**Evidence**:
```tsx
{/* Desktop Navigation */}
{navItems.map((item) => {
  const isActive = shouldHighlightPath(item.path);
  return (
    <Button                      // line 65 — no key
      variant='ghost'
      ...
```
```tsx
{/* Mobile Navigation */}
{navItems.map((item) => {
  const isActive = shouldHighlightPath(item.path);
  return (
    <div>                        // line 93 — no key
      <Button ...>
```
Neither `.map()` callback's outermost returned element has a `key` prop. Matches the report
exactly (the report's own "root cause" section already noted both layouts are missing it, despite
the title only naming mobile).

**Recommendation**: Fix — trivial, add `key={item.path}` to the `<Button>` (desktop) and the
`<div>` (mobile).

---

### #250 — NPCCard "Related Quests" header renders with no content

**Verdict**: STILL LIVE

**Current file path**: `src/features/campaign-entities/npcs/components/NPCCard.tsx:234-243`

**Evidence**:
```tsx
{npc.connections.relatedQuests.length > 0 && (
  <div>
    <Typography variant="h4" className="mb-2">
      Related Quests
    </Typography>
    <div className="space-y-2">
      {npc.connections.relatedQuests.map((questId) => {
        const quest = getQuestById(questId);
        return quest ? (
          <Button key={questId} ...>...</Button>
        ) : null;
      })}
```
The outer guard only checks array length, not resolvability. If every ID fails `getQuestById`, the
heading still renders over an empty list.

**Recommendation**: Fix — compute `resolvedQuests` first and guard on `resolvedQuests.length > 0`,
per the report's own suggested fix. Low priority/cosmetic.

---

### #600 — Location sort order inconsistency (`useLayoutData` vs. `LocationsMap`)

**Verdict**: STILL LIVE

**Current file path**:
- `src/pages/layouts/common/hooks/useLayoutData.ts:102-115`
- `src/pages/layouts/journal/sections/LocationsMap.tsx:19-31`

**Evidence**: `useLayoutData.ts` puts explored first:
```ts
if (firstLocation.status === 'explored') return -1;
if (secondLocation.status === 'explored') return 1;
if (firstLocation.status === 'visited') return -1;
if (secondLocation.status === 'visited') return 1;
```
`LocationsMap.tsx` puts explored last:
```ts
// Sort locations by status (explored first) then by name   <- comment is now also wrong
if (a.status === 'explored') return 1;
if (b.status === 'explored') return -1;
if (a.status === 'visited') return 1;
if (b.status === 'visited') return -1;
```
Both still present, unchanged, still opposite. Bonus finding: `LocationsMap.tsx`'s own comment
("explored first") contradicts its own code (explored last) — the comment is stale on top of the
cross-file inconsistency.

**Recommendation**: Fix — pick one order (the report favors "explored last/de-emphasised", which
matches the comment's *intent* even though not the code) and make both match.

---

### #700 — useCampaigns createCampaign 3-arg name coercion

**Verdict**: STILL LIVE

**Current file path**: `src/features/user-management/groups/hooks/useCampaigns.ts:29-52`

**Evidence**:
```ts
if (optionalName !== undefined) {
  // Called with (groupId, name, description)
  groupId = nameOrGroupId;
  name = description || '';        // falsy campaign name silently becomes ''
  description = optionalName;
} else {
  name = nameOrGroupId;
  groupId = activeGroupId || '';
}
```
Unchanged. A falsy 2nd argument (`''`, `undefined`, `null`) in the 3-arg form silently becomes an
empty-string campaign name with no error.

**Recommendation**: Fix — replace `|| ''` with either `??` or an explicit validation throw, per
the report.

---

### #702 — useInvitations admin check case-sensitive vs. useGroups case-insensitive

**Verdict**: STILL LIVE

**Current file path**:
- `src/features/user-management/groups/hooks/useInvitations.ts:26`
- `src/features/user-management/groups/hooks/useGroups.ts:38`

**Evidence**:
```ts
// useInvitations.ts:26
if (!activeGroupUserProfile || activeGroupUserProfile.role !== 'admin') {
  throw new Error('Only admins can generate registration tokens');
}
```
```ts
// useGroups.ts:38
return activeGroupUserProfile.role?.toLowerCase() === 'admin';
```
Still inconsistent — exact string as reported.

**Recommendation**: Fix — one-line change, normalize `useInvitations`'s check to
`.role?.toLowerCase() !== 'admin'`.

---

### #750 — LocationCreatePage always passes an object as initialData

**Verdict**: STILL LIVE

**Current file path**: `src/pages/locations/LocationCreatePage.tsx:56-60`

**Evidence**:
```tsx
<LocationCreateForm
  initialData={{ ...initialData, noteId, entityId }}
  onSuccess={handleSuccess}
  onCancel={handleCancel}
/>
```
No conditional. Confirmed by contrast — `NPCsCreatePage.tsx:34`, `RumorCreatePage.tsx:33`, and
`QuestCreatePage.tsx:33` all use `const formInitialData = initialData ? {...} : undefined;` before
passing it down. `LocationCreatePage` is still the outlier.

**Recommendation**: Fix — apply the same conditional pattern used by the other three create pages.

---

### #850 — HomePage activity inclusion inconsistency (chapters vs. other entities)

**Verdict**: STILL LIVE

**Current file path**: `src/pages/HomePage.tsx:126-193`

**Evidence**:
```ts
// line 126, 133 — chapters use the fallback
if (chapter.dateModified || chapter.dateAdded) { ... timestamp: new Date(chapter.dateModified || chapter.dateAdded) ...

// line 141 — quests require dateModified
if (quest.dateModified) { ...

// line 156 — rumors require dateModified
if (rumor.dateModified) { ...

// line 171 — NPCs require dateModified
if (npc.dateModified) { ...

// line 186 — locations require dateModified
if ('dateModified' in location && location.dateModified) { ...
```
Chapters alone use the `dateModified || dateAdded` fallback; the other four entity types require
`dateModified` alone. Exactly as reported.

**Recommendation**: Fix — unify to one rule across all five branches (report recommends adopting
the chapter fallback everywhere).

---

## Story-domain claims

### #016 — Story chapter ID generation system issues

**Verdict**: STILL LIVE, but narrower than the report frames it — overlaps #019

**Current file path**: `src/features/storytelling/chapters/context/StoryContext.tsx:78-80` (generateChapterId), `:306-398` (createChapter)

**Evidence**: `generateChapterId` is unchanged:
```ts
const generateChapterId = (order: number) => {
  return `chapter-${order.toString().padStart(2, '0')}`;
};
```
It has no validation. `createChapter`'s order computation (`chapterData.order ?? (chapters.length
> 0 ? Math.max(...) + 1 : 1)`, line 320-322) also has no validation before calling
`generateChapterId`. I ran the existing bug-marker test suite
(`StoryContext.bugs.test.tsx`) for this section: **both #016 tests currently pass** — they only
exercise the "conflict shifting" and "high order number" cases, both of which work correctly in
current code. Neither test exercises negative/zero/non-integer orders — that gap is exactly what
#019's test (which does fail) covers. So the genuinely-live part of #016 (missing input validation
on order) is real but is a duplicate of #019, not a separate defect; the "ID generation collision"
concern is not reproducible against current code (shifting logic works correctly for valid orders,
verified by a passing test).

**Recommendation**: Keep open but fold into #019's fix — add the same order validation
(`order >= 1`, integer) to `createChapter` that `updateChapter` already has, rather than tracking
ID-generation edge cases separately.

---

### #017 — Story chapter reordering complexity

**Verdict**: STILL LIVE for the real defect (non-atomic delete-then-create in `updateChapter`);
the report's specific "complex data gets lost via shallow spread" claim is NOT confirmed — it's
disproved by both reading the code and running the existing test

**Current file path**: `src/features/storytelling/chapters/context/StoryContext.tsx:264-291` (updateChapter reorder path), `:332-362` (createChapter shift), `:432-462` (deleteChapter shift)

**Evidence**: `updateChapter`'s order-change path deletes every affected chapter first, then
creates all of them:
```tsx
// lines 264-271 — spread `...c` DOES carry subChapters/summary/etc. forward
const updatedChapters = affectedChapters.map(c => ({
  ...c,
  id: generateChapterId(newOrderMap.get(c.id)),
  order: newOrderMap.get(c.id),
  ...(c.id === chapterId ? modificationAttribution : {}),
  ...(c.id === chapterId ? updates : {})
}));

// lines 276-279 — delete ALL first
for (const chapter of affectedChapters) {
  await deleteData(chapter.id);
}
// lines 282-291 — THEN create all — if this loop fails partway, chapters
// already deleted above have no replacement and no rollback exists.
for (const updatedChapter of updatedChapters) {
  await firebaseServices.document.setDocument('chapters', updatedChapter.id, updatedChapter);
}
```
This delete-first-then-create pattern is a real, unmitigated atomicity/data-loss risk on partial
failure — confirmed by code reading, and by design it's structurally different (worse) than
`createChapter`'s and `deleteChapter`'s shift loops, which create-and-verify the new location
*before* deleting the old one (see the `# Do NOT switch this to createDocument` comments at
lines 284-289, 346-351, 446-451 — added for a different, already-resolved bug #1203, but they
happen to document that the safer create-then-delete-old pattern is used everywhere except this
one spot).

I ran `StoryContext.bugs.test.tsx`'s #017 tests: **both currently pass.** The first test asserts
`summary`/`subChapters` ARE present in the object passed to `setDocument` after a reorder — i.e.
it actively disproves the "data might be lost" framing (the `...c` spread correctly carries nested
data forward; nothing is lost from the object shape). The second test only asserts that a rejected
`setDocument` call causes `updateChapter` to reject too — it doesn't test or prove anything about
database consistency after partial failure.

**Recommendation**: Keep open, but recharacterize: the confirmed defect is narrowly "the
order-change path in `updateChapter` deletes before it creates, unlike its sibling operations" —
not "complex data gets lost by the spread." Fix by reordering `updateChapter`'s loop to
create-and-verify-then-delete-old, matching the pattern already used in `createChapter`/
`deleteChapter`/`reorderChapters`.

---

### #018 — Story progress tracking integration

**Verdict**: STILL LIVE, confirmed with real user-facing impact beyond what the report claims

**Current file path**: `src/features/storytelling/chapters/context/StoryContext.tsx:49-53,100-179,536-553`; consumer at `src/pages/story/StoryPage.tsx:18-59`

**Evidence**: `defaultProgress` is a module-level constant, never mutated:
```ts
const defaultProgress: StoryProgress = {
  currentChapter: '',
  lastRead: new Date(),
  chapterProgress: {}
};
```
`updateChapterProgress` builds a local object off this constant and writes it to Firestore, but
never stores it in any component state:
```ts
const updatedProgress = { ...defaultProgress, chapterProgress: { ...defaultProgress.chapterProgress, [chapterId]: {...} } };
await updateProgressData('current-progress', updatedProgress);   // saved
refreshChapters();                                                // does NOT refresh progress
```
`getReadingProgress` and the exposed `storyProgress` both read only the frozen constant:
```ts
const getReadingProgress = useCallback(() => {
  const completedChapters = Object.values(defaultProgress.chapterProgress)   // always {}
    .filter(progress => progress.isComplete).length;
  return chapters.length > 0 ? (completedChapters / chapters.length) * 100 : 0;   // always 0
}, [chapters.length]);
...
const value: StoryContextValue = {
  ...
  storyProgress: defaultProgress,   // always the constant
```
Real impact, confirmed: `StoryPage.tsx` uses `storyProgress.currentChapter` to redirect a reader to
their last-read chapter:
```tsx
} else if (storyProgress.currentChapter) {
  const lastChapter = getChapterById(storyProgress.currentChapter);
```
Since `storyProgress.currentChapter` is always `''`, this branch is permanently dead — the
"resume where you left off" feature does not work at all, not just "may be inconsistent."

**Recommendation**: Fix — hold `storedProgress` in real component state (`useState`), populate it
from Firestore on load, update it in `updateChapterProgress`/`updateCurrentChapter`, and read from
it in `getReadingProgress`/the exposed `storyProgress` value. This is more than a "medium priority
UX nit" — the referenced consumer feature is fully non-functional.

---

### #019 — Story chapter order validation (has a live failing test)

**Verdict**: STILL LIVE — and the test's expectation is the right spec; fix production code, not
the test

**Current file path**: `src/features/storytelling/chapters/context/StoryContext.tsx:182-220` (updateChapter validates), `:306-322` (createChapter does not)

**Evidence**: `updateChapter` validates order:
```ts
if (newOrder < 1) {
  throw new Error('Chapter order must be at least 1');
}
```
`createChapter` does not — it uses `chapterData.order ?? (...)` (line 320), and `??` only falls
back on `null`/`undefined`, not on `0` or negative numbers, so an explicit `order: 0` or
`order: -1` passes straight through unvalidated.

I ran the actual test (`StoryContext.bugs.test.tsx`, "BUG: should validate chapter order
constraints properly") in isolation:
```
expect(received).rejects.toThrow()
Received promise resolved instead of rejected
Resolved to value: "chapter-00"
```
This confirms the test executes real production code (not an environment artifact — it reaches
`createChapter`, generates an ID, and resolves) and the production code genuinely lacks the
validation the test expects.

Is the spec right? Yes: `updateChapter` already treats `order < 1` as invalid, and it's the
obvious, sensible domain rule (chapters are 1-indexed). The inconsistency — one write path
validates, the sibling write path doesn't — is the actual bug, and the test's expectation
(`createChapter` should reject order `0`/negative, same as `updateChapter`) matches that existing,
already-endorsed rule.

**Recommendation**: Fix production code — add the same `if (newOrder < 1) throw new Error(...)`
guard to `createChapter` before it computes `chaptersToShift`/generates the ID. Do not touch the
test.

---

## Testability claims

### #150 — Dialog portal ref pattern prevents JSDOM testing

**Verdict**: STILL LIVE, and it is a real production defect, not just testing ergonomics — I
found a live consumer where it actually breaks the UI, not only tests

**Current file path**: `src/core/components/Dialog.tsx:37-38,44-61,113,184`; live-bug consumer at `src/features/user-management/auth/components/SessionTimeoutWarning.tsx:22-93`

**Evidence**: `Dialog.tsx` still uses a ref (not state) for the portal root:
```tsx
const portalRootRef = useRef<HTMLDivElement | null>(null);
useEffect(() => {
  if (!portalRootRef.current) {
    const div = document.createElement('div');
    ...
    portalRootRef.current = div;     // ref mutation — does NOT trigger a re-render
  }
  ...
}, [isNested]);
...
if (!open || !portalRootRef.current) return null;   // line 113
```
For most consumers (`GroupManagementView.tsx`, `JoinGroupDialog.tsx`, `QuestFormSections.tsx`,
`LocationFormSections.tsx`, etc.) this is masked: they render `<Dialog open={someState}>`
unconditionally in their own JSX from their very first render, so Dialog mounts once with
`open=false`, its effect populates the ref, and only later does `open` flip to `true` — by which
point the ref is already non-null and everything renders correctly. I checked all 20 files that
render `<Dialog`; none of them gate the `<Dialog>` element itself behind the same boolean that
also becomes its `open` prop — **except one**:

```tsx
// SessionTimeoutWarning.tsx
const [showWarning, setShowWarning] = useState(false);
...
if (!showWarning) return null;        // line 90 — Dialog isn't in the tree AT ALL until this flips
return (
  <Dialog open={showWarning} ...>     // line 93 — first-ever mount of Dialog has open=true already
```
Here, `<Dialog>` doesn't exist in the component tree until `showWarning` becomes `true` for the
first time. At that exact render, Dialog mounts fresh with `open=true` and a null ref → renders
`null`. Its effect then populates the ref post-commit, but nothing forces a further re-render:
`setShowWarning(true)` on a later interval tick is a no-op (React bails out re-rendering on an
unchanged boolean value), so the dialog can stay invisible until some *other* state in the
component changes (e.g. `timeRemaining` ticking down on the next 60-second interval). Net effect:
the session-expiry warning dialog can fail to visibly appear for up to a minute after it should.
This is a genuine, if narrow and transient, production bug caused by the exact mechanism #150
describes — not merely a JSDOM testing artifact.

As a secondary finding: `Dialog.test.tsx`'s own header comment says "Bug #100 documents the root
cause" — that's a stale/incorrect cross-reference; #100 in the tracker is the unrelated Navigation
key-prop bug. The comment should point to #150.

**Recommendation**: Fix — switch `portalRootRef` to `useState` (the report's Option 1). This is a
small, low-risk change that also fixes the transient SessionTimeoutWarning defect above, not just
test ergonomics.

---

### #200 — UserProfile debounce untestable without timer mocking

**Verdict**: TEST-ONLY (no production defect) — confirmed by reading the code, not inferred

**Current file path**: `src/features/user-management/profiles/components/UserProfile.tsx:91-128`

**Evidence**:
```ts
useEffect(() => {
  if (!isEditingUsername || !newUsername || !activeGroup || newUsername === activeGroupUserProfile?.username) {
    ...
    return;
  }
  if (newUsername.length < 3) { ...; return; }
  const checkUsername = async () => { ... };
  const timer = setTimeout(() => { checkUsername(); }, 500);
  return () => clearTimeout(timer);
}, [newUsername, validateUsername, isEditingUsername, activeGroupUserProfile?.username, activeGroup]);
```
This is a completely standard, correct debounce pattern with proper cleanup. The report itself
never claims a functional defect — only that `userEvent` (real timers) and
`jest.useFakeTimers()` don't compose well in this specific test file, leaving lines uncovered.
There is nothing to fix in `UserProfile.tsx`.

**Recommendation**: Close as no-defect / testability-only. If coverage matters, address it in the
test (e.g. `fireEvent.change` + `jest.advanceTimersByTime` + awaited promise flush), not the
component.

---

### #201 — GroupManagementView error not shown after createGroup failure

**Verdict**: STILL LIVE, but not the defect the report hypothesizes — the error is not invisible,
it is rendered **twice** simultaneously, which is what broke the original `getByText` query

**Current file path**: `src/features/user-management/admin/components/GroupManagementView.tsx:72-78,183-187`

**Evidence**: There are two separate `{error && ...}` blocks reading the same `error` state:
```tsx
{/* Error message — always in the main view, line 72-78 */}
{error && (
  <div className="flex items-center gap-2 p-3 rounded-lg mb-4 typography-error">
    <AlertCircle size={16} />
    <Typography color="error">{error}</Typography>
  </div>
)}
...
{/* Create Group Dialog, line 157 onward — always mounted, open={showCreateDialog} */}
<Dialog open={showCreateDialog} ...>
  <form onSubmit={handleCreateGroup}>
    ...
    {error && (
      <Typography color="error" className="text-sm">
        {error}
      </Typography>
    )}
```
`handleCreateGroup`'s catch block only sets `error`; it never touches `showCreateDialog` on
failure, so the dialog stays open. Once `error` is truthy while the dialog is open, **both**
blocks render the identical text. A plain `screen.getByText(/.../)` throws on multiple matches —
which reads as "not found" if you don't inspect the thrown message carefully, but the real
behavior is duplication, not absence. The current test
(`GroupManagementView.test.tsx:242-268`) works around this by not querying the error text at all,
matching the "workaround, not fix" pattern flagged elsewhere in this tracker. Its inline comment
even says `BUG #200` — a stale cross-reference; the correct number is #201.

**Recommendation**: Fix — decide on one place to show the create-group error (inside the dialog
form makes the most sense, since that's where the user is looking when the failure happens) and
remove the redundant outer block, or scope the outer block to only non-dialog-related errors.

---

### #301 — JoinGroupDialog form content unreachable in JSDOM

**Verdict**: TEST-ONLY (no production defect) — confirmed, not assumed

**Current file path**: `src/features/user-management/groups/components/JoinGroupDialog.tsx`

**Evidence**: `JoinGroupDialog` has no `if (!open) return null` (or similar) gating its own
`<Dialog>` element — I checked the full file for early returns keyed on `open` and found none.
All three real call sites (`Header.tsx:349`, `UserProfileButton.tsx:115-117`,
`ContextSwitcher.tsx:153-155`) render `<JoinGroupDialog open={someState} .../>` unconditionally
from their own first render, with `someState` starting `false`. This is exactly the "always
mounted, toggle later" pattern that avoids the #150 defect. The only place `open={true}` is passed
on a fresh mount is the test file itself (`render(<JoinGroupDialog open={true} .../>)`), which is
a test-authoring choice, not how the component is used in the app.

**Recommendation**: No production fix needed. Same test-mocking workaround as #150/#302 applies if
coverage is wanted.

---

### #302 — LocationFormSections/QuestFormSections dialog content unreachable in JSDOM

**Verdict**: TEST-ONLY (no production defect) — confirmed

**Current file path**:
- `src/features/campaign-entities/locations/components/LocationFormSections.tsx:220,314`
- `src/features/campaign-entities/quests/components/QuestFormSections.tsx:88`

**Evidence**: Same check as #301 — no early `return null` gates either `<Dialog>` element in these
files; both dialogs are rendered unconditionally in their parent's JSX with `open` starting false.
Same "always mounted" pattern, same non-issue in production.

**Recommendation**: No production fix needed.

---

### #901 — loadUserProfile hardcoded retry delays untestable

**Verdict**: TEST-ONLY (no production defect)

**Current file path**: `src/features/user-management/auth/context/FirebaseContext.tsx:203-231`

**Evidence**: The retry loop (`maxRetries = 3`, `setTimeout(resolve, 1000)` between attempts) is
intentional, working production behavior — a user with a slow profile write genuinely benefits
from a real 1-second backoff between retries. The complaint is entirely about Jest fake-timer
composition with async/await checkpoints, not about anything wrong with the retry behavior itself.

**Recommendation**: No production fix required. If desired, take the report's suggested
`retryDelayMs` parameter (defaulting to 1000) purely to make the delay injectable in tests — but
that's a testability nicety, not a bug fix.

---

## Also

### #003 — React key uniqueness warning (NEEDS DECISION)

**Verdict**: STILL LIVE — root cause unchanged; the "decision" is really about whether to fix it
independently or leave it tied to #002

**Current file path**: `src/features/campaign-entities/npcs/context/NPCContext.tsx:97-103` (`generateNPCId`); consumer `src/features/campaign-entities/npcs/components/NPCDirectory.tsx:239` (`key={npc.id}`)

**Evidence**: `generateNPCId` is still purely name-derived, deterministic, with no uniqueness
check:
```ts
const generateNPCId = useCallback((name: string): string => {
  return name.toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}, []);
```
Two NPCs with the same name (e.g. two different "Guard" NPCs in the same campaign) still produce
the same ID, and `NPCDirectory.tsx` still keys its list on `npc.id` directly. The React key warning
is a direct, mechanical symptom of the same root cause the tracker already decided to defer under
#002 ("ID-collision cluster, deliberately deferred").

**What the decision actually is** (per the "do not re-audit" list, #002 was explicitly deferred by
the orchestrator): there is no independent decision recorded for #003 itself — it currently sits at
"NEEDS DECISION" only because nobody has explicitly said "this rides with #002."

**My recommendation**: Do not apply the "immediate fix" band-aid (`key={`${npc.id}-${index}`}`).
That would silence the console warning without touching the actual duplicate-ID defect, and the
warning is presently the only visible signal that duplicate IDs exist at runtime — removing it
would make #002 harder to notice in the wild, not easier to fix. Formally close #003 as a duplicate
of / dependent on #002, deferred on the same terms, rather than tracking or fixing it separately.

---

### #101 — Card.test.tsx stale class assertion (has a live failing test)

**Verdict**: TEST-ONLY — confirmed the *test* is stale, not the component; the fix is allowed to
touch the test

**Current file path**: `src/core/components/Card.tsx:171`; test at `src/core/components/__tests__/Card.test.tsx:275-282`

**Evidence**: Production code applies class `card` (no prefix):
```tsx
// Card.tsx:171
`card`,
```
I ran the failing test directly to see the actual (not paraphrased) failure:
```
expect(element).toHaveClass("default-card")
Expected the element to have class: default-card
Received: rounded-lg shadow-sm overflow-hidden card
```
The rendered element does have class `card` among others — the assertion is checking for a class
name (`default-card`) that the theme system doesn't use anymore anywhere in this component. This
matches the sibling history noted in the report itself: `Button.test.tsx` and `Typography.test.tsx`
were already rewritten to drop the same stale `default-` prefix convention. `Card.test.tsx` is the
one file in that family that didn't get the same treatment.

**Recommendation**: Fix the test — change the assertion from `'default-card'` to `'card'`. This is
one of the explicitly-sanctioned exceptions to "never modify a test to make it pass": the
production code is correct and consistent with the rest of the theme system; the test alone
encodes an obsolete convention.

---

## Summary verdict table

| Bug | Verdict | One-line justification |
|---|---|---|
| #1000 | STILL LIVE | `setTheme` try/catch around a `useState` setter; catch unreachable |
| #1050 | STILL LIVE | `getStatusBadgeClass` only ever called when status is already "archived" |
| #1052 | STILL LIVE | `getLastSavedText`'s guard duplicates its only caller's already-checked guard |
| #1152 | STILL LIVE | `loadUserProfile` always returns truthy or throws; the `else` can't run |
| #050 | STILL LIVE | `getNotesForCampaign` swallows all errors and never throws to its caller |
| #007 | FIXED | Attribution moved to the form layer; creation now stamps `createdBy`/`dateAdded` too |
| #100 | STILL LIVE | Neither desktop nor mobile `.map()` in Navigation sets a `key` |
| #250 | STILL LIVE | Heading guard checks array length, not resolvability, of related quests |
| #600 | STILL LIVE | `useLayoutData` sorts explored-first; `LocationsMap` sorts explored-last |
| #700 | STILL LIVE | `description \|\| ''` still silently drops a falsy 3-arg campaign name |
| #702 | STILL LIVE | `useInvitations` still does strict `!== 'admin'`; `useGroups` still lowercases |
| #750 | STILL LIVE | `LocationCreatePage` still the only create page without the conditional pattern |
| #850 | STILL LIVE | Chapters alone use `dateModified \|\| dateAdded`; others require `dateModified` |
| #016 | STILL LIVE (narrow) | No order validation in `createChapter`, but overlaps/duplicates #019; passing tests confirm valid-order paths work |
| #017 | STILL LIVE (narrower than reported) | Delete-then-create in `updateChapter` reorder path is real; "data loss via spread" is disproved by code + passing test |
| #018 | STILL LIVE (confirmed worse) | `storyProgress`/`getReadingProgress` always read a frozen constant; breaks StoryPage's resume-last-chapter feature entirely |
| #019 | STILL LIVE, test's spec is correct | `createChapter` has no `order < 1` guard unlike `updateChapter`; test failure reproduced live |
| #150 | STILL LIVE, real prod bug found | Ref-based portal breaks in `SessionTimeoutWarning.tsx`, the one consumer that gates Dialog itself behind `open` |
| #200 | TEST-ONLY | Debounce code is a standard, correct implementation; complaint is pure test-infra friction |
| #201 | STILL LIVE, different defect than claimed | Error renders in *two* places at once (dialog + outer view), not nowhere |
| #301 | TEST-ONLY | No early-return gates JoinGroupDialog's `<Dialog>`; always-mounted pattern used everywhere in prod |
| #302 | TEST-ONLY | Same check as #301, same result, for Location/Quest FormSections |
| #901 | TEST-ONLY | 1s retry backoff is intentional and correct; only fake-timer composition is awkward |
| #003 | STILL LIVE, needs a formal decision | Root cause (`generateNPCId`) unchanged; recommend closing as duplicate/dependent of #002, not band-aiding the key |
| #101 | TEST-ONLY, confirmed via running the test | Component uses `card`; test alone still expects `default-card` |

All 25 assigned bugs were reached; none were skipped for capacity reasons.
