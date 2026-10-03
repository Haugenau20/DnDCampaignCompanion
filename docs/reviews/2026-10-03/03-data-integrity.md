# Data integrity and concurrency review

Reviewed commit: `64fe19512b1d3bd14427fad8996403a742fbe8a9`.

Date: 2026-10-03. Reviewer: `gpt-6-astra`, `xhigh` reasoning. This is the approved first-pass assessment described in [plan.md](plan.md). No application source, existing tests, rules, dependencies, or configuration were changed. Temporary probes live under `/tmp`; the coordinator runs them and all shared suites. No production data was read or mutated.

## Result and evidence limits

The main integrity gap is that several operations use a browser snapshot to decide what to write, then perform unconditional writes against shared documents. A listener and an atomic write batch do not make that preceding read current or transactional. The important consequences include overwritten creations, lost unrelated edits, writes redirected into another campaign, and invalid relationship/order graphs.

Ten findings are recorded below. Confidence describes the evidence for the mechanism, separately from severity. Source-runtime probes load and transpile the actual reviewed TypeScript, with deterministic React/Firebase boundaries; they are not browser or Firestore integration tests. The installed Admin Firestore SDK is inspected for its actual failure contract. Emulator results, where available, are identified explicitly. The coordinator's [baseline.md](baseline.md) is the authority for full-suite/build results; this report does not infer correctness from historical green tracker rows.

| Finding | Severity | Confidence | Main evidence |
|---|---|---|---|
| DATA-001: concurrent slug creation overwrites a successful create | High | High | Actual service/helper source-runtime probe |
| DATA-002: pending writes resolve their campaign after the user switches | High | High | Actual service source-runtime probe |
| DATA-003: small edits replace stale complete records and arrays | High | High | Actual quest context source-runtime probe; live callers |
| DATA-004: campaign deletion ignores write failures and loses its retry anchor | High | High | Actual installed SDK plus two emulator failure reproductions |
| DATA-005: conversion/promotion creates a target before the source can commit | Medium | High | Actual rumor context source-runtime probe |
| DATA-006: concurrent hierarchy changes bypass the cycle/cascade guarantees | Medium | High | Actual location context source-runtime probe |
| DATA-007: atomic chapter batches still race on order allocation | Medium | High | Actual story context source-runtime probe |
| DATA-008: mixed entity kinds collide in the relationship picker | Medium | High | Actual candidate helper probe; traced detach handler |
| DATA-009: failed account/group removal loses username cleanup metadata | Medium | High | Actual leave-group callable and emulator failure/retry reproduction |
| DATA-010: campaign deletion does not stop concurrent content writes | Medium | High | Source/rules contract; no end-to-end interleaving run |

## Inspected scope

- CRUD boundaries: `src/core/services/firebase/data/DocumentService.ts`, `src/core/services/firebase/data/DocumentAlreadyExistsError.ts`, `src/core/utils/entity-id.ts`, `src/core/services/firebase/core/BaseFirebaseService.ts`, `src/shared/hooks/useFirebaseData.ts`, and `src/features/user-management/shared/hooks/useFirestore.ts`.
- All four campaign entity contexts: NPC, quest, location, rumor; plus the quest/chapter data-hook contracts. Read the batch helpers, objective normalization, location traversal/reference helpers, deletion dialogs, rumor combine/convert dialogs and batch bar, and their live directory/detail-page callers.
- `src/features/storytelling/chapters/context/StoryContext.tsx`, chapter form/create/edit callers, chapter sorting/progress paths, and `src/features/storytelling/sagas/hooks/useSagaData.ts`.
- Private notes: `src/features/collaboration/notes/context/NoteContext.tsx` save boundaries, `src/features/collaboration/notes/components/CampaignLinksPanel.tsx`, `src/features/collaboration/notes/components/NoteReferences.tsx`, `src/features/collaboration/notes/utils/note-relationships.ts`, quick-add conversion (`src/shared/components/quick-add/useQuickAddCreate.ts`), and the extraction hook boundary. No AI call was made. The editor's autosave scheduling and generic collection-listener implementation were not independently exercised.
- Relationship authoring: NPC/location/quest detail pages, `shared/components/attach-tray/{AttachTray,attachCandidates}.tsx` / `.ts`, and quick-add promotion paths.
- Deletion graph: `firebase/functions/src/campaignManagement/deleteCampaign.ts`, `userManagement/{deleteUser,removeUserFromGroup}.ts`, `shared/deleteUserSubtree.ts`, their existing emulator tests, and the relevant production Firestore rules. Also read campaign create/update and active-context switching contracts.
- Attribution: `src/core/attribution/attribution.ts`, profile-cache scope and invalidation contract, batch stamping, embedded note authors, and chapter shift attribution.
- Requirements/history: repository `AGENTS.md`, `README.md`, review plan/index, `TODO.md`, live behavioral tracker (especially #002/#004/#009/#012, #010, #016/#017, #303, #852, #1203, #1402/#1403/#1405), and current entity-authoring specification/handoffs.

Important exclusions: deployed Firestore contents or migrations; actual browser/network scheduling; high-volume production-scale limits; migration/operator scripts beyond their documented contracts; credential/session and administrator authorization decisions owned by the auth/security reviewers; binary-object lifecycle owned by the image reviewer; and paid extraction behavior. This review does not claim that any observed production campaign has suffered the failures below.

## Findings

### DATA-001 — Concurrent same-slug creations still overwrite each other

**Severity: High. Confidence: High. Classification: newly confirmed concurrency gap in the closed collision-fix family; not a claim that #1402's sequential collision retry stopped working.**

**Sources:** `src/core/services/firebase/data/DocumentService.ts:175-205`; `src/core/utils/entity-id.ts:164-188`; callers `src/features/campaign-entities/npcs/context/NPCContext.tsx:148-152`, `src/features/campaign-entities/quests/context/QuestContext.tsx:260-264`, `src/features/campaign-entities/locations/context/LocationContext.tsx:277-281`, and `src/features/campaign-entities/rumors/context/RumorContext.tsx:183-188,306-310,364-371`. Production rules `firebase/firestore.rules.prod:341-353` allow a member to update existing campaign entities.

**Trigger and actual behavior:** Two members, devices, or independent provider instances create names resolving to the same currently unused slug. Each has its own `issuedIds` set. Both `getDoc` calls at line 185 observe absence before either `setDoc` at line 205 completes. Both operations succeed with the same ID; the later full-document set replaces the earlier author's content and creation attribution. The helper retries only `DocumentAlreadyExistsError`; neither operation throws it in this schedule. Every entity type and rumor merge/quest creation shares this boundary.

**Expected/impact:** Two successful create actions should produce two distinct records, or one should be rejected/retried atomically. Here one successful record silently disappears. Existing references to that ID can now identify the other author's distinct entity.

**Reproduction:** The coordinator ran `/tmp/data-integrity-source-probes.cjs`. It loads the actual `DocumentService` and `createWithUniqueEntityId`, gives each create an independent session set, and holds the reads at a barrier until both have observed absence. Result: both return `shared-name`; one stored record remains. This is a deterministic source-runtime reproduction with Firestore primitives modeled as their documented read/set semantics, not an emulator integration result.

`CampaignService.createCampaign` has the analogous check-then-set at `src/core/services/firebase/campaign/CampaignService.ts:74-89`, reached from `src/features/user-management/admin/pages/AdminCampaignsPage.tsx:85-90`. Its timestamp suffix is also not reserved atomically. This variant overwrites campaign metadata and merges the callers into the same campaign namespace; it does not recursively erase the existing campaign's children. It was source-inspected, not separately executed.

**Fix direction:** Reserve/create the candidate document with a Firestore transaction or server-side create precondition. Preserve the existing collision-only suffix policy if desired, but generate `DocumentAlreadyExistsError` from an atomic refusal. A separate existence read is not a uniqueness constraint.

**Verification:** Synchronize two independent clients before their create commits; assert distinct IDs and both complete records/attributions. Retain controls for a pre-existing slug, same-session overlap, unrelated write failure, and bounded retry. Include campaign creation.

**Tracker reconciliation:** [#1402](../../testing/bug-tracking/1402-cross-session-id-collision-surfaces-developer-error.md) correctly describes a previously completed create encountered by a later read. Its statements that the guard “never overwrites” and that no data is at risk do not cover overlapping reads. #002/#004/#009/#012 remain fixed for the demonstrated same-session scenarios; this is the missing cross-session atomicity case.

### DATA-002 — Switching campaigns can redirect an already-started write

**Severity: High. Confidence: High. Classification: new finding.**

**Sources:** `src/core/services/firebase/data/DocumentService.ts:240-257`, especially the attribution await at 246 preceding path resolution at 255; `src/core/services/firebase/core/BaseFirebaseService.ts:39-40,130-153,204-209`; `src/features/user-management/auth/context/FirebaseContext.tsx:259-272`; `src/shared/components/context-switcher/ContextSwitcher.tsx:142-148,193-198`; context bare-collection writers such as `src/features/campaign-entities/npcs/context/NPCContext.tsx:41-44,177` and `src/features/campaign-entities/locations/context/LocationContext.tsx:226-251`.

**Trigger and actual behavior:** The member belongs to campaigns A and B, and both contain an entity with the same slug (a normal consequence of name-based IDs). Start an update in A while modification attribution needs an outstanding profile read. Switch to B before that read resolves. `updateDocumentWithAttribution` then resolves the bare collection name using the service's new global active campaign. The write meant for A updates B's entity, while A is unchanged. The header does not coordinate switching with pending entity writes. A missing target produces an error instead; data corruption requires the ID to exist in the new scope.

Multi-step operations widen the window: each call in location deletion/promotion and each later conversion source update resolves its bare collection again. Switching after one completed child write can split one logical operation across campaigns. Creation captures its collection reference before its existence read, but fetches attribution afterward; a group switch can therefore also mismatch the captured destination with the attribution profile.

**Expected/impact:** An operation remains bound to the group/campaign where the user initiated it, or is canceled before any write. Actual behavior can overwrite or delete unrelated campaign content and credit it using the old operation's data.

**Reproduction:** Actual `DocumentService.updateDocumentWithAttribution` was called with a held attribution promise and `n1` in both A/B. The coordinator's source probe switches the base service's campaign to B before releasing the promise. A retained its original description; B acquired `edit meant for A`. This validates the service interleaving; no browser timing claim is made.

**Fix direction:** Capture immutable group/campaign/user scope at the start of the logical operation. Construct full paths before the first await and pass them through every stage, including batches and attribution lookups. Do not rely on unmounting a component to cancel an async function that has already begun.

**Verification:** Delay attribution and each stage of a cascade/conversion, switch group or campaign, then release. Assert every write targets the original scope or the entire operation is canceled, and no mixed attribution is persisted. Include identical entity IDs in both campaigns.

### DATA-003 — Unrelated collaborative edits and array updates silently erase each other

**Severity: High. Confidence: High. Classification: new finding; existing status/batch tests do not establish concurrent preservation.**

**Sources:** `src/features/campaign-entities/quests/context/QuestContext.tsx:112-119,145-176,187-213,271-284`; `src/pages/quests/QuestDetailPage.tsx:291-303`; `src/features/campaign-entities/npcs/context/NPCContext.tsx:95-121,173-177`; `src/pages/npcs/NPCDetailPage.tsx:483-485,597-619`; `src/features/campaign-entities/locations/context/LocationContext.tsx:100-111,125-130`; `src/features/campaign-entities/rumors/context/RumorContext.tsx:105-111,135-141,201-211,322-324,382-383`; `src/features/collaboration/notes/context/NoteContext.tsx:284-293`; write boundary `src/core/services/firebase/data/DocumentService.ts:249-257`.

**Trigger and actual behavior:** Two clients start from the same entity snapshot. A saves a title, description, or new note. Before B receives that listener update, B changes a different field or ticks an objective. The quest/NPC page saves and several status/note/objective methods spread the entire old entity into `updateData`, so B sends A's old value back as part of its unrelated edit. `updateDoc` merges the supplied fields, but every stale field was supplied. No version comparison detects the overwrite.

Arrays have an additional lost-update problem even after full-record spreading is removed: two objective ticks on different objectives, two new entity notes, two relationship attachments, or two extracted-entity conversion markers each replace an array computed from the same snapshot. The second write loses the first modification. The current batch status methods correctly send only changed scalar fields; that improvement is not consistently applied to individual actions.

**Expected/impact:** Independent changes should compose, or the user should receive a conflict. Here both operations report success while party notes, relationship links, objective progress, or unrelated prose can be permanently lost. Stored attribution credits the last operation and does not preserve the overwritten content as history.

**Reproduction:** The actual quest context was instantiated twice over the same immutable snapshot. A saved `New title`; B ticked objective 1. The resulting title reverted to `Old title`. A then ticked objective 2 from its snapshot, resetting objective 1 to incomplete. Both calls resolved. This is in the coordinator's source-probe log.

**Fix direction:** Make update APIs accept true patches and have each field editor send its changed field only. Use `arrayUnion`/`arrayRemove` where their exact-value semantics fit; use stable nested IDs and transactional read/modify/write or independently addressable documents for editable notes/objectives/relations. For simultaneous prose edits, add a version precondition/conflict flow rather than claiming last-write-wins preserves both.

**Verification:** Two clients with deliberately delayed listener delivery should edit distinct fields, append distinct notes, tick different objectives, attach different relations, and convert different entities in one private note. Assert all changes survive. Include a same-client pair of different objective rows submitted before the first snapshot re-render.

### DATA-004 — Campaign deletion does not verify cleanup failures and cannot resume after a missing root

**Severity: High. Confidence: High. Classification: new residual failure/recovery issue adjacent to closed #1403.**

**Sources:** `firebase/functions/src/campaignManagement/deleteCampaign.ts:77-79,107-130,138-150`; installed pinned Admin Firestore implementation `firebase/functions/node_modules/@google-cloud/firestore/build/src/bulk-writer.js:677-706` and `index.js:1093-1100` / `recursive-delete.js:193-215`. User-facing caller: `src/features/user-management/admin/pages/AdminCampaignsPage.tsx:94-97`.

There are two related, independently actionable failure paths:

1. The function discards every promise returned by `writer.update` / `writer.delete` at lines 111, 120, 126. The comment at 129 says `writer.close()` rejects after retries are exhausted, but the actual SDK contract says its promise **never rejects**; errors are communicated by the per-operation promises. A failed private-note/progress delete therefore does not stop the awaited sequence from advancing to image deletion and campaign recursive deletion. Ignored rejections can also become an unhandled rejection in the Functions process; that is not a controlled recovery path. The function must observe those results itself.
2. `recursiveDelete(campaignRef)` is not all-or-nothing. The SDK explicitly deletes the requested reference regardless of failures deleting descendants. If a child delete fails but the root deletion succeeds, the callable rejects with part of the graph still stored. A retry then hits the root-existence check at 77-79 and returns `not-found`, permanently bypassing cleanup of the remaining children. The root cannot serve as the only durable record of an unfinished deletion.

**Expected/impact:** Success means every targeted Firestore subtree and external private record has been removed; partial failure remains retryable. Actual behavior can leave private campaign notes/progress or campaign descendants after deletion, remove the only normal route to them, and retain data/billing indefinitely. This concerns stored documents; image consistency is separately owned by the image review.

**Evidence/reproduction:** The coordinator completed three relevant probes. The real installed `BulkWriter`, with only its outbound batch RPC replaced by a terminal failure, fulfilled `close` while the individual write rejected with code 7. `/tmp/data-integrity-deletion-emulator.cjs` loaded the actual TypeScript callable: the result was `success: true`, the private note remained, the campaign was absent, and retry returned `not-found`. That diagnostic catches ignored per-operation rejections to let the post-failure graph be inspected; production unhandled-rejection scheduling is not asserted to be identical. Independently, `/tmp/code-review-campaign-failures.cjs` supplied real `recursiveDelete` with a writer that failed only an NPC descendant: the callable returned `internal`, the root was deleted, the child remained, and retry returned `not-found`. This last case exercises the actual recursive-delete implementation rather than a stub that merely predicts its behavior.

**Fix direction:** Collect and await each BulkWriter write result, and close the writer in cleanup without treating close as success. Introduce a durable deletion operation/tombstone that survives removal of the campaign document. Retrying an authorized existing deletion must clean remaining descendants even when the root is already absent; remove the operation record only after all stages are verified.

**Verification:** Inject a failed private-note delete, failed progress delete, and failed member-profile update separately. Assert campaign destruction does not advance on an unverified stage. Inject a descendant delete failure while allowing the root delete, then retry and assert the complete graph is removed. Verify a retry after a lost success response is idempotent. Happy-path recursive deletion alone does not cover these cases.

**Tracker reconciliation:** [#1403](../../testing/bug-tracking/1403-campaign-delete-confirmed-but-never-performed.md) fixed the missing callable and normal cascade. Its explicit-outside-subtree cleanup is present. The finding is the failure contract and retry barrier of that implemented path, not the historical no-op bug.

### DATA-005 — Conversion and promotion persist the new record before the operation can fail

**Severity: Medium. Confidence: High. Classification: new partial-completion/idempotency issue.**

**Sources:** `src/features/campaign-entities/rumors/context/RumorContext.tsx:306-332,364-390`, limit guard at `46-53`; `src/shared/components/quick-add/useQuickAddCreate.ts:158-179`; `src/features/collaboration/notes/context/NoteContext.tsx:427-450`; `src/pages/locations/LocationDetailPage.tsx:289-305`; `src/pages/quests/QuestDetailPage.tsx:313-332`. Live rumor callers: `src/features/campaign-entities/rumors/components/RumorBatchActions.tsx:89-128,201-218`; dialogs catch and preserve retry at `src/features/campaign-entities/rumors/components/ConvertToQuestDialog.tsx:157-163` and `src/features/campaign-entities/rumors/components/CombineRumorsDialog.tsx:96-106`.

**Trigger and actual behavior:** Convert even one rumor into a quest, or merge rumors. The target create succeeds, then the source batch fails (for example a selected source was concurrently deleted, or a transient write failure occurs). The dialog reports failure, leaves the source offering the operation, and has not retained an operation ID to resume. Retrying creates another target under a new slug. The same sequence exists when quick-add creates an NPC/location/quest and then fails to mark its source note, when a note creates a rumor, and when a free-text feature/place is promoted and removal of the source text fails.

There is a deterministic limit case: selecting **501** rumors creates the new quest or merged rumor before `commitRumorWrites` checks its 500-write limit. No network fault is needed. Selection is reachable through `src/features/campaign-entities/rumors/components/RumorDirectory.tsx:543-550`; `src/shared/hooks/useSelection.ts:33-42` has no count cap, and the convert/combine buttons have no upper-bound check. Ordinary batch status/delete correctly refuse before doing their sole mutation; the defect is the earlier separate target creation.

**Expected/impact:** One logical conversion has one target and consistent source provenance, or visibly resumable partial completion. Actual retries create duplicate quests/entities/locations, leave source records unconverted, and can misdirect later provenance to only the last duplicate.

**Reproduction:** The source probe invokes the actual rumor context's conversion twice with 501 selected rumors. Both calls reject with the limit error; stored targets are `new-quest` and `new-quest-2`, and zero rumors are marked converted. The normal one-source failure window is source-traced; it does not depend on 501 records.

**Fix direction:** Preflight all deterministic validation before the first mutation. Commit target creation and source updates together using a transaction/conditional create where bounded. Otherwise persist a durable operation ID and target ID so retry finishes the existing operation. For note conversions, include the explicit private note path and campaign scope; do not recover by creating a new entity again.

**Verification:** Fail each stage after successful target creation, retry, and assert exactly one target plus completed provenance. Repeat with concurrent source deletion, two clients converting the same source, and the maximum selection boundary. Include note conversion and both promotion callers.

### DATA-006 — Concurrent location moves and deletes break the hierarchy guarantees

**Severity: Medium. Confidence: High. Classification: new concurrency gap adjacent to #010/#303 and the current entity-authoring specification.**

**Sources:** `src/features/campaign-entities/locations/context/LocationContext.tsx:165-190,218-251`; `src/features/campaign-entities/locations/utils/location-tree.ts:208-215`; tree index classification at `52-75`; `src/features/campaign-entities/locations/components/LocationDirectory.tsx:338-358`. Requirement: `docs/design/plan/15-entity-authoring/00-entity-authoring.md` sections 6.2-6.3 (“Never orphan”; reparenting refuses a cycle).

**Trigger and actual behavior:** Two clients see root locations A and B. One moves A under B while the other moves B under A. Both local `wouldCreateCycle` checks pass, and the writes affect different documents, so both succeed. The stored graph is a two-node cycle. Visited sets prevent infinite walks but do not make the graph valid: neither node is a root or an orphan, so both disappear from the ordinary unfiltered tree until searched or opened by ID.

Deletion has the same stale-graph premise. A client captures the direct children/descendants; another creates or moves a child under the target before the deletion completes. The new edge is absent from the captured list, so the parent is deleted and the child remains orphaned. Conversely, a descendant concurrently moved out can still be deleted from the captured deletion list. Sequential deepest-first deletion fixes the old ordering bug only for the original snapshot.

**Expected/impact:** The stored parent graph remains acyclic, and deletion respects its confirmed subtree/strategy. Actual behavior hides valid records in a cycle, or leaves children attached to a deleted parent; under a concurrent move-out, it can also delete a record no longer inside the target.

**Reproduction:** Actual location context functions over independent snapshots accepted both moves and persisted `A.parentId=B`, `B.parentId=A`. A separate source probe added a child after the deleting context captured its snapshot, then performed promote-to-grandparent deletion; parent A was absent while the child's `parentId` remained A. These are deterministic modeled Firestore writes, not browser-emulator tests.

**Fix direction:** Serialize hierarchy-changing operations through a transaction/authoritative server operation with a shared graph version or equivalent conflict record. Validate existence, cycle constraints, and affected edges against the committed graph. A batch of stale writes by itself still permits the cycle and omitted-child cases. Preserve the chosen promotion/subtree behavior and define what to do when the graph changed after confirmation.

**Verification:** Barrier two opposite moves; race create/move-in/move-out with each delete strategy; assert either one operation conflicts/retries or the final graph is valid and matches the action confirmed. Retain deepest-first/partial-failure tests without making that implementation order the only acceptable safe mechanism.

### DATA-007 — Concurrent chapter batches allocate duplicate or inconsistent orders

**Severity: Medium. Confidence: High. Classification: new remaining concurrency defect; historical destructive re-keying is gone.**

**Sources:** `src/features/storytelling/chapters/context/StoryContext.tsx:463-488,505-532,552-555`; write helper at `66-74`; chapter sort `src/features/storytelling/chapters/hooks/useChapterData.ts:5-7`; live create/edit submission `src/features/storytelling/chapters/components/ChapterForm.tsx:112-139`, delete `src/pages/story/ChapterEditPage.tsx:53`.

**Trigger and actual behavior:** Two members create chapters from the same current list, both selecting the next position. Both unique document IDs survive, but both batches assign the same `order`, because the read/max calculation and shifted-order values come from local `chapters`. Two inserts at the same position likewise each shift the old documents once and each insert at the same position. Moves/deletes also compute replacement orders from a stale snapshot rather than a validated current order graph.

**Expected/impact:** Story order remains a single contiguous sequence after concurrent structural changes, or a conflicting operation is retried/refused. Atomicity protects each batch from partial application but does not serialize its preceding read. Duplicate order values make the chapter sequence and displayed numbering disagree with the users' requested positions; later moves/deletes inherit the inconsistency. This finding does not claim that the current stable-ID scheme erases chapter bodies.

**Reproduction:** Two actual story contexts with chapters at orders 1 and 2 concurrently appended distinct titles. Both calls resolved with different IDs; the final orders were `1,2,3,3`.

**Fix direction:** Use a transactional structural version/order record or a server-managed ordering operation. Recompute shifts against the current version on conflict. Stable IDs should remain stable. If order gaps are adopted deliberately, define deterministic uniqueness and insertion semantics instead of merely accepting duplicates.

**Verification:** Concurrent append, same-position insert, crossing moves, and delete-versus-insert with independent clients. Assert every surviving chapter has one defined position and no body/attribution is lost. Retain the existing all-or-nothing size guard. `reorderChapters` has no live UI caller and was not used as the reproduction trigger.

**Tracker reconciliation:** #016/#017 describe an older ID/re-key algorithm. Current source really does batch structural writes and retain IDs; this report does not repeat the obsolete delete-before-create claim. The batch is not a transaction over the list used to build it.

### DATA-008 — A relationship to one entity kind is mistaken for another with the same slug

**Severity: Medium. Confidence: High. Classification: new deterministic relationship corruption.**

**Sources:** `src/shared/components/attach-tray/attachCandidates.ts:81-87,138-149`; `src/shared/components/attach-tray/AttachTray.tsx:28-30,112-116,131-137`; `src/pages/npcs/NPCDetailPage.tsx:460-469,566-593,1198-1210`.

**Trigger and actual behavior:** Create a location and a quest both named “Watchtower”, which legitimately creates the ID `watchtower` in different collections. Set an NPC's location to the location, then open its Relationships picker. The picker receives an untyped `attachedIds` list and marks the quest `Attached` too. Clicking that quest invokes `onDetach('watchtower')`, omitting its kind; the NPC handler matches `npc.locationId` first and clears the location instead of attaching the quest. When two actual relations share an ID, the final handler can remove both NPC and quest relations in the same write, or remove a rumor first.

**Expected/impact:** Relationship identity is `(entity kind, document ID)`. Picking one kind must not remove a different kind's relationship. Actual behavior can make a valid association impossible to attach through this picker and silently delete another association. This needs no concurrent users or malformed data.

**Reproduction:** The actual `buildCandidates` helper was run with a location and quest sharing `watchtower` and an attached location ID. It marked both records attached. The component's toggle and NPC detach precedence were then traced to the persisted wrong-field change. Browser click verification was not performed.

**Fix direction:** Carry typed references throughout candidate membership, exclusions where applicable, attached-chip resolution, and detach callbacks. Route detach by the selected kind rather than searching unrelated collections or deleting every array occurrence of a bare ID.

**Verification:** Seed the same ID in all four entity collections. Attach/detach each kind independently from the NPC page and assert the other three relations are unchanged. Test attached labels and chips as well as persisted writes.

### DATA-009 — Retrying a failed account/group removal strands username reservations

**Severity: Medium. Confidence: High. Classification: new recovery hole in the #1405 cascade fix.**

**Sources:** `firebase/functions/src/userManagement/removeUserFromGroup.ts:83-89,112-138`; `firebase/functions/src/userManagement/deleteUser.ts:94-106,119-126`; `firebase/functions/src/shared/deleteUserSubtree.ts:25-36`.

**Trigger and actual behavior:** The function reads the username from the group-user document, queues deletion of the username reservation in a batch, and successfully recursively deletes the group-user profile and private subtree. The later batch commit fails. On retry the username's only lookup source is now missing, so no reservation delete is queued. The retry can finish removing membership/account data while `groups/{g}/usernames/{oldName}` remains owned by the departed/deleted UID.

**Expected/impact:** Retrying should complete all cleanup. The leaked reservation permanently blocks another member from using that name and retains an unnecessary user identifier. A normal member cannot delete somebody else's reservation. This is separate from the auth review's later failure between global-profile deletion and Firebase Auth deletion.

**Evidence/reproduction:** The coordinator ran `/tmp/data-integrity-deletion-emulator.cjs` against the actual remove-user callable, injecting failure only into the final batch commit after a real recursive delete. The retry returned `success: true`; the global `groups` list was empty and the username reservation remained. Account deletion has the same source ordering; the username variant was executed through leave-group, not separately through Auth account deletion.

**Fix direction:** Persist the cleanup manifest before destroying the document that identifies the reservation, or find all reservations owned by the target UID during retry. Make the remaining stages independently resumable. Handle concurrent username changes/ownership changes with appropriate preconditions rather than deleting a newly reassigned name blindly.

**Verification:** Fail final commit after subtree removal for both leave/remove and account deletion, then retry and inspect reservations, global membership, group profile, notes, and Auth state. Also inject partial subtree failure. A test that only makes `recursiveDelete` reject before changing anything does not cover this window.

**Tracker reconciliation:** [#1405](../../testing/bug-tracking/1405-delete-user-orphans-notes-subcollection.md) correctly fixes normal private-subtree deletion. Its retry explanation loses this metadata between stages; the finding does not claim the normal recursive delete is missing.

### DATA-010 — A deleting campaign remains writable during and after the cleanup scan

**Severity: Medium. Confidence: High for the contract; the full interleaving is source-only. Classification: new deletion/concurrency issue.**

**Sources:** `firebase/functions/src/campaignManagement/deleteCampaign.ts:77-148`; production rules `firebase/firestore.rules.prod:261-273,326-353`; explicit private-note save `src/features/collaboration/notes/context/NoteContext.tsx:228-241`; campaign-scoped write boundary `src/core/services/firebase/data/DocumentService.ts:65-74,205,257`.

**Trigger and actual behavior:** A member is editing a note while an admin deletes its campaign. The callable scans that member's notes, then moves on to other members, Storage, and the campaign subtree. A save/create made after the note scan is not part of the queued deletions. No deleting marker or lock refuses the write. Notes are outside the recursively deleted campaign subtree, and their rule permits owner writes without testing campaign existence. Campaign entity rules also require group membership rather than existence/state of the parent campaign, so a queued create can write a descendant after its campaign root has disappeared.

**Expected/impact:** Once campaign deletion takes responsibility for removing the graph, new writes are fenced off or included in a resumable cleanup. Instead, otherwise normal client saves can leave private notes or entity documents under a deleted campaign, with no campaign available in the app to retrieve or delete them. Group/account removal has a related own-note write boundary, owned jointly with the security/auth lifecycle reviews; the campaign path is the concrete finding here.

**Evidence:** No source stage marks the campaign deleting. The rules contain no campaign-state/existence predicate, and the query is a one-time snapshot. This was not reproduced as a live browser/emulator scheduling test. It is distinct from DATA-004: it requires no write failure at all.

**Fix direction:** Introduce a durable deleting state before scanning, enforce that state and campaign existence at every content-write boundary (including notes whose campaign is a field), and let authorized deletion retries finish after the parent is gone. This should use the same deletion operation model as DATA-004, with security review of the rules changes.

**Verification:** Pause deletion immediately after a member's note query; attempt note create/save, progress write, entity create, and a queued offline write. After finishing and retrying deletion, assert writes were refused or all targeted records were removed, while other campaigns remain intact.

## Checks and reproductions

The coordinator ran `/tmp/data-integrity-source-probes.cjs` against the fixed checkout. The script reads the actual `.ts`/`.tsx` files and uses `typescript.transpileModule`; contexts run under small hook stubs with independently captured snapshots. Its Firestore read/set/update boundaries are deterministic fakes. The last probe uses the installed real `@google-cloud/firestore` BulkWriter and replaces only the current batch's outbound `_commit` RPC.

Confirmed source-runtime outcomes reported by the coordinator:

- Two explicit-ID creations returned the same slug and left one record.
- A held-attribution update changed campaign B after being initiated for A.
- Concurrent chapter appends left duplicate order 3.
- Quest title and independent objective changes were overwritten by later stale writes.
- Opposite location moves persisted a cycle; a concurrently added child survived deletion with a missing parent.
- Two rejected 501-rumor conversions left two quests and no converted-source marker.
- A location-only attachment caused an identically keyed quest to be marked attached.
- Real BulkWriter `close` fulfilled while its individual delete rejected with terminal code 7.

Two early diagnostic harness defects were repaired without touching repository source: the quest read stub initially omitted its public `getQuestById` contract, and the first BulkWriter transport stub did not preserve the SDK's retry scheduling. The final script exited 0 with its `ALL SOURCE PROBES COMPLETED` marker. Its 15-second watchdog prevents an unresolved promise from being mistaken for successful completion. Evidence: `/tmp/code-review-baseline/data-source-probes.log`.

The separate `/tmp/data-integrity-deletion-emulator.cjs` uses actual source callable handlers and actual Admin SDK Firestore operations, under only the disposable `demo-review-data-deletion` project. The coordinator ran it successfully with its completion marker: failed private-note cleanup still returned campaign-deletion success and left the note, and failed leave-group final commit followed by retry left the reservation. Evidence: `/tmp/code-review-baseline/data-deletion-probes.log`. It refuses to run without localhost emulator endpoints and injects only the named failure boundary.

The coordinator also completed `/tmp/code-review-campaign-failures.cjs` against disposable emulator data. Real partial recursive deletion removed the campaign root but retained the failed NPC descendant, and the callable refused retry with `not-found`. Evidence: `/tmp/code-review-baseline/campaign-failure-probes.log`, ending `ALL CAMPAIGN PROBES COMPLETED`. Its separate Storage-before-document-failure result belongs to the image report. Full test/build outcomes and any remaining blocked checks belong in [baseline.md](baseline.md).

## Disproved leads, deliberate choices, and residual questions

- **Group deletion remains a planned feature (T037).** Its absence is not filed as a new implementation bug. The account/campaign graph findings above are inputs to that plan.
- **No blanket reciprocal-link requirement was invented.** Location `connectedNPCs`, NPC `locationId`, quest `relatedNPCIds`, and NPC `connections.relatedQuests` can express separate claims. `src/pages/locations/LocationDetailPage.tsx:217-219` explicitly acknowledges the separate directions; some missing/deleted references have intentional display fallbacks. DATA-008 concerns selecting the wrong existing relationship, not failure to enforce an unspecified symmetry.
- **`src/features/collaboration/notes/utils/note-relationships.ts` has no production caller.** Its read/replace-array helpers are not reported as an independently reachable defect. The live note conversion markers and inferred references were reviewed instead.
- **Attribution consolidation works on the inspected normal paths.** Creation and modification helpers separate creator from modifier; batch status operations explicitly stamp attribution; automatic chapter shifts only change `order` and intentionally preserve authorship. A five-minute cross-device profile cache is an explicit policy in `src/core/services/firebase/core/BaseFirebaseService.ts:194-198`, not independently classified as a bug. DATA-001/DATA-002/DATA-003 can nevertheless destroy or mis-scope attribution as part of their concrete failures.
- **Chapter IDs are now stable and structural writes really are atomic batches.** The old re-key/delete-before-create tracker descriptions are stale. The 500-write guard refuses an oversized single chapter change before it writes; no claim is made that exceeding that deliberate limit is itself data corruption. DATA-007 is the separate stale-read concurrency issue.
- **Progress is scoped to user and campaign and saved with merge semantics.** Different chapters' progress patches no longer replace the complete map. Same-chapter competing-device semantics and unread initial-fetch timing still merit a targeted future browser test; they are not counted here as an additional confirmed finding.
- **Depth caps are not complete validation.** `descendantIdsDeepestFirst` stops beyond 64 levels and can omit deeper descendants, while writes do not impose a matching maximum depth. This is source-visible but requires a pathologically deep hierarchy; it is a low-priority residual concern rather than a main first-pass finding. Cycle-safe traversal also does not repair the invalid graph in DATA-006.
- **Legacy `location` text is intentionally retained pending T079.** No production audit was performed to determine how many old documents still need the `locationId` fallback. It is not safe to remove that compatibility path on this review's evidence.
- **Saga upsert and read-error semantics remain a coverage limitation.** `useSagaData` rechecks attribution on a missing cached document, but the generic `getDocument` converts read failure to null, and first-save concurrency is not transactional. The normal #1203 creator-preservation path was inspected; a delayed failed-read/switch/browser reproduction was not run and no additional saga-specific finding is claimed.
- **User membership/last-admin/credential lifecycle is cross-referenced to [02-auth-account-lifecycle.md](02-auth-account-lifecycle.md).** DATA-009 owns graph cleanup metadata. Security owns privilege and quota-integrity findings. [04-uploaded-images.md](04-uploaded-images.md) owns the binary-object effects of interruption, deletion, and stale document writes.

Recommended implementation order: bind write scope and make creation conditional; remove stale complete-record writes; make deletion resumable and verify each operation; then enforce transactionally consistent order/hierarchy and conversion provenance. The mixed-kind relationship defect is independently small and can be fixed without waiting for the larger concurrency design.
