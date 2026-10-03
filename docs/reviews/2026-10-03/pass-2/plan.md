# Second-pass review plan

Status: authorized by the maintainer; four specialist reviews and focused
verification completed. See [summary.md](summary.md) for outcomes and remaining
coverage limits.

Review commit and stack base: `8c03720020c7772b0bb8b256c4569c8b50c1e495`.
Application source is identical to the first-pass source baseline `64fe195`;
the intervening commit adds review records only. First-pass PR:
[#196](https://github.com/Haugenau20/DnDCampaignCompanion/pull/196), branch
`docs/code-review-pass-1-2026-10-03`. This pass runs on child branch
`docs/code-review-pass-2-2026-10-03`; its separate PR targets that parent branch,
so its diff contains only second-pass additions/index changes.

## Purpose and assignments

Review the next four agreed angles. Source observations need reachable user
scenarios, concrete consequences, and current file/line evidence. Historical
reports and coverage percentages are leads, not proof. First-pass confirmed
findings are cross-referenced and not counted again as new issues.

| Reviewer | Model/reasoning | Scope | Output |
|---|---|---|---|
| Functional workflows | `gpt-6.1-sol`, `xhigh` | Ordinary entity authoring, quick-add, private note editing/extraction/conversion, search/navigation, chapters/reader/progress, empty states and failed-operation recovery. Trace UI to hook/service and return-state behavior. | `05-functional-workflows.md` |
| React state and async behavior | `gpt-6.1-sol`, `xhigh` | Non-auth contexts/hooks, listener ownership/cleanup, stale responses after navigation/scope change, optimistic state, edit/unmount scheduling, loading/error transitions, provider/closure correctness and selections. | `06-react-state.md` |
| Performance, scalability and cost | `gpt-6-astra`, `xhigh` | Route read/listener budgets, provider invalidations/render work, note autosave/write counts, search/list complexity, chapter pagination, lazy chunks/prefetch, repeated service reads, bounded large synthetic datasets, Functions maintenance cost. | `07-performance.md` |
| Test quality and coverage gaps | `gpt-6-astra`, `xhigh` | Assertions against requirements, actual execution vs mocks, integration seams, timing/failure/race coverage, skipped/defective-behavior assertions, browser-vs-jsdom limits, CI/resolver/coverage truthfulness. Produce concrete test gaps and protection failures, not a coverage wishlist. | `08-test-quality.md` |

Each specialist can read the entire repository but writes only its assigned
Markdown report. Functional owns the product failure; React owns the stale
state/lifecycle cause; performance owns measured redundant work; testing owns
why a gate fails to protect the specified behavior. The coordinator deduplicates
these observations and retains distinct user consequences.

The first-pass authentication/account-lifecycle agent remains stopped at the
maintainer's instruction. This is not a resumed or replacement auth/security
review. Existing auth findings can be referenced as evidence of test gaps, but
credentials, invitations, account deletion, and access-control investigation
are not expanded in this pass. Docker remains secondary. Architecture,
duplication, accessibility, external-AI integration reliability and operations
remain later review angles.

## Execution and evidence

1. Confirm the parent PR head, clean checkout, branch ancestry and unchanged
   application/config/dependency trees. Pin the commit for the whole pass.
2. Launch four specialists concurrently. Each reads repository instructions,
   current specs/tracker entries, and first-pass records before classifying
   findings. No finding quota; zero confirmed issues is acceptable.
3. Reuse the recorded green full baseline because the application and gates are
   byte-identical. Run new focused probes where the second pass presents new
   behavior or uncertainty. The coordinator runs shared tests/emulators/browser
   checks; agents prepare lightweight probes outside the repository and send
   exact commands plus boundary assumptions. Avoid competing full suites.
4. Verify serious findings independently, distinguish known/first-pass issues
   from new ones, and record mocked/source-only/emulator/browser evidence
   separately. Measure performance before calling it a bottleneck, and separate
   deterministic operation counts from environment-dependent timings.
5. Write `summary.md`, `verification.md`, and durable evidence. Reports use the
   finding format in [../README.md](../README.md), with IDs `FUNC-`, `REACT-`,
   `PERF2-`, and `TEST-`. Optional improvements and unverified concerns stay
   separate from confirmed findings.
6. Validate links, document/diagnostic syntax, staged scope and ancestry, then
   commit/push the second-pass branch and create/attach its separate stacked PR.
   Do not edit or merge PR #196.

This is an assessment. Do not modify production source, existing tests, rules,
dependencies, backlog or deployments. Temporary verification uses synthetic
data and local test doubles or disposable demo emulators; no real messages,
paid AI requests or production mutations. Browser checks, when available,
must use an emulator-configured local build and synthetic account/data.

If a reviewer encounters a policy interruption, stop that reviewer and report
the limitation rather than restarting the previously stopped auth agent.
