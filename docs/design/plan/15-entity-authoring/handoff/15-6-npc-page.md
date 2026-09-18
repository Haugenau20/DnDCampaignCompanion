# PR 15.6 — The NPC page: four changes, and nothing else

Phase 15 · seventh PR · depends on `15-2` and `15-4`

**This page was redesigned recently and the maintainer is happy with it. It is
the reference the other two pages copy, not the other way round.** Where
`15-4` or `15-5` differ from it in spacing or card anatomy, this page wins and
they are wrong.

There is deliberately **no mock** for this PR. The page as it stands is the
visual reference. The list below is the whole delta.

## Scope

- `src/pages/npcs/NPCDetailPage.tsx`
- `src/pages/npcs/InlineEditor.tsx` — reuse, and extract if `15-4` has not
  already
- the NPC page's notes composer
- the matching test files

Nothing else. This is the smallest PR in the phase and should stay that way.

## Do

1. **Section *Edit* actions edit in place.** The pencil beside DESCRIPTION
   already promises this; make it open an `InlineEditor` in that block instead
   of routing to the edit page. Same for appearance, personality, background,
   and the facts in the header strip. One field open at a time, per §7 — which
   is this file's own behaviour generalised.
2. **Keep *Edit all fields*, and stop it being a route.** It is a legitimate
   thing to want — the "change five things at once" case — so keep the button
   and have it open every block's editor at once, on this page. When nothing
   routes to `/npcs/edit/:id`, `15-8` redirects it.
3. **An unwritten section becomes a question, not a blank.** Where a prose
   block has no content, render its prompt as a dashed action in place:
   "+ How do they treat the party?", "+ What do they want?", "+ Background",
   "+ Race". Only ever where something is missing. This is the one visual
   addition in the PR, and it is what the maintainer singled out as worth
   having.
4. **Relationships gains the attach tray.** The rail lists relationships well
   and offers no way to add one. Put an *Attach* action at the head of that
   card, opening `15-2`'s tray grouped People / Places / Quests / Rumours to
   match the groups already displayed.

Two smaller things, while in the file:

5. **Format the note date.** It renders `2025-05-31` where the record line
   already says `31/05/2025`. Use `15-3`'s shared helper — this page's own
   `formatNoteDate` is where that helper came from, so the page and its rows
   should stop disagreeing.
6. **Give *Add note* the accent fill.** It is the primary action of that card
   and currently sits at low contrast on the sunken ground.

## Do not

- **Do not redesign anything.** Not the header, not the image slot, not the
  card rhythm, not the type scale, not the three-column prose block. The
  maintainer asked explicitly for the page to be left alone beyond the four
  changes above.
- **Do not add a band header** to match `15-4` and `15-5`. This page does not
  have one, it works, and matching is not worth redesigning a good page.
- **Do not make notes editable or deletable.** They are append-only — "added,
  never edited or removed" — and whether that changes is T006, a question
  about who owns campaign history.
- Do not implement per-field attribution. §8, T005.
- Do not delete `/npcs/edit/:id`; `15-8` does.
- Do not touch `NPCLegend` or the `npc-status-*` family. T004.
- Do not change the NPC directory. `15-3` owns it.

## Gates

- Every field on the page is editable in place, one at a time, with the save
  contract from §7 — nothing claims success early, a rejected write keeps the
  typed text.
- *Edit all fields* opens every editor on the page and navigates nowhere.
- Prompts appear only where a section is empty. An NPC with two of five
  sections written looks deliberately incomplete; one with all five shows no
  prompts at all.
- A relation can be attached from the page, browse-only, no typing.
- No raw date string renders anywhere on the page.
- Screenshot pair: the diff should be *almost nothing* — prompts where blanks
  were, one new action in the rail, one button darker. If the diff is larger
  than that, the PR overreached.
- At 390px and 320px: unchanged from today, no new overflow.

## References

`00-entity-authoring.md` §1.1, §3, §7, §8, §8.1, §10. Design language §4
(serif for the NPC's name and their description; sans for the labels), §8
(designed empty states — the prompts are that principle applied), §11
(attribution), §12.3 (an empty region is a layout problem, not an ornament
problem). `TODO.md` T001, T004, T005, T006.
