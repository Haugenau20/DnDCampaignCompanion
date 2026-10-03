# Second-pass review: test quality and coverage protection

Reviewed commit: `8c03720020c7772b0bb8b256c4569c8b50c1e495`, whose application,
tests and configuration are unchanged from first-pass `64fe195`.
Date: 2026-10-03. Reviewer: GPT-6 Astra, xhigh; assigned test-quality specialist.

## Result and interpretation

The existing gates are green: **307 frontend suites, 5,783 passing tests and two
skips; 12 Functions/rules suites, 216 passing tests**. This report reuses the
[measured baseline](../baseline.md), not the older counts in `AGENTS.md`.
The findings below explain specific failures of protection: an unrealistically
atomic fake, assertions requiring stale fields in a patch, component mocks that
sever a real data contract, and untested failure/boundary combinations.

The specification requirements themselves are not disputed. The tests should
protect those requirements, including preserving unrelated edits and displaying
the note that was fetched. TEST-002 and TEST-004 identify assertions that pin an
incorrect intermediate contract. Tests recommended below are tied to reachable,
demonstrated failures; optional coverage improvements are listed separately.
First-pass production findings are cross-referenced, not counted as newly found
production defects. Each underlying production fix is still required.

No production source, existing tests, snapshots, dependencies, configuration,
backlog or deployed resources were changed. Temporary diagnostics are outside
the repository and were run centrally by the coordinator. No full competing
suite, real AI request, mail send or production backend operation was performed.

## Inspected scope

- Current repository instructions, `TODO.md`, live behavioural tracker, second-pass
  plan, first-pass summary/baseline, data-integrity and uploaded-image findings.
- `src/core/services/firebase/data/{DocumentService.ts,__tests__/DocumentService.test.ts}`;
  the NPC/Quest/Location/Rumor cross-session test harnesses; quest objective and
  batch update tests and their provider paths.
- `src/shared/hooks/{useFirebaseData.ts,useImageAttachment.ts}` and their unit
  suites, listener ownership/snapshot scheduling assertions and attachment
  save/remove promise semantics.
- Note page/editor/provider, note editor's held-save harnesses, campaign-links
  panel and actual extraction hook, and the corresponding page/component/hook
  tests. Entity detail page/inline editor tests were checked for record changes
  while an editor remains mounted.
- Campaign deletion callable and emulator suite; image preparation and Storage
  boundary tests, using the first-pass fault-injection evidence.
- Header/chapter-rail layout assertions; root and Functions Jest configuration,
  all three test/deploy workflows, build resolver coverage, test-lint ratchet,
  retained `coverage/coverage-final.json`, and the inventory of skipped tests.

Important exclusions: this is not an assertion-by-assertion audit of all 5,785
frontend tests. No device/browser rendering or touch test was run by this reviewer.
Deployed rules parity and remote CI branch-protection settings were not inspected.
The stopped authentication/account-lifecycle review was not resumed; the two
existing skips are inventoried only, without new authentication investigation.

## Confirmed protection gaps

### TEST-001 — The cross-session fake provides the atomic creation guarantee production lacks

**Severity: high. Confidence: high. Classification: new test-quality evidence for
first-pass DATA-001; not a regression of the sequential #1402 retry fix.**

**Requirement and trigger.** Two players independently create the same slug before
either first write finishes. Both creations must survive under distinct ids, or
one must receive the existing collision signal and retry. `DocumentService.ts:153–162`
explicitly promises protection against destroying the pre-existing record.

**Current passing test.**
`src/features/campaign-entities/npcs/context/__tests__/NPCContext.cross-session.test.tsx:17–19`
claims that the fake behaves like `DocumentService`. Its `mockAddData` at
`:67–70` checks `serverIds.has(id)` and inserts into the set without an intervening
await. It provides an atomic reservation. The assertion at `:98–112` seeds an
already-taken id and verifies `gandalf-2`; it never puts two callers between a
read and write. The lower service suite also tests only an absent document
(`src/core/services/firebase/data/__tests__/DocumentService.test.ts:566–581`)
or an already-present document (`:584–606`) in isolation.

**Production path and proof.** Actual
`src/core/services/firebase/data/DocumentService.ts:185–205` awaits `getDoc`,
then attribution, then calls unconditional `setDoc`. The fake's indivisible
check-and-insert therefore removes the exact schedule that loses a record.
The retained [DATA-001 reproduction](../03-data-integrity.md#data-001--concurrent-same-slug-creations-still-overwrite-each-other)
runs actual service/helper source with two missing-document reads held before
either write, observes both successful ids equal and only one persisted record.
The green cross-session assertion is compatible with that demonstrated loss.

**Meaningful protection and fix.** Keep the sequential test, but add two independent
contexts/services with a shared store and a barrier after both existence reads;
assert two distinct persisted contents after completion. Prefer the actual
transaction/create implementation and emulator for the final regression test.
A fake must not silently supply a stronger concurrency guarantee than that
implementation. **Production fix required:** atomic conditional creation and
collision retry, as DATA-001 describes.

### TEST-002 — Objective tests require stale unrelated fields in a write that should preserve them

**Severity: high. Confidence: high. Classification: newly demonstrated defective
test contract for first-pass DATA-003; verified by an in-memory sensitivity probe.**

**Requirement and trigger.** Ticking an objective must leave unrelated quest
fields alone, including another player's newer title/status. This is stated
directly in `src/features/campaign-entities/quests/context/QuestContext.tsx:144`;
the shared-record save contract is in
`docs/design/plan/15-entity-authoring/00-entity-authoring.md:248–264`.

**Current passing assertions.**
`src/features/campaign-entities/quests/context/__tests__/QuestContext.objectives.test.tsx:87–94`
mocks `updateData` as a resolving function without applying the patch to stored
state. Tests inspect the *outgoing payload* and require its status to be `active`
at `:160` and `:222`, `completed` at `:268` with its old date at `:269`, and
`failed` at `:313`. Those requirements are stronger than “the stored status
does not change”: omission is precisely how a Firestore field patch preserves it.

**Production path and observed proof.** `QuestContext.tsx:145–147` writes
`{ ...quest, objectives }`, using the read-hook snapshot obtained at `:136` and
`:170`. `DocumentService.ts:240–257` forwards the provided fields to `updateDoc`.
The [DATA-003 reproduction](../03-data-integrity.md#data-003--unrelated-collaborative-edits-and-array-updates-silently-erase-each-other)
already demonstrated that an objective tick restores an old title, and another
tick undoes its predecessor.

The coordinator ran the existing ten-test objectives suite through
`/tmp/pass2-tests/jest.config.cjs`. Control: **10 passed**. The only in-memory
source change was:

```ts
// Reviewed implementation
await updateData(quest.id, { ...quest, objectives });
// Field-only candidate, applied by a temporary transformer
await updateData(quest.id, { objectives });
```

Result: **4 failed, 6 passed**, exclusively at status assertions `:160`, `:222`,
`:268`, `:313` (`undefined` instead of the old status). This is a deliberate
negative control, not a repository regression. It proves that these assertions
reject a necessary part of the correction while accepting the existing
overwrite. Retained logs: [control](evidence/outputs/control-results.txt) and
[field-only candidate](evidence/outputs/patch-results.txt).

**Meaningful protection and fix.** Assert the post-write stored quest, applying
real patch semantics; omit unrelated fields from the payload assertion. Seed a
newer title/status after capturing the editor snapshot and verify they survive.
Separately interleave two objective changes and assert both survive: the
field-only candidate above does **not** fix replacement of the objective array.
**Production fix required:** field patches plus concurrency-safe objective edits;
the test correction preserves the existing requirement, rather than changing it.

### TEST-003 — A read-only attribute on a mock conceals a blank fetched note

**Severity: medium. Confidence: high. Classification: new second-pass test gap;
same product failure as [FUNC-001](05-functional-workflows.md#func-001--a-fetched-cross-campaign-note-opens-as-an-empty-read-only-editor).**

**Requirement and trigger.** Open an owned note from another campaign while the
current campaign is selected. The page explicitly offers viewing it read-only
(`src/pages/notes/NotePage.tsx:215–232`), so its fetched prose must be visible.

**Current passing test.**
`src/pages/notes/__tests__/NotePage.test.tsx:325–343` sets `getNoteById` to
`undefined` and direct `getDocument` to a note with title and content. Its
editor mock at `:102–116` ignores `noteId` and all content; the regression
assertion at `:355–362` checks only `data-readonly="true"`. The warning and
absence of campaign links also pass (`:346–372`). None proves that the fetched
note reaches the actual rendering component.

**Production path and proof.** `NotePage.tsx:68–74` stores the fetched note locally,
uses it for the heading (`:125–126`, `:175`), but gives the editor only `noteId`
(`:229–232`). Actual
`src/features/collaboration/notes/components/NoteEditor.tsx:115–134` obtains its
content solely through `getNoteById`. The provider subscribes only to the active
campaign (`src/features/collaboration/notes/context/NoteContext.tsx:65–98`), so
that lookup still returns nothing for the fetched note.

The centrally executed [cross-campaign diagnostic](evidence/probes/functional/cross-campaign-note.test.js)
mounts actual `NotePage` and `NoteEditor`, mocking outer context/service I/O.
It observes the fetched title in the heading but empty disabled title/content
inputs and “0 words.” This is a deterministic React rendering reproduction,
not a live backend test. Both source files are heavily executed in the retained
coverage (82/85 and 168/172 statement counters respectively); no counter measures
whether their separately tested contracts join correctly.

**Meaningful protection and fix.** Mount the real editor for at least this case,
keep the campaign-local lookup absent, return a different-campaign note from the
service, and assert its actual prose and title appear with writes disabled.
**Production fix required:** explicitly deliver the fetched note to the reader,
or provide a separate reader whose data source is that note. Retain the current
restriction on writing another campaign's note.

### TEST-004 — Extraction tests pin success-shaped failures, while the panel mocks a rejection

**Severity: medium. Confidence: high. Classification: new second-pass test gap;
same product failure as [FUNC-002](05-functional-workflows.md#func-002--a-failed-rescan-deletes-previous-detections-and-also-reports-that-no-new-names-were-found).**

**Requirement and trigger.** A note already has unconverted detections. A rescan
is rejected locally because its content exceeds 10,000 characters, or extraction
fails. A failure must preserve the last successful detections and must not claim
that a successful scan found no new names.

**Current passing assertions and disconnected mock.**
`src/features/collaboration/entity-extraction/hooks/__tests__/useEntityExtractor.test.ts:199–209`
is named “should throw error for content exceeding 10000 characters,” but awaits
a successful return and asserts `entities` equals `[]`. The failure-as-empty
contract is also explicitly required for the usage-limit case at `:327–342`.
Meanwhile
`src/features/collaboration/notes/components/__tests__/CampaignLinksPanel.test.tsx:394–404`
tests failure using `mockExtractWithOpenAI.mockRejectedValue(...)`; the actual
hook catches it. That panel test asserts an error string only, not preservation
of existing detections.

**Production path and proof.**
`src/features/collaboration/entity-extraction/hooks/useEntityExtractor.ts:46–70`
validates, catches the validation/service error, sets hook error state and returns
`[]`. Before awaiting that hook,
`src/features/collaboration/notes/components/CampaignLinksPanel.tsx:231–235`
persists only already-converted entities, removing pending detections. Its
continuation at `:238–255` treats the empty array as a successful empty result,
writes it again and sets the “found nothing” message. A fresh error state in
another hook does not change that return value.

The centrally executed [failed-scan diagnostic](evidence/probes/functional/failed-scan-recovery.test.js)
joins the actual panel and hook with 10,001 characters and one existing pending
detection. It observes **two note updates**, no remaining detection, and both
the validation error and “No new names found in this note.” The service is never
called: this proves the contract failure without a model request or a speculative
external outage.

**Meaningful protection and fix.** Join the real panel and hook, fail both local
validation and a synthetic service request, and assert zero destructive note
updates, retained detections and no success/no-results message. Use a rejected
promise or an explicit success/error result; test the chosen contract consistently
at both ends. Commit replacement detections only after success. **Production fix
required:** changing the tests alone cannot preserve the already-cleared data.

### TEST-005 — Real-emulator deletion tests stop before the failure contract that strands data

**Severity: medium. Confidence: high. Classification: new test-quality analysis
of first-pass DATA-004/IMG-005; no additional production issue is counted.**

**Requirement and trigger.** Campaign deletion must either finish its descendant,
member-note and file cleanup or leave a retryable operation. A single terminal
write/recursive-delete failure is the relevant boundary; successful emulator
cleanup does not establish that boundary.

**Current passing assertions.**
`firebase/functions/test/deleteCampaign.test.ts:25–42` seeds members, a campaign,
one NPC and files, but no member note and no selected `activeCampaignId` to clear.
The success test at `:55–61` asserts campaign-root and two file absences; it does
not assert NPC descendant absence. `:86–109` meaningfully verifies member
progress cleanup and sibling retention. No test in this file injects terminal
BulkWriter, recursive-delete or Storage failure and retries the operation.

**Production path and proof.**
`firebase/functions/src/campaignManagement/deleteCampaign.ts:109–126` ignores
individual `writer.update/delete` promises and `:129–130` assumes `close()`
rejects them. Images are deleted at `:138–140` before recursive deletion at
`:148`. First-pass [DATA-004](../03-data-integrity.md#data-004--campaign-deletion-does-not-verify-cleanup-failures-and-cannot-resume-after-a-missing-root)
tested the installed BulkWriter with a terminal outbound RPC failure: the
individual promise rejected while `close()` fulfilled. Actual callable/emulator
probes then demonstrated a surviving private note after root deletion and
`not-found` on retry, plus real recursive deletion removing the root despite
a failed child. [IMG-005](../04-uploaded-images.md#img-005--campaign-deletion-removes-images-before-a-failed-document-deletion-leaving-live-broken-references)
demonstrated file removal with live image references after a later failure.
These are already verified faults, not a claim that the emulator lacks realism.

**Meaningful protection and fix.** Expand the fixture to include every promised
cleanup branch, assert persisted descendant/note/selection state, and inject a
terminal error on one individual write while allowing `close()` to fulfill.
Also fail only a descendant during actual recursive deletion, then retry and
assert complete recovery. A replacement `close: mockRejectedValue(...)` alone
would repeat the wrong SDK contract. **Production fix required:** observe write
results and make the cleanup protocol resumable; use DATA-004/IMG-005's fix plan.

### TEST-007 — The draft-retention test disconnects a rejected write from the provider's error state

**Severity: medium. Confidence: high. Classification: new second-pass protection
gap for REACT-002; not an additional application defect.**

**Requirement and trigger.** An inline description save fails. Every character
must remain available for retry, as required by
`docs/design/plan/15-entity-authoring/00-entity-authoring.md:255–256`.

**Passing test versus production path.**
`src/pages/npcs/__tests__/NPCDetailPage.test.tsx:923–938` rejects
`mockUpdateNPC` and verifies that the actual editor keeps “Hard-won sentence.”
The retry test at `:968–985` is similarly useful within a mounted editor.
However, `useNPCs` is mocked (`:152–159`): rejecting its function does not
also update the provider error supplied to the page. In production,
`src/shared/hooks/useFirebaseData.ts:284–287` both sets `writeError` and rejects;
`src/features/campaign-entities/npcs/context/NPCContext.tsx:41`, `:255` exports
that error; `src/pages/npcs/NPCDetailPage.tsx:283–296` passes it to `usePageGate`.
`src/shared/components/gated/usePageGate.ts:109–110` selects the error state,
and `GatedContent.tsx:124` removes the ready children, including the draft.
The gate's Retry calls read refresh (`NPCDetailPage.tsx:294–296`), which cannot
clear the write hook's error. Thus preserving component-local text in its own
catch is insufficient: the actual parent unmounts the component.

**Observed proof.** The coordinator ran the second test in the retained
[React state probe](evidence/probes/react/state-probes.test.js), mounting real
`NPCDetailPage`, `NPCProvider`, `useFirebaseData`, gate and inline editor with
synthetic read data and a rejected service write. The textbox disappears;
“Try again” calls the read refresh once, and the error still blocks the page.
See [React output](evidence/outputs/react-state.txt) and REACT-002 in the
[state report](06-react-state.md). This directly contradicts the requirement
that the existing isolated assertion appears to protect.

**Meaningful protection and fix.** Retain the editor unit tests and add this
actual-provider failure path. Assert the typed value survives both rejection
and retry, then make the next service write succeed and verify the intended
value is saved. **Production fix required:** keep mutation errors local to the
operation and separate them from fetch failures that gate an entire page.

### TEST-006 — Client and Storage boundary tests never test the same accepted image

**Severity: low. Confidence: high. Classification: new test-quality analysis of
first-pass IMG-004; the production size mismatch is already reported.**

**Requirement and trigger.** Browser preparation must produce an upload accepted
by the corresponding size rule. An encoded image is exactly 2,097,152 bytes.
The rule's own comment requires parity with `MAX_UPLOAD_BYTES`
(`firebase/storage.rules.prod:37`), and its prepared-image predicate is at `:79–83`.

**Current passing tests.**
`src/core/utils/__tests__/prepare-image.test.ts:147–168` checks `MAX_UPLOAD_BYTES + 1`
and `MAX_UPLOAD_BYTES - 1`, omitting equality. Conversely,
`firebase/functions/test/rules/storage-rules-prod.test.ts:156–157` explicitly
asserts that **exactly** 2 MiB is refused. Both suites pass while accepting
different contracts.

**Production path and proof.** `src/core/utils/prepare-image.ts:141–144` rejects
only `> MAX_UPLOAD_BYTES`; `firebase/storage.rules.prod:81` accepts only `<`.
The [IMG-004 probe](../04-uploaded-images.md#img-004--exactly-2-mib-passes-preparation-but-violates-the-upload-rule)
executes actual preparation with a deterministic canvas output of 2 MiB and
observes client acceptance and rules-predicate refusal. Real rule equality
refusal is already protected by the existing emulator assertion. The consequence
is a user-visible upload failure after preparation approved the file.

**Meaningful protection and fix.** Run `limit-1`, `limit`, `limit+1` against both
producer and acceptance contract, asserting that every successful prepared result
is eligible for upload. **Production fix required:** choose consistent inclusive
or exclusive semantics; do not independently strengthen one side's unit test.

## Coverage, execution and CI truthfulness

The retained coverage JSON contains 331 instrumented frontend source entries.
The counts below are statement/function/branch **hits**, read from Istanbul's
`s`, `f` and flattened `b` counters. They support the claim that exercised lines
can still have unprotected contracts; they do not imply that a mocked collaborator
executed as part of that test.

| Actual source file | Statement hits | Function hits | Branch hits | Unprotected dimension |
|---|---:|---:|---:|---|
| `src/core/services/firebase/data/DocumentService.ts` | 114/127 | 18/21 | 34/42 | Two reads before either create; target selection after await |
| `src/features/campaign-entities/quests/context/QuestContext.tsx` | 150/169 | 45/47 | 79/99 | Stored state after another writer changes the record |
| `src/pages/notes/NotePage.tsx` | 82/85 | 15/16 | 60/66 | Fetched note reaching the actual editor |
| `src/features/collaboration/notes/components/NoteEditor.tsx` | 168/172 | 37/38 | 89/97 | Page/provider integration and lifecycle combinations |
| `src/shared/hooks/useFirebaseData.ts` | 131/131 | 27/27 | 54/56 | Pending-operation ownership across path changes/unmount |
| `src/shared/hooks/useImageAttachment.ts` | 24/24 | 7/7 | 3/3 | Mutable target, overlapping stale record, pending offline save |

The coverage report is truthful about line execution within its configured
scope. Root `jest.config.ts:95–110` collects `src` TypeScript, explicitly excludes
entry/setup, dev tooling, test utilities/mocks and theme definitions, and enforces
an **aggregate** 80% floor. It does not measure CSS, Functions, rules or browser
layout. Functions/rules have a separate runner
(`firebase/functions/jest.config.js:15–34`) without a coverage threshold. Neither
the frontend percentage nor a zero threshold breach establishes their coverage.

The current CI does run the important separate gates:
`.github/workflows/test.yml:38–54` installs from lockfile, type-checks, runs app
and test lint, and collects frontend coverage; `:82–94` builds Functions and runs
the emulator suites; `:106–119` builds with webpack and checks the bundle. Thus
the historical “Functions have no test runner” and “production-copy rules are
untested” tracker text is obsolete. The webpack gate genuinely complements Jest's
`@/` mapping, because CRA ignores tsconfig `paths`; this is not an omitted CI gate.
The documented `ts-node` resolver gap remains outside this build: dev scripts are
not bundled or covered. No failing operator invocation was newly established here.

Production deploys depend on the reusable test workflow
(`.github/workflows/firebase-hosting-merge.yml:27`, `:57–58`). PR preview builds
run independently of it (`firebase-hosting-pull-request.yml:11–17` has no
`needs: test` for preview); a preview URL alone is therefore not evidence of
passing tests. The shipping Docker build uses `npm install --legacy-peer-deps`
(`docker/Dockerfile.frontend.prod:8`) while gates use `npm ci`; this is the
already-recorded T059 reproducibility caveat, not a newly observed dependency
divergence. Remote branch protection and an actual mismatching shipped artifact
were not checked.

The test-lint baseline is a real per-file count ratchet, not zero lint findings:
`scripts/check-test-lint.js:67–94` rejects increases and uncommitted decreases.
The retained baseline records **1,005 problems in 148 files**. The code does not
prove that each violation is unchanged when a file's count stays the same, and
`--update` accepts increases (`:61–64`); review of baseline edits is still needed.
No claim that these counts cause a particular TEST finding is made.

## False leads, useful existing protections and explicit limits

- **#1414/#1415 are not still tests asserting broken behaviour.** `AGENTS.md`'s
  warning is stale. The tracker records their inversion and negative controls at
  `docs/testing/bug-tracking/README.md:264–273`. Today's
  `LocationDirectory.test.tsx:466–480` requires deep search matches and their
  ancestry labels under the newer flat-search design; `QuestDirectory.test.tsx:792–806`
  requires resolved NPC-name matches and rejects unrelated quests. These were
  checked against current source/tests, not counted as defects from historical text.
- **Only two explicit skips were found:**
  `src/features/user-management/auth/context/__tests__/FirebaseContext.behavioral.test.tsx:962`
  and `:980`, the already-catalogued #901 retry tests. The tracker marks #901 a
  testability limitation, not a production defect. Test titles containing the word
  “skipped” elsewhere are not `.skip` calls. No auth investigation or new auth
  conclusion follows from this inventory.
- **Listener cleanup and ordinary retry are tested.**
  `src/shared/hooks/__tests__/useFirebaseData.subscription.test.ts:114–130`,
  `:133–145`, `:166–203`, `:215–223` meaningfully exercise first-snapshot waiting,
  path/unmount unsubscribe, retry and old-data masking. They do not combine a
  pending `getData()` with switch/unmount: the hook's shared waiter list at
  `useFirebaseData.ts:95–104`, `:145–153` is only settled by publication, while
  cleanup at `:142` only unsubscribes. That is an unprotected schedule, but this
  reviewer did not establish a current user action whose result requires that
  pending promise after a switch. It is **not** promoted to a production finding.
  Nor is an invented callback after successful SDK unsubscribe treated as a real
  Firestore race.
- **Note save timing tests are not all immediate mocks.**
  `NoteEditor.test.tsx:896–980` gives the provider changing callback identities
  and a held save; `:990–1082` holds individual saves, verifies coalescing and
  preserves newer text. These are substantial guards. Their presence does not
  resolve page integration (TEST-003) or establish browser unload durability.
- **Record identity is another missing lifecycle combination.**
  `NPCDetailPage.test.tsx:827–840` verifies the outgoing description for one
  freshly mounted `npc-1`, but never changes the route id while editing. The
  first retained [React state probe](evidence/probes/react/state-probes.test.js)
  uses real router navigation and the actual page/provider/editor: Alice's draft
  remains on Bob's route and is submitted to Bob. That is REACT-001's separately
  owned production failure, not a second consequence of TEST-007's error gate.
  Add same-component route-id navigation and assert record/draft ownership; a
  remount for each fixture cannot protect this requirement.
- **Image ordering tests are useful but bounded.**
  `useImageAttachment.test.ts:85–100`, `:131–144` verifies save-before-delete and
  rejected-save cleanup. Its fixed prefix and resolving callback at `:64–69`
  cannot establish an actual document's target after scope switch. Its “offline”
  case at `:139–144` uses immediate rejection; actual Firestore offline writes
  remain pending, the schedule reproduced in first-pass IMG-003. Future tests
  should preserve that real promise contract, not rename rejection as offline.
- **Layout-class assertions are not browser geometry tests.**
  `Header.test.tsx:420–432` pins `shrink-0`; it cannot prove the complete header
  fits at 320px. T075 already tracks narrow header overflow. Likewise,
  `ChapterRail.test.tsx:303–342` explicitly supplies `clientHeight`, `offsetTop`
  and `offsetHeight`: it verifies scroll arithmetic, not actual touch scrolling.
  T026 remains unconfirmed on the reporting phone. `prepare-image.test.ts:11–15`,
  `:53–65` explicitly mocks decoding/encoding, so EXIF orientation and browser
  codec behaviour require real fixtures/browser verification. These are honest
  platform limits, not newly confirmed CSS/codec bugs.
- **Copied route tables do not verify shipping route declarations.**
  `NPCDetailPage.test.tsx:1629–1653` tests React Router ranking against its own
  literal `npcRoutes`; `app/__tests__/EditRouteRedirect.test.tsx:20–45` mounts a
  local route fixture. These provide library/redirect behaviour checks. This
  review did not find a current wrong shipping route, so importing the real route
  tree for a smoke check is optional regression protection, not a new product defect.

## Reproduction record and recommended order

1. The existing full baseline is retained unchanged, because the reviewed source
   and gates are byte-identical to the first-pass run.
2. The objectives sensitivity check ran the original existing suite twice:

   ```bash
   PASS2_FIELD_PATCH=0 node node_modules/jest/bin/jest.js --config /tmp/pass2-tests/jest.config.cjs --runInBand --runTestsByPath src/features/campaign-entities/quests/context/__tests__/QuestContext.objectives.test.tsx
   PASS2_FIELD_PATCH=1 node node_modules/jest/bin/jest.js --config /tmp/pass2-tests/jest.config.cjs --runInBand --runTestsByPath src/features/campaign-entities/quests/context/__tests__/QuestContext.objectives.test.tsx
   ```

   Control: 10/10, 3.666s. Field-only candidate: 4 expected failures / 6 passes,
   3.764s. The retained [transformer](evidence/probes/test-quality/field-patch-transformer.cjs)
   and [configuration](evidence/probes/test-quality/jest.config.cjs) document the
   temporary runner; the transformer checks for exactly one
   reviewed source fragment before transforming it. No repository file or
   coverage output is mutated. These timings are runner observations, not benchmarks.
3. The functional review's actual page/editor and panel/hook diagnostics passed
   while asserting the defective behaviours described in TEST-003/004. They are
   diagnostic evidence, **not** proposed green regression tests. A production
   regression test must assert correct content/preservation and fail before a fix.
   Retained [functional output](evidence/outputs/functional.txt). The same caveat
   applies to the React provider/error-gate diagnostic in TEST-007.
4. DATA-001/003/004 and IMG-004/005 evidence is reused from the first pass with
   its stated boundaries: actual source with controlled I/O/scheduling, installed
   SDK terminal-failure injection, and emulator-backed deletion/rules checks.

Prioritize tests that cross the faulty boundaries during each corresponding
production fix: atomic creation and preservation of unrelated updates first;
then real page/editor and scan-hook integration; then terminal cleanup recovery
and exact upload boundaries. Do not target a higher global percentage as the
remedy: the important lines already execute in the passing suite.
