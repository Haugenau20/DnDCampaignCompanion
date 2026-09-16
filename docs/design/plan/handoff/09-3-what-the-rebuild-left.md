# PR 9.3 — What the rebuild left behind

Phase 9 · fourth PR · closes the phase · independent of 9.0–9.2

> **Most of Phase 9's visual description is already built, and this PR exists
> because of what that leaves.** `04-rollout.md` says the phase delivers "a
> chapter rail on `sunken`, a capped measure, serif running text, navigation
> kept as quiet chrome". Measured: commit `413259e` — *"rebuild the chapter
> reader around scrolling and a persistent rail"* — already did nearly all of
> it, before Phase 9 started. `ChapterReader` caps at `max-w-[68ch]`, wears
> `.reader-prose` (Newsreader serif, with a medieval variant), carries sans
> chrome in a single footer row, and `ChapterRail` is persistent at `lg` and a
> drawer below it. The colour work is done too: **zero hardcoded hex and zero
> `[data-theme=…]` patches** across all nine A4 files.
>
> This is the fourth time a handoff has described a state that later work had
> already changed (R13, R19, R27). It is no longer a surprise; it is the reason
> handoffs are written as a phase starts and measured before they are believed.

What is genuinely left is four loose ends.

## Scope

- `features/storytelling/stories/components/ChapterRail.tsx`
- `features/storytelling/stories/components/LatestChapter.tsx` (and its test)
- `features/storytelling/index.ts`
- `pages/story/ChaptersPage.tsx`, `features/storytelling/stories/components/BookshelfView.tsx`
- `../03-drift-log.md`

## Do

1. **Decide the rail's surface, and stop the plan and the code disagreeing.**
   A4 says "a chapter rail on `sunken`". `ChapterRail` is on `card` —
   `className="... card card-border rounded-lg overflow-hidden"`. One of the two
   is wrong and it is not obvious which: `sunken` is the archetype's answer and
   would recess the rail behind the reading column, which is the right
   hierarchy for a navigation aid beside prose; `card` is what the rebuild
   actually chose while designing the rail against the reader. Look at it in
   the browser at `lg` and above before changing anything, and whichever way it
   goes, **write it down** — a plan that says `sunken` and a component that
   says `card` will be "fixed" by someone eventually, in whichever direction
   they happen to read first.

2. **Record `BookViewer`'s pagination as a decision, because right now it is
   only a commit message.** `413259e` says, in its body: *"BookViewer is
   deliberately untouched: SagaPage still uses it, and the saga is one
   continuous work that keeps the page-turning presentation."* That is a real
   design decision — the saga reads as a book and a chapter reads as a scroll,
   on purpose — and it exists nowhere a reader of `03-drift-log.md` would find
   it. The next person to notice that the product has two reading models will
   file it as an inconsistency and unify them. Give it a D-number.

3. **Settle `LatestChapter`: wire it up or retire it.** It is the fifth
   stranded component this rollout has found, in exactly the shape of the
   other four (R13's three cards, R15's `NPCLegend`): 75 lines, exported from
   `features/storytelling`'s barrel, covered by its own 12-test file, and
   **rendered by nothing**. Unlike `NPCLegend` there is no config flag
   suggesting it was meant to be switchable — it simply lost its consumer, most
   likely when Phase 4 recomposed Home around `ActivityFeed`, which answers
   "what happened since we last played" for every entity type rather than for
   chapters alone.
   That makes retiring it the likely answer, but it is a judgement about the
   product and not a cleanup: check whether Home wants a "continue reading"
   affordance before deleting the component that would provide one. Either way
   it stops being dead weight in this PR.

4. **Give `ChaptersPage` / `BookshelfView` the same read as the reader got.**
   These are the two A4 files the rebuild did not touch. They are a collection
   of things to open, so A1's rules apply more than A4's: rows over cards,
   designed empty and loading states, a row stating its type once. Check them
   against `Roster` rather than redesigning them — if they are already
   consistent with the directories, say so and change nothing.

## Do not

- Do not rebuild the reader. It is finished, deliberately, and re-deriving its
  measure or its footer is how a good surface gets worse.
- Do not unify `BookViewer` with `ChapterReader` in this PR. If item 2's
  decision comes out the other way — that the saga should scroll too — that is
  its own PR with its own screenshots, not a paragraph in a cleanup.
- Do not delete `LatestChapter` without item 3's decision being made by someone
  who can make it. R15 left `NPCLegend` in the tree for exactly this reason and
  that was the right call.
- Do not touch `theme-effects.css`'s medieval ornament or the `.reader-prose`
  medieval variant. Both are Phase 11's (D40).

## Gates

- No `[data-theme=…]` rule added; the A4 files still have zero.
- The rail decision and the `BookViewer` decision each have a drift-log entry.
  This PR's real output is that two decisions stop living in commit messages
  and component classNames.
- If `LatestChapter` is retired: it is gone from the barrel, its test file goes
  with it, and no import survives. If it is wired up: it has a consumer and a
  screenshot.
- Screenshots of the story stack, light and dark: `/story`, `/story/chapters`,
  a saga.
- Empty campaign: no chapters, no saga. Every one of these surfaces has a
  designed empty state, not a blank region.
- Suite green.

## References

A4 and A1 in `../05-archetypes.md`; `413259e`; R13 and R15 for the stranded-
component pattern; D40; design language §5 (surface hierarchy), §8.
