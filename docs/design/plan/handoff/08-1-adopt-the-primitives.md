# PR 8.1 — Adopt the primitives

Phase 8 · second PR · depends on 8.0

Every control in every form goes through `Input` or `Select`, and every label
becomes the primitive's own. Wide, shallow and mechanical — which is exactly
why it is one PR rather than smuggled into another.

The prize is not tidiness. It is that **17 labels start naming their controls**
for the first time, because `Input` and `Select` wire `htmlFor`/`id`
themselves and a hand-written `<label>` beside a control does not.

## Scope

The eleven form files:

- `npcs/components/NPCForm.tsx`, `NPCEditForm.tsx`
- `locations/components/LocationFormSections.tsx`, `LocationCreateForm.tsx`,
  `LocationEditForm.tsx`
- `quests/components/QuestFormSections.tsx`, `QuestCreateForm.tsx`,
  `QuestEditForm.tsx`
- `rumors/components/RumorForm.tsx`
- `storytelling/chapters/components/ChapterForm.tsx`
- `pages/story/SagaEditPage.tsx`

Plus the raw `<select>` that live outside the form set (R21, corrected by R23 -- there are two, not three):

- `collaboration/notes/components/NotesList.tsx` — the sort control
- `rumors/components/CombineRumorsDialog.tsx`

Plus their test files, which will need real changes — see the gate.

## Do

1. **Replace all 13 raw `<select>` with `Select`**, moving the hand-written
   `<label>` onto the `label` prop rather than leaving it beside the control.
   Eleven are in the forms; the other two are the sort control and dialog
   named above, which are the same defect in a different room (R21). Where one
   of those three has no visible label at all, it gets an `aria-label` rather
   than a new visible one — 8.3 owns layout, and this PR must not add chrome.
2. **Replace the raw controls that bypass `Input`**: 4 `<textarea>` in
   `NPCForm`, 1 `<input>` in `QuestFormSections`.
3. **Move every remaining hand-written label onto the primitive's `label`
   prop.** Search for the exact line — they are all identical:
   `className="block text-sm font-medium mb-1 form-label"`. When it is gone
   from a file, that file's labels are associated.
4. **Give the `<Input>`s that have no label one.** Counted now: `NPCForm` 4 of
   6 labelled, `LocationFormSections` 2 of 4, `QuestFormSections` 4 of 10. An
   input whose only label is a placeholder loses its name the moment someone
   types.
5. **Keep every behaviour identical.** This PR changes what the DOM says about
   a control, not what the form does. If a form's behaviour changes, something
   went wrong.

## Do not

- Do not restyle, re-space or reorder anything. 8.3 owns rhythm and actions,
  and mixing the two makes it impossible to tell a layout regression from a
  semantic one in review.
- Do not "improve" the copy on a label while moving it. A label that changes
  wording and position at once cannot be diffed.
- Do not delete a test that breaks because a query got *better*. A test that
  used `getByPlaceholderText` and can now use `getByLabelText` should be
  changed to the stronger query, not removed.
- Do not touch `LocationCombobox`. It is a different control with a different
  job and it already works.

## Gates

- `grep -rn 'block text-sm font-medium mb-1 form-label' src/` returns nothing.
- `grep -rn '<select' src/features src/pages` returns nothing outside test
  files. All 13 are gone.
- Every control in every one of the eleven files is reachable by
  `getByLabelText`. This is the gate that matters, and it is worth adding one
  test per form that walks its controls rather than trusting the grep.
- The nine form suites stay green: NPCForm 49, NPCEditForm 46,
  LocationCreateForm 29, LocationEditForm 23, QuestCreateForm 35,
  QuestEditForm 27, RumorForm 28, ChapterForm 31, SagaEditPage 39. Counts may
  *rise*; a fall means a test was deleted rather than fixed, and needs saying
  out loud in the PR body.
- No behavioural change: submitting each form still writes what it wrote.

## References

A3 in `../05-archetypes.md`; WCAG 1.3.1 and 4.1.2; `08-0` for the primitives.
