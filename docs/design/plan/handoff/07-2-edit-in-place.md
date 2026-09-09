# PR 7.2 — Editing in place

Phase 7 · second migration PR · depends on 7.1

What earns the click. A read-only detail page is a worse version of the row
with more scrolling; the description edits where it sits and a note is added
without leaving the page (D43).

The plumbing already exists — `NPCContext` exposes `updateNPC` and
`updateNPCNote`, and `LocationContext` matches — so almost all of this is
interface, not data work.

## Scope

- the two page components from 7.1
- `src/features/campaign-entities/npcs/context/NPCContext.tsx` and
  `locations/context/LocationContext.tsx` (only if a gap appears)
- `src/core/themes/css/components.css`
- the matching test files

## Do

1. **The description edits in place.** Click to edit, save, cancel. Not a
   dialog and not a separate route — the existing `/edit/:id` form is the
   place you go to change *everything*, and this is the place you fix a
   sentence.
2. **A note is added without navigating away.** One field, one action, the note
   appears in the history with today's date.
3. **Save state is stated in words.** Saving, saved, failed — never a colour
   alone, and never a spinner that leaves you guessing whether it took. A
   failed save must say so and must not discard what was typed.
4. **The form treatment is A3's**, borrowed rather than invented: label above,
   helper below, error replacing helper, `field.*` tokens, primary action once.
   Phase 8 owns forms; this PR consumes what already exists and adds no new
   field styling. If something is missing, log it for Phase 8 rather than
   inventing it here.
5. **Only what the page shows is editable.** Do not grow an editor for fields
   this page does not display.

## Do not

- Do not add optimistic UI that shows a save as done before it is. This is a
  shared record; two players will disagree about what it says.
- Do not make the edit affordance an accent. The page's one accent is its
  primary action.
- Do not reimplement the `/edit/:id` form here or start deprecating it. Both
  exist, for different jobs.
- Do not add note editing or deletion. Adding is what 7.1's read view was
  missing; changing history is a separate decision (Q13).

## Gates

- A failed save keeps the user's text and says what happened.
- Editing is reachable and operable by keyboard alone, and focus goes
  somewhere sensible on save and on cancel.
- Concurrent edit: the page reflects what was actually written, not what was
  typed, once the write resolves.
- The row's expansion still shows the edited value after navigating back.
- Empty campaign and a read-only state both still render.
- Screenshot: description in edit mode, a note being added, and a failed save.

## References

D43; design language §11 (attribution), §12.1; A3 in `../05-archetypes.md`.
