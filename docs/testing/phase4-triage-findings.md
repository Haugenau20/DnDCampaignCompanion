# Phase 4 — Post-Migration Bug Triage: Findings

*Started 2026-07-27 on `triage/phase4-bug-triage`, branched from `main` at `7cf0f02` (the merge of
PR #19, which landed the Phase 3e `shared/`/`core/` pass).*

Phase 4's brief, from `post-test-coverage-roadmap.md`, is to walk the open tracker: *"Many will look
different (or be moot) under the new structure — re-file, close as obsolete, or fix, whichever
fits."* This document records what that walk actually found, and the evidence for each verdict.

---

## Baseline

The full suite on this branch, before any Phase 4 change, reproduced the recorded Phase 3e numbers
exactly:

**8 failed suites / 171 passed / 179 total; 25 failed / 3 skipped / 3950 passed / 3978 total.**

That exact match matters: it confirms the branch point is clean and that any later movement in these
numbers is attributable to Phase 4 work rather than to drift.

## The 25 failures, mapped

The failure count had never been broken down per bug. It resolves to **9 tracker entries plus 4
unfiled tests** — not 25 separate problems:

| Suite | Failures | Tracker entry |
|---|---|---|
| `entityMapper.test.ts` | 8 | #023 |
| `NPCContext.bugs.test.tsx` | 5 | #002 (2), #006 (3) |
| `enhanced-test-utils.test.tsx` | 4 | *unfiled* |
| `QuestContext.bugs.test.tsx` | 3 | #004 |
| `LocationContext.bugs.test.tsx` | 2 | #009, #010 |
| `RumorContext.bugs.test.tsx` | 1 | #012 |
| `StoryContext.bugs.test.tsx` | 1 | #019 |
| `Card.test.tsx` | 1 | #101 |

**The structural finding: only 9 of the 42 open entries have a live failing test.** The other 33
were asserted to be open without any executing evidence. That asymmetry is what this phase is for.

---

## Method, and the trap it had to avoid

The obvious shortcut — "does this bug's marker test pass? then it's fixed" — is wrong in **both**
directions, and this audit hit both.

- **A passing test does not mean fixed.** #251's tests pass only because they *work around* the bug,
  using `getByText` and index-based `getAllByRole` instead of `getByLabelText`, with a comment saying
  why. The defect is fully present.
- **A failing test does not mean broken.** This is the project's own hard-won lesson: #013, #014,
  #300, #021 and #022 were all filed as production defects and were harness artifacts.

So every verdict below comes from reading the current production code, not from pass/fail.

---

## Verdicts

### Closed — resolved by the migration itself

| Bug | Was | Verdict | Evidence |
|---|---|---|---|
| #008 | 🔍 open, **High/High** | ✅ **FIXED** | Both marker tests in `LocationContext.bugs.test.tsx` pass, and they assert the *correct* values (`createdByUsername: 'Test User'`), not the buggy ones. 5 of 7 tests in that suite pass; the 2 failures are #009/#010. |
| #011 | 🔍 open, **High/High** | ✅ **FIXED** | `RumorContext.bugs.test.tsx`: 9 passed / 1 failed; the sole failure is #012. |
| #015 | 🔍 open, **High/High** | ✅ **FIXED** | `StoryContext.bugs.test.tsx`: 11 passed / 1 failed; the sole failure is #019. |
| #1201 | 🔍 open, Medium | 🚫 **MOOT** | `updateLocation` no longer references `activeGroupUserProfile` **at all**. Attribution is stamped downstream by `DocumentService`. A missing `useCallback` dep cannot cause a stale read of a value the callback never reads. |

**These three were the highest-priority entries left in the tracker.** PR #16's attribution
consolidation fixed them as a side effect and nobody went back to close them.

**A stale premise worth deleting.** `cross-context-patterns.md` asserts, as its
"highest priority systematic issue," that `getUserName` and `getActiveCharacterName` "consistently
return empty/null values" and that the "profile data structure may not match utility function
expectations." Read against `src/core/utils/user-utils.ts`, this is simply false —
`getUserName` is `userProfile?.username || ''` and returns the username whenever one is present.
The original symptom was a mock shape in the tests, not a production defect. That document's
Pattern 1 should be struck, not carried forward.

### Confirmed still live

| Bug | Priority | Evidence |
|---|---|---|
| #023 | High | **Fixed during this phase** — see below. |
| #006 | Medium | `updateNPC` / `updateNPCNote` / `updateNPCRelationship` wrap their work in `if (npc) { … }` with no `else`, so a nonexistent NPC is a silent no-op. |
| #010 | Medium | `getAllChildrenIds` emits **breadth-first** (direct children, then descendants), and `Promise.all` then discards ordering entirely. The spec wants depth-first post-order so children die before parents. |
| #251 | High (a11y) | `src/core/components/Input.tsx` contains no `htmlFor` and no `id`. Labels are not associated with their inputs, so screen readers cannot announce them. Two separate test files carry comments documenting the workaround. |
| #1051 | Medium | `handleManualSave`'s catch does `throw error` with the comment "so calling components can handle the error" — but it is wired to a button `onClick` and a `keydown` handler, neither of which awaits or catches. Result: an unhandled promise rejection. Its test is `.skip`ped. |
| #851 | Medium | `src/pages/story/StoryPage.tsx:85` — `isComplete: isComplete || page === 1`. Any load of or navigation to page 1 marks the chapter complete. |
| #1200 | Low (latent) | `ChapterForm.tsx` still builds `createdByUsername`/`modifiedByUsername` from `user?.displayName`. Dead code the context overwrites. |
| #1204 | Low (latent) | Same shape, still present in `NPCForm`, `NPCEditForm`, `QuestCreateForm` and `RumorCard`. |
| #005 | Medium | Confirmed concretely rather than in the abstract — and it is **worse than the report describes**. See below. |

#### #005 is intra-context, not just cross-context

The report frames validation inconsistency as a *cross-context* pattern. It is also happening
**inside a single file**. `NPCContext.tsx` handles the identical `!hasRequiredContext` precondition
two different ways:

| Method | Line | On missing group/campaign |
|---|---|---|
| `updateNPCNote` | 52 | `console.error(…)` then `return` — caller sees success |
| `updateNPCRelationship` | 74 | `console.error(…)` then `return` — caller sees success |
| `addNPC` | 104 | `throw new Error('Cannot add NPC: No group or campaign selected')` |
| `updateNPC` | 126 | `throw new Error('Cannot update NPC: No group or campaign selected')` |

Same precondition, same file, two incompatible contracts. A caller cannot know whether a failed
write reports itself. This is a more actionable statement of #005 than "contexts differ from each
other," and it suggests the fix should start intra-context before attempting cross-context
standardisation.

Note this is **not** in scope for the #006 fix, and is blocked by the same problem: a test at
`NPCContext.notes.test.tsx:361` asserts the log-and-return behaviour, commented *"DISCOVERY: This
reveals that updateNPCNote logs but doesn't throw!"* — a fifth characterization test of the same
family as the four #006 hit. Fixing it needs the same explicit authorisation.

### Deferred by explicit decision

**#002 / #004 / #009 / #012 — the ID-collision cluster (7 failing tests).** All four contexts derive
document IDs from a slug of the entity name with no uniqueness check, so `"Thorin Oakenshield"` and
`"THORIN OAKENSHIELD"` collide.

**Decision, 2026-07-27: defer, and keep the 7 tests red as markers.** Changing ID derivation changes
URL shape and stored document identity across four entity types — that is its own phase with a data
story attached, not something to slip into a triage pass. #002 and #004 remain ⚠️ NEEDS DECISION,
but the decision is now recorded as *deferred*, not *unresolved*. (The third NEEDS-DECISION entry,
#003, is unrelated — a React `key` uniqueness warning — and has not been triaged yet.)

One wrinkle for whoever picks this up: the marker tests create two entities inside a single `act()`.
A fix that resolves collisions by looking up already-created entities may not see the first one, and
would fail the test for harness reasons rather than logic reasons — the same stale-closure trap that
produced the #021/#022 phantoms. An approach that needs no lookup (a suffix applied unconditionally)
sidesteps it; a lookup-based approach must be validated against that specifically.

---

## The #006 finding: the test suite contradicted itself

This is the most important methodological result of the phase, and it generalises well beyond #006.

Fixing #006 turned its 3 marker tests green and **4 previously-passing tests red, in the same
feature.** The first agent to attempt it reverted under the halt-on-failure protocol rather than
land the change or "fix" the newly-red tests — which is exactly the protocol working as designed.

The cause is not a bad fix. **Two sets of tests in the same feature asserted opposite specifications
for identical behaviour.** Three of the four are named for the *correct* behaviour while asserting
the *buggy* one:

| Test name | What it actually asserted |
|---|---|
| `should reject updates to nonexistent NPC` | `expect(result).toBeUndefined()` — that it *resolves* |
| `should reject relationship update for nonexistent NPC` | resolves; comment: *"doesn't throw for nonexistent NPC - just returns"* |
| `should reject note addition for nonexistent NPC` | resolves; comment: *"DISCOVERY: This reveals that updateNPCNote doesn't validate NPC existence!"* |

These are **characterization tests wearing specification-test names**. Each documents the defect and
was written from the observed implementation — precisely what CLAUDE.md's methodology prohibits:
*"Write tests based on requirements and expected behavior, not current implementation."* Their own
names record the requirement; only the assertions disagree.

The fourth was a different animal — a genuine harness defect. `should require group and campaign
context for note addition` set no mock of its own and inherited a leftover `mockReturnValue` from
the preceding test, since `jest.clearAllMocks()` does not reset those. It passed for accidental
reasons and was coupled to test execution order.

**Resolution (user decision, 2026-07-27): correct the three assertions and repair the fourth's mock
setup, in the same change as the production fix.** This is the same shape as the `NoteContext`
"malformed entity extraData" correction during the collaboration migration — corrected, not deleted,
one assertion wide, and only after confirming the tests genuinely execute and the disagreement is
real. The exception was authorised for four named tests, not as a general licence.

### A severity correction to #006's own report

The report describes all three methods as using `if (npc) { … }` guards that silently no-op. True for
`updateNPCNote` and `updateNPCRelationship`. **False for `updateNPC`, which never calls `getNPCById`
at all** (`NPCContext.tsx:124-139`) — it runs `await updateData(npc.id, updatedNPC)`
unconditionally. That is a *phantom write* against a document that does not exist, not a no-op. The
original report understated the severity of its own highest-impact case.

### What to check for next

The existence of even one characterization test named as a specification test means there are
probably more. A test whose name states an expectation its assertions contradict will pass forever
and silently block the very fix it appears to demand. Worth a dedicated sweep: grep the behavioural
suites for `DISCOVERY:` and `BEHAVIOR:` comments, which is how these three announced themselves.

## Tracker defect found: bug #024 does not exist

`src/features/collaboration/notes/context/__tests__/NoteContext.bugs.test.tsx:455` contains
`describe('Bug #024: Error Handling and State Management')`. There is **no #024 row in the tracker
table and no `024-*.md` file.** Either the entry was never filed or it was deleted while its tests
survived. The tests currently pass. Needs a decision: file the entry retroactively to match the
tests, or renumber the `describe` block if it was a typo.

---

## Fixes landed in this phase

### #023 — `entityMapper.extractDetailsByType` had an empty body ✅

The exported function's entire body was the placeholder comment
`// ... (copy the full implementation)`, so it returned `undefined` for every call, and
`mapOpenAIEntityToExtractedEntity` spread that `undefined` into `extraData` — silently discarding
every type-specific field of every extracted entity.

Implemented from the working private copy in `EntityExtractionService.ts`, which now **delegates** to
the exported function rather than keeping a second copy, so the mapping has a single source of truth.

- `entityMapper.test.ts`: 12 passed / 8 failed → **20/20 passed**
- `EntityExtractionService.test.ts`: 22/22 → **22/22** (unchanged by the delegation)
- `npx tsc --noEmit`: clean

Worth noting for the record: the bug report was written 2026-05-19 against pre-restructuring paths,
and its proposed implementation was checked field-for-field against the real private one before use.
They matched — but the check was the point, not the outcome.

### Batch 3 — the audit's confirmed defects ✅

Five fixes, landed after the audit established which entries were real.

| Bug | What was actually wrong |
|---|---|
| **#150** | Filed as a testability limitation; **it was a production bug.** Dialog held its portal root in a ref and returned `null` until that ref was set — but the ref is assigned in an effect, and assigning a ref triggers no re-render. A Dialog **mounted already-open** rendered nothing, permanently. 19 of 20 consumers mask this by mounting the Dialog closed and flipping `open` later; `SessionTimeoutWarning` does not, and re-renders only every 60s — so the session-expiry warning could stay invisible for up to a minute of its five-minute window. Portal root moved to state. Also removed a latent StrictMode hazard: React 18's double-invoked effects made the ref version fail *harder*. |
| **#018** | Reading progress was a frozen module constant. Both update paths spread it, wrote to Firestore, and discarded the result, so nothing accumulated and nothing was read back. **`StoryPage`'s "resume where you left off" was a dead branch** — a full feature outage, not the "medium priority tracking" the report described. Progress now lives in state, seeded from the persisted document. |
| **#019** | `createChapter` accepted `order: 0` and negatives, because `??` only falls back on `null`/`undefined`. `updateChapter` had rejected `order < 1` all along; the sibling write path now agrees. |
| **#010** | `getAllChildrenIds` collected descendants breadth-first and `Promise.all` discarded ordering, so a parent could be deleted before its children. Now post-order and sequential — a deliberate trade of batched throughput for the ordering guarantee that is the point of the fix. |
| **#101** | The rare inverse: the **test** was wrong. `Card.tsx` emits `card`; the test asserted the retired `default-` prefix. `Button.test.tsx` and `Typography.test.tsx` were migrated when the convention was dropped and this file was missed. |

#### A gap worth naming: two of these fixes proved nothing on landing

The Dialog fix left the full suite **byte-identical** before and after, and #018's existing tests
kept passing because their `useFirebaseData` mock never supplies a `data` array — so the load path
the fix adds was never exercised. Both were verified by reasoning about the code, not by running it.

In a project whose methodology treats tests as the specification, a production fix with no covering
test is unfinished work, and "the suite is still green" is not evidence. Regression tests were added
for both, each held to the standard that **it must fail against the reverted fix** — a test that
passes both before and after a change does not cover that change, and would have quietly recorded
these two bugs as fixed forever without ever checking.

### The 4 `enhanced-test-utils` failures — all harness, nothing filed ✅

These were queued by Phase 3e as "genuinely new information," since the suite could never load before
`69d19c2` made Firebase init lazy. Triaged: **all four are test-harness gaps. No production defect,
no bug filed.** None of the four ever reached its assertion — every one died in provider plumbing
that has nothing to do with the trivial component under test, which is precisely the
#013/#014/#300/#021/#022 pattern.

The distinction that made fixing them legitimate: `enhanced-test-utils.tsx` is **test
infrastructure, not a test.** Repairing it is not "editing a test to make it pass" — no assertion
was touched.

Three separate causes, in one file:

1. **The provider nesting order was backwards.** `SearchProvider` calls `useQuests`, `useNPCData`,
   `useLocationData`, `useRumorData` and `useChapterData` directly in its body, so it must render
   *inside* those providers. `TestWrapper` had it as their **ancestor**. `app/App.tsx` nests it
   innermost, just before the routed content — the test double simply had it inverted, so the hooks
   ran before any entity provider had mounted.
2. **Two helpers skipped a provider's dependencies but not the provider.**
   `renderWithMinimalProviders` and `renderWithNPCContext` skip the entity providers while still
   mounting `SearchProvider`, so even with correct ordering it had nothing to read.
3. **`firebase/analytics` and `firebase/functions` are mocked nowhere** — not in `setupTests.ts`, not
   locally — so the real `getAnalytics(app)` ran and threw. Fixed with local overrides matching the
   pattern ~10 other Firebase service tests already use.

`enhanced-test-utils.test.tsx`: 3 passed / 4 failed → **7/7 passed**. The file is imported by nothing
but its own test, so the change has no blast radius — verified, not assumed.

**A fragility noted but deliberately not filed.** `ServiceRegistry.get()`
(`src/core/services/firebase/core/ServiceRegistry.ts:39`) uses a truthiness check, `if (!service)
throw`, rather than comparing against `undefined`. A registered-but-falsy service therefore reports
as "not found." This is **inert in production**, where `initializeApp()` always returns an object,
and it only surfaces under mocks that return `undefined` — which is why every other Firebase service
test already overrides them. Recording it rather than filing it is the deliberate choice: filing
unproven defects is exactly what produced the five phantom entries this project already had to
retract.
