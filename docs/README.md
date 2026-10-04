# Documentation

Supporting documents. What is left to do lives in [`../TODO.md`](../TODO.md), not here; bugs the
behavioural suites find live in [`testing/bug-tracking/README.md`](testing/bug-tracking/README.md).

## Layout

```
docs/
├── architecture/migration/  # The attribution consolidation, the field-alignment plan, long-term feature ideas
├── design/                  # The design language, the colour schema, and each design phase's plan and handoffs
├── images/                  # Screenshots the root README shows
├── performance/             # The 2026-08-30 performance review, its evidence and first findings
├── reviews/                 # Repository review plans, specialist reports, and consolidated outcomes
├── superpowers/             # Plans and design specs for features built since 2026-09
└── testing/                 # Testing lessons, the Phase 4 triage, and the bug tracker
```

## Conventions

The first repository review is recorded in
[`reviews/2026-10-03/pass-1-summary.md`](reviews/2026-10-03/pass-1-summary.md); its
[record index](reviews/2026-10-03/README.md) links the reports and evidence.
The [second-pass summary](reviews/2026-10-03/pass-2/summary.md) adds functional,
React state, performance and test-quality findings, with its own verification
record and evidence in a separate stacked PR.
The [third-pass summary](reviews/2026-10-03/pass-3/summary.md) adds duplication,
architecture, accessibility, AI integration and operations findings, with focused
diagnostics and bounded refactoring recommendations in another stacked PR.
The [fourth-pass summary](reviews/2026-10-04/pass-4/summary.md) adds full-App
browser workflow, recovery and legacy-data evidence, with five new findings.
The earlier review stack is merged; the fourth pass targets main separately.
The [fifth-pass summary](reviews/2026-10-04/pass-5/summary.md) adds four findings
and final bounded write-failure, scale, keyboard, listener and restore evidence,
in a PR stacked on the fourth pass.

- Most of these are records of a decision or a phase, cited by name from code comments. Status
  banners reflect the state when written and may be stale; the code is the source of truth.
- A document nothing cites any more is deleted rather than archived; git history keeps it.
