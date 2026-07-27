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
| 🚫 WONT FIX | Will not be addressed (with reason in the file) |
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

**A stale premise to stop propagating**: `cross-context-patterns.md` names as its "highest priority
systematic issue" that `getUserName`/`getActiveCharacterName` "consistently return empty/null."
Against `src/core/utils/user-utils.ts` this is false — `getUserName` is `userProfile?.username || ''`.
The original symptom was a mock shape in tests. That document's Pattern 1 should be struck.

**Tracker defect**: `NoteContext.bugs.test.tsx:455` has a `describe('Bug #024: …')` block, but **no
#024 row and no `024-*.md` file exist**. Its tests pass. Needs filing retroactively or renumbering.
Two test comments also cite the wrong bug numbers: `Dialog.test.tsx` cites #100 for what is #150, and
`GroupManagementView.test.tsx` cites #200 for what is #201.

## Bugs

| Bug # | Status | Category | Title | Impact | Priority | Affected file(s) |
|-------|--------|----------|-------|--------|----------|------------------|
| [#001](./001-npc-context-mock-state-isolation.md) | ✅ FIXED | CONTEXT | NPCContext mock state isolation issues | High (testing) | Fixed | Testing infrastructure |
| [#002](./002-npc-id-generation-collision.md) | ⚠️ NEEDS DECISION | DATA | NPC ID generation collision risk | Medium | Medium | NPCContext |
| [#003](./003-react-key-uniqueness-warning.md) | ⚠️ NEEDS DECISION | UI | React key uniqueness warning | Low | Low-Medium | NPCContext |
| [#004](./004-quest-id-generation-collision.md) | ⚠️ NEEDS DECISION | DATA | Quest ID generation collision risk | Medium | Medium | QuestContext |
| [#005](./005-validation-inconsistency-patterns.md) | 🔍 DISCOVERED | VALIDATION | Validation error precedence inconsistency | Medium | Medium | Cross-context |
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
| [#016](./016-story-chapter-id-generation-system.md) | 🔍 DISCOVERED | ARCHITECTURE | Story chapter ID generation system issues | Medium | Medium | StoryContext |
| [#017](./017-story-chapter-reordering-complexity.md) | 🔍 DISCOVERED | ARCHITECTURE | Story chapter reordering complexity | Medium | Medium | StoryContext |
| [#018](./018-story-progress-tracking-integration.md) | ✅ FIXED | INTEGRATION | Story progress was a frozen module constant — nothing accumulated, `getReadingProgress()` always returned 0, and **StoryPage's "resume last chapter" was a dead branch**, a full feature outage the report understated. Progress now lives in state, seeded from the persisted document | Closed | Closed | StoryContext |
| [#019](./019-story-chapter-order-validation.md) | ✅ FIXED | VALIDATION | `createChapter` accepted order `0`/negative — `??` only falls back on null/undefined. Now applies the same `order < 1` guard `updateChapter` already had | Closed | Closed | StoryContext |
| [#020](./020-note-user-attribution-metadata.md) | ✅ FIXED | TESTABILITY | Note user attribution metadata (test issue, not implementation bug) | Closed | Closed | NoteContext tests |
| [#021](./021-note-sequential-id-generation.md) | ✅ FIXED | TESTABILITY | Note sequential ID "implementation issues" — actually a missing post-render `waitFor`; tests read state before the mocked async `fetchNotes()` settled. Fixed in test files, no production change | Closed | Closed | NoteContext tests |
| [#022](./022-note-context-state-management.md) | ✅ FIXED | TESTABILITY | Note context "state management issues" — actually two test-timing gaps: an unawaited initial fetch, and same-`act()` stale closures across chained calls. Fixed in test files, no production change | Closed | Closed | NoteContext tests |
| [#023](./023-entity-mapper-extract-details-empty-body.md) | ✅ FIXED | DATA | `entityMapper.extractDetailsByType` had an empty body — silent data loss. Implemented from the working private copy in `EntityExtractionService`, which now delegates to it (single source of truth); 8 marker tests green | Closed | Closed | EntityExtractionService / entityMapper |
| [#050](./050-use-note-data-unreachable-catch-block.md) | 🔍 DISCOVERED | VALIDATION | `useNoteData.getNoteCountForCampaign` has unreachable catch block | Low | Low | useNoteData hook |
| [#100](./100-navigation-missing-key-prop-mobile-layout.md) | 🔍 DISCOVERED | UI | Navigation missing React `key` prop on mobile layout wrapper divs | Low | Low | Navigation.tsx |
| [#101](./101-card-test-stale-class-assertion.md) | ✅ FIXED | UI | Card.test.tsx asserted the retired `default-` prefix; the component correctly emits `card`. Test corrected — Button/Typography suites had already been migrated and this one was missed | Closed | Closed | Card.test.tsx |
| [#150](./150-dialog-portal-ref-testability.md) | ✅ FIXED | UI / TESTABILITY | **Escalated by the Phase 4 audit from "testability limitation" to a real production bug.** Dialog held its portal root in a ref and returned `null` until that ref was set — but the ref was assigned in an effect, and assigning a ref triggers no re-render, so a Dialog **mounted already-open** rendered nothing. `SessionTimeoutWarning` is the one consumer (of 20) that does this, and re-renders only on a 60s interval, so the session-expiry warning could stay invisible for up to a minute of its 5-minute window. Portal root now lives in state | Closed | Closed | Dialog.tsx, SessionTimeoutWarning.tsx |
| [#200](./200-user-profile-low-statement-coverage-debounce.md) | 🔍 DISCOVERED | TESTABILITY | UserProfile username debounce validation branch hard to test | Low | Low | UserProfile.tsx |
| [#201](./201-group-management-view-error-not-displayed-in-dialog.md) | 🔍 DISCOVERED | UI | GroupManagementView error state not visible after createGroup failure | Low | Low | GroupManagementView.tsx |
| [#250](./250-npccard-related-quests-header-renders-with-no-content.md) | 🔍 DISCOVERED | UI | NPCCard "Related Quests" header renders with no content | Low | Low | NPCCard.tsx |
| [#251](./251-input-component-missing-htmlfor-label-association.md) | 🔍 DISCOVERED | TESTABILITY | Input component missing `htmlFor`/`id` label association | High (a11y) | Medium | Input.tsx (core) |
| [#300](./300-quest-form-sections-crypto-random-uuid-not-available-in-jest.md) | ✅ FIXED | TESTABILITY | QuestFormSections uses `crypto.randomUUID()` (unavailable in JSDOM) — deterministic polyfill added to `setupTests.ts`; also the root cause of #013 and #014 | Medium | Medium | setupTests.ts |
| [#301](./301-join-group-dialog-form-content-unreachable-in-jsdom.md) | 🔍 DISCOVERED | TESTABILITY | JoinGroupDialog form content unreachable in JSDOM (extends #150) | Medium | Medium | JoinGroupDialog.tsx |
| [#302](./302-location-quest-form-sections-dialog-content-unreachable.md) | 🔍 DISCOVERED | TESTABILITY | Location/Quest FormSections dialog content unreachable (extends #150) | Medium | Low | LocationFormSections.tsx, QuestFormSections.tsx |
| [#350](./350-entity-extractor-infinite-render-loop.md) | ✅ FIXED | UI / DATA | EntityExtractor infinite render loop via unstable `existingReferences = []` default | High | High | EntityExtractor.tsx |
| [#600](./600-location-sort-order-inconsistency.md) | 🔍 DISCOVERED | UI / DATA | Location sort order for `explored` status reversed between useLayoutData and LocationsMap | Low | Low | useLayoutData.ts, LocationsMap.tsx |
| [#650](./650-usage-context-infinite-refresh-loop-on-null-status.md) | ✅ FIXED | CONTEXT / PERFORMANCE | UsageContext infinite refresh loop when `fetchUsageStatus()` returns null | High | High | UsageContext.tsx |
| [#700](./700-use-campaigns-create-campaign-name-lost-in-3arg-convention.md) | 🔍 DISCOVERED | VALIDATION | useCampaigns createCampaign 3-arg convention silently coerces falsy name to empty string | Low | Low | useCampaigns.ts |
| [#701](./701-use-groups-loading-never-false-for-users-with-no-groups.md) | ✅ FIXED | CONTEXT | useGroups loading never becomes false for authenticated users with no groups | High | High | useGroups.ts |
| [#702](./702-invitation-admin-role-check-case-sensitive.md) | 🔍 DISCOVERED | VALIDATION | useInvitations admin role check is case-sensitive, inconsistent with useGroups.isAdmin | Low | Low | useInvitations.ts |
| [#750](./750-location-create-page-initial-data-always-object.md) | 🔍 DISCOVERED | DATA | LocationCreatePage always passes object (never `undefined`) to LocationCreateForm.initialData | Low | Low | LocationCreatePage.tsx |
| [#800](./800-notepage-infinite-refetch-not-found.md) | ✅ FIXED | UI / ARCHITECTURE | NotePage infinite re-fetch loop when note ID is valid but note is not found in Firestore | High | High | NotePage.tsx |
| [#850](./850-homepage-activity-inclusion-inconsistency.md) | 🔍 DISCOVERED | DATA | HomePage chapter activity includes items with only `dateAdded`; other entity types require `dateModified` | Low | Low | HomePage.tsx |
| [#851](./851-storypage-page1-always-marks-complete.md) | 🔍 DISCOVERED | DATA | StoryPage `page === 1` condition always marks chapter complete on page 1 navigation/load | Medium | Medium | StoryPage.tsx |
| [#900](./900-firebase-context-auth-loading-never-false-on-success.md) | ✅ FIXED | CONTEXT | FirebaseContext `authLoading` never set to `false` after successful profile + group load | High | High | FirebaseContext.tsx |
| [#901](./901-load-user-profile-hardcoded-retry-delays-untestable.md) | 🔍 DISCOVERED | TESTABILITY | `loadUserProfile` hardcoded 1-second retry delays make error/retry path untestable | Medium | Medium | FirebaseContext.tsx |
| [#1000](./1000-settheme-catch-dead-branch.md) | 🔍 DISCOVERED | ARCHITECTURE | `setTheme` catch block (lines 192-193) is unreachable dead code — `useState` setters never throw | Low | Low | ThemeContext.tsx |
| [#1050](./1050-notecard-getstatusbadgeclass-dead-code.md) | 🔍 DISCOVERED | ARCHITECTURE | NoteCard `getStatusBadgeClass` "active" and default branches are dead code — function only called in archived condition | Low | Low | NoteCard.tsx |
| [#1051](./1051-noteeditor-manualsave-rethrows-unhandled.md) | 🔍 DISCOVERED | UI | NoteEditor `handleManualSave` re-throws error causing unhandled rejection from Save button / Ctrl+S click handler | Medium | Medium | NoteEditor.tsx |
| [#1052](./1052-noteeditor-getlastsavedtext-dead-branch.md) | 🔍 DISCOVERED | ARCHITECTURE | NoteEditor `getLastSavedText` line 170 is dead code — guard is redundant with calling function's condition | Low | Low | NoteEditor.tsx |
| [#1150](./1150-notepage-same-campaign-timing-refetch-loop.md) | ✅ FIXED | UI / ARCHITECTURE | NotePage same-campaign timing branch (line 71) causes infinite re-fetch loop — `setCrossCampaignNote(null)` is a no-op; `crossCampaignNotFound` never set | High | High | NotePage.tsx |
| [#1151](./1151-notepage-fetch-error-refetch-loop.md) | ✅ FIXED | UI / ARCHITECTURE | NotePage catch block (line 79) does not set `crossCampaignNotFound`, causing infinite re-fetch on every Firestore error | High | High | NotePage.tsx |
| [#1152](./1152-firebase-context-dead-code-no-profile-branch.md) | 🔍 DISCOVERED | ARCHITECTURE | FirebaseContext `if (profile)` else branch (lines 289-291) is unreachable dead code — `loadUserProfile` always returns a profile or throws | Low | Low | FirebaseContext.tsx |
| [#1153](./1153-firebase-context-groups-loading-not-reset-on-error.md) | ✅ FIXED | CONTEXT | FirebaseContext `groupsLoading` not reset to `false` when `loadGroups` throws — `loading` stays `true` indefinitely after group-load error | High | High | FirebaseContext.tsx |
| [#1200](./1200-chapter-form-dead-attribution-overwritten-by-storycontext.md) | 🔍 DISCOVERED | ARCHITECTURE | ChapterForm builds attribution from `user.displayName` that StoryContext unconditionally overwrites — wrong source, and inert | Low (latent) | Low | ChapterForm.tsx |
| [#1201](./1201-location-context-update-stale-profile-missing-dep.md) | 🚫 OBSOLETE | DATA | `updateLocation` no longer reads `activeGroupUserProfile` at all — attribution is stamped downstream by `DocumentService`. A missing dep cannot stale-read a value the callback never reads (Phase 4 audit) | Closed | Closed | LocationContext.tsx |
| [#1202](./1202-story-reorder-datemodified-date-object-not-iso-string.md) | ✅ FIXED | DATA | Chapter reorder wrote `dateModified` as a `Date` (→ Firestore Timestamp) where every other path writes an ISO string; blanks the modified date in the UI. Code fixed by Wave A; **existing documents still need a data normalization pass** | Medium | Medium | StoryContext.tsx |
| [#1203](./1203-saga-edit-page-attribution-wrong-source-and-overwrites-creator.md) | ✅ FIXED | DATA | Saga saves write attribution from `user.displayName` with no character fields, and reset `createdBy`/`dateAdded` on every edit — original author is permanently lost | High | High | SagaEditPage.tsx, useSagaData.ts |
| [#1204](./1204-component-layer-hand-rolled-attribution-discarded.md) | 🔍 DISCOVERED | ARCHITECTURE | NPCForm / NPCEditForm / QuestCreateForm / RumorCard build attribution their context discards — dead code, latent regression if spread order changes (same shape as #1200, #1203) | Low (latent) | Low | 4 form components |

## Per-context testing summaries

Behavioral testing summaries for each campaign-entity context, including discovered bug patterns and coverage achieved at the time of writing:

- [NPC](./npc-testing-summary.md)
- [Quest](./quest-testing-summary.md)
- [Location](./location-testing-summary.md)
- [Rumor](./rumor-testing-summary.md)
- [Story](./story-testing-summary.md)
- [Cross-context patterns](./cross-context-patterns.md) — systematic issues recurring across multiple contexts (user attribution, ID generation, validation)
