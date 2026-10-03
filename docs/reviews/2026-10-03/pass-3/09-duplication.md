# Third-pass review: duplication and maintainability

Reviewed commit: `0ba261205f2a55082a0560f1c68861a463fb8f89` (PR #197).
Application source is identical to `64fe19512b1d3bd14427fad8996403a742fbe8a9`.
Reviewer: GPT-6 Astra, xhigh. Date: 2026-10-03.

**Two new product findings: one medium and one low.** Both concern parallel
implementations left behind after an existing contract changed. Optional
consolidation opportunities and harmless repetition are recorded separately;
there is no blanket recommendation to replace the domain contexts with a
framework.

## Scope and method

Read `AGENTS.md`, `TODO.md`, the live behavioural tracker, the prior two review
summaries, this pass's plan and the attribution-consolidation audit. Followed
actual callers rather than treating similarly named files or historical reports
as evidence of duplication.

The census reads **305 production TypeScript/TSX files**, excluding tests,
fixtures, development generators and the stopped authentication/account-lifecycle
areas. TypeScript's AST identifies function bodies; a lexer discards trivia and
compares their token sequences. At a minimum of 20 body tokens there are
**1,182 eligible bodies**, including nested callbacks. Six cross-file groups
have identical body tokens: 16 occurrences, or 10 copies beyond the first,
accounting for **374 repeated tokens** under this narrowly defined measure.
A second candidate pass masks identifiers and string/numeric literals, retaining
bodies of at least 45 tokens: **11 structural groups**, including two also in
the exact set. Every returned group was opened and compared.

These are reproducible candidate counts, **not a repository duplication
percentage**. Function signatures, imports, types, comments, CSS, configuration,
partial-function overlaps and near-matches are outside this metric. Nested
bodies can overlap their parents; identifier masking is not proof of semantic
equivalence. Manual review adds the important near-matches: entity creation and
batch writes, read/write attribution, naming and title presentation, route
construction, date/prose normalization, contact categories, image limits and
relationship resolution.

Inspected source families include:

- All four campaign entity contexts and their read hooks; shared collection,
  attribution, ID and batch helpers; actual single/batch/status/note callers.
- Detail/index/summary presentation for NPCs, locations and quests; rumours'
  composer, combine dialog, title/status helpers and attachment consumers.
- Note/rumour title derivation, the global search builders, attachment candidate
  construction/filtering and relevant reference presentation.
- Navigation context/hook/utilities; Markdown/pagination input preparation;
  theme/image contrast math; contact category copies across packages.
- Source inventories of alternate implementations, coordinated with the
  architecture reviewer. Unreachable modules are assessed in that report.

No production, existing-test, dependency, configuration, backlog or Git writes
were made by this reviewer. No server, emulator, production data, paid AI call
or real message was used. Authentication, credentials, invitations, account
removal and access-control review remained stopped; general menu click-outside
callbacks were compared only as presentation code.

## Confirmed findings

### DUP-001 — Independent title projections leave ordinary notes and rumours unnamed outside their directories

**Severity: Medium. Confidence: High. Classification: new missed-consumer
regression following the content-derived-title contract; one grouped finding.**

**Requirement and trigger.** Both domains deliberately persist an empty title
when the player has not supplied one, and derive the displayed title from the
body. This is normal data, not a malformed fixture:

- `src/features/campaign-entities/rumors/components/RumorDirectory.tsx:368-377`
  writes `title: ''` with the entered content; the directory uses
  `rumorDisplayTitle` at `:528-529`.
- `src/features/campaign-entities/rumors/utils/rumor-title.ts:33-50` defines the
  canonical rumour name and empty-record fallback. Its public barrel explicitly
  warns that raw `rumor.title` prints blank (`src/features/campaign-entities/index.ts:91-98`).
- `src/features/collaboration/notes/components/NoteEditor.tsx:43-52,170-185`
  intentionally writes the explicit title or `''`, never the derived string.
  `src/features/collaboration/notes/utils/note-title.ts:37-46` additionally treats
  the persisted legacy `New Note` placeholder as unnamed and derives from content.

**Expected:** a record has the same meaningful name in a directory, attachment
choice, search result and backlink. Finding a rumour by the name its directory
shows should work in the attachment filter.

**Actual and duplicated implementations.** Four live projections still use the
old raw-title rule, in three files:

1. `src/shared/components/attach-tray/attachCandidates.ts:133-134` assigns
   `name: record.title` to rumours. Its filter searches only the resulting name
   and status line (`:168-178`). `src/shared/components/attach-tray/AttachTray.tsx:222-225` renders that empty name;
   attached chips and detach labels also consume it (`:250-255`). This reaches
   ordinary users through the NPC detail page's multi-kind tray at
   `src/pages/npcs/NPCDetailPage.tsx:1199-1206`.
2. `src/pages/quests/QuestDetailPage.tsx:225-237` names a converted rumour backlink
   with `rumor.title`. The same page's NPC/location counterparts already call
   `rumorTitleText` (`src/pages/npcs/NPCDetailPage.tsx:441` and
   `src/pages/locations/LocationDetailPage.tsx:211`). The quest page renders the
   name at `:559-560` and copies it into deletion-loss descriptions at `:275-277`.
3. `src/shared/context/SearchContext.tsx:117-125` indexes a note's raw title as
   its result label. The neighbouring rumour builder correctly uses
   `rumorTitleText` at `:101-107`. `src/core/services/search/SearchService.ts:196` preserves an empty label,
   and `src/shared/components/command-palette/CommandPalette.tsx:254-257` displays
   it without deriving a name.
4. `src/pages/quests/QuestDetailPage.tsx:253-269` names note backlinks with
   `note.title || 'Untitled note'`, ignoring both content derivation and the
   special `New Note` case.

**Concrete consequence.** Two content-only rumours of the same status become
choices with no distinguishing name; searching `Traders` returns zero choices
for a rumour the directory names “Traders saw a dragon near the bridge.” The
player cannot reliably identify the intended relationship. Content-only notes
still match global content search, but their main result labels are blank;
legacy notes are labelled `New Note`. Snippets still render, so this does **not**
claim every note becomes unfindable. Quest backlinks and deletion descriptions
lose their identifying name as well.

**Evidence.** The focused component probe renders the real `AttachTray` and
uses its real candidate/filter helpers with two normal content-only records.
The note probe runs the real `SearchProvider` and `SearchService` against empty,
legacy and explicit titles, comparing with the actual domain `displayTitle`
helper. A separate actual-source differential probe exercises those same pure
contracts. Quest backlink/deletion output is source-traced, not a separately
rendered quest-page test. Both component/provider diagnostics passed centrally; the actual-source differential checks also passed. The saved outputs are linked below.

**Bounded fix.** Apply the existing domain display-title functions at each
presentation/index boundary, leaving stored titles unchanged. Search and quest
pages can consume the feature's public export. Keep the attachment candidate
module's dependency boundary: inject a display-name function or prepare named
input in the caller, rather than importing a feature barrel from a shared tray
that the feature itself imports. An explicit candidate/display-name type would
also make the old assumption harder to repeat. Do not broaden reference-matching
semantics as an incidental part of the display fix.

**Meaningful validation.** Create a rumour through the real composer and a note
through the real editor without typing titles. Assert their displayed names
agree in the list, attachment options, filtered attachment results, global
search and quest backlinks. Cover explicit titles, truly empty records and
legacy `New Note`; verify stored titles remain empty and callback IDs remain
unchanged. Current diagnostics intentionally characterize the defect and are
not production regression tests asserting the desired fixed behavior.

This is independent of first-pass DATA-008's untyped attachment identity and
second-pass REACT-006/007's index lifecycle. Those defects can remain even after
names are repaired. The accessibility reviewer cross-references this finding
rather than adding a second unnamed-control count.

### DUP-002 — The combine dialog promises an ID its copied slug helper does not allocate

**Severity: Low. Confidence: High. Classification: new residual presentation
drift after the fixed #002/#012/#1402 collision work.**

**Sources:** `src/features/campaign-entities/rumors/components/CombineRumorsDialog.tsx:39-46,90-100,175-177`;
`src/features/campaign-entities/rumors/context/RumorContext.tsx:275,303-311`;
`src/core/utils/entity-id.ts:42-48,73-107,164-188`.

The dialog retains a local copy of the slug algorithm with the comment
“matches the logic in RumorContext.” It prints **“ID will be:”** before creation
and logs that guessed value as the generated ID. Its return value from
`onCombine` is ignored. The real context now delegates to
`createWithUniqueEntityId`, which can suffix an occupied slug or choose a UUID
when the title has no ASCII alphanumerics.

**Trigger and expected/actual.** Combine two rumours twice with the same title;
the automatically proposed title also repeats for combinations on the same
date. The second dialog predicts the original base ID, while the actual create
uses `<base>-2`. A punctuation-only non-empty title passes the dialog's title
check, displays an empty ID and creates a UUID. If an ID is shown as final, it
should match the returned ID; a pre-commit prediction cannot make that promise.

**Impact and evidence.** The user-facing explanation and console diagnostic
identify the wrong record. This is low severity: the real collision helper
protects this sequential case, and this preview does not select the write path
or overwrite an existing rumour. The probe extracts the dialog's actual helper
and runs the actual `RumorContext.combineRumors` with controlled provider/IO
boundaries. Its no-collision control matches; the loaded-collision case differs;
the punctuation case demonstrates the fallback mismatch. The browser dialog
itself is source-traced.

**Bounded fix.** Remove the document-ID preview and pre-creation log, which do
not help a player combine rumours. If a later workflow needs an identifier,
use the ID returned by the completed operation. Replacing the local slug
function with `slugifyEntityName` alone would preserve the false promise,
because slugification is not allocation.

**Meaningful validation.** Repeat a same-title combination and confirm the UI
only identifies the created record using the returned value, or makes no ID
promise at all. Preserve tests for clean slugs, loaded collisions and
server-refused collisions. The concurrent-create race in first-pass DATA-001
and partial combine/conversion failure in DATA-005 remain separate findings.

## Measured repetition without a new product finding

The exact-body census is small enough to enumerate. “Tokens each” counts body
lexer tokens only; formatting/comments and parameter names are outside exact
body equality where those occur in the signature.

| Exact group | Copies / tokens each | Verified locations | Disposition |
|---|---:|---|---|
| Inbound-link row renderer | 2 / 128 | `src/pages/locations/LocationDetailPage.tsx:479`; `src/pages/quests/QuestDetailPage.tsx:551` | Same markup, correctly different surrounding section copy. Optional small shared row/list during T063; the title defect is in input projection, not this renderer. |
| Entity type display name | 3 / 37 | `src/features/collaboration/entity-extraction/components/EntityCard.tsx:52`; `src/features/collaboration/notes/components/CampaignLinksPanel.tsx:36`; `src/features/collaboration/notes/components/NoteReferences.tsx:158` | Four-case label vocabulary repeated in one domain. Optional local constant/helper; no conflicting label found. |
| `FieldLabel` micro-label | 4 / 21 | `src/features/campaign-entities/locations/components/LocationRowSummary.tsx:24`; `src/features/campaign-entities/quests/components/QuestRowSummary.tsx:31`; `src/features/campaign-entities/rumors/components/RumorRowEditor.tsx:96`; `src/pages/npcs/NPCDetailPage.tsx:166` | Harmless presentational repetition. A primitive may help the already-planned T063 design work; duplication alone is not a reason to redesign four views. |
| Query parsing | 2 / 48 | `src/shared/context/NavigationContext.tsx:64`; `src/shared/utils/navigation.ts:62` | Both iterate `URLSearchParams` into a string record. Optional use of the existing utility; preserve decoded values and last-value-wins behavior for repeated keys. |
| Batch status payload callback | 3 / 20 | `src/features/campaign-entities/locations/context/LocationContext.tsx:148`; `src/features/campaign-entities/npcs/context/NPCContext.tsx:214`; `src/features/campaign-entities/rumors/context/RumorContext.tsx:228` | Small declarative payload repetition. Quest deliberately adds a completion timestamp. Keep domain meaning visible. |
| Stored prose normalization | 2 / 21 | `src/core/components/Markdown.tsx:41`; `src/features/storytelling/stories/utils/paginate-prose.ts:56` | Both unescape literal `\\n` then trim; eight differential vectors agree. Optional pure helper, preserving Markdown's lazy parser boundary. |

The structural pass returns the following additional groups, each inspected:

| Candidate | Size | Verified source references | Conclusion |
|---|---:|---|---|
| Click-outside effect | 4 × 63 tokens | `src/app/layout/Navigation.tsx:92`; `src/shared/components/GlobalActionButton.tsx:49`; `src/shared/components/context-switcher/ContextSwitcher.tsx:79`; `src/shared/components/user-menu/UserMenu.tsx:35` | All install/remove `mousedown` and test wrapper containment. Optional `useOutsideClick`; current cleanup agrees. Keyboard/focus handling already shares `usePopoverKeys`; that is a different responsibility. |
| Entity-not-found card | 3 × 77 | `src/pages/locations/LocationDetailPage.tsx:67`; `src/pages/npcs/NPCDetailPage.tsx:237`; `src/pages/quests/QuestDetailPage.tsx:77` | Text and back action vary deliberately. Small presentation candidate for T063, not three missing features. |
| Group/campaign choice row | 2 × 150 | `src/shared/components/context-switcher/GroupStep.tsx:90`; `src/shared/components/context-switcher/CampaignStep.tsx:106` | Same visual template with different symbols, records and selection callbacks. Optional row component; no selection/account behavior audited. |
| Locations/quests index page | 2 × 124 | `src/pages/locations/LocationsPage.tsx:17`; `src/pages/quests/QuestsPage.tsx:19` | Deliberate composition over shared page/gate/directory primitives. Do not add a generic-page framework to remove small declarative shells. |
| Collection read wrappers | 3 × 48 | `src/features/campaign-entities/locations/hooks/useLocationData.ts:15`; `src/features/campaign-entities/npcs/hooks/useNPCData.ts:16`; `src/features/campaign-entities/rumors/hooks/useRumorData.ts:15` | Existing `useCampaignCollection` owns substantive logic. Wrappers provide domain names and arrangement policies; quests normalize objectives and chapters sort by order. |
| NPC/location note creation | 2 × 55 | `src/pages/npcs/NPCDetailPage.tsx:597`; `src/pages/locations/LocationDetailPage.tsx:261` | Both resolve a display author and call shared `toNoteDate`; domain callbacks differ. Location context stamps the date again. No demonstrated date-shape drift. |
| Contrast ratio | 2 × 47 | `src/core/themes/derive/oklch.ts:107`; `src/core/utils/band-dimming.ts:190` | Hex theme colours versus numeric RGB/image blends. The underlying linearization thresholds differ (`0.03928` versus `0.04045`), but no 8-bit channel lies between those thresholds. 512 matching byte-colour comparisons confirm parity for that shared input domain. Not a contrast failure. |
| Slug chain | 2 × 47 | `src/core/utils/entity-id.ts:42`; `src/features/campaign-entities/rumors/components/CombineRumorsDialog.tsx:40` | Actual semantic drift recorded in DUP-002. |
| Dashboard skeleton cell | 2 × 45 | `src/pages/layouts/dashboard/sections/ActivityFeed.tsx:81`; `src/pages/layouts/dashboard/sections/CampaignStats.tsx:114` | Four tall activity rows versus five responsive stat cells. Similar structure masks intentionally different sizes/layouts; not a missing shared algorithm. |

The inbound-row and query-parser groups also occur in the structural scan;
they are not additional copies beyond the exact table.

## Bounded maintenance opportunities and deliberate differences

**One remaining batch algorithm has two owners.**
`src/features/campaign-entities/shared/commitEntityWrites.ts:27-40` and
`src/features/campaign-entities/rumors/context/RumorContext.tsx:44-54` both check
empty input, enforce the imported 500 limit, attach a collection and dispatch
one batch. The first serves NPCs, quests and locations; the second is the
rumour-specific predecessor and uses the context's writer adapter. Differential
checks at 0, 1, 500 and 501 operations establish the same commit/refusal behavior
with equivalent writer doubles. Consolidating the common preparation/limit
logic is reasonable when touching batch writes; keep the adapter seam and
error contracts explicit. Do not turn this into chunked “successful” partial
writes or count DATA-005's separate create-before-batch issue again.

**Status updates still have single and batch forms.** All four contexts were
read. The batch paths write narrow status/attribution patches; several single
paths spread a loaded record. This is concrete maintainability evidence for
fixing the already-reported DATA-003 once at the patch boundary, not another
lost-update finding. Quest completion stamps `dateCompleted`, location deletion
has child-placement semantics, and NPC deletion cleans up a portrait: these
are real domain differences. A blanket CRUD abstraction would obscure them.

**Former duplication hot spots are already consolidated.** Five entity/chapter
read hooks delegate to `useCampaignCollection`; ordinary creation uses six
`createWithUniqueEntityId` call sites across the four entity contexts (rumour
add/combine/convert are three). The two attribution builders are shared by the
service and caller-owned batch writes. Quest objectives use the same
`normaliseObjectives` at quick-add write and collection read boundaries. NPC and
location note editing share `replaceNoteText`/`removeNote`, and dates share
`toNoteDate`/`formatNoteDate`. These are not fresh copies of the historical
#002/#005/#1200/#1204 problems. Calling a pure attribution builder from a batch
is necessary because the batch service writes supplied data verbatim.

**Mirrored configuration can be appropriate.** The five contact IDs/subject
labels in `src/shared/components/contact/contact-categories.ts:40-79` and
`firebase/functions/src/contact.ts:15-21` match exactly. Both files explicitly
explain the separately built npm-package boundary. A parity check is cheaper
than adding a shared package for five labels; no drift was found. The already
reported exact-2-MiB image preparation/rule mismatch remains IMG-004/TEST-006,
not an additional duplication finding. No rule/access-control work was resumed.

**Normalization policies must not be conflated.**
`src/shared/utils/resolve-name-to-id.ts:36-56` requires one trimmed,
case-insensitive exact match and rejects ambiguity. In contrast,
`src/features/collaboration/notes/utils/entity-matching.ts:35-48` matches names
inside prose, with whole-word boundaries and leading-article handling. These
answer different questions. `src/features/campaign-entities/locations/utils/location-display.ts:69-102,134-148` preserves the
explicitly tracked legacy reference fallback (T079); displaying a surviving
free-text name and proving that a reference identifies a given location are
also different questions. No global “normalize every name” helper is proposed.

**Types/markup that happen to resemble each other are not the same contract.**
Notes and rumours already share the pure `deriveTitle` algorithm while keeping
separate domain fallback rules; the note's `New Note` compatibility rule must
not leak into rumours. Similar date formatters serve relative save state,
chapter bylines and row timestamps with documented different outputs. The
route builders for note references, search, quick add and dashboard are
parallel but their reviewed destinations are valid; the dashboard's old
NPC/location highlight destinations remain functioning list links. This pass
does not promote a route-style preference into a broken-link finding.

## Checks, outcomes and exclusions

Diagnostic preparation was under `/tmp/pass3-duplication`; the coordinator ran
the behavioral diagnostics and preserves them under
[evidence/probes/duplication](evidence/probes/duplication), with outputs under
[evidence/outputs/duplication](evidence/outputs/duplication).

| Check | Boundary and result |
|---|---|
| [scan.cjs](evidence/probes/duplication/scan.cjs) | Reads actual source, parses bodies and emits the exact/structural census above. Executed successfully; every candidate inspected. |
| [title-drift.test.js](evidence/probes/duplication/title-drift.test.js) | **2/2 passed**: actual attachment options have empty name nodes and no `Traders` match; actual global note search returns `""` / `"New Note"` instead of derived titles. [Output](evidence/outputs/duplication/component-results.txt). |
| [source-probes.cjs](evidence/probes/duplication/source-probes.cjs) | **Passed, exit 0**: title drift; preview base versus actual `base-2` and UUID; matching batch boundaries at 0/1/500/501; 8 Markdown cases; 512 byte-colour contrast comparisons; all 5 contact category labels. [Output](evidence/outputs/duplication/source-results.txt). |
| Source/caller tracing | Establishes composer/editor stored-title contract, quest backlink propagation, real NPC tray reachability and dialog preview rendering. No signed-in end-to-end browser journey claimed. |

Commands, from the repository root using the prepared Node 22 runtime:

```sh
REVIEW_REPO="$PWD" /tmp/code-review-runtime/node_modules/.bin/node docs/reviews/2026-10-03/pass-3/evidence/probes/duplication/scan.cjs
REVIEW_REPO="$PWD" /tmp/code-review-runtime/node_modules/.bin/node docs/reviews/2026-10-03/pass-3/evidence/probes/duplication/source-probes.cjs
REVIEW_REPO="$PWD" /tmp/code-review-runtime/node_modules/.bin/node node_modules/jest/bin/jest.js --config docs/reviews/2026-10-03/pass-3/evidence/probes/duplication/jest.config.cjs --runInBand --testTimeout=15000
```

The first draft of the attachment test over-specified concatenated DOM text and
stopped on the decorative sigil before reaching its filter assertion. The
assertion was narrowed to the actual name node and absence of the derived name;
this was a diagnostic correction, not a production edit. The original scanner
attempt used `child_process.execFileSync('git', ...)`, which returned an
executor `EPERM`; direct filesystem enumeration removed that unnecessary
subprocess. Neither event was an approval/policy interruption or a product bug.

Existing test suites and full gates belong to the coordinator. The unchanged
first-pass baseline is not claimed as a fresh run here. The AST census is not
an exhaustive detector, and no assertion is made about every possible runtime
copy. Config/CSS/test/generator duplication was not comprehensively measured;
authentication/account lifecycle was excluded. Platform timing, native touch,
real SDK races, production data and deployed parity remain outside this report.

## Reconciliation

- DATA-001/002/003/005/008, IMG-004, REACT-002/006/007 and TEST-006 retain their
  existing findings; repeated implementations were inspected without increasing
  those issue counts.
- T063 owns the already-agreed entity-detail visual unification. T017 owns the
  deliberately absent location batch-delete feature; T079 owns legacy-location
  migration investigation. None is refiled as a duplication defect.
- Architecture owns module reachability, public boundaries and obsolete
  alternate paths. AI owns extraction schemas/response mapping and the
  `customLimit: 0` usage-display drift; the latter is cross-copy policy evidence,
  not an additional DUP issue.
- `useNoteReferences` still builds reference candidates from stored `name`/`title`
  (`src/features/collaboration/notes/components/NoteReferences.tsx:88-105`), so unnamed rumours have no candidate. Extending
  prose matching to content-derived phrases requires an explicit matching
  contract and was not promoted into another confirmed finding. Note-page
  generic headings and incidental date-style differences likewise remain
  outside the ranked findings.
