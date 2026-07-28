# Post-Test-Coverage Roadmap

*Last updated: 2026-07-27 — Phase 3e is complete. Six commits on `migration/shared-core`
(`69d19c2`, `7c9811e`, `3705d27`, `5db0ed7`, `c187f05`, `0d9696d`) moved every remaining file into
`shared/`/`core/`, closed the dependency violations a post-move audit found, and left the tree
matching the target architecture end to end.*

This guide is the starting point for the next session. Point your orchestrator (Opus) at this file; it tells the orchestrator and the Sonnet workers it spawns what to do, in what order, and where to stop.

**Phase 4's first pass is complete** (2026-07-27, on `triage/phase4-bug-triage`) — see
[Phase 4](#phase-4--post-migration-bug-triage--first-pass-complete) for what landed, what is confirmed
still live, and the suggested next order. The test baseline is now **7 failed / 3971 passed across 180
suites**, and every one of those 7 is a deliberately deferred ID-collision marker. Detail lives in
`docs/testing/phase4-triage-findings.md` and `docs/testing/phase4-audit-worksheet.md`.

**A second pass ran 2026-07-28** on `fix/phase4-batch1` — 8 bugs fixed (one partially), 5 closed
without a code change, #024 retired as never-a-bug, and `cross-context-patterns.md` Pattern 1
struck. Baseline moves to **7 failed / 3 skipped / 3977 passed / 3987 total across 180 suites**;
the 7 are still the deferred ID-collision markers, and are now the *only* red in the suite. See
[Phase 4, second pass](#phase-4-second-pass--2026-07-28), below.

Phase 3e's findings, corrections and audit result are kept below for reference — read them before
touching `shared/`/`core/` again, since two of the lessons recurred across nearly every slice of that
phase and are likely to recur again. There is no file-moving work left in this codebase; capacity
should go to bug triage.

---

## Where we are now

**Restructuring: complete.** All four feature domains and the `shared/`/`core/` infrastructure pass
are merged onto `migration/shared-core`, tagged, and ready to land on `main`.

| Domain | Status |
|---|---|
| user-management | ✅ merged (PR #13), tagged |
| storytelling | ✅ merged (PR #14), tagged |
| campaign-entities | ✅ merged (PR #15), tagged |
| collaboration (notes + AI extraction) | ✅ merged (PR #17), tagged `411d9c8` |
| attribution consolidation (interleaved) | ✅ merged (PR #16) |
| `shared/` + `core/` infrastructure pass | ✅ **complete** on `migration/shared-core` — six commits, `69d19c2` → `0d9696d` |
| post-migration bug triage (Phase 4) | ⬜ **not started — next** |

**The final tree**: `src/` holds `app/`, `core/`, `features/`, `pages/`, `shared/`, plus
`test-utils/`, `utils/__dev__/`, `styles/`, `index.tsx`, `setupTests.ts`. `src/components/`,
`src/types/`, `src/context/`, `src/hooks/` and `src/services/` no longer exist — every file that used
to live in them moved into one of the five target directories.

`core/` — infrastructure with no internal dependencies — holds `components/` (UI primitives),
`services/`, `types/`, `attribution/`, `utils/`, `themes/`, `config/`, `constants/`. `shared/` holds
cross-domain code that doesn't belong to any one feature: `components/`, `context/`, `hooks/`,
`utils/`. `app/` holds `App.tsx` and the layout shell (`Layout`, `Header`, `Footer`, `Navigation`,
`Breadcrumb`'s siblings). `pages/` holds the route components plus the aggregating dashboard/journal
layouts that used to sit under `components/features/layouts/`.

### The dependency audit — the phase's acceptance result

Completing the moves did not, by itself, imply the dependency rules held. A script audited every
import in `src/` against them, classifying runtime vs. type-only, and found **three violations the
moves alone had not fixed — one of which the restructuring itself had created:**

- **`core/` → `shared/`, 6 runtime imports, created by this phase.** Types landed in `shared/` while
  services landed in `core/`, so the Firebase/search services imported `shared/types/*` and
  `DocumentService` imported `shared/attribution`. Fixed in `0d9696d` by moving the dependencies
  *down* rather than rewriting the services — `shared/types/` → `core/types/`,
  `shared/attribution/` → `core/attribution/`, plus `shared/utils/user-utils.ts` → `core/utils/`,
  which was not in the original plan (see corrections, below).
- **`pages/` → `app/`, 10 runtime imports, all of `app/layout/Breadcrumb`.** Fixed in `0d9696d` by
  relocating `Breadcrumb.tsx` to `shared/components/` instead — it's a reusable navigation component,
  not application shell, so moving it (rather than its ~20 `pages/` callers) closed the edge.
- **`shared/` → `features/`, 15 imports (12 runtime, 3 type-only) across 4 files** —
  `shared/components/{AttributionInfo,ContextSwitcher,GlobalActionButton}.tsx` and
  `shared/context/SearchContext.tsx`, every one going through the target domain's barrel. **Left in
  place, resolved by amending the dependency rule in `CLAUDE.md` rather than moving code**: these four
  are genuinely cross-cutting (a search context indexing several domains at once, an attribution line
  many entity cards render, a global action button, a group/campaign switcher) — no single feature can
  own them, and relocating them would create `features/` → `app/`, a worse inversion than the one
  being removed. Avoiding the dependency altogether would need a DI/event seam, which is a behaviour
  change and out of scope for a structural pass.

Audit after the fixes: **`core/` → `shared/` gone. `pages/` → `app/` gone. Cross-domain
feature-internals imports: ZERO** — every cross-feature edge goes through a barrel, which is the
invariant the dependency rules exist to protect, and it holds completely.

### Corrections to record honestly

1. **Finding 5 was wrong twice — record both.** The original audit called the two `dateFormatter`
   files "different content, same job"; a mid-phase correction called them "disjoint — a split, not a
   duplicate." Both were wrong. `shared/utils/dateFormatter.ts` already contained all five functions;
   the layouts copy had three, all overlapping by name, differing only in that the shared version
   normalizes input through `convertFirestoreTimestamp` first — a strict superset, for every `Date`
   input. The layouts copy and its test file were deleted in `c187f05`, and its 30 tests merged into
   the shared suite.
2. **Root cause of both wrong readings, worth stating as a general lesson**: this codebase indents
   file bodies, so `grep "^export"` reports one export in a file that has five. Never infer a
   module's exports, or its size relative to another file, from a column-anchored grep — open the
   file and read it.
3. **A third copy of `getRelativeTime`/`formatJournalDate` still exists**, in
   `src/pages/layouts/common/utils/layoutUtils.ts` — its own test comment acknowledges the overlap.
   Not fixed in this phase; carried forward into Phase 4, below.
4. **The `user-utils.ts` trap, generalized.** Moving `shared/attribution` down to `core/` alone would
   have silently recreated the `core/` → `shared/` edge, because `attribution.ts` imports
   `getUserName`/`getActiveCharacterName` from `user-utils.ts`, which was still in `shared/`. A scan
   for references *to* a file being moved never sees that file's *own* dependencies — this gap
   recurred on nearly every slice of Phase 3e, not only this one. Check what the file being moved
   imports, not only what imports it.
5. **The audit's own file counts were undercounted, separately from the finding-5 error.** The
   original "95 files" headline was non-test files only; real totals including tests ran roughly
   double (`components/features/layouts/` was 48, not 25; `utils/` 28, not 7; `services/` 24, not 9),
   closer to **~190**. The final destination table in Phase 3e uses the corrected, measured counts.

**Interleaved effort, complete:** attribution consolidation — `src/core/attribution` (moved from
`shared/` in `0d9696d`, see above) is the single place attribution values are built, and
`DocumentService` is the single write path that applies them. Read
`docs/architecture/migration/attribution-consolidation-findings.md` before touching attribution; its
"RESOLVED" section records three predictions the original analysis got wrong, including two
categories of write that must **never** be routed through `createDocument`.

### Test baseline — final numbers

**8 failed suites / 171 passed / 179 total; 25 failed / 3 skipped / 3950 passed / 3978 total.**
Coverage ~89% statements. Compare against this number before treating a red test as a regression.

Two deltas from the pre-phase baseline (21 failed / 3947 passed of 3971, 8 failed suites of 180),
both benign, both worth understanding so the next session doesn't misread them as regressions:

- **+7 total, +4 failed, +3 passed, all from one file.**
  `src/test-utils/__tests__/enhanced-test-utils.test.tsx` went from executing **zero** tests (it could
  never load — see finding 3 in Phase 3e) to executing all 7 it defines, now that Firebase init is
  lazy. The 4 failures are newly *visible*, not new: 3 are `SearchProvider` requiring a `QuestProvider`
  the shared test utility never composes, and 1 is `firebase/analytics` going unmocked in that suite,
  so the real `getApp()` runs. Deliberately **not** filed as tracker bugs yet — queued in Phase 4,
  below — per the lesson from #013/#014/#300/#021/#022 that filing unproven defects before confirming
  them against running code produced five phantom entries.
- **180 → 179 suites, pass/fail counts unchanged.** The layouts `dateFormatter.test.ts` was deleted in
  `c187f05` and its 30 tests merged into the shared suite. Test total held at 3978, confirming
  relocation, not loss.

**A signal worth keeping for future large moves**: the production bundle hash was byte-identical
across every pure-move commit in this phase, changing only at `c187f05`, where the `dateFormatter`
merge genuinely removed a module rather than relocating one. An unexpected bundle-hash change on what
should be a pure move is a fast, cheap check that something did more than relocate code.

That number was 22 before the collaboration migration. The one that went away was the phantom
`NoteContext` "malformed entity extraData" test — corrected, not fixed and not deleted; see below.
Total test count is unchanged at 3971, so nothing was lost in the move.

That number was **53** before this round. It did not fall because bugs were fixed; it fell because
**25 of those failures were never bugs.** Five tracker entries (#013, #014, #300, #021, #022) turned
out to be test-environment defects: a missing `crypto.randomUUID` in JSDOM, an unawaited initial
fetch, and stale closures from chaining dependent calls inside a single `act()`. In every case the
test aborted or read stale state before exercising the behaviour it named, and the resulting red was
filed as a production defect. Roughly **half the failing suite was measuring its own harness.**

**Bug tracker: 59 filed, 17 fixed, 39 open, 3 needing a decision.** Unchanged by Phase 3e — no bugs
were filed or fixed while moving files. Two new candidates the audit surfaced are queued in Phase 4,
not yet filed.

Behavioral testing methodology stays in force: **failing tests are bug markers; never modify a test to make it pass.** See `docs/testing/methodology/testing-lessons-learned.md`.

### Four lessons worth carrying into the next session

1. **A red test has not necessarily executed anything.** #013, #014 and #300 sat here for a year as
   deferred "architectural" bugs. They were a missing `crypto.randomUUID` in JSDOM — the tests
   aborted before reaching an assertion. Establish that a failing test actually ran the code it
   names before believing what it claims about that code.
2. **`tsc --noEmit` + jest green does not prove the app builds.** `react-scripts`' webpack ignores
   tsconfig `paths`, so `@/...` imports pass both and still fail the production build. Run
   `npm run build` before proposing any merge.
3. **A column-anchored grep hides indented exports.** This codebase indents file bodies, so
   `grep "^export"` reports one export in a file that has five. Two separate conclusions about
   `dateFormatter` during Phase 3e — "different content, same job," then "disjoint, a split, not a
   duplicate" — were both wrong for exactly this reason. Open the file; don't infer exports, or size
   relative to another file, from an anchored grep.
4. **A scan for references *to* a moved file never sees that file's *own* dependencies.** The
   `user-utils.ts` trap (above) recurred on nearly every slice of Phase 3e. Before relocating a file,
   check what it imports, not only what imports it — otherwise the move can silently recreate the
   exact edge it was meant to remove.

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

**Status — decided, 2026-07-27: the rule is amended, not engineered around.** `CLAUDE.md`'s dependency
rules now read "features may depend on another feature's public barrel, never its internals" — which
is exactly the invariant already holding across all 26 edges, so the decision closes the deviation
without adding a seam. No behaviour change, no new indirection needed. The related `shared →
features/collaboration` edges resolved the same way during Phase 3e: `Layout.tsx`'s edge moved into
`app/` (allowed to depend on features) when `components/layout/` relocated there in `c187f05`;
`GlobalActionButton.tsx`'s edge is one of the four the rule amendment covers directly, alongside
`AttributionInfo.tsx`, `ContextSwitcher.tsx` and `SearchContext.tsx` — see "The dependency audit,"
above.

**Per-phase exit criteria**:
- All tests pass except the documented bug-marker set.
- Coverage on the migrated domain stays ≥ pre-phase coverage.
- No new entries in the bug tracker introduced by the move itself.
- Tag `migration/<domain>-complete` on main when merged.

Within a single domain, sub-tasks (move file A, move file B, update imports) can sometimes parallelise across two workers — but only when they touch disjoint file sets. When in doubt, sequential.

**All four domains are merged and tagged.** `migration/collaboration-complete` → `411d9c8`
(PR #17), which sits on top of the attribution consolidation (PR #16, `47c5e9d`).

---

### Phase 3e — the `shared/`/`core/` infrastructure pass ✅ COMPLETE

*Landed on `migration/shared-core` across six commits, `69d19c2` → `0d9696d`, 2026-07-27. The findings
below were recorded by an audit against the tree on `main` at `411d9c8`; each is annotated here with
its final status. The dependency-audit result and the corrections that came out of executing the plan
are recorded in "Where we are now," above — read that first if you only read one section of this
phase.*

**Scale, as executed**: every one of the 95 non-test files (~190 counting tests, see the corrections
in "Where we are now") the original audit enumerated has moved. `src/components/`, `src/types/`,
`src/context/`, `src/hooks/` and `src/services/` no longer exist.

#### Six findings that shaped the plan — all resolved

**1. `components/features/layouts/` was 25 files (48 counting tests) of cross-domain view code with
no agreed destination.** It consumed `features/campaign-entities` **20×**, `features/storytelling`
**5×**, `features/user-management` **1×** through sections like `CharacterGallery`, `LocationsMap`,
`ActiveQuestsList` and `StorySection` that aggregate several domains at once — no single feature could
own it, and it couldn't go in `core/`, which must have no internal dependencies.

**Status — done, `c187f05`.** Moved to `pages/layouts/` (48 files, including tests). `pages/` was
already permitted to import feature barrels, so of the three options considered — a `shared/layouts/`
allowed to depend on features, a fifth feature-like "dashboard/journal" domain, or `pages/` — this was
the only one needing no change to the dependency rules. Accepted cost, as anticipated: `pages/` no
longer matches its "thin orchestrators" description in the target-architecture section above.

**2. `core/` → `features/` dependency inversion, 5 instances — blocked creating `core/` at all.**
`services/firebase/index.ts` imported `AuthService`, `UserService`, `GroupService` and
`InvitationService` from `features/user-management`; `CampaignService.ts` imported `UserService`.

**Status — done, `69d19c2`.** All four services moved to `services/firebase/{auth,user,group}/` —
each file's own header comment already named that original path, confirming they were only ever
inside `user-management` because that domain migrated first. The four remaining consumers use
`UserService` purely as a **type** (real instances come from `ServiceRegistry`), so those imports
became `import type` and carry no runtime edge at all.

**3. `services/firebase/index.ts` called `initializeFirebaseServices()` — and therefore
`getAnalytics()` — at module scope**, so any barrel re-exporting a transitive path to it eagerly
initialized Firebase and crashed jsdom. `src/test-utils/__tests__/enhanced-test-utils.test.tsx` had
never been able to load because of it.

**Status — done, `69d19c2`.** Initialization is now memoized behind `getFirebaseServices()`, with the
six exported services as lazy `Proxy` stand-ins that construct nothing until a member is read.
Importing `services/firebase` (now `core/services/firebase`) is side-effect free.
`enhanced-test-utils.test.tsx` now executes all 7 tests it defines — see the test-baseline note in
"Where we are now" for why the 4 new failures are not a regression.

**4. The `user-management` barrel was incomplete — 14 imports bypassed it into internals.** Export
counts told the story: `campaign-entities` 32, `collaboration` 17, `storytelling` 11,
`user-management` 8 (hooks plus `FirebaseProvider` only — zero components, zero services).

**Status — done, `69d19c2`.** The barrel now exports the 7 components external callers need; the 9
bypass imports from `App.tsx`, `components/layout/Header.tsx` and
`components/shared/ContextSwitcher.tsx` are gone. Adding those exports first required removing **12
intra-domain self-barrel imports** that would otherwise have become real cycles
(`index.ts` → `AdminPanel.tsx` → `index.ts`) — the three later-migrated domains had zero such imports,
so this was a pre-pattern artifact specific to the domain that migrated first, not the norm. Removing
the 12 self-imports then broke 14 test suites through the "stale `jest.mock` silently stops mocking"
trap (see the collaboration migration's finding 2, further up this document) — fixed by pointing the
direct mock paths at the barrel mock each test already defined; no assertion changed.

**5. `dateFormatter` appeared to exist twice**, with disagreement over whether the two copies were a
duplicate or a split.

**Status — done, `c187f05`, and corrected twice over the phase** (see "Corrections to record
honestly" in "Where we are now"). Both earlier readings were wrong: `shared/utils/dateFormatter.ts`
already held all five functions, and the layouts copy's three were a strict subset, differing only in
that the shared version normalizes through `convertFirestoreTimestamp` first. The layouts copy and its
test file are deleted; its 30 tests merged into the shared suite. A **third** copy of
`getRelativeTime`/`formatJournalDate` was found during this move, in
`pages/layouts/common/utils/layoutUtils.ts` — not fixed here, carried into Phase 4, below.

**6. `src/utils/__dev__/` is 14 sample-data generator files with no obvious home in the target
architecture.**

**Status — decided, 2026-07-27: stays where it is.** It is tooling `scripts/manage-dev-data.ps1`
depends on directly; moving it would have bought nothing architecturally. Confirmed unchanged through
the rest of the phase.

#### What landed on `migration/shared-core`

| Commit | What | Notable traps |
|---|---|---|
| `69d19c2` | Findings 2+3+4: `core/` → `features/` inversion resolved, Firebase init made lazy, `user-management` barrel completed | 12 intra-domain self-barrel imports had to be removed first, or the new barrel exports would have created real cycles; several stale `jest.mock` paths silently stopped mocking rather than erroring |
| `7c9811e` | `src/core/` created — `themes/`, `components/` (5 UI primitives), `config/`, `constants/`; 144 importers rewritten | A substring rewrite misses relative imports where `core` is only a trailing path segment (`../core/Button`); theme CSS reaches assets via relative `url()` plus a `globals.css` `@import`, and only `npm run build` catches a broken one — never `tsc` or `jest` |
| `3705d27` | `services/` → `core/services/`, completing `core/`; 21 importers + ~90 mock/import path strings across 35 test files | Inserting a `core/` segment changes how far `../` reaches, so `CampaignService`, `DocumentService`, `SearchService` and `firebaseConfig` all needed relative-depth fixes; two files carry a UTF-8 BOM ahead of their header comment, which defeats a naive `^` anchor |
| `5db0ed7` | `shared/` populated — types, context, hooks, utils, components; 260 specifiers across 169 files | Done via a TypeScript-AST resolution pass rather than text substitution, since a substring pass misses imports where the moved directory is only a trailing segment; 44 of the 260 edits were inside `jest.mock`/`require` calls, which fail silently rather than loudly when left stale |
| `c187f05` | `app/` shell (`App.tsx` + `components/layout/`) and `components/features/layouts/` → `pages/layouts/`; `dateFormatter` merged | Two parallel workers on verified-disjoint file sets; `Breadcrumb.tsx` deliberately went to `shared/components/`, not `app/layout/`, since it's reusable navigation, not application shell |
| `0d9696d` | Closed the last two layer violations a post-move dependency audit found | See "The dependency audit" in "Where we are now," above, for full detail |

Two deliberate landmines remain in `jest.config.ts`'s resolver allow-list: the `services`, `types`,
`context` and `hooks` entries still point at directories that no longer exist, so any import missed
during the moves fails loudly instead of silently resolving somewhere unexpected.

The order followed matched the plan set out mid-phase: findings 2/3/4 and `core/`'s cheapest slice
first (done pre-close, in `69d19c2`/`7c9811e`), then `shared/` population, then `services/` into
`core/`, then the `app/` shell paired with the `layouts/` move (since finding 1's decision made
`pages/` a safe destination), then the audit-driven cleanup last, once there was a finished tree to
audit. No slice ran out of dependency order.

#### Destination table — final

| Original location | Files | Destination | Status |
|---|---|---|---|
| `components/features/layouts/` | 48 | `pages/layouts/` | ✅ done, `c187f05` |
| `utils/__dev__/` | 14 | *(stayed put)* | ✅ decided, finding 6 |
| `services/` | 24 | `core/services/` | ✅ done, `3705d27` |
| `components/shared/` | 7 | `shared/components/` | ✅ done, `5db0ed7` |
| `themes/` | 7 | `core/themes/` | ✅ done, `7c9811e` |
| `utils/` (attribution, date, export, navigation, password, search, user) | 28 | `shared/utils/` (attribution, date-user-utils re-homed to `core/` in `0d9696d`) | ✅ done |
| `components/core/` | 5 | `core/components/` | ✅ done, `7c9811e` |
| `components/layout/` | 5 | `app/layout/` | ✅ done, `c187f05` |
| `test-utils/` | 5 | *(stayed put)* | ✅ decided — test infrastructure, never bundled |
| `types/{common,search,user}.ts` | 3 | `shared/types/` (re-homed to `core/types/` in `0d9696d`) | ✅ done |
| `hooks/{useFirebaseData,useNavigation,useSearch}` | 3 | `shared/hooks/` | ✅ done, `5db0ed7` |
| `context/{Navigation,Search}Context.tsx` | 2 | `shared/context/` | ✅ done, `5db0ed7` |
| `config/`, `constants/` | 2 | `core/` | ✅ done, `7c9811e` |
| `components/features/contact/` | 1 | `shared/components/` | ✅ done, `5db0ed7` |
| `App.tsx` | 1 | `app/App.tsx` | ✅ done, `c187f05` |
| **total** | **~190 counting tests** | | **all done or deliberately staying** |

`index.tsx`, `setupTests.ts` and `styles/` stayed at the `src/` root, as planned — none is
feature-specific or part of the dependency graph the rules describe.

Two moves went further than this table's original destinations, resolved by the post-move audit
rather than the plan that produced the table: `shared/attribution/` → `core/attribution/` and
`shared/utils/user-utils.ts` → `core/utils/`, both in `0d9696d` — see "The dependency audit" and the
`user-utils.ts` trap in "Where we are now," above.

### Phase 4 — Post-migration bug triage 🟡 **FIRST PASS COMPLETE**

*Done on `triage/phase4-bug-triage` (branched from `main` at `7cf0f02`), 2026-07-27, across eight
commits. Full detail: **`docs/testing/phase4-triage-findings.md`** (narrative and decisions) and
**`docs/testing/phase4-audit-worksheet.md`** (per-bug verdicts with quoted code). Read those before
continuing — the summary here is deliberately short.*

**Test baseline moved from 25 failed / 3950 passed (179 suites) to 7 failed / 3971 passed (180
suites).** `tsc` clean, `npm run build` succeeds. **All 7 remaining failures are the deliberately
deferred ID-collision markers** (#002 ×2, #004 ×3, #009, #012) — there are no unexplained reds left.

**Fixed**: #023, #006, #150, #018, #019, #010, #101, plus the 4 `enhanced-test-utils` failures.
**Closed without a code change**: #007, #008, #011, #015 (all fixed by the PR #16 attribution
consolidation and never closed — three were rated High/High) and #1201 (became impossible).

#### The four things worth carrying forward

1. **A passing test does not mean fixed.** #251's tests pass only because they *work around* the
   defect. Every Phase 4 verdict came from reading production code, never from pass/fail. The
   converse trap (#013/#014/#300) was already known; this is its mirror image and is less obvious.
2. **A green suite is not evidence a fix works.** The #150 fix left the full suite byte-identical;
   #018's tests kept passing because their mock never supplied the data the new path reads. Both had
   zero covering tests. Regression tests were added, each **proven by failing against the reverted
   fix** — that check is the whole point, and it is cheap.
3. **Characterization tests wearing specification-test names.** #006 was blocked because three tests
   named `should reject …` asserted that it *resolves*, with comments recording the defect as
   expected. Such a test passes forever and silently blocks the fix it appears to demand. Corrected
   under explicit authorisation. A fifth of the same family still sits at
   `NPCContext.notes.test.tsx:361` and blocks #005 the same way.
4. **Reports understate as often as they overstate.** #150 was filed as a testability limitation and
   is a production bug; #018 was filed as medium-priority tracking and was a full feature outage;
   #006 described a silent no-op that was actually a phantom write.

#### What remains — suggested next order

- **#005, and the intra-context inconsistency behind it.** `NPCContext` handles the same
  `!hasRequiredContext` precondition by throwing in two methods and `console.error`-and-return in two
  others, in one file. Blocked on the characterization test named above; needs the same authorisation
  #006 got.
- **Confirmed still live, from the audit**: #1000, #1050, #1052, #1152, #050 (dead code); #100, #250,
  #600, #700, #702, #750, #850 (logic); #016, #017 (story); #201, #251 (UI/a11y — #251 is the
  highest-impact of these). Each has a verdict and quoted evidence in the worksheet.
- **Reclassified TEST-ONLY, not production defects**: #200, #301, #302, #901. Consider closing.
- **#003** needs a decision; the audit recommends closing it as dependent on #002.
- **The ID-collision cluster** (#002/#004/#009/#012) is deferred by decision, not unresolved. If it is
  picked up: the marker tests create two entities inside one `act()`, so a lookup-based fix may fail
  for harness reasons rather than logic reasons. An approach needing no lookup sidesteps that.
- **Tracker hygiene**: bug **#024** is referenced by `NoteContext.bugs.test.tsx:455` but has no row
  and no file. Two test comments cite wrong numbers (`Dialog.test.tsx` says #100 for #150;
  `GroupManagementView.test.tsx` says #200 for #201).
- **`cross-context-patterns.md` Pattern 1 should be struck.** Its "highest priority systematic issue"
  — that `getUserName`/`getActiveCharacterName` return empty/null — is false against
  `src/core/utils/user-utils.ts`. It has been steering priority for a year.

**Still queued, untouched by this pass:**

- **#1202 needs a production data pass** (not a code fix): chapters reordered before the attribution
  branch hold a Firestore `Timestamp` in `dateModified` where a string is expected, and render a
  blank modified date.
- **#1204** remains unfixed by design — it needs its failing test written first. (#1201, previously
  paired with it here, is now closed as obsolete.)
- **The `layoutUtils.ts` triplicate.** `src/pages/layouts/common/utils/layoutUtils.ts` holds a third
  copy of `getRelativeTime`/`formatJournalDate`, alongside the two `dateFormatter` copies finding 5
  already reconciled. Its own test comment acknowledges the overlap. Decide whether to merge it into
  `shared/utils/dateFormatter.ts` the same way, or whether `pages/layouts/` warrants its own
  presentation-local copy — that's a real design question this time, not a rediscovery of finding 5,
  since `pages/` is already allowed to depend on `shared/`.

---

### Phase 4, second pass — 2026-07-28

*On `fix/phase4-batch1`, branched from `main` at `7e69266` (the merge of PR #20). Two Sonnet
workers, one batch, plus orchestrator-owned documentation work.*

**Baseline re-verified before starting, and reproduced exactly** — 7 failed / 3 skipped / 3971
passed of 3981 across 180 suites; coverage 91.56 / 92.05 / 85.16 / 83.37; `tsc --noEmit` clean;
`npm run build` succeeds. Worth doing every time: an exact match is what makes any later movement
attributable to this pass rather than to drift.

**Result after the pass:**

| | Before | After batch 1 | After batch 2 |
|---|---|---|---|
| Tests | 7F / 3S / 3971P / 3981 | 7F / 3S / 3975P / 3985 | 7F / 3S / **3977P** / **3987** |
| Failing suites | 4 (ID-collision markers) | 4 — the same 4 | 4 — **the same 4** |
| Statements | 91.56% (8195/8950) | 91.65% | **91.67%** (8190/8934) |
| Branches | 83.37% (3963/4753) | 83.44% | **83.45%** (3960/4745) |
| Lines | 92.05% (7600/8256) | 92.14% | **92.17%** (7595/8240) |
| Functions | 85.16% (1751/2056) | 85.15% | 85.15% (1750/2055) |

`tsc --noEmit` clean and `npm run build` succeeds at every checkpoint.

The +6 tests are exactly the regression tests added (4 for #251, 1 for #201, 1 for #005). Coverage
rose on three metrics because removing unreachable code removes *uncovered* statements and branches
— **dead-code cleanup buys coverage margin rather than spending it.** Functions moved down one
covered function (`getStatusBadgeClass`, deleted); that is a rounding artifact, not rot. **Function
coverage remains the binding constraint at ~3 functions of slack against the 85% floor** — check it
before landing anything that adds uncovered functions.

**A note on how "the same 4" was actually established**, since it is the load-bearing claim: the
full run reported 4 failed suites / 7 failed tests, and the four marker suites run alone report
4 failed / 7 failed. Equal counts on both sides means the failing set is exactly those four, with
no room for an unrelated suite hiding among them. Cheaper and stronger than reading a truncated
log tail, which is what nearly went wrong here — piping a full run through `tail` discards the
earlier failures' names entirely.

**Fixed**: #251 (a11y), #201, #005 (partially — see below), and the five dead-code entries #1000,
#1050, #1052, #1152, #050.
**Closed without a code change**: #200, #301, #302, #901 (TEST-ONLY) and #003 (symptom of the
deferred #002).
**#024 retired**: it was never a bug — see below.

#### Four things worth carrying forward

1. **"Unreachable" is a claim, not a fact — re-verify before deleting.** All five dead-code
   verdicts came from an audit a day old, and all five held under a fresh read (every call site
   grepped, every exit path traced). The check still isn't optional: deleting a *live* error
   handler on a stale audit's word is far worse than leaving dead code in place. One catch block in
   the same file as #1000 (`applyThemeToDOM`, guarding `localStorage.setItem`) is genuinely
   reachable and was correctly left alone — the file did not have a blanket verdict.
2. **A bug's filed category can understate it, and #251 is the clearest case yet.** It sat as
   `TESTABILITY / Priority: Low` for months. It is an accessibility defect: every labelled field in
   the application rendered a `<label>` associated with nothing, so no screen reader could announce
   any of them. The testability symptom was real but incidental. This is the same failure mode as
   #150 (filed as a testability limitation, actually a production outage) and #018 (filed as
   medium-priority tracking, actually a dead feature) — **three for three, all in the same
   direction.** When a report's framing is "this makes testing hard," check what it means for a
   user before accepting the priority.
3. **Deleting code strands the comments that described it.** Three test files carried comments
   naming functions, branches and line numbers that no longer existed after this pass — including
   two tests in `NoteCard.test.tsx` claiming to cover `getStatusBadgeClass`'s "active" and default
   branches, which they had never reached, because the only call site was already gated on
   `archived`. The assertions were correct and untouched; only the comments were wrong. Worth a
   routine sweep after any deletion.
4. **A handoff's to-do list can itself be stale.** `Dialog.test.tsx` was listed as citing #100 for
   what is #150. It already cited #150 correctly throughout — fixed when #150 landed, with the note
   never updated. Verify a reported defect still exists before assigning it, including defects in
   the tracker's own record-keeping.

#### On striking `cross-context-patterns.md` Pattern 1

Struck in place rather than deleted, because the failure mode generalises and the document is the
only record of it. Its premise — that `getUserName`/`getActiveCharacterName` "consistently return
empty/null" — is false against `src/core/utils/user-utils.ts`, where `getUserName` is
`userProfile?.username || ''`. It was rated the codebase's "highest priority systematic issue" and
steered priority for over a year.

**The mechanism is what matters.** The pattern was synthesised from five contexts' *test output*,
not from production source. Five contexts agreeing felt like five independent confirmations; it was
one shared mock shape counted five times. **Cross-context analysis multiplies apparent confidence
without multiplying evidence.**

It also generated downstream work: the document's own advice for the then-upcoming NoteContext pass
was "expect the same patterns — anticipate user attribution issues." That pass duly found them and
filed #020, #021 and #022 — **all three later closed as test issues, not implementation bugs.**
Priming an investigation with the pattern it should find is a reliable way to find it whether or
not it is there. The strike, the verified source, and this chain are recorded in the document
itself; the four downstream sections that propagated the claim were corrected with it.

#### #005 is half-fixed, and the half that remains needs a decision, not a patch

`NPCContext` is now unanimous — all five mutators throw on `!hasRequiredContext`. The two that
didn't (`updateNPCNote`, `updateNPCRelationship`) were **writes silently reporting success**.
Correcting the blocking characterization test at `NPCContext.notes.test.tsx` was authorised on the
same terms #006 got; it was the fifth of that family found here.

**But #005 was filed as a cross-context pattern, and that half is untouched.** A sweep run *after*
the fix landed found the identical intra-file split still live in `StoryContext.tsx` — three
progress methods `console.warn`-and-return (`:127`, `:156`, `:177`) against four mutators that
throw (`:211`, `:335`, `:435`, `:511`). Two further idioms exist elsewhere: `LocationContext` and
`QuestContext` inline `if (!activeGroupId || !activeCampaignId)`, `NoteContext` uses
`if (!user?.uid || !activeGroupId)`. Three shapes, five contexts, one precondition.

**Do not reflexively make StoryContext throw.** Its three outliers are all reading-progress
operations, and fire-and-forget is a defensible contract there in a way it is not for a note write
— a reader who has selected no campaign arguably should not get an exception for scrolling. Decide
the contract, then make the file state it consistently. This is deliberately **not** filed as a new
bug number: nothing in it has been shown to misbehave against running code, and filing unproven
defects is what produced the five entries this project later retracted. Evidence is in #005's
report addendum so the next pass starts from measurement.

**Generalisable**: sweep the siblings *after* a fix, not only before it. Fixing the instance you
were pointed at tells you nothing about whether the pattern it exemplified survived — and a bug
filed as systemic, closed on one instance, is worse than one never opened.

#### Batch 3 — the consistency cluster (2026-07-28)

Seven bugs of one shape: *N implementations of one rule, disagreeing.* **Five landed** (#100, #250,
#700, #702, #850); **two were blocked and correctly halted on** (#600, #750). The coverage floor was
lowered to a uniform 80% in the same pass, at the user's direction.

Three of the five turned out to have their direction settled by evidence rather than preference,
which is worth noticing — *"pick one and make them match"* sounds like a coin flip and usually isn't:

- **#850** — every `timestamp:` expression already read `dateModified || dateAdded`. The file's own
  downstream code had assumed the looser rule all along; only the five guards disagreed. Unifying
  *on the fallback* was the only choice consistent with code that already existed.
- **#700** — validating inside the 3-arg branch (as first written) would have left the 2-arg form
  still coercing `''`, **trading one asymmetry for another**. Hoisting the check past the
  calling-convention branch makes one rule serve both. Caught in review, not by the tests.
- **#250** — resolving before guarding also made the per-item `quest ? … : null` dead, since nothing
  unresolved survives the filter. The first draft of the fix left that behind; shipping new dead
  code in the same PR that deletes dead code defeats the point.

**#600 dissolved on inspection, and my own initial call on it was wrong.** I told the agent the
direction was "already decided: explored FIRST", on a 2:1 reading — `useLayoutData`'s code plus
`LocationsMap`'s comment against `LocationsMap`'s code. That was wrong twice. It ignored
`LocationsMap.test.tsx`, which asserts the current order and makes it 2:2; and, decisively,
**`useLayoutData.sortedLocations` is read by nothing.** It is computed, memoised and exported, and
its only non-test consumer (`HomePage`) uses just `layoutData.loading`. So there is no user-visible
inconsistency, no UX decision, and nothing to flip — the live ordering already matches what the
original report argued for. Only the comment was wrong, and it is fixed. Deleting the dead
`sortedLocations` belongs to the dead-code phase.

**The generalisable point**: before reconciling two implementations, check that both of them *run*.
A dead implementation votes in a code-reading tally and counts for nothing in production. Had the
agent followed my instruction without the halt, it would have changed real user-facing behaviour to
match dead code.

**#750 is blocked by the clearest characterization test found yet.** `LocationCreatePage.test.tsx`
asserts `it("always passes an object (possibly with undefined fields) when no state")` under a
comment block that **cites bug #750 by number** and describes the defect as expected behaviour. The
fix is written and reverted; it needs the same authorisation #006 and #005 got.

Running total of this family: **7 found** — four blocking #006, one blocking #005, one blocking
#750, and one asserting the #002 ID collision (`NPCContext.behavioral.test.tsx:442`) that will
ambush whoever picks up the deferred cluster.

#### The `DISCOVERY:` sweep, finally run

Phase 4's first pass recommended grepping the behavioural suites for `DISCOVERY:`/`BEHAVIOR:`
comments, reasoning that characterization tests announce themselves that way. Run at last: **23
hits, and the marker turned out to be a poor predictor of what it was meant to find — one genuine
characterization test in 23.**

It was, however, an excellent predictor of something else: **stale bug narrative.** Four blocks in
`RumorContext.bugs.test.tsx` (:150, :205, :259) and `StoryContext.bugs.test.tsx` (:214) read

```
// BUG DISCOVERY: This test will FAIL until getUserName and getActiveCharacterName utilities are fixed
// ACTUAL: getUserName returns "" and getActiveCharacterName returns null
    createdByUsername: 'Test User',        // BUG: Currently receives ""
```

These tests **pass**. The assertions are correct; the narrative is false twice — it asserts a defect
in `user-utils.ts` that never existed (the struck Pattern 1) and predicts a failure that does not
happen. This is the **inverse** of a characterization test: right assertion, wrong story. It is
still dangerous, because a reader hitting `// BUG: Currently receives ""` would go re-investigate a
non-issue, which is exactly the misdirection Pattern 1 already caused for a year.

The remaining ~18 are benign narration over reasonable assertions.

#### Batch 4 — data integrity (2026-07-28)

**#017, #851 and #750 all landed.** Both agents halted rather than ship, and both halts were correct;
each was then unblocked by an explicit authorisation.

**#017 — chapter reorder atomicity.** `updateChapter` deleted every affected chapter before creating
any replacement, so a partial failure lost chapters with no rollback; its three siblings all
create-and-verify first. Now writes and verifies every new position, then deletes only ids not reused
in the same batch. The `// Do NOT switch this to createDocument` guards from #1203 were honoured.

**#851 — chapter marked complete on any load of page 1.** Traced upstream rather than guessed:
`BookViewer` owns `totalPages` internally and already computes completion, so the `isComplete` flag
reaching `StoryPage` is authoritative and `page === 1` was never a stand-in for "last page".

**#750 — `LocationCreatePage` initialData**, now matching its three sibling create pages.

#### The eighth characterization test, and a second species of the problem

#017's blocker was `expect(mockDeleteData).toHaveBeenCalled()`. **No correct implementation can
satisfy it**, and the proof generalises:

> A reorder shifts a contiguous range, and a chapter's id is derived from its order, so the affected
> range is a **closed permutation with no fixed points.** Moving `chapter-01` to order 3 rotates
> `{1,2,3} → {3,1,2}`, giving new ids `{chapter-03, chapter-01, chapter-02}` — the same set as the
> old ids. Every id is reused, so a reorder that writes before deleting has nothing left to delete.

**The seven previously catalogued characterization tests assert the wrong *outcome*** — their names
state a requirement their assertions deny (#006's four, #005's one, #750's, and #002's marker). This
eighth one asserts the ***mechanism***. Nothing about it was false as a description of the old
algorithm; it was simply unsatisfiable by any correct one.

**A test that asserts how something is done, rather than what results, is a characterization test
whether or not its author intended one.** That is a harder species to spot, because it cannot be
found by comparing a test's name against its assertions — the two agree. `toHaveBeenCalled()` on a
mutation helper is the smell: it pins an implementation's choice of steps.

It was replaced with an assertion on the ids and orders actually written — strictly stronger, since
the old assertion never checked chapters landed anywhere in particular and would not have caught the
atomicity defect.

**And a distinction worth keeping honest**: that corrected outcome assertion passes against *both*
implementations, because the old one also wrote the right ids on the happy path. It is a better
specification but it is **not** evidence for the fix. The evidence is a separate partial-failure
test asserting nothing is deleted when a write fails, which against the reverted fix reports
`Expected number of calls: 0, Received number of calls: 3` — all three chapters already gone. When a
fix and a test correction land together, check which one actually proves anything.

#### #852 — filed while verifying #851, and a pattern worth naming

`updateChapterProgress` takes `Partial<ChapterProgress>` and replaces the whole per-chapter entry
instead of merging, so `isComplete` resets to `false` on any call that doesn't pass `true` — and
`BookViewer` fires `onPageChange(page)` with no flag on every page turn. **Re-opening a finished
chapter un-completes it.**

Two things make it instructive:

1. **It is not caused by #851's fix**, and reverting that would not help — it would only trade
   "re-reading un-completes a chapter" for "loading page 1 completes one you never read."
2. **It was inert until the same day.** Before #018 landed, progress was a frozen module constant
   and none of these writes reached storage. **Fixing one bug activated its neighbour.** Worth
   watching for generally: when a fix makes a dormant code path live, re-examine everything
   downstream of it that was previously unreachable.

#### Still open after this pass

- **Confirmed live, unfixed** (as of the end of batch 4): **#852** (chapter progress overwritten,
  filed today, Medium); **#1051** (NoteEditor's `handleManualSave` re-throws into an `onClick` that
  never awaits — unhandled rejection; its marker test is `.skip`ped, so un-skipping gives a natural
  red-on-landing); **#016** (narrowed by the audit to order validation, which #019 already fixed —
  re-verify before spending anything on it, it may be closeable); **#1200** and **#1204** (dead
  hand-rolled attribution, which belong to the dead-code phase); and **#005's cross-context half** —
  `StoryContext`'s three warn-and-return progress methods, a contract decision deferred until #017
  landed, which it now has.
- **The dead/duplicate-code phase has a concrete backlog now**: `useLayoutData.sortedLocations`
  (dead, #600's remainder), the `layoutUtils.ts` `getRelativeTime`/`formatJournalDate` triplicate,
  and #1200/#1204's discarded attribution.
- **#024 is retired, not filed.** `NoteContext.bugs.test.tsx` carried `describe('Bug #024: …')`
  with no row, no file, and no other reference in the repo. Both its tests execute real work and
  assert *correct* behaviour — a failed fetch surfaces an error and leaves no stale notes; a failed
  save rejects and leaves the note still marked unsaved. Its comments say `BUG POTENTIAL:`, not
  `BUG:`. The block went looking for a defect, found none, and the speculative number stayed in the
  title. Renamed, with the reasoning recorded on the block. Filing it retroactively would have made
  a sixth phantom entry; #024 stays unused, since numbers are not reused.
- Unchanged from the first pass: #1202's production data pass, #1204, and the `layoutUtils.ts`
  triplicate.

#### The deferred ID-collision cluster is now the only source of red

#002, #004, #009, #012 — 7 tests across 4 suites, deliberately red as markers, deferred by decision
because changing ID derivation changes URL shape and stored document identity across four entity
types. Nothing else in the suite fails. That makes the failing set a precise, self-maintaining
signal: **any new red is now unambiguously a regression**, which was not true at the start of
Phase 4 (25 failures spanning 9 tracker entries and 4 unfiled harness bugs).

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
