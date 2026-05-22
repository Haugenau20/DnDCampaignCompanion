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

## Bugs

| Bug # | Status | Category | Title | Impact | Priority | Affected file(s) |
|-------|--------|----------|-------|--------|----------|------------------|
| [#001](./001-npc-context-mock-state-isolation.md) | ✅ FIXED | CONTEXT | NPCContext mock state isolation issues | High (testing) | Fixed | Testing infrastructure |
| [#002](./002-npc-id-generation-collision.md) | ⚠️ NEEDS DECISION | DATA | NPC ID generation collision risk | Medium | Medium | NPCContext |
| [#003](./003-react-key-uniqueness-warning.md) | ⚠️ NEEDS DECISION | UI | React key uniqueness warning | Low | Low-Medium | NPCContext |
| [#004](./004-quest-id-generation-collision.md) | ⚠️ NEEDS DECISION | DATA | Quest ID generation collision risk | Medium | Medium | QuestContext |
| [#005](./005-validation-inconsistency-patterns.md) | 🔍 DISCOVERED | VALIDATION | Validation error precedence inconsistency | Medium | Medium | Cross-context |
| [#006](./006-missing-existence-validation.md) | 🔍 DISCOVERED | VALIDATION | Missing entity existence validation | Medium | Medium | NPCContext |
| [#007](./007-user-attribution-inconsistency.md) | 🔍 DISCOVERED | DATA | User attribution metadata inconsistency | Low | Low | Cross-context |
| [#008](./008-location-user-attribution-metadata.md) | 🔍 DISCOVERED | DATA | Location user attribution metadata issues | High | High | LocationContext |
| [#009](./009-location-id-generation-collision.md) | 🔍 DISCOVERED | DATA | Location ID generation collision risk | Medium | Medium | LocationContext |
| [#010](./010-location-deletion-order-logic.md) | 🔍 DISCOVERED | DATA | Location hierarchical deletion order logic | Medium | Medium | LocationContext |
| [#011](./011-rumor-user-attribution-metadata.md) | 🔍 DISCOVERED | DATA | Rumor user attribution metadata issues | High | High | RumorContext |
| [#012](./012-rumor-id-generation-collision.md) | 🔍 DISCOVERED | DATA | Rumor ID generation collision risk | Medium | Medium | RumorContext |
| [#013](./013-rumor-combine-function-logic.md) | 🔍 DISCOVERED | INTEGRATION | Rumor combine function complex logic issues | Medium | Medium | RumorContext |
| [#014](./014-quest-conversion-integration.md) | 🔍 DISCOVERED | INTEGRATION | Quest conversion function integration issues | Medium | Medium | RumorContext |
| [#015](./015-story-user-attribution-metadata.md) | 🔍 DISCOVERED | DATA | Story user attribution metadata issues | High | High | StoryContext |
| [#016](./016-story-chapter-id-generation-system.md) | 🔍 DISCOVERED | ARCHITECTURE | Story chapter ID generation system issues | Medium | Medium | StoryContext |
| [#017](./017-story-chapter-reordering-complexity.md) | 🔍 DISCOVERED | ARCHITECTURE | Story chapter reordering complexity | Medium | Medium | StoryContext |
| [#018](./018-story-progress-tracking-integration.md) | 🔍 DISCOVERED | INTEGRATION | Story progress tracking integration issues | Medium | Medium | StoryContext |
| [#019](./019-story-chapter-order-validation.md) | 🔍 DISCOVERED | VALIDATION | Story chapter order validation issues | Low | Low | StoryContext |
| [#020](./020-note-user-attribution-metadata.md) | ✅ FIXED | TESTABILITY | Note user attribution metadata (test issue, not implementation bug) | Closed | Closed | NoteContext tests |
| [#021](./021-note-sequential-id-generation.md) | 🔍 DISCOVERED | DATA | Note sequential ID generation implementation issues | Medium | Medium | NoteContext |
| [#022](./022-note-context-state-management.md) | 🔍 DISCOVERED | ARCHITECTURE | Note context state management issues | Medium | Medium | NoteContext |
| [#023](./023-entity-mapper-extract-details-empty-body.md) | 🔍 DISCOVERED | DATA | `entityMapper.extractDetailsByType` has empty body — silent data loss | High | High | EntityExtractionService / entityMapper |
| [#050](./050-use-note-data-unreachable-catch-block.md) | 🔍 DISCOVERED | VALIDATION | `useNoteData.getNoteCountForCampaign` has unreachable catch block | Low | Low | useNoteData hook |
| [#100](./100-navigation-missing-key-prop-mobile-layout.md) | 🔍 DISCOVERED | UI | Navigation missing React `key` prop on mobile layout wrapper divs | Low | Low | Navigation.tsx |
| [#101](./101-card-test-stale-class-assertion.md) | 🔍 DISCOVERED | UI | Card.test.tsx stale assertion — `default-card` class no longer emitted | Low | Low | Card.test.tsx |
| [#150](./150-dialog-portal-ref-testability.md) | 🔍 DISCOVERED | TESTABILITY | Dialog portal ref pattern prevents JSDOM testing | Medium | Medium | Dialog.tsx, DeleteConfirmationDialog.tsx |
| [#200](./200-user-profile-low-statement-coverage-debounce.md) | 🔍 DISCOVERED | TESTABILITY | UserProfile username debounce validation branch hard to test | Low | Low | UserProfile.tsx |
| [#201](./201-group-management-view-error-not-displayed-in-dialog.md) | 🔍 DISCOVERED | UI | GroupManagementView error state not visible after createGroup failure | Low | Low | GroupManagementView.tsx |
| [#250](./250-npccard-related-quests-header-renders-with-no-content.md) | 🔍 DISCOVERED | UI | NPCCard "Related Quests" header renders with no content | Low | Low | NPCCard.tsx |
| [#251](./251-input-component-missing-htmlfor-label-association.md) | 🔍 DISCOVERED | TESTABILITY | Input component missing `htmlFor`/`id` label association | High (a11y) | Medium | Input.tsx (core) |
| [#300](./300-quest-form-sections-crypto-random-uuid-not-available-in-jest.md) | 🔍 DISCOVERED | TESTABILITY | QuestFormSections uses `crypto.randomUUID()` (unavailable in JSDOM) | Medium | Medium | QuestFormSections.tsx |
| [#301](./301-join-group-dialog-form-content-unreachable-in-jsdom.md) | 🔍 DISCOVERED | TESTABILITY | JoinGroupDialog form content unreachable in JSDOM (extends #150) | Medium | Medium | JoinGroupDialog.tsx |
| [#302](./302-location-quest-form-sections-dialog-content-unreachable.md) | 🔍 DISCOVERED | TESTABILITY | Location/Quest FormSections dialog content unreachable (extends #150) | Medium | Low | LocationFormSections.tsx, QuestFormSections.tsx |
| [#350](./350-entity-extractor-infinite-render-loop.md) | 🔍 DISCOVERED | UI / DATA | EntityExtractor infinite render loop via unstable `existingReferences = []` default | High | High | EntityExtractor.tsx |
| [#600](./600-location-sort-order-inconsistency.md) | 🔍 DISCOVERED | UI / DATA | Location sort order for `explored` status reversed between useLayoutData and LocationsMap | Low | Low | useLayoutData.ts, LocationsMap.tsx |
| [#650](./650-usage-context-infinite-refresh-loop-on-null-status.md) | 🔍 DISCOVERED | CONTEXT / PERFORMANCE | UsageContext infinite refresh loop when `fetchUsageStatus()` returns null | High | High | UsageContext.tsx |
| [#700](./700-use-campaigns-create-campaign-name-lost-in-3arg-convention.md) | 🔍 DISCOVERED | VALIDATION | useCampaigns createCampaign 3-arg convention silently coerces falsy name to empty string | Low | Low | useCampaigns.ts |
| [#701](./701-use-groups-loading-never-false-for-users-with-no-groups.md) | 🔍 DISCOVERED | CONTEXT | useGroups loading never becomes false for authenticated users with no groups | High | High | useGroups.ts |
| [#702](./702-invitation-admin-role-check-case-sensitive.md) | 🔍 DISCOVERED | VALIDATION | useInvitations admin role check is case-sensitive, inconsistent with useGroups.isAdmin | Low | Low | useInvitations.ts |
| [#750](./750-location-create-page-initial-data-always-object.md) | 🔍 DISCOVERED | DATA | LocationCreatePage always passes object (never `undefined`) to LocationCreateForm.initialData | Low | Low | LocationCreatePage.tsx |
| [#800](./800-notepage-infinite-refetch-not-found.md) | 🔍 DISCOVERED | UI / ARCHITECTURE | NotePage infinite re-fetch loop when note ID is valid but note is not found in Firestore | High | High | NotePage.tsx |
| [#850](./850-homepage-activity-inclusion-inconsistency.md) | 🔍 DISCOVERED | DATA | HomePage chapter activity includes items with only `dateAdded`; other entity types require `dateModified` | Low | Low | HomePage.tsx |
| [#851](./851-storypage-page1-always-marks-complete.md) | 🔍 DISCOVERED | DATA | StoryPage `page === 1` condition always marks chapter complete on page 1 navigation/load | Medium | Medium | StoryPage.tsx |

## Per-context testing summaries

Behavioral testing summaries for each campaign-entity context, including discovered bug patterns and coverage achieved at the time of writing:

- [NPC](./npc-testing-summary.md)
- [Quest](./quest-testing-summary.md)
- [Location](./location-testing-summary.md)
- [Rumor](./rumor-testing-summary.md)
- [Story](./story-testing-summary.md)
- [Cross-context patterns](./cross-context-patterns.md) — systematic issues recurring across multiple contexts (user attribution, ID generation, validation)
