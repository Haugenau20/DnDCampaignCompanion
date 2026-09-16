# PR 8.0 — The missing primitives

Phase 8 · runs first · nothing else in the phase can start without it

`05-archetypes.md` says of A3 that "the `field.*` tokens are already complete
and 3a-tuned; almost all of this is consumption, not design." That is true of
text fields and false of everything else, and the difference is what this PR
exists to close.

Measured against the tree, not the plan:

- **There is no `Select`.** `core/components/` holds `Button`, `Card`,
  `Dialog`, `EntitySigil`, `ImageSlot`, `Input`, `Roster`, `Typography` — and
  the forms render **11 raw `<select>` elements** between them (`RumorForm` 4,
  `NPCForm` 2, `NPCEditForm` 2, `LocationFormSections` 2,
  `QuestFormSections` 1). There is nothing to consume, so this is design work,
  not adoption.
- **17 hand-written labels are not attached to anything.** They are all the
  same line — `<label className="block text-sm font-medium mb-1 form-label">`
  with no `htmlFor` — against 8 places in the same files that do it properly.
  A label that is not associated is a visual label only: a screen reader
  announces the control unnamed, and `getByLabelText` cannot find it. This is
  WCAG 1.3.1 and 4.1.2, and it is the single largest accessibility defect the
  form set has.
- **The colour half of the phase is already done.** Zero hardcoded hex values
  and zero `[data-theme=…]` patches survive in any of the eleven form files.
  Phase 8 is about structure and semantics, not repainting — the same
  correction Phase 7 had to make (R13).

`Input` is the model to copy: it already places the label above, the helper
below, the error *replacing* the helper, generates an id with `useId` when a
label is given, and paints from `field.*`. Everything this PR adds should be
recognisably its sibling.

## Scope

- `src/core/components/Select.tsx` (new) and its test
- `src/core/components/Input.tsx` (only if a gap appears)
- `src/core/components/Dialog.tsx` (audit only — see below)
- `src/core/themes/css/components.css`

## Do

1. **Build `Select`, shaped like `Input`.** Same prop names for the same jobs:
   `label`, `helperText`, `error`, `successMessage`, `size`, `disabled`,
   `containerClassName`. Same behaviour: label above, helper below, error
   replacing the helper and never joining it, an id generated when a label is
   given so the association is automatic rather than remembered.
2. **It paints from `field.*` and adds no token.** `--field-bg`,
   `--field-border`, `--field-border-focus`, `--field-ring-focus`,
   `--field-error-*`, `--field-label-text`, `--field-helper-text` all exist and
   are 3a-tuned. If something is genuinely missing, it earns a drift-log entry
   before it earns a value.
3. **Forward the ref**, as `Button` and `Input` now do. A form that cannot
   focus its first invalid control cannot report errors properly, and 8.3 will
   need it.
4. **The native control stays native.** A `<select>` the browser owns is
   keyboard-accessible, screen-reader-correct and works on a phone for free. Do
   not build a listbox. If a future need genuinely cannot be met by `<select>`,
   that is a separate decision with its own entry.
5. **Audit `Dialog` against the same checklist** and write down what you find:
   focus trap, restore on close, `Escape`, labelled by its own title. Fix only
   what is broken; do not restyle it here.

## Do not

- Do not migrate any form in this PR. A new primitive and eleven files of
  adoption in one diff is a review nobody can do; 8.1 is the adoption.
- Do not invent a `Field` wrapper that `Input` and `Select` both compose
  through. It is the obvious refactor and it is premature at two callers —
  revisit at the third, which is the same threshold `ImageSlot` was held to.
- Do not add a searchable or multi-select variant. `LocationCombobox` already
  exists for the one case that needed it, and speculative variants are how a
  primitive becomes unmaintainable.

## Gates

- `Select` renders a label that is actually associated: a test resolves it with
  `getByLabelText` and nothing else.
- Error replaces helper; both never render together. Assert it.
- Keyboard: focus, open, choose, escape — all with the keyboard alone.
- Contrast: the control's boundary meets 3:1 against the surface it sits on, and
  its text meets 4.5:1, in every theme. `token-contrast.test.ts` is the place.
- No new token, or a drift-log entry saying why there is one.
- Suite green; the count grows by the new tests and nothing else moves.

## References

A3 in `../05-archetypes.md`; design language §2 (nothing by colour alone), §12.1;
`core/components/Input.tsx` as the pattern.
