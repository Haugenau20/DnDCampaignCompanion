# Second-pass functional workflow review

Reviewed commit: `8c03720020c7772b0bb8b256c4569c8b50c1e495`, whose application source is identical to first-pass `64fe19512b1d3bd14427fad8996403a742fbe8a9`. Reviewer: GPT-6.1 Sol, xhigh. Date: 2026-10-03.

Six new functional findings are confirmed within the inspected scope: one high, four medium, and one low. Seven focused diagnostic cases across six suites reproduce their behavior with actual production components/hooks and synthetic collaborators. These are diagnostic assertions of current failures, not regression tests or application fixes. The coordinator ran them centrally; no emulator, full suite, production mutation, real message, or paid AI call was started by this reviewer.

The first-pass authentication/account-lifecycle reviewer remains stopped. This report does not resume or replace that assignment: credentials, invitations, account deletion, access control, and security attack research were excluded. A chapter's ordinary delete confirmation is inspected only as a content-authoring recovery workflow.

## Contracts and inspected workflows

Read `AGENTS.md`, the current `TODO.md`, the live bug tracker, the second-pass plan, first-pass summary and specialist finding records. Relevant product contracts include the [quick-add handoff](../../../design/plan/15-entity-authoring/handoff/15-1-quick-add.md), [attach tray](../../../design/plan/15-entity-authoring/handoff/15-2-attach-tray.md), [retirement of entity edit routes](../../../design/plan/15-entity-authoring/handoff/15-8-retire-the-edit-routes.md), [authoring controls](../../../design/plan/handoff/09-2-authoring.md), [command palette](../../../superpowers/specs/2026-09-02-header-command-palette-design.md), and [gated states](../../../superpowers/specs/2026-09-03-gated-page-states-design.md). Source behavior and reachable scenarios, rather than historical reports alone, determine the findings below.

| Workflow | Inspected production paths under `/workspace/DnDCampaignCompanion/` | Depth and result |
|---|---|---|
| Ordinary NPC, location and quest authoring | `src/pages/{npcs/NPCDetailPage,locations/LocationDetailPage,quests/QuestDetailPage}.tsx`; campaign-entity contexts/hooks/types; `src/shared/components/inline-edit/InlineEditor.tsx`; row controls; `QuestObjectives.tsx` | Followed scalar editors, status, notes, objectives, location/people attachments and page save adapters into context and document writes. FUNC-003. Failed-write page teardown and route reuse are owned by the React report. Whole-record overwrite/conversion failures are first-pass issues. |
| Quick add, add another, nested place creation and conversion route | `src/shared/components/quick-add/{QuickAddForm,QuickAddDialog,QuickAddPage,useQuickAddCreate,quickAddSpecs}.tsx/.ts`; quick-add context/provider; entity ID helper; `src/app/App.tsx` route mounts | Traced validation, carried fields, defaults, created-id navigation, parent/name resolution, repeated create and note conversion marking. Named palette creation loses its query: FUNC-004. Partial conversion persistence is DATA-005, not new. |
| Rumour authoring and conversion | `src/features/campaign-entities/rumors/{components,context,hooks,utils}` including `RumorComposer`, `RumorRowEditor`, `RumorDirectory`, `ConvertToQuestDialog`, `CombineRumorsDialog`, `useCreateRumor`, draft storage | Read composer and row draft save paths, immediate controls, source selection, highlight navigation and conversion handoffs. Existing DATA-005/DATA-008 apply to partial conversion and untyped relationships. No new confirmed rumour-specific finding is added. |
| Private note authoring, list, extraction and conversion | `src/pages/notes/{NotesPage,NotePage}.tsx`; `src/features/collaboration/notes/{context/NoteContext,components/NoteEditor,components/NotesList,components/CampaignLinksPanel,components/NoteReferences,hooks/useCreateNote}`; extraction hooks/services; note title/entity-path helpers | Followed local draft creation, first persistence, saved-note updates, archive, cross-campaign lookup, editor ref, pre-scan save, persisted detections and conversion destinations. FUNC-001/FUNC-002. Note route scheduling, stale fallback and navigation loss are handed to the React reviewer. |
| Search and navigation | `src/shared/context/{SearchContext,NavigationContext}.tsx`; `src/shared/hooks/{useSearch,useCreateActions}.ts`; command palette and keyboard hook; `src/core/services/search/SearchService.ts`; highlighting helpers | Traced index adapters, debounced query, result mapping and named-create action into actual launchers. FUNC-004. Scope/index lifecycle defects are owned by the React report. The unused navigation-history helper is not promoted into a user failure. |
| Chapters, story reader and saga | `src/pages/story/{ChaptersPage,StoryPage,ChapterCreatePage,ChapterEditPage,SagaPage,SagaEditPage}.tsx`; `src/features/storytelling/chapters/{components/ChapterForm,context/StoryContext,utils/chapter-progress,utils/reading-position}`; `ChapterReader`, `ChapterRail`, `BookViewer`, prose pagination; saga hook | Traced chapter form and delete promises, structural batches, progress merge/upsert, resume derivation, chapter navigation and reader emission/restoration. FUNC-005/FUNC-006. Reader identity and delayed progress restoration are owned by the React report; DATA-007 remains first-pass. |
| Empty, missing, loading and failed-operation states | Gated hook/content; inspected route branches; entity directories; note list/fallback; chapter index, reader and saga | Checked state order and recovery source paths. Confirmed findings below concern user-visible work lost, content missing, contradictory success and retry blockage. Layout/touch behavior was not verified in a browser. |

Not every file in these directories was exhaustively reviewed. Tests were read to understand collaborator seams, not assessed as a separate test-quality audit. Backend service inspection was confined to ordinary CRUD propagation; no authentication lifecycle or policy investigation was performed.

## Confirmed findings

### FUNC-005 — A rejected chapter save navigates away and discards the author's draft

**Severity:** high. **Confidence:** high. **Classification:** new finding; no matching first-pass finding or current tracker entry found. Applies to both chapter creation and editing.

**Source evidence:**

- [src/features/storytelling/chapters/components/ChapterForm.tsx:94](../../../../src/features/storytelling/chapters/components/ChapterForm.tsx#L94) validates and submits; lines 121 and 139 await create/update. Lines 142–149 catch failure, set an error, then unconditionally navigate from `finally`.
- [src/features/storytelling/chapters/context/StoryContext.tsx:496](../../../../src/features/storytelling/chapters/context/StoryContext.tsx#L496) awaits the structural create batch. The helper at line 66 throws for more than 500 writes and awaits the document service without swallowing failures. Update at lines 455–488 also rejects failed writes.
- [src/shared/hooks/useFirebaseData.ts:272](../../../../src/shared/hooks/useFirebaseData.ts#L272) rethrows an update failure; it does not turn the error into success before the form sees it.

**Reachable scenario:** enter a title and a long session account on `/story/chapters/create`, then submit while the write is refused or the backend reports a transient failure. The same scenario exists when changing an existing chapter. A deterministic local alternative is attempting an insertion that would exceed the structural batch limit in a large campaign. Whitespace-only required fields also reach the form's own validation catch, though the executed probe uses a rejected valid save rather than relying on browser validation.

**Expected:** remain in the form with title, content, summary and order intact, show the reason, and permit retry. **Actual:** the catch sets an error but `finally` navigates to `/story/chapters` on both success and failure. Leaving the route unmounts the form; its text exists only in component state and has no recovery store. A failing save therefore loses unsaved authored prose and usually prevents the user from reading the error.

**Reproduction/evidence:** [chapter-save-failure.test.js](evidence/probes/functional/chapter-save-failure.test.js) mounts the actual `ChapterForm`, supplies rejecting create/update collaborators, fills valid title/content, and verifies that both failures still call navigation to the list. Both diagnostic cases passed. Navigation itself is a spy in this probe; production route unmount/draft loss is source-traced, not a browser-observed discard.

**Fix and verification:** navigate only after the awaited operation succeeds; use `finally` only for submission-state cleanup. For both create/edit, reject a write, verify that no navigation occurs and every field survives, then retry successfully and verify a single transition. Keep validation errors in place too. This is distinct from DATA-007's simultaneous order allocation: one rejected operation is sufficient.

### FUNC-001 — A fetched cross-campaign note opens as an empty read-only editor

**Severity:** medium. **Confidence:** high. **Classification:** new finding; distinct from fixed note-fetch loop bugs #800/#1150/#1151. A stale fallback after route changes is a separate unverified lead.

**Source evidence:**

- [src/pages/notes/NotePage.tsx:69](../../../../src/pages/notes/NotePage.tsx#L69) fetches a note directly from the reader's flat notes collection and stores a note whose `campaignId` differs. Lines 216–221 explicitly promise the reader can view it.
- [src/pages/notes/NotePage.tsx:229](../../../../src/pages/notes/NotePage.tsx#L229) passes only `noteId` and read-only/actions to `NoteEditor`, never the fetched note.
- [src/features/collaboration/notes/components/NoteEditor.tsx:115](../../../../src/features/collaboration/notes/components/NoteEditor.tsx#L115) loads its title/content only from `getNoteById(noteId)`.
- [src/features/collaboration/notes/context/NoteContext.tsx:117](../../../../src/features/collaboration/notes/context/NoteContext.tsx#L117) restricts saved notes to the active campaign; its lookup at line 157 searches that list. This is why the directly fetched other-campaign note cannot arrive through the editor's lookup.

**Reachable scenario:** with campaign A selected, open a bookmark for one's own persisted note in campaign B in the same group. The direct fetch succeeds; the other campaign need not be selected or changed during the request.

**Expected:** show B's persisted title and text with editing disabled, as the page's banner promises. **Actual:** the page heading and different-campaign banner show the fetched note, but both editor fields remain empty and disabled. The footer reads zero words and not-saved state for content that was successfully fetched. The note's saved data is not lost, but this supported direct-link reading workflow is unusable until the reader selects the other campaign.

**Reproduction/evidence:** [cross-campaign-note.test.js](evidence/probes/functional/cross-campaign-note.test.js) mounts actual `NotePage` and actual `NoteEditor`, returns a synthetic B note from `DocumentService.getDocument`, and makes the A-scoped lookup return undefined. It observes the fetched heading/banner alongside empty disabled fields and zero words. The case passed. Firestore I/O and the outer gate/layout collaborators are mocked; no claim about live policy or account behavior follows from this test.

**Fix and verification:** give the read-only renderer the fetched note explicitly, or render a dedicated read-only note body from `noteToDisplay`. Keep write paths dependent on the active campaign. Verify persisted title/body/word count with an active-campaign miss plus successful other-campaign fetch, and verify a normal active-campaign note still edits and saves correctly. Route-response ownership is separate React work.

### FUNC-002 — A failed rescan deletes previous detections and also reports that no new names were found

**Severity:** medium. **Confidence:** high. **Classification:** new functional recovery finding, not DATA-005's partially committed entity conversion and not a claim about external model reliability.

**Source evidence:**

- [src/features/collaboration/notes/components/CampaignLinksPanel.tsx:231](../../../../src/features/collaboration/notes/components/CampaignLinksPanel.tsx#L231) removes every unconverted persisted detection before calling extraction at line 238. After the result, lines 247–255 write the returned entities and set `scanFoundNothing` whenever the list is empty.
- [src/features/collaboration/entity-extraction/hooks/useEntityExtractor.ts:46](../../../../src/features/collaboration/entity-extraction/hooks/useEntityExtractor.ts#L46) rejects content above 10,000 characters locally, then catches that error at lines 60–70 and resolves `[]` rather than returning a failure result or rejecting.
- [src/features/collaboration/notes/context/NoteContext.tsx:269](../../../../src/features/collaboration/notes/context/NoteContext.tsx#L269) routes updates of a saved note through `saveNote`; line 241 sends the supplied `extractedEntities` patch to `DocumentService.updateDocumentWithAttribution`.

**Reachable scenario:** scan an ordinary saved note and leave an unconverted suggested NPC. Extend the note beyond 10,000 characters, save, and press Scan note again. Notes have no matching authoring size limit, and the Scan button does not check content length. This needs no AI request or backend failure: the hook's local validation alone reproduces it.

**Expected:** validation failure preserves the previous saved suggestions and reports that the scan could not run. A successful empty scan must be distinguishable from failure. **Actual:** the old suggestions are removed before validation. The hook supplies `[]`, so the panel writes an empty detection list again and shows both “Content is too long (maximum 10,000 characters)” and “No new names found in this note.” The source prose and converted entities survive, but the user's saved review queue is lost and the completion message is false.

**Reproduction/evidence:** [failed-scan-recovery.test.js](evidence/probes/functional/failed-scan-recovery.test.js) mounts actual `CampaignLinksPanel` and actual `useEntityExtractor`, supplies one saved unconverted detection and 10,001 characters, and uses a synthetic note-update setter. It observes two note updates ending in `extractedEntities: []`, disappearance of the detection, and the simultaneous error/empty-success messages. The extraction service mock is asserted **uncalled**. The case passed. The update payload and mocked persisted state are observed; actual SDK persistence is source-traced through `updateNote`/`saveNote`, not emulator-observed.

**Fix and verification:** do validation before altering saved detections; distinguish success from failure in the hook's return contract or propagate rejection. Replace the previous unconverted list only after a successful result is available and its save succeeds. Verify local size failure, a synthetic rejecting extraction service, and a rejecting result-save all preserve the previous list and show no successful-empty wording. A genuinely successful empty result should still produce the intended empty answer.

### FUNC-003 — Optional scalar facts cannot be cleared after they have been recorded

**Severity:** medium. **Confidence:** high. **Classification:** new authoring defect; not a missing-feature proposal. The current model allows empty values and current entity edit routes have been retired in favor of these fields.

**Source evidence:**

- [src/shared/components/inline-edit/InlineEditor.tsx:134](../../../../src/shared/components/inline-edit/InlineEditor.tsx#L134) refuses `!trimmed`, and line 184 disables every submit button when the buffer is empty. The component has no field-specific required/allow-empty option.
- [src/pages/npcs/NPCDetailPage.tsx:740](../../../../src/pages/npcs/NPCDetailPage.tsx#L740) edits `npc.title` with that component; role and race do the same at lines 915 and 960. Appearance, personality and background use the same editor at line 1084.
- [src/features/campaign-entities/npcs/types.ts:41](../../../../src/features/campaign-entities/npcs/types.ts#L41) declares title, race and occupation optional; lines 68–70 do so for appearance/personality/background. Quick-add defaults these facts to empty strings rather than requiring them.
- [src/pages/quests/QuestDetailPage.tsx:695](../../../../src/pages/quests/QuestDetailPage.tsx#L695) similarly edits optional background; optional `levelRange` uses the component at line 866.

**Reachable scenario:** an NPC's claimed title proves mistaken, so open Edit the title, select its text, and delete it. Or remove a speculative quest background/level range. These optional values can be absent on a newly created record and have explicit empty-state prompts on their pages.

**Expected:** save an empty optional fact and return that field to its unrecorded prompt. Required names/descriptions and new note/list entries should continue to reject empty input. **Actual:** Save becomes disabled and the handler would refuse it anyway. The user can replace an incorrect fact with other text but cannot retract it through the supported editor. The previous full edit route redirects to the same record, so it provides no alternative correction surface.

**Reproduction/evidence:** [optional-field-clear.test.js](evidence/probes/functional/optional-field-clear.test.js) mounts the actual shared editor with a recorded optional title, clears it, observes disabled Save, and verifies no submit callback. The case passed. NPC/quest call sites and their persistence adapters are source-traced; this probe isolates the common control rather than mounting every entity page.

**Fix and verification:** make requiredness a caller-owned option or provide an explicit clear action for optional scalar fields. Submit an empty string or an intentional deletion value according to the model, never Firestore `undefined`. Verify clearing a real NPC title and quest background through their page adapters, then verify required entity names/descriptions and add-note/tag/objective composers still prohibit emptiness.

### FUNC-006 — A failed chapter deletion closes the confirmation and leaves its retry disabled

**Severity:** medium. **Confidence:** high. **Classification:** new promise-contract/recovery finding for content deletion. No account or campaign deletion lifecycle is assessed here.

**Source evidence:**

- [src/pages/story/ChapterEditPage.tsx:49](../../../../src/pages/story/ChapterEditPage.tsx#L49) catches `deleteChapter` rejection, logs it, and resolves. Its comment says the dialog handles the error, but the error never reaches the dialog.
- [src/shared/components/DeleteConfirmationDialog.tsx:57](../../../../src/shared/components/DeleteConfirmationDialog.tsx#L57) sets deleting, awaits `onConfirm`, and calls `onClose` on resolution. Only its catch at lines 64–67 shows an error and resets deleting.
- [src/pages/story/ChapterEditPage.tsx:92](../../../../src/pages/story/ChapterEditPage.tsx#L92) keeps the same dialog mounted while changing only its open prop. The swallowed rejection thus leaves the instance's `isDeleting` true on reopen.
- [src/features/storytelling/chapters/context/StoryContext.tsx:538](../../../../src/features/storytelling/chapters/context/StoryContext.tsx#L538) awaits the structural delete batch without swallowing rejection; its batch helper at line 66 can also refuse an operation exceeding 500 writes.

**Reachable scenario:** open a chapter's Delete dialog, confirm, and receive a refused batch or transient write rejection. The chapter remains present, so the author opens Delete again to retry.

**Expected:** keep the dialog open with the reason, restore enabled controls, and permit retry. **Actual:** the page swallows the error, the dialog closes as though deletion succeeded, and the unchanged page shows the surviving chapter. Reopening that dialog leaves Delete and Cancel disabled because deleting never reset. A route remount/reload is needed to recover the controls; the failure reason was only logged.

**Reproduction/evidence:** [chapter-delete-failure.test.js](evidence/probes/functional/chapter-delete-failure.test.js) mounts actual `ChapterEditPage` and actual `DeleteConfirmationDialog`, supplies a rejecting delete collaborator, and substitutes only the launcher form and outer dialog presentation. It observes one attempted deletion, dialog disappearance with no error, then a disabled Delete on reopen. The case passed. The structural operation's rejection propagation is source-traced; no live delete was performed.

**Fix and verification:** let the page callback reject, or rethrow after logging so the dialog can implement its contract. Reset the shared dialog's deleting state on all settled paths for resilience. Verify rejection leaves an error and enabled retry, and successful retry removes the chapter and navigates once. Do not change tests to interpret a caught failure as success.

### FUNC-004 — The command palette promises named creation but drops the search text

**Severity:** low. **Confidence:** high. **Classification:** new functional handoff defect. Existing command-palette requirements explicitly say create commands carry the query; this is not a request for an additional creation feature.

**Source evidence:**

- [src/shared/components/command-palette/CommandPalette.tsx:375](../../../../src/shared/components/command-palette/CommandPalette.tsx#L375) displays `New {entityLabel} named "{query}"` for each command. Mouse selection at lines 364–366 and keyboard commit at line 142 call `action.run()` with no query.
- [src/shared/hooks/useCreateActions.ts:30](../../../../src/shared/hooks/useCreateActions.ts#L30) gives `run` a zero-argument interface. Lines 52–59 open NPC/location/quest quick add with no `initialName`; the other launchers likewise receive no typed name/title.
- [src/shared/components/quick-add/QuickAddForm.tsx:68](../../../../src/shared/components/quick-add/QuickAddForm.tsx#L68) defaults `initialName` to an empty string and seeds its name state from that value. The quick-add options already support an initial name; the palette never supplies it.

**Reachable scenario:** search for Droop, decide to create the missing NPC, and choose “New NPC named \"Droop\".” The same loss affects the quest/location commands; note/chapter/rumour launchers also ignore the promised name.

**Expected:** the creation surface receives Droop as its initial name/title while leaving remaining required fields for the author. **Actual:** NPC/quest/location quick add opens with a blank name; the author must type the search again. This does not prevent creation or damage saved records, hence low severity, but the visible action's promised input is discarded.

**Reproduction/evidence:** [palette-create-query.test.js](evidence/probes/functional/palette-create-query.test.js) mounts actual `CommandPalette` and actual `useCreateActions`, selects the named NPC command, and observes `openQuickAdd("npc")` with no options. The case passed. The dialog's blank state follows directly from its default `initialName`; the diagnostic stops at the actual launcher handoff.

**Fix and verification:** pass an optional initial name through the common action interface, have palette actions supply the query, and keep the global create menu's empty invocation. Apply corresponding title semantics to route/local-draft launchers. Verify click and Enter seed the real creation field, then verify the global create button still opens a blank record.

## Diagnostic execution and evidence limits

The coordinator executed:

```sh
node node_modules/jest/bin/jest.js --config /tmp/pass2-functional/jest.config.cjs --runInBand
```

Final result: **6 suites passed / 7 diagnostic cases passed, 4.882 seconds**. The durable [probe sources](evidence/probes/functional/) retain the same assertions and collaborators; see the coordinator's [verification record](verification.md) for preserved output and any reproduction path adjustments. Expected synthetic errors are logged by production catch blocks during these tests.

Two harness corrections preceded that completed run: an absolute `moduleDirectories` override caused Jest 29 to resolve the project's root Jest 27 utility dependency, and initial external mocks used unresolved package-relative paths/fresh collection identities. One hanging diagnostic was terminated while those test-double identities were stabilized. Those preliminary attempts did not execute a complete assessment and are not counted as application regressions. The final run completed all intended assertions.

These probes deliberately isolate functional seams. They execute current component/hook code, but do not execute Firestore write scheduling, browser layout, touch input, real router route teardown or external AI. Each finding says which consequences were observed versus source-traced. Application/config/dependency source was unchanged, so this reviewer relies on the coordinator's pinned first-pass green full baseline instead of launching competing full checks.

## Reconciliation, non-findings and follow-up limits

- **No duplicate first-pass count:** simultaneous slug writes (DATA-001), mutable in-flight write scope (DATA-002), stale whole-record/array updates (DATA-003), partial conversion/promotion persistence (DATA-005), location graph races (DATA-006), chapter allocation races (DATA-007), and attachment-kind ambiguity (DATA-008) remain relevant to these workflows. They are referenced, not renamed as new functional findings. Uploaded-image, security and stopped-auth results remain in their original reports.
- **React ownership:** failed entity writes that tear down an inline editor, retained fields across entity-route reuse, unsaved note navigation, search index readiness/scope, and chapter reader identity/restoration were handed to `06-react-state.md`. Note fallback identity was passed as a lead but is not confirmed in this report. FUNC-001 is the separate fetched-note-to-editor handoff; FUNC-002 is the failure-result contract and destructive rescan ordering. Do not count the same consequence again when combining reports.
- **Ordinary quick-add validation and direct write rejection:** the form catches rejected creates, retains typed name/line, and renders its write error. Required-field validation is tied to the two required values. Create-and-add-another clears only after `submit` reports success. This source inspection does not prove recovery after a source-conversion mark fails; DATA-005 already explains that partial operation.
- **Conversion shape corrections are live:** carried objective strings are normalized to objective records; NPC stance is whitelisted; unsupported rumour statuses become unconfirmed; carried names resolve against loaded NPC/location records. Historical raw-name/objective crash reports must not be refiled on the current source. Whether conversion occurs before the related lists settle is an async-state matter, not established here as a new finding.
- **Failed pre-extraction save:** the panel awaits the editor's save, catches rejection and aborts before extraction. That behavior is present; FUNC-002 begins after the pre-save succeeded. It does not reopen fixed #1051.
- **Note save sequencing:** first autosave of a new local note calls `saveNote`, not the local-only draft update branch. Editor save requests serialize and coalesce behind one in flight, with changed-text comparison before marking clean. This is a source-confirmed improvement; no new simultaneous-editor test or write-count measurement was claimed.
- **Rumour corrections:** source NPC removal is persisted as an empty id by `RumorDirectory` rather than `undefined`; unknown legacy status has a normalized group; rows retain draft text at directory level and preserve session drafts across in-app routes. The untyped attachment identity problem is DATA-008. No broad statement about rumour concurrency or storage scope safety is made.
- **Progress completion:** the story page omits `isComplete` on ordinary scrolls, and the provider merges existing completion; first progress persistence uses a merging upsert. Current source does not reproduce historical #018/#851/#852 as originally filed. Reader restoration before delayed progress and equal-content chapter transitions require the separate React probe. Saga paging has no persisted reader progress contract and is not filed as a missing feature.
- **Designed emptiness:** chapter/notes directories offer first-content actions after successful empty loads; missing entity routes have separate branches; gates prioritize resolving state over terminal selection/error messages. The chapter reader's empty-content copy is generic, but no additional confirmed failure is filed merely for wording. Notes listener error recovery was passed to the React reviewer as a source lead; it is not included in this report's confirmed count without a focused recovery reproduction.
- **Current backlog remains authoritative:** T026 phone chapter-drawer scrolling needs the reporting device and touch-capable reproduction; desktop/jsdom cannot settle it. T017 batch operations, T063 entity-page design convergence, T074 default pictures and T079 legacy `locationId` audit are existing decisions/investigations, not newly discovered bugs. The legacy quest `keyLocations` name-reference concern is #1421, not new.
- **Uncovered:** end-to-end browser journeys, actual offline reconnection and native undo, mobile keyboard/layout and touch, malformed historical production documents, accessibility, external AI behavior/model quality, performance budgets, production data/deployments, Docker/operations, and the deliberately stopped authentication/account lifecycle scope. No security or policy conclusion follows from this review.

Recommended functional fix order: keep chapter save failures in place (FUNC-005), make scan replacement conditional on successful extraction (FUNC-002), pass fetched note data to its read-only view (FUNC-001), restore chapter-delete retry (FUNC-006), permit clearing optional facts (FUNC-003), and carry named-create input (FUNC-004). Coordinate the first two with the distinct React draft-retention work; the fix must remain effective when real provider errors rerender the page.
