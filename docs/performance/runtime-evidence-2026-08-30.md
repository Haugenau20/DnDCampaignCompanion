# Performance review evidence — 2026-08-30

This file records the measurements and tool output behind the consolidated review. It is evidence, not a benchmark promise: the browser used the local React development server and Firebase emulators on one Windows machine.

All measurements and static-analysis results refer to repository commit `b73232a`. Later revisions can legitimately produce different behavior, timings, paths, and line numbers.

## Environment and safeguards

- Frontend: `http://localhost:3000`
- Authentication emulator: `127.0.0.1:9099`
- Firestore emulator: `127.0.0.1:8080`
- Functions emulator: `127.0.0.1:5001`
- Browser: isolated headless Google Chrome controlled through the bundled Playwright runtime
- Data source: the repository's imported emulator data
- Mutations: no campaign entity was created, edited, reordered, or deleted. Signing in performed the application's normal `lastLogin` write. Search profiling was read-only.
- Identifiers: Firestore paths below are normalized to `<user>`, `<group>`, and `<campaign>`.

The runtime profiler observed Firestore Listen-channel `addTarget` messages. That is stronger evidence than counting JavaScript hook calls, because the Firestore SDK can coalesce concurrent identical `getDocs` calls. The counts are still emulator protocol observations, not a Firebase billing statement.

React `StrictMode` is enabled in the development entry point. It can double development-only effect execution. The repeated target patterns reported below were stable across two full reload runs; production behavior must still be re-measured after fixes.

## Route timing

Two isolated runs used the same imported data: two groups, two campaigns in the active group, 32 chapters, 16 NPCs, five locations, five rumors, and five quests.

| Workflow | Run 1 | Run 2 | What was timed |
|---|---:|---:|---|
| Manual sign-in | 2,439 ms | 2,513 ms | Submit until active campaign name was visible |
| Home reload | 1,537 ms | 2,119 ms | Navigation until active campaign name was visible |
| Privacy reload | 145 ms / 2,191 ms | 207 ms / 6,698 ms | Privacy heading / background campaign context ready |
| NPC reload | 2,469 ms | 7,590 ms | Navigation until the NPC heading was visible |
| Location reload | 2,489 ms | 3,323 ms | Navigation until the Locations heading was visible |
| Notes reload | 145 ms / 2,185 ms | 122 ms / 2,220 ms | Notes heading / background campaign context ready |

The large run-to-run spread is itself a warning against treating emulator milliseconds as production SLAs. The useful result is structural: entity pages wait on the serial authentication/group/campaign chain, while public or shell-first pages paint and then perform the same unrelated work in the background.

### Stable authentication milestones

Representative home reload, run 1:

| Milestone | Time from navigation |
|---|---:|
| Auth user detected | 213 ms |
| Global profile load started | 215 ms |
| Active group setup started | 981 ms |
| Campaign query completed | 1,512 ms |
| Active campaign selected | 1,512 ms |

Representative manual sign-in:

| Milestone | Run 1 | Run 2 |
|---|---:|---:|
| Auth user detected | 388 ms | 436 ms |
| Active group setup started | 1,715 ms | 1,750 ms |
| Campaign query completed | 2,277 ms | 2,337 ms |

These milestones match the static waterfall: profile, groups, group profile, campaigns, then campaign collections.

## Firestore and Functions targets

The following counts were identical in both reload runs unless noted.

| Normalized target | Home | Privacy | NPCs | Locations | Notes | Interpretation |
|---|---:|---:|---:|---:|---:|---|
| `users/<user>` | 2 | 2 | 2 | 2 | 2 | Global profile is read repeatedly during restore |
| `groups/<group>` | 2 | 2 | 2 | 2 | 2 | Two different group documents, fetched serially |
| `groups/<group>/users/<user>` | 6 | 2 | 2 | 2 | 2 | Two restore reads everywhere; four additional Home attribution reads |
| `groups/<group>/campaigns` | 1 | 1 | 1 | 1 | 1 | Campaign list |
| `groups/<group>/users/<user>/notes` | 2 | 2 | 2 | 2 | 2 | Same unbounded notes collection loaded twice |
| `.../<campaign>/chapters` | 1 | 1 | 1 | 1 | 1 | Loaded on every authenticated route |
| `.../<campaign>/npcs` | 1 | 1 | 1 | 1 | 1 | Loaded on every authenticated route |
| `.../<campaign>/locations` | 1 | 1 | 1 | **2** | 1 | Location page adds a later, non-coalesced second query |
| `.../<campaign>/rumors` | 1 | 1 | 1 | 1 | 1 | Loaded on every authenticated route |
| `.../<campaign>/quests` | 1 | 1 | 1 | 1 | 1 | Loaded on every authenticated route |
| `.../<campaign>/story-progress` | 1 | 1 | 1 | 1 | 1 | Loaded on every authenticated route |
| `getUsageStatus` callable | 1 | 1 | 1 | 1 | 1 | Called globally although its UI is on note detail only |

Manual sign-in raised the group-user-profile target count to seven. The additional overlapping work comes from the explicit sign-in service, Firebase auth-state restoration, campaign membership checks, and Home attribution. Some overlapping global-profile calls were coalesced by the SDK, which is why static call counts are higher than observed target counts.

### Important interpretation

- Privacy displayed quickly, but still loaded every campaign collection, all user notes twice, and usage status.
- The SDK coalesced several simultaneous duplicate entity queries. Duplicate hook ownership therefore still causes effects, promises, array mapping/sorting, and React updates, but does not always become a second server target during initial load.
- The LocationDirectory's additional loader mounted after context data arrived, so it produced a real second `locations` target in both runs.
- Home consistently made four group-profile reads beyond the two needed by restore. Its attribution effect depends on five independently populated collections and has no cache across executions.

## Search main-thread profile

The test scheduled a 450 ms timer while changing the search input. The reported lag is delay beyond those expected 450 ms, so the 300 ms application debounce is not counted as blocking time.

| Query | Timer lag | Total observation | Results after observation | Rendered snippets |
|---|---:|---:|---:|---:|
| `ring` | 13 ms | 463 ms | 24 | 33 |
| two spaces | **22,538 ms** | **23,001 ms** | 0 after recovery | 0 after recovery |

The cause is deterministic:

1. The raw query is split with `query.split(' ')`, retaining empty terms.
2. For an empty term, `text.indexOf('', index + 1)` reaches `text.length`.
3. A later call with a starting position beyond the end is clamped back to `text.length`, so the loop never reaches `-1`.
4. The loop keeps allocating match snippets until the renderer recovers from the failed search.

Leading spaces, trailing spaces, or repeated internal spaces can all create the empty term; it is not limited to the exact two-space input.

The pathological case was run once and deliberately not repeated.

## Production build and bundle analysis

The lockfile install required `npm ci --legacy-peer-deps`: `react-scripts@5.0.1` declares TypeScript 3/4 compatibility while the repository pins TypeScript 5.7.3. No manifest or lockfile was changed.

The optimized build completed with warnings.

| Artifact | Raw size | Gzip size reported by CRA |
|---|---:|---:|
| `main.*.js` | 1,138,710 bytes | **308.17 kB** |
| `main.*.css` | 61,913 bytes | 11.33 kB |

Only one application JavaScript chunk was emitted. Source-map attribution (`source-map-explorer --no-border-checks`) found:

| Source group | Minified bytes in main bundle |
|---|---:|
| Application `features/` | 278,606 |
| Firebase Firestore | 192,901 |
| React DOM | 129,897 |
| Firebase Auth | 88,075 |
| Application `pages/` | 84,919 |
| Lodash | **71,588** |
| Application `core/` | 50,989 |
| Application `shared/` | 33,975 |

`SearchService` is the only production source importing Lodash, and it imports the default package for `uniq`, `groupBy`, and `flatMap`. Lodash is not declared as a direct runtime dependency; it currently resolves through hoisted build/test dependencies.

## Static analysis

### Serialized remote loops

A focused ESLint `no-await-in-loop` pass reported 18 production warnings:

- `GroupService.ts`: 1
- `LocationContext.tsx`: 1
- `RumorBatchActions.tsx`: 2
- `RumorContext.tsx`: 2
- `StoryContext.tsx`: 12

These are the loops described in the consolidated review; development data generators were excluded from this count.

### Circular dependencies

Madge processed 232 modules from `src/index.tsx` and reported six cycles:

1. `features/campaign-entities/index.ts` → `LocationCreateForm.tsx` → `features/collaboration/index.ts` → `EntityExtractor.tsx` → `CampaignLinksPanel.tsx` → back to campaign entities
2. The same chain extended through `NoteReferences.tsx`
3. `HomePage.tsx` ↔ `useLayoutData.ts`
4. `HomePage.tsx` → `DashboardLayout.tsx` → `ActivityFeed.tsx` → Home
5. The same chain extended through `useActivityDisplay.ts`
6. `HomePage.tsx` → `JournalLayout.tsx` → `RecentActivityChronicle.tsx` → Home

The cycles are not claimed as the cause of a measured delay. They make module initialization and future code splitting less predictable and are recorded as bundle-architecture debt.

### Existing checks

- Optimized build: passed with ESLint warnings.
- Focused tests: **7 suites, 167 tests passed**.
- Covered areas: SearchService, SearchContext, StoryContext, RumorBatchActions, and LocationDirectory.
- Missing regression cases relevant to this review: whitespace-token search termination, cyclic location parent data, query-count budgets, and remote-operation count budgets.
- Knip was attempted as an ephemeral production dead-code analyzer but could not load its Windows native optional dependency under the installed npm/Node combination. No finding relies on Knip.

## Measurement limitations

- Local emulator latency is not production latency and showed meaningful variation.
- The React development build includes StrictMode and development instrumentation.
- Two route reload runs are enough to confirm stable request shape, not to establish percentile latency.
- Destructive or data-changing chapter, rumor, location, campaign, and profile workflows were not executed. Their operation counts come from direct control-flow inspection and focused static analysis.
- No claim is made about Firebase billable read counts where the client SDK coalesced simultaneous requests.
- Bundle sizes came from a real optimized production build, but no production server was launched because the build shell did not carry the user's emulator environment variables.
