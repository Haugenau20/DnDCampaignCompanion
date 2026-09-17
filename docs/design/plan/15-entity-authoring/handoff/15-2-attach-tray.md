# PR 15.2 — The attach tray: one browse-first relation picker

Phase 15 · third PR · depends on `15-1`

The product has four ways to attach a relation. A quest picks a location with
a typeahead combobox; a rumour picks one with a flat `<select>` of every
location in the campaign. A quest's NPC picker is a bare `⊕` glyph left of a
heading; a rumour's is an outlined button right of it; a location's is a
full-width bar. The NPC form adds chips with a button called *Add* and, four
rows later, with one called *Add tag*. The multi-select picker is a modal grid
of centred chips with no filter, no count, no keyboard order, and a *Done*
button that commits nothing because the toggles already applied.

This PR builds one component and adopts it in all four existing forms.

Visual reference: `Authoring UI handover.dc.html` · the tray in `S3`, `S5`,
`S7`, `S8`.

## Scope

- a new shared component under `src/shared/components/`
- `src/features/campaign-entities/quests/components/QuestFormSections.tsx`
- `src/features/campaign-entities/rumors/components/RumorForm.tsx`
- `src/features/campaign-entities/locations/components/LocationCreateForm.tsx`
- the NPC create/edit form's relation and tag fields
- whichever shared picker dialog the four currently reach for
- the matching test files

## Do

1. **Browse first. Always.** The tray is a list of what exists, opened in
   place under the field it fills. A filter box sits at the top as an
   accelerator. It is **not** a typeahead and it must be usable without typing
   anything — this is a hard constraint from the maintainer, and the reason is
   that mid-session you attach the NPC you can *see*, not the one you can
   spell.
2. **Open in place, not in a dialog.** The already-picked chips stay visible
   above the list the whole time. The tray fails Phase 14 §1 question 1 — it is
   part of the form behind it, not a decision about it — so it must not become
   an overlay.
3. **Every entry carries three things**: its identity mark, its name, and the
   one line that disambiguates it — an NPC's occupation and location, a
   location's type and parent, a quest's status. A bare name cannot be chosen
   from confidently, which is the current pickers' real defect.
4. **Order by recently touched.** Not alphabetically. If no recency signal is
   available without a new query, use the collection's existing order and say
   so in the PR description rather than adding a loader — see *Do not*.
5. **Grouped when the tray spans types** — People / Places / Quests / Rumours,
   matching the groups the NPC page's relationship card already displays.
6. **Selection is immediate and reversible.** A picked row shows as picked, a
   chip appears above, and removing either removes both. No *Done* button: it
   is the control that currently commits nothing.
7. **End with the escape hatch** — "no such person yet — add one" — opening
   quick add from `15-1` with the relation pre-wired, returning to the tray
   with the new entity attached.
8. **A sheet below the phone breakpoint**, same list, same order.
9. **One verb.** *Attach* everywhere, for every entity and for tags. Not
   *Add*, not *Add tag*, not *Select NPCs*.
10. **Resolve ids to names.** The quest card currently prints `bag-end` and
    `erebor` as if they were labels. A tray entry never shows an id.

## Do not

- **Do not add another loader for the collections the tray lists.** T023
  records that every entity collection already has several independent owners
  and that `LocationDirectory` mounts one more under a comment claiming
  real-time updates. Consume the existing providers.
- Do not build a typeahead, and do not make the filter box focused by default
  on desktop — that turns a browse into a search by accident.
- Do not change what the relations *mean*, or add a relation type. This PR
  changes how one is picked.
- Do not touch `importantNPCs` here. `15-5` deletes it, with the quest page.
- Do not restyle the forms around the picker. They are retired in `15-8`;
  effort spent on their layout is thrown away.
- Do not fold the tag input into the tray unless tags are already a collection
  of real entities. If they are free strings, keep the existing input and just
  unify the verb and the chip component.

## Gates

- All four forms use the one component; grep clean for the retired picker
  dialog and for the flat location `<select>` in `RumorForm`.
- A relation can be attached and removed with no keystrokes, using only
  pointer or keyboard navigation of the list.
- Keyboard: the list is arrow-navigable in visual order, Enter attaches,
  Escape closes the tray without closing the form. The current modal grid has
  no meaningful order at all.
- No id is rendered as a label anywhere in the tray or the chips.
- At 390px the sheet shows the disambiguating line without truncating the name.
- An empty collection shows a designed empty state that offers the escape
  hatch, not a blank box.
- Screenshot pairs per form: the diff should read as one affordance replacing
  three, with more information per row.

## References

`00-entity-authoring.md` §5, and §1.3 for why "in place" matters here too.
Phase 14 `00-surface-routing.md` §1 (why this is not a dialog). Design
language §7 (identity marks, always with a label), §2 (nothing encoded by
colour alone — the mark is a recognition aid on top of the name), §8 (designed
empty states). Colour schema §5.3 (entity palette). `TODO.md` T023 (do not add
a loader).
