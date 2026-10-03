# Testing Documentation

Entry point for testing-related documentation. For known bugs, see [`bug-tracking/README.md`](bug-tracking/README.md).
What is left to do lives in [`../../TODO.md`](../../TODO.md).

## Layout

```
testing/
├── methodology/                # Behavioural testing: lessons learned, patterns, anti-patterns
├── phase4-triage-findings.md   # Phase 4's walk of the bug tracker (narrative)
├── phase4-audit-worksheet.md   # The same, per bug, with quoted code
└── bug-tracking/               # Bug catalogue (legend + table) and individual bug reports
```

## Where to start

- **Writing new tests** → [`methodology/testing-lessons-learned.md`](methodology/testing-lessons-learned.md)
- **Known bugs** → [`bug-tracking/README.md`](bug-tracking/README.md)

## Subdirectories

### `methodology/`
- **`testing-lessons-learned.md`** — Behavioral testing methodology, patterns, anti-patterns, session-by-session lessons.

### `bug-tracking/`
Bug catalogue with status legend, categories, and a table of every filed bug. Also contains per-context behavioral testing summaries (NPC, Quest, Location, Rumor, Story) and a cross-context patterns analysis. See its own README for the full table.

## Running tests

```bash
# Run a single test file (use this — much faster than running the whole suite)
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="ComponentName\.test"

# Full suite with coverage
npx jest --coverage --testTimeout=15000 --maxWorkers=2
```

Tests live alongside the code they cover, in `__tests__/` subdirectories.

## Conventions

- **Behavioral / specification-based testing**: tests define expected behavior; failing tests are bug markers, not problems to silence. Never modify a test just to make it pass — fix the code, file a bug, or document the skip.
- **Bug discovery**: when a test reveals a real production bug, file it under `bug-tracking/` and reference the bug number in any skipped test.
- **Mock only external dependencies**: contexts, react-router, Firebase SDK, theme providers. The unit under test stays real.
