# Third-pass review plan

Status: authorized by the maintainer; all five reviews completed, with focused
central verification and preserved evidence. Date: 2026-10-03.

Reviewed commit and stack base: `0ba261205f2a55082a0560f1c68861a463fb8f89`,
the head of [PR #197](https://github.com/Haugenau20/DnDCampaignCompanion/pull/197).
Application source, tests, configuration and dependencies remain identical to
the first-pass source baseline `64fe195`. This pass uses branch
`docs/code-review-pass-3-2026-10-03`; its separate PR will target
`docs/code-review-pass-2-2026-10-03` and contain only third-pass records/indexes.

## Assignments

| Specialist | Model/reasoning | Scope | Report |
|---|---|---|---|
| Duplication and maintainability | GPT-6 Astra, xhigh | Duplicate code/logic, repeated domain invariants, parallel schema/normalization/validation implementations, obsolete alternatives, divergent fixes, shared abstraction candidates. Quantify duplication and show reachable drift where present; distinguish harmless repetition from justified consolidation. | `09-duplication.md` |
| Architecture and dependencies | GPT-6 Astra, xhigh | Actual dependency graph/public barrels, ownership, runtime cycles/init side effects, service/context seams, schema/type boundaries and unused shipping alternatives. Honor recorded migration exceptions; tie defects to concrete consequences and prioritize bounded changes. | `10-architecture.md` |
| Accessibility and interaction | GPT-6.1 Sol, xhigh | Keyboard/focus/dialog/combobox/palette flows, accessible names/semantics, errors/live regions, contrast, responsive/mobile/touch controls. Verify actual UI behavior where possible; classify already-tracked device concerns correctly. | `11-accessibility.md` |
| AI and external integration reliability | GPT-6 Astra, xhigh | Ordinary extraction response contracts/schema validation, truncation/parsing, entity normalization/provenance, retry/timeout/cancellation, failure/usage reporting and conversion handoffs. Synthetic model/service responses only; no paid calls or renewed access-control/account review. | `12-ai-integration.md` |
| Operations and delivery | GPT-6.1 Sol, xhigh | Current CI/Hosting/Functions build/deploy, environment/config parity, host PowerShell development and emulator/data tooling, recovery/observability and reproducibility. Docker secondary; inspect it only as relevant to a current path. No deployments or real mail. | `13-operations.md` |

Each specialist reads `AGENTS.md`, `TODO.md`, relevant current specifications,
the live tracker and both prior summaries. Existing fixes and approved design
exceptions are not refiled. Specialists can read the whole repository but write
only their report. No finding quota. Cross-reference overlaps; the coordinator
deduplicates root causes and separates maintenance opportunities from defects.

## Execution and evidence

1. Confirm parent PR/head and clean source baseline, create child branch and
   pin it for all five reviewers.
2. Launch reviewers concurrently. Prepare focused diagnostics under dedicated
   `/tmp/pass3-*` directories. The coordinator runs shared tests/browser/emulators
   centrally; specialists must not start competing full suites or servers.
3. Verify concrete findings, especially serious ones. Distinguish source-only,
   actual-source with test doubles, emulator, and browser evidence. Browser
   geometry/keyboard checks must use synthetic UI/data without production access.
4. Reuse the first-pass full green baseline if production/test/config trees stay
   byte-identical; run new targeted probes for newly reviewed behavior.
5. Save reports, executed probes and outputs plus `verification.md` and
   `summary.md`. Use IDs `DUP-`, `ARCH-`, `A11Y-`, `AI-` and `OPS-` and the
   [review reporting standard](../README.md). Recommendations need exact source
   paths/lines, requirements, triggers, impact, evidence and fix validation.
6. Check links, diagnostic syntax, tracked evidence, whitespace, source scope
   and stack ancestry; commit, push, create and attach the separate stacked PR.

This is a review: do not modify production source, existing tests, rules,
dependencies, backlog, CI/deployment settings or other application behavior.
No production data, paid model requests, real messages or deployments. Existing
auth/account-lifecycle review remains stopped by maintainer instruction; do not
resume or replace it. Stop any newly interrupted reviewer and report its limit.

Duplication owns repeated implementation and its drift; architecture owns
dependency/ownership defects; accessibility owns interaction barriers; AI owns
external response/failure contracts; operations owns running/delivering the app.
Previously reported product, state, security, concurrency, test and performance
issues are cross-references, not additional production findings.
