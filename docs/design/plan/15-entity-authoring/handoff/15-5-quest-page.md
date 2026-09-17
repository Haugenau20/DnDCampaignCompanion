# PR 15.5 — `/quests/:questId`

Phase 15 · sixth PR · depends on `15-4` for the page shell

A quest is the most linked-to record in the product — rumours convert into
them, NPCs and locations relate to them, notes mention them, Home lists them —
and **nothing can link to one**. There is no URL for a quest. A rumour
converts into a quest and cannot then refer to it.

This PR adds the address, and moves the prep material off the directory row
onto it.

Visual reference: `Authoring UI handover.dc.html` · `S3`.

## Scope

- `src/app/App.tsx` — the new route
- a new page under `src/pages/quests/`
- `src/features/campaign-entities/quests/types.ts` — removing
  `importantNPCs`
- `src/features/campaign-entities/quests/components/QuestDirectory.tsx` — the
  surplus sections `15-3` left in place
- whatever emits a link to a quest: rumour conversion, the command palette,
  Home
- the matching test files

## Do

1. **The route, on `15-4`'s page shell, unchanged.** Band header, two-column
   body. Do not fork the shell; if it needs a capability, add it there.
2. **Objectives are the spine.** Tickable here as well as in the row, same
   write contract, plus add, reorder and edit in place. A ticked objective
   keeps its strike and its position.
3. **The prep material moves here, in full, and not behind a reveal**:
   background, leads, complications, rewards, level range. These are read once
   while prepping — which is when you are on this page — and they are what
   made the directory row 1,100px tall.
4. **One relation list.** **Delete `importantNPCs`** (`D15.7`): two fields for
   one relationship, both rendered, is why Thorin and Smaug appear twice on the
   quest card today. `relatedNPCIds` survives. Each row carries the NPC's
   occupation and location, because that is what tells two NPCs apart.
   Check for persisted data before deleting the field, and say in the PR
   description whether any document carries `importantNPCs` values that are
   not already in `relatedNPCIds` — if so, migrate rather than drop.
5. **"Places inside this quest" stay free text** with a **promote to a
   location** action, matching the location page's features (§6.4). They are
   prep notes about places inside the quest's location, mostly never visited;
   promoting them all would fill the location tree with stubs.
   §13 records this as an open question — if the maintainer has since decided
   otherwise, that decision wins over this paragraph.
6. **"What points here" — derived, read-only.** The rumours it came from, the
   locations that reference it, the notes that mention it. This is the section
   only a page can hold, and it is the reason the quest earns one. Nothing in
   it is editable from here.
7. **Status in the band**, plus *Mark completed*. Completing the last
   objective **offers** completion; it never assumes it.
8. **Edit in place**, per §7. Every field, one at a time, no edit form.
9. **The record line states created-by and last-modified-by only.** The visual
   reference shows "gandlaf ticked *Find the secret door* · last session" —
   **do not implement it.** There is no per-objective history. §8 and T005.
10. **Resolve every id to a name.** The quest card currently prints `bag-end`
    and `erebor` as though they were labels, and one of them is wrong besides.
11. **Make quests linkable.** Rumour conversion should leave a link to the
    quest it created; the command palette should navigate to the page. This is
    the capability the route exists for — shipping the route without any
    inbound link leaves the problem in place.
12. **Delete lives here**, in the record card, naming what else loses a link.
    Not in the directory row.

## Do not

- Do not fork the page shell from `15-4`.
- Do not delete `/quests/edit/:id`; `15-8` does.
- Do not touch the rumour → quest conversion *dialog*. It acts on a selection
  in the rumour list and correctly stays a dialog (T038, Phase 14 §2). Only
  what it links to afterwards changes.
- Do not implement per-objective attribution or an edit timeline.
- Do not add a relation type, and do not make *places inside* into real
  locations without the maintainer's decision.
- Do not change objective storage or ordering.

## Gates

- `/quests/:questId` renders, is linkable, browser back works, and at least one
  real inbound link reaches it.
- Grep clean: no `importantNPCs` in `src/`. No NPC appears twice on the page.
- No id is rendered as a label.
- Objectives are tickable from both the page and the row, with one mutation and
  one contract; rejection reverts visibly in both.
- Completing the last objective does not silently complete the quest.
- Every field editable in place; rejected write keeps typed text.
- A quest with a title and description only looks new, not broken.
- At 390px and 320px: one column, no horizontal scroll.
- The directory row is now at its four facts, and the sum of row + page loses
  nothing that was on screen before this phase.

## References

`00-entity-authoring.md` §2.2, §3, §6.4, §7, §8, §10, §13 (`D15.7`). Design
language §4 (a quest title is the campaign's voice; section headings are the
app's), §8, §11 (attribution is part of the identity — which is why §8's
honesty matters), §12.4 (is this fact already encoded — the duplicate NPC list
is the textbook case). Colour schema §5.5 (`outcome.*` for concluded quests
only — an active quest takes the accent, never the outcome pair). `TODO.md`
T005, T038.
