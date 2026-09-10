# PR 9.2 — Authoring

Phase 9 · third PR · depends on 9.0

A4: "Authoring is a plain textarea with a bold / italic / blockquote toolbar."
Three textareas get one, and the last raw control in the product joins the
primitives it should have joined in Phase 8.

Measured:

| field | authored in | control today |
|---|---|---|
| chapter body | `ChapterForm` | `Input isTextArea` ✅ |
| saga / story description | `SagaEditPage` | `Input isTextArea` ✅ |
| note body | `NoteEditor` | **raw `<textarea>`** ❌ |

`NoteEditor` is the miss. A3 lists it among the forms it owns, but `08-1`'s
scope was the eleven entity forms and `NoteEditor` was not one of them, so it
kept its hand-rolled control while every other textarea in the product moved
onto `Input`. It is the last one.

## Scope

- `src/core/components/MarkdownToolbar.tsx` (new) and its test — or whatever
  the toolbar ends up called
- `features/storytelling/chapters/components/ChapterForm.tsx`
- `pages/story/SagaEditPage.tsx`
- `features/collaboration/notes/components/NoteEditor.tsx`
- the matching test files

## Do

1. **Bold, italic, blockquote. Three buttons.** That is the whole toolbar A4
   asks for, and the restraint is the design: the point is to make the three
   marks discoverable to someone who does not know markdown, not to build a
   word processor. Anyone who knows the syntax can still type it.
2. **It wraps a selection and it is undoable.** Use the textarea's own
   `setRangeText` (or equivalent) so the browser's undo stack survives —
   replacing `value` wholesale destroys undo, and losing a paragraph to Ctrl+Z
   not working is a worse bug than the toolbar not existing.
3. **The buttons are named and reachable.** Icon-only controls with no
   accessible name are exactly what Phase 8 spent three PRs removing; do not
   reintroduce them. `aria-label` at minimum, and a visible focus ring.
4. **Not accents.** A toolbar button writes to a draft, not to the record
   (D80). The form's one filled accent is still its submit.
5. **`NoteEditor`'s textarea becomes `Input isTextArea`**, with the label
   association that gives it, matching what `08-1` did for the other eleven.
   Check it against `test-utils/accessible-names.ts` the way those forms are.
6. **Say what the syntax is, once, quietly.** A player who has never typed
   `**bold**` needs one line telling them the field takes markdown. `07-2-5`
   deliberately *removed* such a hint because the feature did not exist yet
   (R18) — it exists after `09-0`, so the hint can come back. Keep it to a
   sentence of helper text; `Input` already has the slot.

## Do not

- Do not add a preview pane. A split-pane preview doubles the surface and halves
  the writing area, and CommonMark's three common marks are legible as source.
  If it is wanted later it is its own decision.
- Do not add a rich-text editor, a WYSIWYG mode, or a slash-command menu.
  Same reason as `09-0`: TipTap is a roadmap project.
- Do not add headings, links, images or tables to the toolbar. The parser
  supports them; the toolbar does not have to. Three buttons is the decision.
- Do not touch what the forms *do*. This adds a control above a field; it does
  not change validation, submission or layout. `08-3` settled rhythm.

## Gates

- Every toolbar button is reachable by `getByRole("button", { name })` and by
  keyboard, with a visible focus ring.
- Wrapping is asserted on a real selection: select "word", press bold, expect
  `**word**` in the value and the selection still sensible afterwards.
- Undo works after a toolbar action. Assert it, because this is the thing that
  silently breaks.
- `grep -rn '<textarea' src/features src/pages` returns nothing outside tests —
  `NoteEditor` was the last one.
- `NoteEditor`'s control resolves by label; `unnamedControlsIn` returns empty
  for the note editor.
- One filled accent per form still holds (`test-utils/accent-budget.ts`).
- The note and chapter suites stay green.

## References

A4 in `../05-archetypes.md`; D45; D80 (an accent marks what writes the record);
`08-1` for the label pattern; R18 for why the hint was removed.
