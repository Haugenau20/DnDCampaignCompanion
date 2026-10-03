# Second-pass verification

Reviewed stack base: `8c03720020c7772b0bb8b256c4569c8b50c1e495`, the head of
[PR #196](https://github.com/Haugenau20/DnDCampaignCompanion/pull/196).
Application source, existing tests, rules, configuration and dependencies are
unchanged from the first-pass source baseline `64fe195`. This pass adds review
documents and diagnostic evidence only.

## Baseline reused

The [first-pass baseline](../baseline.md) records successful TypeScript,
production lint, the test-lint baseline gate, production and Functions builds,
307 frontend suites (5,783 tests passed; two skipped), and 12 Functions/emulator
suites (216 tests passed). The test-lint gate still allows its recorded 1,005
existing problems; its success does not mean zero test lint problems.

The coordinator verified the application/configuration tree has no diff from
the pinned parent. These full checks are reused, not represented as new runs.
Second-pass diagnostics exercise the new findings and protection failures.

## Focused checks

All probes use synthetic inputs. React probes run actual production components
or hooks with collaborators replaced by test doubles. Their passing assertions
describe observed defects for diagnosis; they are not permanent acceptance tests
and should be inverted or replaced when implementing fixes. No production
account/data, external AI call, real email or deployment was used.

| Check | Observed result | Boundary |
|---|---|---|
| Functional diagnostics | Six suites, seven checks passed | Note display, optional field clearing, palette query handoff, failed scan, create/edit chapter save failure and chapter delete failure; jsdom with synthetic collaborator callbacks |
| Quest objective test control | Existing suite: 10 passed | Unchanged production source and existing tests |
| In-memory field-only patch sensitivity | Existing suite: four failed, six passed | Transformer changes only the outgoing objective payload, without editing source; failures require unrelated status/date fields in the payload |
| Actual pure-function Node benchmark | Completed on Node 22.23.3 | Deterministic operation counts plus bounded synthetic CPU timings; sweep IO fully mocked |
| Chromium pure-function benchmark | Completed on Chromium 151.0.7922.173 | Blank page running actual transpiled functions; no app layout, rendering, CPU throttling, network or production route timing |
| React state/lifecycle diagnostics | One suite, five checks passed | Actual NPC page/provider and write hook, NoteEditor, ChapterReader; IO and viewport geometry mocked |
| Search lifecycle diagnostics | One suite, three checks passed | Actual SearchProvider/SearchService/useSearch; six collection inputs mocked |
| Listener/save-count diagnostics | Two suites, five checks passed | Actual demand providers and quick-add hook; NoteEditor with counted persistence callbacks; includes two preserved passing route budgets |

Final report totals and severity grouping live in [summary.md](summary.md).

## Interpretation

Location measurements count full-list index work for each matching row and
ancestor path; they do not include React rendering. Saga measurements paginate
single large paragraphs with actual production code. Node location timings
retain ID getter counters and are instrumented despite the original output's
header; use the browser's plain-field measurements for that CPU comparison.
Browser timings confirm
synchronous CPU cost in this environment, not a production latency guarantee.
The mocked sweep measures selected document counts and outstanding delete
promises; it does not prove a deployed timeout, memory failure or SDK connection
limit. Note persistence mocks observe calls and state transitions; backend
storage outcomes are source-traced rather than newly emulator-verified.

The intentional test sensitivity run returning exit 1 is evidence, not a failed
repository baseline. Diagnostic harness setup failures (Jest nested dependency
resolution and unstable mock identities) were corrected before final recorded
runs; they were not attributed to application defects.

## Evidence and replay

Preserved executed sources are under [evidence/probes](evidence/probes), with
successful or intentionally failing run outputs under
[evidence/outputs](evidence/outputs). The [evidence guide](evidence/README.md)
documents commands, setup and test-double boundaries. Outputs contain only
synthetic records. These probes are outside the repository's normal test match.

## Review limits

Final document checks passed: local link targets, Markdown heading anchors,
source-line links, syntax for all 17 diagnostic files, staged whitespace, and
the staged 36-file documentation/evidence scope. No changed path is outside
`docs/`; application/configuration/dependency trees match the parent baseline.

This pass covers ordinary workflows, non-auth React behavior, performance and
test protection. Authentication/account lifecycle remains stopped as requested.
It does not resume the earlier security review. Browser checks execute pure
functions, not the complete signed-in application; there is no new end-to-end
browser or load-test claim. Architecture/duplication, accessibility, external-AI
integration reliability and operations remain later review angles.
