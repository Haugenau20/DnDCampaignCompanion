# PR 15.3 — Directory rows: a bounded summary, and a real checkbox

Phase 15 · fourth PR · depends on `15-2`

The biggest PR in the phase and the one that delivers most of what was asked
for. Four things, all in the directories:

- An expanded quest row renders nine sections and two actions — a detail page
  inside an accordion, about 1,100px tall, which pushes the next quest off
  screen. It gets bounded.
- A quest objective is an `aria-hidden` decorative box. It becomes a real
  checkbox. **The mutation already exists and is fully tested** (T016).
- Status and stance cannot be changed without opening a form. They become
  controls in the row.
- `?highlight=` is read four different ways by four directories. It becomes
  one hook.

Visual reference: `Authoring UI handover.dc.html` · `S2`, `S6`, and `S9` for
the phone.

## Scope

- `src/features/campaign-entities/quests/components/QuestDirectory.tsx`
- `src/features/campaign-entities/npcs/components/NPCDirectory.tsx`
- `src/features/campaign-entities/rumors/components/RumorDirectory.tsx`
- `src/features/campaign-entities/locations/components/LocationDirectory.tsx`
  — **row anatomy and highlighting only**; the tree is `15-4`
- `src/core/components/Roster.tsx` — `RosterGroup` / `RosterItem`
- a new shared highlight hook under `src/shared/hooks/`
- a shared date formatter, lifted from `NPCDetailPage`'s `formatNoteDate`
- the matching test files

## Do

1. **Bound every expansion to the four facts in `00-entity-authoring.md` §3.**
   Roughly 160–220px. Everything else moves to the entity's page — and until
   `15-4`/`15-5` exist, *stays where it is*: trim the quest row to its four
   facts only once `/quests/:questId` can hold the rest, or keep the surplus
   behind the existing disclosure until then. Say which you did.
   **Do not empty a row.** The first draft of this design moved all content to
   the page and was rejected by the maintainer for burying every readable fact
   one level deeper. §1.3 records it.
2. **A real objective checkbox.** `updateQuestObjective(questId, objectiveId,
   completed)` exists on the quest context, is on its interface, and has a
   dedicated eight-case suite; no production component calls it. Wire it up.
   - Give it an accessible name — the current box is deliberately
     `aria-hidden`, so this is new work, not a prop change.
   - It is a **write, not a toggle**: pending state on that row, revert
     visibly on failure, never an optimistic tick. §7.
   - A ticked objective keeps its strike and stays in place. Do not reorder.
   - **Do not auto-complete the quest** when the last objective is ticked.
     Offer it. A party can finish every objective and fail the quest.
3. **Status and stance in the row.** Three or four buttons, not a dropdown —
   quest status, NPC stance, location knowledge, rumour knowledge. Same write
   contract. These are the fields people currently open a form for.
4. **One highlight hook.** T014: `NPCDirectory` and `LocationDirectory` match
   by id *or name* and auto-expand ancestors; `RumorDirectory` is id-only with
   no name match; `QuestDirectory` sets a prop and does nothing else, so a
   highlighted quest can sit off-screen. The contract, from
   `00-entity-authoring.md` §9:
   - match by **id**;
   - expand the target and every ancestor needed to reveal it;
   - bring it into view;
   - do not clear the parameter on unrelated state changes.
   **Carry a visited set and a depth cap** in the ancestor walk —
   `PERF-11`/T033 reports `LocationDirectory`'s parent walk has neither, so a
   node inside a parent cycle never terminates. The shared hook is where that
   guard belongs.
   Dropping name-matching is a behavioural change: links are emitted with
   names in some places and ids in others. Record it on T014 and check the
   command palette still lands correctly.
   **`/story` reads nothing at all** and stays that way — note it on T014 and
   leave it.
5. **`RosterGroup` grows a collapse affordance**, opt-in per group, and the
   quest directory collapses Completed and Failed by default (T015). It is a
   shared primitive used by three directories — coordinate with T017, which
   wants the same component grown for selection, rather than forking it.
6. **Format dates once.** T001: `LocationDirectory` and `NPCDirectory` both
   print `{note.date}` raw, so a row shows `2025-05-31T19:27:30.387Z` while
   `NPCDetailPage` formats the same value properly. Lift `formatNoteDate`
   somewhere shared and use it in every consumer. **The stored shape is not
   this PR's to fix** — T001 records that `NPCNote.date` has no agreed shape
   and that agreeing it is the real job. Display only.
7. **One row expands at a time**, and an expansion survives a filter or sort
   change without losing state.
8. **Row anatomy holds at 390px**: name in serif, one metadata line in sans,
   controls right-aligned, 44px minimum hit targets — 22px checkbox in a 44px
   row, since ticking an objective is the most common one-handed action in the
   product.

## Do not

- Do not build the location tree. `15-4` owns it; this PR touches
  `LocationDirectory` only for row anatomy, highlighting and dates.
- Do not add `?open=`. §9: a second parameter beside one that already has four
  meanings creates a fifth.
- Do not add batch selection. T017, and it wants the rumour write amplification
  fixed first.
- Do not put delete in a row. It belongs on the page, next to what it destroys.
- Do not touch `NPCLegend` (T004) or the rumour summary bar (T008). Both ask
  where a hue may stand alone, and neither is this PR's question.
- Do not restyle search or filter chrome. Phase 6 already settled it.
- Do not change how objectives are stored or ordered.

## Gates

- **T016 is closed**: an objective is tickable from the directory, the write
  is `updateQuestObjective`, the existing eight-case suite still passes, and a
  new case covers rejection → revert.
- The checkbox has an accessible name and is reachable and operable by
  keyboard.
- **T014 is closed**: one hook, four consumers, matching by id, with a visited
  set and a depth cap. A location inside a deliberately-constructed parent
  cycle terminates — assert it, do not eyeball it.
- **T001's display half is closed**: grep clean for a bare `{note.date}`; no
  ISO string renders anywhere.
- No expansion exceeds ~220px on desktop at any depth.
- Every row still states its type in text, once (design language §8, Phase 6.2).
- At 390px and at 320px in an iframe: no horizontal scroll, 44px targets,
  every control reachable.
- Screenshot pairs per directory: the diff reads as *less height, more
  action* — not as less information.
- Empty campaign: every directory renders its designed empty state.

## References

`00-entity-authoring.md` §1.3, §3, §7, §9, §10. Design language §8 (the row is
the unit; a row states its type once; designed empty states), §5 (rules inside
cards, not a box per row), §2 (nothing encoded by colour alone), §9 (motion
confirms a change). Colour schema §5.5 (`feedback.*` for save state,
`knowledge.*`, `disposition.*`, `outcome.*` for concluded quests only). Phase
6 `handoff/06-2-row-anatomy.md` (row anatomy, already settled — do not undo
it). `TODO.md` T001, T014, T015, T016, T017, T033.
