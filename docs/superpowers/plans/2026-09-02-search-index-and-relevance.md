# PR 5 — Search actually returns results — implementation plan

> **Execution model:** this plan is executed by **Sonnet subagents**, one task per subagent, with
> Opus as orchestrator and reviewer. At most **two** subagents run concurrently. Read
> "How this plan is executed" before dispatching anything. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make search return results at all, then make the results it returns mean something. The
index is currently never built in any campaign missing one of five collections; when it is built,
relevance is scored against the wrong string, fuzzy matching over chapter bodies manufactures
false positives with no snippet to show for them, and a `(` in the query throws a `SyntaxError`
that surfaces to the user as "No results found".

**Architecture:** Three layers change, bottom-up. `core/services/search/SearchService.ts` gets a
matching and scoring rewrite — subsequence matching confined to titles, literal word-prefix
matching over content, relevance computed from the real query, one snippet plus a count per
result, global ordering before per-type capping. `shared/context/SearchContext.tsx` stops gating
index construction on every collection being non-empty and gains notes as a sixth document type.
`shared/hooks/useSearch.ts` tightens the debounce and stops leaving stale results on screen. The
duplicate implementation in `shared/utils/search.ts` is deleted.

**Tech Stack:** React 18.2 + TypeScript, Firebase 11.3, TailwindCSS with a token-based theme
system, Jest + React Testing Library, `lucide-react`, `clsx`, `lodash`, `react-router-dom` v6.

**Spec:** the PR 5 brief in the session that created this plan. Each task's brief below carries the
facts that task needs; a subagent does not have to read anything else to work.

**No design reference.** This PR has no UI design. It is the correctness half of design `8a`, split
out so it can ship without waiting on the header redesign (PR 6). The existing dropdown may look
exactly as it looks today, with the two exceptions Task 5b names.

---

## How this plan is executed

### Roles

| Role | Who | Does |
|---|---|---|
| **Orchestrator / reviewer** | Opus, the main session | Dispatches one brief per task, reviews every diff, runs the batch gate, writes every commit, owns Task 6 |
| **Implementer** | Sonnet subagent, one per task | Executes exactly one task's steps, runs that task's targeted tests, reports back. **Never commits, never pushes, never touches a file outside its allow-list** |

A subagent starts cold: it has no memory of the design conversation and no reason to know this
repo's conventions. Everything it needs is in its brief. If a brief turns out to be missing
something, that is an orchestrator bug — fix the brief in this file, then re-dispatch.

### Batches

Two subagents at a time, at most. Batches are cut so the two agents in a batch have **disjoint
file allow-lists** — that is what makes it safe for them to share one working tree, and what lets
the orchestrator stage each task's paths into its own commit afterwards.

| Batch | Tasks | Parallel? | Why they can share a tree |
|---|---|---|---|
| 1 | 1, 2 | Yes | Task 1 owns `core/types/search.ts` + `core/services/search/**`; Task 2 only deletes `shared/utils/search.ts` and its test |
| 2 | 3, 4 | Yes | Task 3 owns `shared/context/SearchContext.tsx` + its behavioural test; Task 4 owns `shared/hooks/useSearch.ts` + its test |
| 3 | 5a, then 5b | **No, sequential** | 5a adds `'note'` to `SearchResultType`, which breaks `SearchBar`'s two exhaustive `Record<SearchResultType, …>` maps until 5b repairs them. `npx tsc --noEmit` is **expected red between 5a and 5b**; the batch gate runs after 5b only |
| — | 6 | Orchestrator | Baseline bookkeeping and the live verification; not delegated |

**Task 5a and Task 3 both touch `SearchContext.tsx` and must not run together.** That is why notes
indexing is batch 3 and not batch 2.

### The commit protocol

Subagents leave their work in the working tree and report. They do **not** run `git commit`,
`git add`, `git push`, `git checkout` or `git stash` — a subagent that commits makes the batch
unreviewable and can strand its partner's uncommitted work.

After each batch the orchestrator:

1. Reads the full diff for each task's allow-list, separately.
2. Runs the batch gate (below).
3. Stages **one task's paths at a time** and writes that task's commit, in task order.

### The batch gate

Run by the orchestrator after every batch, never by a subagent:

```bash
npx tsc --noEmit
npm test
```

and once before proposing the merge:

```bash
npm run build
```

`npm run build` is not implied by the other two: `react-scripts`' webpack honours tsconfig
`baseUrl` but ignores `paths`, so an `@/…` import passes `tsc` and jest and then fails the
production build. **Run it after batch 1 as well**, because batch 1 deletes a module — a stale
import survives `tsc` less often than it survives jest, but the bundle is the only place a
resolver disagreement actually shows up.

**Baseline: 227 suites / 4615 passed / 2 skipped / 4617 total**, measured on this branch at
`fef0f09` before batch 1, fully green. Any red is a regression.

**Running total after each batch** — compare against the row above yours and reconcile the delta
against what the diffs actually added. A delta that does not reconcile is a finding.

| After batch | Suites | Passed | Total | Delta | Accounted for by |
|---|---|---|---|---|---|
| baseline | 227 | 4615 | 4617 | — | — |
| 1 (tasks 1, 2) | 226 | 4607 | 4609 | −1 suite, −8 | `SearchService.test.ts` 24 → 40 (+16); deleted `shared/utils/__tests__/search.test.ts` (−1 suite, −24). 4615 + 16 − 24 = 4607 ✓ |
| 2 (tasks 3, 4) | 226 | 4620 | 4622 | +13 | `SearchContext.behavioral` + `useSearch` measured together: 43 → 56. Nothing changed elsewhere |
| 3a (task 5a) | — | — | — | — | Not gated separately: `tsc` is red between 5a and 5b by design |
| 3b (task 5b) | 226 | 4629 | 4631 | +9 | `SearchContext.behavioral` + `SearchBar` measured together: 61 → 70. `SearchService.test.ts` count unchanged (`note: []` additions only) |

> CLAUDE.md records 4538/4540 measured on `redesign/context-switcher`, and the profile-page plan
> records 4543/4545 — both are stale. The baseline row above is the measured truth for this
> branch; compare against it, not against CLAUDE.md. Task 6 corrects CLAUDE.md.

### Review checklist — what the orchestrator checks on every returned diff

Sonnet is good at these tasks and bad at noticing when a task quietly became a different task.

- [ ] **No file outside the allow-list was touched.** `git status --short` against the brief.
- [ ] **No test was weakened.** Diff every `__tests__` change. An assertion that got looser, a
      `toBe` that became `toBeTruthy`, a removed case, a `skip` — all are regressions dressed as
      progress. The only legitimate test deletions in this plan are named in Task 2, plus the
      rewrites explicitly named in Tasks 1, 3 and 4.
- [ ] **The tests actually ran and actually failed first.** The report must quote the failing run.
      A test that passed before the implementation was written is testing nothing.
- [ ] **No `@/…` import in shipping code.** Allowed only under `__tests__/` and `test-utils/`.
- [ ] **No hardcoded colour.** Hex, `rgb(`, or a Tailwind palette class like `text-red-500`.
- [ ] **No `new RegExp` built from unescaped user input** anywhere in the diff.
- [ ] **JSDoc on every exported component, hook and function**, and double quotes per ESLint.
- [ ] **No file over ~400 lines.**

### The constraints block

Every brief opens with this block, verbatim. It is repeated per task on purpose: a cold subagent
that has to go looking for the rules will invent them instead.

> **Repo constraints — read before writing any code**
>
> 1. **Never edit a test to make it pass.** Tests define expected behaviour. If a test fails, the
>    code is wrong — or the test describes something this plan changes on purpose, in which case
>    your brief names that test explicitly. If it does not, stop and report; do not edit.
> 2. **No hardcoded colours.** Use theme tokens or the existing utility classes (`card`,
>    `dropdown`, `dropdown-item`, `typography`, `typography-secondary`, `hint`, …).
> 3. **No `@/…` imports in shipping code** — webpack ignores tsconfig `paths` and the production
>    build fails with `Module not found`. Use bare `baseUrl` imports (`core/types/search`,
>    `shared/hooks/useSearch`). `@/…` is allowed only under `__tests__/` and `test-utils/`.
> 4. **Import from a feature's barrel (`features/<domain>`), never its internals.**
> 5. **Double quotes**, JSDoc on every export, no file over ~400 lines.
> 6. **Do not commit, add, push, checkout or stash.** Leave your work in the working tree and
>    report. Do not touch any file outside your allow-list.
> 7. Run your targeted tests with
>    `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="<pattern>"`.

---

## Task 1 — Rewrite `SearchService` matching, scoring and snippets

**Batch 1, parallel with Task 2.**

**Allow-list**

```
src/core/types/search.ts
src/core/services/search/SearchService.ts
src/core/services/search/__tests__/SearchService.test.ts
```

**Do NOT add `'note'` to `SearchResultType` in this task.** Task 5a does that, together with the
`SearchBar` maps that would otherwise stop compiling. Adding it here breaks the batch gate.

> **Brief correction, made during batch 1.** This allow-list was wrong: making `matchCount`
> required on `SearchResult` breaks five `SearchResult` fixtures in
> `src/shared/components/__tests__/SearchBar.test.tsx` (lines 70, 77, 298, 322, 346), which Task 1
> may not touch — so the batch gate could not have gone green. The **orchestrator** added
> `matchCount: 1` to those five fixtures during the batch-1 review; each already carried exactly
> one snippet, so `1` is the honest value. Task 5b inherits the file with those fixtures already
> correct. The alternative — declaring `matchCount?: number` — was rejected: an optional count
> would let a consumer silently read `undefined` where a number is always available.

### What is wrong today

Read `src/core/services/search/SearchService.ts` first. Four defects, all in this file:

1. **Relevance is scored against the wrong string.** `processResults` calls
   `this.calculateRelevance({…}, result.matches[0] || '')` — it passes the **first extracted
   snippet** instead of the query. Every result is therefore scored against a slice of its own
   text, so the `score += 100` title weighting fires essentially at random and ordering is
   arbitrary. An exact title match can sort below a mid-chapter mention.
2. **Fuzzy matching is unanchored over whole chapter bodies.** `fuzzyMatch` builds
   `word.split('').join('.*')` — `"droop"` becomes `/d.*r.*o.*o.*p/i`. Against a chapter's full
   `content` (thousands of characters) that matches almost anything.
3. **A fuzzy-only match renders as a title with no snippet.** When a document matches only
   fuzzily, `extractMatches` finds no literal `indexOf` hit and returns `[]`, so a false positive
   is indistinguishable from a real hit.
4. **Unescaped user input reaches `new RegExp`.** Typing `(` throws `SyntaxError`.

Plus: `processResults` sorts only **within** each type group, so cross-type ordering is whatever
`_.groupBy` happened to produce. And `extractMatches` returns every occurrence uncapped, so a
chapter mentioning "obelisk" twenty times yields twenty snippets.

### Steps

- [ ] **Types first.** In `src/core/types/search.ts`:
  - Add `matchCount: number` to `SearchResult` — the total number of content occurrences found,
    of which `matches` now carries at most one.
  - Delete the `SearchIndex` interface. It has no importers anywhere in `src/` (verify with
    `grep -rn "SearchIndex" src/`) and its key names (`quests`, `npcs`, `locations`) do not even
    match `SearchResultType`. Leave `SearchDocument` and `SearchResultType` otherwise as they are.
- [ ] **Write the failing tests before the implementation**, in
      `src/core/services/search/__tests__/SearchService.test.ts`. Keep every existing test that
      still describes correct behaviour. Three existing tests describe behaviour this task changes
      on purpose and **may be rewritten** — say so in your report, quoting before and after:
  - `'should find results when fuzzyMatch=true and query characters appear in order'` (~line 235)
    — subsequence matching now applies to **titles only**, not content. Rewrite it so the
    subsequence lands in the title.
  - `'should deduplicate identical match snippets'` (~line 267) — there is now at most one
    snippet, so dedup is vacuous. Rewrite it as a cap assertion: `matches.length <= 1` and
    `matchCount` equal to the true number of occurrences.
  - `'title matches should rank higher than content-only matches'` (~line 281) — keep the intent,
    strengthen it so it passes for the *right* reason (see the cross-type test below).

  New tests to add:
  - A document whose **title** is the query outranks a document that merely mentions the query in
    its body — **and the two are of different `type`s**, proving ordering is global, not per-type.
  - A query containing regex metacharacters (`(`, `[`, `*`, `+`, `?`, `\`) **does not throw** and
    returns a sane result set (empty is fine; throwing is not). Cover at least `"("` and `"a["`.
  - A long `content` (≥ 2000 chars) containing the query's letters scattered in order but never as
    a word — e.g. query `"droop"` against prose containing `d…r…o…o…p` across sentences — returns
    **no** result for that document.
  - A document that matches nothing in its title and yields no content snippet is **dropped**, not
    returned with an empty `matches` array.
  - A document whose content contains the query twenty times returns `matches.length === 1` and
    `matchCount === 20`.
  - A word-prefix content match is found (query `"obel"` matches content `"the obelisk hums"`)
    while a mid-word match is not (query `"belisk"` does not match `"the obelisk hums"`).
- [ ] **Escape helper.** Add a private `escapeRegExp(input: string): string` implementing
      `input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")`. Use it anywhere a regex is still built from
      query text. Prefer not building one at all — the two algorithms below need no regex.
- [ ] **Title matching — subsequence, no regex.** Add a private
      `isSubsequence(haystack: string, needle: string): boolean`, a two-pointer scan over the
      prepared (lowercased, trimmed) strings. This replaces `fuzzyMatch` entirely and removes the
      injection surface rather than escaping around it. Typo tolerance is worth having on a title;
      it is not worth having on a chapter body.
- [ ] **Content matching — literal, word-prefix anchored.** Add a private
      `findWordMatches(content: string, word: string): number[]` that walks `indexOf` over the
      prepared content and keeps an occurrence only when it starts at index `0` or is preceded by
      a non-word character (`/\W/` on the preceding char). That is the "prefix match per word"
      behaviour: `"obel"` hits `"obelisk"`, `"belisk"` does not. No `.*` chains, ever, against
      `content`.
- [ ] **`matchDocument`** becomes: prepared title literally includes the prepared query
      **OR** (`options.fuzzyMatch` and the query is a subsequence of the title)
      **OR** every whitespace-separated query word has at least one `findWordMatches` hit in the
      content. Nothing else.
- [ ] **`extractMatches` → one snippet plus a count.** Return
      `{ snippet: string | null; count: number }`. Collect occurrences across all query words via
      `findWordMatches`; `count` is the total; `snippet` is the context window
      (`options.contextLength`, default 50, either side) around the **best** occurrence — prefer an
      occurrence of the full query string if one exists, otherwise the earliest occurrence of the
      longest query word. `null` when there are none.
- [ ] **`createSearchResult`** sets `matches` to `snippet ? [snippet] : []` and `matchCount` to
      `count`. Keeping `matches` as an array of length 0 or 1 rather than a scalar is deliberate:
      `SearchBar` already maps over it, so no consumer breaks, and PR 6 can widen the cap later
      without another type change.
- [ ] **Drop empty results.** In `searchDocuments`, after building each result, discard it when
      `matches.length === 0` **and** the title did not match. A result with nothing to show is a
      false positive by construction.
- [ ] **Thread the query through scoring.** `search(query)` → `processResults(results, query)` →
      `calculateRelevance(doc, query)`. Delete the `result.matches[0] || ''` call site. Extend
      `calculateRelevance` so an exact title equality outranks a title that merely contains the
      query, which outranks a content match: keep the existing `+100` / `+50` / `+10` / `+5`
      ladder and add `+200` for `titleText === normalizedQuery` and `+50` for
      `titleText.startsWith(normalizedQuery)`.
- [ ] **Sort globally, cap per type.** In `processResults`: score everything, sort the whole array
      by `relevance` descending (tie-break on `title` ascending so ordering is stable and testable),
      then walk the sorted array keeping a per-`type` counter and dropping anything past
      `maxResultsPerType`. This preserves global ordering **and** the per-type cap; the current
      `_.groupBy` → per-group sort → `_.flatMap` does neither. Continue to strip `relevance` from
      the returned objects — no consumer needs it and PR 6 does not ask for it.
- [ ] Run `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="SearchService"`.

### Definition of done

- [ ] Relevance is computed from the query; a title match outranks a body mention **across types**.
- [ ] No `.*`-chain matching against `content`; subsequence matching is title-only.
- [ ] Results with no snippet and no title match are dropped.
- [ ] Regex-special characters in a query cannot throw.
- [ ] The service returns at most one snippet plus a `matchCount` per result.
- [ ] `SearchService.test.ts` is green and the three rewritten tests are justified in the report.

---

## Task 2 — Delete the duplicate search implementation

**Batch 1, parallel with Task 1.**

**Allow-list**

```
src/shared/utils/search.ts                     (delete)
src/shared/utils/__tests__/search.test.ts      (delete)
```

`src/shared/utils/search.ts` duplicates `fuzzySearch`, `extractMatches` and result processing that
`SearchService` also implements — the same bugs, in two copies. It carries the same unescaped
`new RegExp(query.split('').join('.*'))` injection as the service.

### Steps

- [ ] **Verify there are no importers outside its own test.** From the repo root:

      ```bash
      grep -rn "utils/search" src/ --include=*.ts --include=*.tsx
      grep -rn "fuzzySearch\|processSearchResults\|groupResultsByType" src/ --include=*.ts --include=*.tsx
      ```

      Expected: hits only in `src/shared/utils/search.ts` itself and
      `src/shared/utils/__tests__/search.test.ts`. `extractMatches` will also hit
      `SearchService.ts`, which has its own private copy — that is not an importer.
- [ ] **If, and only if, that holds:** delete both files.
- [ ] **If any other importer exists** — stop, do not delete. Report the importers and leave the
      tree untouched; the orchestrator will decide between re-exporting the service's helpers and
      migrating the caller.
- [ ] Confirm nothing else broke: `npx tsc --noEmit`.

### Definition of done

- [ ] `src/shared/utils/search.ts` is deleted, or the report explains exactly why it could not be.
- [ ] `npx tsc --noEmit` is clean.

---

## Task 3 — Build the index whenever there is any data, and discard stale searches

**Batch 2, parallel with Task 4.**

**Allow-list**

```
src/shared/context/SearchContext.tsx
src/shared/context/__tests__/behavioral/SearchContext.behavioral.test.tsx
```

**Do NOT add notes to the index in this task.** Task 5a does that, in the same file, afterwards.

### What is wrong today

`SearchProvider` gates index construction on *every* collection being non-empty:

```tsx
if (chapters.length && quests.length && npcs.length && locations.length && rumors.length) {
  initializeSearch();
}
```

The Phandelver campaign has **0 rumors**. The index is therefore never built, and every query
returns "No results found" — including "Droop", who is an NPC in that campaign. This is the bug
the PR is named for.

Separately, `handleSearch` catches every error and sets `results` to `[]` without logging the
query, so a thrown `SyntaxError` reaches the user as an empty result set with nothing in the
console to diagnose it by.

### Steps

- [ ] **Write the failing tests first**, in `SearchContext.behavioral.test.tsx`. The suite already
      module-mocks `features/storytelling` and `features/campaign-entities`; follow that pattern.
      One existing test describes behaviour this task inverts on purpose and **must be replaced**:
      `'should NOT call initializeIndex when any collection is empty'` (~line 357). Replace it
      with its opposite and say so in your report, quoting before and after. New tests:
  - **The regression test the PR exists for:** four populated collections and one empty array
    (`rumors: []`) still calls `initializeIndex`, and the documents it receives contain the NPC
    from the populated collection.
  - `initializeIndex` is **not** called when every collection is empty.
  - `initializeIndex` is called **again** when a collection that was empty arrives later
    (rerender the hook with new mock data and assert the call count went up) — collections load
    asynchronously and independently, so the index must rebuild as they arrive.
  - A search whose response is superseded by a newer query does not overwrite the newer results.
- [ ] **Replace the guard.** Compute
      `const totalDocs = chapters.length + quests.length + npcs.length + locations.length + rumors.length;`
      and in the effect `if (totalDocs === 0) return;` before calling `initializeSearch()`.
      `initializeIndex` replaces the index wholesale, so calling it repeatedly is safe. Keep the
      existing dependency array (`[searchService, chapters, quests, npcs, locations, rumors]`) —
      it is what makes the rebuild-on-arrival behaviour work.
> **Decision made during batch 2 — why `handleSearch` awaits a synchronous call.** Task 3 changed
> `searchService.search(q)` to `await searchService.search(q)`. `search()` returns an array, so the
> `await` only defers by a microtask. It was queried in review and kept, because the alternative is
> worse: with no await point anywhere in `handleSearch`, the whole body runs synchronously, two
> calls can never interleave, and the stale-response guard is **unreachable by construction** —
> dead code that no test can honestly exercise. The agent correctly reported that a test written
> against the synchronous version passes with or without the guard. The `await` makes the guard
> live and testable at the cost of one microtask, and React 18 batches across microtasks in the
> same tick, so `isSearching` does not flash an extra render. It also matches what PR 6's palette
> will need when search becomes genuinely async. The forward-looking test mocks `search()` as
> returning a promise — a shape the real service does not produce today, which is the point.

- [ ] **Discard stale responses.** Add a `useRef<number>` request counter in the provider.
      `handleSearch` increments it, captures the value, and applies `setResults` / `setIsSearching`
      only when the captured value is still the latest. `SearchService.search` is synchronous
      today, so this is belt-and-braces — but `handleSearch` is `async` and awaited by callers, and
      PR 6's palette will fire overlapping queries. Do it now, in the context, so `useSearch` and
      the future palette both inherit it.
- [ ] **Make the swallowed error diagnosable.** Keep the `catch`, but log the query with it:
      `console.error("Search error for query:", searchQuery, error);`. A crash reported to the
      user as "No results found" must at least be findable in the console.
- [ ] Run
      `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="SearchContext.behavioral"`.

### Definition of done

- [ ] The index builds whenever any collection has data; no all-or-nothing guard remains.
- [ ] The index rebuilds as collections arrive.
- [ ] A stale search response cannot overwrite a newer one.
- [ ] Search errors log the query.
- [ ] The behavioural suite is green and the replaced test is justified in the report.

---

## Task 4 — Debounce properly and stop showing stale results below the minimum length

**Batch 2, parallel with Task 3.**

**Allow-list**

```
src/shared/hooks/useSearch.ts
src/shared/hooks/__tests__/useSearch.test.ts
```

### What is wrong today

`SearchBar.handleInputChange` calls `onSearch` on every keystroke, and `SearchService.search`
walks every chapter body synchronously on the main thread. The hook debounces at 300 ms, which is
sluggish for a search-as-you-type field.

Worse: `minQueryLength: 2` means a one-character query silently returns nothing while the UI shows
the dropdown reading "No results found" — and, because the effect simply does not call
`handleSearch` below the minimum, **the previous query's results stay in state**. Type `dr`, get
hits, delete a character, and the dropdown still shows the hits for `dr` under a query of `d`.

Neither an empty field nor a one-character field is an error state, and neither should read like
one.

### Steps

- [ ] **Write the failing tests first**, in `useSearch.test.ts`. New tests:
  - The default debounce is **180 ms**: advancing timers by 179 ms does not call `handleSearch`;
    advancing past 180 ms does. (The existing test
    `'should use 300ms debounce and minQueryLength=2 by default'` at ~line 301 asserts the old
    value and **must be updated** to 180 — say so in your report, quoting before and after. This
    is the only existing test in this file this task may change.)
  - Dropping below `minQueryLength` **clears** results: with results present, rerender with a
    one-character query and assert the clearing path ran, so the consumer sees no results rather
    than the previous query's.
  - `isQueryTooShort` is `true` when the trimmed query is non-empty and shorter than
    `minQueryLength`, and `false` when the query is empty **and** when it meets the minimum.
- [ ] Change `DEFAULT_OPTIONS.debounceMs` from `300` to `180`.
- [ ] In the auto-search effect, add the missing `else`: when `debouncedQuery` is shorter than
      `options.minQueryLength`, clear the results rather than leaving the previous query's on
      screen. Do not clear the query itself — the user is still typing.

> **Brief correction, made during batch 2.** "Clear the results" must **not** be triggered by
> `results.length > 0`. That puts `results` in the effect's dependency array while the sibling
> branch *sets* results, and the provider returns a brand-new array from every search — so the
> effect re-fires on its own output, unbounded. The delivered implementation did exactly this and
> its tests could not see it, because the suite mocks the context with a fixed `results: []`. The
> orchestrator replaced it with a `hasSearched` ref (also reset in `onClearSearch`) and added a
> test that pins the dependency contract — a change in results identity alone must not re-run the
> search — which fails against the `results`-based version with two calls where one is expected.
> **General lesson for later briefs: when a hook's effect both reads and writes the same context
> state, say which of the two it may depend on.**
- [ ] Add `isQueryTooShort` to the hook's return value:
      `query.trim().length > 0 && query.trim().length < options.minQueryLength`. Derive it from
      `query`, not `debouncedQuery`, so the hint appears as the user types rather than 180 ms
      later. This is the flag Task 5b renders as "Keep typing…"; putting it in the hook rather
      than the component is what lets PR 6's palette inherit it.
- [ ] JSDoc the new return field.
- [ ] Run `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="useSearch"`.

### Definition of done

- [ ] Queries are debounced at 180 ms by default, still overridable per consumer.
- [ ] Falling below the minimum length clears results instead of stranding the previous query's.
- [ ] `isQueryTooShort` is exposed and covered.

---

## Task 5a — Index the signed-in user's notes

**Batch 3, runs alone. Task 5b follows it sequentially.**

**Allow-list**

```
src/core/types/search.ts
src/shared/context/SearchContext.tsx
src/shared/context/__tests__/behavioral/SearchContext.behavioral.test.tsx
```

**`npx tsc --noEmit` will be red when you finish, and that is expected.** Adding `'note'` to
`SearchResultType` breaks two exhaustive `Record<SearchResultType, …>` maps in
`src/shared/components/SearchBar.tsx`. Task 5b repairs them. Do not touch `SearchBar.tsx`, and do
not work around the error by widening those maps' types. Report the two expected errors.

### Why notes

Notes are a top-level destination (`/notes`, `/notes/:noteId`) and hold the most recently written
text in the app, and there is no `note` document type at all. They are **per-user, not per-group**
content: they live at `groups/{groupId}/users/{uid}/notes` and are joined to a campaign by a
`campaignId` field.

### Steps

- [ ] **Write the failing tests first**, in `SearchContext.behavioral.test.tsx`, following the
      existing module-mock pattern. Add a `jest.mock("features/collaboration", …)` exposing
      `useNotes`. New tests:
  - Notes reach `initializeIndex` under a sixth `note` key, with `metadata.title` from
    `note.title` and content covering `title` + `content`.
  - The index builds from notes **alone** when every other collection is empty — a campaign whose
    only content is notes is still searchable. (This composes with Task 3's `totalDocs` guard,
    which you must extend to include `notes.length`.)
  - **Another member's notes never appear in results.** Assert it at the boundary the guarantee
    actually lives at: `SearchProvider` indexes exactly what `useNotes()` returns and nothing
    else, and `useNotes()` is scoped to the signed-in user by its Firestore path. Mock `useNotes`
    to return only user A's notes and assert the documents handed to `initializeIndex` contain no
    other note ids; add a second case where `useNotes` returns `[]` (signed out / no group) and
    assert **zero** `note` documents are indexed rather than a stale set.
- [ ] In `src/core/types/search.ts`, add `'note'` to `SearchResultType`.
- [ ] In `SearchContext.tsx`, import from the `features/collaboration` **barrel**:
      `import { useNotes } from "features/collaboration";` and
      `import type { Note } from "features/collaboration";`.
      Use `useNotes()`, **not** `useNoteData()`: `NoteProvider` is already mounted directly above
      `SearchProvider` in `src/app/App.tsx` and in `src/test-utils/enhanced-test-utils.tsx`, so
      `useNotes()` reads state that is already in memory, whereas `useNoteData()` would fire a
      second Firestore fetch of the same collection.
- [ ] Add `createNoteSearchDocuments(notes: Note[]): SearchDocument[]` alongside the five existing
      builders, following their shape exactly: `id: note.id`, `type: 'note' as SearchResultType`,
      ``content: `${note.title} ${note.content}` ``, `metadata: { title: note.title }`. JSDoc it
      like its neighbours.
- [ ] Add `note: createNoteSearchDocuments(notes)` to the `searchDocuments` record, add
      `notes.length` to Task 3's `totalDocs` sum, and add `notes` to the effect's dependency array.
- [ ] Run
      `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="SearchContext.behavioral"`.

### Definition of done

- [ ] Notes are indexed, and only the signed-in user's own.
- [ ] A notes-only campaign is searchable.
- [ ] The behavioural suite is green; `tsc` fails only on the two `SearchBar.tsx` `Record` maps.

---

## Task 5b — Teach the dropdown about notes, and about a query that is merely short

**Batch 3, runs after Task 5a. `npx tsc --noEmit` is red when you start; your task is to make it
green again.**

**Allow-list**

```
src/shared/components/SearchBar.tsx
src/shared/components/__tests__/SearchBar.test.tsx
src/core/services/search/__tests__/SearchService.test.ts
```

> **Brief correction, made during batch 3.** The allow-list originally held only the two `SearchBar`
> files, on the assumption that its two `Record<SearchResultType, …>` maps were the only things
> `'note'` would break. Task 5a found a second casualty and correctly refused to touch it:
> `SearchService.test.ts` passes 11 object literals to `initializeIndex` typed
> `Record<SearchResultType, SearchDocument[]>`, each of which now needs a `note` key. Neither task
> owned it, so `tsc` could not have gone green. Folded into 5b, whose job is precisely "make the
> build green again". **Lesson: when widening a union, grep for every exhaustive `Record<TheUnion, …>`
> in the tree before writing the allow-list — the compiler finds them, but only after the fact.**

This PR changes **nothing else** about how results are presented. The `⌘K` palette, the header
layout, and the "+2 more mentions" affordance are all PR 6. Do not restyle anything, do not
reorder anything, do not add anything the steps below do not name.

### Steps

- [ ] **Write the failing tests first**, in `SearchBar.test.tsx`, following the existing
      `useSearch`-mocking pattern in that file. New tests:
  - A `note` result renders its title and the type label `Note`.
  - Clicking a `note` result navigates to `/notes/<id>` — a **path segment**, not the
    `?highlight=` query parameter the other five types use.
  - With `isQueryTooShort` true and no results, the dropdown reads **"Keep typing…"**, not
    "No results found".
  - With `isQueryTooShort` false, an empty result set still reads "No results found", and
    `isSearching` still wins over both.
- [ ] Add a `note` entry to `resultTypeIcons` — `FileText` from `lucide-react`, matching the
      `className="w-4 h-4"` of its five neighbours. Check what `src/pages/notes/` and
      `src/features/collaboration/notes/components/` already use for notes and match that if it
      differs.
- [ ] Add `note: 'Note'` to `resultTypeLabels`.
- [ ] Add a `case 'note':` to `navigateToResult` →
      `navigateToPage(createPath('/notes/:noteId', { noteId: result.id }))`. Check `createPath`'s
      signature in `src/shared/context/NavigationContext.tsx` and follow whatever param convention
      the codebase already uses for a path segment; the other five cases pass `{}` and a
      `highlight` query, which is **not** what a note needs. If `createPath` cannot express a path
      segment, call ``navigateToPage(`/notes/${result.id}`)`` directly and say so in your report.
- [ ] Pull `isQueryTooShort` from `useSearch()` and use it in the empty branch of the dropdown:
      `isSearching ? 'Searching...' : isQueryTooShort ? 'Keep typing…' : 'No results found'`.
      Keep it inside the existing `<Typography color="secondary">` — same element, same styling,
      different words. A one-character query is not an error and must not read like one.
- [ ] Leave `result.matches.map(...)` exactly as it is. The service now returns at most one
      snippet, so the uncapped render is already capped at the source; changing it here would be
      PR 6's work.
- [ ] Run `npx tsc --noEmit` — it must now be clean — and
      `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="SearchBar"`.

### Definition of done

- [ ] Note results render, label correctly, and navigate to `/notes/:noteId`.
- [ ] A one-character query reads "Keep typing…".
- [ ] `npx tsc --noEmit` is clean.
- [ ] Nothing else about the dropdown changed.

---

## Task 6 — Verification and bookkeeping (orchestrator, not delegated)

- [ ] Run the full gate: `npx tsc --noEmit`, `npm test`, `npm run build`.
- [ ] Fill in every row of the running-total table above and reconcile each delta.
- [ ] **Verify the headline claim against the real app**, not against a test: start the dev server
      with `.\scripts\start-dev.ps1 -Action start`, select the Phandelver campaign (0 rumors), and
      search `droop`. The NPC must appear. Then search `(` and confirm no crash and no console
      `SyntaxError`. Then search `d` and confirm "Keep typing…".
- [ ] Update CLAUDE.md's test-count baseline to this branch's final numbers — the recorded
      4538/4540 is stale, as is the profile plan's 4543/4545. The measured baseline on this branch
      is 227 suites / 4615 passed / 2 skipped / 4617 total.
- [ ] Record the outcome in this file: what the deltas were, and anything a brief got wrong.

### Task 6 outcome — live verification, 2026-09-02

Run against the maintainer's already-running dev server and Chrome, not a fresh start.

**The dataset does not contain Phandelver** — that campaign is on the production server. The dev
emulator holds two Lord of the Rings groups (The Fellowship, The Council of Elrond) with four
campaigns, and `manage-dev-data.ps1 -Action generate` populates *every* collection, so no campaign
reproduced the "0 rumors" condition out of the box. **With the maintainer's explicit permission to
delete dev entries, the condition was reproduced directly**: all 5 rumors were deleted from The
Silmarillion Chronicles, leaving 10 chapters / 10 NPCs / 5 locations / 5 quests / **0 rumors**.

| Claim | Result |
|---|---|
| Index builds with a collection empty | ✅ With 0 rumors, `gondolin` returned 6 results. On `main` the all-or-nothing guard leaves the index empty and this returns nothing |
| Relevance from the query, title beats body, **across types** | ✅ Order was `Gondolin` (location, exact title) → `The Fall of Gondolin` (quest, title contains) → `Beleriand` (location) → 3 NPCs — interleaved by score, not grouped by type |
| Regex metacharacters cannot throw | ✅ `a[(*+?\` and `Gondolin (the` returned cleanly. Console captured 927 messages including page load, with **zero** `SyntaxError` and zero `Search error for query:` — the catch block never fired |
| One-character query | ✅ Reads "Keep typing…" |
| Notes searchable, own notes only | ✅ A note created in-app was found by a term unique to it, rendered with the `Note` label and icon |
| Note navigation | ✅ Clicking the note result went to `/notes/note-1` — a path segment, not `?highlight=` |
| No render loop from the `useSearch` fix | ✅ No `Maximum update depth exceeded` across a session of live typing |
| Console clean | ✅ Zero errors or exceptions for the whole session |

**Dev data modified (recreate with `.\scripts\manage-dev-data.ps1 -Action generate`):** 5 rumors
deleted from The Silmarillion Chronicles; one note, "Palantir watch notes", created in that
campaign as `note-1`.

**Two observations for PR 6, both pre-existing and out of scope here:**

1. **The header search field is badly width-constrained**, and the dropdown inherits its width
   (`w-full`). With a long username in the account menu the input compresses to roughly 50px and
   result titles clip to a few characters — "Keep typing…" wrapped onto two lines. Nothing in this
   PR caused it and nothing in this PR fixes it; the palette in PR 6 replaces this dropdown
   wholesale, which is the right place to solve it.
2. **Deleting 5 rumors froze the renderer for several seconds** (CDP screenshot timed out twice
   before recovering). The deletes and their cascading relationship updates are evidently
   synchronous/serial. Unrelated to search — worth its own tracker entry rather than a fix here.

---

## Definition of done — the whole PR

- [ ] Searching "droop" in Phandelver (0 rumors) returns the NPC.
- [ ] Index rebuilds as collections load; no all-or-nothing guard.
- [ ] Relevance is computed from the query; a title match outranks a body mention, across types.
- [ ] No `.*`-chain matching against `content`; results with no snippet and no title match are
      dropped.
- [ ] Regex-special characters in a query cannot throw.
- [ ] Queries are debounced and stale responses are discarded.
- [ ] Notes are searchable, and only the searching user's own.
- [ ] The service returns one snippet plus a count per result.
- [ ] `src/shared/utils/search.ts` is deleted.
- [ ] `npm test` passes with `SearchService.test.ts` and `SearchContext.behavioral.test.tsx`
      updated, plus `useSearch.test.ts` and `SearchBar.test.tsx`.
- [ ] `npm run build` is clean.
