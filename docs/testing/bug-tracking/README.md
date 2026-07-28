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

**Current tracker state: 61 filed, 54 resolved, 7 open.** Of the 7: four are the deferred
ID-collision cluster (#002, #004, #009, #012), two are the attribution type-split task
(#1200, #1204), and one is #005's cosmetic tail.

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

## Bugs

| Bug # | Status | Category | Title | Impact | Priority | Affected file(s) |
|-------|--------|----------|-------|--------|----------|------------------|
| [#001](./001-npc-context-mock-state-isolation.md) | ✅ FIXED | CONTEXT | NPCContext mock state isolation issues | High (testing) | Fixed | Testing infrastructure |
| [#002](./002-npc-id-generation-collision.md) | ⚠️ NEEDS DECISION | DATA | NPC ID generation collision risk | Medium | Medium | NPCContext |
| [#003](./003-react-key-uniqueness-warning.md) | 🚫 CLOSED | UI | React key uniqueness warning — **closed as a symptom of #002, deferred on the same terms** (2026-07-28). The proposed `key={id-index}` band-aid was explicitly rejected: it silences the warning without touching the duplicate-ID defect, and that warning is the only visible runtime signal that duplicate IDs exist | Closed | Closed | NPCContext |
| [#004](./004-quest-id-generation-collision.md) | ⚠️ NEEDS DECISION | DATA | Quest ID generation collision risk | Medium | Medium | QuestContext |
| [#005](./005-validation-inconsistency-patterns.md) | 🟡 PARTIALLY FIXED | VALIDATION | **`NPCContext` fixed; the cross-context half is still open.** `updateNPCNote`/`updateNPCRelationship` handled `!hasRequiredContext` by `console.error` + bare `return` while `addNPC`/`updateNPC`/`deleteNPC` threw — two writes silently reporting success in the same file. Both now throw; all five agree. Required correcting one characterization test under explicit authorisation. **`StoryContext` decided 2026-07-28 — the split stays, and is now documented in the code.** Its three warn-and-return methods are reading-progress operations, declared `=> void` (not `Promise`) in the interface, and both live call sites are fire-and-forget: `StoryPage` calls `updateCurrentChapter` from a `useEffect` and `updateChapterProgress` from `onPageChange`, neither awaiting nor catching. Making them throw would manufacture a fresh instance of **#1051** — unhandled rejection from an effect and a click handler. `markChapterComplete` has no production caller at all. The four chapter mutators throw because they are user-initiated writes with UI that can report. **Still open**: Location/Quest/Note express the same precondition with two further idioms — cosmetic, and nothing has been shown to misbehave | Medium | Low | NPCContext ✅ / StoryContext ✅ (contract documented) / Location, Quest, Note ⚠️ cosmetic |
| [#006](./006-missing-existence-validation.md) | ✅ FIXED | VALIDATION | Missing entity existence validation. `updateNPC` had **no** check at all (phantom write, not a no-op); all three paths now throw `'NPC not found'`. Required correcting 4 tests that encoded the defect as spec — see `phase4-triage-findings.md` | Closed | Closed | NPCContext |
| [#007](./007-user-attribution-inconsistency.md) | ✅ FIXED | DATA | User attribution metadata inconsistency — attribution moved to the form layer; creation now stamps `createdBy`/`dateAdded` too (Phase 4 audit) | Closed | Closed | Cross-context |
| [#008](./008-location-user-attribution-metadata.md) | ✅ FIXED | DATA | Location user attribution — resolved by the PR #16 attribution consolidation. Both marker tests pass, asserting correct values (Phase 4 audit) | Closed | Closed | LocationContext |
| [#009](./009-location-id-generation-collision.md) | 🔍 DISCOVERED | DATA | Location ID generation collision risk | Medium | Medium | LocationContext |
| [#010](./010-location-deletion-order-logic.md) | ✅ FIXED | DATA | Location hierarchical deletion order — `getAllChildrenIds` now recurses post-order and deletion runs sequentially, so descendants always die before ancestors. Trades batched throughput for the ordering guarantee | Closed | Closed | LocationContext |
| [#011](./011-rumor-user-attribution-metadata.md) | ✅ FIXED | DATA | Rumor user attribution — resolved by the PR #16 attribution consolidation; marker tests pass (Phase 4 audit) | Closed | Closed | RumorContext |
| [#012](./012-rumor-id-generation-collision.md) | 🔍 DISCOVERED | DATA | Rumor ID generation collision risk | Medium | Medium | RumorContext |
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
| [#1200](./1200-chapter-form-dead-attribution-overwritten-by-storycontext.md) | 🔍 DISCOVERED | ARCHITECTURE | ChapterForm builds attribution from `user.displayName` that StoryContext unconditionally overwrites — wrong source, and inert | Low (latent) | Low | ChapterForm.tsx |
| [#1201](./1201-location-context-update-stale-profile-missing-dep.md) | 🚫 OBSOLETE | DATA | `updateLocation` no longer reads `activeGroupUserProfile` at all — attribution is stamped downstream by `DocumentService`. A missing dep cannot stale-read a value the callback never reads (Phase 4 audit) | Closed | Closed | LocationContext.tsx |
| [#1202](./1202-story-reorder-datemodified-date-object-not-iso-string.md) | ✅ FIXED | DATA | Chapter reorder wrote `dateModified` as a `Date` (→ Firestore Timestamp) where every other path writes an ISO string; blanks the modified date in the UI. Code fixed by Wave A; **existing documents still need a data normalization pass** | Medium | Medium | StoryContext.tsx |
| [#1203](./1203-saga-edit-page-attribution-wrong-source-and-overwrites-creator.md) | ✅ FIXED | DATA | Saga saves write attribution from `user.displayName` with no character fields, and reset `createdBy`/`dateAdded` on every edit — original author is permanently lost | High | High | SagaEditPage.tsx, useSagaData.ts |
| [#1204](./1204-component-layer-hand-rolled-attribution-discarded.md) | 🔍 DISCOVERED | ARCHITECTURE | NPCForm / NPCEditForm / QuestCreateForm / RumorCard build attribution their context discards — dead code, latent regression if spread order changes (same shape as #1200, #1203) | Low (latent) | Low | 4 form components |
| [#1300](./1300-app-check-never-initialized-lazy-firebase-init.md) | ✅ FIXED | ARCHITECTURE | **App Check never initialized in production.** `initializeAppCheck(getApp(), …)` threw `app/no-app`: `index.tsx` had been free-riding on `import App from 'app/App'` initializing Firebase as an import side effect, and Phase 3e's lazy init (`69d19c2`) removed it. The `try`/`catch` swallowed the error, so the site worked and all three gates stayed green. **The only bug in this tracker reported from production rather than found by a test** | High | High | index.tsx |

## Per-context testing summaries

Behavioral testing summaries for each campaign-entity context, including discovered bug patterns and coverage achieved at the time of writing:

- [NPC](./npc-testing-summary.md)
- [Quest](./quest-testing-summary.md)
- [Location](./location-testing-summary.md)
- [Rumor](./rumor-testing-summary.md)
- [Story](./story-testing-summary.md)
- [Cross-context patterns](./cross-context-patterns.md) — systematic issues recurring across multiple contexts (user attribution, ID generation, validation)
