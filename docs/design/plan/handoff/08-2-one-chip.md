# PR 8.2 — One chip

Phase 8 · third PR · depends on 8.1

A3: "Multi-select chip lists (the `selectable-item` ternaries in
`LocationFormSections` and `NPCEditForm`) become one shared chip: selected is
accent-bordered, not accent-filled."

There are **9 `selectable-item` ternaries** across the entity forms today, each
deciding for itself what a selected thing looks like. They are the last place
in the product where the same idea is drawn several ways.

## Scope

- a shared chip in `src/core/components/` and its test
- the form files that currently hand-roll one
- `src/core/themes/css/components.css`

## Do

1. **One component, two states.** Selected is **accent-bordered, not
   accent-filled.** A filled chip spends the page's accent on every selected
   item at once, and a form with six selections then has six accents and no
   primary action anyone can find.
2. **Selection is not carried by colour alone** (design language §2). The
   control is a real toggle — `aria-pressed`, or a checkbox underneath — so the
   state is in the accessibility tree and not only in the border. 6.2 learned
   this the hard way: a test that pinned `aria-pressed` rather than a class is
   what caught the filter-pill regression.
3. **Replace all nine call sites.** A shared chip with two remaining
   hand-rolled cousins has made things worse, not better.
4. **The tag and affiliation inputs use it too**, including the ones added to
   `NPCForm`/`NPCEditForm` in 7.2.5. Those currently render a `tag`-classed
   `div` with an `X` button — the same idea again, drawn a fourth way.

## Do not

- Do not give the chip a hue from the entity palette. That palette belongs to
  the sigil; a chip that borrows it says "this is an entity" about something
  that is a choice.
- Do not animate the state change. A chip that moves when picked draws the eye
  to the last thing you touched rather than to what you have chosen overall.
- Do not fold the removable tag chip and the selectable list chip into one
  component if their behaviours genuinely differ — one toggles, one deletes.
  Two components sharing paint is fine; one component with a `mode` prop is
  usually two components wearing a coat.

## Gates

- `grep -rn "selectable-item" src/features/*/components/*Form*` returns nothing.
- Selected state is in the accessibility tree, asserted by `aria-pressed` (or
  checked state) and **not** by a class name.
- A form with several selections has exactly one accent, and it is the primary
  action.
- Contrast: the chip's border meets 3:1 against the form surface in every
  theme, selected and unselected.
- Keyboard: every chip reachable and togglable, with a visible focus ring.
- The nine form suites stay green.

## References

A3 in `../05-archetypes.md`; design language §2; D51 and the 6.2 filter pills,
which are the same problem already solved once.
