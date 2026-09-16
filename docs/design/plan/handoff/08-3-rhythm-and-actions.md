# PR 8.3 — Rhythm and actions

Phase 8 · fourth PR · closes the phase · depends on 8.1

What is left of A3 once the controls are right: how a form is spaced, how it is
divided, and where its actions sit.

> **The phase's one open question is already answered, by unanimous practice.**
> `04-rollout.md` says Phase 8 "settles one open question — whether a form sits
> on `card` or on `page`". Measured: **all eleven forms already render inside
> `<Card>`**, without exception. There is nothing to decide, only something to
> ratify. Record it as a decision in the drift log — a form sits on `card` —
> and move on. Do not spend the PR relitigating a question the codebase closed
> by itself.

## Scope

- the eleven form files
- `src/core/themes/css/components.css`
- the matching test files

## Do

1. **One column, generous rhythm.** No two-column field grids: a form is read
   and filled top to bottom, and a second column doubles the number of places
   the eye has to check for the error it just triggered.
2. **Sections separated by a rule and a sans section head.** The section heads
   exist already but are `Typography variant="h4"` in some files and
   `variant="body" className="font-medium"` in others — pick the one the
   design language wants and use it in all eleven.
3. **Primary action once, bottom right.** Count them per form before you start;
   more than one filled button on a form is the same defect as more than one
   accent on a page (D66).
4. **Delete is `danger.delete*` and never sits beside Save.** A destructive
   action within a thumb's width of the confirming one is a trap, and
   `DangerZoneCard` already establishes how this project separates them.
5. **The error summary is one place, not two.** Several of these forms render a
   local `error` and a context `npcError`/`questError` — the code comments say
   they were deliberately combined into a single banner. Keep that. One banner,
   never two stacked.

## Do not

- Do not change what any control is or says. 8.1 settled that; this PR moves
  and spaces things.
- Do not introduce a form-wide "unsaved changes" guard. It is a real idea and a
  behaviour change, and it belongs in its own decision rather than arriving
  inside a spacing PR.
- Do not unify `LocationCreateForm` with `LocationEditForm` (or the Quest
  pair). The duplication is real and tempting; collapsing two forms into one
  parameterised form is a refactor with its own risks and no visual payoff, and
  it is not what this phase is for. Log it if you think it is worth doing.

## Gates

- Each form has exactly one filled primary action. Assert it per form, the way
  the NPC page asserts its accents.
- Delete, where present, is not adjacent to Save in the DOM order or on screen.
- One error region per form, never two.
- Every form reflows at 320px with no horizontal scroll (render in a 320px
  iframe — a maximized Chrome window silently ignores resize below its minimum
  width; the ~9px overflow from the header is pre-existing and not yours).
- Screenshots: one create form and one edit form, light and dark, each with a
  validation error showing.
- The nine form suites stay green.
- A drift-log entry ratifying `card` as the form surface.

## References

A3 in `../05-archetypes.md`; D66 (an accent marks what writes); design language
§12.1; `DangerZoneCard` for the destructive-action separation.
