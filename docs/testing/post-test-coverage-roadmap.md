# Post-Test-Coverage Roadmap

*Last updated: 2026-07-26 — after the collaboration domain migration.*

This guide is the starting point for the next session. Point your orchestrator (Opus) at this file; it tells the orchestrator and the Sonnet workers it spawns what to do, in what order, and where to stop.

---

## Where we are now

**Restructuring: all four domains are migrated. The `shared/`/`core/` pass is next.**

| Domain | Status |
|---|---|
| user-management | ✅ merged (PR #13) |
| storytelling | ✅ merged (PR #14) |
| campaign-entities | ✅ merged (PR #15) |
| collaboration (notes + AI extraction) | ✅ done on `migration/collaboration` |
| `shared/` + `core/` infrastructure pass | ⬜ **next up** |
| post-migration bug triage (Phase 4) | ⬜ not started |

**Interleaved effort, complete:** attribution consolidation — `src/shared/attribution` is the single
place attribution values are built, and `DocumentService` is the single write path that applies them.
Read `docs/architecture/migration/attribution-consolidation-findings.md` before touching attribution;
its "RESOLVED" section records three predictions the original analysis got wrong, including two
categories of write that must **never** be routed through `createDocument`.

**Test baseline: 21 failed / 3 skipped / 3947 passed of 3971.** Coverage ~89% statements. The 21 are
catalogued bug markers — compare against this number before treating a red test as a regression.

That number was 22 before the collaboration migration. The one that went away was the phantom
`NoteContext` "malformed entity extraData" test — corrected, not fixed and not deleted; see below.
Total test count is unchanged at 3971, so nothing was lost in the move.

That number was **53** before this round. It did not fall because bugs were fixed; it fell because
**25 of those failures were never bugs.** Five tracker entries (#013, #014, #300, #021, #022) turned
out to be test-environment defects: a missing `crypto.randomUUID` in JSDOM, an unawaited initial
fetch, and stale closures from chaining dependent calls inside a single `act()`. In every case the
test aborted or read stale state before exercising the behaviour it named, and the resulting red was
filed as a production defect. Roughly **half the failing suite was measuring its own harness.**

**Bug tracker: 59 filed, 17 fixed, 39 open, 3 needing a decision.**

Behavioral testing methodology stays in force: **failing tests are bug markers; never modify a test to make it pass.** See `docs/testing/methodology/testing-lessons-learned.md`.

### Two lessons worth carrying into the next session

1. **A red test has not necessarily executed anything.** #013, #014 and #300 sat here for a year as
   deferred "architectural" bugs. They were a missing `crypto.randomUUID` in JSDOM — the tests
   aborted before reaching an assertion. Establish that a failing test actually ran the code it
   names before believing what it claims about that code.
2. **`tsc --noEmit` + jest green does not prove the app builds.** `react-scripts`' webpack ignores
   tsconfig `paths`, so `@/...` imports pass both and still fail the production build. Run
   `npm run build` before proposing any merge.

---

## Decision summary

| Question | Decision | Reason |
|---|---|---|
| Fix bugs before or after migration? | **Cheap one-liners before; architectural ones after.** | Failing tests during migration are noise — you can't tell migration regressions from pre-existing bugs. Files are also about to move, so easy fixes get harder later. |
| Migration approach | **Incremental, one domain at a time.** | Matches `docs/architecture/migration/hybrid-feature-first-restructuring-strategy.md`. Each phase ends with green tests; rollback stays local. |
| Migration order | **user-management → storytelling → campaign-entities → collaboration** | Smallest blast radius first. Collaboration (notes) has the most active bug surface — migrate last when it's stable. |
| Coverage gate | **Add CI floor at 85%** | Below today's 89.66% but high enough that migration can't silently rot tests. |
| Test baseline | **Tag `pre-migration-baseline` on main before any migration commits.** | Lets you diff coverage and pass-counts after each migration phase. |

---

## Execution order

### Phase 1 — Sibling-bug fix round (≈ half a day)

**Goal**: clear four bugs of the exact same one-line shape as already-fixed #800 / #900, removing known broken paths before restructuring.

**In scope**:
- **#1150** — NotePage same-campaign timing re-fetch loop
- **#1151** — NotePage fetch-error re-fetch loop
- **#1153** — FirebaseContext `groupsLoading` not reset on `loadGroups` error
- **#650** — UsageContext infinite refresh on null status (3 skipped tests)

**Out of scope** (defer): #1152, #1000, #1050, #1051, #1052 (all dead-code; restructuring will likely sweep them). #901, #702, #850, #851, #750, #700, #200, #201 (architectural, test-infra, or low value relative to migration).

**Halt-on-failure protocol** (mandatory — same as the round that produced ec8f3cb on main):
1. Agent reads the bug report and the associated skipped/failing tests.
2. Agent makes the production fix.
3. Agent un-skips the relevant tests (un-skip; never edit the assertions).
4. Agent runs the targeted test file. If it does not pass, agent reverts the prod change with `git checkout -- <file>` and reports back — does **not** modify the test.
5. On success, agent updates the bug report to FIXED and stages.

**Spawn pattern**: one agent per bug. Two in flight max — this is the one phase where parallel workers fit cleanly. Each agent gets one bug number, one file path, one test path. Branch from main as `fix/sibling-bugs-after-test-coverage`.

### Phase 2 — Pre-migration housekeeping (small)

Before any restructuring commits:

1. **Tag `pre-migration-baseline`** on `main` (after Phase 1 merges).
2. **Add CI coverage floor of 85%** — either in `jest.config` `coverageThreshold` or as a CI check.
3. **Re-run full coverage** and snapshot the result in `docs/testing/results/pre-migration-baseline.md` (test count, pass/fail/skip count, coverage per metric).

These three steps are one short PR. Single agent; no parallelism needed.

### Phase 3 — Restructuring (8–12 weeks, incremental, strictly sequential)

Follow `docs/architecture/migration/hybrid-feature-first-restructuring-strategy.md`. **Do not run two domains in parallel** — each phase needs the test suite green before the next begins. Recommended order:

1. ✅ **`user-management/`** — Auth, Groups, Profiles. Merged, tagged.
2. ✅ **`storytelling/`** — Chapters, Stories, Sagas. Merged.
3. ✅ **`campaign-entities/`** — NPCs, Quests, Locations, Rumors. Merged.
4. ✅ **`collaboration/`** — Notes, AI extraction. Done on `migration/collaboration`.

#### What the collaboration migration actually did

Split into two sub-features under `src/features/collaboration/`, each shaped like
`campaign-entities/rumors` (`{components,context,hooks}/` + a sub-feature `types.ts`):

| `notes/` | `entity-extraction/` |
|---|---|
| `context/NoteContext.tsx` | `context/UsageContext.tsx` |
| `types.ts` (was `types/note.ts`) | `types.ts` (was `types/usage.ts`) |
| `hooks/useNoteData.ts` | `hooks/{useEntityExtractor,useOpenAIExtractor}.ts` |
| `utils/note-relationships.ts` | `services/{EntityExtractionService,entityMapper}.ts` |
| `components/{NoteCard,NoteEditor,NotesList,NoteReferences}.tsx` | `components/{EntityCard,EntityExtractor,FloatingUsageIndicator}.tsx` |

The dependency direction is `entity-extraction → notes` (extraction needs `notes/types` plus
`PotentialReference`/`normalizeTextForComparison` from `NoteReferences`), and never the reverse.
That is why the two halves were migrated **sequentially, not in parallel** — the file sets are not
disjoint, so two concurrent workers would have fought over the same import rewrites.

`src/services/firebase/ai/` and `src/components/features/notes/` are gone. `src/context/` now holds
only `NavigationContext` and `SearchContext`; `src/types/` only `common`/`search`/`user`;
`src/hooks/` only `useFirebaseData`/`useNavigation`/`useSearch` — i.e. exactly the shared/core set.

**Three findings worth carrying forward:**

1. **A barrel can be a landmine.** `notes/utils/note-relationships` imports the `services/firebase`
   *index*, which calls `initializeFirebaseServices()` — and therefore `getAnalytics()` — at module
   scope. Re-exporting it from the domain barrel made every `import ... from 'features/collaboration'`
   eagerly initialize Firebase and crash in jsdom. It is deliberately **not** exported, with a
   comment saying so. This is the same failure that stops
   `src/test-utils/__tests__/enhanced-test-utils.test.tsx` from loading. **When building the
   `shared/`/`core/` barrels, check every re-export for a transitive path to that index** — and
   consider making the index lazy, which would remove the whole hazard class.
2. **A stale `jest.mock` path does not error — it silently stops mocking.** Moving a module means
   hunting every `jest.mock`/`require` that names it. Several had to be consolidated onto the single
   barrel specifier, because mocking one old path would have left sibling barrel exports real.
3. **`useSessionManager` was moved to `features/user-management/auth/hooks/`** as its own commit, as
   planned. Once inside the domain it must import `./useAuth` directly rather than the
   user-management barrel — importing your own barrel from inside a domain is a circular import.

The phantom `NoteContext` test was **corrected, not deleted**: `should handle malformed entity
extraData gracefully` expected `relatedNPCIds: null` to pass through, while `convertEntity` applies
`|| []`. It was first confirmed to genuinely execute (it does — `mockNavigate` fires once and the
`title`/`objectives` passthrough assertions hold), so the disagreement was real and one-assertion
wide. `[]` is the defensible spec for a list field handed to a create form, so the assertion now
expects `[]`. Both `NoteContext` suites are green. The `title`/`objectives` passthrough assertions
were left alone: they still pass and keep a real robustness gap visible, but it is **not** filed as a
bug, because nothing yet shows the extractor can emit extraData in that shape — filing unproven
defects is what produced the five tracker entries that turned out to be harness artifacts.

#### Known deviation from the stated dependency rules

`features/` → other `features/` is supposed to be forbidden. It is not satisfied, and was not before
this migration: there are 17 `campaign-entities → user-management` edges and 5
`storytelling → user-management`. This migration adds **4 more** — `LocationCreateForm`, `NPCForm`,
`QuestCreateForm` and `RumorForm` each call `useNotes().markEntityAsConverted`, so
`campaign-entities → collaboration`.

All of them go through the domain **barrel**; nothing reaches into another feature's internals, which
is the invariant that actually protects refactoring, and that one is fully satisfied. Decoupling
`markEntityAsConverted` would need a shared event/callback seam — a behaviour change, deliberately
out of scope for a structural move. **Decide during the `shared/`/`core/` pass** whether to introduce
that seam or to amend the rule in `CLAUDE.md` to "features may depend on another feature's barrel,
never its internals", which is what the codebase has actually been doing for three domains.

After collaboration, the `shared/`/`core/` pass takes what remains in the old layout:
`NavigationContext`, `SearchContext`, `components/features/layouts/`,
`components/features/contact/`, `useFirebaseData`, `useSearch`, `useNavigation`, and
`types/{common,search,user}.ts` — plus `components/shared/GlobalActionButton.tsx` and
`components/layout/Layout.tsx`, which both import `features/collaboration` and so are `shared → feature`
edges until they move.

**Per-phase exit criteria**:
- All tests pass except the documented bug-marker set.
- Coverage on the migrated domain stays ≥ pre-phase coverage.
- No new entries in the bug tracker introduced by the move itself.
- Tag `migration/<domain>-complete` on main when merged.

Within a single domain, sub-tasks (move file A, move file B, update imports) can sometimes parallelise across two workers — but only when they touch disjoint file sets. When in doubt, sequential.

### Phase 4 — Post-migration bug triage

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
- **Halt-on-failure for any bug-fix work**: see Phase 1 protocol above. This is non-negotiable — it's what keeps the behavioral methodology honest.
- **Sonnet 4.6 is fine for the worker role** in all of Phases 1–3. Opus stays in the orchestrator seat.

---

## Reference

- Bug tracker: `docs/testing/bug-tracking/README.md`
- Methodology: `docs/testing/methodology/testing-lessons-learned.md`
- Migration plan: `docs/architecture/migration/hybrid-feature-first-restructuring-strategy.md`
- Per-file jest invocation: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="<pattern>"`
- Full-suite coverage: `npx jest --coverage --testTimeout=15000 --maxWorkers=2`
