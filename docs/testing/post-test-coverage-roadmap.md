# Post-Test-Coverage Roadmap

*Last updated: 2026-05-25 — end of the unit-test-coverage push.*

This guide picks up where `feature/unit-test-coverage` lands. It tells the next orchestrator (and the agents it spawns) what to do, in what order, and where to stop.

---

## Where we are now

- Branch `feature/unit-test-coverage` has shipped **1,016 new tests across 47 files**, lifting coverage from **71.26% → 89.66% statements** (lines 90.37%, branches 81.18%, functions 85.98%).
- **18 bugs filed** during this push; **4 fixed** (#350, #701, #800, #900).
- **53 failing tests** in the suite are intentional bug markers (`*.bugs.test.tsx`) plus a small set of pre-existing infra issues (`Card.test.tsx`, `entityMapper.test.ts`, `enhanced-test-utils.test.tsx`). None of these are regressions from this branch.
- Three sibling bugs surfaced after the #800 / #900 fixes — same shape, not yet fixed:
  - **#1150**, **#1151** — additional NotePage re-fetch loops the #800 fix missed
  - **#1153** — `groupsLoading` not reset on error (sibling to #900)
- One older bug (**#650**, UsageContext infinite refresh on null status) has the same one-line shape and is good company for the round above.

Behavioral testing methodology stays in force: **failing tests are bug markers; never modify a test to make it pass.** See `docs/testing/methodology/testing-lessons-learned.md`.

---

## Decision summary

| Question | Decision | Reason |
|---|---|---|
| Fix bugs before or after migration? | **Cheap one-liners before; architectural ones after.** | Failing tests during migration are noise — you can't tell migration regressions from pre-existing bugs. Files are also about to move, so easy fixes get harder later. |
| Migration approach | **Incremental, one domain at a time.** | Matches `docs/architecture/migration/hybrid-feature-first-restructuring-strategy.md`. Each phase ends with green tests; rollback stays local. |
| Migration order | **user-management → storytelling → campaign-entities → collaboration** | Smallest blast radius first. Collaboration (notes) has the most active bug surface — migrate last when it's stable. |
| Coverage gate | **Add CI floor at 85%** | Below today's 89.66% but high enough that migration can't silently rot tests. |
| Test baseline | **Tag `pre-migration-baseline` on main after this PR merges.** | Lets you diff coverage and pass-counts after each migration phase. |
| This PR | **Land as-is** | Pure test additions + 4 small bug fixes. No structural risk. |

---

## Execution order

### Phase 1 — Land this branch (now)

PR `feature/unit-test-coverage → main`. No further work on this branch.

### Phase 2 — Sibling-bug fix round (≈ half a day)

**Goal**: clear four bugs of the exact same one-line shape as already-fixed #800 / #900, removing known broken paths before restructuring.

**In scope**:
- **#1150** — NotePage same-campaign timing re-fetch loop
- **#1151** — NotePage fetch-error re-fetch loop
- **#1153** — FirebaseContext `groupsLoading` not reset on `loadGroups` error
- **#650** — UsageContext infinite refresh on null status (3 skipped tests)

**Out of scope** (defer): #1152, #1000, #1050, #1051, #1052 (all dead-code; restructuring will likely sweep them). #901, #702, #850, #851, #750, #700, #200, #201 (architectural, test-infra, or low value relative to migration).

**Halt-on-failure protocol** (mandatory — same as the round that produced ec8f3cb):
1. Agent reads the bug report and the associated skipped/failing tests.
2. Agent makes the production fix.
3. Agent un-skips the relevant tests (un-skip; never edit the assertions).
4. Agent runs the targeted test file. If it does not pass, agent reverts the prod change with `git checkout -- <file>` and reports back — does **not** modify the test.
5. On success, agent updates the bug report to FIXED and stages.

**Spawn pattern**: one agent per bug. Two in flight max. Each agent gets one bug number, one file path, one test path. Branch from main as `fix/sibling-bugs-after-test-coverage`.

### Phase 3 — Pre-migration housekeeping (small)

Before any restructuring commits:

1. **Tag `pre-migration-baseline`** on `main` (after Phase 2 merges).
2. **Add CI coverage floor of 85%** — either in `jest.config` `coverageThreshold` or as a CI check.
3. **Re-run full coverage** and snapshot the result in `docs/testing/results/pre-migration-baseline.md` (test count, pass/fail/skip count, coverage per metric).

These three steps are one short PR.

### Phase 4 — Restructuring (8–12 weeks, incremental)

Follow `docs/architecture/migration/hybrid-feature-first-restructuring-strategy.md`. Recommended order:

1. **`user-management/`** — Auth, Groups, Profiles. Most self-contained; the cleanest starter domain. Branch: `migration/user-management`.
2. **`storytelling/`** — Chapters, Stories, Timeline. Already well-tested; few cross-feature ties.
3. **`campaign-entities/`** — NPCs, Quests, Locations, Rumors. Biggest, but well-tested and structurally similar across the four sub-features.
4. **`collaboration/`** — Notes, AI extraction. Migrate last; this is where the active bug churn lives and we want it stable first.

**Per-phase exit criteria**:
- All tests pass except the documented bug-marker set.
- Coverage on the migrated domain stays ≥ pre-phase coverage.
- No new entries in the bug tracker introduced by the move itself.
- Tag `migration/<domain>-complete` on main when merged.

### Phase 5 — Post-migration bug triage

After all four domains have landed, walk the open bug tracker. Many bugs will look different (or be moot) under the new structure. Re-file, close as obsolete, or fix — whichever fits.

---

## Salvage from `feature/form-context-separation`

An abandoned refactoring branch (last commit 2025-06-07, ~11 months old) attempted a form/context separation with a new `SystemMetadata` type, `Entity<T>` / `DomainData<T>` pattern, and a centralized `SystemMetadataService`. It was never finished — left with 213 TS errors, introduced data-loading bugs in the next commit, never compiled cleanly, and conflicts with the behavioral tests on main. **Do not merge or cherry-pick the contexts/forms/hooks portions** — they would fight the test suite we just landed.

But three small pieces are worth pulling into the upcoming feature-first migration:

| What | Source path on the archived branch | Why it's worth salvaging | Where to land it |
|---|---|---|---|
| `SystemMetadataService` class (~70 lines) | `src/utils/system-metadata.ts` | Centralizes attribution generation — directly addresses the highest-priority systematic user-attribution bug (#008/#011/#015/#020). Self-contained, no dependencies on the abandoned context rewrites. | `features/campaign-entities/services/` (or `shared/services/` if cross-domain) when the migration creates those directories |
| `SystemMetadata` interface + `Entity<T> = BaseEntity & SystemMetadata & T` + `DomainData<T>` types | `src/types/common.ts` (top half — the new section, **not** the legacy-field compatibility shims) | Sound type pattern that matches the form/context boundary the migration will enforce | New feature-first `types/` modules. **Drop the `@deprecated dateAdded/dateModified/lastUpdated/updatedAt` shims** — the migration should rename properly, not maintain dual fields. |
| Database-alignment design doc | `docs/backlog/DatabaseAlignmentForFormContextSeparation.md` | Pre-written field-rename plan (`dateAdded → createdAt`, etc.) that the migration will need eventually | Copy into `docs/architecture/migration/` as a sub-plan; treat as a starting outline, not a final spec |

**What to ignore** (do not salvage): the rewritten `NPCContext` / `QuestContext` / `StoryContext`, the stripped forms (`NPCForm`, `ChapterForm`), the hook deletions (`useNPCData`, etc.), the hybrid/legacy API compatibility shims, and `chapterGenerator.ts.backup` (committed by accident).

**Recommended preservation steps** (run before deleting the branch on origin):

```bash
# Tag the archived branch so its history is preserved
git tag archive/form-context-separation origin/feature/form-context-separation
git push origin archive/form-context-separation

# Then the remote branch is safe to delete (only run when ready):
# git push origin --delete feature/form-context-separation
```

The actual salvage work should happen **during the migration** — specifically when the new feature directory that needs `SystemMetadataService` is being created. Don't pull these files into the current structure first; they belong in the new structure.

---

## How to orchestrate (notes for the next Opus session)

Carrying forward the rules that worked during the test-coverage push:

- **Max 2 agents in flight at a time.** No exceptions.
- **Reasonable task size per agent**: one file or one bug, not a whole domain.
- **Always ask before spawning the next batch.** Don't auto-chain rounds.
- **Forbid Skill invocations in agent prompts**: include "Do NOT invoke any Skill tool" in every prompt.
- **Staging only**: agents stage via `git add` and let the parent commit. Agents never commit or push.
- **Per-file jest runs are fast**: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="…"` — use this for verification before staging.
- **Halt-on-failure for any bug-fix work**: see Phase 2 protocol above. This is non-negotiable — it's what keeps the behavioral methodology honest.
- **Sonnet 4.6 is fine for the worker role** in all of Phases 2–4. Opus stays in the orchestrator seat.

---

## Reference

- Bug tracker: `docs/testing/bug-tracking/README.md`
- Methodology: `docs/testing/methodology/testing-lessons-learned.md`
- Migration plan: `docs/architecture/migration/hybrid-feature-first-restructuring-strategy.md`
- Per-file jest invocation: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="<pattern>"`
- Full-suite coverage: `npx jest --coverage --testTimeout=15000 --maxWorkers=2`
