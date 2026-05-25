# Documentation

Entry point for project documentation. Each subdirectory has its own README where one applies.

## Layout

```
docs/
├── architecture/   # Codebase structure: current state, migration plans, analysis
├── project/        # Product specs: requirements, design, technical guides
└── testing/        # Testing methodology, results, summaries, bug tracking
```

## Where to start

- **Testing work** → [`testing/README.md`](testing/README.md)
- **Known bugs** → [`testing/bug-tracking/README.md`](testing/bug-tracking/README.md)
- **Architecture migration plan** → [`architecture/migration/hybrid-feature-first-restructuring-strategy.md`](architecture/migration/hybrid-feature-first-restructuring-strategy.md)
- **Product requirements** → [`project/requirements/`](project/requirements/)

## Subdirectories

### `architecture/`
- **`migration/`** — Restructuring strategy, analysis, integration roadmap, form context standard.
- **`current/`** — Documentation of the current architecture (placeholder).
- **`analysis/`** — Architecture research notes (placeholder).

### `project/`
- **`requirements/`** — User stories and functional specs (chapter management, rumor management, user management, database structure, sample data).
- **`design/`** — UI design (page layouts).
- **`technical/`** — Implementation guides (e.g. authentication flow).

### `testing/`
- **`methodology/`** — Testing strategy, lessons learned, behavioral testing approach.
- **`results/`** — Outcome reports from completed testing phases.
- **`summaries/`** — Per-context testing summaries.
- **`bug-tracking/`** — Bug catalogue and individual bug reports.

## Conventions

- Each document is dated where authorship time matters. Status banners in individual files reflect the state when written — they may be stale; treat the file content as the source of truth.
- Progress and "what's done" lives in git history and the bug-tracking table, not in this README.
