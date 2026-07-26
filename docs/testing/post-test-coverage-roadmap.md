# Post-Test-Coverage Roadmap

*Last updated: 2026-07-27 — after collaboration merged to `main` and the shared/core pass was audited.*

This guide is the starting point for the next session. Point your orchestrator (Opus) at this file; it tells the orchestrator and the Sonnet workers it spawns what to do, in what order, and where to stop.

**Next session starts at [Phase 3e](#phase-3e--the-sharedcore-infrastructure-pass--start-here).** It
carries a measured audit of the remaining work and six findings that should shape the plan — read
those before writing one, because the previous one-line description of that phase understated it
badly.

---

## Where we are now

**Restructuring: all four domains are merged and tagged. The `shared/`/`core/` pass is next.**

| Domain | Status |
|---|---|
| user-management | ✅ merged (PR #13), tagged |
| storytelling | ✅ merged (PR #14), tagged |
| campaign-entities | ✅ merged (PR #15), tagged |
| collaboration (notes + AI extraction) | ✅ merged (PR #17), tagged `411d9c8` |
| attribution consolidation (interleaved) | ✅ merged (PR #16) |
| `shared/` + `core/` infrastructure pass | ⬜ **next up — see Phase 3e** |
| post-migration bug triage (Phase 4) | ⬜ not started |

**95 of 233 source files still need to move (41%).** Of the 233: 103 are in `features/`, 2 in
`shared/`, 30 in `pages/` (already a valid target directory — these never needed migrating), and 3 are
`src/` root files (`App.tsx`, `index.tsx`, `setupTests.ts`). All four *domains* are done; none of the
infrastructure pass is. Even 41% flatters the position — the domains were self-contained moves with a
behavioural suite as a net, whereas what is left is the plumbing every test transitively loads,
including two dependency inversions and 25 files of cross-domain view code with no agreed home.

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

**Per-phase exit criteria**:
- All tests pass except the documented bug-marker set.
- Coverage on the migrated domain stays ≥ pre-phase coverage.
- No new entries in the bug tracker introduced by the move itself.
- Tag `migration/<domain>-complete` on main when merged.

Within a single domain, sub-tasks (move file A, move file B, update imports) can sometimes parallelise across two workers — but only when they touch disjoint file sets. When in doubt, sequential.

**All four domains are merged and tagged.** `migration/collaboration-complete` → `411d9c8`
(PR #17), which sits on top of the attribution consolidation (PR #16, `47c5e9d`).

---

### Phase 3e — the `shared/`/`core/` infrastructure pass ⬅ **START HERE**

*Audited against the tree on `main` at `411d9c8`, 2026-07-27. Numbers below are measured, not
estimated.*

**Do not start from the old one-line summary of this phase** — it listed `layouts/` next to
`contact/` as if they were comparable, and understated the work by an order of magnitude.

**Scale:** 95 files, enumerated in the destination table at the end of this section. The domains were
the safe half — self-contained moves, each with a working behavioural suite as a net. This phase
touches the plumbing every test transitively loads, so a mistake here is not contained to one domain.

**Directory reality vs the target:**

| Target | Actual |
|---|---|
| `features/` | ✅ four domains, all with barrels |
| `shared/` | ⚠️ exists, holds only `attribution` (2 files) |
| `core/` | ❌ does not exist |
| `pages/` | ✅ exists |
| `app/` | ❌ does not exist — `App.tsx` sits at `src/` root |

#### The six findings that should shape the plan

**1. `components/features/layouts/` is 25 files of cross-domain view code, and its destination is
undecided.** It has its own `common/{components,hooks,utils}` plus dashboard and journal layouts with
sections, and it consumes `features/campaign-entities` **20×**, `features/storytelling` **5×**,
`features/user-management` **1×**. Sections like `CharacterGallery`, `LocationsMap`,
`ActiveQuestsList` and `StorySection` aggregate several domains, so **no single feature can own
them** and they cannot go in `core/` (which must have no internal dependencies). Realistic options:
a `shared/layouts/` that is permitted to depend on feature barrels, or a fifth feature-like
"dashboard/journal" domain, or push them down into `pages/`. **Decide this before moving any
file** — it determines whether `shared/` is allowed to depend on `features/`, which is a change to
the dependency rules either way. This is the largest single chunk left and the only genuinely
architectural question in the phase.

**2. `core/` → `features/` dependency inversion, 5 instances — this blocks creating `core/` at all.**
`src/services/firebase/index.ts` imports `AuthService`, `UserService`, `GroupService` and
`InvitationService` from `features/user-management`, and `services/firebase/campaign/CampaignService.ts`
imports `UserService`. The target rule is `core/` → *no internal dependencies*. Those services live
in `user-management` because that domain migrated first and took them along. Either the service
registry stops importing them directly (register from the feature side instead), or the services move
down into `core/`. **Same file, same fix as finding 3.**

**3. `services/firebase/index.ts` calls `initializeFirebaseServices()` at module scope**, and
therefore `getAnalytics()`, on any import. Consequences already observed:
`src/test-utils/__tests__/enhanced-test-utils.test.tsx` has **never been able to load** (it is the
9th failing suite and executes zero tests), and re-exporting anything with a transitive path to this
index poisons a whole domain barrel — which is why `collaboration`'s barrel deliberately omits
`notes/utils/note-relationships`. **Making this init lazy is the highest-leverage single change in
the phase**: it removes a whole hazard class, unblocks a permanently-dead test suite, and is the same
edit as finding 2.

**4. The `user-management` barrel is incomplete, and 14 imports bypass it into internals.** Export
counts tell the story — `campaign-entities` 32, `collaboration` 17, `storytelling` 11,
**`user-management` 8** (hooks plus `FirebaseProvider`; zero components, zero services). So
`App.tsx` (×4), `components/layout/Header.tsx` (×4) and `components/shared/ContextSwitcher.tsx` (×1)
reach in for components the barrel never exposed, and the 5 service imports from finding 2 do the
same. It was the first domain migrated, before the pattern settled. **This is a barrel-completeness
fix, not a find-and-replace** — the exports have to be added before the call sites can be corrected.
One of the 14 is gratuitous: `App.tsx` imports `FirebaseProvider` by internal path although the
barrel does export it.

**5. `dateFormatter` exists twice** — `src/utils/dateFormatter.ts` (117 lines) and
`components/features/layouts/common/utils/dateFormatter.ts` (49 lines). Different content, same job.
Reconcile during the move rather than relocating both.

**6. `src/utils/__dev__/` is 14 sample-data generator files that the target architecture has no home
for.** It is tooling, not application code (`dndSampleDataGenerator`, per-entity generators,
`sessionTester`). Decide explicitly: leave it, or lift it out of `src/` so it stops counting as
application surface. Note `scripts/manage-dev-data.ps1` depends on it.

Also still true and already documented above: **26 `features/` → `features/` barrel edges**, and
`components/shared/GlobalActionButton.tsx` + `components/layout/Layout.tsx` import
`features/collaboration`, so they are `shared → feature` edges until they move.

#### Suggested order

Findings 2, 3 and 4 are one tangle in two files — do them first, as a single preparatory slice, since
`core/` cannot exist until they are resolved and finding 3 makes everything after it easier to test.
Then take finding 1's architectural decision. Only then start moving files, cheapest first:
`themes/` (7) and `components/core/` (5) → `core/`; `types/{common,search,user}` (3),
`context/{Navigation,Search}` (2), `hooks/{useFirebaseData,useNavigation,useSearch}` (3) → `shared/`;
then `components/{shared,layout}` (12); then `layouts/` (25) last, per the decision from finding 1.

#### What remains, by destination

| Current location | Files | Destination |
|---|---|---|
| `components/features/layouts/` | 25 | **undecided — finding 1** |
| `utils/__dev__/` | 14 | **undecided — finding 6** |
| `services/` (firebase core, DocumentService, SearchService, openai) | 9 | `core/` |
| `components/shared/` | 7 | `shared/` |
| `themes/` | 7 | `core/` |
| `utils/` (attribution, date, export, navigation, password, search, user) | 7 | `shared/` |
| `components/core/` | 5 | `core/` |
| `components/layout/` | 5 | `shared/` or `app/` |
| `test-utils/` | 5 | test infrastructure |
| `types/{common,search,user}.ts` | 3 | `shared/` |
| `hooks/{useFirebaseData,useNavigation,useSearch}` | 3 | `shared/` |
| `context/{Navigation,Search}Context.tsx` | 2 | `shared/` |
| `config/`, `constants/` | 2 | `core/` |
| `components/features/contact/` | 1 | `shared/` or `pages/` |
| **total** | **95** | |

Separately, `src/App.tsx` belongs in `app/`, which does not exist yet; `index.tsx` and
`setupTests.ts` stay at the root. `src/pages/` (30 files) is already a valid target directory and is
not part of this phase, beyond fixing any imports that break as things move beneath it.

### Phase 4 — Post-migration bug triage

All four domains have landed, so this is now unblocked. Walk the open tracker: **59 filed, 17 fixed,
39 open, 3 needing a decision.** Many will look different (or be moot) under the new structure —
re-file, close as obsolete, or fix, whichever fits. Two specific items already queued:

- **#1202 needs a production data pass** (not a code fix): chapters reordered before the attribution
  branch hold a Firestore `Timestamp` in `dateModified` where a string is expected, and render a
  blank modified date.
- **#1201 and #1204** are unfixed by design — each needs its failing test written first.

Before believing any red test, confirm it reached an assertion. Five tracker entries (#013, #014,
#300, #021, #022) were filed as production defects and were harness problems.

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
