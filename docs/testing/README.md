# Testing Documentation

Entry point for testing-related documentation. For known bugs, see [`bug-tracking/README.md`](bug-tracking/README.md).

## Layout

```
testing/
├── methodology/   # How we test: strategy, lessons learned, behavioral approach
├── results/       # Outcome reports from completed testing phases
├── summaries/     # Per-context testing summaries
└── bug-tracking/  # Bug catalogue (legend + table) and individual bug reports
```

## Where to start

- **Writing new tests** → [`methodology/testing-lessons-learned.md`](methodology/testing-lessons-learned.md)
- **Pre-restructuring testing strategy** → [`methodology/testing-before-restructuring-guide.md`](methodology/testing-before-restructuring-guide.md)
- **Test design patterns** → [`methodology/test-design-strategy.md`](methodology/test-design-strategy.md)
- **Known bugs** → [`bug-tracking/README.md`](bug-tracking/README.md)

## Subdirectories

### `methodology/`
- **`testing-lessons-learned.md`** — Behavioral testing methodology, patterns, anti-patterns, session-by-session lessons.
- **`testing-before-restructuring-guide.md`** — Strategy for building test coverage before architectural restructuring.
- **`test-design-strategy.md`** — Test design patterns and approaches.

### `results/`
Outcome reports for specific testing phases (e.g. Quest behavioral testing). Frozen at time of writing — treat as historical records, not status.

### `summaries/`
Per-context testing summaries (e.g. NoteContext). Frozen at time of writing.

### `bug-tracking/`
Bug catalogue with status legend, categories, and a table of every filed bug. Also contains per-context behavioral testing summaries (NPC, Quest, Location, Rumor, Story) and a cross-context patterns analysis. See its own README for the full table.

## Running tests

```bash
# Run a single test file (use this — much faster than running the whole suite)
npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="ComponentName\.test"

# Full suite with coverage
npx jest --coverage --testTimeout=15000 --maxWorkers=2
```

Tests live alongside the code they cover, in `__tests__/` subdirectories. Behavioral context tests are at `src/context/__tests__/behavioral/`.

## Conventions

- **Behavioral / specification-based testing**: tests define expected behavior; failing tests are bug markers, not problems to silence. Never modify a test just to make it pass — fix the code, file a bug, or document the skip.
- **Bug discovery**: when a test reveals a real production bug, file it under `bug-tracking/` and reference the bug number in any skipped test.
- **Mock only external dependencies**: contexts, react-router, Firebase SDK, theme providers. The unit under test stays real.
