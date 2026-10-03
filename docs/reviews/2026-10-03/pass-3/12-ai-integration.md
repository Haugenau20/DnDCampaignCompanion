# AI and external integration reliability review

Date: 2026-10-03. Reviewer: AI integration specialist; assigned profile
GPT-6 Astra, xhigh. Reviewed commit:
`0ba261205f2a55082a0560f1c68861a463fb8f89` (PR #197); application source is
unchanged from `64fe19512b1d3bd14427fad8996403a742fbe8a9`.

Three new findings: **one medium and two low**. The most consequential is an
allowance snapshot that keeps Scan note disabled after the advertised reset.
The ordinary failed-request accounting symptom is grouped with that same
snapshot lifecycle issue. Response robustness observations that require a
supplier to violate the strict schema are recorded separately, without a new
product-finding count.

## Scope and evidence limits

Read `AGENTS.md`, the relevant backlog and live tracker entries, both prior
summaries, the third-pass plan and the reporting standard. Inspected:

| Area | Actual inspected path or boundary | Verification |
|---|---|---|
| Request and model response | `firebase/functions/src/entityExtraction.ts`, `partyCharacters.ts`, `shared/httpsErrors.ts` | Actual TypeScript handler with synthetic completions and in-memory IO; captured its real tool schema. |
| Browser response mapping | `src/core/services/openai/types.ts`; `src/features/collaboration/entity-extraction/{services,hooks,types.ts}` | Actual service and mapper with synthetic callable responses; malformed/empty/truncated cases below. |
| Allowance feedback | `UsageContext.tsx`, `UsageMeter.tsx`, active `useEntityExtractor.ts` and `CampaignLinksPanel.tsx` | Actual React provider/hook/panel/meter under jsdom with service IO substituted; natural reset, ordinary failure and zero-limit cases. |
| Conversion and normalization | `notes/context/NoteContext.tsx`; `shared/components/quick-add/{quickAddSpecs.ts,useQuickAddCreate.ts}`; `shared/utils/resolve-name-to-id.ts`; `quests/utils/quest-objectives.ts` | Four passing actual-source handoff controls with synthetic source entities and write boundaries. |
| Deadline/retry/error behavior | Callable options, OpenAI construction/call, Firebase `httpsCallable`, installed SDK defaults | Source/installed-SDK inspection; no slow remote request or production timing experiment. |

No live or paid model call, production data, emulator/server startup, outbound
message, deployment or credential inspection was used. The fixed synthetic
reader merely satisfies the existing entry condition; authentication, account
lifecycle, invitations, authorization/rules and quota abuse were not reviewed.
The previously stopped account/authentication scope remains stopped.

The diagnostics use the reviewed source, not copies of its business logic.
Handler tests replace Firebase IO and OpenAI transport. UI tests replace IO and
unrelated feature data; conversion controls retain the actual mapper, note
context, normalization and creation hook. These are controlled source-runtime
and jsdom observations, not deployed model behavior or Firestore persistence
measurements. Coordinator verification is recorded in [verification.md](verification.md).

## Findings

### AI-001 — Cached allowance status keeps scanning blocked after its reset time

**Severity:** medium. **Confidence:** high. **Classification:** new ordinary
integration-state lifecycle defect. Fixed tracker #650 prevents an infinite
refresh loop; this is the missing bounded refresh after a snapshot expires.

**Sources:**

- [UsageContext.tsx:48](../../../../src/features/collaboration/entity-extraction/context/UsageContext.tsx#L48),
  lines 48–50 and 137–143, loads only once for the unchanged reader. Remounting
  the meter calls `setRequested(true)` again without releasing that claim.
- [UsageContext.tsx:113](../../../../src/features/collaboration/entity-extraction/context/UsageContext.tsx#L113),
  lines 113–117, gates scanning solely on cached `limitExceeded` and does not
  compare `nextReset` to the current time.
- [CampaignLinksPanel.tsx:347](../../../../src/features/collaboration/notes/components/CampaignLinksPanel.tsx#L347)
  disables the only Scan note button on that result.
- [UsageMeter.tsx:73](../../../../src/features/collaboration/entity-extraction/components/UsageMeter.tsx#L73),
  lines 73–79 and 177–180, requests usage on mount and advertises the binding
  reset time, but offers no refresh/retry action or time-based refresh.

**Trigger:** keep a normal note tab open after reaching its daily allowance.
Let the daily reset pass while the reader and provider remain mounted.

**Expected:** when the advertised reset arrives, refresh the server status and
re-enable scanning if no other period is exhausted. **Actual:** the old
`limitExceeded: true` remains indefinitely in that provider. The button stays
disabled, so clicking Scan cannot reach the server to obtain a corrected
status. Reloading the application/provider is an effective recovery; there is
no visible meter refresh control.

**Observed reproduction:** `usage-feedback.test.js` mounts the actual provider,
hook, panel and meter at `2026-10-03T23:59:00Z`, with a daily count of 10/10 and
a reset at midnight. After advancing the clock to `2026-10-04T00:01:00Z`, making
the synthetic server ready to return 0/10, and rerendering, the meter still
shows 10/10, the button remains disabled, the service status fetch count is
still one, and a click makes zero extraction calls. No request ordering race
or account switch is required.

**Companion failure symptom, grouped here:** a normal upstream failure can
also make the retained snapshot false. The handler increments the attempt
before the model call at
[entityExtraction.ts:428](../../../../firebase/functions/src/entityExtraction.ts#L428)
and returns generic failures without usage at lines 731–734. The active hook
only updates usage after success or a dedicated limit exception:
[useEntityExtractor.ts:50](../../../../src/features/collaboration/entity-extraction/hooks/useEntityExtractor.ts#L50),
lines 50–70. The source handler probe observes a counted ordinary upstream
failure, while the actual UI test starts at 9/10, models that failed final
attempt, and observes the meter still at 9/10 with Scan enabled and no refresh.
This does not assert that failed attempts should be free. The defect is the
stale authoritative-looking feedback; the destructive empty-result behavior
remains existing FUNC-002.

**Impact:** a recovered allowance can remain unavailable for the rest of an
open session; failed attempts can also leave the displayed remaining capacity
too high. These are availability/feedback problems, not enforcement bypasses.

**Fix direction:** give usage snapshots an explicit refresh lifecycle. Refresh
once at the next relevant reset, and on return to a tab whose snapshot has
expired; preserve bounded retry/backoff so #650 does not return. Invalidate or
refresh after an attempted request whose failure does not provide definitive
usage. A visible refresh/retry route also provides recovery when fetching the
new snapshot fails. Keep the old value visibly stale while checking.

**Verification:** retain the clock-crossing and failed-request cases; add
weekly/monthly binding periods, a suspended tab resuming after reset, and a
failed status refresh followed by successful retry. An exhausted weekly or
monthly period must continue to gate scanning after the daily period resets.

### AI-002 — The model schema permits confidence values the UI treats as impossible percentages

**Severity:** low. **Confidence:** high for the contract and synthetic
reproduction; live frequency is unmeasured. **Classification:** new schema/UI
contract defect, not evidence that strict Structured Outputs is broken.

**Sources:** the browser contracts describe confidence as 0–1 at
[openai/types.ts:70](../../../../src/core/services/openai/types.ts#L70) and
[notes/types.ts:26](../../../../src/features/collaboration/notes/types.ts#L26).
All four tool variants only require a number:
[entityExtraction.ts:516](../../../../firebase/functions/src/entityExtraction.ts#L516),
lines 516, 550, 594 and 636. Neither those properties nor the transmitted system
prompt at lines 453–471 tells the model the intended scale.
[EntityExtractionService.ts:212](../../../../src/features/collaboration/entity-extraction/services/EntityExtractionService.ts#L212)
copies the value unchanged; the active panel multiplies it by 100 at
[CampaignLinksPanel.tsx:465](../../../../src/features/collaboration/notes/components/CampaignLinksPanel.tsx#L465).

**Trigger:** a model supplies a percentage-style confidence such as `90`
instead of a fraction such as `0.9`. This response complies with the actual
strict tool schema.

**Expected:** only a finite value in the product's documented 0–1 interval is
accepted as confidence. **Actual:** `90` survives the handler and service as
`90`, and the active panel's formatting produces `9000% confidence`. A negative
value also passes. The same value participates in confidence-based selection
between duplicate detections at panel lines 145–154, so an invalid score can
replace a valid detection's richer details.

**Evidence:** `response-probe.cjs` captures the actual request schema, validates
complete NPC fixtures with `90` and `-0.4` using the installed JSON-schema
validator, then passes them through the real handler and real service. Both
fixtures validate and emerge unchanged. The output records display arithmetic
of 9000 and -40 percent. The display and duplicate-selection consequences are
source-traced; this probe does not mount those particular detection rows or
measure real model outputs.

**Fix direction:** specify the intended scale in the tool schema/prompt and
validate finite 0–1 values at the server response boundary. Use supported
numeric bounds in the chosen model's strict schema where available. Decide
explicitly how to report an invalid response rather than assuming that `90`
means `0.9` or silently treating it as maximum certainty.

**Verification:** accept 0 and 1 and ordinary fractions; reject out-of-range or
nonfinite values before persistence/deduplication. Assert that every displayed
confidence is within 0–100%, and that invalid scores cannot win duplicate
selection. Existing valid-empty extraction behavior should remain intact.

### AI-003 — A configured zero daily allowance is displayed as ten

**Severity:** low. **Confidence:** high. **Classification:** new display-policy
drift. The duplication specialist delegated this overlap to this report.

**Sources:** both server status paths select the configured override with
`customLimit ?? daily.limit` at
[entityExtraction.ts:229](../../../../firebase/functions/src/entityExtraction.ts#L229)
and line 312. The hook's remaining/percentage helpers do the same at
[useEntityExtractor.ts:133](../../../../src/features/collaboration/entity-extraction/hooks/useEntityExtractor.ts#L133),
lines 133–149. The current meter instead tests its truthiness at
[UsageMeter.tsx:114](../../../../src/features/collaboration/entity-extraction/components/UsageMeter.tsx#L114).

**Trigger:** the ordinary server status contains a configured `customLimit: 0`
and the default `daily.limit: 10`. Zero is supported by the server's nullish
override semantics and is not rejected by the usage contract. This review
does not investigate who may configure it or modify an actual entitlement.

**Expected:** the meter and the scanning gate describe the same daily
allowance. **Actual:** status can correctly block scanning while the meter
reports `0 of 10`; its progressbar likewise advertises a maximum of 10. The
reader sees apparently unused capacity with no usable Scan button.

**Evidence:** the third `usage-feedback.test.js` case renders the actual
provider, panel and meter with that status. It observes the disabled button,
`0 of 10` text and `aria-valuemax="10"`. Server zero-limit behavior is
source-traced, not a live configuration experiment.

**Fix direction:** use the same nullish override rule for display and
remaining-capacity calculations, preferably a small shared client selector.
Do not reinterpret a real zero as an absent override. The related
`hasCustomLimit: !!customLimit` helper at `UsageContext.tsx:158` should use the
same presence convention, although no separate live consumer defect is counted.

**Verification:** compare absent, zero and positive overrides against the
server's documented selection rule; render the meter and gate together and
assert matching values. No policy or authorization change is required.

## Executed diagnostics and controls

Preserved diagnostic sources:
[response-probe.cjs](evidence/probes/ai/response-probe.cjs),
[usage-feedback.test.js](evidence/probes/ai/usage-feedback.test.js),
[conversion-handoff.test.js](evidence/probes/ai/conversion-handoff.test.js), and
[jest.config.cjs](evidence/probes/ai/jest.config.cjs).

Original commands, run from `/workspace/DnDCampaignCompanion`:

```sh
/tmp/code-review-runtime/node_modules/.bin/node /tmp/pass3-ai/response-probe.cjs
/tmp/code-review-runtime/node_modules/.bin/node node_modules/jest/bin/jest.js --config=/tmp/pass3-ai/jest.config.cjs --runInBand /tmp/pass3-ai/usage-feedback.test.js
/tmp/code-review-runtime/node_modules/.bin/node node_modules/jest/bin/jest.js --config=/tmp/pass3-ai/jest.config.cjs --runInBand /tmp/pass3-ai/conversion-handoff.test.js
```

The response diagnostic completed with `ALL AI RESPONSE PROBES COMPLETED`;
all **seven React checks passed** across the two focused suites. The Jest
configuration deliberately uses explicit source/framework paths without a
`moduleDirectories` override. These were temporary diagnostic files; no
existing tests or application files were edited.

| Synthetic response or handoff | Observed result |
|---|---|
| Valid flat NPC and valid empty `entities: []` | Handler succeeds; empty extraction remains a valid answer. |
| Missing choices, empty arguments, malformed JSON, truncated JSON with `finish_reason: "length"` | Generic `internal` failure; the attempted-request count has already increased. No unhandled parse success was claimed. |
| Explicit refusal | Detected before tool processing, then wrapped as generic `internal`; the refusal-specific explanation remains only in the logged original error. |
| JSON-complete arguments accompanied by `finish_reason: "length"` | Accepted. The probe demonstrates ignored metadata; it does not establish that any entity is missing. |
| Wrong `entities` container / numeric NPC text | Server returns success; actual service throws `.map is not a function` for the container and preserves numeric text for the latter. Both violate the transmitted strict schema. |
| NPC conversion | Nullable optional fields become normal defaults; stance and source sentence survive; a location name resolves to an existing ID. |
| Location conversion | `parentLocation: "Bree"` becomes the known location ID; type and source sentence survive. |
| Quest conversion | String objectives become stable objective objects; matching NPC/place names become IDs; an unmatched name is dropped as the documented resolver policy requires. Description fallback includes the source note title. |
| Rumor conversion | `sourceName` remains separate from `sourceType`; null status becomes `unconfirmed`; the created ID is marked on the source detection before navigation. |

The latter four controls reproduce fixed/current behavior, not new findings.
They verify write payloads and source-note marking through controlled IO,
without claiming live persistence or atomic failure recovery.

## Optional improvements and unverified concerns

- **Runtime response validation:** `JSON.parse` at server lines 722–728 and
  the cast/map at service lines 99–112 are the only general response checks.
  A bounded runtime validator would fail shape errors at the integration
  boundary instead of later in the UI. The wrong-type fixtures above show
  what happens if the supplier contract is broken; they are not counted as
  separately reachable production bugs under the current strict schema.
  Confidence is different because AI-002's fixtures satisfy that schema.
- **Completion metadata:** decide an explicit policy for nonterminal/
  interrupted completions and multiple tool calls; only the first tool call
  is inspected at server line 711. The existing invalid-JSON case fails
  already. No missing entity, partial-output persistence or deployed
  truncation rate was demonstrated by the JSON-complete `length` fixture.
- **Deadline and cancellation budget:** the application supplies no explicit
  OpenAI timeout/retry budget or abort signal at server lines 448–450 and
  679–692, and no callable timeout override at service line 91. Installed
  OpenAI 4.x defaults are 600,000 ms and two retries; the installed Firebase
  client default is 70,000 ms. Those mismatched defaults justify checking an
  intentional end-to-end deadline, but no delayed live transport/deployed
  timeout, duplicate billing or successful post-timeout completion was
  observed. This remains a reliability recommendation, not a counted outage.
- **Error semantics:** refusal, parse failure and ordinary upstream failure
  all emerge as `internal` with “Failed to extract entities.” A deliberate
  retryable/nonretryable error contract could guide recovery. Automatic
  retries or charging/refund changes need an explicit attempt policy; this
  review does not infer one from the current counter placement.
- **Unused alternatives:** architecture review confirms `useOpenAIExtractor`
  and the `EntityExtractor` compatibility wrapper have no active production
  callers. Their differences are maintenance context, not additional live
  workflow findings. The shared `extractDetailsByType` delegation remains
  present; fixed tracker #023 is not reopened.

## Reconciliation and ownership

Existing [FUNC-002](../pass-2/05-functional-workflows.md#func-002--a-failed-rescan-deletes-previous-detections-and-also-reports-that-no-new-names-were-found)
owns failure-as-`[]`, removal of old detections and false empty-success wording.
Existing [DATA-005](../03-data-integrity.md#data-005--conversion-and-promotion-persist-the-new-record-before-the-operation-can-fail)
owns target creation followed by failed source marking and duplicate creation
on retry. The source ordering is still present; no additional conversion
failure is counted here. SEC-001/SEC-003 are prior findings and their abuse,
rules and concurrent-enforcement scopes were not re-exercised.

Fixed/current safeguards retained in this review include save-before-scan
abort (#1051), stable extraction references (#350), bounded initial usage
loading (#650), mapper details delegation (#023), the forced named strict
tool schema, explicit refusal detection, quest objective normalization,
relationship name-to-ID resolution and rumor status/source whitelisting.
No new normal-conversion regression was found in the four executed controls.

Recommended order: repair allowance snapshot refresh/recovery, then align
confidence and zero-override display contracts. Keep the prior scan failure
and conversion-idempotency fixes in their existing workstreams. Production
model quality/frequency, remote transport timing, browser suspension and
deployed configuration parity remain outside these controlled checks.
