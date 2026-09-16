# Web application performance review — 2026-08-30

## Review status

This is the consolidated performance review for repository commit `b73232a` (`Merge pull request #33 from Haugenau20/redesign/context-switcher`). The investigation covered the React application, Firebase client services and hooks, Cloud Functions called during page load, representative runtime workflows against the local emulators, the optimized bundle, dependency cycles, and focused tests.

This document is a dated, point-in-time audit. The review branch was later synchronized with `main`, which had advanced substantially; findings and source line numbers must be revalidated before using them as statements about a newer revision.

No application source, package manifest, or lockfile was changed. No campaign entity data was mutated; signing in performed the application's normal emulator `lastLogin` write. The only repository changes from this review are documentation under `docs/performance`.

Supporting material:

- [Runtime and static-analysis evidence](runtime-evidence-2026-08-30.md)
- [Earlier investigation notes](initial-findings.md)

## Executive summary

The application has one critical main-thread loop, six high-impact architectural or Firestore amplification problems, and several medium/low scalability issues.

The largest verified problems are:

1. A query containing a leading, trailing, or repeated space can enter a non-terminating search loop. Two spaces blocked the measured browser for **22.5 seconds**.
2. Authentication restoration is a serial waterfall with repeated profile reads and serial group-document reads. Even the local emulator took roughly **1.5–2.1 seconds** to restore the Home campaign context; entity pages ranged from **2.5–7.6 seconds** across two runs.
3. Every authenticated route mounts all campaign providers. A Privacy page reload fetched chapters, NPCs, locations, rumors, quests, story progress, all notes twice, and usage status even though the page needs none of them.
4. Chapter insertion, deletion, and reorder operations perform up to three sequential Firestore round trips per affected chapter, plus full collection reads. Inserting at the beginning of the 32-chapter sample requires roughly **102 serial remote operations** by code path.
5. Entity writes generally read the current group profile, write one document, and then reload an entire collection. Batch rumor actions repeat that sequence once per selected item.
6. Context switching refreshes data and then calls `window.location.reload()`, immediately repeating the complete authentication and provider load.

The optimized build also ships one **308.17 kB gzip** JavaScript file with every route in it. A single default Lodash import accounts for 71,588 minified bytes and is used for only three helpers.

## Severity model

| Severity | Meaning |
|---|---|
| Critical | Can freeze the UI, fail to terminate, or make a normal action unusable with ordinary input |
| High | Repeatedly adds remote round trips or seconds to common workflows, or grows linearly with normal campaign size |
| Medium | Measurable waste or a data-dependent scalability problem that is not yet severe in the sample dataset |
| Low | Render/tooling inefficiency or a narrow concurrency edge case; verify with profiling before prioritizing |

## Findings overview

| ID | Severity | Finding | Runtime confirmation |
|---|---|---|---|
| PERF-01 | Critical | Empty search tokens create a non-terminating loop | 22,538 ms timer lag for two spaces |
| PERF-02 | High | Authentication and campaign restoration is a serial, duplicate-read waterfall | Repeated profile targets; 1.5–7.6 s route readiness |
| PERF-03 | High | Global providers load all campaign domains on every authenticated route | Confirmed on Privacy and every profiled route |
| PERF-04 | High | Notes are loaded twice, unbounded, across every campaign and every route | Two identical notes targets per reload |
| PERF-05 | High | Chapter structural operations serialize O(N) Firestore round trips | 12 static `await`-in-loop warnings; ~102-operation insert path |
| PERF-06 | High | Writes amplify into attribution reads and full-collection refreshes; batch actions multiply them | Direct control-flow evidence and six more loop warnings |
| PERF-07 | High | Group/campaign switching refreshes and then reloads the whole application | Direct control-flow evidence |
| PERF-08 | Medium | Multiple hooks own the same collections and issue redundant load work | Location target doubled; other startup queries were SDK-coalesced |
| PERF-09 | Medium | Home attribution repeatedly refetches user profiles | Six group-profile targets on Home versus two elsewhere |
| PERF-10 | Medium | All routes and full Lodash ship in one bundle; module graph has six cycles | 308.17 kB gzip single JS chunk |
| PERF-11 | Medium | Location traversal has cycle-driven infinite recursion and O(N²) scans | Static, data-dependent; sample has only five locations |
| PERF-12 | Medium | Reading progress repeatedly replaces a growing whole document | Static operation-shape evidence |
| PERF-13 | Medium | Profile and campaign-admin mutations reload data already held in context | Direct control-flow evidence |
| PERF-14 | Low | Note autosave paths can overlap and each saved edit incurs an attribution read | Static concurrency evidence |
| PERF-15 | Low | Duplicate providers and un-memoized context values amplify React renders | Static; React render profiler not run |

---

## PERF-01 — Empty search tokens create a non-terminating loop

Severity: **Critical**

The search input accepts any truthy query of at least two characters. It does not trim or remove empty terms before calling the synchronous search service.

The service uses `query.toLowerCase().split(' ')` and then searches for every term with a `while (index !== -1)` loop. For an empty term, `indexOf('', index + 1)` eventually returns `text.length`; subsequent starting positions are clamped to the same value, so the loop never advances to `-1`. It keeps allocating snippets until the search fails or the renderer recovers.

Affected code:

- [`useSearch.ts`](../../src/shared/hooks/useSearch.ts#L51) debounces but passes raw whitespace-bearing queries.
- [`SearchService.ts`](../../src/core/services/search/SearchService.ts#L171) creates empty terms and contains the non-advancing loop.
- [`SearchService.ts`](../../src/core/services/search/SearchService.ts#L108) also normalizes every document on every query and builds a regex per term/document.
- [`SearchBar.tsx`](../../src/shared/components/SearchBar.tsx#L163) renders every returned match snippet without a cap.

Measured evidence:

- `ring`: 13 ms main-thread timer lag, 24 result rows, 33 snippets.
- two spaces: **22,538 ms** timer lag and 23,001 ms total observation before recovery.

Leading whitespace (`" ring"`), trailing whitespace (`"ring "`), and repeated internal whitespace (`"one  ring"`) all generate an empty token.

Recommended direction: normalize once at the input boundary (`trim`, collapse whitespace, remove empty terms); add a guaranteed-progress/iteration guard; escape regex input; cap matches/results; and move/cancel heavy search work if the index can grow large. Add a regression test that asserts termination for leading, trailing, repeated, and whitespace-only input.

## PERF-02 — Authentication and campaign restoration is a serial duplicate-read waterfall

Severity: **High**

The normal restore path is sequential:

1. Load global user profile.
2. Load the same global user profile again in `GroupService.getGroups`.
3. Fetch every group document one by one.
4. Load the active group user profile.
5. Load the same group profile again as a campaign-membership check.
6. Load the campaigns collection.
7. Only then expose the active campaign and start campaign collection loads.

Affected code:

- [`FirebaseContext.tsx`](../../src/features/user-management/auth/context/FirebaseContext.tsx#L202) profile retry and [`loadGroups`](../../src/features/user-management/auth/context/FirebaseContext.tsx#L233).
- [`FirebaseContext.tsx`](../../src/features/user-management/auth/context/FirebaseContext.tsx#L85) group profile followed by campaign loading.
- [`GroupService.ts`](../../src/core/services/firebase/group/GroupService.ts#L79) global profile read plus serial group loop at line 92.
- [`CampaignService.ts`](../../src/core/services/firebase/campaign/CampaignService.ts#L99) repeats the group-profile membership read before loading campaigns.
- [`AuthService.ts`](../../src/core/services/firebase/auth/AuthService.ts#L152) performs additional global/group profile reads during explicit sign-in while the auth-state callback is restoring the same context.

Runtime evidence on every reload:

- two `users/<user>` targets;
- two `groups/<group>/users/<user>` targets before page-specific work;
- two distinct group documents fetched serially for the test user's two groups;
- manual sign-in raised group-profile targets to seven once Home attribution was included;
- campaign context appeared after 1.5–2.1 seconds on Home; NPC page readiness ranged from 2.5–7.6 seconds.

The missing-profile retry makes the failure case worse. It performs up to three reads and waits one second after every null result, including the final failed attempt, imposing at least three seconds before surfacing the error.

Recommended direction: make one restore orchestrator own a single immutable snapshot; reuse the already-loaded global and group profiles; fetch independent group documents concurrently or change the data model/query; remove the final unnecessary retry delay; and ensure manual sign-in does not duplicate the auth observer's work. Measure request counts as part of an auth integration test.

## PERF-03 — Global providers load every campaign domain on every route

Severity: **High**

All domain providers sit above the router. Once a user and campaign are restored, they load chapters, NPCs, locations, rumors, quests, story progress, notes, usage status, and search data regardless of which route is visible.

Affected code:

- [`App.tsx`](../../src/app/App.tsx#L40) nests every data provider around all routes.
- [`UsageContext.tsx`](../../src/features/collaboration/entity-extraction/context/UsageContext.tsx#L46) invokes the usage callable after sign-in.
- [`NotePage.tsx`](../../src/pages/notes/NotePage.tsx#L232) is the only active usage meter; [`Layout.tsx`](../../src/app/layout/Layout.tsx#L26) confirms the former global indicator no longer renders.
- [`SearchContext.tsx`](../../src/shared/context/SearchContext.tsx#L106) mounts additional domain hooks to build a global search index.

The Privacy page was the clearest proof. Its heading rendered in 145–207 ms, but the application still issued targets for every campaign domain, loaded notes twice, called `getUsageStatus`, and spent 2.2–6.7 seconds finishing unrelated campaign context work.

Entity pages couple their loading UI to the same global restoration chain, so a simple NPC or Locations page cannot render its own data until unrelated auth/group/campaign work completes.

Recommended direction: scope providers and queries to route/feature demand; keep only authentication and minimal navigation state global; lazy-load search/usage/notes; and introduce a query cache so routes can declare data dependencies without duplicating ownership.

## PERF-04 — Notes are loaded twice, unbounded, on every authenticated route

Severity: **High**

`NoteProvider` reads `groups/{group}/users/{user}/notes` without a campaign constraint, stores all note IDs, and filters by `campaignId` in memory. Its callback depends on both group and active campaign even though the Firestore path does not use the campaign. During restoration it therefore runs once when the group arrives and again when the campaign arrives.

Affected code:

- [`NoteContext.tsx`](../../src/features/collaboration/notes/context/NoteContext.tsx#L46) loads the full notes collection.
- [`NoteContext.tsx`](../../src/features/collaboration/notes/context/NoteContext.tsx#L66) filters the full result client-side.
- [`NoteContext.tsx`](../../src/features/collaboration/notes/context/NoteContext.tsx#L99) includes `activeCampaignId` in the callback dependency list and refires through the effect at line 101.
- [`App.tsx`](../../src/app/App.tsx#L48) mounts it for every route.

Both runtime runs observed exactly two identical notes targets on Home, Privacy, NPCs, Locations, and Notes. Cost grows with a user's notes across all historical campaigns, not with the active campaign.

Recommended direction: query only the active campaign's notes (with the required index), avoid firing before all path/query inputs are ready, cache results by group/user/campaign, and mount note data only where the note UI or global action truly needs it.

## PERF-05 — Chapter structural operations serialize O(N) remote round trips

Severity: **High**

Chapter IDs encode order. Reordering therefore rewrites and verifies many documents one at a time.

Affected code:

- [`StoryContext.tsx`](../../src/features/storytelling/chapters/context/StoryContext.tsx#L339) pre-refreshes before a simple update and post-refreshes afterwards.
- [`StoryContext.tsx`](../../src/features/storytelling/chapters/context/StoryContext.tsx#L458) sequentially writes and verifies affected reorder documents.
- [`StoryContext.tsx`](../../src/features/storytelling/chapters/context/StoryContext.tsx#L501) inserts by shifting each later chapter with set → get verification → delete.
- [`StoryContext.tsx`](../../src/features/storytelling/chapters/context/StoryContext.tsx#L603) deletes and shifts later chapters with the same three-round-trip sequence.
- [`StoryContext.tsx`](../../src/features/storytelling/chapters/context/StoryContext.tsx#L678) repeats the sequence for bulk reorder.
- [`DocumentService.ts`](../../src/core/services/firebase/data/DocumentService.ts#L389) already exposes a Firestore write-batch primitive, but these paths do not use it.

Operation shape:

- Insert before `M` existing chapters: `3M + 6` remote operations (pre-query, `M × [set/get/delete]`, collision read, attribution-profile read, create write, verify read, post-query).
- Inserting at the beginning of the 32-chapter sample: about **102** serialized operations.
- Delete the first of 32 chapters: about **96** serialized operations.
- Reorder: two or three operations per affected chapter plus collection refreshes.

The pre-refresh in `updateChapter` does not update the captured `chapters` value inside the already-running callback, so it adds latency without guaranteeing that the following calculation uses fresh data.

Focused ESLint reported 12 `await`-inside-loop warnings in this file.

Recommended direction: decouple stable document identity from display order; use a transaction/batch for atomic order changes; remove per-document verification reads from the user-facing path; and refresh once only when local state cannot be updated safely. Add tests that assert an operation-count ceiling as chapter count grows.

## PERF-06 — Writes amplify into attribution reads and whole-collection refreshes

Severity: **High**

The generic attributed write path reads the active group user profile for every create/update to obtain username/character metadata. Most context actions then reload their full entity collection even when the result is already known or optimistically applied.

Core amplification:

- [`DocumentService.ts`](../../src/core/services/firebase/data/DocumentService.ts#L88) and [`DocumentService.ts`](../../src/core/services/firebase/data/DocumentService.ts#L123) fetch the same group profile for creation/modification attribution.
- [`DocumentService.ts`](../../src/core/services/firebase/data/DocumentService.ts#L172) adds a collision read for explicit IDs.
- [`NPCContext.tsx`](../../src/features/campaign-entities/npcs/context/NPCContext.tsx#L80) refreshes after note, relationship, create, update, and delete actions.
- [`QuestContext.tsx`](../../src/features/campaign-entities/quests/context/QuestContext.tsx#L120) refreshes after objective, status, create, update, delete, and relationship actions.
- [`RumorContext.tsx`](../../src/features/campaign-entities/rumors/context/RumorContext.tsx#L70) refreshes after every ordinary mutation.
- [`LocationContext.tsx`](../../src/features/campaign-entities/locations/context/LocationContext.tsx#L93) applies an optimistic update and dispatches an event that immediately performs a full refresh.
- [`NPCsPage.tsx`](../../src/pages/npcs/NPCsPage.tsx#L27) can refresh a second page-owned loader after the context already refreshed.
- [`QuestEditPage.tsx`](../../src/pages/quests/QuestEditPage.tsx#L116) explicitly refreshes again after `QuestEditForm` calls the context update that already refreshes.

Rumor batch amplification is especially severe:

- [`RumorBatchActions.tsx`](../../src/features/campaign-entities/rumors/components/RumorBatchActions.tsx#L48) updates statuses sequentially. Each selected rumor incurs an attribution-profile read, write, and full rumors query.
- [`RumorBatchActions.tsx`](../../src/features/campaign-entities/rumors/components/RumorBatchActions.tsx#L72) deletes sequentially and refreshes the full collection after every deletion.
- [`RumorContext.tsx`](../../src/features/campaign-entities/rumors/context/RumorContext.tsx#L241) combine/convert flows perform one attributed write per rumor sequentially, then refresh once.

The focused ESLint pass reported six serialized-await warnings across rumor batch/context and location deletion, in addition to the chapter warnings.

Recommended direction: reuse attribution already present in authenticated context; update the one entity in a shared cache; reserve full reloads for recovery; use write batches/transactions for multi-entity actions; and make page components consume the provider's single source of truth instead of layering refresh callbacks.

## PERF-07 — Context switching refreshes and then reloads the application

Severity: **High**

Applying a group/campaign change performs backend writes and refreshes, then unconditionally calls `window.location.reload()`.

Affected code:

- [`ContextSwitcher.tsx`](../../src/shared/components/ContextSwitcher.tsx#L68) awaits group/campaign changes and reloads at line 81.
- [`ContextSwitcher.tsx`](../../src/shared/components/ContextSwitcher.tsx#L150) also reloads after joining a group.
- [`useGroups.ts`](../../src/features/user-management/groups/hooks/useGroups.ts#L64) writes `activeGroupId`, then reloads the global profile and every group document through `refreshGroups`.
- [`useCampaigns.ts`](../../src/features/user-management/groups/hooks/useCampaigns.ts#L87) writes the group preference, then rechecks membership and reloads campaigns.

The subsequent browser reload immediately repeats PERF-02, PERF-03, and PERF-04. The pre-reload refresh results have almost no useful lifetime. On a group change, the local Firebase context is not actually switched by `switchGroup`; the reload is what finally restores the new context.

Recommended direction: implement one atomic context-switch transition that updates shared state, invalidates only group/campaign-scoped caches, and loads the new minimum dataset. Do not refresh data that will be discarded by a reload.

## PERF-08 — Multiple hooks own and load the same collections

Severity: **Medium**

`useFirebaseData` automatically calls `getData` on mount and on the global auth event. Contexts frequently instantiate one hook to read and a second hook only to obtain write methods; the write-only instance still owns loading/data state. Search and some pages add more independent read instances.

Affected code:

- [`useFirebaseData.ts`](../../src/shared/hooks/useFirebaseData.ts#L25) loader, mount effect at line 42, and auth listener at line 47.
- [`SearchContext.tsx`](../../src/shared/context/SearchContext.tsx#L112) creates fresh chapter, NPC, location, and rumor hooks rather than consuming existing providers.
- [`NPCContext.tsx`](../../src/features/campaign-entities/npcs/context/NPCContext.tsx#L15), [`LocationContext.tsx`](../../src/features/campaign-entities/locations/context/LocationContext.tsx#L15), [`RumorContext.tsx`](../../src/features/campaign-entities/rumors/context/RumorContext.tsx#L13), [`QuestContext.tsx`](../../src/features/campaign-entities/quests/context/QuestContext.tsx#L36), and [`StoryContext.tsx`](../../src/features/storytelling/chapters/context/StoryContext.tsx#L79) all have split data/write ownership.
- [`NPCsPage.tsx`](../../src/pages/npcs/NPCsPage.tsx#L11) and [`NPCsEditPage.tsx`](../../src/pages/npcs/NPCsEditPage.tsx#L11) load NPCs independently from `NPCProvider`.
- [`LocationDirectory.tsx`](../../src/features/campaign-entities/locations/components/LocationDirectory.tsx#L112) mounts another `locations` loader under the misleading comment “real-time updates”; `getDocs` is not a real-time subscription.

The Firestore SDK coalesced most simultaneous startup queries, so the initial runtime trace saw one target per entity collection. This limits server-read impact but not duplicated effects, transforms, promises, loading state, or React updates. The later LocationDirectory loader did not overlap and produced **two actual location targets** in both runs.

Recommended direction: one query/cache owner per collection/context key; separate mutation commands from auto-loading query hooks; let search consume provider/cache snapshots; and replace “real-time” comments with either a true subscription or an explicit refresh policy.

## PERF-09 — Home attribution repeatedly refetches user profiles

Severity: **Medium**

Home reacts to five independently populated entity arrays. Each execution collects every `createdBy`/`modifiedBy` UID and fetches group profiles. Deduplication exists only within one execution; there is no cache across effect runs, and the code requests UIDs even when embedded username/character fields may already be sufficient.

Affected code:

- [`HomePage.tsx`](../../src/pages/HomePage.tsx#L52) collects attribution UIDs from quests, NPCs, rumors, locations, and chapters.
- [`HomePage.tsx`](../../src/pages/HomePage.tsx#L90) refetches whenever any of those arrays changes.
- [`attribution-utils.ts`](../../src/shared/utils/attribution-utils.ts#L145) deduplicates per call and uses parallel requests, but has no cross-call cache.
- [`AttributionInfo.tsx`](../../src/shared/components/AttributionInfo.tsx#L41) can add one or two per-card fallback lookups when embedded names are missing.

Both runtime runs observed six group-user-profile targets on Home versus two on every non-Home route: four repeat reads attributable to Home. Manual sign-in observed seven because the explicit auth service adds another overlapping lookup.

Recommended direction: cache attribution by `(groupId, uid)`; request only UIDs lacking embedded display data; initialize attribution once after the shared entity snapshot settles; and pass the active user's already-loaded group profile directly.

## PERF-10 — One eager bundle contains all routes and full Lodash

Severity: **Medium**

Every page is statically imported before routing. The optimized build emitted one 1,138,710-byte minified JavaScript file (**308.17 kB gzip**) and no route chunks.

Affected code:

- [`App.tsx`](../../src/app/App.tsx#L20) statically imports Home, story, quest, NPC, location, rumor, note, Privacy, and Contact pages.
- [`SearchService.ts`](../../src/core/services/search/SearchService.ts#L3) default-imports all of Lodash for only `uniq`, `groupBy`, and `flatMap`.

Source-map attribution found 278,606 minified bytes under `features/`, 84,919 under `pages/`, and **71,588 bytes of Lodash**. Lodash is not a declared runtime dependency; it resolves through hoisted build/test dependencies.

Madge also found six circular dependency chains, primarily barrel-import cycles between campaign/collaboration features and cycles where layout helpers import types/values back from `HomePage`. These cycles are not claimed as a measured delay, but they make reliable tree-shaking and route splitting harder.

Recommended direction: add route-level lazy boundaries; avoid feature barrels in cross-feature internals; move shared types away from page modules; import small Lodash functions directly or use native equivalents; and add a bundle-size/chunk budget to CI.

## PERF-11 — Location traversal can loop forever on cycles and performs O(N²) work

Severity: **Medium**

The location hierarchy assumes valid acyclic parent data but does not enforce that assumption at read time.

Affected code:

- [`LocationDirectory.tsx`](../../src/features/campaign-entities/locations/components/LocationDirectory.tsx#L141) finds orphan keys with `locations.some` inside a loop: worst-case O(N²).
- [`LocationDirectory.tsx`](../../src/features/campaign-entities/locations/components/LocationDirectory.tsx#L148) walks parents with repeated `locations.find` and no visited set. Highlighting a node in a parent cycle never terminates.
- [`LocationDirectory.tsx`](../../src/features/campaign-entities/locations/components/LocationDirectory.tsx#L201) recursively matches descendants without cycle protection.
- [`LocationDirectory.tsx`](../../src/features/campaign-entities/locations/components/LocationDirectory.tsx#L255) recursively auto-expands matches without cycle protection.
- [`LocationContext.tsx`](../../src/features/campaign-entities/locations/context/LocationContext.tsx#L185) recursively filters the full array for every node, has no visited set, then deletes every descendant sequentially.
- Relationship rendering performs repeated linear `getNPCById`/`getQuestById` lookups per row.

The five-location sample is too small to expose the scaling cost. A malformed cycle can turn it into a lockup regardless of size.

Recommended direction: build `Map` indexes once; validate/reject parent cycles on writes; keep a visited set and depth guard on every traversal; and batch descendant deletion. Firestore has no client-side referential cascade that requires one network round trip per hierarchy level.

## PERF-12 — Reading progress replaces a growing whole document

Severity: **Medium**

Scroll/page progress is throttled to 1,500 ms, which is good, but every emission copies the entire `chapterProgress` map and replaces `story-progress/current-progress`. `updateCurrentChapter` replaces the same whole document. As chapter count grows, each small progress change sends a larger object and concurrent fire-and-forget updates can overlap.

Affected code:

- [`ChapterReader.tsx`](../../src/features/storytelling/stories/components/ChapterReader.tsx#L14) 1,500 ms leading/trailing throttle.
- [`StoryContext.tsx`](../../src/features/storytelling/chapters/context/StoryContext.tsx#L114) explicitly documents whole-document replacement.
- [`StoryContext.tsx`](../../src/features/storytelling/chapters/context/StoryContext.tsx#L206) persistence, [`updateChapterProgress`](../../src/features/storytelling/chapters/context/StoryContext.tsx#L235), and [`updateCurrentChapter`](../../src/features/storytelling/chapters/context/StoryContext.tsx#L290).

Recommended direction: persist only changed nested fields or separate per-chapter progress records; coalesce in-flight updates; retain the existing throttle and completion deduplication; and monitor document size/write rate.

## PERF-13 — Profile and campaign-admin mutations reload already-held data

Severity: **Medium**

Profile updates call `refreshUserProfile`, which rereads the global profile and, when an active group exists, runs `setActiveGroupContext` again. That reloads the group profile, repeats it inside `getCampaigns`, and reloads campaigns. UserProfile invokes the group-update path for character and preference operations.

Affected code:

- [`useUser.ts`](../../src/features/user-management/profiles/hooks/useUser.ts#L20) global update plus refresh; group update plus refresh at line 42; username change plus refresh at line 90.
- [`UserProfile.tsx`](../../src/features/user-management/profiles/components/UserProfile.tsx#L199) contains multiple character/preference actions that call `updateGroupUserProfile`.

Campaign administration duplicates in a similar way. The view loads campaigns on mount even when context already has them. Create/update/delete hooks refresh campaigns, then the component calls `getCampaigns` again.

- [`CampaignManagementView.tsx`](../../src/features/user-management/admin/components/CampaignManagementView.tsx#L79) unconditional view-local load.
- [`CampaignManagementView.tsx`](../../src/features/user-management/admin/components/CampaignManagementView.tsx#L116) create then second load; delete and edit repeat it at lines 145 and 185.
- [`useCampaigns.ts`](../../src/features/user-management/groups/hooks/useCampaigns.ts#L40) refreshes after every campaign mutation.
- [`CampaignService.ts`](../../src/core/services/firebase/campaign/CampaignService.ts#L45) adds membership/collision reads around create/update.

Admin group-user and token views also load complete collections without pagination; that becomes a separate scaling cost for large groups.

Recommended direction: patch the relevant profile/campaign in the shared cache; refresh only the changed scope; remove view-local duplicate ownership; and paginate admin-only collections.

## PERF-14 — Note autosave operations can overlap

Severity: **Low**

Note editing has a two-second idle debounce, a 30-second dirty-note interval, manual save, and imperative save. They share `performAutosave`, but `isSaving` is display state rather than an in-flight guard. A debounce firing near the interval boundary—or manual save during an autosave—can send overlapping writes with the same content.

Affected code:

- [`NoteEditor.tsx`](../../src/features/collaboration/notes/components/NoteEditor.tsx#L145) shared autosave.
- [`NoteEditor.tsx`](../../src/features/collaboration/notes/components/NoteEditor.tsx#L181) debounce and [`NoteEditor.tsx`](../../src/features/collaboration/notes/components/NoteEditor.tsx#L190) interval.
- [`NoteContext.tsx`](../../src/features/collaboration/notes/context/NoteContext.tsx#L180) each saved update uses the attributed write path, including a group-profile read.

Recommended direction: serialize/coalesce saves with a promise/ref, cancel the pending debounce after any successful save, skip unchanged snapshots, and reuse cached attribution.

## PERF-15 — Provider/value churn causes avoidable renders

Severity: **Low**

`NavigationProvider` is mounted twice: once around `RouterWrapper` and again inside `App`. Each tracks navigation state and updates on route changes. The inner provider shadows the outer one for most consumers.

`FirebaseContext` and the NPC, Location, Story, Rumor, Quest, and Note providers create new value objects rather than memoizing them. During the many awaited stages of auth/data restoration, each provider update can invalidate all consumers; nested provider rerenders recreate more context values and cascade further.

Affected code:

- [`index.tsx`](../../src/index.tsx#L101) outer NavigationProvider and development StrictMode.
- [`App.tsx`](../../src/app/App.tsx#L40) inner NavigationProvider.
- [`FirebaseContext.tsx`](../../src/features/user-management/auth/context/FirebaseContext.tsx#L325) un-memoized value.
- [`NPCContext.tsx`](../../src/features/campaign-entities/npcs/context/NPCContext.tsx#L198), [`LocationContext.tsx`](../../src/features/campaign-entities/locations/context/LocationContext.tsx#L263), [`RumorContext.tsx`](../../src/features/campaign-entities/rumors/context/RumorContext.tsx#L337), [`QuestContext.tsx`](../../src/features/campaign-entities/quests/context/QuestContext.tsx#L299), [`StoryContext.tsx`](../../src/features/storytelling/chapters/context/StoryContext.tsx#L745), and [`NoteContext.tsx`](../../src/features/collaboration/notes/context/NoteContext.tsx#L434).

Recommended direction: remove the duplicate provider, memoize provider values and stable actions, split broad contexts by update frequency, and confirm the payoff with the React Profiler before treating this as higher priority.

---

## Prioritized remediation order

This review does not implement changes, but the evidence supports the following order:

1. **Guarantee search termination** and add whitespace regression tests.
2. **Collapse authentication restore into one cached data flow**, including profile/group/campaign reuse and concurrent group reads.
3. **Stop route-independent global fetching**, beginning with double notes loads and global usage status.
4. **Replace chapter and rumor serial remote loops with atomic batch/transaction designs** and stable chapter identity.
5. **Eliminate full-collection reloads after ordinary writes** and cache attribution.
6. **Replace context-switch refresh-plus-reload with targeted invalidation.**
7. **Add route code splitting and remove full Lodash.**
8. Address location cycle guards, progress-document growth, admin/profile duplicate refreshes, and render churn.

## Suggested performance budgets

These make future regressions observable:

- Authenticated restore: at most one global profile read and one active group-profile read.
- Unrelated public route: zero campaign collection reads and zero usage callable invocations.
- Notes: one campaign-constrained query when notes are actually needed.
- Single entity update: one write, no full collection read in the success path.
- Batch mutation: O(1) commits/queries, not O(selected items) collection reloads.
- Chapter reorder: bounded number of transactions/batches, independent of network round trips per chapter.
- Search: termination test plus a main-thread budget on a representative full index.
- Bundle: route chunks plus a CI ceiling for initial gzip JavaScript.

## Positive observations

- The earlier Story progress refetch loop was removed and documented in `initial-findings.md`.
- The Firestore SDK coalesced several simultaneous identical startup requests; the report does not overstate those as separate server targets.
- Search already has a 300 ms debounce, so ordinary queries were responsive on the sample index once the empty-token bug was absent.
- Chapter reading progress has a leading/trailing throttle and a guard against duplicate final-page emissions.
- `DocumentService.batchOperations`, server-side `BulkWriter`, and batched delete paths already exist, providing patterns for the serial client workflows.
- Several large derived views use `useMemo`, and Home attribution deduplicates UIDs within a single execution and fetches them in parallel.
- The focused baseline is green: seven relevant suites and 167 tests passed.

## Coverage and exclusions

Reviewed areas:

- application entry point, router, layouts, and provider tree;
- authentication, group, campaign, profile, invitation, and document services;
- chapter/story, NPC, location, rumor, quest, note, usage, search, and attribution flows;
- client timers, effects, event listeners, recursive/iterative loops, post-write refreshes, and unbounded collection reads;
- Functions called during route load and bulk delete implementation;
- optimized build, source-map composition, dependency cycles, focused lint rules, and relevant tests;
- Home, Privacy, NPC, Locations, and Notes reloads plus manual sign-in and search.

Not executed to protect emulator data:

- chapter create/reorder/delete;
- rumor batch mutation;
- location cascade delete;
- group/campaign/profile switching or destructive administration.

Those workflows are documented from exact operation control flow rather than speculative timing.
