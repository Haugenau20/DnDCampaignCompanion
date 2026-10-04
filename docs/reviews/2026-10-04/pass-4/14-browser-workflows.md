# Full-App local browser workflows

Reviewed baseline: `c2d8a88d0541b01c0f9cc2e7c497206a29746ce5`, current
`main` after the earlier reviews merged. Application source is unchanged from
`64fe19512b1d3bd14427fad8996403a742fbe8a9`.

**Two additional findings: one medium and one low.** Both were reproduced in
the actual signed-in App with ordinary synthetic campaign data and local
Firebase emulator IO. The successful journeys below supplement the earlier
component/provider checks. They do not invalidate the previously reported
concurrency, draft-retention, recovery or production-policy findings.

## Scope and evidence boundary

Read `AGENTS.md`, `TODO.md`, the current bug tracker, the entity-authoring
specification and relevant handoffs, and all three prior review summaries.
Routes and provider/write contracts were mapped before preparing diagnostics.
The coordinator executed the browser modules sequentially; this reviewer did
not launch another browser, server, emulator or full test suite.

The actual CRA App, router, providers, browser Firebase SDK, and Auth,
Firestore, Functions and Storage emulators are the runtime boundary. The
coordinator used the repository's local emulator services with a fresh demo
project and loopback-only browser requests. A synthetic user/group/campaign
provides an ordinary local signed-in session. No component, route, provider or
writer was replaced with a test double. Admin SDK reads observed persisted
synthetic records; prepared extraction detections exercised conversions
without invoking a model. Authentication/account lifecycle remains stopped;
the login is setup only.

The repository's Windows PowerShell startup was not executed on this Linux
host. Development emulator policy is not evidence of deployed policy parity.
Real mail, production data, remote services, paid model calls, deployment,
physical devices and browser/codec coverage beyond the local Chromium session
remain outside this review.

Prepared modules and readbacks are preserved under
[`evidence/probes/workflows/`](evidence/probes/workflows/) and
[`evidence/outputs/workflows/`](evidence/outputs/workflows/):

- [main observations](evidence/outputs/workflows/main-observations.json) and
  [main execution output](evidence/outputs/workflows/main-results.txt);
- [follow-up observations](evidence/outputs/workflows/followup-observations.json)
  and [follow-up execution output](evidence/outputs/workflows/followup-results.txt).

Both central runs completed; their browser boundary records contain no page
errors. The initial search-selector mistake is corrected below and excluded
from product counts. The archived image readback retains structural URL/path
and image metadata; synthetic local Storage download-token query values are
redacted, and replay obtains a fresh local token. See the central
[verification record](verification.md) for exact runtime setup and commands.

## Successful ordinary journeys

| Journey | Actual UI actions and persistence evidence |
|---|---|
| NPC authoring | `/npcs/create` → two-field create → own detail route → rename in place → reopen with persisted name. Attach and detach an existing location and quest; backend references follow both actions. Delete through the confirmation; backend document is absent. |
| Location authoring | `/locations/create` → create → rename → reopen. Attach and remove an existing NPC from “Who is here”; backend `connectedNPCs` follows both actions. Confirm deletion; document is absent. |
| Quest authoring | `/quests/create` → create → rename → reopen. Attach and remove an existing NPC; backend `relatedNPCIds` follows both actions. Confirm deletion; document is absent. |
| Rumour authoring | Composer at `/rumors` → expanded row → edit title and body → save → attach NPC and location → remove both → reopen via `?highlight=` with edited body. Row deletion removes the document. |
| Notes | “New note” → title/body editing → idle autosave creates a real note document → list → reopen with identical content. No manual save was substituted for the autosave control. |
| NPC conversion | Prepared detection → actual create route with extracted name → create. Stored NPC preserves friendly stance/context and resolves the location name to the existing location ID. Source detection records the actual target ID and no longer offers Add on reopen. |
| Location conversion | Prepared detection → actual create route → create. Prose parent resolves to the existing location ID, type/context survive, and source stores the returned target ID. |
| Quest conversion | Prepared detection → actual create route → create. String objectives become object records and related NPC names become existing IDs. Source stores the returned target ID. |
| Rumour conversion | Prepared detection → direct ordinary rumour write → highlighted row. Source kind/name survive and the source detection stores the actual target ID. |
| Chapters | Create with body/summary → edit title/body → reader displays edited prose. The actual short-chapter reader persists `isComplete: true`, `lastPosition: 100` and the selected chapter ID. |
| Saga | First Save Saga creates the campaign document; a second edit persists title/body and the reopened viewer renders the edited prose. Creation attribution survives the edit. |
| Search/navigation | Corrected follow-up selects exact record option IDs for NPC, location, quest, rumour, note and chapter. All six open their expected detail/reader/highlight routes; no query needed reissuing in this warm-provider destination check. |
| NPC portrait | A canvas-generated 149-byte, 16 × 12 PNG goes through the actual file input, browser preparation and Firebase upload. Its stored WebP reference points at a real local Storage object, Chromium decodes the dimensions, and reopen renders it. Confirmed removal sets the reference to `null`, deletes the binary, and reopen shows the empty portrait control. |

These are bounded successful paths, not exhaustive field, relation, failure,
concurrency or device coverage. NPC/location creation used ordinary optional
defaults; deletion covered leaf records without images or children. The
portrait control covers one small Chromium-decodable input, not large-file
boundaries, all encoders, image replacement failures or sweep/offline races.
The separate recovery and historical-data reports own their respective seams.

## BROWSER-001 — “Create & add another” in the attachment escape hatch creates an unlinked record

**Severity: Medium. Confidence: High. Classification: new integration failure.**

### Trigger and expected behavior

On a location page, open **Attach to the people in …**, choose **No such person
yet — add one**, enter a name and one line, then choose **Create & add another**.
The attachment surface's escape hatch should create and attach the new person.
The [attach-tray requirement](../../../design/plan/15-entity-authoring/handoff/15-2-attach-tray.md)
explicitly calls for the relation to be pre-wired and the new entity to be
attached on return. Offering another creation in the same surface must not
silently abandon that relation.

### Actual result and evidence

The dialog reports **1 NPC added** and clears the two fields. The new NPC
exists, but the location's `connectedNPCs` remains `[]`. Selecting the sibling
**Create & open** for a second synthetic person attaches that person and keeps
the browser on the location page. This positive control uses the same actual
App, dialog, writer and target location; only the creation action differs.

The `candidate-attachment-create-add-another` observation in
[main readbacks](evidence/outputs/workflows/main-observations.json) records:

- `firstExists: true`;
- `firstAttachedAfterAddAnother: false`;
- `secondAttachedAfterCreateOpen: true`;
- `stayedOnLocation: true`;
- both location snapshots and the actual created NPC IDs.

No rejected write, synthetic callback result or duplicate-ID situation is
needed. A player who opened the dialog specifically to fill a relationship
gets a successful create acknowledgement while the relationship is unchanged.
They must close the dialog and find/attach that new record manually.

### Source cause

- `src/shared/components/attach-tray/AttachTray.tsx:193–202` supplies
  `onCreated: (id) => onAttach(id, kind)` when opening the escape hatch.
- `src/shared/components/quick-add/QuickAddDialog.tsx:66–73` passes the creation
  callback through the form and disables navigation for this caller.
- `src/shared/components/quick-add/QuickAddForm.tsx:125–135` invokes
  `onCreated` from **Create & open**.
- `src/shared/components/quick-add/QuickAddForm.tsx:137–146` awaits the same
  create writer, clears fields and increments its acknowledgement, but never
  invokes the relationship callback.
- `src/pages/locations/LocationDetailPage.tsx:438–455` is the concrete
  location-to-NPC write exercised by the browser.

Other callers of the shared escape hatch have the same callback gap by source
inspection; the complete-App failure is confirmed for location → new NPC.
The note-conversion repeat-create variant was not used to expand this finding.

### Fix direction and meaningful validation

Give attachment callers a creation contract that notifies them for each
successful create while separately controlling dialog closure, or omit the
repeat-create action in that context. Simply calling the existing dialog
callback from both buttons would also close the dialog and change the promised
“add another” behavior, so creation notification and dismissal need an explicit
decision.

Validate through the actual App: launch from an attachment field, use every
offered creation action, read the parent relation after each success, and
reopen it. Keep ordinary directory bulk creation and the sibling stay-on-page
control passing. A failed entity create must preserve text and must not attach
an absent ID.

**Overlap reconciliation:** DATA-008 concerns untyped, colliding relation IDs;
this reproduction uses distinct IDs and omits the callback entirely.
DATA-005 concerns non-atomic conversion target/source commits; no conversion
is involved here. A11Y-003 concerns dialog focus return. None explains this
successful-create/missing-relationship result.

## BROWSER-002 — Cancel on a new chapter opens the first chapter reader

**Severity: Low. Confidence: High. Classification: new route failure.**

### Trigger, expected and actual

Open `/story/chapters/create`, type a title, and choose **Cancel**. There is no
existing chapter to return to; the chapter index is the valid destination.
Instead the form constructs `/story/chapters/undefined`, which the reader
treats as a missing chapter and redirects to the campaign's first chapter.

The full-App `candidate-new-chapter-cancel-destination` observation in
[main readbacks](evidence/outputs/workflows/main-observations.json) finishes
at `/story/chapters/workflow-chapter` with the **Workflow Opening Chapter**
reader visible. No document with the cancelled title is written. The result is
an unexpected reading route, not unintended draft persistence or failure to
discard a deliberately cancelled draft.

### Source cause and limits

- `src/pages/story/ChapterCreatePage.tsx:21–35` mounts `ChapterForm` with
  `mode="create"` and no `chapter`; its breadcrumb identifies the chapter index.
- `src/features/storytelling/chapters/components/ChapterForm.tsx:153–155`
  unconditionally interpolates `chapter?.id` into a reader route on Cancel.
- `src/pages/story/StoryPage.tsx:65–75` handles that missing ID by opening the
  first existing chapter.

The final reader route and absence of a cancelled document are browser/emulator
observations; the transient literal `undefined` route is source-confirmed.
With no chapters the reader's redirect guard does not run, which leaves an
empty reader by source inspection. That empty-campaign consequence was not
executed and is not a separate finding.

### Fix direction and meaningful validation

Choose the cancel destination by mode: create returns to the chapter index;
edit returns to its valid chapter reader. Exercise Cancel through the actual
new-chapter route in both empty and populated campaigns, and confirm the
index destination and absence of writes. Preserve the edit-mode return route.

**Overlap reconciliation:** FUNC-005 is the separate failed-save path that
navigates from `finally` and loses a draft; this failure occurs after an
intentional Cancel without any attempted save. FUNC-006 concerns delete-dialog
failure/retry. Neither covers the invalid create-mode destination.

## Reconciliation and remaining limits

The initial global-search diagnostic used text matching across all options.
For a note query it selected a named-create option before the exact record
result appeared, producing a new blank local note. That is a harness ambiguity,
not a new search finding. Its screenshot/readback is retained as an execution
record; the corrected follow-up addresses exact `cmdk-option-{type}-{id}`
records. All six expected destinations passed with `queryReissued: false`.
Warming ordinary reference providers isolates destination behavior; it does
not disprove REACT-007's previously demonstrated query-before-arrival failure
or REACT-006's empty-index lifecycle failure.

Two existing failures were revalidated through the actual App and emulator
readback in the [follow-up output](evidence/outputs/workflows/followup-observations.json):

| Prior finding | Additional browser evidence; excluded from new counts |
|---|---|
| REACT-003 | Editing the note and immediately choosing its actual “All notes” action leaves the new final line absent from Firestore and from the reopened editor. Reopen equals the prior saved body. |
| FUNC-003 | Clearing the existing NPC Role leaves “Save role” disabled; the stored role remains “Ferryman”. |

The current tracker/backlog remains authoritative. Missing location/chapter
batch actions (T017), phone chapter scrolling (T026), entity-page convergence
(T063), placeholder pictures (T074), and production legacy-location auditing
(T079) are existing decisions/investigations. Quest free-text key-location
semantics (#1421) and deliberate dangling links after ordinary quest deletion
are not new defects in this pass. No backlog or existing-test entries were
changed.

The full green build/test baseline is reused for byte-identical application
source. Browser diagnostics are additional integration evidence and do not
claim to replace the previously reported focused checks or production tests.
