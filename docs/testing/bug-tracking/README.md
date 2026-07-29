# Bug Tracking

Catalogue of bugs discovered during behavioral testing of the D&D Campaign Companion codebase. This README is both the entry point for the directory and the live tracking table.

## How to read this

- The **bugs table** below is the authoritative current state. Each row links to a detailed report.
- Bugs are kept in the table after they're fixed — status changes, the row stays.
- Individual bug files use the format `NNN-short-slug.md`. Bug numbers are not reused.

## How to file a new bug

1. Pick the next unused number. Recent agents have used ranges (#100s navigation/core, #200s auth, #250s NPCs, #300s locations/quests/groups, #350s notes, #600s layouts, #650s contexts) — continue in a similar bracket or pick the next free integer.
2. Create `NNN-short-slug.md` with these sections: **Title**, **Status**, **Category**, **Discovered In** (test file), **Affected File**, **Description**, **Reproduction**, **Expected vs Actual**, **Recommended Fix**.
3. Add a row to the table below.
4. If you skip a test because of the bug, reference the bug number in a comment on the `.skip`.

## Status legend

| Symbol | Meaning |
|---|---|
| 🔍 DISCOVERED | Bug identified through testing |
| 🔄 IN PROGRESS | Being investigated or fixed |
| ✅ FIXED | Resolved |
| 🟡 PARTIALLY FIXED | One instance resolved, but the entry as filed covers more that is still live. The row must say which part is which — a bug half-fixed and marked ✅ is how open work gets lost |
| 🚫 WONT FIX / CLOSED | Will not be addressed, or closed as no-defect (reason in the file) |
| ⚠️ NEEDS DECISION | Implementation decision required |

## Categories

| Category | Scope |
|---|---|
| CONTEXT | React Context providers and hooks |
| CRUD | Create / Read / Update / Delete operations |
| UI | Component rendering and user interaction |
| DATA | Data integrity and consistency |
| VALIDATION | Input validation and error handling |
| PERFORMANCE | Performance and scalability |
| INTEGRATION | Third-party integration |
| ARCHITECTURE | Cross-cutting structural issues |
| TESTABILITY | Issues that prevent or complicate testing |

## Phase 4 audit (2026-07-27) — read this before trusting a row

A full triage pass ran on `triage/phase4-bug-triage`. Verdicts and evidence:
**`docs/testing/phase4-triage-findings.md`** (narrative) and
**`docs/testing/phase4-audit-worksheet.md`** (per-bug, with quoted code).

Three things that pass was set up to catch, and did:

1. **A passing test does not mean fixed.** #251's tests pass only because they *work around* the
   defect (`getByText` and index-based `getAllByRole` instead of `getByLabelText`). Every Phase 4
   verdict comes from reading current production code, never from pass/fail.
2. **Several entries were closed by the migration and nobody came back.** #007, #008, #011 and #015 —
   including three rated High/High — were fixed by the PR #16 attribution consolidation. #1201 became
   impossible. That is 5 rows that overstated what was open.
3. **Some entries were understated.** #150 is a production bug, not a testability note (see its row).
   #006's report described a silent no-op; `updateNPC` actually performed a phantom write. #018 breaks
   StoryPage's "resume last chapter" entirely.

**A stale premise, now struck** ✅ (2026-07-28): `cross-context-patterns.md` named as its "highest
priority systematic issue" that `getUserName`/`getActiveCharacterName` "consistently return
empty/null." Against `src/core/utils/user-utils.ts` this is false — `getUserName` is
`userProfile?.username || ''`. The original symptom was a mock shape in tests. **Pattern 1 is now
struck in place** (not deleted — how it went wrong is the useful part), along with the resolution
strategy and the follow-on advice that propagated it. It had steered priority for over a year.

The generalisable lesson, recorded there: **cross-context analysis multiplies apparent confidence
without multiplying evidence.** Five contexts agreeing felt like five confirmations; it was one
shared mock shape counted five times. Confirm a root cause against production source once,
directly, before promoting it.

**Tracker defect — resolved 2026-07-28. #024 never existed.** `NoteContext.bugs.test.tsx:455` had a
`describe('Bug #024: …')` with no row, no `024-*.md`, and no other reference anywhere in the repo.

Reading the two tests settles it: **both assert correct, desirable behaviour** — a failed fetch
surfaces an error, resolves loading and leaves no stale notes; a failed save rejects and leaves the
note still marked unsaved. Both execute real work (165 ms / 61 ms, reaching their assertions). The
comments say `// BUG POTENTIAL:`, not `// BUG:`, and the names read `should reveal …` and
`… correctly`. The block was written to go looking for a defect in error handling, found the
behaviour correct, and nothing was ever filed — the speculative number just stayed in the title.

**Resolved by renaming the block, not by filing the entry.** A tracker row marked FIXED for a
defect that never existed is precisely how this project acquired the five entries it later had to
retract (#013, #014, #300, #021, #022). An investigation that finds nothing is a real result and is
now recorded as one, in a comment on the block itself. Numbers are not reused, so #024 stays unused.

**Stale cross-references — resolved 2026-07-28.** `GroupManagementView.test.tsx` cited #200 for
what is #201; corrected, and the substance with it — the comment claimed the error "may not be
visible," when the audit found it renders **twice** simultaneously (main view + open dialog), which
is why a `getByText` throws. `Dialog.test.tsx` was reported as citing #100 for #150, but on
inspection it already cites #150 correctly throughout; it was evidently fixed when #150 landed, and
the handoff note was stale.

## Phase 4, second pass (2026-07-28)

Baseline re-verified before starting and reproduced exactly (7 failed / 3 skipped / 3971 passed of
3981, 180 suites; coverage 91.56 / 92.05 / 85.16 / 83.37; `tsc` clean; `npm run build` succeeds).

**Fixed**: #251 (a11y, escalated out of TESTABILITY) and the five dead-code entries #1000, #1050,
#1052, #1152, #050.

**Closed without a code change**: #200, #301, #302, #901 (all confirmed TEST-ONLY by reading
production code) and #003 (symptom of the deferred #002; the `key={id-index}` band-aid explicitly
rejected, because the React warning is currently the only runtime signal duplicate IDs exist).

**`cross-context-patterns.md` Pattern 1 struck** — see above.

Two method notes from this pass:

1. **"Unreachable" is a claim, not a fact.** Each of the five dead-code deletions was
   re-verified against current source — every call site grepped, every exit path traced — before
   anything was removed. All five held, but deleting a live error handler on a stale audit's word
   is a much worse outcome than leaving dead code in place, so the check is not optional.
2. **Removing dead code strands the comments that described it.** Three test files carried
   comments naming functions, branches and line numbers that no longer exist — including two tests
   claiming to cover branches they had never reached. Assertions were left untouched; only the
   comments were corrected. Worth checking for routinely after any deletion.

## Phase 4, third pass (2026-07-28) — PRs #22 and #24

**Tracker state after the third pass: 61 filed, 54 resolved, 7 open.** Of the 7: four were the
deferred ID-collision cluster (#002, #004, #009, #012), two the attribution type-split task
(#1200, #1204), and one #005's cosmetic tail.

*(Superseded by the fourth pass, below: #005 closed, leaving **61 filed, 55 resolved, 6 open**.)*

**Fixed**: #1051, #600's remainder (the dead `sortedLocations`), and **#1300**.
**Closed**: #016, overtaken by #019 and #017.
**Decided**: #005's `StoryContext` half — the split stays, and is now documented in the code.

**#1300 is the first entry in this tracker reported from production rather than found by a test**,
and the reason is worth internalising: App Check had been silently off since Phase 3e merged, because
`index.tsx` was free-riding on an import side effect that the lazy-init change removed. Four
independent layers hid it — a swallowing `try`/`catch`, a test that mocks `app/App` and so severs the
very import chain, a global `firebase/app` mock whose `getApp()` never throws, and the structural
inability of `tsc`/`build` to see a runtime ordering bug. **All three standard gates were green
throughout.** Full detail in the report.

Two method notes:

1. **A report's "Recommended Fix" can be actively wrong.** #1051 listed removing the re-throw first;
   doing so would have broken `EntityExtractor`'s abort path. Worse, EntityExtractor's two tests for
   that path use a *mocked* rejecting save, so they would have stayed green. **Tests covering a path
   do not necessarily cover the seam that feeds it.**
2. **Check that both implementations run before reconciling them.** The `layoutUtils.ts` "triplicate"
   was carried as a design question for two sessions; nothing imported the copies. Third occurrence
   of this exact shape (#600, and finding 5's two wrong readings in Phase 3e).

## Phase 5, first emulator walkthrough (2026-07-29)

**Tracker state: 69 filed, 62 resolved, 7 open** (#1400–#1406). Baseline re-measured and unchanged:
182 suites, 4043 passed, 2 skipped, **0 failed**; `tsc` clean; `npm run build` succeeds.

**This is the first session that exercised running code rather than reading it**, and every one of
the seven entries came out of that. Five are user-visible defects nobody had seen because no test
covers the seam they sit on. The pattern across #1400, #1403, #1404 and #1406 is worth naming: **four
separate affordances that look live and cannot succeed** — a Create button, a Delete confirmation, an
Edit button, and Edit on anyone else's content. A suite at 91.7% statement coverage found none of
them, because each one's failure *is* its tested behaviour.

**#1406 is the one to learn from.** It was carried in the handoff as an *"unverified"* contract
question and took one probe to settle — and settling it turned a footnote into the joint-highest
severity item in this batch. It also exposes a structural blind spot: **the production ruleset is
exercised by no test at all**, and the emulator's permissive dev ruleset means every rules-dependent
failure is invisible locally by construction. That is the same shape as
[#1300](./1300-app-check-never-initialized-lazy-firebase-init.md) — a production-only defect that all
three green gates were incapable of seeing.

**One result deliberately not filed as a bug**: the [#002](./002-npc-id-generation-collision.md)
family's collision fix was verified against the live emulator and **works correctly** — same-session
identical and case-differing names both yield `slug` + `slug-2`, with both documents intact. That is
a verification result, not a defect, and belongs in the roadmap rather than here. Filing a passing
check as a tracker row would be exactly the noise this tracker's retraction history warns about.

## Phase 4, fourth pass (2026-07-28)

**Tracker state at the end of this pass: 62 filed, 62 resolved, 0 open.** The test suite was **fully
green for the first time**: 182 suites, 4043 passed, 2 skipped, **0 failed**. `tsc` clean,
`npm run build` succeeds.

**Fixed**: the ID-collision cluster (#002, #004, #009, #012), the attribution type split
(#1200, #1204), and #303 — filed and fixed the same day.
**Closed as no-defect**: #005's remaining third.
**Filed**: #303, the only new entry, and it was proven by a failing test before it was written up.

### The deferral was resting on a premise that wasn't true

#002/#004/#009/#012 sat deferred for a year because "changing ID derivation changes URL shape and
stored document identity across four entity types — it needs a data migration plan." Checked
directly, that was wrong. **A fix that only changes ids at the point of collision touches no existing
document, no existing URL, and none of the ten cross-document reference fields.** No migration, no
backfill, no cutover. The deferral cost a year of a live data-loss path, on an assumption nobody had
tested.

The severity was also understated in the other direction. Filed as "collision risk, Medium," it was
`setDoc` — a full overwrite — with no existence check on any of the four create paths. Creating "town
guard" when "Town Guard" existed **destroyed the first document silently.** And the likeliest real
trigger was never case variants at all: it was two entities genuinely sharing a name, which no slug
scheme distinguishes.

### Four things worth carrying forward

1. **The suite already specified the fix.** The obvious approach — suffix every id — was ruled out
   not by taste but by three existing tests: two markers assert the *first* id is still the clean
   slug, and a passing test pins `convertToQuest`'s output. Collision-only disambiguation was the
   only shape the existing specification permitted. **Read what the tests already require before
   designing; they may have decided for you.**
2. **A single-purpose sweep found one of two.** The `DISCOVERY:` sweep catalogued the collision-
   asserting characterization test in `NPCContext` and reported it as the *only* ambush awaiting the
   cluster's fixer. A second, in `QuestContext.behavioral.test.tsx:411`, surfaced only because a
   **parallel** agent ran the full suite mid-flight and reported an unexplained red in a file it had
   not touched. The Quest one is the clearest specimen yet — its own name and two of its comments
   demand unique ids while its assertions demand a collision. A sweep looking for tests that assert
   a defect found the one in the file it was reading, and not the one next door.
3. **"Architecturally cleaner" needs checking against the other consumer.** #303's report proposed
   making `LocationCombobox` emit ids instead of names, and called it the cleaner option. Reading
   `QuestFormSections` disproved it: that consumer uses the same component for a free-text display
   field and genuinely wants a name. The fix instead added an optional callback so the reference
   consumer gets the entity and the display consumer is untouched. **The second consumer is where
   the design question actually gets decided.**
4. **The dead fields were load-bearing for the types.** #1204 read as a deletion. It wasn't: three
   contexts annotated their local as the complete entity while supplying no attribution, and only
   compiled because the forms passed it in. Deleting the form fields first would have broken the
   build. The seam was `useFirebaseData.addData`, one level below the entry points — **the type
   error surfaced two layers away from the code the bug report named.**

## Bugs

| Bug # | Status | Category | Title | Impact | Priority | Affected file(s) |
|-------|--------|----------|-------|--------|----------|------------------|
| [#001](./001-npc-context-mock-state-isolation.md) | ✅ FIXED | CONTEXT | NPCContext mock state isolation issues | High (testing) | Fixed | Testing infrastructure |
| [#002](./002-npc-id-generation-collision.md) | ✅ FIXED | DATA | **Not a "risk" — live silent data loss, and the severity was understated for a year.** The create path is `addData` → `createDocument` → `setDoc`, a full overwrite with no existence check, so creating "town guard" when "Town Guard" existed **destroyed the first NPC**. Fixed with collision-only disambiguation in `core/utils/entity-id.ts`: a free slug is kept unchanged, a colliding one gets `-2`. **The suite already specified that shape** — two markers assert the *first* id is still the clean slug, so a suffix-on-everything scheme was ruled out by the tests, not by preference. Needed no lookup: an `issuedIds` ref alongside `getNPCById` sees ids issued earlier in the same `act()`, which loaded state cannot. Also closes the 8-way duplication of the slug rule. Required correcting the characterization test that asserted the collision, under explicit authorisation | Closed | Closed | NPCContext ✅, core/utils/entity-id.ts |
| [#003](./003-react-key-uniqueness-warning.md) | 🚫 CLOSED | UI | React key uniqueness warning — **closed as a symptom of #002, deferred on the same terms** (2026-07-28). The proposed `key={id-index}` band-aid was explicitly rejected: it silences the warning without touching the duplicate-ID defect, and that warning is the only visible runtime signal that duplicate IDs exist. **Vindicated 2026-07-28**: #002 is now fixed at the source, so duplicate ids can no longer be produced and the React warning goes with them. Had the band-aid been applied, the warning would have been suppressed and the underlying data loss would have lost its only runtime signal — for a year | Closed | Closed | NPCContext |
| [#004](./004-quest-id-generation-collision.md) | ✅ FIXED | DATA | Same mechanism and same fix as [#002](./002-npc-id-generation-collision.md). Also required correcting a **second, previously unknown** collision-asserting characterization test at `QuestContext.behavioral.test.tsx:411` — the clearest specimen found in this codebase, since its own name (*"should generate unique IDs for similar titles"*) and two of its comments demanded uniqueness while its assertions demanded a collision, contradicting `QuestContext.bugs.test.tsx`'s #004 markers in the same repo. Corrected under explicit authorisation | Closed | Closed | QuestContext ✅ |
| [#005](./005-validation-inconsistency-patterns.md) | ✅ FIXED / CLOSED | VALIDATION | **All three halves now resolved (closed 2026-07-28).** `updateNPCNote`/`updateNPCRelationship` handled `!hasRequiredContext` by `console.error` + bare `return` while `addNPC`/`updateNPC`/`deleteNPC` threw — two writes silently reporting success in the same file. Both now throw; all five agree. Required correcting one characterization test under explicit authorisation. **`StoryContext` decided 2026-07-28 — the split stays, and is now documented in the code.** Its three warn-and-return methods are reading-progress operations, declared `=> void` (not `Promise`) in the interface, and both live call sites are fire-and-forget: `StoryPage` calls `updateCurrentChapter` from a `useEffect` and `updateChapterProgress` from `onPageChange`, neither awaiting nor catching. Making them throw would manufacture a fresh instance of **#1051** — unhandled rejection from an effect and a click handler. `markChapterComplete` has no production caller at all. The four chapter mutators throw because they are user-initiated writes with UI that can report. **The remaining third closed as no-defect, and the framing it was filed under was wrong**: they are not three idioms for one precondition. `NoteContext` guards on `!user?.uid || !activeGroupId` because notes live at `groups/{groupId}/users/{uid}/notes` — a user-scoped, group-level path with **no campaign segment**. Campaign is a post-fetch filter (`:53`), and `createNote` requires it separately with its own message (`:116`). Unifying it onto the campaign-scoped guard would be actively wrong — it would refuse to list a user's notes whenever no campaign was selected. That leaves Location/Quest's inline `!activeGroupId \|\| !activeCampaignId` vs `NPCContext`'s `hasRequiredContext` memo: one precondition, two spellings, identical behaviour, and NPC only has the memo because it also feeds `contextError`. **Second instance of this entry's own lesson** — the `StoryContext` half found the deciding evidence in the call sites; this half found it in the storage paths. When a sweep flags N implementations, the deciding evidence is usually not in the N files | Medium | Low | NPCContext ✅ / StoryContext ✅ (contract documented) / Location, Quest, Note ✅ closed as no-defect |
| [#006](./006-missing-existence-validation.md) | ✅ FIXED | VALIDATION | Missing entity existence validation. `updateNPC` had **no** check at all (phantom write, not a no-op); all three paths now throw `'NPC not found'`. Required correcting 4 tests that encoded the defect as spec — see `phase4-triage-findings.md` | Closed | Closed | NPCContext |
| [#007](./007-user-attribution-inconsistency.md) | ✅ FIXED | DATA | User attribution metadata inconsistency — attribution moved to the form layer; creation now stamps `createdBy`/`dateAdded` too (Phase 4 audit) | Closed | Closed | Cross-context |
| [#008](./008-location-user-attribution-metadata.md) | ✅ FIXED | DATA | Location user attribution — resolved by the PR #16 attribution consolidation. Both marker tests pass, asserting correct values (Phase 4 audit) | Closed | Closed | LocationContext |
| [#009](./009-location-id-generation-collision.md) | ✅ FIXED | DATA | Same mechanism and same fix as [#002](./002-npc-id-generation-collision.md). Locations are the type where a dangling id hurts most, because `parentId` builds a hierarchy and `deleteLocation`'s cascade walks it — see [#303](./303-location-parent-id-rederived-from-editable-name.md), the same broken `id === slugify(name)` assumption reached from the other direction, found and fixed in the same pass | Closed | Closed | LocationContext ✅ |
| [#010](./010-location-deletion-order-logic.md) | ✅ FIXED | DATA | Location hierarchical deletion order — `getAllChildrenIds` now recurses post-order and deletion runs sequentially, so descendants always die before ancestors. Trades batched throughput for the ordering guarantee | Closed | Closed | LocationContext |
| [#011](./011-rumor-user-attribution-metadata.md) | ✅ FIXED | DATA | Rumor user attribution — resolved by the PR #16 attribution consolidation; marker tests pass (Phase 4 audit) | Closed | Closed | RumorContext |
| [#012](./012-rumor-id-generation-collision.md) | ✅ FIXED | DATA | Same mechanism and same fix as [#002](./002-npc-id-generation-collision.md), applied to all three of `RumorContext`'s id-deriving paths: `addRumor`, `combineRumors`, and `convertToQuest`'s inline fourth copy of the slug rule — which keeps its existing `crypto.randomUUID()` fallback for a title-less quest | Closed | Closed | RumorContext ✅ |
| [#013](./013-rumor-combine-function-logic.md) | ✅ FIXED | INTEGRATION | Rumor combine "logic issues" — actually the JSDOM `crypto.randomUUID` gap; tests aborted before asserting. Polyfilled, marker tests pass, no production change | Closed | Closed | Test environment |
| [#014](./014-quest-conversion-integration.md) | ✅ FIXED | INTEGRATION | Quest conversion "integration issues" — same JSDOM `crypto.randomUUID` gap; the workflow was never executed under test. Polyfilled, marker tests pass | Closed | Closed | Test environment |
| [#015](./015-story-user-attribution-metadata.md) | ✅ FIXED | DATA | Story user attribution — resolved by the PR #16 attribution consolidation; marker tests pass (Phase 4 audit) | Closed | Closed | StoryContext |
| [#016](./016-story-chapter-id-generation-system.md) | 🚫 CLOSED — overtaken by #019 and #017 | ARCHITECTURE | Filed as "chapter ID generation has edge cases and conflict potential." Re-verified 2026-07-28, and every substantive claim is now addressed by other fixes: **zero/negative orders** are rejected by the `newOrder < 1` guard #019 added, present in *both* `createChapter` (:399) and `updateChapter` (:254); **reorder conflicts and partial-failure inconsistency** were the substance of #017, now atomic (writes and verifies every new position, deletes only ids not reused). Residue is non-integer order (`1.5` → `chapter-1.5`), which no caller can produce — order comes from a numeric field or a computed `max+1` — and "very high orders", which the report's own test evidence shows working (`chapter-999`). Closed as no remaining defect rather than fixed; nothing in it was ever demonstrated against running code | Closed | Closed | StoryContext.tsx |
| [#017](./017-story-chapter-reordering-complexity.md) | ✅ FIXED | ARCHITECTURE | **Diagnosis corrected**: the report's "complex data lost via shallow spread" claim is disproved. The real defect: `updateChapter`'s reorder deleted **every** affected chapter before creating any replacement, so a partial failure lost chapters with no rollback — unlike its three siblings, which create-and-verify first. Now writes and verifies all new positions, then deletes only ids not reused. Unblocked by authorised correction of an assertion that pinned the *mechanism* (`expect(mockDeleteData).toHaveBeenCalled()`) — unsatisfiable by any correct fix, since a reorder is a closed permutation of ids and a safe one deletes nothing. Replaced with an outcome assertion; separate partial-failure regression test proves the fix (`Expected 0 calls, Received 3` against revert) | Closed | Closed | StoryContext.tsx |
| [#018](./018-story-progress-tracking-integration.md) | ✅ FIXED | INTEGRATION | Story progress was a frozen module constant — nothing accumulated, `getReadingProgress()` always returned 0, and **StoryPage's "resume last chapter" was a dead branch**, a full feature outage the report understated. Progress now lives in state, seeded from the persisted document | Closed | Closed | StoryContext |
| [#019](./019-story-chapter-order-validation.md) | ✅ FIXED | VALIDATION | `createChapter` accepted order `0`/negative — `??` only falls back on null/undefined. Now applies the same `order < 1` guard `updateChapter` already had | Closed | Closed | StoryContext |
| [#020](./020-note-user-attribution-metadata.md) | ✅ FIXED | TESTABILITY | Note user attribution metadata (test issue, not implementation bug) | Closed | Closed | NoteContext tests |
| [#021](./021-note-sequential-id-generation.md) | ✅ FIXED | TESTABILITY | Note sequential ID "implementation issues" — actually a missing post-render `waitFor`; tests read state before the mocked async `fetchNotes()` settled. Fixed in test files, no production change | Closed | Closed | NoteContext tests |
| [#022](./022-note-context-state-management.md) | ✅ FIXED | TESTABILITY | Note context "state management issues" — actually two test-timing gaps: an unawaited initial fetch, and same-`act()` stale closures across chained calls. Fixed in test files, no production change | Closed | Closed | NoteContext tests |
| [#023](./023-entity-mapper-extract-details-empty-body.md) | ✅ FIXED | DATA | `entityMapper.extractDetailsByType` had an empty body — silent data loss. Implemented from the working private copy in `EntityExtractionService`, which now delegates to it (single source of truth); 8 marker tests green | Closed | Closed | EntityExtractionService / entityMapper |
| [#050](./050-use-note-data-unreachable-catch-block.md) | ✅ FIXED | ARCHITECTURE | `getNoteCountForCampaign`'s outer try/catch removed — `getNotesForCampaign` wraps its whole body including the `await` and resolves `[]` on any error, so it never rejects and the outer catch could not fire. Its `'should return 0 on error'` test still passes, now via `[].length` | Closed | Closed | useNoteData.ts |
| [#100](./100-navigation-missing-key-prop-mobile-layout.md) | ✅ FIXED | UI | `key={item.path}` added to **both** `.map()` callbacks — the title names only mobile, but the desktop `<Button>` was equally affected. Regression test spies on `console.error` and was proven to catch `Each child in a list should have a unique "key" prop` against the reverted fix | Closed | Closed | Navigation.tsx |
| [#101](./101-card-test-stale-class-assertion.md) | ✅ FIXED | UI | Card.test.tsx asserted the retired `default-` prefix; the component correctly emits `card`. Test corrected — Button/Typography suites had already been migrated and this one was missed | Closed | Closed | Card.test.tsx |
| [#150](./150-dialog-portal-ref-testability.md) | ✅ FIXED | UI / TESTABILITY | **Escalated by the Phase 4 audit from "testability limitation" to a real production bug.** Dialog held its portal root in a ref and returned `null` until that ref was set — but the ref was assigned in an effect, and assigning a ref triggers no re-render, so a Dialog **mounted already-open** rendered nothing. `SessionTimeoutWarning` is the one consumer (of 20) that does this, and re-renders only on a 60s interval, so the session-expiry warning could stay invisible for up to a minute of its 5-minute window. Portal root now lives in state | Closed | Closed | Dialog.tsx, SessionTimeoutWarning.tsx |
| [#200](./200-user-profile-low-statement-coverage-debounce.md) | 🚫 CLOSED | TESTABILITY | UserProfile username debounce — **no production defect** (2026-07-28). The code is a textbook `setTimeout`/`clearTimeout` debounce; the report only ever claimed `userEvent` and fake timers compose badly in one test file | Closed | Closed | UserProfile.tsx |
| [#201](./201-group-management-view-error-not-displayed-in-dialog.md) | ✅ FIXED | UI | **The report had it backwards: the error was rendered twice, not zero times.** Two `{error && …}` blocks read the same state — one always present in the main view, one in the dialog the failing catch never closes — so `getByText` threw on multiple matches, which reads as "not found". Outer block removed after confirming `error` has exactly two writes, both inside `handleCreateGroup`, so no other failure path depended on it | Closed | Closed | GroupManagementView.tsx |
| [#250](./250-npccard-related-quests-header-renders-with-no-content.md) | ✅ FIXED | UI | The guard checked `relatedQuests.length`, not resolvability, so the heading rendered over an empty list when no ID resolved. Now resolves first via `flatMap` and guards on the resolved count — which also removes the per-item `quest ? … : null`, since nothing unresolved survives the filter | Closed | Closed | NPCCard.tsx |
| [#251](./251-input-component-missing-htmlfor-label-association.md) | ✅ FIXED | UI / A11Y | Input rendered a `<label>` associated with nothing — no `htmlFor`, no `id` — so screen readers could not announce any labelled field in the app (WCAG 1.3.1). Now generated via `React.useId()`, with an explicitly-passed `id` always winning, applied to both the input and textarea branches. **Recategorised from TESTABILITY: this was an accessibility defect that happened to also break `getByLabelText`, and filing it under testability understated it** | Closed | Closed | Input.tsx (core) |
| [#300](./300-quest-form-sections-crypto-random-uuid-not-available-in-jest.md) | ✅ FIXED | TESTABILITY | QuestFormSections uses `crypto.randomUUID()` (unavailable in JSDOM) — deterministic polyfill added to `setupTests.ts`; also the root cause of #013 and #014 | Medium | Medium | setupTests.ts |
| [#301](./301-join-group-dialog-form-content-unreachable-in-jsdom.md) | 🚫 CLOSED | TESTABILITY | JoinGroupDialog — **no production defect** (2026-07-28). All three real call sites use the "always mounted, toggle later" pattern, which never trips #150's mechanism; only the test mounts it already-open. Moot regardless now #150 is fixed | Closed | Closed | JoinGroupDialog.tsx |
| [#302](./302-location-quest-form-sections-dialog-content-unreachable.md) | 🚫 CLOSED | TESTABILITY | Location/Quest FormSections — **no production defect** (2026-07-28), same check and same result as #301. The audit checked all 20 `<Dialog>` consumers; the one real offender was `SessionTimeoutWarning`, which is what escalated #150 | Closed | Closed | LocationFormSections.tsx, QuestFormSections.tsx |
| [#303](./303-location-parent-id-rederived-from-editable-name.md) | ✅ FIXED | DATA | `LocationFormSections` re-derives `parentId` by slugifying the parent's **current display name**, but ids are fixed at creation and names are editable — so selecting a renamed location stores an id matching no location. The child appears parentless, the parent childless, and `deleteLocation`'s cascade (`getAllChildrenIds`) is handed the wrong descendant set. `strictMode` does not catch it: it validates the *name* exists, which it does. Same broken `id === slugify(name)` assumption as the collision cluster, reached from the other direction. **Both options this report originally proposed were wrong, and checking the second consumer is what showed it**: `QuestFormSections` uses the same combobox in non-strict mode for a free-text `location` display field, so making it emit ids — the "architecturally cleaner" option — would have broken it. Fixed instead with an optional `onSelectLocation` callback handing back the matched `Location`, removing the lossy name→id round-trip at the one place that has the information; the display-text consumer is untouched. **A second half surfaced during the fix**: `value={formData.parentId}` was passing an id into a prop compared against names, which only appeared to work because an unrenamed location's id is its lowercased name. Marker test is now a passing regression test | Medium | Medium | LocationFormSections.tsx ✅, LocationCombobox.tsx ✅ |
| [#350](./350-entity-extractor-infinite-render-loop.md) | ✅ FIXED | UI / DATA | EntityExtractor infinite render loop via unstable `existingReferences = []` default | High | High | EntityExtractor.tsx |
| [#600](./600-location-sort-order-inconsistency.md) | 🟡 RECLASSIFIED — dead code, not a UI inconsistency | ARCHITECTURE | **The two sorts do disagree, but only one of them runs.** `useLayoutData.sortedLocations` is computed, memoised, exported — and read by nothing: its sole non-test consumer, `HomePage`, uses only `layoutData.loading`. `LocationsMap` sorts locally and is the only ordering a user ever sees. So there is no user-visible inconsistency and **no UX decision to make** — the live behaviour (explored last, de-emphasising finished locations) is what the original report argued for. Fixed now: `LocationsMap`'s comment, which claimed "explored first" and contradicted its own code. **Closed 2026-07-28**: the dead `sortedLocations` is deleted, along with its 5 tests and the stranded comment | Low | Low | useLayoutData.ts ✅, LocationsMap.tsx ✅ |
| [#650](./650-usage-context-infinite-refresh-loop-on-null-status.md) | ✅ FIXED | CONTEXT / PERFORMANCE | UsageContext infinite refresh loop when `fetchUsageStatus()` returns null | High | High | UsageContext.tsx |
| [#700](./700-use-campaigns-create-campaign-name-lost-in-3arg-convention.md) | ✅ FIXED | VALIDATION | `name = description \|\| ''` silently blanked a falsy campaign name in the 3-arg form. `CampaignService` slugifies `name` into the Firestore document ID, so an empty name yielded an empty path segment and an opaque low-level error far from the call site — hence a throw rather than `??`. **Validation is applied after the calling-convention branch, so both forms get the same rule**: guarding only inside the 3-arg branch would have left the 2-arg form still accepting `''`, trading one asymmetry for another | Closed | Closed | useCampaigns.ts |
| [#701](./701-use-groups-loading-never-false-for-users-with-no-groups.md) | ✅ FIXED | CONTEXT | useGroups loading never becomes false for authenticated users with no groups | High | High | useGroups.ts |
| [#702](./702-invitation-admin-role-check-case-sensitive.md) | ✅ FIXED | VALIDATION | A user with role `'Admin'` was an admin according to `useGroups.isAdmin` and not according to `useInvitations`. `useInvitations` now lowercases too; `useGroups` left alone, since the permissive form is the established behaviour | Closed | Closed | useInvitations.ts |
| [#750](./750-location-create-page-initial-data-always-object.md) | ✅ FIXED | DATA | Now matches the `initialData ? {...} : undefined` pattern its three sibling create pages already use. Was blocked by a characterization test that **cited bug #750 by number** while asserting the defect as the spec; corrected under explicit authorisation (2026-07-28, same terms as #005/#006), one test only. The blocked attempt and the halt are recorded in the report | Closed | Closed | LocationCreatePage.tsx |
| [#800](./800-notepage-infinite-refetch-not-found.md) | ✅ FIXED | UI / ARCHITECTURE | NotePage infinite re-fetch loop when note ID is valid but note is not found in Firestore | High | High | NotePage.tsx |
| [#850](./850-homepage-activity-inclusion-inconsistency.md) | ✅ FIXED | DATA | Five activity branches, one rule; chapters alone used the `dateModified \|\| dateAdded` fallback, so a never-modified chapter appeared in recent activity while a never-modified quest did not. All five unified on the fallback. **The direction was not a preference**: every `timestamp:` expression already read `dateModified \|\| dateAdded`, so the file's own downstream code already assumed the looser rule — only the guards disagreed | Closed | Closed | HomePage.tsx |
| [#851](./851-storypage-page1-always-marks-complete.md) | ✅ FIXED | DATA | `isComplete: isComplete \|\| page === 1` → `isComplete: !!isComplete`. **Not ambiguous once traced upstream**: `BookViewer` owns `totalPages` as internal state and already computes completion itself, calling `onPageChange(page, true)` on the last page and before advancing chapters. `StoryPage` has no access to `totalPages` and cannot compute it — so `page === 1` was never a placeholder for "last page", just wrong | Closed | Closed | StoryPage.tsx |
| [#852](./852-chapter-progress-overwritten-not-merged.md) | ✅ FIXED | DATA | **Found and fixed 2026-07-28 while verifying #851.** `updateChapterProgress` took `Partial<ChapterProgress>` but replaced the whole entry, so `isComplete` reset to `false` on any call not passing `true` — and every page turn was such a call. **Re-reading a finished chapter un-completed it.** Not caused by #851, and **inert until #018 landed the same day**: that fix made progress persist, turning a dormant defect live. **A merge alone would not have fixed it** — `StoryPage` passed an explicit `isComplete: false`, and merging cannot rescue a field the caller actively overwrites; the caller had to stop expressing an opinion it doesn't have. Ships with #851 deliberately, since #851 removes the accident that was masking this | Closed | Closed | StoryContext.tsx, StoryPage.tsx |
| [#900](./900-firebase-context-auth-loading-never-false-on-success.md) | ✅ FIXED | CONTEXT | FirebaseContext `authLoading` never set to `false` after successful profile + group load | High | High | FirebaseContext.tsx |
| [#901](./901-load-user-profile-hardcoded-retry-delays-untestable.md) | 🚫 CLOSED | TESTABILITY | `loadUserProfile` retry delays — **no production defect** (2026-07-28). The 1s backoff across 3 retries is intentional and correct; a user with a propagating profile write benefits from it. Only fake-timer composition is awkward | Closed | Closed | FirebaseContext.tsx |
| [#1000](./1000-settheme-catch-dead-branch.md) | ✅ FIXED | ARCHITECTURE | `setTheme`'s try/catch removed — `setCurrentTheme` is a `useState` setter and cannot throw, and `themes[themeName] \|\| defaultTheme` already handled the unknown-key case. The invalid-theme-name test asserts on the fallback's *result* and passes untouched. A genuinely-reachable catch elsewhere in the file (`applyThemeToDOM`, guarding `localStorage.setItem`) was deliberately left alone | Closed | Closed | ThemeContext.tsx |
| [#1050](./1050-notecard-getstatusbadgeclass-dead-code.md) | ✅ FIXED | ARCHITECTURE | `getStatusBadgeClass` removed entirely and `status-archived` inlined at its sole call site, which was already gated on `note.status === "archived"`. Two tests in `NoteCard.test.tsx` described themselves as covering the "active" and default branches; they never reached them, and their assertions (on rendered output) were correct as written and are unchanged — only the misleading comments were corrected | Closed | Closed | NoteCard.tsx |
| [#1051](./1051-noteeditor-manualsave-rethrows-unhandled.md) | ✅ FIXED | UI | Save button / Ctrl+S called `handleManualSave` fire-and-forget, so a failed save became an unhandled rejection showing the user nothing. **The report's first recommended fix — delete the re-throw — was rejected**: `EntityExtractor.handleExtract` awaits `saveCurrentContent()` via the ref and depends on the rejection to abort AI extraction ("Failed to save your work before analysis"). `handleManualSave` is unchanged; a new `triggerManualSave` wrapper catches for the two fire-and-forget call sites and surfaces the error. EntityExtractor's two tests for that abort path use a *mocked* rejecting save, so they would have stayed green if the re-throw were deleted — a new test on the ref contract is what actually guards it | Closed | Closed | NoteEditor.tsx |
| [#1052](./1052-noteeditor-getlastsavedtext-dead-branch.md) | ✅ FIXED | ARCHITECTURE | `getLastSavedText`'s leading `if (note?.isUnsaved \|\| hasUnsavedChanges) return "Not saved"` removed — its only call site (`getStatusIndicator`'s final `return`) is reached only after that identical condition has already tested false. No test targeted the `"Not saved"` literal; the similar `"Not saved to server"` comes from a different, still-reachable branch | Closed | Closed | NoteEditor.tsx |
| [#1150](./1150-notepage-same-campaign-timing-refetch-loop.md) | ✅ FIXED | UI / ARCHITECTURE | NotePage same-campaign timing branch (line 71) causes infinite re-fetch loop — `setCrossCampaignNote(null)` is a no-op; `crossCampaignNotFound` never set | High | High | NotePage.tsx |
| [#1151](./1151-notepage-fetch-error-refetch-loop.md) | ✅ FIXED | UI / ARCHITECTURE | NotePage catch block (line 79) does not set `crossCampaignNotFound`, causing infinite re-fetch on every Firestore error | High | High | NotePage.tsx |
| [#1152](./1152-firebase-context-dead-code-no-profile-branch.md) | ✅ FIXED | ARCHITECTURE | The `else` after `if (profile)` removed — `loadUserProfile` leaves its retry loop only by `return profile` from inside `if (profile)` (so always truthy) or by throwing, and it has exactly one caller. The group-load path is now unconditional | Closed | Closed | FirebaseContext.tsx |
| [#1153](./1153-firebase-context-groups-loading-not-reset-on-error.md) | ✅ FIXED | CONTEXT | FirebaseContext `groupsLoading` not reset to `false` when `loadGroups` throws — `loading` stays `true` indefinitely after group-load error | High | High | FirebaseContext.tsx |
| [#1200](./1200-chapter-form-dead-attribution-overwritten-by-storycontext.md) | ✅ FIXED | ARCHITECTURE | ChapterForm built attribution from `user.displayName` — the Firebase Auth display name, where every other write site uses the *group-scoped* `getUserName(activeGroupUserProfile)`, because identity here is per-group. Wrong source **and** inert, since the write layer spreads its own attribution after the caller's. Deleted rather than corrected, exactly as the report insisted: correcting the source would have kept a presentation component owning write metadata it has no business owning. `useAuth` became unused and went with it. **The fix needed the type split first** — see [#1204](./1204-component-layer-hand-rolled-attribution-discarded.md) | Closed | Closed | ChapterForm.tsx ✅ |
| [#1201](./1201-location-context-update-stale-profile-missing-dep.md) | 🚫 OBSOLETE | DATA | `updateLocation` no longer reads `activeGroupUserProfile` at all — attribution is stamped downstream by `DocumentService`. A missing dep cannot stale-read a value the callback never reads (Phase 4 audit) | Closed | Closed | LocationContext.tsx |
| [#1202](./1202-story-reorder-datemodified-date-object-not-iso-string.md) | ✅ FIXED / fully closed | DATA | Chapter reorder wrote `dateModified` as a `Date` (→ Firestore Timestamp) where every other path writes an ISO string; blanks the modified date in the UI. Code fixed by Wave A. **The outstanding data pass is now closed as unnecessary — measured, not assumed (2026-07-29):** audit against production found **39 chapters scanned, 0 needing repair**, `dateModified` and `dateAdded` both 39/39 strings. `migrate` was never run. **This entry carried a remediation task across four passes on an unmeasured premise**, and one read-only query settled it. Proves no *surviving* document is affected — not that the defect never occurred, since any later edit would have rewritten the field. Tooling kept as a tested template | Closed | Closed | StoryContext.tsx ✅, src/utils/__dev__/normalizeChapterDateModified.ts |
| [#1203](./1203-saga-edit-page-attribution-wrong-source-and-overwrites-creator.md) | ✅ FIXED | DATA | Saga saves write attribution from `user.displayName` with no character fields, and reset `createdBy`/`dateAdded` on every edit — original author is permanently lost | High | High | SagaEditPage.tsx, useSagaData.ts |
| [#1204](./1204-component-layer-hand-rolled-attribution-discarded.md) | ✅ FIXED | ARCHITECTURE | All four components (plus #1200's `ChapterForm`) now send domain fields only. **The report's "type adjustment" was the whole task**, and it went deeper than expected: narrowing the entry points to `DomainData<T>` failed on three contexts, because `NPCContext`, `QuestContext` and `StoryContext` each annotated their local as the *complete* entity while supplying no attribution — they only compiled because the forms were smuggling it in. The real seam was one level further down: `useFirebaseData.addData` demanded a full `T` yet writes through `createDocument`, which stamps attribution itself. **Every component now has a test asserting what it sends** — none did before, which is exactly why the dead fields survived several passes over these files. Required correcting three characterization tests under explicit authorisation | Closed | Closed | NPCForm ✅, NPCEditForm ✅, QuestCreateForm ✅, RumorCard ✅, core/types/common.ts, shared/hooks/useFirebaseData.ts |
| [#1300](./1300-app-check-never-initialized-lazy-firebase-init.md) | ✅ FIXED | ARCHITECTURE | **App Check never initialized in production.** `initializeAppCheck(getApp(), …)` threw `app/no-app`: `index.tsx` had been free-riding on `import App from 'app/App'` initializing Firebase as an import side effect, and Phase 3e's lazy init (`69d19c2`) removed it. The `try`/`catch` swallowed the error, so the site worked and all three gates stayed green. **The only bug in this tracker reported from production rather than found by a test** | High | High | index.tsx |
| [#1400](./1400-npc-forms-swallow-write-failures-silently.md) | 🔄 IN PROGRESS | UI | **NPC create and edit fail completely silently.** Both NPC forms end their catch with `console.error` and nothing else — no `setError`, and `onSuccess` is skipped. **Proven at runtime** (jest, real `NPCForm`, rejecting `addNPC`): `onSuccess` not called, form still mounted, and a deliberately broad `/error\|fail\|already exists\|cannot\|unable\|problem\|sorry/i` scan of the entire rendered body matched **nothing**. The user fills in an NPC, clicks Create, and cannot distinguish failure from a broken button. The other **five** entity forms all `setError(err.message)`; only the two NPC ones don't. Compounded by [#1401](./1401-entity-contexts-read-error-from-wrong-hook-instance.md) — two independent reasons nothing renders, so fixing either alone leaves the other live | High | High | NPCForm.tsx:194, NPCEditForm.tsx:85 |
| [#1401](./1401-entity-contexts-read-error-from-wrong-hook-instance.md) | 🔄 IN PROGRESS | ARCHITECTURE | **All four entity contexts expose the error state of a hook instance that never performs their writes.** Each calls `useFirebaseData` twice: `error` comes from the read instance inside `useXData()`, while `addData`/`updateData`/`deleteData` come from a second instance whose `error` is never destructured. `useFirebaseData:103` sets the error correctly — on the instance nobody subscribes to. So `useNPCs().error`, `useQuests().error`, `useLocations().error` and `useRumors().error` are **structurally incapable of reporting a write failure**. Same seam problem as [#1051](./1051-noteeditor-manualsave-rethrows-unhandled.md): both sides have passing coverage, neither suite crosses the seam between them | High | High | NPCContext:14/21, QuestContext:36/37, LocationContext:16/22, RumorContext:14/15 |
| [#1402](./1402-cross-session-id-collision-surfaces-developer-error.md) | 🔍 DISCOVERED | UI | **A cross-session name collision shows the player an internal developer message.** `isTaken` consults only `issuedIds` (session ref) and `getNPCById` (locally loaded array), so a second session's identical name skips disambiguation and trips `createDocument`'s guard. **Proven against the running emulator**: same-session "Gandalf"/"Gandalf" and "Gandalf"/"gandalf" both correctly yield `gandalf` + `gandalf-2`, but across two sessions the second **throws** — and the message names `updateDocumentWithAttribution` and `setDocument`. **No data is lost**; server state was checked directly and session A's document is intact. A `refresh()` immediately before the create disambiguates correctly, so the gap is a missing refresh-and-retry, not a flaw in the [#002](./002-npc-id-generation-collision.md) scheme | Medium | Medium | NPCContext:116-120 + Quest/Location/Rumor equivalents |
| [#1403](./1403-campaign-delete-confirmed-but-never-performed.md) | 🔄 IN PROGRESS | CRUD | **Admin confirms a destructive action and nothing happens.** `handleConfirmDeleteCampaign` runs `console.log` and closes the dialog; `CampaignService` has no delete method. The dialog promises permanent deletion of all campaign data. **The naive fix is worse than the no-op**: Firestore does not delete subcollections with their parent, so a plain `deleteDoc` would orphan all **seven** (`npcs`, `locations`, `quests`, `rumors`, `chapters`, `story-progress`, `saga`) permanently, and the client SDK cannot enumerate subcollections at all. Two things also sit *outside* the campaign subtree: **notes** (`groups/{g}/users/{uid}/notes`, joined by a `campaignId` field) and **`activeCampaignId`** on every member's group profile. Approved 2026-07-29: Admin SDK `recursiveDelete` in a callable function, plus explicit passes for both | High | High | CampaignManagementView.tsx:131-135, CampaignService.ts |
| [#1404](./1404-campaign-edit-button-has-no-onclick.md) | 🔍 DISCOVERED | UI | **The campaign Edit button has no `onClick` at all** — it renders, focuses, hovers and does nothing. `CampaignService.updateCampaign` already exists and works, so only the wiring is missing; there is also no edit dialog in the component to open. Third instance of the same failure mode in this session's findings, alongside #1400 and #1403. Needs a product call: implement the dialog, or remove the button — but an inert button that looks operable is the worst of the three states | Medium | Medium | CampaignManagementView.tsx:225-231 |
| [#1406](./1406-member-cannot-edit-another-members-content-but-ui-offers-it.md) | ⚠️ NEEDS DECISION | VALIDATION | **Every member is offered Edit on content they are forbidden to save.** Production rules allow update only when `createdBy == uid \|\| isGroupAdmin \|\| isGlobalAdmin` — **proven** by loading the real `firestore.rules.prod` into the running emulator: member→another's NPC **DENIED**, while read/create-own/update-own/admin-updates-any all ALLOWED, and the target document was verified untouched. Meanwhile **no creator check exists anywhere in `src/`** — an exhaustive search for `canEdit`/`isOwner`/`isCreator`/`isGroupAdmin` and for any `createdBy` vs current-user comparison returns zero hits in application code. So the Edit control is offered to everyone and fails for non-creators. **This cannot reproduce locally** — the emulator ruleset is `allow read, write: if true` — which is why it has never been seen. In a typical 5-player group, 4 of 5 players cannot correct anyone else's entry, and for NPCs [#1400](./1400-npc-forms-swallow-write-failures-silently.md) means they are told **nothing at all**. ⚠️ Contains a contract decision (the creator restriction) — three resolutions in the report; **do not fix unilaterally**. Note the production ruleset is currently exercised by no test at all | High | High | Production rules + every entity edit affordance |
| [#1405](./1405-delete-user-orphans-notes-subcollection.md) | 🔍 DISCOVERED | DATA | **Deleting a user permanently orphans that user's notes.** `deleteUser` does `batch.delete(groupUserRef)` on `groups/{g}/users/{uid}` — and notes live *underneath* it. Firestore does not cascade to subcollections, so they survive and become unreachable: the app reaches notes only via the signed-in user's own uid, and that user no longer exists. `removeUserFromGroup:111` has the identical gap. **Pre-existing and already deployed.** ⚠️ **Filed from a code reading, not yet reproduced** — the mechanism is documented Firestore behaviour and is the same fact motivating #1403, but per this project's methodology that makes it a prediction until the emulator check in the report is run | Medium | Medium | functions/userManagement/deleteUser.ts:92, removeUserFromGroup.ts:111 |

## Per-context testing summaries

Behavioral testing summaries for each campaign-entity context, including discovered bug patterns and coverage achieved at the time of writing:

- [NPC](./npc-testing-summary.md)
- [Quest](./quest-testing-summary.md)
- [Location](./location-testing-summary.md)
- [Rumor](./rumor-testing-summary.md)
- [Story](./story-testing-summary.md)
- [Cross-context patterns](./cross-context-patterns.md) — systematic issues recurring across multiple contexts (user attribution, ID generation, validation)
