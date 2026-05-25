# Pre-Migration Test Baseline

*Captured on 2026-05-25 at commit `6f86704`, tag `pre-migration-baseline`.*

This snapshot defines the test/coverage state that the feature-first migration must not regress. Each migration phase ends with a comparison against this baseline; any drop in coverage or rise in failing tests must be explained or fixed before the phase merges.

## Test counts

| Metric | Count |
|---|---|
| Test Suites — passed | 169 |
| Test Suites — failed | 10 |
| Test Suites — total | 179 |
| Tests — passed | 3876 |
| Tests — failed | 53 |
| Tests — skipped | 3 |
| Tests — total | 3932 |

The 53 failing tests are documented bug markers in `*.bugs.test.tsx` files and a small set of pre-existing infrastructure issues (`Card.test.tsx`, `entityMapper.test.ts`, `enhanced-test-utils.test.tsx`). See `docs/testing/bug-tracking/README.md` for the canonical list. None are regressions.

The 10 failing suites are:
- `src/context/__tests__/behavioral/NPCContext.bugs.test.tsx`
- `src/context/__tests__/behavioral/NoteContext.behavioral.test.tsx`
- `src/components/core/__tests__/Card.test.tsx`
- `src/context/__tests__/behavioral/StoryContext.bugs.test.tsx`
- `src/context/__tests__/behavioral/RumorContext.bugs.test.tsx`
- `src/context/__tests__/behavioral/LocationContext.bugs.test.tsx`
- `src/context/__tests__/behavioral/NoteContext.bugs.test.tsx`
- `src/context/__tests__/behavioral/QuestContext.bugs.test.tsx`
- `src/services/firebase/ai/__tests__/entityMapper.test.ts`
- `src/test-utils/__tests__/enhanced-test-utils.test.tsx`

## Coverage (jest --coverage, `collectCoverageFrom` per `jest.config.ts`)

| Metric | % | Threshold |
|---|---|---|
| Statements | 89.66% | 85% |
| Branches | 81.18% | 81% |
| Functions | 85.98% | 85% |
| Lines | 90.37% | 85% |

CI gate set in `jest.config.ts` at 85% for statements/functions/lines and 81% for branches (was a blanket 80% pre-baseline). Branches sits just above its own floor; the other three metrics sit comfortably above 85%. The branches threshold is intentionally below the roadmap's originally proposed 85% — measured branch coverage at baseline is 81.18%, so a 85% gate would fail CI immediately. The 81% floor instead pins the metric at its current value; raise it as branch coverage improves during migration.

## How to compare against this baseline after a migration phase

```
npx jest --coverage --testTimeout=15000 --maxWorkers=2
```

A migration phase should not:
- Drop any of the four coverage percentages below the baseline above.
- Introduce additional failing tests beyond the documented bug markers.
- Skip more tests than baseline (currently `3`).

## Reference

- Roadmap: `docs/testing/post-test-coverage-roadmap.md`
- Methodology: `docs/testing/methodology/testing-lessons-learned.md`
- Bug tracker: `docs/testing/bug-tracking/README.md`
- Migration plan: `docs/architecture/migration/hybrid-feature-first-restructuring-strategy.md`
