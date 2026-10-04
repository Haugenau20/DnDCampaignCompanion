# Fourth-pass review: supported legacy content

Reviewed stack base: `c2d8a88` (`origin/main` at the start of this pass).
Application source is unchanged from `64fe19512b1d3bd14427fad8996403a742fbe8a9`.

**One additional finding: LEGACY-001, low severity, high confidence.** Supported
calendar-date notes display the previous day in browser timezones west of UTC.
The full app reproduced the wrong visible date and edit prompt; the stored date
remained intact. Seven other compatibility controls passed through the complete
application and real local Firestore. Six passed initially; the seventh passed
after correcting a diagnostic assumption about the default chapter view.

## Scope and method

Reviewed `AGENTS.md`, current `TODO.md`, the live behavioral tracker, all three
prior consolidated review summaries, current entity-authoring contracts and
the code behind entity, personal-note and chapter reads and ordinary edits.
The review follows historical writers and documented compatibility contracts
before choosing fixtures. It does not equate every value accepted by Firestore
with supported application data.

The coordinator runs the complete CRA app against local Auth, Firestore,
Functions and Storage emulators. The diagnostic module at
`/tmp/pass4-legacy/legacy.cjs` exports `seed` and `run`; it does not start services,
launch a browser or sign in. The runner supplies an already established synthetic
session and a real Playwright page. Fixture paths are restricted to synthetic
`review-group`, `review-legacy`/`review-legacytimezone` campaign content and that
synthetic reader's notes. No model calls, outbound email, production data, archive import, deployment
or migration script is used. The stopped authentication/account-lifecycle review
was not resumed.

## Fixture provenance and validity

Every prose/name value below is invented. The field shapes come from the
application's historical writers, current types or explicit compatibility policy.

| Fixture | Supported provenance | Read/edit contract under review |
|---|---|---|
| `legacy4-lost-logbook`: `objectives: ['Find the old road', 'Cross the marshes']` | `quests/utils/quest-objectives.ts:8` documents the pre-T050 conversion writer; commit `e1282a4` fixed it. `useQuestData.ts:10` explicitly promises reads of already-persisted strings. | Directory search and detail must receive normalized objectives; first objective edit persists stable IDs, descriptions and completion. Reading alone must not rewrite storage. |
| Quest also retains `importantNPCs`, an NPC ID reference and a legacy location name | `quests/types.ts:29` records D15.7's deliberate retirement of `importantNPCs`; `NPC.location` at `npcs/types.ts:45` governs the legacy location representation. | Ordinary objective edits keep existing fields and references. The retired free-text NPC field is preserved in storage and deliberately not rendered. |
| `legacy4-archivist`: ISO-dated note with no `author`, legacy location **slug**, absent optional descriptive/image/tag fields | `NPCNote` at `npcs/types.ts:15` explicitly allows old ISO dates and absent authors; commit `174480b` standardized new dates. The same file permits optional scalar fields and documents slug/name fallback. | Read old note date and location; editing the note changes its text while retaining its original date, absence of author, location value and quest reference. |
| `legacy4-old-harbor`: ISO-dated note with no `author`, absent optional collections and metadata | `locations/types.ts:38` makes features, connected NPCs, related quests, tags, parent, last visit and image optional; `LocationNote` at line 59 documents historical note shapes. | Directory/detail remain readable; note edit preserves history without inventing an author or requiring missing optional fields. |
| `legacy4-harbor-whisper`: `status: 'unknown'`, `sourceType: 'other'`, existing entity and quest references | `rumors/utils/rumor-presentation.ts:15` documents the old extractor-produced status; `rumors/types.ts:22` records the retired form's default `other`. | Visible as Unconfirmed with Other source; editing its prose preserves all references and its historically recorded source. The status presentation need not migrate storage on read. |
| `note-94001`: `title: 'New Note'`, converted extracted-NPC reference and existing tags | `notes/utils/note-title.ts:17` explicitly identifies the persisted old placeholder; `notes/context/NoteContext.tsx:164` preserves old sequential IDs/URLs. Extracted entity shape is the current persisted contract in `notes/types.ts:19`. | List/editor derive the title; ordinary content save, old direct URL and reload retain content, tags, campaign ID and converted reference. Placeholder becomes implicit title on save. |
| `legacy4-chapter`: absent summary and modification metadata | `chapters/types.ts:8` makes summary optional; `core/types/common.ts:21` makes modification metadata optional. | Index, reader and edit form load; content edit preserves identity/order/creation metadata and supplies normal modification metadata. |
| `legacy4-timestamp-chapter`: real Firestore `Timestamp` for `dateModified` | Historical chapter-reorder writer documented in closed tracker #1202 and `normalizeChapterDateModified.ts:14`. This is an intentionally separate **known-defect compatibility control**, not a claim that production still holds such a record. | Reader can still render the chapter body; ordinary edit replaces the old Timestamp with current ISO modification attribution without losing content/order/creation date. |
| `legacy4-date-boundary`: one `2025-05-31` note and one `2025-05-31T19:27:30.387Z` note | `shared/utils/dateFormatter.ts:98` documents the old NPC writer's date-only shape and old location/generator ISO shape; `toNoteDate` writes the UTC calendar day today. Existing tests at `dateFormatter.test.ts:330,351` require the calendar date to retain its day on display. | Compare the actual note labels in UTC and America/Los_Angeles, then edit the date-only note and inspect stored dates. This fixture is in its own synthetic `review-legacytimezone` campaign. |

Fixtures keep required arrays and required content/name fields in their supported
shapes. The review did not insert arbitrary null NPC names, object-valued dates,
missing required note collections, or invented objective IDs and call the result
a migration regression. The objective normalizer deliberately drops entries with
no readable description (`quest-objectives.ts:26,50`); loss of such an invented
malformed fragment would not establish a supported-data defect.

## Observed runtime controls

The coordinator executed `/tmp/pass4-legacy/legacy.cjs` on 2026-10-04 against
`demo-review-pass4`, with the full app at `http://127.0.0.1:3000`. Browser remote
requests were blocked; actual content writes went through the application and
local Firebase client SDK. Admin reads independently inspected stored results.

| Journey | Observed result |
|---|---|
| Quest objective-text search, old edit URL, tick and reword | Search found the string-objective quest. The old URL reached its detail page. The read left Firestore strings intact; edits persisted `objective-0`/`objective-1`, retained the first completion when rewording the second, and preserved status, NPC IDs, old location and deprecated `importantNPCs`. |
| NPC ISO note edit | Displayed `31/05/2025`; text edit retained stored `2025-05-31T19:27:30.387Z`, absent author, location slug and quest reference. |
| Location optional fields and ISO note edit | Directory/detail rendered with optional arrays absent. Note text changed; original date, absent author, location name and type survived. |
| Unknown-status rumor row edit | Row remained visible as Unconfirmed. Prose edit retained stored `unknown`, `other`, NPC/location arrays, old location text and converted quest ID. Status presentation is a fallback, not an implicit migration. |
| Old note ID, placeholder title, save and reload | List/editor showed `Legacy field journal` derived from content. Ctrl+S persisted edited body and empty implicit title; tags, campaign ID and the complete extracted/converted NPC record survived. Full reload showed the saved body. |
| Chapter without summary/modification metadata | List, reader and form loaded after selecting List. Body edit retained order, creation date and original creator name, and supplied generated summary/ISO modification attribution. |
| Known #1202 Timestamp control | Reader rendered the body despite its real historical Timestamp. Ordinary content edit preserved creation date/order and replaced `dateModified` with an ISO string. |

No uncaught page errors were recorded. The initial chapter check timed out
because it searched for a visible title while the default **Shelf** view
deliberately renders numbered spines. Its failure body showed both chapters;
`BookshelfView.tsx:96` puts titles in accessible names and tooltips. The corrected
diagnostic clicked the actual List control and reran only that scenario, without
reseeding the other fixtures. It passed. This was a harness correction, not a
product failure.

Saved evidence: [initial readbacks](evidence/outputs/legacy/legacy-results.json)
(six successes and the diagnosed selector failure),
[chapter follow-up](evidence/outputs/legacy/legacy-followup-results.json),
[initial run](evidence/outputs/legacy/initial-results.txt), and
[bounded rerun](evidence/outputs/legacy/chapter-results.txt). The
[fixture/journey module](evidence/probes/legacy/legacy.cjs) and
[bounded follow-up](evidence/probes/legacy/chapter-followup.cjs) are retained.

## LEGACY-001 — Calendar-date notes display the previous day west of UTC

**Severity: low. Confidence: high.** Confirmed through a real NPC detail page,
normal note edit and independent emulator readback. This is incorrect display of
recorded history, with no demonstrated stored-date corruption or reference loss.

**Contract and supported trigger.** `NPCNote.date` and `LocationNote.date`
explicitly support `YYYY-MM-DD` and old full ISO values. The helper documents
that the old NPC page already wrote date-only values and that the standardized
writer keeps the UTC day (`src/shared/utils/dateFormatter.ts:98–108`). A note
stored as `2025-05-31` is therefore ordinary supported historical data and the
current writer's output. Existing `dateFormatter.test.ts:330–332,351–352` asserts
round-trip day preservation and the exact expected display `31/05/2025`.

**Cause.** `formatNoteDate` constructs `new Date(value)` at
`src/shared/utils/dateFormatter.ts:122–128`. JavaScript parses `2025-05-31` as
midnight UTC. `formatCalendarDate` then calls `toLocaleDateString` without an
explicit timezone at lines 144–149, converting that calendar date into the prior
local day for a viewer west of UTC. `NoteHistory.tsx:75` uses the result for the
visible date and at lines 85 and 136 for the edit field/button labels.

**Observed reproduction.** The coordinator ran
[date-timezone.cjs](evidence/probes/legacy/date-timezone.cjs) against the complete
app, seeded one synthetic NPC with the two supported date shapes, and used
Chromium's CDP `Emulation.setTimezoneOverride` on the supplied real page. It
verified `Intl.DateTimeFormat().resolvedOptions().timeZone` before recording
the Los Angeles result; application date functions and Firebase access were
not mocked.

| Stored note date | Browser timezone | Actual visible date/edit button | Expected calendar-date result |
|---|---|---|---|
| `2025-05-31` | UTC | `31/05/2025` / `Edit the note from 31/05/2025` | `31/05/2025` |
| `2025-05-31` | America/Los_Angeles | **`30/05/2025` / `Edit the note from 30/05/2025`** | **`31/05/2025`** |
| `2025-05-31T19:27:30.387Z` | UTC and America/Los_Angeles | `31/05/2025` in both controls | Readable legacy timestamp retained |

The reviewer inspected the [Los Angeles screenshot](evidence/outputs/legacy/legacy-note-dates-los-angeles.png):
the date-only row visibly says `30/05/2025` beside the ISO row's `31/05/2025`.
The [UTC screenshot](evidence/outputs/legacy/legacy-note-dates-utc.png) shows the
control. Clicking the wrong-day edit action opened `Note from 30/05/2025`; a
normal prose edit succeeded. Direct Firestore readback still held `2025-05-31`,
and the other note was unchanged. There were no uncaught page errors.

Evidence: [observations](evidence/outputs/legacy/timezone-observations.json),
[run output](evidence/outputs/legacy/timezone-results.txt), and
[dates before/after plus timezone labels](evidence/outputs/legacy/legacy-timezone-results.json).

**Extent and limits.** The NPC detail manifestation is observed. Location note
history uses the same `NoteHistory` and date helper, and the NPC directory also
calls `formatNoteDate` (`NPCDirectory.tsx:402`); those additional surfaces are
source-traced, not separate browser reproductions. The effect applies to the
current date-only writer as well as old NPC notes. The test did not inspect a
real user's browser settings or production data. The timestamp control is an
ordinary time-bearing value; this finding does not claim every timezone's
local date for a timestamp is inherently wrong.

**Fix direction.** Format date-only values as calendar components without
converting them through the viewer's timezone. Keep full timestamp and
attribution formatting under their own existing contract; changing the shared
formatter globally could alter unrelated instant-based dates. No rewrite of
stored historical note dates is needed.

**Meaningful regression checks.** Run the same supported date-only value in UTC,
America/Los_Angeles and an eastern timezone, including winter/summer dates and
a year boundary. Assert both visible date and edit/delete labels preserve the
recorded calendar day. Retain a full-ISO legacy control and real edit readback
proving the original date/absent author survive. The existing exact-day helper
tests should run under at least one negative UTC offset; a suite run only in UTC
cannot reveal this conversion.

**Overlap.** T001 fixed raw timestamp presentation and standardized the stored
shape. This is a distinct timezone conversion in the surviving formatter, not
a request to reopen those completed changes. It does not duplicate T079,
#1202, DUP-001 or the previous integrity/concurrency findings.

## Reconciliation and boundaries

- **T079 remains the legacy-location owner.** This review neither counts
  production documents lacking `locationId` nor recommends removal of the
  fallback. Unrelated edits are not required to manufacture a canonical ID.
  An id/name fallback is part of the current contract.
- **D15.7 deliberately leaves `importantNPCs` unread.** Its names disappearing
  from the redesigned page is an accepted decision, not a new data-loss report.
  `updateDoc` merges retain the old field (`DocumentService.ts:240`).
- **#1202 is already closed after a production audit found zero affected
  surviving chapters.** The synthetic Timestamp verifies a realistic historic
  restore value; it does not reopen that production remediation task. The
  operator's migration/revert script was not executed.
- **Old shared reading progress is intentionally ignored.** Commit `07785c6`
  says every player starts fresh after moving progress out of the shared
  campaign document. `StoryContext.tsx:172` documents the new location.
  `chapter-progress.ts:20` separately states the deliberate old-page-number
  reinterpretation/clamping policy. Neither is filed as a compatibility defect.
- **DUP-001 already owns stale/raw note and rumor titles in other consumers.**
  Correct list/editor display does not clear its attachment/search/backlink
  findings. DATA-003's stale whole-record writes also remain: these checks make
  ordinary serial edits, not concurrent edits.
- **Import/restore evidence is record-level only.** Admin seeding recreates
  supported persisted values and references in fresh local storage. No saved
  production or historical emulator export was imported, and no CLI export/
  restart round trip is claimed. T065 already records the separately tested
  Firebase 13.32.0-to-15.22.4 import compatibility; OPS-001 owns failed-export
  shutdown behavior.

## Changes and meaningful follow-up

No application, tests, configuration, dependencies or backlog were changed.
LEGACY-001 needs a bounded calendar-date display fix. The seven successful
compatibility controls require no additional fix. A useful maintained
regression check is the real list/detail-to-Firestore objective repair journey
and one old ISO entity-note edit: they cross the read-normalization, route,
editor, writer and persisted-state boundaries that isolated shape tests cannot
establish. Preserve the explicit no-migration decisions above when strengthening
those checks.
