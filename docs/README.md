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
├── superpowers/             # Plans and design specs for features built since 2026-09
└── testing/                 # Testing lessons, the Phase 4 triage, and the bug tracker
```

## Conventions

- Most of these are records of a decision or a phase, cited by name from code comments. Status
  banners reflect the state when written and may be stale; the code is the source of truth.
- A document nothing cites any more is deleted rather than archived; git history keeps it.
