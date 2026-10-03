# Architecture and dependencies review

Reviewed: 2026-10-03. Stack baseline:
`0ba261205f2a55082a0560f1c68861a463fb8f89` (PR #197); application source remains
`64fe19512b1d3bd14427fad8996403a742fbe8a9`. Assignment: GPT-6 Astra / xhigh,
as recorded in [the third-pass plan](plan.md).

**One new confirmed product defect:** optional theme persistence can prevent
root rendering or prevent a selected theme from reaching the document. It is
medium severity, with high confidence from actual-source React diagnostics.
The import census found no module cycles or `core` dependency inversion.
Two bounded maintenance opportunities are separated below and are not counted
as product defects.

## Scope and method

Read `AGENTS.md`, the relevant backlog and live tracker entries, both prior
review summaries, the attribution migration findings and the explicitly
historical database-alignment outline. This review applies the current rule:
feature-to-other-feature and shared-to-feature dependencies through public
barrels are allowed. It does not apply the contradictory old planned rule
lower in `AGENTS.md`.

The dependency census parses imports, re-exports and literal dynamic imports
with the installed TypeScript compiler, resolves them using each package's
actual `tsconfig`, and computes strongly connected components. A second graph
uses TypeScript's emitted ES-module imports after type erasure. It excludes
test infrastructure, declarations, existing tests and development utility
bodies. The frontend entry's development-only import of `sessionTester` remains
an edge to an excluded leaf; its implementation is not reviewed. Dependencies
inside `node_modules`, computed module paths and CSS import graphs are outside
this census. Source search found no production CommonJS `require` calls or
nonliteral dynamic imports requiring an additional resolver.

Inspected ownership and integration seams include the four feature barrels,
`app/App.tsx`, `index.tsx`, Firebase's lazy service bundle, `BaseFirebaseService`,
`ServiceRegistry`, `DocumentService`, the shared collection/write/demand hooks,
entity and note domain types, theme initialization, the retained Markdown split,
and the unused implementation candidates below. Firebase Functions receive an
import-graph census only in this report; external-response behavior and delivery
are covered by the other third-pass specialists.

The stopped authentication/account-lifecycle scope remains stopped. Its files
participate in the structural import census, but no credential, invitation,
account-deletion or access-control behavior was examined or exercised. No
production data, deployment, paid model call or real message was used. No
application source, existing tests, dependencies, rules or configuration changed.

## Measured dependency graph

| Measurement | Frontend | Functions |
|---|---:|---:|
| Implementation TS/TSX modules scanned | 351 | 30 |
| Resolved internal source dependency declarations | 1,351 | 54 |
| Dependency declarations remaining after type erasure | 1,141 | 54 |
| Literal dynamic-import declarations | 30 | 0 |
| Source strongly connected components containing a cycle | 0 | 0 |
| Runtime cycles, including dynamic imports | 0 | 0 |
| Unresolved internal import specifiers | 0 | 0 |

Counts are dependency declarations, not unique module pairs or bundled bytes.
The frontend's 30 dynamic declarations comprise 28 route declarations, the
Markdown renderer and the development-only utility import. A barrel makes a
module reachable in this conservative graph even when webpack removes its
unused export; graph reachability is not proof of shipment or execution.

Current policy observations:

- **Zero `core` imports outside `core`.** The remaining infrastructure-to-service
  type imports do not reintroduce a feature dependency.
- **Zero imports of a feature's own top-level barrel from inside that feature.**
  No version of the earlier `index -> component -> index` cycle was found.
- **16 cross-feature dependency declarations**, all through the destination
  barrel. **42 shared-to-feature declarations**, also all through barrels;
  **34** survive type erasure. These allowed edges are not findings. The old
  migration's count of 26 is not the current count.
- `App.tsx:55-79` has **seven direct dynamic route imports** from
  user-management. `App.tsx:28-32` explains their purpose: preserving separate
  chunks from the already-imported provider barrel. The existing production
  build was independently examined in [pass 2](../pass-2/07-performance.md),
  which confirms the route split. Moving them blindly into the eager barrel
  would contradict that implementation decision.
- Three story-page files contain **four direct source imports** of storytelling
  utilities: three runtime imports and one type-only import. They are the
  bounded public-API maintenance issue ARCH-M02, not a demonstrated runtime
  failure.

The actual file graph is acyclic even though an area-level diagram would show
features and shared code pointing to one another. An area-level cycle is not
evidence of a JavaScript initialization cycle.

## Confirmed finding

### ARCH-001 — Optional theme storage is a prerequisite for root rendering and DOM theme updates

**Severity:** medium. **Confidence:** high. **Classification:** new confirmed
platform-boundary defect; two manifestations of the same persistence ownership
error. Not a regression attributed to this documentation-only review.

**Exact source:**

- `src/core/themes/ThemeContext.tsx:82-91`: every provider render calls
  `localStorage.getItem` outside a guard, before selecting the default theme.
- `src/core/themes/ThemeContext.tsx:40-67`: `localStorage.setItem` precedes
  `data-theme`, `colorScheme` and CSS-token application inside one `try` block.
- `src/core/themes/ThemeContext.tsx:101-113`: changing the selected theme updates
  React context even if that combined persistence/application effect fails.
- `src/index.tsx:73-90` and `src/app/App.tsx:83-86`: `ThemeProvider` is above
  `App`, while the application error boundary is inside `App`.
- `src/shared/components/ErrorBoundary.tsx:17-45`: the boundary handles errors
  from descendants; it cannot catch its parent provider's render failure.

**Trigger and actual behavior:** On a visit or provider rerender where browser
storage access throws `SecurityError`, the read throws before any children
render. The default theme does not help because the failing expression precedes
the fallback. The inner application error boundary cannot display its recovery
screen. On an otherwise healthy mounted page where a preference write throws
`QuotaExceededError`, selecting dark updates the provider's context to dark,
but the storage exception skips every subsequent DOM update. The page retains
its previous light `data-theme`, color scheme and token values.

**Expected behavior and impact:** Reading and applying the theme should remain
usable when saving a preference is unavailable. A denied preference read
currently prevents the application's root content from rendering; a failed
write makes the theme control's selected state disagree with the visible page.
Severity is medium because the trigger is a browser storage failure, not an
ordinary successful-storage visit. No claim is made about its production
frequency or a particular private-browsing mode.

**Evidence:** The coordinator ran the
[actual-source diagnostic](evidence/probes/architecture/theme-storage.test.cjs)
with the real `ThemeProvider` and real `ErrorBoundary`. All three diagnostic
assertions passed, recording the current defect:

1. Normal storage: switching dark changes both context and the document.
2. Injected `Storage.prototype.getItem` denial: render throws `SecurityError`;
   neither the child nor the inner boundary fallback appears.
3. Injected `Storage.prototype.setItem` quota failure after a successful light
   mount: context becomes dark, while `data-theme`, `colorScheme` and the entire
   CSS-token style string remain light/unchanged.

See [the output](evidence/outputs/architecture/theme-storage.txt): **3/3 tests
passed**, 3.733 seconds. These are characterization assertions demonstrating
the failure, not tests asserting that the defect is acceptable. The diagnostics
use jsdom and injected browser-API exceptions; they do not run the complete
Firebase application or reproduce an actual browser preference configuration.
The root composition consequence is source-traced from the same provider and
boundary ordering.

Existing `src/core/themes/__tests__/ThemeContext.test.tsx:175-205` exercises a
failed write but checks only logging and whether the provider throws. It never
checks the visible document theme in that case. This is a protection gap within
ARCH-001, not another product issue.

**Bounded fix:** Read the saved value through a guarded lazy state initializer
and fall back to the default on storage failure. Apply the selected theme to
the document independently of best-effort persistence, so a failed `setItem`
cannot skip token application. A root boundary outside optional providers can
improve recovery for unrelated faults, but is not a substitute for this local
fix.

**Fix validation:** Require the real provider to mount its child with the
default theme when either the storage getter or `getItem` throws. Start on
light, fail `setItem`, select dark, and assert both the context and DOM tokens
become dark. Retain healthy persistence and retired-theme migration tests.
Do not limit validation to “an error was logged.”

**Tracker reconciliation:** [#1000](../../../testing/bug-tracking/1000-settheme-catch-dead-branch.md)
removed a dead catch around the React state setter. That fix remains correct.
It explicitly left the separate storage catch intact, but never established
that persistence failure could not interrupt DOM updates. ARCH-001 concerns
the storage read and effect ordering, not restoring the removed setter catch.

## Ownership and schema conclusions without another finding count

The most consequential context/service defects already have evidence and IDs:

| Existing issue | Architectural seam and bounded direction |
|---|---|
| DATA-002 / IMG-001 | `BaseFirebaseService.ts:38-40,130-153` holds mutable global scope; `DocumentService` can resolve writes after awaits. Capture operation identity/path once. Renaming folders or adding an interface alone cannot repair this. |
| DATA-003 / IMG-002 | Context write contracts accept whole records and arrays. Use intent-sized patches and an explicit conflict protocol where needed; do not refile this as “contexts are too large.” |
| REACT-002 | Shared read and operation errors feed page gates that remove the editor. Separate operation state from the collection-load contract. |
| DATA-008 | Cross-kind attachment IDs need entity-kind identity at the relationship boundary. A wider string alias alone will not change comparison behavior. |
| FUNC-001 | A separately fetched cross-campaign note never reaches the real read-only editor. This is the existing data-handoff finding, not a new component-ownership defect. |
| PERF2-003 | Quick-add's shared creation hook requests unnecessary lists. Existing listener demand ownership works on ordinary nonreading routes; refine this caller instead of replacing every provider. |

See [first-pass summary](../pass-1-summary.md) and
[second-pass summary](../pass-2/summary.md) for those findings and probes.

The current generic read API still asserts incoming data as `T`
(`DocumentService.ts:281-313,322-344,365-380`), while feature read hooks perform
selected legacy normalization. This is not runtime schema validation. No new
malformed-production-document failure is claimed solely from a cast. The
external AI response boundary is owned by the AI specialist. Any future
validation should sit at the ingress that owns the relevant persisted/domain
contract and preserve supported legacy records, rather than adding competing
schemas in every page.

`DomainData<T>` in `core/types/common.ts:46-60` separates caller domain fields
from attribution. `useFirebaseData.ts:252,276` routes ordinary creation/update
through attribution-aware service methods. The historical attribution audit's
proposed universal switch to `createDocument` must not be revived: batch moves,
existing-record changes and nested rumor notes have distinct semantics, and
the corrected migration document explains why. The saved database-alignment
outline explicitly says its `createdAt`/`modifiedAt` migration never shipped;
current `dateAdded`/`dateModified` names are not an incomplete refactor finding.
The free-text location fallback remains an intentional compatibility boundary
under T079. Quest key-location name references remain existing tracker #1421.

## Optional maintenance, excluded from confirmed product defects

### ARCH-M01 — Retire verified unused implementations and obsolete compatibility exports

**Priority/severity:** low maintenance. **Confidence:** high for current
repository reachability. **Classification:** optional cleanup, not a new
production defect or a bundle-size finding. **Trigger:** future work choosing
among leftover APIs; no current user workflow calls the listed alternatives.

| Source and relevant lines | Evidence and bounded action |
|---|---|
| `src/features/collaboration/entity-extraction/components/EntityExtractor.tsx:7-55` | A compatibility wrapper kept for `NotePage`; that page now imports `CampaignLinksPanel` at `NotePage.tsx:10`. Only its barrel export and tests remain. Retire the wrapper/export after reconfirming callers. |
| `src/features/collaboration/entity-extraction/hooks/useOpenAIExtractor.ts:10-49` | Public barrel export at `collaboration/index.ts:36`, but no production caller. The active panel uses `useEntityExtractor` at `CampaignLinksPanel.tsx:10,94`. Remove the unused competing hook rather than repairing its dormant behavior as a live extraction bug. |
| `src/features/collaboration/notes/utils/note-relationships.ts:35-137` | All three functions have zero production callers and the file has no importer. Its `relatedNotes` protocol is not the active attachment implementation. Retire with stale README claims; do not wire it into the product merely to give it a caller. |
| `src/shared/components/attach-tray/useAttachTray.ts:10-50` | `useAttachSet` has no production caller. Its comment says it adapted forms that `15-8` retired. |
| `src/core/components/Chip.tsx:56-145` | Both exported chip implementations have zero production callers; similarly named local presentation components are different implementations, not imports of this module. |
| `src/pages/layouts/common/components/LoadingState.tsx:17-58` | No current importer; current pages use gates/local loading presentation. Its dormant `card` variant is not a live rendering failure. |
| `src/pages/layouts/common/utils/layoutUtils.ts:6-10` | `calculateCompletionPercentage` has no current caller. |
| `src/core/config/buildConfig.ts:2-11`; `src/core/services/index.ts:2` | No current importers; the unused config and forwarding barrel do not govern the running app. |

This is **nine implementation modules**. Type-only modules erased from the
runtime graph were not classified as unused merely because they emit no code.
The graph alone misses the two unused barrel exports, so they were checked at
their symbols and actual consumers as well. None of the nine modules appears
in any of the retained production build's **21 JavaScript source maps**. This
corroborates that they are source-maintenance leftovers; it does not establish
any bytes to save from the current bundle.

The [census script](evidence/probes/architecture/dead-code-census.cjs) preserves
symbol-reference lines, including comments and exports for manual
classification; [its output](evidence/outputs/architecture/dead-code-census.json)
records source-map absence. The source-map result describes the coordinator's
retained unchanged-source build, not an independently rebuilt artifact.

**Impact:** obsolete alternatives make future maintenance and API selection
less clear, but no present runtime failure was demonstrated. **Validation if
removed:** repeat the symbol/import census, remove only tests for genuinely
retired APIs, then run type checking, appropriate existing suites and a
production build. Preserve the active panel, extraction hook, attachment
behavior and current loading surfaces. No removal was made in this review.

### ARCH-M02 — Expose story utility contracts through the existing public barrel

**Priority/severity:** low maintenance. **Confidence:** high. **Classification:**
current documented-boundary drift, not a confirmed product defect.

`src/pages/story/ChaptersPage.tsx:4-8`,
`src/pages/story/StoryPage.tsx:5-6`, and
`src/pages/story/components/ResumeBar.tsx:5` depend on internal chapter utility
paths. The last import is type-only. **Trigger/impact:** reorganizing the
chapter implementation now requires changing page imports too; there is no
observed runtime failure or cycle. The barrel currently does not export these
contracts (`src/features/storytelling/index.ts:1-16`).

**Bounded fix:** expose the already-shared chapter progress/byline helpers and
`StorySummary` from the storytelling barrel, and change these three consumers.
Keep internal storytelling imports direct. Do not alter the documented dynamic
route split or prohibit the currently allowed shared/feature barrel edges.
**Validation:** recalculate cycles and boundary edges, then run type checking,
lint and a production build to preserve route behavior and splitting. A
boundary check should encode the documented route exception rather than
reporting every deep import as a defect.

## Initialization checks, false leads and limits

- The Firebase service barrel is still lazy:
  `core/services/firebase/index.ts:25-82,93-123` defers SDK construction until
  service access. `index.tsx:44-66` explicitly initializes the service bundle.
  The earlier missing-startup initialization in #1300 is fixed and was not
  refiled. The barrel's configuration dependency logs in development
  (`firebaseConfig.ts:34-44`), so “no eager Firebase construction” is more exact
  than an absolute claim of no import side effects.
- `collaboration/index.ts:25-31` still describes eager Firebase initialization
  and failing enhanced tests as current. That comment is stale. It is not
  evidence that importing the current barrel initializes Firebase or crashes.
- The base constructor registers `app` before constructing/registering the
  remaining SDK instances (`BaseFirebaseService.ts:57-115`). A synchronous SDK
  construction failure could leave a partially initialized registry, but this
  review established no ordinary production trigger. It is an unverified
  resilience concern, not another finding. In particular, the installed
  analytics factory **warns**, rather than synchronously throwing, for disabled
  cookies; unsupported-cookie initialization was rejected as a claimed repro.
- Broad feature barrels do not prove all route code ships in the entry.
  Type erasure, unused-export removal and the dynamic Markdown boundary
  (`core/components/Markdown.tsx:5-19`) matter. Reuse pass 2's measured bundle
  findings rather than treating graph counts as download sizes.
- `BookViewer` remains used by `SagaPage`, while chapter reading uses
  `ChapterReader`; the two are intentional distinct presentations.
  `BookshelfView` and `ChapterList` both remain used by `ChaptersPage`.
  LocationCard's absence agrees with closed tracker #1420.
- No production schema census, actual blocked-storage browser configuration,
  complete SDK-initialization failure matrix, third-party package cycle audit,
  native-device test, or resumed authentication/account-lifecycle review was
  performed. No hidden dependencies were inferred from file names or
  column-anchored export searches.

## Reproduction record

The coordinator runs shared tests; these diagnostics live outside the checkout
while executing. Preservation paths are relative to this report.

| Check | Command from repository root | Result |
|---|---|---|
| Frontend graph | `/tmp/code-review-runtime/node_modules/.bin/node /tmp/pass3-architecture/graph.cjs` | 351 modules; no source/runtime cycles |
| Functions graph | `/tmp/code-review-runtime/node_modules/.bin/node /tmp/pass3-architecture/graph.cjs functions` | 30 modules; no source/runtime cycles |
| Theme storage seam | `/tmp/code-review-runtime/node_modules/.bin/node node_modules/jest/bin/jest.js --config /tmp/pass3-architecture/jest.config.cjs --runInBand` | 3/3 characterization assertions passed |
| Unused candidates | `/tmp/code-review-runtime/node_modules/.bin/node /tmp/pass3-architecture/dead-code-census.cjs` | Nine candidates; zero entries across 21 build source maps |

Preserved [graph source](evidence/probes/architecture/graph.cjs),
[frontend output](evidence/outputs/architecture/graph-summary.json),
[Functions output](evidence/outputs/architecture/functions-graph-summary.json)
and [Jest config](evidence/probes/architecture/jest.config.cjs) document the
measurement boundaries. The full baseline gates were already green on unchanged
application source; this report does not present that baseline as coverage of
the newly injected storage failures.
