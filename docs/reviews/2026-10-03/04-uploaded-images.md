# Uploaded-image lifecycle review

Reviewed commit: `64fe19512b1d3bd14427fad8996403a742fbe8a9`.

Date: 2026-10-03. Reviewer: `gpt-6.1-sol`, `xhigh` reasoning. Scope: actual uploaded campaign pictures and their Firebase Storage/Firestore lifecycle. This is an assessment; no application, test, rule, dependency, deployment, or backlog files were changed. Temporary probes use fake I/O or an isolated `demo-` emulator project; no production images were uploaded or mutated.

The ordinary single-operation order is sound: upload before attachment, attachment before old-file deletion, and document removal before entity-image cleanup. The principal defects occur when the document target changes during an upload, when an unrelated stale write restores an already-deleted image reference, or when a pending attachment outlives the sweeper's grace period. These cases contradict the stronger claim in `useImageAttachment.ts:30-39` and storage design §7 that this ordering can *never* leave a document pointing at a missing file.

## Inspected workflows and contracts

| Workflow | Live path and current contract |
|---|---|
| Preparation | `ImageUploadControl.handleFile` → `prepareImage`. Inputs over 20 MiB are refused; nonempty non-image MIME types and the SVG MIME type are refused; blank MIME types are decoded. `createImageBitmap` applies image orientation, the longest edge is reduced to at most 1600 pixels, a canvas re-encodes WebP with JPEG fallback, and one lower-quality retry handles oversized output. Brightness measurement is optional. |
| NPC portrait | `NPCDetailPage` → `useImageAttachment` → `ImageStorageService.upload` → `updateNPC` → `useFirebaseData.updateData` → `DocumentService.updateDocumentWithAttribution`. The page sends a complete captured NPC snapshot when saving an image or an inline field. The document service chooses the current singleton group/campaign at write time. |
| Location picture | `LocationDetailPage` → the same attachment hook/service → `updateLocation` → the same document service. `updateLocation` currently forwards a field patch; separate live note and single-location status helpers still send complete location snapshots. |
| Group crest | `PartyCrest` → attachment hook → `useGroups.setGroupCrest` → `GroupService.setGroupCrest`. The save callback captures an explicit group ID and `updateDoc` writes only `crest`. The UI shows controls to group admins. |
| Campaign banner | `CampaignBanner` → attachment hook → `useCampaigns.updateCampaign` → `CampaignService.updateCampaign`. The save callback captures group/campaign IDs and writes a banner patch plus modification attribution. |
| Replacement/removal | The attachment hook captures the original `current` value. Replacement saves the newly uploaded metadata and then starts best-effort removal of the captured old path. A rejected save starts best-effort removal of the new path. Removal saves `null` and then removes the captured path. Cleanup failures are logged. |
| NPC deletion | `NPCContext.deleteNPC` / `deleteNPCs` capture image paths, remove the document(s), then start best-effort binary deletion. |
| Location deletion | `LocationContext.deleteLocation` supports subtree deletion and child promotion. Subtree cleanup covers every captured deleted location after the document pass. A partial document-pass failure can leave already-deleted locations' pictures until the sweep; promotion retains children's pictures. |
| Campaign deletion | `CampaignService.deleteCampaign` calls the server handler. It removes outside-subtree notes/progress first, then deletes the campaign Storage prefix with a trailing slash, then calls Firestore `recursiveDelete`. |
| Sweep | `sweepOrphanedImagesDaily` runs daily at 04:00 Europe/Copenhagen. The helper reads image references from NPCs, locations, campaigns, and groups before listing Storage files; recognized unreferenced objects at least 24 hours old are deleted. Unknown path layouts and objects of unknown age are retained. Support screenshots are always unreferenced and are deleted after the same interval. |
| Display/access URLs | `ImageSlot` and `bandPicture` validate the URL origin and bucket path before drawing the image; `BandPicture` renders the accepted image. Campaign-image upload obtains a tokenized URL and sets one-year immutable caching under a fresh UUID filename. Screenshot upload returns a path without calling `getDownloadURL`. Bearer-URL visibility after group departure is an explicit design decision; live token issuance and Storage permissions belong to the security report. |
| Support screenshot extension | `ScreenshotField` prepares/uploads a local preview; `ContactForm` sends `screenshotPath` through the callable. `contact.ts` checks the caller's support prefix/name, file metadata type and size, reads the attachment, sends the email, then deletes the screenshot best effort. No contact email was sent in this review. |

### Inspected paths

- Instructions/contracts: `AGENTS.md`, `README.md`, `docs/reviews/2026-10-03/{plan,README}.md`, `docs/superpowers/specs/2026-09-24-storage-images-design.md`, `docs/superpowers/plans/2026-09-24-storage-images.md`, `TODO.md`, `todo.txt`, and applicable rows in `docs/testing/bug-tracking/README.md`.
- Preparation/storage: `src/core/utils/prepare-image.ts`, `src/core/utils/band-dimming.ts` (brightness measurement), `src/core/types/storedImage.ts`, `src/core/services/firebase/storage/ImageStorageService.ts`, `src/core/services/firebase/{core/BaseFirebaseService,data/DocumentService,group/GroupService,campaign/CampaignService,index}.ts`, Firebase configuration and the Storage/App Check initialization path in `src/index.tsx`.
- UI/write glue: `src/shared/hooks/{useImageAttachment,useFirebaseData}.ts`, `src/shared/components/{ImageUploadControl,DeleteConfirmationDialog,BandPicture,PicturedBand}.tsx`, `src/core/components/ImageSlot.tsx`, `src/shared/components/entity-page/EntityPageShell.tsx`, `src/pages/{npcs/NPCDetailPage,locations/LocationDetailPage}.tsx`, `src/pages/layouts/dashboard/sections/{PartyCrest,CampaignBanner}.tsx`, NPC/location contexts and their directory call sites, user-management `useGroups`, `useCampaigns`, `useFirestore`, and `FirebaseContext` refresh/switch paths.
- Backend: `firebase/functions/src/{imageMaintenance/sweepOrphanedImages,shared/imageBucket,campaignManagement/deleteCampaign,contact}.ts`; review/development Storage rules and relevant Firestore path contracts.
- Existing test evidence: preparation, image service, image hook/control/slot, NPC/location image deletion, crest/banner wiring, Functions sweep/campaign deletion, and screenshot/contact test scaffolding. These are mocked or emulator tests, not evidence of current production rule deployment or browser codec behavior.

### Important exclusions

No live console/rule snapshot, production App Check request, bucket CORS/CDN/token-revocation behavior, real browser file-picker/codec run, or downloaded EXIF inspection was performed. Safari/HEIC behavior, orientation on actual photographs, low-memory devices, and extreme decoded dimensions remain unverified. The central baseline and emulator/rules outcomes are recorded by the coordinator in [baseline.md](baseline.md). Storage authorization and Markdown external-image tracking are owned by [01-security.md](01-security.md); graph/cascade correctness and general write races are owned by [03-data-integrity.md](03-data-integrity.md). Unimplemented avatars/quest/rumor/chapter image uploads and Docker/container images are outside this report.

## Confirmed findings

### IMG-001 — Switching group/campaign during an upload can attach it elsewhere and delete the original image

**Severity:** high. **Confidence:** high for the source mechanism and deterministic reproduction; end-to-end browser timing was not exercised. **Classification:** new finding, shared root cause with the data-integrity review's mutable write-context finding.

**Source:** `src/pages/npcs/NPCDetailPage.tsx:483-495`; `src/pages/locations/LocationDetailPage.tsx:247-258`; `src/shared/hooks/useImageAttachment.ts:43-59`; `src/features/campaign-entities/npcs/context/NPCContext.tsx:159-178`; `src/features/campaign-entities/locations/context/LocationContext.tsx:71-87`; `src/shared/hooks/useFirebaseData.ts:272-291`; `src/features/user-management/shared/hooks/useFirestore.ts:89-101`; `src/core/services/firebase/data/DocumentService.ts:51-83,240-257`; `src/core/services/firebase/core/BaseFirebaseService.ts:38-40,130-153`.

**Trigger/preconditions:** A member starts replacing an NPC/location image in group/campaign A, then switches to group/campaign B before the upload finishes. B contains an entity with the same ID; name-derived IDs make that a realistic precondition. The user remains a member of A and may write B. The upload callback continues after the old page/control unmounts.

**Expected:** File upload and document attachment refer to the same captured owner. A context switch must either complete the original operation against A or cancel it safely.

**Actual:** Storage uses the prefix captured from A. Once the upload finishes, the old save callback calls `DocumentService` with the short collection name (`npcs` or `locations`); that service constructs its path from the singleton's *then-current* group/campaign B. The hook sees a successful save and deletes its captured old A image. A's document still points at that deleted binary. B receives A's newly uploaded picture and its bearer URL; the NPC path can additionally overwrite B with the old A NPC snapshot. Crest and banner saves use explicit IDs and do not share this particular target-selection defect.

**Impact:** An unrelated campaign/group record receives unintended content, including a usable image URL, while the original campaign loses its previously valid image. This is more than an orphan or last-writer conflict between edits to the same record.

**Evidence/reproduction:** The coordinator ran `node /tmp/uploaded-images-review-probe.cjs /workspace/DnDCampaignCompanion` at the reviewed SHA. `uploadFollowsSwitchedContext` executes the actual hook and actual `DocumentService` with deterministic fake Firebase I/O. It paused upload, changed `g1/c1` to `g2/c2`, resumed, and observed `savedInSelectedGroup: "g2"`, `binaryGroup: "g1"`, `originalStillReferencesDeletedObject: true`. Log: `/tmp/code-review-baseline/image-source-probes.log`. The permission precondition is supported by both intended groups being writable by the caller; the probe is not a production authorization test.

**Fix direction:** Pin the complete owning Firestore path and attribution group before the first asynchronous step, and pair it with the captured Storage prefix throughout attachment. Alternatively, cancel/reject completion when the captured owner is no longer current, retaining A's old file and cleaning only the uncommitted new file. Address generic mutable-context writes with the data-integrity fix.

**Verification proposal:** With two writable campaigns containing the same NPC/location ID, pause Storage completion, switch campaign (and separately group), then resume. Assert that B is untouched, A's document references an existing A object, and no unrelated image is deleted. Exercise navigation/unmount and both a successful original attachment and safe cancellation.

### IMG-002 — Ordinary stale snapshot writes can restore an image whose object was deleted by replacement

**Severity:** medium. **Confidence:** high. **Classification:** new image-loss consequence of the stale full-record write root cause shared with the data-integrity review.

**Source:** `src/pages/npcs/NPCDetailPage.tsx:483-485,605-609,707-713`; `src/features/campaign-entities/npcs/context/NPCContext.tsx:81-100,103-122,159-178`; `src/features/campaign-entities/locations/context/LocationContext.tsx:90-112,115-131`; live location callers at `src/pages/locations/LocationDetailPage.tsx:268-272,361` and `src/features/campaign-entities/locations/components/LocationDirectory.tsx:254`; deletion at `src/shared/hooks/useImageAttachment.ts:49-57`; final patch persistence at `src/core/services/firebase/data/DocumentService.ts:240-257`.

**Trigger/preconditions:** Two sessions, or two asynchronous actions, start from a record with image A. An ordinary note/relationship/status or NPC inline-field save carries that complete snapshot and is delayed; a replacement saves image B and successfully deletes A; the older ordinary write then lands. A delayed attribution-profile read or a delayed client's request creates the window even with real-time listeners, because listeners do not change already-captured write payloads.

**Expected:** A write to an unrelated field preserves the current image. Image removal must not be undone by unrelated stale fields.

**Actual:** Full snapshots carry the obsolete `image` field into `updateDoc`. The later ordinary write changes the document's image back to A after the hook has removed A's Storage object. B becomes unreferenced and may later be swept. Location's general `updateLocation` is currently patch-safe; the defect there is specifically its separate note and single-location status helpers. Batch status updates write field patches and are not this path.

**Impact:** A successful image replacement can become a broken picture after someone performs an unrelated edit. The former valid binary is already deleted, so the sweep cannot repair the document and may remove B as well.

**Evidence/reproduction:** `staleNoteRestoresDeletedImage` in the coordinator-run source probe executes the actual `NPCProvider.updateNPCNote`, actual `updateNPC`, and actual attachment hook. It held the old note payload, completed replacement/deletion, then released the note write. Observed result: `persistedImage: "old"`, `persistedObjectExists: false`, `replacementBecameOrphan: true`. Firebase I/O and React wiring were mocked; the payload-construction and image cleanup code were actual reviewed source. Existing image-order tests exercise one operation at a time and do not cover this interleaving.

**Fix direction:** Send only the intended changed fields for every ordinary mutator; in particular, stop spreading the full NPC/location into unrelated updates. Use an appropriate transaction/atomic field operation for note-array concurrency where needed. For image changes, capture the actual replaced reference from the committed document and ensure cleanup cannot remove a still-referenced object.

**Verification proposal:** Delay an unrelated field/note write from snapshot A, complete replacement A→B, then release the old write. Assert that the unrelated edit succeeds, the image remains B, and B exists. Repeat for NPC inline fields/notes/relationships and location notes/single status. Include a remove→unrelated-save interleaving to prevent deleted image metadata from returning.

### IMG-003 — The orphan sweep can delete a valid upload while its document write is pending offline

**Severity:** medium. **Confidence:** high; source and actual Firebase-client/emulator reproduction. **Classification:** new finding; no matching open tracker entry found.

**Source:** `src/shared/hooks/useImageAttachment.ts:49-57`; `src/core/services/firebase/storage/ImageStorageService.ts:136-149`; `src/core/services/firebase/data/DocumentService.ts:255-257`; `firebase/functions/src/imageMaintenance/sweepOrphanedImages.ts:6-11,50-68,78-84,103-121`.

**Trigger/preconditions:** Storage upload completes, but the Firestore attachment is queued after the connection is lost. The original tab remains open and the write remains pending for at least a day, until a daily sweep sees the object as old. This is a rare interrupted-tab case; short interruptions and fresh uploads are correctly protected by the age guard.

**Expected:** Cleanup distinguishes an abandoned upload from an attachment that can still commit, or prevents a late attachment from committing after its binary has been collected.

**Actual:** The helper checks only object creation age and already-persisted references. It has no pending-attachment intent, lease, or finalization check. Once the grace period expires it deletes the binary. The queued client write can later commit its `StoredImage` metadata; the successful hook then also removes the old picture. The statement at sweep lines 97-98 protects new uploads during the sweep, not old pending attachments.

**Impact:** Reconnecting can report a successful upload while committing a permanent missing-object reference and deleting the previously valid picture. Increasing the grace period only moves this failure threshold.

**Evidence/reproduction:** `sweepDeletesPendingSave` executes the actual hook and actual sweep with deterministic fake I/O and reproduced deletion followed by a successful missing-object attachment. The coordinator additionally ran `node /tmp/uploaded-images-offline-emulator-probe.cjs /workspace/DnDCampaignCompanion`, exit 0, against the central Firestore/Storage emulators in the isolated `demo-uploaded-images-offline-review` project. It uploaded with Admin Storage, used the actual Firebase client to disable networking and queue `updateDoc`, invoked the actual sweep with its clock advanced two days, then enabled networking. Observed `queuedWriteAcknowledgedAfterReconnect: true`, `pendingObjectSwept: true`, `eventualReferenceObjectExists: false`. Log: `/tmp/code-review-baseline/image-offline-probe.log`. Advancing the injected sweep clock replaces a real two-day wait; actual SDK queuing/reconnection and actual object deletion were exercised.

**Fix direction:** Introduce a durable upload/attachment intent before uploading, with a server-coordinated finalization/collection protocol. Finalization must reject or recover an expired/deleted upload instead of writing a missing-object reference. If collection is lease-based, a late client must not bypass expiry after reconnect. Retain the original current image until finalization is valid.

**Verification proposal:** Upload a new object in a disposable emulator project, disable the client Firestore network and enqueue attachment, advance the sweep's injected clock past 24 hours, then reconnect. Assert that either the valid upload is retained and attached or finalization fails safely with the original image retained. Test expiry immediately before and during a sweep as well as an abandoned upload that should be collected.

### IMG-005 — Campaign deletion removes images before a failed document deletion, leaving live broken references

**Severity:** medium. **Confidence:** high; actual callable handler and Storage/Firestore emulator evidence with injected failure. **Classification:** new image-consistency finding; overlaps the data-integrity review's partial campaign-deletion/retry finding. It is not the old #1403 no-op defect.

**Source:** `firebase/functions/src/campaignManagement/deleteCampaign.ts:77-79,132-148,151-162`; client callable path at `src/core/services/firebase/campaign/CampaignService.ts:237-250`.

**Trigger/preconditions:** A group admin confirms campaign deletion. The campaign Storage-prefix cleanup succeeds, but the following Firestore `recursiveDelete` fails before removing the image-owning document, or fails partway and leaves descendants. A transient/backend failure is sufficient; no malicious data or permission bypass is required.

**Expected:** A failed, incomplete deletion has a resumable lifecycle and does not present surviving records as normal content with irretrievably missing pictures. The comment's proposed retry must remain available even if recursive deletion partially removes the root.

**Actual:** The function removes every campaign object before it attempts Firestore deletion. If the latter fails, live campaign/NPC/location documents can remain with their original `StoredImage` values but no underlying binaries. The function returns an error without marking the campaign as deleting or recording a recovery job. A second independently reproduced case showed real recursive deletion removing the campaign root while retaining a failed child; subsequent retries are refused by the earlier `campaignDoc.exists` guard. That retry defect is owned by the data-integrity report, and compounds rather than repairs the missing-picture state.

**Impact:** A failed delete can leave an accessible campaign permanently missing all pictures, or strand incomplete deleted-campaign records while the UI's ordinary retry cannot finish. The user authorized deletion, so this is assessed as medium partial-operation/recovery failure, not an unauthorized destructive action.

**Evidence/reproduction:** The coordinator ran `/tmp/code-review-campaign-failures.cjs` against its central emulators, exit 0. `storage-cleanup-before-failed-document-delete` used actual Storage deletion and the actual callable, injecting an unavailable error at `recursiveDelete`; observed `code: "internal"`, `campaignExists: true`, `npcExists: true`, `fileExists: false`, `brokenPersistedImageReference: true`. `root-deleted-despite-child-failure` used real recursive deletion with a terminal descendant-delete failure; observed `campaignExists: false`, `descendantExists: true`, `retry: "not-found"`. Log: `/tmp/code-review-baseline/campaign-failure-probes.log`. These are controlled failure injections, not claims of an observed production outage.

**Fix direction:** Make deletion a durable, fenced, resumable operation rather than depending on the live campaign root as the retry marker. Mark the campaign as deleting, stop normal access/writes, complete document cleanup before irreversible binary cleanup where possible, and retain retry state outside the subtree. A surviving reference should not be exposed as normal completed content after its file is removed. Coordinate the ordering/recovery design with the data-integrity fix; simply swapping two calls creates a different orphan-retry failure.

**Verification proposal:** Inject failure before recursive deletion, on a child deletion after the root is removed, during Storage deletion, and after a partially successful Storage pass. Retry the same operation and prove all intended documents/files are eventually removed, unrelated campaign/crest paths survive, and remaining live records cannot keep a normal broken-image state. Include a concurrent upload attempt while deletion is in progress.

### IMG-004 — Exactly 2 MiB passes preparation but violates the upload rule

**Severity:** low. **Confidence:** high. **Classification:** new finding; narrow byte-boundary mismatch, not an authorization hole.

**Source:** `src/core/utils/prepare-image.ts:8-12,141-145`; `firebase/storage.rules.prod:79-83`; screenshot recheck at `firebase/functions/src/contact.ts:194-195,268-270`; error presentation at `src/shared/components/ImageUploadControl.tsx:53,114-116`.

**Trigger/preconditions:** Browser encoding produces exactly `2,097,152` bytes, on either the first encode or the retry.

**Expected:** Preparation returns only output that satisfies the documented Storage size constraint, or retries/rejects it with its specific preparation error.

**Actual:** Both preparation checks use `>` and therefore accept equality; the production-rule review copy and contact screenshot check require `<`. The app proceeds with an upload that the reviewed rules reject and displays a generic retry message. Retrying the same deterministic encoding does not change the mismatch.

**Impact:** An uncommon valid input fails with misleading retry advice. Existing oversized-output tests use limit±1 and miss equality. The production console rules were not read, so rule deployment parity is an explicit limit on this claim.

**Evidence/reproduction:** `exactUploadLimit` runs actual preparation with a mocked canvas emitting a 2 MiB WebP. It observed `preparedBytes: 2097152`, `acceptedByPreparation: true`, `acceptedByRulesSizePredicate: false`; the predicate was checked against the actual review-copy rule source, not a live request.

**Fix direction:** Use the same inclusive/exclusive limit in preparation, Storage, and screenshot validation. Keeping the reviewed `<` rule means retrying when output is `>= MAX_UPLOAD_BYTES` and rejecting if the retry is still `>=`.

**Verification proposal:** Check first encode and retry at limit−1, limit, and limit+1; prove every returned prepared image satisfies the production-rule size predicate. Run the exact-byte case against the reviewed Storage rules in the central emulator suite.

## Checks, concerns, and verified non-findings

The coordinator executed the deterministic source probe successfully (four cases, exit 0), the actual-client offline/sweep emulator probe (exit 0), and the campaign fault-injection emulator probe (exit 0). The source probe uses TypeScript transpilation of production source and fake boundary I/O. The latter two use isolated `demo-` data and the already-running central emulators. Outputs are `/tmp/code-review-baseline/{image-source-probes,image-offline-probe,campaign-failure-probes}.log`. These checks verify the stated interleavings and byte predicate, not real browser codecs or production infrastructure. Broad suites and emulator setup are intentionally centralized; this reviewer did not start a competing test runner or emulator.

A partially failing Storage `deleteFiles` can also remove some files while leaving owning documents, by the same ordering as IMG-005. That specific Storage fault was not injected; the confirmed finding uses a following Firestore fault. The broader retry defect is independently recorded by the data-integrity reviewer, so reconciliation should preserve one shared campaign-deletion lifecycle root cause.

Other reviewed behavior:

- Rejected document saves preserve the previous file and try to remove the newly uploaded file; rejected uploads do not enter document save. If `getDownloadURL` fails after binary upload, the object may remain until the sweep. That is an orphan supported by the existing recovery design, not proof of a broken reference.
- UUID filenames plus immutable caching avoid overwriting an existing object or reusing a stale URL in the normal upload path. `remove` treats `storage/object-not-found` as success.
- NPC and location deletion cleanup is best effort and can leave temporary orphans; the sweep includes all current image-owning document fields and the banner path. It does not mistakenly sweep an image purely because its group member/uploader left: content intentionally stays with the group.
- The normal add/replace/remove controls and confirmation dialog disable their own action while busy. This does not serialize different clients or stop navigation/context switches. Concurrent replacements from the same old snapshot can leave the losing upload orphaned; the sweep is the expected recovery when no stale write reattaches a deleted object.
- The proposed post-commit refresh failure rollback lead was disproved: production `FirebaseContext.refreshGroups` / `refreshCampaigns` catch their read failures and return arrays (`:181-219`), so a refresh rejection does not reach the attachment hook's cleanup path. It should not be reported as confirmed data loss from this source.
- The production-rule review copy has no aggregate per-user/group upload-byte quota, and the sweep loads reference/file lists and launches all orphan deletions together. Budget configuration, real request volume, and sweep memory/time were not measured. Treat scaling/cost bounds as future verification, not a confirmed first-pass outage.
- Client canvas re-encoding is the evidence for metadata stripping in the live UI. Server-side acceptance of arbitrary direct uploads, permission holes, support download-token assumptions, and external Markdown images were passed to the security reviewer; this report makes no blanket statement that all bucket objects lack EXIF or that a screenshot can never have a bearer capability.

## Tracker reconciliation and follow-up

The T021 image spec/plan describe the intended single-operation ordering; they are contract evidence, not proof that the new interleavings are safe. The sweep is already implemented, so the old spec's “out of v1” orphan-sweeper bullet is historical, not an open implementation gap. Current `TODO.md` retains design work concerning default pictures (T074) and entity page picture shape (T063), not the lifecycle defects above. Tracker #1403 concerns the older campaign-delete implementation; #1405 concerns private-note cleanup after user removal. Their historical closed states do not establish image failure-path correctness.

Coordinate IMG-001, IMG-002, and IMG-005 with `DATA` root causes before prioritizing fixes, while preserving their binary-loss, cross-group URL, and partial-delete consequences. IMG-003 is the image-specific collection/finalization protocol issue; IMG-004 is a small independent boundary fix. Browser EXIF/codec and production App Check/rule deployment verification remain follow-up work under the existing no-production-mutation boundary of this review.
